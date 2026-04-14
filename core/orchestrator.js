const fs = require("fs/promises");
const path = require("path");
const { readAllTabs } = require("../sheets/reader_yaml");
const { buildControlCenterState } = require("./control_center");
const { normalizeProfiles } = require("../profiles/profile_normalizer");
const { runResearchEngine } = require("../research/research_engine");

async function orchestrator(sheetId, options = {}) {
  const logger = options.logger ?? console;
  const outputPath = options.outputPath ?? path.join(process.cwd(), "profiles.json");
  const researchOutputPath =
    options.researchOutputPath ?? path.join(process.cwd(), "research-output.json");
  const skipResearch = options.skipResearch ?? false;

  // PHASE 1-2: Read and validate control center (from YAML config files)
  const readResult = await readAllTabs();
  const { controlCenterState, validationReport: controlCenterReport } =
    buildControlCenterState(readResult);
  const { profileConfigs, validationResults, validationReport: profileReport } =
    normalizeProfiles(controlCenterState);

  // Save profile configurations
  await fs.writeFile(outputPath, JSON.stringify(profileConfigs, null, 2));

  // PHASE 3: Run research engine for each enabled profile
  let researchResults = null;
  if (!skipResearch) {
    logger.log("\n=== PHASE 3: Research Engine ===\n");

    researchResults = {};
    for (const profile of profileConfigs) {
      try {
        researchResults[profile.profile_id] = await runResearchEngine(
          profile,
          controlCenterState,
          { logger, ...options }
        );
      } catch (error) {
        logger.error(
          `[Orchestrator] Research engine failed for ${profile.profile_id}: ${error.message}`
        );
        researchResults[profile.profile_id] = {
          profile_id: profile.profile_id,
          error: error.message,
          generatedAt: new Date().toISOString()
        };
      }
    }

    // Save research results
    await fs.writeFile(researchOutputPath, JSON.stringify(researchResults, null, 2));
    logger.log(`\n[Orchestrator] Research results saved to: ${researchOutputPath}`);
  }

  return {
    controlCenterState,
    controlCenterReport,
    profileConfigs,
    profileValidationResults: validationResults,
    profileReport,
    researchResults,
    outputPath,
    researchOutputPath,
    completedPhases: skipResearch ? [1, 2] : [1, 2, 3]
  };
}

module.exports = {
  orchestrator
};
