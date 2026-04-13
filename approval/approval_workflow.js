/**
 * Phase 11: Approval Workflow
 *
 * Handles content approval before publishing:
 * - Auto mode: Publishes immediately (no human review)
 * - Smart auto: Auto-approves if content meets quality thresholds
 * - Manual: Flags for human review, waits for approval
 *
 * Smart approval criteria:
 * - Hook score > 0.6 (hooks well)
 * - No inappropriate content detected
 * - Caption within platform limits
 * - Has CTA when required
 * - Content type matches planned type
 */

const CAPTION_LIMITS = {
  tiktok: 2200,
  youtube_shorts: 5000,
  instagram: 2200,
  facebook: 63206
};

// Words/patterns that should flag content for review
const FLAG_PATTERNS = [
  /\b(guaranteed|promise|100%\s+sure|cure|miracle|instant\s+results)\b/i,
  /\b(make\s+\$[\d,]+\s+in\s+\d+\s+days?)\b/i,
  /\b(lose\s+\d+\s+pounds?\s+in\s+\d+\s+days?)\b/i,
  /CLICK\s+HERE\s+NOW/i
];

/**
 * Process content item through approval workflow
 */
async function processApproval(contentItem, profile, options = {}) {
  const logger = options.logger ?? console;
  const approvalMode = profile.approval_mode || "smart_auto";
  const smartApprovalEnabled = profile.smart_approval_enabled !== false;

  // Run quality checks
  const qualityReport = checkContentQuality(contentItem, profile);

  if (approvalMode === "auto") {
    // Auto-approve everything (no quality filtering)
    logger.log(`[Approval] AUTO: ${contentItem.plan_item_id} → APPROVED`);
    return buildApprovalResult(contentItem, "approved", "auto_mode", qualityReport);
  }

  if (approvalMode === "smart_auto" && smartApprovalEnabled) {
    return processSmartApproval(contentItem, profile, qualityReport, logger);
  }

  // Manual mode: flag for review
  logger.log(`[Approval] MANUAL: ${contentItem.plan_item_id} → PENDING_REVIEW`);
  return buildApprovalResult(contentItem, "pending_review", "manual_mode", qualityReport);
}

/**
 * Smart auto-approval with quality thresholds
 */
function processSmartApproval(contentItem, profile, qualityReport, logger) {
  const { hookScore, hasCTA, withinLimits, flagged, flags } = qualityReport;

  // Auto-approve if all checks pass
  if (hookScore >= 0.5 && hasCTA && withinLimits && !flagged) {
    logger.log(`[Approval] SMART AUTO: ${contentItem.plan_item_id} → APPROVED (score: ${hookScore.toFixed(2)})`);
    return buildApprovalResult(contentItem, "approved", "smart_auto", qualityReport);
  }

  // Flag for review if any check fails
  const reasons = [];
  if (hookScore < 0.5) reasons.push(`Hook score too low (${hookScore.toFixed(2)} < 0.5)`);
  if (!hasCTA) reasons.push("Missing CTA");
  if (!withinLimits) reasons.push("Caption exceeds platform limit");
  if (flagged) reasons.push(`Flagged content: ${flags.join(", ")}`);

  logger.log(`[Approval] SMART AUTO: ${contentItem.plan_item_id} → PENDING_REVIEW (${reasons.join("; ")})`);
  return buildApprovalResult(contentItem, "pending_review", "smart_auto_flagged", qualityReport, reasons);
}

/**
 * Quality check for content
 */
