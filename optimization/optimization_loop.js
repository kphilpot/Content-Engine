/**
 * Phase 10: Optimization Loop
 *
 * Closes the self-learning loop by analyzing weekly results
 * and generating optimization notes for next week
 *
 * What it does:
 * 1. Compares actual vs expected performance
 * 2. Identifies what worked (high engagement, conversions)
 * 3. Identifies what flopped (low engagement, poor velocity)
 * 4. Generates specific action items for next week
 * 5. Writes to Optimization_Notes tab in Google Sheets
 */

const { writeToTab } = require("../sheets/writer");

/**
 * Run the weekly optimization loop for all profiles
 */
function runOptimizationLoop(profileAnalytics, researchOutputs, profiles, options = {}) {
  const logger = options.logger ?? console;

  logger.log(`\n=== Optimization Loop ===`);

  const allNotes = [];

  profiles.forEach((profile) => {
    const analytics = profileAnalytics[profile.profile_id];
    const research = researchOutputs[profile.profile_id];

    if (!analytics) {
      logger.log(`[Optimization] No analytics for ${profile.profile_id}, skipping`);
      return;
    }

    const notes = generateOptimizationNotes(profile, analytics, research);
    allNotes.push(...notes);

    logger.log(`[Optimization] Generated ${notes.length} notes for ${profile.profile_id}`);
  });

  return allNotes;
}

/**
 * Generate specific, actionable optimization notes for a profile
 */
function generateOptimizationNotes(profile, analytics, researchOutput) {
  const notes = [];
  const weekEndDate = new Date().toISOString().split("T")[0];

  // Note 1: Overall performance assessment
  const performanceGrade = gradePerformance(analytics);
  notes.push({
    date: weekEndDate,
    profile_id: profile.profile_id,
    category: "performance_summary",
    priority: "high",
    observation: `Week ending ${weekEndDate}: ${performanceGrade.grade} - ${performanceGrade.summary}`,
    action_item: performanceGrade.action,
    expected_impact: performanceGrade.impact,
    metric_baseline: `Engagement: ${analytics.avg_engagement_rate?.toFixed(4) || 0} | Conversions: ${analytics.total_conversions || 0}`
  });

  // Note 2: Content type analysis
  const contentTypeNotes = analyzeContentTypePerformance(profile, analytics);
  notes.push(...contentTypeNotes.map((n) => ({
    date: weekEndDate,
    profile_id: profile.profile_id,
    category: "content_type",
    ...n
  })));

  // Note 3: Platform analysis
  const platformNotes = analyzePlatformPerformance(profile, analytics);
  notes.push(...platformNotes.map((n) => ({
    date: weekEndDate,
    profile_id: profile.profile_id,
    category: "platform",
    ...n
  })));

  // Note 4: Hook analysis
  if (analytics.top_hook) {
    notes.push({
      date: weekEndDate,
      profile_id: profile.profile_id,
      category: "hook_pattern",
      priority: "medium",
      observation: `Top hook this week: "${analytics.top_hook}"`,
      action_item: `Reuse and test variations of this hook pattern next week`,
      expected_impact: "5-10% engagement improvement",
      metric_baseline: ""
    });
  }

  // Note 5: Research-to-performance correlation
  if (researchOutput) {
    const researchNote = correlateResearchToPerformance(analytics, researchOutput, profile);
    if (researchNote) {
      notes.push({
        date: weekEndDate,
        profile_id: profile.profile_id,
        category: "research_correlation",
        ...researchNote
      });
    }
  }

  // Note 6: Drift check
  const driftNote = checkForDrift(analytics, profile);
  if (driftNote) {
    notes.push({
      date: weekEndDate,
      profile_id: profile.profile_id,
      category: "drift_alert",
      priority: "critical",
      ...driftNote
    });
  }

  return notes;
}

/**
 * Grade overall weekly performance
 */
function gradePerformance(analytics) {
  const engRate = analytics.avg_engagement_rate || 0;
  const convRate = analytics.conversion_rate || 0;

  if (engRate >= 0.08 && convRate >= 0.03) {
    return {
      grade: "EXCELLENT",
      summary: `${(engRate * 100).toFixed(1)}% eng rate, ${(convRate * 100).toFixed(1)}% conversion`,
      action: "Scale this approach — increase posting frequency by 20%",
      impact: "high"
    };
  }

  if (engRate >= 0.05 && convRate >= 0.01) {
    return {
      grade: "GOOD",
      summary: `${(engRate * 100).toFixed(1)}% eng rate, ${(convRate * 100).toFixed(1)}% conversion`,
      action: "Maintain strategy, test one new angle per week",
      impact: "medium"
    };
  }

  if (engRate >= 0.03) {
    return {
      grade: "AVERAGE",
      summary: `${(engRate * 100).toFixed(1)}% eng rate, ${(convRate * 100).toFixed(1)}% conversion`,
      action: "Test new hook styles. Conversions are low — strengthen CTA placement",
      impact: "medium"
    };
  }

  return {
    grade: "BELOW_TARGET",
    summary: `${(engRate * 100).toFixed(1)}% eng rate only. Needs improvement.`,
    action: "Immediate pivot: change hooks, test different content angle, review posting times",
    impact: "critical"
  };
}

/**
 * Analyze content type performance
 */
