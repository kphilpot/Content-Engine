/**
 * Phase 6: Weekly Content Planner
 *
 * Builds a week's worth of content plan for a profile by:
 * 1. Reading posting schedule from Channel_Profiles
 * 2. Applying content ratios (growth/trust/proof/conversion/fluff)
 * 3. Assigning hooks, angles, sources from research output
 * 4. Distributing across platforms per posting frequency
 * 5. Scheduling optimal posting times based on platform best practices
 */

const PLATFORM_BEST_TIMES = {
  tiktok: [
    { day: 0, hour: 9 },   // Sunday 9am
    { day: 1, hour: 7 },   // Monday 7am
    { day: 2, hour: 17 },  // Tuesday 5pm
    { day: 3, hour: 15 },  // Wednesday 3pm
    { day: 4, hour: 13 },  // Thursday 1pm
    { day: 5, hour: 11 },  // Friday 11am
    { day: 6, hour: 10 }   // Saturday 10am
  ],
  youtube_shorts: [
    { day: 0, hour: 14 },  // Sunday 2pm
    { day: 1, hour: 15 },  // Monday 3pm
    { day: 2, hour: 17 },  // Tuesday 5pm
    { day: 3, hour: 16 },  // Wednesday 4pm
    { day: 4, hour: 15 },  // Thursday 3pm
    { day: 5, hour: 14 },  // Friday 2pm
    { day: 6, hour: 12 }   // Saturday 12pm
  ],
  instagram: [
    { day: 0, hour: 11 },  // Sunday 11am
    { day: 1, hour: 12 },  // Monday 12pm
    { day: 2, hour: 9 },   // Tuesday 9am
    { day: 3, hour: 11 },  // Wednesday 11am
    { day: 4, hour: 14 },  // Thursday 2pm
    { day: 5, hour: 10 },  // Friday 10am
    { day: 6, hour: 9 }    // Saturday 9am
  ],
  facebook: [
    { day: 0, hour: 13 },  // Sunday 1pm
    { day: 1, hour: 9 },   // Monday 9am
    { day: 2, hour: 11 },  // Tuesday 11am
    { day: 3, hour: 12 },  // Wednesday 12pm
    { day: 4, hour: 13 },  // Thursday 1pm
    { day: 5, hour: 10 },  // Friday 10am
    { day: 6, hour: 15 }   // Saturday 3pm
  ]
};

// Content type labels per ratio bucket
const CONTENT_TYPES = {
  growth: ["educational", "tips", "how-to", "trending", "challenge"],
  trust: ["personal-story", "testimonial", "behind-scenes", "expertise", "research"],
  proof: ["before-after", "case-study", "results", "review", "transformation"],
  conversion: ["product-demo", "offer", "cta", "comparison", "problem-solution"],
  fluff: ["entertainment", "humor", "relatable", "trending-sound", "aesthetic"]
};

/**
 * Build a full weekly content plan for a profile
 */
function buildWeeklyContentPlan(profile, researchOutput, options = {}) {
  const logger = options.logger ?? console;
  const weekStartDate = options.weekStartDate ?? getNextMonday();

  // Calculate total posts needed across all platforms
  const postCounts = calculatePostCounts(profile);
  const totalPosts = postCounts.total;

  logger.log(`[Planner] Building ${totalPosts} posts for ${profile.profile_id}`);

  // Build content type distribution
  const contentDistribution = distributeByRatios(profile.content_ratios, totalPosts);

  // Assign research context to each post
  const hooks = researchOutput?.hookPatterns || [];
  const angles = researchOutput?.recommendedNextFocus?.recommendedFocus?.split(" ") || [];
  const contentPatterns = researchOutput?.contentPatterns || [];

  // Create post slots
  const planItems = [];
  let postIndex = 0;

  // Iterate over platforms and their posting frequency
  const platformMap = {
    tiktok: profile.posting_schedule.tiktok,
    youtube_shorts: profile.posting_schedule.youtube_shorts,
    instagram: profile.posting_schedule.instagram,
    facebook: profile.posting_schedule.facebook
  };

  const activePlatforms = (profile.active_platforms || []).map((p) =>
    p.toLowerCase().replace(/\s+/g, "_").replace("youtube shorts", "youtube_shorts")
  );

  for (const [platform, postsPerWeek] of Object.entries(platformMap)) {
    const normalizedPlatform = platform.toLowerCase();
    if (!isActivePlatform(normalizedPlatform, activePlatforms)) continue;

    for (let i = 0; i < postsPerWeek; i++) {
      const contentType = getContentTypeForIndex(contentDistribution, postIndex);
      const scheduledTime = getScheduledTime(normalizedPlatform, i, weekStartDate);
      const hook = hooks[postIndex % hooks.length] || "Did you know...";
      const angle = angles[postIndex % angles.length] || "transformation";
      const narrative = contentPatterns[postIndex % contentPatterns.length] || "Problem → Solution → Proof → CTA";

      planItems.push({
        plan_item_id: `${profile.profile_id}_${normalizedPlatform}_w${weekNumber(weekStartDate)}_${i + 1}`,
        profile_id: profile.profile_id,
        platform: normalizedPlatform,
        content_type: contentType,
        hook: hook,
        angle: angle,
        narrative_structure: narrative,
        scheduled_at: scheduledTime.toISOString(),
        week_start: weekStartDate.toISOString().split("T")[0],
        status: "pending",
        research_source_url: researchOutput?.topSources?.[postIndex % Math.max(researchOutput?.topSources?.length || 1, 1)]?.source_url || "",
        cta_intensity: profile.cta_intensity,
        product_name: profile.monetization?.product_name || "",
        affiliate_url: profile.monetization?.affiliate_url || "",
        mode: profile.mode,
        niche: typeof profile.niche === "string" ? profile.niche : "general"
      });

      postIndex++;
    }
  }

  const plan = {
    profile_id: profile.profile_id,
    week_start: weekStartDate.toISOString().split("T")[0],
    week_end: getWeekEnd(weekStartDate).toISOString().split("T")[0],
    total_posts: planItems.length,
    by_platform: countByPlatform(planItems),
    by_content_type: countByContentType(planItems),
    items: planItems,
    generatedAt: new Date().toISOString()
  };

  logger.log(`[Planner] ✓ Created ${planItems.length} post slots for ${profile.profile_id}`);
  return plan;
}

