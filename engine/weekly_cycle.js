/**
 * Master Weekly Cycle Runner
 *
 * Orchestrates all 13 phases of the content engine in sequence:
 *
 * PHASE 1: Control Center Validation
 * PHASE 2: Profile Reader + Normalizer
 * PHASE 3: Research Engine (source discovery + pattern extraction)
 * PHASE 4: Performance Signal Extractor
 * PHASE 5: Cost Governor
 * PHASE 6: Weekly Content Planner
 * PHASE 7: Content Generator
 * PHASE 8: Approval Workflow
 * PHASE 9: Ayrshare Publisher
 * PHASE 10: Analytics Retriever
 * PHASE 11: Optimization Loop
 * PHASE 12: Telegram Reporter
 * PHASE 13: System Status Tracker
 *
 * Self-learning loop:
 * Phase 3 reads from Phase 11's previous output (Performance_Signals)
 * Phase 11 reads from Phase 10's output (analytics)
 * This creates an ever-improving system
 */

const fs = require("fs/promises");
const path = require("path");

// Phase 1-2: Control Center + Profiles
const { readAllTabs } = require("../sheets/reader");
const { buildControlCenterState } = require("../core/control_center");
const { normalizeProfiles } = require("../profiles/profile_normalizer");

// Phase 3: Research Engine
const { runResearchEngine } = require("../research/research_engine");

// Phase 4: Performance Signals
const { extractPerformanceSignals, writePerformanceSignals } = require("../performance/performance_extractor");

// Phase 5: Cost Governor
const { governCost, generateBudgetReport, allocateBudgetByProfile } = require("./cost_governor");

// Phase 6: Planner
const { buildWeeklyContentPlan, planItemsToSheetRows } = require("../planning/weekly_planner");

// Phase 7: Generator
const { generateBatch, contentToSheetRows } = require("../generation/content_generator");

// Phase 8: Approval
const { processBatchApproval, filterApproved } = require("../approval/approval_workflow");

// Phase 9: Publisher
const { publishBatch } = require("../publishing/ayrshare_publisher");

// Phase 10: Analytics
const { retrieveAllAnalytics, aggregateByProfile } = require("../analytics/analytics_retriever");

// Phase 11: Optimization
const { runOptimizationLoop, notesToSheetRows, generateOptimizationReport } = require("../optimization/optimization_loop");

// Phase 12: Telegram
const { sendWeeklyReport, sendPublishConfirmation, sendAlert, buildWeeklyStats } = require("../reporting/telegram_reporter");

// Phase 13: Status Tracker
const { recordPhaseStatus, createRunId, withTiming, writeSystemStatus, generateRunReport } = require("../status/system_status_tracker");

// Sheets Writer
const { writeToTab, rewriteTab } = require("../sheets/writer");

/**
 * Run the complete weekly cycle
 */
