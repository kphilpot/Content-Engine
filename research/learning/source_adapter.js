/**
 * Source Adapter
 *
 * Manages reference page updates:
 * 1. Identifies underperforming sources (low engagement, no conversions)
 * 2. Recommends new sources to add (from research engine findings)
 * 3. Provides instructions for updating Reference_Pages tab in Google Sheets
 *
 * The Reference_Pages tab acts as the "memory" of which sources we're learning from
 * Each week, we swap out the bottom performers for top new discoveries
 */

function adaptSourcesBasedOnPerformance(profile, rankedSources, performanceSignals, referenceTab) {
  // Get current reference pages for this profile
  const currentReferences = referenceTab.rows.filter(
    (row) => row.profile_id === profile.profile_id
  );

  // Identify which references are underperforming
  const sourcePerformance = performanceSignals.insights.sourcePerformance || [];

  const toReplace = identifySourcesForReplacement(
    currentReferences,
    sourcePerformance,
    profile.profile_id
  );

  const toAdd = identifySourcesForAddition(
    rankedSources,
    currentReferences,
    performanceSignals
  );

  return {
    profile_id: profile.profile_id,
    toReplace: toReplace.map((ref) => ({
      reference_id: ref.reference_id,
      current_name: ref.reference_name,
      current_url: ref.reference_url,
      reason: ref.replacementReason
    })),
    toAdd: toAdd.map((source) => ({
      reference_name: source.title || source.hashtag || source.subreddit,
      reference_url: source.url,
      reference_type: source.type,
      why_it_matters: generateWhyItMatters(source, performanceSignals),
      content_traits_to_study: generateContentTraits(source),
      trust_traits_to_study: generateTrustTraits(source),
      conversion_traits_to_study: generateConversionTraits(source),
      visual_traits_to_study: generateVisualTraits(source),
      enabled: true,
      notes: `Auto-discovered week of ${new Date().toISOString().split("T")[0]}. Conversion score: ${source.conversionScore}`
    })),
    actionRequired: toReplace.length > 0 || toAdd.length > 0,
    updateInstructions: generateUpdateInstructions(toReplace, toAdd, profile.profile_id)
  };
}

/**
 * Identify sources that should be removed due to poor performance
 */
function identifySourcesForReplacement(currentReferences, sourcePerformance, profileId) {
  const toReplace = [];

  // Score each reference based on performance
  const referenceScores = currentReferences.map((ref) => {
    const performanceData = sourcePerformance.find(
      (s) => s.source_url === ref.reference_url || s.source_url.includes(ref.reference_url)
    );

    const score = performanceData ? performanceData.performance_score : 0;

    return {
      ...ref,
      performanceScore: score,
      isUnderperforming: score < 10 || (score === 0 && currentReferences.length > 3)
    };
  });

  // Remove bottom 20% of references if we have 5+, or bottom performer if we have 3-4
  const threshold =
    currentReferences.length >= 5
      ? Math.ceil(currentReferences.length * 0.2)
      : currentReferences.length > 3
        ? 1
        : 0;

  const sortedByScore = referenceScores.sort((a, b) => a.performanceScore - b.performanceScore);

  for (let i = 0; i < Math.min(threshold, sortedByScore.length); i++) {
    const ref = sortedByScore[i];
    if (ref.performanceScore < 20 || (ref.performanceScore === 0 && currentReferences.length > 4)) {
      toReplace.push({
        ...ref,
        replacementReason:
          ref.performanceScore === 0
            ? "No performance data - likely outdated source"
            : `Low performance score (${ref.performanceScore.toFixed(1)}/100)`
      });
    }
  }

  return toReplace;
}

/**
 * Identify new sources to add from research findings
 */
function identifySourcesForAddition(rankedSources, currentReferences, performanceSignals) {
  const currentUrls = new Set(currentReferences.map((r) => r.reference_url));

  // Get top sources not already in references
  const candidates = rankedSources
    .filter((source) => !currentUrls.has(source.url) && source.conversionScore > 0.5)
    .slice(0, 5); // Take top 5 candidates

  // Limit additions based on current reference count
  const addLimit = currentReferences.length >= 5 ? 2 : 3;

  return candidates.slice(0, addLimit);
}

/**
 * Generate "Why it matters" text for new sources
 */
