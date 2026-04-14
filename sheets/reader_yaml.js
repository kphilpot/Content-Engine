/**
 * YAML Config Reader
 * Replaces Google Sheets API with local YAML file reading
 * Much simpler, faster, and requires no authentication
 */

const yaml = require('yaml');
const fs = require('fs');
const path = require('path');

// Load .env.local if it exists
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf-8');
  const lines = envContent.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

/**
 * Read all YAML config files
 */
async function readAllTabs() {
  console.log('[reader] Loading YAML configuration files');

  const configDir = path.join(process.cwd(), 'config');

  // Read profiles.yml
  const profilesPath = path.join(configDir, 'profiles.yml');
  const profilesContent = fs.readFileSync(profilesPath, 'utf-8');
  const profilesData = yaml.parse(profilesContent);

  // Read plugins.yml
  const pluginsPath = path.join(configDir, 'plugins.yml');
  const pluginsContent = fs.readFileSync(pluginsPath, 'utf-8');
  const pluginsData = yaml.parse(pluginsContent);

  // Read reference_pages.yml
  const referencePath = path.join(configDir, 'reference_pages.yml');
  const referenceContent = fs.readFileSync(referencePath, 'utf-8');
  const referenceData = yaml.parse(referenceContent);

  return {
    Channel_Profiles: profilesData.profiles || [],
    Plugins: pluginsData.plugins || [],
    Reference_Pages: referenceData.reference_pages || [],
    // These tabs are auto-populated during runs
    Weekly_Research: [],
    Weekly_Content_Plan: [],
    Content_Queue: [],
    Performance_Log: [],
    Performance_Signals: [],
    Optimization_Notes: [],
    System_Status: [],
    Manual_Performance_Paste: []
  };
}

/**
 * Read a specific tab
 */
async function readTab(tabName) {
  const allTabs = await readAllTabs();
  return allTabs[tabName] || [];
}

/**
 * Write data to a tab (for operational tabs)
 */
async function writeTab(tabName, rows) {
  const dataFile = path.join(process.cwd(), `data-${tabName.toLowerCase()}.json`);
  fs.writeFileSync(dataFile, JSON.stringify(rows, null, 2));
  console.log(`[reader] Wrote ${rows.length} rows to ${tabName}`);
}

/**
 * Append rows to a tab
 */
async function appendTab(tabName, rows) {
  const dataFile = path.join(process.cwd(), `data-${tabName.toLowerCase()}.json`);
  let existing = [];

  if (fs.existsSync(dataFile)) {
    const content = fs.readFileSync(dataFile, 'utf-8');
    existing = JSON.parse(content);
  }

  const updated = [...existing, ...rows];
  fs.writeFileSync(dataFile, JSON.stringify(updated, null, 2));
  console.log(`[reader] Appended ${rows.length} rows to ${tabName}`);
}

/**
 * Clear a tab
 */
async function clearTab(tabName) {
  const dataFile = path.join(process.cwd(), `data-${tabName.toLowerCase()}.json`);
  fs.writeFileSync(dataFile, JSON.stringify([], null, 2));
  console.log(`[reader] Cleared ${tabName}`);
}

module.exports = {
  readAllTabs,
  readTab,
  writeTab,
  appendTab,
  clearTab
};
