const {
  parseBoolean,
  parseInteger,
  parseNumber,
  splitList
} = require("../sheets/validators");
const {
  validatePlatforms,
  validatePluginLink,
  validateProfileRow,
  validateReferencePages
} = require("./profile_validator");

function normalizeReferencePage(row) {
  return {
    reference_id: row.reference_id,
    reference_name: row.reference_name,
    reference_type: row.reference_type,
    reference_url: row.reference_url,
    why_it_matters: row.why_it_matters || "",
    content_traits_to_study: splitList(row.content_traits_to_study),
    trust_traits_to_study: splitList(row.trust_traits_to_study),
    conversion_traits_to_study: splitList(row.conversion_traits_to_study),
    visual_traits_to_study: splitList(row.visual_traits_to_study),
    enabled: parseBoolean(row.enabled) === true
  };
}

function normalizePlugin(profileRow, pluginRow) {
  const enabled = parseBoolean(profileRow.plugin_enabled) === true;
  return {
    enabled,
    plugin_id: enabled ? profileRow.plugin_id || null : null,
    plugin_name: enabled ? pluginRow?.plugin_name ?? null : null,
    plugin_type: enabled ? pluginRow?.plugin_type ?? null : null,
    plugin_url: enabled ? profileRow.plugin_url || pluginRow?.plugin_url || null : null,
    default_cta_copy: enabled ? pluginRow?.default_cta_copy ?? null : null,
    default_cta_mode: enabled ? pluginRow?.default_cta_mode ?? null : null
  };
}

function normalizeProfile(profileRow, pluginRow, referenceRows) {
  const activePlatforms = splitList(profileRow.active_platforms);
  const referencePages = referenceRows.map(normalizeReferencePage);

  return {
    profile_id: profileRow.profile_id,
    channel_name: profileRow.channel_name,
    mode: profileRow.mode,
    niche: profileRow.niche,
    research_focus: splitList(profileRow.research_focus),
    content_pillars: splitList(profileRow.content_pillars),
    tone: profileRow.tone || "",
    posting_schedule: {
      tiktok: parseInteger(profileRow.posting_frequency_tiktok),
      youtube_shorts: parseInteger(profileRow.posting_frequency_youtube),
      instagram: parseInteger(profileRow.posting_frequency_instagram),
      facebook: parseInteger(profileRow.posting_frequency_facebook)
    },
    active_platforms: activePlatforms,
    cta_intensity: profileRow.cta_intensity,
    monetization: {
      product_name: profileRow.active_product_name || null,
      product_url: profileRow.active_product_url || null,
      affiliate_url: profileRow.affiliate_url || null
    },
    plugin: normalizePlugin(profileRow, pluginRow),
    content_ratios: {
      growth: parseNumber(profileRow.ratio_growth),
      trust: parseNumber(profileRow.ratio_trust),
      proof: parseNumber(profileRow.ratio_proof),
      conversion: parseNumber(profileRow.ratio_conversion),
      fluff: parseNumber(profileRow.ratio_fluff)
    },
    approval_mode: profileRow.approval_mode,
    smart_approval_enabled: parseBoolean(profileRow.smart_approval_enabled) === true,
    budget_weight: parseNumber(profileRow.budget_weight),
    reference_pages: referencePages
  };
}

function buildProfileReport(profileConfig, errors, warnings) {
  const pluginSummary = profileConfig.plugin.enabled
    ? `${profileConfig.plugin.plugin_name || "missing plugin"} (${profileConfig.plugin.plugin_id || "no id"})`
    : "disabled";

  const referenceNames = profileConfig.reference_pages.map((page) => page.reference_name).join(", ") || "none";

  return [
    `Profile: ${profileConfig.profile_id} | ${profileConfig.channel_name}`,
    `  Mode/Niche: ${profileConfig.mode} | ${profileConfig.niche}`,
    `  Platforms: ${profileConfig.active_platforms.join(", ") || "none"}`,
    `  Posting: TikTok=${profileConfig.posting_schedule.tiktok}, YouTube Shorts=${profileConfig.posting_schedule.youtube_shorts}, Instagram=${profileConfig.posting_schedule.instagram}, Facebook=${profileConfig.posting_schedule.facebook}`,
    `  Ratios: growth=${profileConfig.content_ratios.growth}, trust=${profileConfig.content_ratios.trust}, proof=${profileConfig.content_ratios.proof}, conversion=${profileConfig.content_ratios.conversion}, fluff=${profileConfig.content_ratios.fluff}`,
    `  Plugin: ${pluginSummary}`,
    `  Reference Pages (${profileConfig.reference_pages.length}): ${referenceNames}`,
    `  Errors: ${errors.length ? errors.join(" | ") : "none"}`,
    `  Warnings: ${warnings.length ? warnings.join(" | ") : "none"}`
  ].join("\n");
}

function normalizeProfiles(controlCenterState) {
  const channelProfiles = controlCenterState.tabs.Channel_Profiles.rows;
  const plugins = controlCenterState.tabs.Plugins.rows;
  const referencePages = controlCenterState.tabs.Reference_Pages.rows;
  const enabledProfiles = channelProfiles.filter((row) => parseBoolean(row.enabled) === true);

  const profileConfigs = [];
  const profileReports = [];
  const validationResults = [];

  enabledProfiles.forEach((profileRow) => {
    const pluginRow = plugins.find((plugin) => plugin.plugin_id === profileRow.plugin_id);
    const linkedReferenceRows = referencePages.filter((page) => page.profile_id === profileRow.profile_id);

    const baseValidation = validateProfileRow(profileRow);
    const platformValidation = validatePlatforms(splitList(profileRow.active_platforms));
    const pluginValidation = validatePluginLink(profileRow, pluginRow);
    const referenceValidation = validateReferencePages(linkedReferenceRows);

    const errors = [
      ...baseValidation.errors,
      ...(platformValidation.ok ? [] : [`Invalid active_platforms: ${platformValidation.invalidPlatforms.join(", ")}`]),
      ...pluginValidation.errors,
      ...referenceValidation.errors
    ];
    const warnings = [
      ...baseValidation.warnings,
      ...pluginValidation.warnings,
      ...referenceValidation.warnings
    ];

    const profileConfig = normalizeProfile(profileRow, pluginRow, linkedReferenceRows);
    profileConfigs.push(profileConfig);

    validationResults.push({
      profile_id: profileConfig.profile_id,
      channel_name: profileConfig.channel_name,
      errors,
      warnings
    });
    profileReports.push(buildProfileReport(profileConfig, errors, warnings));
  });

  return {
    profileConfigs,
    validationResults,
    validationReport: profileReports.join("\n\n")
  };
}

module.exports = {
  normalizeProfiles
};