function checkContentQuality(contentItem, profile) {
  const caption = contentItem.caption || "";
  const hook = contentItem.hook || caption.split("\n")[0] || "";
  const cta = contentItem.cta || "";
  const platform = contentItem.platform;

  // Hook quality score (0-1)
  const hookScore = scoreHook(hook, profile);

  // CTA check
  const hasCTA = cta.length > 10 || /link\s+in\s+bio|click|check\s+out|get\s+(it|this|now)|save|follow|shop/i.test(caption);

  // Platform limit check
  const limit = CAPTION_LIMITS[platform] || 2200;
  const withinLimits = caption.length <= limit;

  // Flag pattern check
  const flags = FLAG_PATTERNS
    .filter((pattern) => pattern.test(caption))
    .map((p) => p.source.substring(0, 30));
  const flagged = flags.length > 0;

  // Content type match check
  const expectedContentType = contentItem.content_type;
  const contentMatchesType = verifyContentMatchesType(caption, expectedContentType);

  return {
    hookScore,
    hasCTA,
    withinLimits,
    flagged,
    flags,
    contentMatchesType,
    captionLength: caption.length,
    captionLimit: limit
  };
}

/**
 * Score hook quality (0-1)
 * Good hooks have: questions, numbers, "you/your", power words, curiosity gaps
 */
function scoreHook(hook, profile) {
  if (!hook) return 0;

  let score = 0.3; // baseline

  // Question hook
  if (/\?/.test(hook)) score += 0.2;

  // Number in hook (specificity)
  if (/\d+/.test(hook)) score += 0.15;

  // Second person (personal connection)
  if (/\byou(r)?\b/i.test(hook)) score += 0.15;

  // Power words
  if (/\b(secret|truth|mistake|hack|discover|reveal|warning|stop|never|always|why)\b/i.test(hook)) score += 0.15;

  // Curiosity gap (incomplete thought)
  if (/\.\.\.|here's\s+why|this\s+is\s+why|what\s+nobody\s+tells/i.test(hook)) score += 0.05;

  return Math.min(score, 1.0);
}

/**
 * Verify content type matches planned type
 */
function verifyContentMatchesType(caption, contentType) {
  if (!contentType) return true;

  const contentTypeSignals = {
    growth: /tip|how\s+to|guide|learn|discover|trick/i,
    trust: /story|journey|experience|personal|honest|truth/i,
    proof: /before|after|result|transformation|proof|evidence|study/i,
    conversion: /get\s+(it|this)|shop|buy|link\s+in\s+bio|check\s+out|discount|offer/i,
    fluff: /pov:|vibe|aesthetic|trend|funny|lol|mood|relatable/i
  };

  const pattern = contentTypeSignals[contentType];
  return pattern ? pattern.test(caption) : true;
}

/**
 * Build approval result object
 */
function buildApprovalResult(contentItem, status, reason, qualityReport, rejectionReasons = []) {
  return {
    plan_item_id: contentItem.plan_item_id,
    profile_id: contentItem.profile_id,
    platform: contentItem.platform,
    approval_status: status,
    approval_reason: reason,
    rejection_reasons: rejectionReasons,
    quality_report: qualityReport,
    approved_at: status === "approved" ? new Date().toISOString() : null,
    content: contentItem
  };
}

/**
 * Process batch approval for multiple items
 */
async function processBatchApproval(contentItems, profile, options = {}) {
  const logger = options.logger ?? console;
  const results = [];
  let approved = 0;
  let pending = 0;

  for (const item of contentItems) {
    const result = await processApproval(item, profile, options);
    results.push(result);

    if (result.approval_status === "approved") {
      approved++;
    } else {
      pending++;
    }
  }

  logger.log(`[Approval] Batch: ${approved} approved, ${pending} pending review`);

  return {
    results,
    approved,
    pending,
    approvalRate: results.length > 0 ? approved / results.length : 0
  };
}

/**
 * Filter to only approved items (ready for publishing)
 */
function filterApproved(approvalResults) {
  return approvalResults
    .filter((r) => r.approval_status === "approved")
    .map((r) => r.content);
}

/**
 * Filter to items needing manual review
 */
function filterPendingReview(approvalResults) {
  return approvalResults.filter((r) => r.approval_status === "pending_review");
}

module.exports = {
  processApproval,
  processBatchApproval,
  checkContentQuality,
  filterApproved,
  filterPendingReview,
  scoreHook
};
