/**
 * Phase 12: Telegram Reporter
 *
 * Sends reports and alerts to a Telegram bot for operational monitoring
 *
 * Message types:
 * - Weekly summary report (sent every Monday)
 * - Publishing confirmations (per batch)
 * - Performance alerts (drift detected, high performer)
 * - Error alerts (API failures, budget warnings)
 * - Budget status updates
 */

const TELEGRAM_API_BASE = "https://api.telegram.org/bot";

/**
 * Send a weekly summary report to Telegram
 */
async function sendWeeklyReport(weeklyStats, options = {}) {
  const logger = options.logger ?? console;
  const botToken = options.telegramBotToken ?? process.env.TELEGRAM_BOT_TOKEN;
  const chatId = options.telegramChatId ?? process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    logger.log(`[Telegram] Not configured (missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID)`);
    return { sent: false, reason: "not_configured" };
  }

  const message = formatWeeklyReport(weeklyStats);

  return sendMessage(message, botToken, chatId, logger);
}

/**
 * Send a publishing confirmation
 */
async function sendPublishConfirmation(publishResults, options = {}) {
  const logger = options.logger ?? console;
  const botToken = options.telegramBotToken ?? process.env.TELEGRAM_BOT_TOKEN;
  const chatId = options.telegramChatId ?? process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) return { sent: false };

  const message = formatPublishConfirmation(publishResults);
  return sendMessage(message, botToken, chatId, logger);
}

/**
 * Send a performance alert
 */
async function sendAlert(alertType, details, options = {}) {
  const logger = options.logger ?? console;
  const botToken = options.telegramBotToken ?? process.env.TELEGRAM_BOT_TOKEN;
  const chatId = options.telegramChatId ?? process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) return { sent: false };

  const message = formatAlert(alertType, details);
  return sendMessage(message, botToken, chatId, logger);
}

/**
 * Core Telegram API call
 */
async function sendMessage(text, botToken, chatId, logger) {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML"
      })
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error(`[Telegram] Send failed: ${error}`);
      return { sent: false, error };
    }

    logger.log(`[Telegram] Message sent successfully`);
    return { sent: true };
  } catch (error) {
    logger.error(`[Telegram] Network error: ${error.message}`);
    return { sent: false, error: error.message };
  }
}

/**
 * Format the weekly summary report message
 */
function formatWeeklyReport(stats) {
  const lines = [
    `📊 <b>CONTENT ENGINE - WEEKLY REPORT</b>`,
    `Week: ${stats.week_start || "N/A"} to ${stats.week_end || "N/A"}`,
    ``
  ];

  // Per-profile stats
  if (stats.profiles && stats.profiles.length > 0) {
    lines.push(`<b>Profile Performance:</b>`);

    stats.profiles.forEach((profile) => {
      const engRate = ((profile.avg_engagement_rate || 0) * 100).toFixed(1);
      const convRate = ((profile.conversion_rate || 0) * 100).toFixed(2);
      const grade = getPerformanceEmoji(profile.avg_engagement_rate || 0);

      lines.push(
        `${grade} <b>${profile.profile_id}</b>`,
        `  Posts: ${profile.total_posts || 0} | Engagement: ${engRate}%`,
        `  Conversions: ${profile.total_conversions || 0} (${convRate}%)`,
        ``
      );
    });
  }

  // Overall totals
  lines.push(`<b>Totals:</b>`);
  lines.push(`• Total posts published: ${stats.total_posts_published || 0}`);
  lines.push(`• Total conversions: ${stats.total_conversions || 0}`);
  lines.push(`• Weekly AI cost: $${(stats.weekly_ai_cost || 0).toFixed(4)}`);

  if (stats.alerts && stats.alerts.length > 0) {
    lines.push(``);
    lines.push(`<b>⚠️ Alerts:</b>`);
    stats.alerts.forEach((alert) => lines.push(`• ${alert}`));
  }

  lines.push(``);
  lines.push(`<i>Next actions in Optimization_Notes tab</i>`);

  return lines.join("\n");
}

/**
 * Format publishing confirmation message
 */
function formatPublishConfirmation(results) {
  const success = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  const lines = [
    `✅ <b>PUBLISHING COMPLETE</b>`,
    `Published: ${success} | Failed: ${failed}`,
    ``
  ];

  if (failed > 0) {
    lines.push(`❌ <b>Failed posts:</b>`);
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        lines.push(`• ${r.plan_item_id || "unknown"}: ${r.error}`);
      });
  }

  return lines.join("\n");
}

/**
 * Format an alert message
 */
function formatAlert(alertType, details) {
  const icons = {
    drift_detected: "📉",
    high_performer: "🚀",
    budget_warning: "💰",
    budget_critical: "🚨",
    api_error: "⚠️",
    research_update: "🔬"
  };

  const icon = icons[alertType] || "ℹ️";
  const typeLabel = alertType.replace(/_/g, " ").toUpperCase();

  const lines = [
    `${icon} <b>${typeLabel}</b>`,
    ``
  ];

  if (typeof details === "string") {
    lines.push(details);
  } else if (details && typeof details === "object") {
    Object.entries(details).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        lines.push(`• ${key}: ${value}`);
      }
    });
  }

  return lines.join("\n");
}

/**
 * Get performance grade emoji
 */
function getPerformanceEmoji(engagementRate) {
  if (engagementRate >= 0.08) return "🔥";
  if (engagementRate >= 0.05) return "✅";
  if (engagementRate >= 0.03) return "⚡";
  return "🔴";
}

/**
 * Build weekly stats object from all phase outputs
 */
function buildWeeklyStats(profiles, analyticsAggregated, costState, optimizationNotes, weekStart, weekEnd) {
  const alerts = [];

  // Collect critical alerts
  const criticalNotes = optimizationNotes.filter((n) => n.priority === "critical");
  criticalNotes.forEach((n) => alerts.push(n.observation.substring(0, 100)));

  // Budget alerts
  if (costState && costState.status === "CRITICAL") {
    alerts.push(`Budget critical: $${costState.remainingBudget.toFixed(4)} remaining`);
  }

  const profileStats = Object.values(analyticsAggregated || {}).map((agg) => ({
    profile_id: agg.profile_id,
    total_posts: agg.total_posts,
    avg_engagement_rate: agg.avg_engagement_rate,
    conversion_rate: agg.conversion_rate,
    total_conversions: agg.total_conversions
  }));

  return {
    week_start: weekStart,
    week_end: weekEnd,
    profiles: profileStats,
    total_posts_published: profileStats.reduce((s, p) => s + (p.total_posts || 0), 0),
    total_conversions: profileStats.reduce((s, p) => s + (p.total_conversions || 0), 0),
    weekly_ai_cost: costState?.weeklySpendingToDate || 0,
    alerts
  };
}

module.exports = {
  sendWeeklyReport,
  sendPublishConfirmation,
  sendAlert,
  formatWeeklyReport,
  buildWeeklyStats
};