function analyzeContentTypePerformance(profile, analytics) {
  const notes = [];
  const ratios = profile.content_ratios || {};

  // If conversion content is low (< 15%), increase if engagement is good
  if (parseInt(ratios.conversion || 0) < 15 && (analytics.avg_engagement_rate || 0) > 0.05) {
    notes.push({
      priority: "medium",
      observation: `Conversion ratio is only ${ratios.conversion}%, but engagement is ${(analytics.avg_engagement_rate * 100).toFixed(1)}%`,
      action_item: "Consider increasing conversion content ratio by 5% next week",
      expected_impact: "Could increase conversions by 20-30% if audience is engaged",
      metric_baseline: `Current ratios: growth=${ratios.growth} trust=${ratios.trust} proof=${ratios.proof} conversion=${ratios.conversion}`
    });
  }

  // If proof content is low, add more (builds conversions)
  if (parseInt(ratios.proof || 0) < 20) {
    notes.push({
      priority: "low",
      observation: `Proof content is only ${ratios.proof}% — social proof is underutilized`,
      action_item: "Add one before/after or result-showcase post this week",
      expected_impact: "Proof content typically converts 2-3x better than generic tips",
      metric_baseline: ""
    });
  }

  return notes;
}

/**
 * Analyze performance by platform
 */
function analyzePlatformPerformance(profile, analytics) {
  const notes = [];
  const platforms = profile.active_platforms || [];

  // Basic note about platform allocation
  if (platforms.length > 2) {
    notes.push({
      priority: "low",
      observation: `Content distributed across ${platforms.length} platforms`,
      action_item: "Monitor which platform drives most conversions. Consider concentrating 70% effort on top performer",
      expected_impact: "10-20% efficiency gain by focusing on top platform",
      metric_baseline: `Active: ${platforms.join(", ")}`
    });
  }

  return notes;
}

/**
 * Correlate research source quality to actual performance
 */
function correlateResearchToPerformance(analytics, researchOutput, profile) {
  const topSources = researchOutput.topSources || [];
  if (topSources.length === 0) return null;

  const topSource = topSources[0];
  const conversionRate = analytics.conversion_rate || 0;

  if (conversionRate < 0.01 && topSource.conversionScore > 0.7) {
    return {
      priority: "medium",
      observation: `Research predicted high conversion from ${topSource.source_type} sources, but actual conversion is low`,
      action_item: "Re-evaluate which content angles are resonating. The source quality is high but execution may need adjustment",
      expected_impact: "Alignment of research-to-execution could lift conversions 15-25%",
      metric_baseline: `Research score: ${topSource.conversionScore} | Actual: ${(conversionRate * 100).toFixed(1)}%`
    };
  }

  return null;
}

/**
 * Check for engagement drift (2+ consecutive weeks declining)
 */
function checkForDrift(analytics, profile) {
  const previousRate = analytics.previousWeekEngagementRate || null;
  const currentRate = analytics.avg_engagement_rate || 0;

  if (!previousRate) return null;

  const change = currentRate - previousRate;
  const changePercent = previousRate > 0 ? (change / previousRate) * 100 : 0;

  if (changePercent < -15) {
    return {
      observation: `DRIFT DETECTED: Engagement dropped ${Math.abs(changePercent).toFixed(1)}% week-over-week (${(previousRate * 100).toFixed(2)}% → ${(currentRate * 100).toFixed(2)}%)`,
      action_item: "Immediate action required: 1) Change hook style 2) Test new content angle 3) Check posting times 4) Review recent platform algorithm changes",
      expected_impact: "Without intervention, engagement may continue declining"
    };
  }

  return null;
}

/**
 * Convert optimization notes to sheet rows
 */
function notesToSheetRows(notes) {
  const headers = [
    "date", "profile_id", "category", "priority",
    "observation", "action_item", "expected_impact", "metric_baseline"
  ];

  const rows = notes.map((note) => headers.map((h) => String(note[h] ?? "")));
  return { headers, rows };
}

/**
 * Generate a human-readable optimization report
 */
function generateOptimizationReport(notes) {
  const critical = notes.filter((n) => n.priority === "critical");
  const high = notes.filter((n) => n.priority === "high");
  const medium = notes.filter((n) => n.priority === "medium");

  const lines = [
    `=== Weekly Optimization Report ===`,
    `${new Date().toISOString().split("T")[0]}`,
    ``
  ];

  if (critical.length > 0) {
    lines.push(`⛔ CRITICAL (${critical.length}):`);
    critical.forEach((n) => {
      lines.push(`  [${n.profile_id}] ${n.observation}`);
      lines.push(`  ACTION: ${n.action_item}`);
      lines.push(``);
    });
  }

  if (high.length > 0) {
    lines.push(`🔴 HIGH PRIORITY (${high.length}):`);
    high.forEach((n) => {
      lines.push(`  [${n.profile_id}] ${n.observation}`);
      lines.push(`  ACTION: ${n.action_item}`);
      lines.push(``);
    });
  }

  if (medium.length > 0) {
    lines.push(`🟡 MEDIUM (${medium.length} items — see Optimization_Notes tab)`);
  }

  return lines.join("\n");
}

module.exports = {
  runOptimizationLoop,
  generateOptimizationNotes,
  notesToSheetRows,
  generateOptimizationReport
};
