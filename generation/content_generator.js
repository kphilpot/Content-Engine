/**
 * Phase 7: Content Generator
 *
 * Uses Claude Sonnet to generate social media content per plan item
 *
 * Generates:
 * - caption: Full post caption with hook, body, CTA (platform-specific length)
 * - script: Optional short-form video script (TikTok/Shorts)
 * - hashtags: 3-7 targeted hashtags
 * - visual_direction: Brief note on video/image style
 *
 * Budget control: respects cost governor limits
 * Learning: uses research patterns to guide generation
 */

const { trackSpending } = require("../engine/cost_governor");

// Platform caption limits (characters)
const CAPTION_LIMITS = {
  tiktok: 2200,
  youtube_shorts: 5000,
  instagram: 2200,
  facebook: 63206
};

// Platform-specific styles
const PLATFORM_STYLES = {
  tiktok: "punchy, trending, uses hooks and pattern interrupts, max 2200 chars",
  youtube_shorts: "engaging, clear value proposition, searchable, descriptive",
  instagram: "aesthetic, storytelling, uses line breaks, conversational",
  facebook: "community-focused, conversational, informative, slightly longer form"
};

/**
 * Generate content for a single plan item
 */
async function generateContent(planItem, profile, options = {}) {
  const logger = options.logger ?? console;
  const claudeApiKey = options.claudeApiKey ?? process.env.ANTHROPIC_API_KEY;
  const costTracker = options.costTracker ?? { total: 0 };

  if (!claudeApiKey) {
    logger.error(`[Generator] ANTHROPIC_API_KEY not set. Generating mock content.`);
    return generateMockContent(planItem, profile);
  }

  const prompt = buildGenerationPrompt(planItem, profile);

  try {
    const response = await callClaudeAPI(prompt, claudeApiKey);

    // Track spending
    const spending = trackSpending(costTracker.total, response.usage);
    costTracker.total = spending.newTotal;

    logger.log(
      `[Generator] Generated ${planItem.platform} post for ${profile.profile_id} | Cost: $${spending.thisCost.toFixed(4)}`
    );

    return parseGeneratedContent(response.content[0].text, planItem);
  } catch (error) {
    logger.error(`[Generator] Claude API failed: ${error.message}. Using mock content.`);
    return generateMockContent(planItem, profile);
  }
}

/**
 * Build the generation prompt for Claude
 */
function buildGenerationPrompt(planItem, profile) {
  const captionLimit = CAPTION_LIMITS[planItem.platform] || 2200;
  const platformStyle = PLATFORM_STYLES[planItem.platform] || PLATFORM_STYLES.instagram;
  const ctaMode = getCTAMode(profile, planItem);
  const researchFocus = Array.isArray(profile.research_focus)
    ? profile.research_focus.join(", ")
    : (profile.research_focus || "");

  const systemPrompt = `You are a professional social media content creator specializing in ${profile.niche} content.
You create content that drives real conversions while building trust and authority.
You write in a ${profile.tone || "conversational, authentic"} tone.
You understand that great content educates first, sells second.`;

  const userPrompt = `Create ${planItem.platform.toUpperCase()} content for this brief:

PROFILE: ${profile.channel_name}
NICHE: ${typeof profile.niche === "string" ? profile.niche : "general"}
MODE: ${profile.mode === "personal_product" ? "Personal brand with product promotion" : "Niche authority building trust first"}
RESEARCH FOCUS: ${researchFocus}

CONTENT BRIEF:
- Type: ${planItem.content_type} content
- Hook: "${planItem.hook}"
- Angle: ${planItem.angle}
- Narrative Structure: ${planItem.narrative_structure}
- Platform style: ${platformStyle}
- CTA intensity: ${planItem.cta_intensity}

${ctaMode}

GENERATE:
1. HOOK (first 1-2 lines that stop the scroll)
2. BODY (educational/story content based on ${planItem.content_type})
3. CTA (${planItem.cta_intensity} intensity call to action)
4. HASHTAGS (5-7 targeted hashtags)
5. VISUAL_DIRECTION (one sentence describing the visual/video style)

Keep total caption under ${captionLimit} characters.
Respond in JSON format:
{
  "hook": "...",
  "body": "...",
  "cta": "...",
  "caption": "hook + body + cta combined",
  "hashtags": ["#tag1", "#tag2"],
  "visual_direction": "...",
  "script": "if video platform, full spoken script in 60 seconds max"
}`;

  return { systemPrompt, userPrompt };
}

/**
 * Get CTA mode instructions based on profile mode and intensity
 */
function getCTAMode(profile, planItem) {
  if (profile.mode === "niche_authority" && planItem.content_type !== "conversion") {
    return `CTA APPROACH: Soft CTA only - focus on building trust. No direct product promotion.
Example: "Follow for more [niche] tips" or "Save this for later"`;
  }

  const productName = profile.monetization?.product_name || "the product";
  const affiliateUrl = profile.monetization?.affiliate_url || "";
  const cta = planItem.cta_intensity;

  if (cta === "high") {
    return `CTA APPROACH: Direct and urgent.
Example: "Get ${productName} now - link in bio. Limited availability."
Affiliate URL to reference (naturally): ${affiliateUrl}`;
  }

  if (cta === "medium") {
    return `CTA APPROACH: Clear but not pushy.
Example: "Try ${productName} - link in bio"
Affiliate URL to reference (naturally): ${affiliateUrl}`;
  }

  // low
  return `CTA APPROACH: Very soft mention only.
Example: "What's helped me most is ${productName}"
Affiliate URL to reference (naturally): ${affiliateUrl}`;
}

