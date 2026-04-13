const {
  parseBoolean,
  parseInteger,
  parseNumber
} = require("../sheets/validators");

const VALID_MODES = new Set(["personal_product", "niche_authority"]);
const VALID_APPROVAL_MODES = new Set(["auto", "manual"]);
const VALID_PLATFORMS = new Set(["TikTok", "YouTube Shorts", "Instagram", "Facebook"]);
const VALID_CTA_INTENSITIES = new Set(["low", "medium", "high"]);
const VALID_REFERENCE_TYPES = new Set(["social_account", "google_doc", "article_url"]);
const VALID_PLUGIN_CTA_MODES = new Set(["soft", "direct", "none"]);

function validateProfileRow(row) {
  const errors = [];
  const warnings = [];

  if (!row.profile_id) {
    errors.push("profile_id is required");
  }

  if (parseBoolean(row.enabled) !== true) {
    errors.push("enabled must be true for active profile normalization");
  }

  if (!VALID_MODES.has(String(row.mode ?? "").trim())) {
    errors.push(`mode must be one of: ${Array.from(VALID_MODES).join(", ")}`);
  }

  if (!VALID_APPROVAL_MODES.has(String(row.approval_mode ?? "").trim())) {
    errors.push(`approval_mode must be one of: ${Array.from(VALID_APPROVAL_MODES).join(", ")}`);
  }

  if (!VALID_CTA_INTENSITIES.has(String(row.cta_intensity ?? "").trim())) {
    warnings.push(`cta_intensity should be one of: ${Array.from(VALID_CTA_INTENSITIES).join(", ")}`);
  }

  const postingFields = [
    "posting_frequency_tiktok",
    "posting_frequency_youtube",
    "posting_frequency_instagram",
    "posting_frequency_facebook"
  ];

  postingFields.forEach((field) => {
    const value = parseInteger(row[field]);
    if (value === null || value <= 0) {
      errors.push(`${field} must be a positive integer`);
    }
  });

  const ratioFields = [
    "ratio_growth",
    "ratio_trust",
    "ratio_proof",
    "ratio_conversion",
    "ratio_fluff"
  ];

  const ratioValues = ratioFields.map((field) => parseNumber(row[field]));
  if (ratioValues.some((value) => value === null)) {
    errors.push("All ratio fields must be numeric");
  } else {
    const ratioSum = ratioValues.reduce((sum, value) => sum + value, 0);
    if (ratioSum !== 100) {
      errors.push(`Content ratios must sum to 100, received ${ratioSum}`);
    }
  }

  const budgetWeight = parseNumber(row.budget_weight);
  if (budgetWeight === null) {
    errors.push("budget_weight must be numeric");
  }

  return {
    errors,
    warnings
  };
}

function validatePlatforms(activePlatforms) {
  const invalidPlatforms = activePlatforms.filter((platform) => !VALID_PLATFORMS.has(platform));
  return {
    ok: invalidPlatforms.length === 0,
    invalidPlatforms
  };
}

function validatePluginLink(profileRow, pluginRow) {
  const pluginEnabled = parseBoolean(profileRow.plugin_enabled) === true;

  if (!pluginEnabled) {
    return { errors: [], warnings: [] };
  }

  const errors = [];

  if (!profileRow.plugin_id) {
    errors.push("plugin_enabled=true but plugin_id is empty");
  }

  if (!pluginRow) {
    errors.push(`No plugin found for plugin_id=${profileRow.plugin_id}`);
  } else {
    const pluginCtaMode = String(pluginRow.default_cta_mode ?? "").trim();
    if (pluginCtaMode && !VALID_PLUGIN_CTA_MODES.has(pluginCtaMode)) {
      errors.push(`Plugin default_cta_mode must be one of: ${Array.from(VALID_PLUGIN_CTA_MODES).join(", ")}`);
    }
  }

  return {
    errors,
    warnings: []
  };
}

function validateReferencePages(referencePages) {
  const errors = [];

  referencePages.forEach((referencePage) => {
    if (!VALID_REFERENCE_TYPES.has(String(referencePage.reference_type ?? "").trim())) {
      errors.push(
        `Reference ${referencePage.reference_id} has invalid reference_type=${referencePage.reference_type}`
      );
    }
  });

  return {
    errors,
    warnings: []
  };
}

module.exports = {
  VALID_APPROVAL_MODES,
  VALID_CTA_INTENSITIES,
  VALID_MODES,
  VALID_PLATFORMS,
  VALID_PLUGIN_CTA_MODES,
  VALID_REFERENCE_TYPES,
  validatePlatforms,
  validatePluginLink,
  validateProfileRow,
  validateReferencePages
};
