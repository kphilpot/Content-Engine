const test = require("node:test");
const assert = require("node:assert");

// Individual unit tests for each phase module
// Full integration test at the bottom runs the complete cycle end-to-end with mocks

// ========== PHASE 5: Cost Governor ===========
const {
  calculateCostFromTokens,
  estimateBatchCost,
  governCost,
  trackSpending,
  allocateBudgetByProfile
} = require("./engine/cost_governor");

test("Phase 5 - Cost Governor", async (t) => {
  await t.test("calculates token costs correctly", () => {
    // 1M input + 1M output
    const cost = calculateCostFromTokens(1_000_000, 1_000_000);
    assert.strictEqual(cost, 18.00); // $3 input + $15 output
  });

  await t.test("estimates batch costs", () => {
    const cost = estimateBatchCost(100);
    assert.ok(cost > 0, "batch cost should be positive");
    assert.ok(cost < 5, "100 posts should cost under $5");
  });

  await t.test("governs cost correctly", () => {
    const decision = governCost(10.00, 0, 50);
    assert.ok(decision.allowedPosts > 0);
    assert.strictEqual(decision.weeklyBudget, 10.00);
    assert.strictEqual(decision.status, "OK");
  });

  await t.test("throttles when budget is low", () => {
    const decision = governCost(10.00, 9.50, 50);
    assert.ok(decision.isThrottled, "Should throttle when budget is low");
    assert.ok(decision.allowedPosts < 50);
  });

  await t.test("allocates budget by profile weight", () => {
    const profiles = [
      { profile_id: "p1", budget_weight: 0.5 },
      { profile_id: "p2", budget_weight: 0.3 },
      { profile_id: "p3", budget_weight: 0.2 }
    ];
    const allocations = allocateBudgetByProfile(profiles, 10.00);
    assert.strictEqual(allocations.length, 3);

    const totalAllocated = allocations.reduce((s, a) => s + a.allocated_budget, 0);
    assert.ok(Math.abs(totalAllocated - 8.00) < 0.01, "Total allocation should be 80% of budget");
  });
});

// ========== PHASE 6: Weekly Planner ===========
const { buildWeeklyContentPlan, calculatePostCounts, distributeByRatios } = require("./planning/weekly_planner");

const mockProfile = {
  profile_id: "personal_product_main",
  channel_name: "Test Channel",
  mode: "personal_product",
  niche: "hair",
  research_focus: ["hair loss", "styling"],
  content_pillars: ["tips", "transformation"],
  tone: "friendly",
  cta_intensity: "medium",
  active_platforms: ["TikTok", "YouTube Shorts", "Instagram"],
  posting_schedule: { tiktok: 3, youtube_shorts: 2, instagram: 2, facebook: 1 },
  content_ratios: { growth: 25, trust: 30, proof: 20, conversion: 15, fluff: 10 },
  approval_mode: "smart_auto",
  smart_approval_enabled: true,
  monetization: { product_name: "Hair Serum", affiliate_url: "https://aff.test/serum" },
  budget_weight: 0.33
};

test("Phase 6 - Weekly Content Planner", async (t) => {
  await t.test("calculates post counts from schedule", () => {
    const counts = calculatePostCounts(mockProfile);
    assert.ok(counts.total > 0, "Should have at least 1 post");
    assert.ok(counts.breakdown, "Should have breakdown by platform");
  });

  await t.test("distributes by content ratios", () => {
    const dist = distributeByRatios(mockProfile.content_ratios, 100);
    assert.strictEqual(dist.length, 100, "Should produce exactly 100 items");

    const growthCount = dist.filter((d) => d === "growth").length;
    assert.ok(growthCount >= 20 && growthCount <= 30, `Growth should be ~25%, got ${growthCount}`);
  });

  await t.test("builds weekly plan with correct structure", () => {
    const mockResearch = {
      hookPatterns: ["Did you know?", "Stop doing this"],
      contentPatterns: ["Problem → Solution → CTA"],
      recommendedNextFocus: { recommendedFocus: "hair transformation" },
      topSources: [{ source_url: "https://reddit.com/test" }]
    };

    const plan = buildWeeklyContentPlan(mockProfile, mockResearch, {
      weekStartDate: new Date("2026-04-13"),
      logger: { log: () => {} }
    });

    assert.ok(plan.profile_id, "Plan should have profile_id");
    assert.ok(plan.items.length > 0, "Plan should have items");
    assert.ok(plan.week_start, "Plan should have week_start");

    plan.items.forEach((item) => {
      assert.ok(item.plan_item_id, "Each item should have plan_item_id");
      assert.ok(item.platform, "Each item should have platform");
      assert.ok(item.hook, "Each item should have hook");
      assert.ok(item.scheduled_at, "Each item should have scheduled_at");
    });
  });
});

