/**
 * Phase 8: Ayrshare Publisher
 *
 * Publishes content to all 4 platforms via Ayrshare API:
 * - TikTok
 * - YouTube Shorts
 * - Instagram (Reels/Feed)
 * - Facebook (Reels/Posts)
 *
 * Handles:
 * - Immediate posting
 * - Scheduled posting
 * - Post tracking (ayrshare_post_id)
 * - Error handling and retry
 */

const PLATFORM_MAP = {
  tiktok: "tiktok",
  youtube_shorts: "youtube",
  instagram: "instagram",
  facebook: "facebook"
};

// Ayrshare Base URL
const AYRSHARE_BASE_URL = "https://app.ayrshare.com/api";

/**
 * Publish a single content item via Ayrshare
 */
async function publishContent(contentItem, options = {}) {
  const logger = options.logger ?? console;
  const apiKey = options.ayrshareApiKey ?? process.env.AYRSHARE_API_KEY;
  const dryRun = options.dryRun ?? false;

  if (!apiKey) {
    logger.error(`[Publisher] AYRSHARE_API_KEY not set. Cannot publish.`);
    return { success: false, error: "AYRSHARE_API_KEY not configured" };
  }

  if (dryRun) {
    logger.log(`[Publisher] DRY RUN: Would publish ${contentItem.platform} post for ${contentItem.profile_id}`);
    return buildMockPublishResult(contentItem);
  }

  const platform = PLATFORM_MAP[contentItem.platform];
  if (!platform) {
    return { success: false, error: `Unknown platform: ${contentItem.platform}` };
  }

  try {
    const publishPayload = buildPublishPayload(contentItem, platform);

    const response = await fetch(`${AYRSHARE_BASE_URL}/post`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(publishPayload)
    });

    const data = await response.json();

    if (!response.ok || data.status === "error") {
      const errMsg = data.message || data.error || `HTTP ${response.status}`;
      logger.error(`[Publisher] Ayrshare error for ${contentItem.plan_item_id}: ${errMsg}`);
      return { success: false, error: errMsg, plan_item_id: contentItem.plan_item_id };
    }

    logger.log(`[Publisher] ✓ Published ${contentItem.platform} | Post ID: ${data.id}`);

    return {
      success: true,
      plan_item_id: contentItem.plan_item_id,
      ayrshare_post_id: data.id,
      platform: contentItem.platform,
      published_at: data.postIds?.[0]?.timestamp || new Date().toISOString(),
      profile_id: contentItem.profile_id,
      status: "published"
    };
  } catch (error) {
    logger.error(`[Publisher] Network error: ${error.message}`);
    return { success: false, error: error.message, plan_item_id: contentItem.plan_item_id };
  }
}

/**
 * Build Ayrshare publish payload from content item
 */
function buildPublishPayload(contentItem, platform) {
  const payload = {
    post: contentItem.caption,
    platforms: [platform]
  };

  // Add scheduled time if in the future
  if (contentItem.scheduled_at) {
    const scheduledAt = new Date(contentItem.scheduled_at);
    if (scheduledAt > new Date()) {
      payload.scheduleDate = scheduledAt.toISOString();
    }
  }

  // Platform-specific overrides
  if (platform === "youtube") {
    payload.youTubeOptions = {
      title: contentItem.caption.split("\n")[0].substring(0, 100) || "New Video",
      shorts: true, // Always publish as YouTube Shorts
      visibility: "public"
    };
  }

  if (platform === "tiktok") {
    payload.tikTokOptions = {
      privacy: "PUBLIC_TO_EVERYONE",
      disableDuet: false,
      disableComment: false,
      disableStitch: false
    };
  }

  return payload;
}

/**
 * Publish an entire batch of content items
 */
async function publishBatch(contentItems, options = {}) {
  const logger = options.logger ?? console;

  logger.log(`[Publisher] Publishing batch of ${contentItems.length} items`);

  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (const item of contentItems) {
    // Small delay between posts to avoid rate limiting
    if (results.length > 0) {
      await sleep(500);
    }

    const result = await publishContent(item, options);
    results.push(result);

    if (result.success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  logger.log(`[Publisher] Batch complete: ${successCount} published, ${failCount} failed`);

  return {
    results,
    successCount,
    failCount,
    successRate: results.length > 0 ? successCount / results.length : 0
  };
}

/**
 * Retry a failed publish attempt
 */
async function retryPublish(contentItem, options = {}, maxRetries = 3) {
  const logger = options.logger ?? console;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    logger.log(`[Publisher] Retry attempt ${attempt}/${maxRetries} for ${contentItem.plan_item_id}`);
    await sleep(attempt * 2000); // exponential backoff

    const result = await publishContent(contentItem, options);
    if (result.success) return result;
  }

  return { success: false, error: `Failed after ${maxRetries} retries`, plan_item_id: contentItem.plan_item_id };
}

/**
 * Build a mock publish result for dry runs and testing
 */
function buildMockPublishResult(contentItem) {
  return {
    success: true,
    plan_item_id: contentItem.plan_item_id,
    ayrshare_post_id: `mock_${contentItem.platform}_${Date.now()}`,
    platform: contentItem.platform,
    published_at: new Date().toISOString(),
    profile_id: contentItem.profile_id,
    status: "dry_run",
    isDryRun: true
  };
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  publishContent,
  publishBatch,
  retryPublish,
  buildPublishPayload
};
