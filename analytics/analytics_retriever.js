/**
 * Phase 9: Analytics Retriever
 *
 * Fetches performance data from Ayrshare for all published posts
 * Calculates engagement rates, tracks conversions, aggregates by profile
 *
 * Called weekly to populate Performance_Signals and close the learning loop
 */

const AYRSHARE_BASE_URL = "https://app.ayrshare.com/api";

// Minimum post age before analytics are meaningful (24 hours)
const MIN_POST_AGE_HOURS = 24;

/**
 * Retrieve analytics for all published posts from Content_Queue
 */
async function retrieveAllAnalytics(publishedPosts, options = {}) {
  const logger = options.logger ?? console;
  const apiKey = options.ayrshareApiKey ?? process.env.AYRSHARE_API_KEY;

  logger.log(`[Analytics] Retrieving analytics for ${publishedPosts.length} posts`);

  const results = [];

  const eligiblePosts = publishedPosts.filter((post) => {
    if (!post.ayrshare_post_id || post.ayrshare_post_id.startsWith("mock_")) {
      return false;
    }
    const publishedAt = new Date(post.published_at || post.scheduled_at || 0);
    const ageHours = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);
    return ageHours >= MIN_POST_AGE_HOURS;
  });

  logger.log(`[Analytics] ${eligiblePosts.length} posts eligible (${publishedPosts.length - eligiblePosts.length} too recent)`);

  for (const post of eligiblePosts) {
    try {
      const analytics = apiKey
        ? await fetchPostAnalytics(post.ayrshare_post_id, apiKey)
        : buildMockAnalytics(post);

      results.push({
        ...post,
        analytics,
        retrieved_at: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`[Analytics] Failed for post ${post.ayrshare_post_id}: ${error.message}`);
    }
  }

  logger.log(`[Analytics] Retrieved analytics for ${results.length} posts`);
  return results;
}

/**
 * Fetch analytics for a specific post from Ayrshare
 */
async function fetchPostAnalytics(ayrsharePostId, apiKey) {
  const response = await fetch(`${AYRSHARE_BASE_URL}/analytics/post`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ id: ayrsharePostId })
  });

  if (!response.ok) {
    throw new Error(`Ayrshare analytics HTTP ${response.status}`);
  }

  const data = await response.json();
  return normalizeAyrshareAnalytics(data);
}

/**
 * Normalize Ayrshare analytics response to standard format
 */
function normalizeAyrshareAnalytics(data) {
  const analytics = data.analytics || {};

  let totalViews = 0, totalLikes = 0, totalComments = 0, totalShares = 0;

  Object.entries(analytics).forEach(([platform, platformData]) => {
    if (platformData && typeof platformData === "object") {
      totalViews += parseInt(platformData.impressions || platformData.views || 0);
      totalLikes += parseInt(platformData.likes || 0);
      totalComments += parseInt(platformData.comments || 0);
      totalShares += parseInt(platformData.shares || platformData.reposts || 0);
    }
  });

  const totalEngagement = totalLikes + totalComments + totalShares;
  const engagementRate = totalViews > 0 ? totalEngagement / totalViews : 0;

  return {
    views: totalViews,
    likes: totalLikes,
    comments: totalComments,
    shares: totalShares,
    total_engagement: totalEngagement,
    engagement_rate: parseFloat(engagementRate.toFixed(4)),
    raw: analytics
  };
}

/**
 * Calculate engagement velocity (how fast is engagement accumulating?)
 * Requires early metrics (captured at ~90 min) vs final metrics
 */
function calculateEngagementVelocity(earlyMetrics, finalMetrics) {
  if (!earlyMetrics || !finalMetrics || finalMetrics.total_engagement === 0) {
    return { velocity: "unknown", earlyRatio: 0 };
  }

  const earlyRatio = earlyMetrics.total_engagement / finalMetrics.total_engagement;

  let velocity = "normal";
  if (earlyRatio >= 0.10) velocity = "fast";
  else if (earlyRatio <= 0.02) velocity = "slow";

  return {
    velocity,
    earlyRatio: parseFloat(earlyRatio.toFixed(3)),
    earlyEngagement: earlyMetrics.total_engagement,
    finalEngagement: finalMetrics.total_engagement
  };
}

/**
 * Aggregate analytics by profile for weekly reporting
 */
function aggregateByProfile(analyticsResults) {
  const byProfile = {};

  analyticsResults.forEach((result) => {
    const profileId = result.profile_id;
    if (!byProfile[profileId]) {
      byProfile[profileId] = {
        profile_id: profileId,
        total_posts: 0,
        total_views: 0,
        total_engagement: 0,
        total_conversions: 0,
        posts: []
      };
    }

    const agg = byProfile[profileId];
    agg.total_posts++;
    agg.total_views += result.analytics?.views || 0;
    agg.total_engagement += result.analytics?.total_engagement || 0;
    agg.total_conversions += parseInt(result.conversions || 0);
    agg.posts.push(result);
  });

  // Calculate aggregate rates
  Object.values(byProfile).forEach((profile) => {
    profile.avg_engagement_rate = profile.total_views > 0
      ? parseFloat((profile.total_engagement / profile.total_views).toFixed(4))
      : 0;
    profile.conversion_rate = profile.total_engagement > 0
      ? parseFloat((profile.total_conversions / profile.total_engagement).toFixed(4))
      : 0;

    // Find top performer
    const topPost = profile.posts
      .sort((a, b) => (b.analytics?.total_engagement || 0) - (a.analytics?.total_engagement || 0))[0];
    profile.top_hook = topPost?.hook || "";
    profile.top_content_angle = topPost?.content_type || "";
  });

  return byProfile;
}

/**
 * Build mock analytics (when Ayrshare not configured or for testing)
 */
function buildMockAnalytics(post) {
  const platform = post.platform || "instagram";

  // Platform-typical ranges
  const ranges = {
    tiktok: { views: [1000, 50000], engagementRate: [0.05, 0.20] },
    youtube_shorts: { views: [500, 10000], engagementRate: [0.03, 0.12] },
    instagram: { views: [300, 5000], engagementRate: [0.04, 0.15] },
    facebook: { views: [200, 3000], engagementRate: [0.02, 0.08] }
  };

  const range = ranges[platform] || ranges.instagram;
  const views = Math.floor(Math.random() * (range.views[1] - range.views[0]) + range.views[0]);
  const engRate = Math.random() * (range.engagementRate[1] - range.engagementRate[0]) + range.engagementRate[0];
  const engagement = Math.floor(views * engRate);
  const likes = Math.floor(engagement * 0.6);
  const comments = Math.floor(engagement * 0.2);
  const shares = Math.floor(engagement * 0.2);

  return {
    views,
    likes,
    comments,
    shares,
    total_engagement: engagement,
    engagement_rate: parseFloat(engRate.toFixed(4)),
    isMockData: true
  };
}

module.exports = {
  retrieveAllAnalytics,
  fetchPostAnalytics,
  normalizeAyrshareAnalytics,
  calculateEngagementVelocity,
  aggregateByProfile,
  buildMockAnalytics
};
