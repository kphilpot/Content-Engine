/**
 * Phase 4: Performance Signal Extractor
 *
 * Reads engagement and conversion data from:
 * 1. Ayrshare API (automatic - views, likes, comments, shares)
 * 2. Manual_Performance_Paste tab (user-pasted affiliate/conversion data)
 *
 * Normalizes into Performance_Signals rows written back to Google Sheets
 *
 * Key metric: engagement velocity - how fast is engagement accumulating?
 * Fast performers (>90min 10%+ of final count) = high-quality content
 */

const { writeToTab } = require("../sheets/writer");

const VELOCITY_THRESHOLD_MINUTES = 90;
const FAST_VELOCITY_THRESHOLD = 0.10; // 10% of final engagement in 90min = fast
const SLOW_VELOCITY_THRESHOLD = 0.02; // <2% in 90min = slow

/**
 * Extract performance signals for a profile over the past week
 */
async function extractPerformanceSignals(profile, posts, options = {}) {
  const logger = options.logger ?? console;
  const ayrshareApiKey = options.ayrshareApiKey ?? process.env.AYRSHARE_API_KEY ?? null;

  logger.log(`[Performance] Extracting signals for ${profile.profile_id} (${posts.length} posts)`);

  const postMetrics = [];

  for (const post of posts) {
    try {
      let metrics;

      if (ayrshareApiKey && post.ayrshare_post_id) {
        metrics = await fetchAyrshareAnalytics(post.ayrshare_post_id, ayrshareApiKey);
      } else {
        metrics = buildMetricsFromManualData(post);
      }

      const normalized = normalizePostMetrics(post, metrics, profile);
      postMetrics.push(normalized);
    } catch (error) {
      logger.error(`[Performance] Failed to get metrics for post ${post.post_id}: ${error.message}`);
    }
  }

  // Aggregate into weekly signals
  const weeklySignals = aggregateWeeklySignals(postMetrics, profile);

  logger.log(`[Performance] Generated ${weeklySignals.length} signal rows for ${profile.profile_id}`);
  return weeklySignals;
}

/**
 * Fetch analytics from Ayrshare API
 */
async function fetchAyrshareAnalytics(postId, apiKey) {
  const response = await fetch(`https://app.ayrshare.com/api/analytics/post`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ id: postId })
  });

  if (!response.ok) {
    throw new Error(`Ayrshare analytics failed: ${response.status}`);
  }

  const data = await response.json();
  return extractMetricsFromAyrshare(data);
}

/**
 * Extract standardized metrics from Ayrshare response
 */
function extractMetricsFromAyrshare(data) {
  const analytics = data.analytics || {};

  const totalViews = sumAcrossPlatforms(analytics, "impressions") ||
    sumAcrossPlatforms(analytics, "views") || 0;
  const totalLikes = sumAcrossPlatforms(analytics, "likes") || 0;
  const totalComments = sumAcrossPlatforms(analytics, "comments") || 0;
  const totalShares = sumAcrossPlatforms(analytics, "shares") || 0;

  return {
    views: totalViews,
    likes: totalLikes,
    comments: totalComments,
    shares: totalShares,
    engagement: totalLikes + totalComments + totalShares,
    engagementRate: totalViews > 0 ? (totalLikes + totalComments + totalShares) / totalViews : 0
  };
}

/**
 * Sum a metric across all platforms from Ayrshare data
 */
function sumAcrossPlatforms(analytics, metricName) {
  return Object.values(analytics).reduce((sum, platformData) => {
    if (platformData && typeof platformData[metricName] === "number") {
      return sum + platformData[metricName];
    }
    return sum;
  }, 0);
}

/**
 * Build metrics from manual entry data (from Content_Queue or Manual_Performance_Paste)
 */
function buildMetricsFromManualData(post) {
  return {
    views: parseInt(post.views || post.impressions || 0),
    likes: parseInt(post.likes || 0),
    comments: parseInt(post.comments || 0),
    shares: parseInt(post.shares || 0),
    engagement: parseInt(post.total_engagement || 0) ||
      parseInt(post.likes || 0) + parseInt(post.comments || 0) + parseInt(post.shares || 0),
    engagementRate: parseFloat(post.engagement_rate || 0),
    clicks: parseInt(post.clicks || 0),
    conversions: parseInt(post.conversions || 0)
  };
}

/**
 * Normalize post metrics into a standardized format
 */
