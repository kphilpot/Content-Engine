const fetch = require("node-fetch");
const fs = require("fs");
const XLSX = require("xlsx");

const CURRENT_SHEET_ID = "1hE_adADIYgqkSeCuNL7JOt6ps_VRpWtc9CO1t3xkyXI";
const EXPECTED_TABS = [
  "Channel_Profiles",
  "Plugins",
  "Reference_Pages",
  "Weekly_Research",
  "Weekly_Content_Plan",
  "Content_Queue",
  "Performance_Log",
  "Performance_Signals",
  "Optimization_Notes",
  "System_Status",
  "Manual_Performance_Paste"
];

async function checkCurrentSheet() {
  console.log("🔍 Checking current Google Sheet status...\n");

  try {
    const url = `https://docs.google.com/spreadsheets/d/${CURRENT_SHEET_ID}/export?format=xlsx`;
    const response = await fetch(url);

    if (!response.ok) {
      console.log("❌ Could not access sheet (not public or doesn't exist)");
      return false;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const currentTabs = workbook.SheetNames;

    console.log(`Sheet ID: ${CURRENT_SHEET_ID}`);
    console.log(`Current tabs: ${currentTabs.join(", ")}`);
    console.log(`Missing tabs: ${EXPECTED_TABS.filter((t) => !currentTabs.includes(t)).join(", ")}`);
    console.log();

    return false; // Not fixed yet
  } catch (error) {
    console.log("❌ Error checking sheet:", error.message);
    return false;
  }
}

function checkLocalFiles() {
  console.log("📂 Checking local files...\n");

  const files = {
    "control_center.xlsx": "Generated template with all tabs",
    "SHEETS_SETUP.md": "Setup instructions",
    "orchestrator.test.js": "Test file (update Sheet ID here)"
  };

  Object.entries(files).forEach(([file, desc]) => {
    const exists = fs.existsSync(file);
    const status = exists ? "✅" : "❌";
    console.log(`${status} ${file} - ${desc}`);
  });
  console.log();
}

async function main() {
  console.log("=" + "=".repeat(59));
  console.log("Content Engine - Google Sheets Setup Status");
  console.log("=" + "=".repeat(59));
  console.log();

  checkLocalFiles();

  const sheetFixed = await checkCurrentSheet();

  console.log("📋 Summary:");
  console.log();

  if (sheetFixed) {
    console.log("✅ Google Sheet is properly configured!");
    console.log("   Run 'npm test' to verify everything works.");
  } else {
    console.log("⚠️  Google Sheet needs setup. Choose one option:");
    console.log();
    console.log("OPTION 1: Upload the generated XLSX (Easiest)");
    console.log("  1. Go to https://sheets.google.com");
    console.log("  2. Upload 'control_center.xlsx'");
    console.log("  3. Note the new Sheet ID");
    console.log("  4. Update orchestrator.test.js with the new ID");
    console.log();
    console.log("OPTION 2: Use Google Sheets API");
    console.log("  1. Set GOOGLE_SHEETS_API_KEY environment variable");
    console.log("  2. Grant the API access to the current sheet");
    console.log("  3. The system will create the tabs automatically");
    console.log();
    console.log("OPTION 3: Manually create tabs");
    console.log("  1. Visit the sheet: bit.ly/codex-sheet");
    console.log("     (or: docs.google.com/spreadsheets/d/" + CURRENT_SHEET_ID + ")");
    console.log("  2. Create 11 tabs with the names above");
    console.log("  3. Copy data from control_center.xlsx");
    console.log();
    console.log("📖 See SHEETS_SETUP.md for detailed instructions");
  }

  console.log();
  console.log("=" + "=".repeat(59));
}

main().catch(console.error);
