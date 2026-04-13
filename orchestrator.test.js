const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs/promises");
const path = require("path");
const { orchestrator } = require("./core/orchestrator");

const SHEET_ID = "1hE_adADIYgqkSeCuNL7JOt6ps_VRpWtc9CO1t3xkyXI";
const EXPECTED_PROFILE_IDS = [
  "personal_product_main",
  "hair_authority_1",
  "hair_authority_2"
];

test("orchestrator loads and validates all expected profiles from the control center sheet", async () => {
  const outputPath = path.join(process.cwd(), "profiles.json");
  const result = await orchestrator(SHEET_ID, { outputPath });

  console.log(result.controlCenterReport);
  console.log("");
  console.log(result.profileReport);
  console.log("");
  console.log(JSON.stringify(result.profileConfigs, null, 2));

  assert.equal(Object.keys(result.controlCenterState.tabs).length, 11);
  assert.equal(
    result.profileConfigs.length,
    3,
    `Expected 3 enabled profiles but loaded ${result.profileConfigs.length}. Available workbook tabs: ${result.controlCenterState.availableTabNames.join(", ")}`
  );

  const loadedProfileIds = result.profileConfigs.map((profile) => profile.profile_id);
  EXPECTED_PROFILE_IDS.forEach((profileId) => {
    assert.ok(loadedProfileIds.includes(profileId), `Expected profile ${profileId} to be loaded`);
  });

  result.profileConfigs.forEach((profile) => {
    const ratioSum = Object.values(profile.content_ratios).reduce((sum, value) => sum + value, 0);
    assert.equal(ratioSum, 100, `Expected ratios to sum to 100 for ${profile.profile_id}`);
    assert.ok(profile.reference_pages.length > 0, `Expected reference pages for ${profile.profile_id}`);
  });

  const savedProfiles = JSON.parse(await fs.readFile(outputPath, "utf8"));
  assert.equal(savedProfiles.length, 3);
});