// ========== PHASE 7: Content Generator ===========
const { generateMockContent, buildGenerationPrompt, contentToSheetRows } = require("./generation/content_generator");

test("Phase 7 - Content Generator", async (t) => {
  const mockPlanItem = {
    plan_item_id: "personal_product_main_tiktok_w15_1",
    profile_id: "personal_product_main",
    platform: "tiktok",
    content_type: "growth",
    hook: "Did you know this hair trick changes everything?",
    angle: "transformation",
    narrative_structure: "Problem → Solution → Proof → CTA",
    scheduled_at: "2026-04-14T09:00:00.000Z",
    cta_intensity: "medium"
  };

  await t.test("generates mock content when API unavailable", () => {
    const content = generateMockContent(mockPlanItem, mockProfile);

    assert.ok(content.caption, "Should generate a caption");
    assert.ok(content.hook, "Should include hook");
    assert.ok(Array.isArray(content.hashtags), "Should include hashtags");
    assert.ok(content.visual_direction, "Should include visual direction");
    assert.ok(content.isMockContent, "Should be marked as mock");
  });

  await t.test("builds generation prompt correctly", () => {
    const prompt = buildGenerationPrompt(mockPlanItem, mockProfile);
    assert.ok(prompt.systemPrompt, "Should have system prompt");
    assert.ok(prompt.userPrompt, "Should have user prompt");
    assert.ok(prompt.userPrompt.toLowerCase().includes("tiktok"), "Should mention platform");
    assert.ok(prompt.userPrompt.includes("growth"), "Should mention content type");
  });

  await t.test("converts content to sheet rows", () => {
    const content = generateMockContent(mockPlanItem, mockProfile);
    const { headers, rows } = contentToSheetRows([content]);
    assert.ok(headers.length > 0, "Should have headers");
    assert.strictEqual(rows.length, 1, "Should have one row");
    assert.strictEqual(rows[0].length, headers.length, "Row should match header count");
  });
});

// ========== PHASE 8: Approval Workflow ===========
const { checkContentQuality, processApproval, scoreHook } = require("./approval/approval_workflow");

test("Phase 8 - Approval Workflow", async (t) => {
  await t.test("scores hooks correctly", () => {
    const goodHook = "Did you know this hair mistake is costing you results?";
    const badHook = "Post about hair.";

    assert.ok(scoreHook(goodHook, mockProfile) > 0.5, "Good hook should score > 0.5");
    assert.ok(scoreHook(badHook, mockProfile) < 0.5, "Bad hook should score < 0.5");
  });

  await t.test("checks content quality", () => {
    const goodContent = {
      plan_item_id: "test_1",
      profile_id: "personal_product_main",
      platform: "tiktok",
      content_type: "growth",
      caption: "Did you know this hair trick works? I tried it for 30 days and here's what happened. Get Hair Serum now - link in bio! #HairTok #Transformation",
      hook: "Did you know this hair trick works?",
      cta: "Get Hair Serum now - link in bio!"
    };

    const quality = checkContentQuality(goodContent, mockProfile);
    assert.ok(quality.hookScore > 0, "Hook should be scored");
    assert.ok(typeof quality.hasCTA === "boolean", "Should check CTA");
    assert.ok(typeof quality.withinLimits === "boolean", "Should check limits");
  });

  await t.test("auto-approves in auto mode", async () => {
    const profileWithAutoMode = { ...mockProfile, approval_mode: "auto" };
    const content = generateMockContent({
      plan_item_id: "test_auto",
      profile_id: "personal_product_main",
      platform: "instagram",
      content_type: "growth",
      hook: "Did you know this works?",
      angle: "transformation",
      cta_intensity: "medium",
      scheduled_at: new Date().toISOString()
    }, profileWithAutoMode);

    const result = await processApproval(content, profileWithAutoMode, {
      logger: { log: () => {}, error: () => {} }
    });

    assert.strictEqual(result.approval_status, "approved", "Auto mode should approve");
  });
});