function normalizePostMetrics(post, metrics, profile) {
  const publishedAt = new Date(post.published_at || post.created_at || Date.now());
  const ageInHours = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);

  // Calculate engagement velocity
  const earlyEngagement = parseInt(post.early_engagement || 0); // engagement at 90min mark
  const velocityClassification = classifyVelocity(earlyEngagement, metrics.engagement);

  return {
    post_id: post.post_id || post.id,
    profile_id: profile.profile_id,
    platform: post.platform || "unknown",
    published_at: publishedAt.toISOString(),
    age_hours: Math.round(ageInHours),
    views: metrics.views,
    likes: metrics.likes,
    comments: metrics.comments,
    shares: metrics.shares,
    total_engagement: metrics.engagement,
    engagement_rate: parseFloat((metrics.engagementRate || 0).toFixed(4)),
    clicks: metrics.clicks || 0,
    conversions: metrics.conversions || 0,
    conversion_rate: metrics.engagement > 0
      ? parseFloat(((metrics.conversions || 0) / metrics.engagement).toFixed(4))
      : 0,
    hook_used: post.hook || post.opening_line || "",
    content_angle: post.content_angle || post.angle || "",
    source_url: post.research_source || post.source_url || "",
    source_type: post.source_type || "unknown",
    velocity: velocityClassification,
    is_fast_performer: velocityClassification === "fast"
  };
}

/**
 * Classify engagement velocity
 */
function classifyVelocity(earlyEngagement, totalEngagement) {
  if (totalEngagement === 0) return "unknown";
  const earlyRatio = earlyEngagement / totalEngagement;
  if (earlyRatio >= FAST_VELOCITY_THRESHOLD) return "fast";
  if (earlyRatio <= SLOW_VELOCITY_THRESHOLD && earlyRatio > 0) return "slow";
  return "normal";
}

/**
 * Aggregate post metrics into weekly signals per profile
 * One row per week per profile in Performance_Signals tab
 */
function aggregateWeeklySignals(postMetrics, profile) {
  if (postMetrics.length === 0) return [];

  // Group by week
  const byWeek = {};

  postMetrics.forEach((metric) => {
    const date = new Date(metric.published_at);
    // Get start of week (Monday)
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const weekKey = weekStart.toISOString().split("T")[0];

    if (!byWeek[weekKey]) {
      byWeek[weekKey] = {
        week_start: weekStart.toISOString().split("T")[0],
        week_end: weekEnd.toISOString().split("T")[0],
        posts: []
      };
    }

    byWeek[weekKey].posts.push(metric);
  });

  // Build signal rows from weekly aggregates
  return Object.values(byWeek).map((week) => {
    const posts = week.posts;
    const totalPosts = posts.length;
    const totalViews = posts.reduce((s, p) => s + p.views, 0);
    const totalEngagement = posts.reduce((s, p) => s + p.total_engagement, 0);
    const totalConversions = posts.reduce((s, p) => s + p.conversions, 0);
    const avgEngagementRate = totalPosts > 0
      ? posts.reduce((s, p) => s + p.engagement_rate, 0) / totalPosts
      : 0;

    // Find top hook by engagement
    const topPost = posts.sort((a, b) => b.total_engagement - a.total_engagement)[0] || {};
    const fastPerformers = posts.filter((p) => p.is_fast_performer);
    const topAngle = getMostFrequent(posts.map((p) => p.content_angle).filter(Boolean));
    const topSource = getMostFrequent(posts.map((p) => p.source_type).filter(Boolean));

    return {
      profile_id: profile.profile_id,
      week_end_date: week.week_end,
      total_posts: totalPosts,
      total_views: totalViews,
      total_engagement: totalEngagement,
      conversions: totalConversions,
      conversion_rate: totalEngagement > 0
        ? parseFloat((totalConversions / totalEngagement).toFixed(4))
        : 0,
      avg_engagement_rate: parseFloat(avgEngagementRate.toFixed(4)),
      top_hook: topPost.hook_used || "",
      content_angle: topAngle || "",
      source_type: topSource || "",
      source_url: topPost.source_url || "",
      fast_performers: fastPerformers.length,
      fast_performer_rate: totalPosts > 0
        ? parseFloat((fastPerformers.length / totalPosts).toFixed(4))
        : 0
    };
  });
}

/**
 * Get the most frequently occurring value in an array
 */
function getMostFrequent(arr) {
  if (!arr.length) return null;
  const freq = {};
  arr.forEach((item) => { freq[item] = (freq[item] || 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * Write extracted signals to Performance_Signals tab in Google Sheets
 */
async function writePerformanceSignals(sheets, spreadsheetId, signalRows, logger = console) {
  if (!sheets || !signalRows.length) {
    logger.log(`[Performance] No signals to write`);
    return;
  }

  const headerColumns = [
    "profile_id", "week_end_date", "total_posts", "total_views",
    "total_engagement", "conversions", "conversion_rate", "avg_engagement_rate",
    "top_hook", "content_angle", "source_type", "source_url",
    "fast_performers", "fast_performer_rate"
  ];

  const rows = signalRows.map((row) => headerColumns.map((col) => String(row[col] ?? "")));

  try {
    await writeToTab(sheets, spreadsheetId, "Performance_Signals", headerColumns, rows);
    logger.log(`[Performance] Wrote ${signalRows.length} rows to Performance_Signals`);
  } catch (error) {
    logger.error(`[Performance] Failed to write signals: ${error.message}`);
  }
}

module.exports = {
  extractPerformanceSignals,
  writePerformanceSignals,
  normalizePostMetrics,
  aggregateWeeklySignals
};
