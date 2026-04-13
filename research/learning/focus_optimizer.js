/**
 * Focus Optimizer
 *
 * Adapts the research_focus week-over-week based on performance
 *
 * The research_focus keyword(s) guide which Reddit posts/Twitter content to search for
 * If a topic is driving conversions, we focus more on it
 * If a topic is underperforming, we shift to other angles
 *
 * Examples:
 * - If "hair loss solutions" is converting 8%, boost that focus
 * - If "styling tips" is converting 1%, reduce focus there
 * - If new angle appears with high conversion, add it
 */

function optimizeResearchFocus(profile, performanceSignals, patternAnalysis) {
  // Handle both string and array formats
  const researchFocus = Array.isArray(profile.research_focus)
    ? profile.research_focus
    : (profile.research_focus || "").split(" ").filter(Boolean);
  const currentFocus = researchFocus;

  const insights = performanceSignals.insights || performanceSignals;
  const topAngles = insights.contentAnglesToDouble || [];
  const driftAlert = insights.driftDetected || {};

  // If engagement is declining, recommend focus shift
  if (driftAlert.isDrifting) {
    return generateEmergencyFocusShift(profile, performanceSignals);
  }

  // Otherwise, optimize based on what's working
  const nextFocusKeywords = optimizeKeywords(
    currentFocus,
    topAngles,
    patternAnalysis.recommendedAngles
  );

  // Ensure previousFocus is a string
  const previousFocusStr = Array.isArray(profile.research_focus)
    ? profile.research_focus.join(" ")
    : (profile.research_focus || "");

  return {
    previousFocus: previousFocusStr,
    recommendedFocus: nextFocusKeywords.join(" "),
    rationale: nextFocusKeywords
      .map(
        (keyword, i) =>
          `${i + 1}. "${keyword}" - ${generateRationale(keyword, topAngles, patternAnalysis)}`
      )
      .join("; "),
    changeIntensity: calculateChangeIntensity(currentFocus, nextFocusKeywords),
    shouldUpdate: JSON.stringify(currentFocus) !== JSON.stringify(nextFocusKeywords)
  };
}

/**
 * Generate an emergency focus shift if engagement is declining sharply
 */
function generateEmergencyFocusShift(profile, performanceSignals) {
  const insights = performanceSignals.insights || performanceSignals;
  const drift = insights.driftDetected;
  const topAngles = insights.contentAnglesToDouble || [];

  // Swap out underperforming focus for a different angle
  const alternativeAngles = [
    "transformation results",
    "quick tips hacks",
    "common mistakes",
    "before and after",
    "scientific research",
    "personal journey",
    "cost effective solution"
  ];

  const recommendedAngle =
    topAngles.length > 0
      ? topAngles[0].angle
      : alternativeAngles[Math.floor(Math.random() * alternativeAngles.length)];

  // Ensure previousFocus is a string
  const previousFocusStr = Array.isArray(profile.research_focus)
    ? profile.research_focus.join(" ")
    : (profile.research_focus || "");

  return {
    previousFocus: previousFocusStr,
    recommendedFocus: recommendedAngle,
    rationale: `URGENT: Engagement down ${drift.changePercent}%. Shift focus to "${recommendedAngle}" angle to recover traction.`,
    changeIntensity: "high",
    shouldUpdate: true,
    isEmergencyShift: true
  };
}

/**
 * Optimize keywords: keep winners, remove underperformers, add emerging angles
 */
function optimizeKeywords(currentKeywords, topAngles, recommendedAngles) {
  const keywordScores = {};

  // Start with current keywords - they have some track record
  currentKeywords.forEach((keyword) => {
    keywordScores[keyword] = 0.5; // baseline for current keywords
  });

  // Boost keywords that match top-performing angles
  if (topAngles.length > 0) {
    topAngles.slice(0, 3).forEach((angle) => {
      const keywords = angle.angle.split(" ");
      keywords.forEach((keyword) => {
        if (!keywordScores[keyword]) {
          keywordScores[keyword] = 0;
        }
        keywordScores[keyword] += 0.4; // boost for proven angle
      });
    });
  }

  // Add recommended new angles
  if (recommendedAngles && Array.isArray(recommendedAngles)) {
    recommendedAngles.slice(0, 2).forEach((angle) => {
      const keywords = angle.toLowerCase().split("/");
      keywords.forEach((keyword) => {
        const trimmed = keyword.trim();
        if (!keywordScores[trimmed]) {
          keywordScores[trimmed] = 0.3; // lower score for new angles
        }
      });
    });
  }

  // Select top 2-3 keywords
  const optimized = Object.entries(keywordScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map((entry) => entry[0]);

  // Always include at least one current keyword to maintain continuity
  if (optimized.length === 0 || !optimized.some((k) => currentKeywords.includes(k))) {
    optimized.unshift(currentKeywords[0]);
  }

  return optimized.filter(Boolean);
}

/**
 * Generate rationale for why a keyword is recommended
 */
function generateRationale(keyword, topAngles, patternAnalysis) {
  // Check if it's in top angles
  const matchingAngle = topAngles.find((a) => a.angle.includes(keyword));
  if (matchingAngle) {
    return `${(matchingAngle.conversionRate * 100).toFixed(1)}% conversion rate`;
  }

  // Check if it's a recommended angle
  if (patternAnalysis.recommendedAngles && patternAnalysis.recommendedAngles.length > 0) {
    if (patternAnalysis.recommendedAngles.some((a) => a.includes(keyword))) {
      return "Recommended by pattern analysis";
    }
  }

  return "Maintaining strategic focus";
}

/**
 * Calculate how much the focus is changing (low/medium/high)
 */
function calculateChangeIntensity(current, next) {
  const currentSet = new Set(current.map((k) => k.toLowerCase()));
  const nextSet = new Set(next.map((k) => k.toLowerCase()));

  // Count how many keywords are changing
  let changed = 0;
  nextSet.forEach((k) => {
    if (!currentSet.has(k)) changed++;
  });

  if (changed === 0) return "none";
  if (changed === 1) return "low";
  if (changed >= 2) return "high";
}

/**
 * Generate summary of how research focus should evolve
 */
function generateFocusSummary(optimizations) {
  if (optimizations.length === 0) return "No research focus updates needed.";

  const updates = optimizations
    .filter((opt) => opt.shouldUpdate)
    .map((opt) => `${opt.profile_id}: "${opt.previousFocus}" → "${opt.recommendedFocus}"`)
    .join("\n");

  if (updates.length === 0) {
    return "All profiles maintaining current research focus.";
  }

  return `Research Focus Updates:\n${updates}`;
}

module.exports = {
  optimizeResearchFocus,
  generateFocusSummary
};