// ========== PHASE 11: Optimization Loop ===========
const { generateOptimizationNotes, generateOptimizationReport } = require("./optimization/optimization_loop");

test("Phase 11 - Optimization Loop", async (t) => {
  await t.test("generates optimization notes", () => {
    const mockAnalytics = {
      profile_id: "personal_product_main",
      total_posts: 8,
      avg_engagement_rate: 0.06,
      conversion_rate: 0.02,
      total_conversions: 5,
      top_hook: "Did you know hair loss can be reversed?"
    };

    const notes = generateOptimizationNotes(mockProfile, mockAnalytics, null);
    assert.ok(notes.length > 0, "Should generate at least one note");

    notes.forEach((note) => {
      assert.ok(note.observation, "Note should have observation");
      assert.ok(note.action_item, "Note should have action item");
      assert.ok(note.priority, "Note should have priority");
    });
  });

  await t.test("generates optimization report", () => {
    const notes = [
      {
        profile_id: "personal_product_main",
        priority: "high",
        category: "performance",
        observation: "Engagement is up 15%",
        action_item: "Continue current strategy"
      }
    ];

    const report = generateOptimizationReport(notes);
    assert.ok(typeof report === "string", "Report should be a string");
    assert.ok(report.length > 0, "Report should not be empty");
  });
});

// ========== PHASE 12: Telegram Reporter ===========
const { formatWeeklyReport, buildWeeklyStats } = require("./reporting/telegram_reporter");

test("Phase 12 - Telegram Reporter", async (t) => {
  await t.test("formats weekly report correctly", () => {
    const stats = {
      week_start: "2026-04-13",
      week_end: "2026-04-19",
      profiles: [
        {
          profile_id: "personal_product_main",
          total_posts: 8,
          avg_engagement_rate: 0.07,
          conversion_rate: 0.025,
          total_conversions: 12
        }
      ],
      total_posts_published: 8,
      total_conversions: 12,
      weekly_ai_cost: 0.45,
      alerts: []
    };

    const report = formatWeeklyReport(stats);
    assert.ok(report.includes("CONTENT ENGINE"), "Should have title");
    assert.ok(report.includes("personal_product_main"), "Should include profile");
    assert.ok(report.includes("8"), "Should include post count");
  });
});

// ========== FULL INTEGRATION TEST ===========
test("Full Weekly Cycle - Integration (Dry Run)", async (t) => {
  await t.test("runs complete cycle with skipRemote and dryRun", async () => {
    const { runWeeklyCycle } = require("./engine/weekly_cycle");

    const SHEET_ID = "1hE_adADIYgqkSeCuNL7JOt6ps_VRpWtc9CO1t3xkyXI";

    const result = await runWeeklyCycle(SHEET_ID, {
      skipRemote: true,  // Don't hit Reddit API
      dryRun: true,      // Don't actually publish
      weeklyBudget: 10.00,
      logger: {
        log: (msg) => { if (msg && !msg.includes("[reader]")) process.stdout.write("."); },
        error: (msg) => console.error(`\nERROR: ${msg}`)
      }
    });

    console.log(`\n`);

    assert.ok(result.success, `Cycle should succeed: ${result.error || ""}`);
    assert.ok(result.runId, "Should have a run ID");
    assert.ok(Array.isArray(result.phaseStatuses), "Should have phase statuses");
    assert.ok(result.phaseStatuses.length > 0, "Should have at least one phase recorded");

    // Verify profiles were loaded
    assert.ok(Array.isArray(result.profileConfigs), "Should have profiles");
    assert.ok(result.profileConfigs.length > 0, "Should have at least one profile");

    // Verify content was generated (mock)
    assert.ok(Array.isArray(result.contentItems), "Should have content items");
    assert.ok(result.contentItems.length > 0, `Should have generated content, got ${result.contentItems.length}`);

    // Verify weekly stats
    assert.ok(result.weeklyStats, "Should have weekly stats");

    // Cost should be within budget
    assert.ok(result.weeklySpending <= 10.00, `AI cost should be under $10, was $${result.weeklySpending}`);

    console.log(`  Profiles: ${result.profileConfigs.length}`);
    console.log(`  Content items: ${result.contentItems.length}`);
    console.log(`  AI cost: $${result.weeklySpending.toFixed(4)}`);
    console.log(`  Phase statuses: ${result.phaseStatuses.length}`);
  });
});