async function runWeeklyCycle(sheetId, options = {}) {
  const logger = options.logger ?? console;
  const runId = createRunId();
  const phaseStatuses = [];
  const weekStartDate = options.weekStartDate ?? getNextMonday();
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 6);

  logger.log(`\n${"=".repeat(60)}`);
  logger.log(`CONTENT ENGINE WEEKLY CYCLE`);
  logger.log(`Run ID: ${runId}`);
  logger.log(`Week: ${weekStartDate.toISOString().split("T")[0]} to ${weekEndDate.toISOString().split("T")[0]}`);
  logger.log(`${"=".repeat(60)}\n`);

  // ===== PHASE 1-2: Read Google Sheets =====
  logger.log(`\n--- PHASE 1-2: Control Center + Profiles ---`);
  const p12 = await withTiming(async () => {
    const readResult = await readAllTabs(sheetId, { logger, apiKey: options.apiKey });
    const { controlCenterState, validationReport } = buildControlCenterState(readResult);
    const { profileConfigs, validationResults, validationReport: profileReport } = normalizeProfiles(controlCenterState);

    logger.log(`[P1-2] Loaded ${profileConfigs.length} profiles from ${readResult.availableTabNames.length} tabs`);
    logger.log(validationReport);

    return { controlCenterState, profileConfigs, validationReport, profileReport };
  });

  phaseStatuses.push(recordPhaseStatus(runId, "control_center_read", p12.success ? "success" : "failed", {
    duration_ms: p12.duration_ms,
    items_processed: p12.result?.profileConfigs?.length || 0,
    error: p12.error
  }));

  if (!p12.success) {
    logger.error(`[Cycle] Phase 1-2 failed: ${p12.error}. Aborting.`);
    return buildFailedCycleResult(runId, phaseStatuses, p12.error);
  }

  const { controlCenterState, profileConfigs } = p12.result;

  // Initialize shared state
  const sheets = options.sheets ?? null;
  const weeklySpending = { total: 0 };
  const allResearchOutputs = {};
  const allContentItems = [];
  const allPublishResults = [];

  // ===== PHASE 3: Research Engine (per profile) =====
  logger.log(`\n--- PHASE 3: Research Engine ---`);

  for (const profile of profileConfigs) {
    const p3 = await withTiming(() =>
      runResearchEngine(profile, controlCenterState, {
        logger,
        skipRemote: options.skipRemote,
        ...options
      })
    );

    allResearchOutputs[profile.profile_id] = p3.result;

    phaseStatuses.push(recordPhaseStatus(runId, `research_${profile.profile_id}`, p3.success ? "success" : "partial", {
      duration_ms: p3.duration_ms,
      items_processed: p3.result?.topSources?.length || 0,
      error: p3.error,
      notes: p3.result?.recommendedNextFocus?.recommendedFocus || ""
    }));
  }

  // ===== PHASE 4: Performance Signal Extraction =====
  logger.log(`\n--- PHASE 4: Performance Signal Extraction ---`);
  // Read existing posts from Content_Queue to extract performance signals
  const existingPosts = controlCenterState.tabs.Content_Queue?.rows || [];
  const publishedPosts = existingPosts.filter((p) => p.status === "published" && p.ayrshare_post_id);

  let allSignals = [];
  for (const profile of profileConfigs) {
    const profilePublishedPosts = publishedPosts.filter((p) => p.profile_id === profile.profile_id);

    const p4 = await withTiming(() =>
      extractPerformanceSignals(profile, profilePublishedPosts, {
        logger,
        ayrshareApiKey: options.ayrshareApiKey
      })
    );

    if (p4.success && p4.result.length > 0) {
      allSignals.push(...p4.result);
    }

    phaseStatuses.push(recordPhaseStatus(runId, `performance_signals_${profile.profile_id}`, p4.success ? "success" : "partial", {
      duration_ms: p4.duration_ms,
      items_processed: p4.result?.length || 0
    }));
  }

  // ===== PHASE 5: Cost Governor =====
  logger.log(`\n--- PHASE 5: Cost Governor ---`);
  const weeklyBudget = options.weeklyBudget ?? parseFloat(process.env.WEEKLY_AI_BUDGET ?? "10.00");
  const totalPostsPlanned = profileConfigs.reduce((sum, p) => {
    const schedule = p.posting_schedule || {};
    return sum + Object.values(schedule).reduce((s, v) => s + parseInt(v || 0), 0);
  }, 0);

  const costDecision = governCost(weeklyBudget, weeklySpending.total, totalPostsPlanned);

  logger.log(`[P5] Budget: $${weeklyBudget} | Planned: ${totalPostsPlanned} posts | Allowed: ${costDecision.allowedPosts} | Status: ${costDecision.status}`);

  if (costDecision.status === "CRITICAL") {
    await sendAlert("budget_critical", {
      remaining: `$${costDecision.remainingBudget.toFixed(4)}`,
      status: costDecision.status
    }, options);
  }

  phaseStatuses.push(recordPhaseStatus(runId, "cost_governor", "success", {
    notes: `Status: ${costDecision.status} | Allowed: ${costDecision.allowedPosts}/${costDecision.plannedPosts}`
  }));

  // ===== PHASE 6: Weekly Content Planner =====
  logger.log(`\n--- PHASE 6: Weekly Content Planner ---`);
  const allPlanItems = [];

  for (const profile of profileConfigs) {
    const p6 = await withTiming(() => {
      const plan = buildWeeklyContentPlan(profile, allResearchOutputs[profile.profile_id], {
        logger,
        weekStartDate
      });
      return plan;
    });

    if (p6.success) {
      allPlanItems.push(...p6.result.items);
    }

    phaseStatuses.push(recordPhaseStatus(runId, `content_plan_${profile.profile_id}`, p6.success ? "success" : "failed", {
      duration_ms: p6.duration_ms,
      items_processed: p6.result?.items?.length || 0
    }));
  }

  logger.log(`[P6] Planned ${allPlanItems.length} posts across ${profileConfigs.length} profiles`);

  // Apply cost governor throttle
  const throttledPlanItems = allPlanItems.slice(0, costDecision.allowedPosts);
  if (throttledPlanItems.length < allPlanItems.length) {
    logger.log(`[P5→P6] Cost governor throttled: ${allPlanItems.length} → ${throttledPlanItems.length} posts`);
  }

  // Write plan to Weekly_Content_Plan tab
  if (sheets && throttledPlanItems.length > 0) {
    try {
      const { headers, rows } = planItemsToSheetRows(throttledPlanItems);
      await writeToTab(sheets, sheetId, "Weekly_Content_Plan", headers, rows);
      logger.log(`[P6] Wrote ${rows.length} plan items to Weekly_Content_Plan`);
    } catch (e) {
      logger.error(`[P6] Failed to write plan: ${e.message}`);
    }
  }

  // ===== PHASE 7: Content Generation =====
  logger.log(`\n--- PHASE 7: Content Generation ---`);

  for (const profile of profileConfigs) {
    const profilePlanItems = throttledPlanItems.filter((item) => item.profile_id === profile.profile_id);
    if (profilePlanItems.length === 0) continue;

    const p7 = await withTiming(() =>
      generateBatch(profilePlanItems, profile, {
        logger,
        claudeApiKey: options.claudeApiKey ?? process.env.ANTHROPIC_API_KEY,
        previousSpending: weeklySpending.total,
        ...options
      })
    );

    if (p7.success) {
      allContentItems.push(...p7.result.contents);
      weeklySpending.total = p7.result.totalCost;
    }

    phaseStatuses.push(recordPhaseStatus(runId, `content_gen_${profile.profile_id}`, p7.success ? "success" : "partial", {
      duration_ms: p7.duration_ms,
      items_processed: p7.result?.contents?.length || 0,
      notes: `Cost: $${(p7.result?.totalCost || 0).toFixed(4)}`
    }));
  }

  logger.log(`[P7] Generated ${allContentItems.length} pieces | Total cost so far: $${weeklySpending.total.toFixed(4)}`);

  // ===== PHASE 8: Approval Workflow =====
  logger.log(`\n--- PHASE 8: Approval Workflow ---`);
  const allApprovalResults = [];

  for (const profile of profileConfigs) {
    const profileContent = allContentItems.filter((c) => c.profile_id === profile.profile_id);
    if (profileContent.length === 0) continue;

    const p8 = await withTiming(() =>
      processBatchApproval(profileContent, profile, { logger })
    );

    if (p8.success) {
      allApprovalResults.push(...p8.result.results);
    }

    phaseStatuses.push(recordPhaseStatus(runId, `approval_${profile.profile_id}`, "success", {
      duration_ms: p8.duration_ms,
      items_processed: p8.result?.approved || 0,
      notes: `Approved: ${p8.result?.approved}/${profileContent.length}`
    }));
  }

  const approvedContent = filterApproved(allApprovalResults);
  logger.log(`[P8] Approved: ${approvedContent.length}/${allContentItems.length} pieces`);

  // ===== PHASE 9: Publishing =====
  logger.log(`\n--- PHASE 9: Publishing ---`);
  const dryRun = options.dryRun ?? false;

  const p9 = await withTiming(() =>
    publishBatch(approvedContent, {
      logger,
      ayrshareApiKey: options.ayrshareApiKey ?? process.env.AYRSHARE_API_KEY,
      dryRun
    })
  );

  if (p9.success) {
    allPublishResults.push(...p9.result.results);
  }

  phaseStatuses.push(recordPhaseStatus(runId, "publishing", p9.success ? "success" : "partial", {
    duration_ms: p9.duration_ms,
    items_processed: p9.result?.successCount || 0,
    notes: `${p9.result?.successCount}/${approvedContent.length} published${dryRun ? " (dry run)" : ""}`
  }));

  // Notify Telegram of publish results
  if (allPublishResults.length > 0) {
    await sendPublishConfirmation(allPublishResults, options);
  }

  // Write to Content_Queue
  if (sheets && allContentItems.length > 0) {
    try {
      const enrichedContent = allContentItems.map((c) => {
        const publishResult = allPublishResults.find((r) => r.plan_item_id === c.plan_item_id);
        return {
          ...c,
          ayrshare_post_id: publishResult?.ayrshare_post_id || "",
          published_at: publishResult?.published_at || "",
          status: publishResult?.success ? "published" : c.status
        };
      });

      const { headers, rows } = contentToSheetRows(enrichedContent);
      await writeToTab(sheets, sheetId, "Content_Queue", headers, rows);
      logger.log(`[P9] Wrote ${rows.length} items to Content_Queue`);
    } catch (e) {
      logger.error(`[P9] Failed to write to Content_Queue: ${e.message}`);
    }
  }

  // ===== PHASE 10: Analytics Retrieval =====
  logger.log(`\n--- PHASE 10: Analytics Retrieval ---`);

  // Retrieve analytics for previously published posts (from last week)
  const previouslyPublishedPosts = publishedPosts.filter((p) => {
    const publishedAt = new Date(p.published_at || 0);
    const ageHours = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);
    return ageHours >= 24; // at least 24 hours old
  });

  const p10 = await withTiming(() =>
    retrieveAllAnalytics(previouslyPublishedPosts, {
      logger,
      ayrshareApiKey: options.ayrshareApiKey
    })
  );

  const analyticsResults = p10.result || [];
  const analyticsAggregated = aggregateByProfile(analyticsResults);

  phaseStatuses.push(recordPhaseStatus(runId, "analytics_retrieval", p10.success ? "success" : "partial", {
    duration_ms: p10.duration_ms,
    items_processed: analyticsResults.length
  }));

  // Write performance signals to sheets
  if (sheets && allSignals.length > 0) {
    try {
      await writePerformanceSignals(sheets, sheetId, allSignals, logger);
    } catch (e) {
      logger.error(`[P10] Failed to write performance signals: ${e.message}`);
    }
  }

  // ===== PHASE 11: Optimization Loop =====
  logger.log(`\n--- PHASE 11: Optimization Loop ---`);

  const p11 = await withTiming(() => {
    const notes = runOptimizationLoop(
      analyticsAggregated,
      allResearchOutputs,
      profileConfigs,
      { logger }
    );
    return notes;
  });

  const optimizationNotes = p11.result || [];
  const optimizationReport = generateOptimizationReport(optimizationNotes);
  logger.log(optimizationReport);

  // Write to Optimization_Notes tab
  if (sheets && optimizationNotes.length > 0) {
    try {
      const { headers, rows } = notesToSheetRows(optimizationNotes);
      await writeToTab(sheets, sheetId, "Optimization_Notes", headers, rows);
      logger.log(`[P11] Wrote ${rows.length} optimization notes`);
    } catch (e) {
      logger.error(`[P11] Failed to write optimization notes: ${e.message}`);
    }
  }

  phaseStatuses.push(recordPhaseStatus(runId, "optimization_loop", "success", {
    duration_ms: p11.duration_ms,
    items_processed: optimizationNotes.length
  }));

  // ===== PHASE 12: Telegram Reporting =====
  logger.log(`\n--- PHASE 12: Telegram Reporting ---`);

  const weeklyStats = buildWeeklyStats(
    profileConfigs,
    analyticsAggregated,
    costDecision,
    optimizationNotes,
    weekStartDate.toISOString().split("T")[0],
    weekEndDate.toISOString().split("T")[0]
  );
  weeklyStats.weekly_ai_cost = weeklySpending.total;

  await sendWeeklyReport(weeklyStats, options);

  phaseStatuses.push(recordPhaseStatus(runId, "telegram_reporting", "success", {
    notes: `${weeklyStats.total_posts_published} posts | ${weeklyStats.total_conversions} conversions | $${weeklySpending.total.toFixed(4)} AI cost`
  }));

  // ===== PHASE 13: System Status Tracker =====
  logger.log(`\n--- PHASE 13: System Status Tracker ---`);

  const runReport = generateRunReport(runId, phaseStatuses, weeklyStats);
  logger.log(runReport);

  if (sheets) {
    await writeSystemStatus(sheets, sheetId, phaseStatuses, logger);
  }

  // ===== SAVE OUTPUTS =====
  const outputDir = options.outputDir ?? process.cwd();

  await fs.writeFile(
    path.join(outputDir, "weekly-research-output.json"),
    JSON.stringify(allResearchOutputs, null, 2)
  );

  await fs.writeFile(
    path.join(outputDir, "weekly-content-output.json"),
    JSON.stringify(allContentItems, null, 2)
  );

  await fs.writeFile(
    path.join(outputDir, "weekly-run-report.json"),
    JSON.stringify({
      runId,
      weekStart: weekStartDate.toISOString().split("T")[0],
      weekEnd: weekEndDate.toISOString().split("T")[0],
      phases: phaseStatuses,
      weeklyStats,
      report: runReport
    }, null, 2)
  );

  logger.log(`\n${"=".repeat(60)}`);
  logger.log(`WEEKLY CYCLE COMPLETE`);
  logger.log(`Run ID: ${runId}`);
  logger.log(`Posts generated: ${allContentItems.length}`);
  logger.log(`Posts published: ${allPublishResults.filter((r) => r.success).length}`);
  logger.log(`AI Cost: $${weeklySpending.total.toFixed(4)} / $${weeklyBudget.toFixed(2)}`);
  logger.log(`${"=".repeat(60)}\n`);

  return {
    runId,
    success: true,
    phaseStatuses,
    profileConfigs,
    researchOutputs: allResearchOutputs,
    contentItems: allContentItems,
    publishResults: allPublishResults,
    analyticsResults,
    analyticsAggregated,
    optimizationNotes,
    weeklyStats,
    weeklySpending: weeklySpending.total,
    report: runReport
  };
}

/**
 * Build a result for failed cycles (early abort)
 */
function buildFailedCycleResult(runId, phaseStatuses, errorMessage) {
  return {
    runId,
    success: false,
    error: errorMessage,
    phaseStatuses,
    contentItems: [],
    publishResults: [],
    weeklyStats: null
  };
}

/**
 * Get next Monday as week start
 */
function getNextMonday() {
  const date = new Date();
  const day = date.getDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  date.setDate(date.getDate() + daysUntilMonday);
  date.setHours(0, 0, 0, 0);
  return date;
}

module.exports = {
  runWeeklyCycle
};
