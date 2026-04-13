const fetch = require("node-fetch");

// Predefined subreddit groups for different niches
const SUBREDDIT_MAP = {
  hair: [
    "curlyhair",
    "Haircare",
    "NaturalHair",
    "HaircareScience",
    "Hairloss",
    "FemaleHairLoss",
    "malehairadvice",
    "HairLossFAQ",
    "longhair",
    "Skincare" // crossover appeal
  ],
  skincare: [
    "SkincareAddiction",
    "Skincare_Addiction",
    "30PlusSkinCare",
    "Tretinoin",
    "AsianBeauty",
    "IndianSkincareAddicts",
    "acne",
    "Dermatology"
  ],
  fitness: [
    "fitness",
    "loseit",
    "Supplements",
    "HealthyFood",
    "EatCheapAndHealthy",
    "bodyweightfitness"
  ],
  general_wellness: ["Health", "wellness", "nutrition", "mentalhealth"]
};

/**
 * Scans Reddit for high-quality sources matching profile's niche and research_focus
 * Returns posts with engagement metrics, estimated conversion potential
 */
async function scanRedditSources(profile, performanceSignals, options = {}) {
  const logger = options.logger ?? console;
  const sources = [];

  // Determine which subreddits to scan based on profile niche
  const subredditsToScan = selectSubreddits(profile.niche);

  // research_focus might be string or array
  const researchFocus = Array.isArray(profile.research_focus)
    ? profile.research_focus.join(" ")
    : (profile.research_focus || "");

  for (const subreddit of subredditsToScan) {
    try {
      const posts = await fetchRedditPosts(subreddit, researchFocus);
      sources.push(
        ...posts.map((post) => ({
          url: post.url,
          type: "reddit",
          title: post.title,
          subreddit: post.subreddit,
          author: post.author,
          score: post.score,
          numComments: post.num_comments,
          created: post.created_utc,
          engagement: calculateRedditEngagement(post),
          content: post.selftext?.substring(0, 500) ?? "",
          relevanceScore: scoreContentRelevance(post, profile),
          conversionScore: 0 // will be scored in ranker
        }))
      );
    } catch (error) {
      logger.error(`[Reddit] Error scanning r/${subreddit}: ${error.message}`);
    }
  }

  logger.log(`[Reddit] Found ${sources.length} posts from ${subredditsToScan.length} subreddits`);
  return sources;
}

/**
 * Fetch posts from a subreddit's search API
 */
async function fetchRedditPosts(subreddit, searchQuery, limit = 50) {
  const searchTerms = (searchQuery || "tips advice help").split(" ").slice(0, 3); // top 3 keywords
  const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(
    searchTerms.join(" OR ")
  )}&type=submission&sort=hot&limit=${limit}&t=month`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Content Engine Research Bot)"
    }
  });

  if (!response.ok) {
    throw new Error(`Reddit API returned ${response.status}`);
  }

  const data = await response.json();
  return data.data?.children
    ?.filter((item) => item.kind === "t3")
    .map((item) => item.data)
    .filter(
      (post) =>
        !post.removed_by_moderator &&
        !post.removed &&
        post.selftext.length > 100 &&
        !post.is_self_promoted
    );
}

/**
 * Calculate engagement metrics for Reddit posts
 * Higher engagement = more discussion potential
 */
function calculateRedditEngagement(post) {
  const commentEngagement = Math.min(post.num_comments / 50, 1.0); // normalize to 0-1
  const scoreEngagement = Math.min(post.score / 1000, 1.0);
  const engagement = (commentEngagement + scoreEngagement) / 2;

  return {
    comments: post.num_comments,
    upvotes: post.score,
    engagementRatio: engagement,
    postAge: Date.now() / 1000 - post.created_utc // in seconds
  };
}

/**
 * Score content relevance to profile's research focus and content pillars
 */
function scoreContentRelevance(post, profile) {
  let score = 0;
  const title = (post.title + " " + post.selftext).toLowerCase();

  // Handle both string and array formats
  const researchFocus = Array.isArray(profile.research_focus)
    ? profile.research_focus.join(" ")
    : (profile.research_focus || "");
  const contentPillars = Array.isArray(profile.content_pillars)
    ? profile.content_pillars.join(";")
    : (profile.content_pillars || "");

  const researchKeywords = researchFocus.toLowerCase().split(" ");
  const pillars = contentPillars.toLowerCase().split(";");

  // Score research_focus keywords
  const focusMatches = researchKeywords.filter((kw) => kw && title.includes(kw)).length;
  score += focusMatches * 0.3;

  // Score content_pillars
  const pillarMatches = pillars.filter(
    (pillar) => pillar && title.includes(pillar.trim())
  ).length;
  score += pillarMatches * 0.4;

  // Boost high-engagement posts
  if (post.num_comments > 100) score += 0.2;
  if (post.score > 500) score += 0.1;

  return Math.min(score, 1.0);
}

/**
 * Select which subreddits to scan based on profile niche
 */
function selectSubreddits(niche) {
  const normalized = (niche || "").toLowerCase();

  // Match to closest category
  for (const [category, subreddits] of Object.entries(SUBREDDIT_MAP)) {
    if (normalized.includes(category)) {
      return subreddits;
    }
  }

  // Default to general + niche-specific search
  return SUBREDDIT_MAP.general_wellness;
}

module.exports = {
  scanRedditSources
};
