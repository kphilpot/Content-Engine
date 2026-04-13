/**
 * Source Ranker
 *
 * Scores sources by conversion potential based on:
 * 1. Content relevance to profile's niche and pillars
 * 2. Engagement metrics (comments, upvotes, reach potential)
 * 3. Audience quality (do the people engaging match target buyer?)
 * 4. Historical performance (what worked in past Performance_Signals?)
 * 5. Recency (fresher content has higher conversion potential)
 */

function rankSourcesByConversionPotential(sources, profile, performanceSignals) {
  // Enrich each source with conversion score
  const scoredSources = sources.map((source) => {
    const relevanceWeight = source.relevanceScore || 0;
    const engagementScore = scoreEngagement(source);
    const audienceQualityScore = estimateAudienceQuality(source, profile);
    const recencyScore = scoreRecency(source);
    const historicalScore = scoreHistoricalPerformance(source, performanceSignals, profile);

    // Weighted scoring
    const conversionScore =
      relevanceWeight * 0.25 +
      engagementScore * 0.25 +
      audienceQualityScore * 0.2 +
      recencyScore * 0.15 +
      historicalScore * 0.15;

    return {
      ...source,
      conversionScore: Math.round(conversionScore * 100) / 100,
      scoringBreakdown: {
        relevance: relevanceWeight,
        engagement: engagementScore,
        audienceQuality: audienceQualityScore,
        recency: recencyScore,
        historical: historicalScore
      }
    };
  });

  // Sort by conversion score (highest first)
  return scoredSources.sort((a, b) => b.conversionScore - a.conversionScore);
}

/**
 * Score engagement potential (will people act on this content?)
 */
function scoreEngagement(source) {
  if (source.type === "reddit") {
    const { engagement } = source;
    if (!engagement) return 0;

    // Comments are high-engagement signals (discussion = trust building)
    const commentScore = Math.min(engagement.comments / 100, 1.0);
    // Upvotes show validation but less important than comments
    const upvoteScore = Math.min(engagement.upvotes / 1000, 1.0) * 0.5;

    return (commentScore + upvoteScore) / 1.5;
  }

  if (source.type === "twitter") {
    // Twitter hashtags get baseline engagement estimate
    // Will be real data once API is integrated
    return 0.6;
  }

  return 0;
}

/**
 * Estimate audience quality match
 * Does the audience engaging with this content match our target buyer?
 */
function estimateAudienceQuality(source, profile) {
  let score = 0.5; // baseline

  if (source.type === "reddit") {
    // Subreddit specialization = higher quality audience
    if (source.subreddit && source.subreddit.length < 20) {
      score += 0.2; // niche subreddits have targeted audiences
    }

    // High comment count suggests ongoing conversation (community quality)
    if (source.engagement?.comments > 50) {
      score += 0.1;
    }

    // Author karma/activity (if available) indicates trusted community member
    if (source.author) {
      score += 0.1; // established authors
    }
  }

  if (source.type === "twitter") {
    // Hashtags in niche categories have better audience alignment
    if (source.hashtag && source.hashtag.includes("Journey")) {
      score += 0.15; // journey hashtags attract decision-makers
    }
    if (source.hashtag && source.hashtag.includes("Tips")) {
      score += 0.1; // tips hashtags attract learners
    }
  }

  return Math.min(score, 1.0);
}

/**
 * Score recency (newer content converts better)
 */
function scoreRecency(source) {
  if (source.type === "reddit" && source.created) {
    const ageInDays = source.engagement?.postAge / 86400 || 30;

    // Ideal: 3-14 days old (fresh but established)
    if (ageInDays <= 14) return 1.0;
    if (ageInDays <= 30) return 0.8;
    if (ageInDays <= 60) return 0.5;
    return 0.2; // older posts lose momentum
  }

  if (source.type === "twitter") {
    return 1.0; // Twitter is always fresh/current
  }

  return 0.7; // unknown
}

/**
 * Score based on what's actually working (from Performance_Signals)
 * Learns from historical performance which types of sources drive conversions
 */
function scoreHistoricalPerformance(source, performanceSignals, profile) {
  if (!performanceSignals || !performanceSignals.conversionSources) {
    return 0.5; // neutral if no history
  }

  // Has this source (or similar type) driven conversions before?
  const matchingSources = performanceSignals.conversionSources.filter(
    (s) => s.source_type === source.type && s.profile_id === profile.profile_id
  );

  if (matchingSources.length === 0) {
    return 0.5; // no history, assume neutral
  }

  // Calculate average conversion rate from matching sources
  const avgConversionRate =
    matchingSources.reduce((sum, s) => sum + (s.conversion_rate || 0), 0) /
    matchingSources.length;

  return Math.min(avgConversionRate / 0.05, 1.0); // normalize assuming 5% is excellent
}

/**
 * Get top sources for a specific engagement style
 * Used to prioritize sources that match the profile's CTA intensity
 */
function filterSourcesByEngagementStyle(sources, profile) {
  const ctaIntensity = profile.cta_intensity || "medium";

  if (ctaIntensity === "high") {
    // High CTA: prefer highly engaged communities
    return sources.filter((s) => {
      if (s.type === "reddit") {
        return s.engagement?.comments > 50;
      }
      return true;
    });
  }

  if (ctaIntensity === "low") {
    // Low CTA: prefer educational/trust-building content
    return sources.filter((s) => {
      if (s.type === "reddit") {
        return s.content?.toLowerCase().includes("tip") ||
          s.content?.toLowerCase().includes("how to");
      }
      return true;
    });
  }

  // Medium: balanced
  return sources;
}

module.exports = {
  rankSourcesByConversionPotential,
  filterSourcesByEngagementStyle
};
