#!/usr/bin/env node

/**
 * Setup Validator
 * Checks if everything is configured correctly before running the engine
 */

const fs = require('fs');
const path = require('path');

const checks = [];

function check(name, fn) {
  console.log(`\n📋 ${name}...`);
  try {
    const result = fn();
    if (result.success) {
      console.log(`   ✅ ${result.message}`);
      checks.push({ name, status: 'pass', message: result.message });
    } else {
      console.log(`   ⚠️  ${result.message}`);
      checks.push({ name, status: 'warn', message: result.message });
    }
  } catch (error) {
    console.log(`   ❌ ${error.message}`);
    checks.push({ name, status: 'fail', message: error.message });
  }
}

console.log(`\n🔍 Validating Content Engine Setup\n`);
console.log(`=====================================\n`);

// Check 1: Node.js version
check('Node.js version', () => {
  const version = process.version;
  const major = parseInt(version.split('.')[0].substring(1));
  if (major >= 20) {
    return { success: true, message: `Node.js ${version} (good)` };
  }
  return { success: false, message: `Node.js ${version} (need 20+)` };
});

// Check 2: npm installed
check('npm installed', () => {
  const { execSync } = require('child_process');
  const version = execSync('npm --version').toString().trim();
  return { success: true, message: `npm ${version}` };
});

// Check 3: Dependencies installed
check('npm dependencies installed', () => {
  const packagePath = path.join(process.cwd(), 'node_modules');
  if (!fs.existsSync(packagePath)) {
    throw new Error('node_modules not found. Run: npm install');
  }
  const playwrightPath = path.join(packagePath, 'playwright');
  const expressPath = path.join(packagePath, 'express');
  const yamlPath = path.join(packagePath, 'yaml');

  if (!fs.existsSync(playwrightPath)) {
    throw new Error('playwright not installed');
  }
  if (!fs.existsSync(expressPath)) {
    throw new Error('express not installed');
  }
  if (!fs.existsSync(yamlPath)) {
    throw new Error('yaml not installed');
  }

  return { success: true, message: 'All packages installed (playwright, express, yaml)' };
});

// Check 4: Config files exist
check('YAML config files exist', () => {
  const configDir = path.join(process.cwd(), 'config');
  const profilesPath = path.join(configDir, 'profiles.yml');
  const pluginsPath = path.join(configDir, 'plugins.yml');
  const referencePath = path.join(configDir, 'reference_pages.yml');

  if (!fs.existsSync(profilesPath)) {
    throw new Error('config/profiles.yml not found');
  }
  if (!fs.existsSync(pluginsPath)) {
    throw new Error('config/plugins.yml not found');
  }
  if (!fs.existsSync(referencePath)) {
    throw new Error('config/reference_pages.yml not found');
  }

  return { success: true, message: 'All config files present' };
});

// Check 5: .env.local exists
check('.env.local configuration', () => {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env.local not found');
  }

  const content = fs.readFileSync(envPath, 'utf-8');
  const hasAyrshare = content.includes('AYRSHARE_API_KEY');

  if (!hasAyrshare) {
    return { success: false, message: '.env.local exists but AYRSHARE_API_KEY not found' };
  }

  const lines = content.split('\n');
  const ayrshareKey = lines.find(l => l.startsWith('AYRSHARE_API_KEY'));

  if (ayrshareKey && ayrshareKey.includes('your_')) {
    return { success: false, message: 'AYRSHARE_API_KEY is placeholder value' };
  }

  return { success: true, message: 'AYRSHARE_API_KEY configured' };
});

// Check 6: Browser backend script exists
check('Browser backend available', () => {
  const backendPath = path.join(process.cwd(), 'browser-automation', 'browser_backend.js');
  if (!fs.existsSync(backendPath)) {
    throw new Error('browser-automation/browser_backend.js not found');
  }
  return { success: true, message: 'Backend ready to start with: npm run start:backend' };
});

// Check 7: Weekly cycle script exists
check('Weekly cycle available', () => {
  const cyclePath = path.join(process.cwd(), 'scripts', 'run_weekly_cycle.js');
  if (!fs.existsSync(cyclePath)) {
    throw new Error('scripts/run_weekly_cycle.js not found');
  }
  return { success: true, message: 'Cycle ready to run with: npm run run:cycle' };
});

// Check 8: Profiles configured
check('Profiles configured', () => {
  const profilePath = path.join(process.cwd(), 'config', 'profiles.yml');
  const yaml = require('yaml');
  const content = fs.readFileSync(profilePath, 'utf-8');
  const data = yaml.parse(content);
  const enabledProfiles = (data.profiles || []).filter(p => p.enabled !== false);

  if (enabledProfiles.length === 0) {
    return { success: false, message: 'No enabled profiles in config/profiles.yml' };
  }

  return { success: true, message: `${enabledProfiles.length} enabled profile(s) configured` };
});

// Summary
console.log(`\n\n📊 Summary\n=====================================\n`);
const passed = checks.filter(c => c.status === 'pass').length;
const warned = checks.filter(c => c.status === 'warn').length;
const failed = checks.filter(c => c.status === 'fail').length;

console.log(`✅ Passed:  ${passed}/${checks.length}`);
if (warned > 0) console.log(`⚠️  Warned:  ${warned}/${checks.length}`);
if (failed > 0) console.log(`❌ Failed:  ${failed}/${checks.length}`);

if (failed === 0 && warned === 0) {
  console.log(`\n🚀 Setup is complete! You can now run:\n`);
  console.log(`   Terminal 1: npm run start:backend`);
  console.log(`   Terminal 2: npm run run:cycle -- --dry-run\n`);
} else if (failed === 0) {
  console.log(`\n⚠️  Setup has warnings. Fix them before running:\n`);
  checks
    .filter(c => c.status === 'warn')
    .forEach(c => console.log(`   - ${c.message}`));
  console.log();
} else {
  console.log(`\n❌ Setup has errors. Fix them before running:\n`);
  checks
    .filter(c => c.status === 'fail')
    .forEach(c => console.log(`   - ${c.message}`));
  console.log();
  process.exit(1);
}
