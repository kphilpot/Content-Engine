# Google Sheets Setup Guide

## Problem
The orchestrator expects a Google Sheet with 11 specific tabs and 3 profiles, but the current sheet (ID: `1hE_adADIYgqkSeCuNL7JOt6ps_VRpWtc9CO1t3xkyXI`) only has "Sheet1".

## Solution: Choose One of Three Options

### Option 1: Upload the Generated XLSX File (Easiest - No Code)
1. **File location:** `control_center.xlsx` (already generated)
2. **Steps:**
   - Go to https://sheets.google.com
   - Click "New" → "File upload"
   - Select `control_center.xlsx`
   - Google Sheets will convert it to a Sheet
   - Copy the new Sheet ID from the URL
   - Update `orchestrator.test.js` line 7 with the new Sheet ID
   - OR: Replace the existing sheet by importing this file there

**Status:** ✅ **READY** - File generated with all 11 tabs and 3 profiles

---

### Option 2: Set Up Google Sheets API Key (Code Integration)
1. **Create a Google Cloud Project:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project (e.g., "Content Engine")
   - Enable the "Google Sheets API"
   - Create a Service Account
   - Generate and download a JSON key file

2. **Configure the API Key:**
   - Save the JSON key as `.env.local` (gitignored) with:
     ```bash
     GOOGLE_SHEETS_API_KEY="your-key-content-here"
     ```
   - OR: Set it as an environment variable:
     ```bash
     export GOOGLE_SHEETS_API_KEY="your-key-content-here"
     npm test
     ```

3. **Share the Sheet with Service Account:**
   - Open the Google Sheet (ID: `1hE_adADIYgqkSeCuNL7JOt6ps_VRpWtc9CO1t3xkyXI`)
   - Click "Share"
   - Add the service account email (from JSON key file)
   - Grant "Editor" access

4. **Create Tabs Programmatically:**
   - Run: `node scripts/setup-api-sheets.js` (if available)
   - OR manually create the 11 tabs in the Google Sheet

**Status:** ⏳ **IN PROGRESS** - Needs API key from user

---

### Option 3: Create Tabs Manually in Google Sheet
1. Go to the Google Sheet: https://docs.google.com/spreadsheets/d/1hE_adADIYgqkSeCuNL7JOt6ps_VRpWtc9CO1t3xkyXI
2. Delete "Sheet1" (or keep it as a backup)
3. Create 11 new tabs with these exact names:
   - Channel_Profiles
   - Plugins
   - Reference_Pages
   - Weekly_Research
   - Weekly_Content_Plan
   - Content_Queue
   - Performance_Log
   - Performance_Signals
   - Optimization_Notes
   - System_Status
   - Manual_Performance_Paste

4. **Copy data for critical tabs:**
   - Open `control_center.xlsx` locally
   - Copy the data from each tab to the corresponding Google Sheet tab
   - Include all column headers and sample data

5. Run tests: `npm test`

**Status:** ⏳ **IN PROGRESS** - Needs manual work in Google Sheets UI

---

## Tabs Structure

### Required Columns by Tab

**Channel_Profiles (28 columns):**
- profile_id, channel_name, mode, niche, research_focus, content_pillars, tone
- posting_frequency_tiktok/youtube/instagram/facebook
- active_platforms, cta_intensity, active_product_name/url, affiliate_url
- plugin_enabled, plugin_id, plugin_url
- approval_mode, smart_approval_enabled
- ratio_growth, ratio_trust, ratio_proof, ratio_conversion, ratio_fluff (must sum to 100)
- budget_weight, enabled

**Plugins (9 columns):**
- plugin_id, plugin_name, plugin_type, niche, plugin_url
- default_cta_copy, default_cta_mode, enabled, notes

**Reference_Pages (12 columns):**
- reference_id, profile_id, reference_name, reference_type
- reference_url, why_it_matters, content_traits_to_study
- trust_traits_to_study, conversion_traits_to_study, visual_traits_to_study
- enabled, notes

**Other tabs:** Can be empty (created for future use)

---

## Testing

After setting up the Google Sheet:

```bash
# Run tests
npm test

# Or manually test with a specific Sheet ID
node scripts/run_orchestrator.js "your-sheet-id-here"
```

Expected output:
```
Control Center Validation Report
Spreadsheet ID: 1hE_adADIYgqkSeCuNL7JOt6ps_VRpWtc9CO1t3xkyXI
Tabs expected/read: 11/11
...
Profile count: 3
Profile IDs: personal_product_main, hair_authority_1, hair_authority_2
```

---

## Files Reference

- **control_center.xlsx** - Ready-to-use template with all data (generated)
- **orchestrator.test.js** - Test that verifies the setup works (line 7 has Sheet ID)
- **sheets/reader.js** - Handles reading from Google Sheets (with API key) or public export
- **sheets/schema.js** - Defines all 11 tab structures
- **core/control_center.js** - Validates the sheet structure
- **profiles/profile_normalizer.js** - Normalizes profile data from the sheet

---

## Verification Checklist

- [ ] All 11 tabs created
- [ ] Channel_Profiles has 3 rows (the 3 profiles)
- [ ] All required columns present
- [ ] Profile IDs: personal_product_main, hair_authority_1, hair_authority_2
- [ ] Content ratios sum to 100 for each profile
- [ ] Posting frequencies are positive integers
- [ ] All required fields filled
- [ ] Tests pass: `npm test`
