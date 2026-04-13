const { orchestrator } = require("../core/orchestrator");

const SHEET_ID = process.argv[2] || "1hE_adADIYgqkSeCuNL7JOt6ps_VRpWtc9CO1t3xkyXI";

async function main() {
  const result = await orchestrator(SHEET_ID);
  console.log(result.controlCenterReport);
  console.log("");
  console.log(result.profileReport);
  console.log("");
  console.log("ProfileConfig objects:");
  console.log(JSON.stringify(result.profileConfigs, null, 2));
  console.log("");
  console.log(`Saved profiles to ${result.outputPath}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
