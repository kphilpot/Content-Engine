const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

// Create a new workbook
const wb = XLSX.utils.book_new();

// Channel_Profiles sheet
const channelProfilesData = [
  {
    profile_id: "personal_product_main",
    channel_name: "Main Channel",
    mode: "personal_product",
    niche: "Beauty & Personal Care",
    research_focus: "Skincare trends",
    content_pillars: "Education, Entertainment, Reviews",
    tone: "Friendly, Informative",
    posting_frequency_tiktok: 5,
    posting_frequency_youtube: 2,
    posting_frequency_instagram: 3,
    posting_frequency_facebook: 1,
    active_platforms: "TikTok, YouTube Shorts, Instagram",
    cta_intensity: "medium",
    active_product_name: "SkinGlow Pro",
    active_product_url: "https://example.com/skinglow",
    affiliate_url: "https://aff.example.com/skinglow",
    plugin_enabled: true,
    plugin_id: "plugin_001",
    plugin_url: "https://plugin.example.com",
    approval_mode: "auto",
    smart_approval_enabled: true,
    ratio_growth: 25,
    ratio_trust: 30,
    ratio_proof: 20,
    ratio_conversion: 15,
    ratio_fluff: 10,
    budget_weight: 0.5,
    enabled: true
  },
  {
    profile_id: "hair_authority_1",
    channel_name: "Hair Authority Channel",
    mode: "niche_authority",
    niche: "Hair Care",
    research_focus: "Hair treatment innovations",
    content_pillars: "Tutorials, Science, Case Studies",
    tone: "Expert, Authoritative",
    posting_frequency_tiktok: 4,
    posting_frequency_youtube: 3,
    posting_frequency_instagram: 2,
    posting_frequency_facebook: 1,
    active_platforms: "TikTok, YouTube Shorts, Instagram",
    cta_intensity: "high",
    active_product_name: "HairRevive Max",
    active_product_url: "https://example.com/hairrevive",
    affiliate_url: "https://aff.example.com/hairrevive",
    plugin_enabled: true,
    plugin_id: "plugin_002",
    plugin_url: "https://plugin.example.com/hair",
    approval_mode: "manual",
    smart_approval_enabled: false,
    ratio_growth: 20,
    ratio_trust: 35,
    ratio_proof: 25,
    ratio_conversion: 15,
    ratio_fluff: 5,
    budget_weight: 0.3,
    enabled: true
  },
  {
    profile_id: "hair_authority_2",
    channel_name: "Hair Science Lab",
    mode: "niche_authority",
    niche: "Hair Care",
    research_focus: "Hair chemistry and structure",
    content_pillars: "Research, Analysis, Deep Dives",
    tone: "Scientific, Educational",
    posting_frequency_tiktok: 3,
    posting_frequency_youtube: 4,
    posting_frequency_instagram: 1,
    posting_frequency_facebook: 1,
    active_platforms: "YouTube Shorts, Instagram, Facebook",
    cta_intensity: "low",
    active_product_name: "HairLab Formula",
    active_product_url: "https://example.com/hairlab",
    affiliate_url: "https://aff.example.com/hairlab",
    plugin_enabled: false,
    plugin_id: "",
    plugin_url: "",
    approval_mode: "auto",
    smart_approval_enabled: true,
    ratio_growth: 15,
    ratio_trust: 40,
    ratio_proof: 30,
    ratio_conversion: 10,
    ratio_fluff: 5,
    budget_weight: 0.2,
    enabled: true
  }
];

const channelProfilesWs = XLSX.utils.json_to_sheet(channelProfilesData);
XLSX.utils.book_append_sheet(wb, channelProfilesWs, "Channel_Profiles");

// Plugins sheet
const pluginsData = [
  {
    plugin_id: "plugin_001",
    plugin_name: "SkinGlow Widget",
    plugin_type: "product_showcase",
    niche: "Beauty & Personal Care",
    plugin_url: "https://plugin.example.com/skinglow",
    default_cta_copy: "Shop Now",
    default_cta_mode: "direct",
    enabled: true,
    notes: "Primary product showcase widget"
  },
  {
    plugin_id: "plugin_002",
    plugin_name: "Hair Care Pro",
    plugin_type: "product_showcase",
    niche: "Hair Care",
    plugin_url: "https://plugin.example.com/hair",
    default_cta_copy: "Learn More",
    default_cta_mode: "soft",
    enabled: true,
    notes: "Hair product information widget"
  }
];

