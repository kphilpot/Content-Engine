const test = require("node:test");
const assert = require("node:assert");
const { runResearchEngine } = require("./research/research_engine");

// Mock profile for testing
const mockProfile = {
  profile_id: "personal_product_main",
  channel_name: "Hair Transformations",
  mode: "personal_product",
  niche: "hair",
  research_focus: "hair loss solutions styling tips",
  content_pillars: "transformation; quick tips; science-backed",
  cta_intensity: "medium",
  active_product_name: "Hair Growth Serum",
  active_product_url: "https://hairserum.com",
  affiliate_url: "https://hairserum.com/aff?id=personal_product_main",
  enabled: true
};

// Mock control center state with all tabs
const mockControlCenterState = {
  spreadsheetId: "test-sheet-id",
  tabs: {
    Channel_Profiles: {
      rows: [mockProfile],
      readSuccess: true
    },
    Reference_Pages: {
      rows: [
        {
          reference_id: "ref_1",
          profile_id: "personal_product_main",
          reference_name: "Hair Loss Reddit Thread",
          reference_type: "reddit",
          reference_url: "https://reddit.com/r/Hairloss/comments/...",
          enabled: true
        },
        {
          reference_id: "ref_2",
          profile_id: "personal_product_main",
          reference_name: "Styling Tips Twitter",
          reference_type: "twitter",
          reference_url: "https://twitter.com/search?q=%23HairTips",
          enabled: true
        }
      ],
      readSuccess: true
    },
    Performance_Signals: {
      rows: [
        {
          profile_id: "personal_product_main",
          week_end_date: "2026-04-05",
          total_engagement: 150,
          conversions: 3,
          conversion_rate: 0.02,
          avg_engagement_rate: 0.05,
          top_hook: "Did you know hair loss can be reversed?",
          source_type: "reddit",
          source_url: "https://reddit.com/r/Hairloss",
          content_angle: "transformation results"
        }
      ],
      readSuccess: true
    },
    Weekly_Research: { rows: [], readSuccess: true },
    Weekly_Content_Plan: { rows: [], readSuccess: true },
    Content_Queue: { rows: [], readSuccess: true },
    Performance_Log: { rows: [], readSuccess: true },
    Optimization_Notes: { rows: [], readSuccess: true },
    System_Status: { rows: [], readSuccess: true },
    Manual_Performance_Paste: { rows: [], readSuccess: true },
    Plugins: { rows: [], readSuccess: true }
  }
};

test("Research Engine - Complete Workflow", async (t) => {
  // Test 1: Run research engine with skip remote (testing mode)
  await t.test("should run research engine successfully", async () => {
    const result = await runResearchEngine(mockProfile, mockControlCenterState, {
      skipRemote: true, // Don't hit Reddit API
      logger: {
        log: () => {},
        error: () => {}
      }
    });

    assert.ok(result, "Research engine should return a result");
    assert.strictEqual(result.profile_id, "personal_product_main");
    assert.ok(result.generatedAt, "Should have generation timestamp");
    assert.ok(Array.isArray(result.topSources), "Should return top sources");
    assert.ok(Array.isArray(result.hookPatterns), "Should extract hook patterns");
    assert.ok(
      result.recommendedNextFocus,
      "Should recommend next research focus"
    );
  });

  // Test 2: Performance signal analysis
  await t.test("should analyze performance signals correctly", async () => {
    const result = await runResearchEngine(mockProfile, mockControlCenterState, {
      skipRemote: true,
      logger: { log: () => {}, error: () => {} }
    });

    const insights = result.performanceInsights;
    assert.ok(insights, "Should have performance insights");
    assert.ok(insights.lastWeekEngagement, "Should extract last week engagement");
    assert.ok(insights.conversionSources, "Should identify conversion sources");
    assert.ok(insights.engagementVelocityTrend, "Should analyze engagement trend");
    assert.ok(insights.recommendations, "Should generate recommendations");
  });

  // Test 3: Research focus optimization
  await t.test("should recommend research focus optimization", async () => {
    const result = await runResearchEngine(mockProfile, mockControlCenterState, {
      skipRemote: true,
      logger: { log: () => {}, error: () => {} }
    });

    const nextFocus = result.recommendedNextFocus;
    assert.ok(nextFocus, "Should recommend next focus");
    assert.ok(nextFocus.previousFocus, "Should track previous focus");
    assert.ok(nextFocus.recommendedFocus, "Should recommend new focus");
    assert.ok(typeof nextFocus.shouldUpdate === "boolean", "Should indicate if update needed");
  });

  // Test 4: Source adaptation
  await t.test("should identify sources to replace and add", async () => {
    const result = await runResearchEngine(mockProfile, mockControlCenterState, {
      skipRemote: true,
      logger: { log: () => {}, error: () => {} }
    });

    assert.ok(Array.isArray(result.sourcesToReplace), "Should identify sources to replace");
    assert.ok(Array.isArray(result.sourcesToAdd), "Should identify new sources to add");
  });

  // Test 5: Pattern extraction
  await t.test("should extract content and conversion patterns", async () => {
    const result = await runResearchEngine(mockProfile, mockControlCenterState, {
      skipRemote: true,
      logger: { log: () => {}, error: () => {} }
    });

    assert.ok(Array.isArray(result.hookPatterns), "Should extract hook patterns");
    assert.ok(Array.isArray(result.contentPatterns), "Should extract content patterns");
    assert.ok(Array.isArray(result.trustPatterns), "Should extract trust patterns");
    assert.ok(Array.isArray(result.conversionPatterns), "Should extract conversion patterns");
  });

  // Test 6: Verifies all required output fields
  await t.test("should include all required output fields", async () => {
    const result = await runResearchEngine(mockProfile, mockControlCenterState, {
      skipRemote: true,
      logger: { log: () => {}, error: () => {} }
    });

    const requiredFields = [
      "profile_id",
      "generatedAt",
      "performanceInsights",
      "topSources",
      "hookPatterns",
      "contentPatterns",
      "trustPatterns",
      "conversionPatterns",
      "recommendedNextFocus",
      "sourcesToAdd",
      "sourcesToReplace"
    ];

    requiredFields.forEach((field) => {
      assert.ok(result.hasOwnProperty(field), `Should have ${field} field`);
    });
  });
});

test("Research Engine - Integration", async (t) => {
  // Test with multiple profiles
  await t.test("should handle multiple profiles", async () => {
    const profiles = [
      { ...mockProfile, profile_id: "personal_product_main" },
      { ...mockProfile, profile_id: "hair_authority_1", mode: "niche_authority" },
      { ...mockProfile, profile_id: "hair_authority_2", mode: "niche_authority" }
    ];

    const results = await Promise.all(
      profiles.map((profile) =>
        runResearchEngine(profile, mockControlCenterState, {
          skipRemote: true,
          logger: { log: () => {}, error: () => {} }
        })
      )
    );

    assert.strictEqual(results.length, 3, "Should process all 3 profiles");
    results.forEach((result) => {
      assert.ok(result.profile_id, "Each result should have profile_id");
    });
  });
});
