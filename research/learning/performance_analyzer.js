/**
 * Performance Analyzer
 *
 * Extracts signals from the Performance_Signals Google Sheet tab
 * Learns what's working so research can be adapted next week
 *
 * Signals tracked:
 * - Which content hooks drive engagement?
 * - Which sources produce conversions?
 * - What time of day converts best?
 * - What content angles work best?
 * - Are engagement velocities improving or declining?
 */

function analyzePerformanceSignals(profile, performanceSignalsTab, options = {}) {
  const logger = options.logger ?? console;

  // Parse performance signals tab
  const signals = performanceSignalsTab.rows || [];
  const profileSignals = signals.filter(
    (row) => row.profile_id === profile.profile_id && row.week_end_date
  );

  logger.log(`[Analysis] Found ${profileSignals.length} weeks of performance data`);

  // Extract insights
  const insights = {
    lastWeekEngagement: extractLastWeekEngagement(profileSignals),
    topHooks: extractTopHooks(profileSignals),
    conversionSources: extractConversionSources(profileSignals),
    engagementVelocityTrend: analyzeEngagementTrend(profileSignals),
    contentAnglesToDouble: identifyWinningAngles(profileSignals),
    sourcePerformance: rankSourcesByPerformance(profileSignals),
    driftDetected: detectDrift(profileSignals),
    recommendations: generateInsights(profileSignals, profile)
  };

  return insights;
}

/**
 * Extract last week's engagement metrics
 */
function extractLastWeekEngagement(signals) {
  if (signals.length === 0) {
    return {
      totalEngagement: 0,
      avgEngagementRate: 0,
      totalConversions: 0,
      conversionRate: 0
    };
  }

  const lastWeek = signals[signals.length - 1];

  return {
    totalEngagement: parseInt(lastWeek.total_engagement || 0),
    avgEngagementRate: parseFloat(lastWeek.avg_engagement_rate || 0),
    totalConversions: parseInt(lastWeek.conversions || 0),
    conversionRate: parseFloat(lastWeek.conversion_rate || 0),
    weekEndDate: lastWeek.week_end_date
  };
}

/**
 * Identify which hooks/opening lines generated most engagement
 */
function extractTopHooks(signals) {
  const hookPerformance = {};

  signals.forEach((signal) => {
    const hook = signal.top_hook || "";
    if (!hook) return;

    if (!hookPerformance[hook]) {
      hookPerformance[hook] = {
        hook,
        count: 0,
        totalEngagement: 0,
        totalConversions: 0
      };
    }

    hookPerformance[hook].count += 1;
    hookPerformance[hook].totalEngagement += parseInt(signal.total_engagement || 0);
    hookPerformance[hook].totalConversions += parseInt(signal.conversions || 0);
  });

  // Rank by conversion potential
  return Object.values(hookPerformance)
    .map((h) => ({
      ...h,
      avgEngagement: h.totalEngagement / h.count,
      avgConversions: h.totalConversions / h.count,
      conversionRate: h.totalConversions / Math.max(h.totalEngagement, 1)
    }))
    .sort((a, b) => b.conversionRate - a.conversionRate)
    .slice(0, 5);
}

/**
 * Identify which sources (Reddit, Twitter, etc.) drive conversions
 */
function extractConversionSources(signals) {
  const sourcePerformance = {};

  signals.forEach((signal) => {
    const sourceType = signal.source_type || "unknown";
    const source = signal.source_url || "";

    const key = `${sourceType}:${source}`;
    if (!sourcePerformance[key]) {
      sourcePerformance[key] = {
        source_type: sourceType,
        source_url: source,
        times_used: 0,
        total_conversions: 0,
        total_engagement: 0
      };
    }

    sourcePerformance[key].times_used += 1;
    sourcePerformance[key].total_conversions += parseInt(signal.conversions || 0);
    sourcePerformance[key].total_engagement += parseInt(signal.total_engagement || 0);
  });

  return Object.values(sourcePerformance)
    .filter((s) => s.times_used > 0)
    .map((s) => ({
      ...s,
      conversion_rate: s.total_conversions / Math.max(s.total_engagement, 1),
      conversions_per_use: s.total_conversions / s.times_used
    }))
    .sort((a, b) => b.conversion_rate - a.conversion_rate);
}

/**
 * Analyze if engagement is trending up, stable, or declining
 */
