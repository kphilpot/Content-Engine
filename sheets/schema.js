const TAB_SCHEMAS = {
  Channel_Profiles: {
    requiredColumns: [
      "profile_id",
      "channel_name",
      "mode",
      "niche",
      "research_focus",
      "content_pillars",
      "tone",
      "posting_frequency_tiktok",
      "posting_frequency_youtube",
      "posting_frequency_instagram",
      "posting_frequency_facebook",
      "active_platforms",
      "cta_intensity",
      "active_product_name",
      "active_product_url",
      "affiliate_url",
      "plugin_enabled",
      "plugin_id",
      "plugin_url",
      "approval_mode",
      "smart_approval_enabled",
      "ratio_growth",
      "ratio_trust",
      "ratio_proof",
      "ratio_conversion",
      "ratio_fluff",
      "budget_weight",
      "enabled"
    ],
    requiredFields: ["profile_id", "channel_name", "mode", "niche", "enabled"]
  },
  Plugins: {
    requiredColumns: [
      "plugin_id",
      "plugin_name",
      "plugin_type",
      "niche",
      "plugin_url",
      "default_cta_copy",
      "default_cta_mode",
      "enabled",
      "notes"
    ],
    requiredFields: ["plugin_id", "plugin_name", "plugin_type", "enabled"]
  },
  Reference_Pages: {
    requiredColumns: [
      "reference_id",
      "profile_id",
      "reference_name",
      "reference_type",
      "reference_url",
      "why_it_matters",
      "content_traits_to_study",
      "trust_traits_to_study",
      "conversion_traits_to_study",
      "visual_traits_to_study",
      "enabled",
      "notes"
    ],
    requiredFields: [
      "reference_id",
      "profile_id",
      "reference_name",
      "reference_type",
      "reference_url",
      "enabled"
    ]
  },
  Weekly_Research: { requiredColumns: [], requiredFields: [] },
  Weekly_Content_Plan: { requiredColumns: [], requiredFields: [] },
  Content_Queue: { requiredColumns: [], requiredFields: [] },
  Performance_Log: { requiredColumns: [], requiredFields: [] },
  Performance_Signals: { requiredColumns: [], requiredFields: [] },
  Optimization_Notes: { requiredColumns: [], requiredFields: [] },
  System_Status: { requiredColumns: [], requiredFields: [] },
  Manual_Performance_Paste: { requiredColumns: [], requiredFields: [] }
};

const TAB_NAMES = Object.keys(TAB_SCHEMAS);

module.exports = {
  TAB_NAMES,
  TAB_SCHEMAS
};