/**
 * Call Claude API
 */
async function callClaudeAPI(prompt, apiKey) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: prompt.systemPrompt,
      messages: [
        {
          role: "user",
          content: prompt.userPrompt
        }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API ${response.status}: ${error}`);
  }

  return response.json();
}

/**
 * Parse the generated content from Claude's response
 */
function parseGeneratedContent(text, planItem) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return enrichContent(parsed, planItem);
    }
  } catch (e) {
    // Fall through to text parsing
  }

  // Fallback: treat entire response as caption
  return enrichContent({
    caption: text.trim(),
    hook: text.split("\n")[0] || "",
    hashtags: []
  }, planItem);
}

/**
 * Add metadata to generated content
 */
function enrichContent(content, planItem) {
  return {
    plan_item_id: planItem.plan_item_id,
    profile_id: planItem.profile_id,
    platform: planItem.platform,
    status: "generated",
    hook: content.hook || "",
    body: content.body || "",
    cta: content.cta || "",
    caption: content.caption || `${content.hook || ""}\n\n${content.body || ""}\n\n${content.cta || ""}`,
    hashtags: content.hashtags || [],
    visual_direction: content.visual_direction || "",
    script: content.script || "",
    scheduled_at: planItem.scheduled_at,
    research_source_url: planItem.research_source_url,
    content_type: planItem.content_type,
    angle: planItem.angle,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Generate mock content without Claude (for testing or when API unavailable)
 */
function generateMockContent(planItem, profile) {
  const niche = typeof profile.niche === "string" ? profile.niche : "wellness";
  const hook = planItem.hook || "Did you know this changes everything?";
  const product = profile.monetization?.product_name || "the solution";
  const affiliateUrl = profile.monetization?.affiliate_url || "";
  const contentType = planItem.content_type || "educational";

  const bodies = {
    growth: `Most people in the ${niche} space don't know this simple trick. After years of research and testing, I found what actually works. Here's what the experts aren't telling you...`,
    trust: `My journey with ${niche} wasn't easy. I spent years trying different approaches before I finally found something that worked. This is what I learned...`,
    proof: `6 months ago I was struggling with ${niche}. Today everything has changed. Here's the exact transformation and what made it possible...`,
    conversion: `If you're serious about ${niche} results, you need to hear this. I've been using ${product} for 3 months and the difference is undeniable...`,
    fluff: `POV: You just discovered the ${niche} hack everyone's talking about 👀 Save this because you'll need it later!`
  };

  const ctas = {
    high: `Get ${product} now → link in bio. Limited time! 🔥`,
    medium: `Check out ${product} - link in bio 👆`,
    low: `${product} has been a game changer for me`
  };

  const body = bodies[contentType] || bodies.growth;
  const cta = ctas[planItem.cta_intensity] || ctas.medium;
  const hashtags = [`#${niche.replace(/\s+/g, "")}`, "#transformation", "#tips", "#beforeandafter", "#results"];

  const caption = `${hook}\n\n${body}\n\n${cta}\n\n${hashtags.join(" ")}`;

  return {
    plan_item_id: planItem.plan_item_id,
    profile_id: planItem.profile_id,
    platform: planItem.platform,
    status: "mock_generated",
    hook,
    body,
    cta,
    caption,
    hashtags,
    visual_direction: `${profile.mode === "niche_authority" ? "Clean, educational" : "Dynamic, aspirational"} visual showing ${niche} transformation`,
    script: `[HOOK] ${hook}\n\n[BODY] ${body}\n\n[CTA] ${cta}`,
    scheduled_at: planItem.scheduled_at,
    research_source_url: planItem.research_source_url,
    content_type: planItem.content_type,
    angle: planItem.angle,
    generatedAt: new Date().toISOString(),
    isMockContent: true
  };
}

/**
 * Generate an entire batch of content for all plan items
 */
async function generateBatch(planItems, profile, options = {}) {
  const logger = options.logger ?? console;
  const costTracker = { total: options.previousSpending || 0 };

  logger.log(`[Generator] Generating ${planItems.length} pieces for ${profile.profile_id}`);

  const results = [];
  for (const item of planItems) {
    const content = await generateContent(item, profile, { ...options, costTracker });
    results.push(content);
  }

  logger.log(
    `[Generator] ✓ Batch complete for ${profile.profile_id} | Total cost: $${costTracker.total.toFixed(4)}`
  );

  return {
    contents: results,
    totalCost: costTracker.total
  };
}

/**
 * Convert content to rows for Content_Queue Google Sheet tab
 */
function contentToSheetRows(contents) {
  const headers = [
    "plan_item_id", "profile_id", "platform", "status",
    "hook", "caption", "hashtags", "visual_direction", "script",
    "scheduled_at", "research_source_url", "content_type", "angle",
    "ayrshare_post_id", "published_at", "views", "likes", "comments",
    "conversions", "generatedAt"
  ];

  const rows = contents.map((c) => headers.map((h) => {
    if (h === "hashtags") return (c[h] || []).join(",");
    return String(c[h] ?? "");
  }));

  return { headers, rows };
}

module.exports = {
  generateContent,
  generateBatch,
  buildGenerationPrompt,
  generateMockContent,
  contentToSheetRows
};
