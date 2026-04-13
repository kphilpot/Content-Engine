/**
 * Phase 5: Cost Governor
 *
 * Tracks Claude API token usage against $10/week hard cap
 * Dynamically adjusts batch sizes if approaching limit
 *
 * Claude Sonnet pricing (approximate):
 * - Input: $3.00 per 1M tokens
 * - Output: $15.00 per 1M tokens
 *
 * For content generation per post:
 * - ~1500 input tokens (system prompt + research context + instructions)
 * - ~500 output tokens (caption + script)
 * - Cost per post: ~$0.012 (1.2 cents)
 *
 * At $10/week = ~833 posts max
 * Realistic: 3 profiles × 11 posts/week avg = 33 posts/week = ~$0.40 Claude cost
 * Very comfortable under $10 cap
 *
 * Budget allocation:
 * - Content generation: 80% ($8.00)
 * - Research synthesis: 20% ($2.00)
 */

// Claude Sonnet 4 pricing (per 1M tokens)
const SONNET_INPUT_PRICE_PER_MILLION = 3.00;
const SONNET_OUTPUT_PRICE_PER_MILLION = 15.00;

// Default budget settings
const DEFAULT_WEEKLY_BUDGET = 10.00;
const CONTENT_BUDGET_RATIO = 0.80;
const RESEARCH_BUDGET_RATIO = 0.20;

// Safety threshold: stop generating when at 90% of budget
const BUDGET_SAFETY_THRESHOLD = 0.90;

/**
 * Calculate cost from Claude API response token counts
 */
function calculateCostFromTokens(inputTokens, outputTokens) {
  const inputCost = (inputTokens / 1_000_000) * SONNET_INPUT_PRICE_PER_MILLION;
  const outputCost = (outputTokens / 1_000_000) * SONNET_OUTPUT_PRICE_PER_MILLION;
  return inputCost + outputCost;
}

/**
 * Estimate cost for a batch of posts before generating
 * Assumes ~1500 input tokens and ~500 output tokens per post
 */
function estimateBatchCost(postCount, avgInputTokens = 1500, avgOutputTokens = 500) {
  const totalInput = postCount * avgInputTokens;
  const totalOutput = postCount * avgOutputTokens;
  return calculateCostFromTokens(totalInput, totalOutput);
}

/**
 * Main cost governor: determines how many posts to generate
 * Returns { allowedPosts, budgetRemaining, usedBudget, status }
 */
function governCost(weeklyBudget, weeklySpendingToDate, plannedPostCount, options = {}) {
  const budget = weeklyBudget ?? DEFAULT_WEEKLY_BUDGET;
  const contentBudget = budget * CONTENT_BUDGET_RATIO;
  const remaining = contentBudget - weeklySpendingToDate;
  const safeRemaining = remaining * BUDGET_SAFETY_THRESHOLD;

  // How many posts can we afford?
  const costPerPost = estimateBatchCost(1);
  const affordablePosts = Math.floor(safeRemaining / costPerPost);
  const allowedPosts = Math.min(plannedPostCount, affordablePosts);

  const status = determineStatus(remaining, budget * CONTENT_BUDGET_RATIO);

  return {
    weeklyBudget: budget,
    contentBudget,
    weeklySpendingToDate,
    remainingBudget: remaining,
    safeRemaining,
    plannedPosts: plannedPostCount,
    allowedPosts: Math.max(0, allowedPosts),
    costPerPostEstimate: parseFloat(costPerPost.toFixed(4)),
    estimatedBatchCost: parseFloat(estimateBatchCost(allowedPosts).toFixed(4)),
    status,
    isThrottled: allowedPosts < plannedPostCount
  };
}

/**
 * Determine budget status
 */
function determineStatus(remaining, totalContentBudget) {
  const remainingRatio = remaining / totalContentBudget;

  if (remainingRatio <= 0.05) return "CRITICAL"; // <5% left
  if (remainingRatio <= 0.20) return "WARNING";  // <20% left
  if (remainingRatio <= 0.50) return "CAUTION";  // <50% left
  return "OK";
}

/**
 * Track spending from a Claude API response
 * Returns updated spending total
 */
function trackSpending(previousSpending, claudeResponse) {
  const usage = claudeResponse?.usage || {};
  const inputTokens = usage.input_tokens || usage.prompt_tokens || 0;
  const outputTokens = usage.output_tokens || usage.completion_tokens || 0;
  const cost = calculateCostFromTokens(inputTokens, outputTokens);

  return {
    newTotal: previousSpending + cost,
    thisCost: cost,
    inputTokens,
    outputTokens
  };
}

/**
 * Calculate weekly budget allocation per profile
 * Based on budget_weight field in Channel_Profiles
 */
function allocateBudgetByProfile(profiles, weeklyBudget = DEFAULT_WEEKLY_BUDGET) {
  const totalWeight = profiles.reduce(
    (sum, p) => sum + parseFloat(p.budget_weight || 0.33),
    0
  );

  return profiles.map((profile) => {
    const weight = parseFloat(profile.budget_weight || 0.33);
    const normalizedWeight = totalWeight > 0 ? weight / totalWeight : 1 / profiles.length;
    const allocated = weeklyBudget * normalizedWeight * CONTENT_BUDGET_RATIO;

    return {
      profile_id: profile.profile_id,
      allocated_budget: parseFloat(allocated.toFixed(4)),
      budget_weight: weight,
      normalized_weight: parseFloat(normalizedWeight.toFixed(3))
    };
  });
}

/**
 * Generate a budget report for the week
 */
function generateBudgetReport(costState, profiles) {
  const allocations = allocateBudgetByProfile(profiles, costState.weeklyBudget);
  const lines = [
    `=== Weekly Cost Governor Report ===`,
    `Weekly Budget: $${costState.weeklyBudget.toFixed(2)}`,
    `Content Budget (80%): $${costState.contentBudget.toFixed(2)}`,
    `Spent So Far: $${costState.weeklySpendingToDate.toFixed(4)}`,
    `Remaining: $${costState.remainingBudget.toFixed(4)}`,
    `Status: ${costState.status}`,
    ``,
    `Profile Budget Allocations:`
  ];

  allocations.forEach((a) => {
    lines.push(`  ${a.profile_id}: $${a.allocated_budget.toFixed(4)} (weight: ${a.normalized_weight})`);
  });

  if (costState.isThrottled) {
    lines.push(``);
    lines.push(`⚠ THROTTLED: Planned ${costState.plannedPosts} posts → Reduced to ${costState.allowedPosts} posts`);
  }

  return lines.join("\n");
}

module.exports = {
  calculateCostFromTokens,
  estimateBatchCost,
  governCost,
  trackSpending,
  allocateBudgetByProfile,
  generateBudgetReport
};