function generateWhyItMatters(source, performanceSignals) {
  try {
    const insights = performanceSignals?.insights || {};

    if (source.type === "reddit") {
      return `High-engagement Reddit source from r/${source.subreddit || "community"}. ${source.engagement?.comments || 0} comments indicates active community discussion. Conversion score: ${source.conversionScore || 0}`;
    }

    if (source.type === "twitter") {
      return `Active Twitter community around ${source.hashtag || "topic"}. Real-time content discovery opportunity. Conversion score: ${source.conversionScore || 0}`;
    }

    return `Top-ranked source for content pattern extraction. Conversion score: ${source.conversionScore || 0}`;
  } catch (e) {
    return "High-quality source for content learning and pattern extraction";
  }
}

/**
 * Generate content traits to study for a source
 */
function generateContentTraits(source) {
  if (source.type === "reddit") {
    return "Post structure, narrative flow, section organization, how problems are framed";
  }
  if (source.type === "twitter") {
    return "Hook techniques, thread structure (if applicable), pacing, brevity vs detail";
  }
  return "Overall storytelling approach, structure, engagement techniques";
}

/**
 * Generate trust-building traits to study
 */
function generateTrustTraits(source) {
  if (source.type === "reddit") {
    return "Personal experience sharing, scientific citations, community validation (upvotes), author credibility signals";
  }
  if (source.type === "twitter") {
    return "Credential mentions, social proof, expert positioning, consistency across posts";
  }
  return "Authority signals, proof points, audience trust indicators";
}

/**
 * Generate conversion traits to study
 */
function generateConversionTraits(source) {
  if (source.type === "reddit") {
    return "Call-to-action placement and phrasing, urgency signals, offer structure, problem-to-solution messaging";
  }
  if (source.type === "twitter") {
    return "CTA style (implicit vs explicit), click-through patterns, link placement, value proposition clarity";
  }
  return "How creators move audience toward action, offer presentation, decision-making prompts";
}

/**
 * Generate visual traits to study (if applicable)
 */
function generateVisualTraits(source) {
  if (source.type === "reddit") {
    return "Image/GIF usage, formatting (bold, lists), spacing, visual hierarchy";
  }
  if (source.type === "twitter") {
    return "Image/video integration, emoji usage, visual aesthetics, media types that perform best";
  }
  return "Visual design patterns, media types, aesthetic consistency";
}

/**
 * Generate update instructions for the user
 */
function generateUpdateInstructions(toReplace, toAdd, profileId) {
  let instructions = `UPDATE INSTRUCTIONS FOR ${profileId}:\n\n`;

  if (toReplace.length > 0) {
    instructions += `DELETE these underperforming sources:\n`;
    toReplace.forEach((ref) => {
      instructions += `- ${ref.reference_name} (${ref.reason})\n`;
    });
    instructions += "\n";
  }

  if (toAdd.length > 0) {
    instructions += `ADD these new sources to Reference_Pages tab:\n`;
    toAdd.forEach((source, index) => {
      instructions += `\n${index + 1}. ${source.reference_name || "Unknown Source"}\n`;
      instructions += `   URL: ${source.reference_url || "N/A"}\n`;
      instructions += `   Type: ${source.reference_type || "unknown"}\n`;
      const whyText = (source.why_it_matters || "").substring(0, 100);
      instructions += `   Why: ${whyText}...\n`;
    });
  }

  if (toReplace.length === 0 && toAdd.length === 0) {
    instructions += "No updates needed. Current reference pages are performing well.\n";
  }

  return instructions;
}

/**
 * Generate a summary of source adaptations across all profiles
 */
function generateAdaptationSummary(adaptations) {
  const totalReplacements = adaptations.reduce((sum, a) => sum + a.toReplace.length, 0);
  const totalAdditions = adaptations.reduce((sum, a) => sum + a.toAdd.length, 0);

  return {
    totalReplacements,
    totalAdditions,
    profilesAffected: adaptations.filter((a) => a.actionRequired).length,
    summary: `Adaptive source management: ${totalReplacements} sources to replace, ${totalAdditions} new sources to add across ${adaptations.length} profiles`,
    requiresAction: totalReplacements > 0 || totalAdditions > 0
  };
}

module.exports = {
  adaptSourcesBasedOnPerformance,
  generateAdaptationSummary
};