function analyzeEngagementTrend(signals) {
  if (signals.length < 2) {
    return {
      trend: "unknown",
      weekOverWeekChange: 0,
      lastTwoWeeksAvg: 0,
      previousTwoWeeksAvg: 0
    };
  }

  const sorted = signals.sort((a, b) => new Date(a.week_end_date) - new Date(b.week_end_date));
  const lastTwo = sorted.slice(-2);
  const previousTwo = sorted.slice(-4, -2);

  const lastTwoAvg =
    lastTwo.reduce((sum, s) => sum + parseFloat(s.avg_engagement_rate || 0), 0) / lastTwo.length;
  const previousTwoAvg = previousTwo.length > 0
    ? previousTwo.reduce((sum, s) => sum + parseFloat(s.avg_engagement_rate || 0), 0) /
      previousTwo.length
    : lastTwoAvg;

  const change = lastTwoAvg - previousTwoAvg;
  const trend = change > 0.01 ? "improving" : change < -0.01 ? "declining" : "stable";

  return {
    trend,
    weekOverWeekChange: parseFloat((change * 100).toFixed(2)),
    lastTwoWeeksAvg: parseFloat(lastTwoAvg.toFixed(4)),
    previousTwoWeeksAvg: parseFloat(previousTwoAvg.toFixed(4))
  };
}

/**
 * Identify which content angles are winning
 */
function identifyWinningAngles(signals) {
  const anglePerformance = {};

  signals.forEach((signal) => {
    const angle = signal.content_angle || "untagged";

    if (!anglePerformance[angle]) {
      anglePerformance[angle] = { angle, engagements: [], conversions: [] };
    }

    anglePerformance[angle].engagements.push(parseInt(signal.total_engagement || 0));
    anglePerformance[angle].conversions.push(parseInt(signal.conversions || 0));
  });

  return Object.values(anglePerformance)
    .map((a) => ({
      angle: a.angle,
      avgEngagement: a.engagements.reduce((s, v) => s + v, 0) / a.engagements.length,
      avgConversions: a.conversions.reduce((s, v) => s + v, 0) / a.conversions.length,
      conversionRate:
        a.conversions.reduce((s, v) => s + v, 0) /
        Math.max(a.engagements.reduce((s, v) => s + v, 0), 1)
    }))
    .sort((a, b) => b.conversionRate - a.conversionRate);
}

/**
 * Rank sources by overall performance
 */
function rankSourcesByPerformance(signals) {
  const ranked = extractConversionSources(signals);
  return ranked.map((source) => ({
    source_type: source.source_type,
    source_url: source.source_url,
    performance_score: source.conversion_rate * 100,
    conversions_total: source.total_conversions,
    usage_count: source.times_used
  }));
}

/**
 * Detect drift: if 2 consecutive weeks show declining engagement, alert
 */
function detectDrift(signals) {
  const trend = analyzeEngagementTrend(signals);

  return {
    isDrifting: trend.trend === "declining" && Math.abs(trend.weekOverWeekChange) > 10,
    trend: trend.trend,
    changePercent: trend.weekOverWeekChange,
    recommendation: trend.trend === "declining"
      ? "Adjust research focus or content angles - engagement is declining"
      : "Continue current strategy"
  };
}

/**
 * Generate actionable insights and recommendations
 */
function generateInsights(signals, profile) {
  if (signals.length === 0) {
    return [
      "No performance data yet. First week of tracking.",
      "Focus on content quality and audience alignment.",
      "Monitor all metrics closely to identify patterns."
    ];
  }

  const hooks = extractTopHooks(signals);
  const sources = extractConversionSources(signals);
  const angles = identifyWinningAngles(signals);
  const trend = analyzeEngagementTrend(signals);

  const recommendations = [];

  if (trend.trend === "improving") {
    recommendations.push(`✓ Engagement trending up (+${trend.weekOverWeekChange}%). Keep current strategy.`);
  } else if (trend.trend === "declining") {
    recommendations.push(
      `⚠ Engagement declining (-${Math.abs(trend.weekOverWeekChange)}%). Shift research focus or content angles.`
    );
  }

  if (hooks.length > 0) {
    recommendations.push(
      `Top hook: "${hooks[0].hook}" (${(hooks[0].conversionRate * 100).toFixed(1)}% conversion)`
    );
  }

  if (angles.length > 0) {
    recommendations.push(
      `Focus on "${angles[0].angle}" angle next week (${(angles[0].conversionRate * 100).toFixed(1)}% conversion)`
    );
  }

  if (sources.length > 0 && sources[0].conversion_rate > 0.05) {
    recommendations.push(`Top source: ${sources[0].source_type} (${(sources[0].conversion_rate * 100).toFixed(1)}% conversion)`);
  }

  return recommendations;
}

module.exports = {
  analyzePerformanceSignals
};