const pluginsWs = XLSX.utils.json_to_sheet(pluginsData);
XLSX.utils.book_append_sheet(wb, pluginsWs, "Plugins");

// Reference_Pages sheet
const referencePagesData = [
  {
    reference_id: "ref_001",
    profile_id: "personal_product_main",
    reference_name: "Skincare Influencer A",
    reference_type: "social_account",
    reference_url: "https://instagram.com/skincare_influencer_a",
    why_it_matters: "Leader in skincare content",
    content_traits_to_study: "Tutorial format, before/after visuals",
    trust_traits_to_study: "Dermatologist background, user testimonials",
    conversion_traits_to_study: "Product recommendations, links in bio",
    visual_traits_to_study: "Bright lighting, close-ups, product focus",
    enabled: true,
    notes: "Primary inspiration for content style"
  },
  {
    reference_id: "ref_002",
    profile_id: "hair_authority_1",
    reference_name: "Hair Science Journal",
    reference_type: "google_doc",
    reference_url: "https://docs.google.com/document/d/example_hair_science",
    why_it_matters: "Research-backed hair information",
    content_traits_to_study: "Data visualization, scientific explanations",
    trust_traits_to_study: "Citations, peer review process",
    conversion_traits_to_study: "Product links, expert recommendations",
    visual_traits_to_study: "Charts, diagrams, professional layout",
    enabled: true,
    notes: "Authority reference for hair science content"
  },
  {
    reference_id: "ref_003",
    profile_id: "hair_authority_2",
    reference_name: "Advanced Hair Research Article",
    reference_type: "article_url",
    reference_url: "https://journal.example.com/hair-research-2024",
    why_it_matters: "Latest hair science discoveries",
    content_traits_to_study: "In-depth analysis, technical terms",
    trust_traits_to_study: "Author credentials, research citations",
    conversion_traits_to_study: "Product recommendations, expert insights",
    visual_traits_to_study: "Scientific diagrams, data tables",
    enabled: true,
    notes: "Deep dive reference for hair chemistry"
  },
  {
    reference_id: "ref_004",
    profile_id: "personal_product_main",
    reference_name: "Beauty Vlogger B",
    reference_type: "social_account",
    reference_url: "https://youtube.com/channel/beauty_vlogger_b",
    why_it_matters: "Popular beauty content creator",
    content_traits_to_study: "Story format, personal journey",
    trust_traits_to_study: "Honest reviews, failed products mentioned",
    conversion_traits_to_study: "Affiliate disclosures, haul videos",
    visual_traits_to_study: "Natural lighting, minimal editing",
    enabled: true,
    notes: "Secondary inspiration source"
  }
];

const referencePagesWs = XLSX.utils.json_to_sheet(referencePagesData);
XLSX.utils.book_append_sheet(wb, referencePagesWs, "Reference_Pages");

// Create remaining sheets with headers only
const emptySheets = [
  "Weekly_Research",
  "Weekly_Content_Plan",
  "Content_Queue",
  "Performance_Log",
  "Performance_Signals",
  "Optimization_Notes",
  "System_Status",
  "Manual_Performance_Paste"
];

emptySheets.forEach((sheetName) => {
  const ws = XLSX.utils.aoa_to_sheet([[]]);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
});

// Write to file
const outputPath = path.join(process.cwd(), "control_center.xlsx");
XLSX.writeFile(wb, outputPath);
console.log(`✓ Generated control center XLSX: ${outputPath}`);
console.log(`✓ Includes 11 tabs with sample data for 3 profiles`);
console.log(`✓ Profiles: personal_product_main, hair_authority_1, hair_authority_2`);
console.log("\nNext steps:");
console.log("1. Upload this file to Google Sheets at: https://sheets.google.com");
console.log("2. Replace the current sheet with ID: 1hE_adADIYgqkSeCuNL7JOt6ps_VRpWtc9CO1t3xkyXI");
console.log("3. Or manually create the tabs in your existing Google Sheet");
