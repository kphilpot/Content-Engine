const fetch = require("node-fetch");
const { synthesizeWithGemini } = require("./analysis/gemini_synthesizer");
const { scanRedditSources } = require("./sources/reddit_source_scanner");
const { scanTwitterSources } = require("./sources/twitter_source_scanner");
const { rankSourcesByConversionPotential } = require("./sources/source_ranker");
const { analyzePerformanceSignals } = require("./learning/performance_analyzer");
const { optimizeResearchFocus } = require("./learning/focus_optimizer");
const { adaptSourcesBasedOnPerformance } = require("./learning/source_adapter");

/**
 * Self-learning Research Engine
 *
 * Discovers, ranks, and optimizes research sources based on:
 * 1. Initial configuration (research_focus, content_pillars from Channel_Profiles)
 * 2. Performance signals (what's actually converting/engaging)
 * 3. Reference page analysis (patterns from high-performing examples)
 * 4. Weekly adaptation (swaps underperforming sources, refocuses research)
 *
 * Output: Research recommendations for content generation (hooks, angles, patterns, sources)
 */
async function runResearchEngine(profile, controlCenterState, options = {}) {
  const logger = options.logger ?? console;
  const skipRemote = options.skipRemote ?? false; // for testing

  logger.log(`\n=== Research Engine: ${profile.profile_id} ===`);

  // PHASE 1: Analyze current performance to understand what's working
  logger.log(`[Research] Analyzing performance signals...`);
  const insights = await analyzePerformanceSignals(
    profile,
    controlCenterState.tabs.Performance_Signals,
    { logger }
  );
  const performanceSignals = { insights };

  // PHASE 2: Discover sources (Reddit, Twitter)
  logger.log(`[Research] Scanning Reddit sources...`);
  const redditSources = !skipRemote
    ? await scanRedditSources(profile, performanceSignals, { logger })
    : [];

  logger.log(`[Research] Scanning Twitter sources...`);
  const twitterSources = !skipRemote
    ? await scanTwitterSources(profile, performanceSignals, { logger })
    : [];

  // PHASE 3: Rank sources by conversion potential
  logger.log(`[Research] Ranking sources by conversion potential...`);
  const rankedSources = rankSourcesByConversionPotential(
    [...redditSources, ...twitterSources],
    profile,
    performanceSignals
  );

  // PHASE 4: Extract patterns from reference pages and top sources
  logger.log(`[Research] Extracting patterns from references...`);
  const referencePages = controlCenterState.tabs.Reference_Pages.rows.filter(
    (row) => row.profile_id === profile.profile_id && row.enabled !== false
  );

  const patternAnalysis = await synthesizeWithGemini(
    profile,
    referencePages,
    rankedSources.slice(0, 10), // top 10 sources
    { logger, skipRemote }
  );

  // PHASE 5: Adapt research focus for next week
  logger.log(`[Research] Optimizing research focus...`);
  const nextWeekFocus = optimizeResearchFocus(profile, performanceSignals, patternAnalysis);

  // PHASE 6: Adapt sources (swap underperformers, discover new ones)
  logger.log(`[Research] Adapting sources based on performance...`);
  const adaptedSourceSelection = adaptSourcesBasedOnPerformance(
    profile,
    rankedSources,
    performanceSignals,
    controlCenterState.tabs.Reference_Pages
  );

  const researchOutput = {
    profile_id: profile.profile_id,
    generatedAt: new Date().toISOString(),
    performanceInsights: insights,
    topSources: rankedSources.slice(0, 5).map((s) => ({
      source_url: s.url,
      source_type: s.type,
      title: s.title,
      conversionScore: s.conversionScore,
      engagement: s.engagement,
      relevanceScore: s.relevanceScore
    })),
    hookPatterns: patternAnalysis.hooks,
    contentPatterns: patternAnalysis.contentPatterns,
    trustPatterns: patternAnalysis.trustPatterns,
    conversionPatterns: patternAnalysis.conversionPatterns,
    recommendedNextFocus: nextWeekFocus,
    sourcesToAdd: adaptedSourceSelection.toAdd,
    sourcesToReplace: adaptedSourceSelection.toReplace
  };

  logger.log(`[Research] ✓ Research engine complete for ${profile.profile_id}`);

  return researchOutput;
}

module.exports = {
  runResearchEngine
};