/**
 * Calculate post counts from posting schedule
 */
function calculatePostCounts(profile) {
  const schedule = profile.posting_schedule || {};
  const activePlatforms = (profile.active_platforms || []).map((p) =>
    p.toLowerCase().replace(/\s+/g, "_")
  );

  let total = 0;
  const breakdown = {};

  const platformMap = {
    tiktok: schedule.tiktok || 0,
    youtube_shorts: schedule.youtube_shorts || 0,
    instagram: schedule.instagram || 0,
    facebook: schedule.facebook || 0
  };

  for (const [platform, count] of Object.entries(platformMap)) {
    if (isActivePlatform(platform, activePlatforms) && count > 0) {
      breakdown[platform] = count;
      total += count;
    }
  }

  return { total, breakdown };
}

/**
 * Distribute posts across content types based on ratios
 */
function distributeByRatios(contentRatios, totalPosts) {
  const ratios = contentRatios || {};
  const distribution = [];

  const types = ["growth", "trust", "proof", "conversion", "fluff"];

  types.forEach((type) => {
    const ratio = (parseInt(ratios[type] || 0)) / 100;
    const count = Math.round(totalPosts * ratio);

    for (let i = 0; i < count; i++) {
      distribution.push(type);
    }
  });

  // Pad to total if rounding left us short
  while (distribution.length < totalPosts) {
    distribution.push("growth"); // default to growth
  }

  // Shuffle to distribute evenly
  return shuffleArray(distribution).slice(0, totalPosts);
}

/**
 * Get content type for a given position in distribution
 */
function getContentTypeForIndex(distribution, index) {
  return distribution[index % distribution.length] || "growth";
}

/**
 * Get scheduled posting time for a platform and post index
 */
function getScheduledTime(platform, postIndex, weekStart) {
  const times = PLATFORM_BEST_TIMES[platform] || PLATFORM_BEST_TIMES.instagram;

  // Distribute posts across different days/times
  const timeSlot = times[postIndex % times.length];
  const scheduled = new Date(weekStart);
  scheduled.setDate(weekStart.getDate() + timeSlot.day);
  scheduled.setHours(timeSlot.hour, 0, 0, 0);

  return scheduled;
}

/**
 * Check if platform is in the active platforms list
 */
function isActivePlatform(platform, activePlatforms) {
  if (activePlatforms.length === 0) return true; // no restriction = all active

  return activePlatforms.some((ap) => {
    const normalized = ap.toLowerCase().replace(/\s+/g, "_");
    return normalized.includes(platform) || platform.includes(normalized);
  });
}

/**
 * Get next Monday as week start
 */
function getNextMonday() {
  const date = new Date();
  const day = date.getDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  date.setDate(date.getDate() + daysUntilMonday);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Get week end date (Sunday)
 */
function getWeekEnd(weekStart) {
  const end = new Date(weekStart);
  end.setDate(weekStart.getDate() + 6);
  return end;
}

/**
 * Get ISO week number
 */
function weekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    )
  );
}

/**
 * Count items by platform
 */
function countByPlatform(items) {
  return items.reduce((acc, item) => {
    acc[item.platform] = (acc[item.platform] || 0) + 1;
    return acc;
  }, {});
}

/**
 * Count items by content type
 */
function countByContentType(items) {
  return items.reduce((acc, item) => {
    acc[item.content_type] = (acc[item.content_type] || 0) + 1;
    return acc;
  }, {});
}

/**
 * Fisher-Yates shuffle
 */
function shuffleArray(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Convert plan items to rows for Google Sheets Weekly_Content_Plan tab
 */
function planItemsToSheetRows(planItems) {
  const headers = [
    "plan_item_id", "profile_id", "platform", "content_type",
    "hook", "angle", "narrative_structure", "scheduled_at",
    "week_start", "status", "research_source_url",
    "cta_intensity", "product_name", "affiliate_url", "mode", "niche"
  ];

  const rows = planItems.map((item) =>
    headers.map((h) => String(item[h] ?? ""))
  );

  return { headers, rows };
}

module.exports = {
  buildWeeklyContentPlan,
  calculatePostCounts,
  distributeByRatios,
  planItemsToSheetRows
};
