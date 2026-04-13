/**
 * Phase 13: System Status Tracker
 *
 * Tracks which phases ran, their success/failure status, and
 * writes to the System_Status tab in Google Sheets
 *
 * Also generates the full weekly run summary
 */

const { appendRow } = require("../sheets/writer");

/**
 * Record a phase completion in System_Status
 */
function recordPhaseStatus(runId, phaseName, status, details = {}) {
  return {
    run_id: runId,
    timestamp: new Date().toISOString(),
    phase: phaseName,
    status, // "success" | "failed" | "skipped" | "partial"
    error: details.error || "",
    duration_ms: details.duration_ms || 0,
    items_processed: details.items_processed || 0,
    notes: details.notes || ""
  };
}

/**
 * Create a new run ID for the weekly cycle
 */
function createRunId() {
  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const time = now.toTimeString().split(" ")[0].replace(/:/g, "");
  return `run_${date}_${time}`;
}

/**
 * Track timing of a function execution
 */
async function withTiming(fn, label) {
  const start = Date.now();
  let result, error;

  try {
    result = await fn();
    return {
      result,
      success: true,
      duration_ms: Date.now() - start,
      label
    };
  } catch (err) {
    return {
      error: err.message,
      success: false,
      duration_ms: Date.now() - start,
      label
    };
  }
}

/**
 * Write all phase statuses to System_Status tab
 */
async function writeSystemStatus(sheets, spreadsheetId, phaseStatuses, logger = console) {
  if (!sheets || !phaseStatuses.length) {
    logger.log(`[Status] No status entries to write`);
    return;
  }

  const headers = [
    "run_id", "timestamp", "phase", "status",
    "error", "duration_ms", "items_processed", "notes"
  ];

  for (const status of phaseStatuses) {
    const row = headers.map((h) => String(status[h] ?? ""));
    try {
      await appendRow(sheets, spreadsheetId, "System_Status", row);
    } catch (error) {
      logger.error(`[Status] Failed to write status row: ${error.message}`);
    }
  }

  logger.log(`[Status] Wrote ${phaseStatuses.length} status entries`);
}

/**
 * Generate a full system run report
 */
function generateRunReport(runId, phaseStatuses, weeklyStats) {
  const passed = phaseStatuses.filter((p) => p.status === "success").length;
  const failed = phaseStatuses.filter((p) => p.status === "failed").length;
  const totalDuration = phaseStatuses.reduce((s, p) => s + (p.duration_ms || 0), 0);

  const lines = [
    `=== System Run Report ===`,
    `Run ID: ${runId}`,
    `Timestamp: ${new Date().toISOString()}`,
    `Phases: ${passed}/${phaseStatuses.length} succeeded (${failed} failed)`,
    `Total Duration: ${(totalDuration / 1000).toFixed(1)}s`,
    ``
  ];

  phaseStatuses.forEach((p) => {
    const icon = p.status === "success" ? "✅" : p.status === "failed" ? "❌" : "⏭";
    lines.push(
      `${icon} ${p.phase.padEnd(25)} ${p.status.padEnd(10)} ${p.duration_ms}ms${p.items_processed ? ` (${p.items_processed} items)` : ""}`
    );
  });

  if (weeklyStats) {
    lines.push(``);
    lines.push(`Weekly Results:`);
    lines.push(`• Posts published: ${weeklyStats.total_posts_published || 0}`);
    lines.push(`• Conversions: ${weeklyStats.total_conversions || 0}`);
    lines.push(`• AI cost: $${(weeklyStats.weekly_ai_cost || 0).toFixed(4)}`);
  }

  const failures = phaseStatuses.filter((p) => p.status === "failed");
  if (failures.length > 0) {
    lines.push(``);
    lines.push(`Failures:`);
    failures.forEach((p) => lines.push(`• ${p.phase}: ${p.error}`));
  }

  return lines.join("\n");
}

/**
 * Check if the system is healthy based on phase statuses
 */
function isSystemHealthy(phaseStatuses) {
  const criticalPhases = ["control_center_read", "profile_read", "content_generation", "publishing"];
  const failedCritical = phaseStatuses.filter(
    (p) => criticalPhases.includes(p.phase) && p.status === "failed"
  );

  return failedCritical.length === 0;
}

module.exports = {
  recordPhaseStatus,
  createRunId,
  withTiming,
  writeSystemStatus,
  generateRunReport,
  isSystemHealthy
};
