/**
 * Run the complete weekly content engine cycle
 *
 * Usage:
 *   node scripts/run_weekly_cycle.js [sheet-id] [options]
 *
 * Options:
 *   --dry-run          Don't actually publish (just generate content)
 *   --skip-remote      Skip Reddit/Twitter API calls (for testing)
 *   --skip-research    Skip Phase 3 research
 *   --no-telegram      Don't send Telegram notifications
 *
 * Environment variables:
 *   GOOGLE_SHEETS_API_KEY   - Google service account JSON
 *   ANTHROPIC_API_KEY       - Claude API key
 *   AYRSHARE_API_KEY        - Ayrshare publishing API key
 *   TELEGRAM_BOT_TOKEN      - Telegram bot token
 *   TELEGRAM_CHAT_ID        - Telegram chat ID
 *   WEEKLY_AI_BUDGET        - Max AI spend per week (default: 10.00)
 */

const { runWeeklyCycle } = require("../engine/weekly_cycle");

const SHEET_ID = process.argv[2] || process.env.CONTROL_CENTER_SHEET_ID || "1hE_adADIYgqkSeCuNL7JOt6ps_VRpWtc9CO1t3xkyXI";
const args = process.argv.slice(3);

const options = {
  dryRun: args.includes("--dry-run"),
  skipRemote: args.includes("--skip-remote"),
  skipResearch: args.includes("--skip-research"),
  disableTelegram: args.includes("--no-telegram"),
  weeklyBudget: parseFloat(process.env.WEEKLY_AI_BUDGET ?? "10.00")
};

async function main() {
  console.log(`Starting Content Engine Weekly Cycle`);
  console.log(`Sheet ID: ${SHEET_ID}`);
  console.log(`Options: ${JSON.stringify(options)}`);
  console.log(``);

  const result = await runWeeklyCycle(SHEET_ID, options);

  if (!result.success) {
    console.error(`\n❌ Cycle failed: ${result.error}`);
    process.exitCode = 1;
    return;
  }

  console.log(`\n✅ Weekly cycle complete!`);
  console.log(`   Run ID: ${result.runId}`);
  console.log(`   Posts generated: ${result.contentItems.length}`);
  console.log(`   Posts published: ${result.publishResults.filter((r) => r.success).length}`);
  console.log(`   AI Cost: $${result.weeklySpending.toFixed(4)}`);
  console.log(`\nOutputs saved:`);
  console.log(`   weekly-research-output.json`);
  console.log(`   weekly-content-output.json`);
  console.log(`   weekly-run-report.json`);
}

main().catch((error) => {
  console.error(`Fatal error: ${error.stack || error.message}`);
  process.exitCode = 1;
});
