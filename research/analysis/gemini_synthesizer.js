/**
 * Gemini Synthesizer
 *
 * Uses Google Gemini API to analyze reference pages and top sources
 * Extracts high-level patterns that should be fed into content generation
 *
 * Patterns extracted:
 * - Hook patterns: Opening lines/angles that capture attention
 * - Content patterns: Narrative structures that work
 * - Trust patterns: How creators build credibility
 * - Conversion patterns: How they move audience toward action
 */

async function synthesizeWithGemini(profile, referencePages, topSources, options = {}) {
  const logger = options.logger ?? console;
  const skipRemote = options.skipRemote ?? false;

  if (skipRemote) {
    logger.log(`[Gemini] Skipping Gemini synthesis (testing mode)`);
    return generateMockSynthesis(profile, referencePages, topSources);
  }

  // Prepare content for analysis
  const analysisPrompt = buildAnalysisPrompt(profile, referencePages, topSources);

  try {
    // Call Gemini API
    const synthesis = await callGeminiAPI(analysisPrompt, profile.research_focus);

    return {
      hooks: synthesis.hooks || [],
      contentPatterns: synthesis.contentPatterns || [],
      trustPatterns: synthesis.trustPatterns || [],
      conversionPatterns: synthesis.conversionPatterns || [],
      commonThemes: synthesis.commonThemes || [],
      recommendedAngles: synthesis.recommendedAngles || [],
      patternsAnalyzed: referencePages.length + topSources.length
    };
  } catch (error) {
    logger.error(`[Gemini] Synthesis failed: ${error.message}`);
    // Fallback to mock synthesis if API fails
    return generateMockSynthesis(profile, referencePages, topSources);
  }
}

/**
 * Build the analysis prompt for Gemini
 */
function buildAnalysisPrompt(profile, referencePages, topSources) {
  const referenceTexts = referencePages
    .map((page) => `Reference: "${page.reference_name}" from ${page.reference_url}`)
    .join("\n");

  const sourceTexts = topSources
    .map((source) => {
      const details = [
        `Title: ${source.title}`,
        source.type === "reddit"
          ? `Subreddit: r/${source.subreddit}, Comments: ${source.engagement?.comments || 0}`
          : `Source: Twitter Hashtag`,
        `Engagement Score: ${source.conversionScore}`
      ].join(" | ");
      return details;
    })
    .join("\n");

  // Handle both string and array formats
  const researchFocus = Array.isArray(profile.research_focus)
    ? profile.research_focus.join(", ")
    : (profile.research_focus || "");
  const contentPillars = Array.isArray(profile.content_pillars)
    ? profile.content_pillars.join(", ")
    : (profile.content_pillars || "");
  const niche = typeof profile.niche === "string" ? profile.niche : "general";

  return `
You are analyzing successful content patterns in the ${niche} niche.

PROFILE CONTEXT:
- Mode: ${profile.mode} (${profile.mode === "personal_product" ? "direct sales focus" : "trust-building focus"})
- Research Focus: ${researchFocus}
- Content Pillars: ${contentPillars}
- CTA Intensity: ${profile.cta_intensity}
- Target Audience: People interested in ${niche} looking for ${researchFocus}

REFERENCE PAGES (successful examples):
${referenceTexts}

TOP PERFORMING SOURCES:
${sourceTexts}

ANALYZE AND EXTRACT:

1. **Hook Patterns** (5-10): What opening lines/angles capture attention?
   - List specific hooks that appear across multiple sources
   - Note if hook mentions benefits, problems, or curiosity

2. **Content Patterns** (3-5): What narrative structures work?
   - How does content progress from attention to action?
   - Common sections or flow patterns

3. **Trust Patterns** (3-5): How do creators build credibility?
   - Use of statistics, personal stories, credentials?
   - Social proof mentions?

4. **Conversion Patterns** (3-5): How do they move toward sale/signup?
   - Direct asks vs. soft CTAs?
   - Urgency tactics used?
   - Scarcity mentions?

5. **Common Themes**: What topics/angles keep appearing?

6. **Recommended Angles for Next Content**: Based on gaps/opportunities

Respond in JSON format with these exact keys: hooks, contentPatterns, trustPatterns, conversionPatterns, commonThemes, recommendedAngles
`;
}

/**
 * Call Gemini API (uses GOOGLE_GENERATIVE_AI_API_KEY from environment)
 * Note: User typically has Gemini Pro access for free as part of Google account
 */
async function callGeminiAPI(prompt, focusArea) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GOOGLE_GENERATIVE_AI_API_KEY not set. Gemini synthesis requires API key."
    );
  }

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + apiKey, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2000
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API returned ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  const responseText =
    data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  // Parse JSON from response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not parse JSON from Gemini response");
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Fallback synthesis when Gemini is unavailable (for testing)
 * Uses heuristic-based pattern extraction
 */
function generateMockSynthesis(profile, referencePages, topSources) {
  const hookPatterns = [
    "Did you know... [surprising fact about " + profile.niche + "]",
    "I used to [problem], then I discovered...",
    "This " + (profile.niche.includes("hair") ? "hair trick" : "tip") + " changed everything",
    "The #1 mistake people make with " + profile.niche,
    "This is why your [niche problem] isn't improving"
  ];

  const trustPatterns = [
    "Share personal transformation story",
    "Reference scientific research or studies",
    "Show before/after or results",
    "Mention years of experience or expertise",
    "Include third-party validation or reviews"
  ];

  const conversionPatterns = [
    "Soft CTA: Learn more by [action]",
    "Direct CTA: Get [product/solution] to [benefit]",
    "Urgency: Limited availability or time-sensitive",
    "Curiosity: Click to see the [surprising thing]",
    "Value stacking: You also get [bonus]"
  ];

  const contentPatterns = [
    "Problem → Solution → Proof → CTA",
    "Story → Lesson → Application → Offer",
    "Question → Answer → Evidence → Call to Action",
    "Mistake → Correction → Results → Recommendation"
  ];

  // Handle both string and array formats for research_focus
  const researchFocusStr = Array.isArray(profile.research_focus)
    ? profile.research_focus[0] || "research"
    : (profile.research_focus || "research").split(" ")[0];

  return {
    hooks: hookPatterns,
    contentPatterns: contentPatterns,
    trustPatterns: trustPatterns,
    conversionPatterns: conversionPatterns,
    commonThemes: [
      researchFocusStr + " benefits",
      "Transformation/Results",
      "Quick tips/hacks",
      "Scientific backing"
    ],
    recommendedAngles: [
      "Before/after transformation angle",
      "Quick wins/fast results angle",
      "Scientific/backed-by-research angle",
      "Personal story/relatable mistake angle"
    ],
    patternsAnalyzed: referencePages.length + topSources.length,
    isMockData: true
  };
}

module.exports = {
  synthesizeWithGemini
};
