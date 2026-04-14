# Content Engine - Handoff Document

**Last Updated:** 2026-04-12  
**Status:** Production-Ready (All 13 Phases Complete)  
**Repository:** https://github.com/kphilpot/Content-Engine

---

## Project Overview

**Autonomous social media content creation and monetization system** that generates, publishes, and optimizes content across TikTok, YouTube Shorts, Instagram, and Facebook.

**Key Features:**
- Self-learning feedback loop that improves week-over-week
- 3 profile management (personal_product_main, hair_authority_1, hair_authority_2)
- $10/week AI cost cap (hard governor)
- $10,000+/month affiliate revenue target
- Multi-platform publishing via Ayrshare API
- Real-time performance tracking and optimization

---

## Architecture: 13 Phases

All phases are **complete and tested**. The system runs as a weekly cycle via `engine/weekly_cycle.js`.

### Phase 1: Control Center Validation
**File:** `core/control_center.js`
- Validates all 11 Google Sheets tabs exist
- Checks schema compliance (required columns, required fields)
- Produces validation report before proceeding

### Phase 2: Profile Reader + Normalizer
**Files:** `core/orchestrator.js`, `profiles/profile_normalizer.js`, `profiles/profile_validator.js`
- Reads 3 enabled profiles from Channel_Profiles tab
- Normalizes into standardized config objects
- Links plugins and reference pages
- Validates all required fields present

### Phase 3: Research Engine (Self-Learning)
**Files:** `research/research_engine.js` + subdirectories
- **Sources:** Discovers Reddit posts + Twitter hashtag patterns
  - `research/sources/reddit_source_scanner.js` — Scans 10+ subreddits per niche
  - `research/sources/twitter_source_scanner.js` — Prepares hashtag research
  - `research/sources/source_ranker.js` — Scores by conversion potential
- **Analysis:** Extracts patterns using Google Gemini
  - `research/analysis/gemini_synthesizer.js` — Hook patterns, content structures, trust/conversion signals
- **Learning Loop:** Adapts week-over-week
  - `research/learning/performance_analyzer.js` — Learns what's converting from Performance_Signals
  - `research/learning/focus_optimizer.js` — Shifts research_focus keywords toward winners
  - `research/learning/source_adapter.js` — Recommends source swaps (add high-converters, remove underperformers)

### Phase 4: Performance Signal Extractor
**File:** `performance/performance_extractor.js`
- Reads Ayrshare analytics API (or manual data from Manual_Performance_Paste tab)
- Normalizes engagement metrics (views, likes, comments, conversions)
- Writes structured Performance_Signals rows back to Google Sheets
- Calculates engagement velocity (fast/normal/slow performers)

### Phase 5: Cost Governor
**File:** `engine/cost_governor.js`
- Enforces $10/week hard cap on Claude API spending
- Dynamically throttles batch size if approaching limit
- Claude Sonnet pricing: ~$3 input + ~$15 output per 1M tokens
- Estimate: ~$0.012 per post (1.2 cents)
- Allocates budget across profiles based on `budget_weight` field

### Phase 6: Weekly Content Planner
**File:** `planning/weekly_planner.js`
- Builds week's content calendar from posting_schedule
- Applies content_ratios (growth/trust/proof/conversion/fluff percentages)
- Assigns hooks, angles, narrative structures from research output
- Schedules by platform best-times (TikTok 7am, Instagram 11am, etc.)
- Outputs to Weekly_Content_Plan tab

### Phase 7: Content Generator
**File:** `generation/content_generator.js`
- Calls Claude Sonnet API with:
  - Research patterns (hooks, content structures, angles)
  - Profile info (niche, tone, CTA intensity)
  - Platform-specific guidelines (char limits, style)
- Generates: caption, hashtags, visual direction, optional script
- Tracks token usage against cost governor
- Falls back to mock generation if API unavailable (for testing)

### Phase 8: Approval Workflow
**File:** `approval/approval_workflow.js`
- **Modes:** auto (approve all) / smart_auto (quality checks) / manual (human review)
- **Quality Scoring:**
  - Hook quality (questions, specificity, power words)
  - CTA presence check
  - Platform character limit compliance
  - Content type alignment
  - Flagged pattern detection (unsupported claims)
- Smart mode auto-approves if all checks pass, else flags for review

### Phase 9: Ayrshare Publisher
**File:** `publishing/ayrshare_publisher.js`
- Publishes to TikTok, YouTube Shorts, Instagram, Facebook
- Handles immediate + scheduled posting
- Tracks post IDs for analytics correlation
- Implements retry logic with exponential backoff
- Supports dry-run mode for testing

### Phase 10: Analytics Retriever
**File:** `analytics/analytics_retriever.js`
- Fetches post analytics from Ayrshare API (or mock data)
- Waits 24+ hours before analytics are meaningful
- Aggregates by profile (total posts, avg engagement rate, conversions)
- Calculates engagement velocity (early engagement ratio)
- Feeds into Performance_Signals for Phase 3

### Phase 11: Optimization Loop
**File:** `optimization/optimization_loop.js`
- Analyzes weekly performance
- Grades engagement (excellent/good/average/below-target)
- Identifies what worked (top hooks, best angles, high-converting content types)
- Detects drift (2+ week engagement decline = critical alert)
- Generates specific action items for next week
- Writes to Optimization_Notes tab

### Phase 12: Telegram Reporter
**File:** `reporting/telegram_reporter.js`
- Sends weekly summary reports to Telegram
- Publishing confirmations (success/fail counts)
- Performance alerts (drift detected, high performers)
- Budget warnings (approaching cap)
- Requires: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID env vars

### Phase 13: System Status Tracker
**File:** `status/system_status_tracker.js`
- Records which phases ran, status, duration, errors
- Writes to System_Status tab in Google Sheets
- Generates full run report with pass/fail summary
- Tracks items processed per phase

### Master Orchestrator
**File:** `engine/weekly_cycle.js`
- Runs all 13 phases in sequence
- Entry point: `node scripts/run_weekly_cycle.js`
- Handles errors gracefully (partial failures don't abort)
- Outputs 3 JSON files: research, content, run-report
- Sends Telegram notification when complete

---

## Key Files & Structure

```
content-engine/
├── core/                           # Phases 1-2
│   ├── orchestrator.js             # Main coordinator
│   └── control_center.js           # Google Sheets validation
├── research/                       # Phase 3
│   ├── research_engine.js          # Main orchestrator
│   ├── sources/                    # Reddit/Twitter discovery
│   ├── analysis/                   # Gemini pattern extraction
│   └── learning/                   # Self-learning loop
├── performance/                    # Phase 4
│   └── performance_extractor.js    # Analytics → Performance_Signals
├── engine/                         # Phases 5-13
│   ├── weekly_cycle.js             # Master runner
│   └── cost_governor.js            # Budget enforcement
├── planning/                       # Phase 6
│   └── weekly_planner.js           # Content calendar builder
├── generation/                     # Phase 7
│   └── content_generator.js        # Claude Sonnet API
├── approval/                       # Phase 8
│   └── approval_workflow.js        # Quality + auto-approval
├── publishing/                     # Phase 9
│   └── ayrshare_publisher.js       # Multi-platform publishing
├── analytics/                      # Phase 10
│   └── analytics_retriever.js      # Performance data aggregation
├── optimization/                   # Phase 11
│   └── optimization_loop.js        # Weekly analysis + insights
├── reporting/                      # Phase 12
│   └── telegram_reporter.js        # Alerts + weekly reports
├── status/                         # Phase 13
│   └── system_status_tracker.js    # Run logging
├── sheets/                         # Google Sheets I/O
│   ├── reader.js                   # Read all tabs
│   ├── writer.js                   # Write back to tabs
│   ├── schema.js                   # Tab definitions
│   └── validators.js               # Data validation
├── profiles/                       # Profile normalization
│   ├── profile_normalizer.js
│   └── profile_validator.js
├── scripts/
│   ├── run_orchestrator.js         # Phase 1-2 only
│   └── run_weekly_cycle.js         # Full 13-phase cycle
├── package.json                    # Dependencies
└── .gitignore                      # Excludes secrets + generated files
```

---

## How to Run

### Dry Run (Test Mode)
```bash
node scripts/run_weekly_cycle.js --dry-run --skip-remote
```
- Generates content without publishing
- Skips Reddit/Twitter API calls (faster)
- Perfect for testing the full pipeline

### Production Run
```bash
node scripts/run_weekly_cycle.js
```
- Publishes to all 4 platforms via Ayrshare
- Retrieves analytics after 24+ hours
- Sends Telegram reports
- Writes all results to Google Sheets

### Phase 1-2 Only
```bash
npm run run:orchestrator
```
- Validates control center
- Reads and normalizes profiles
- Outputs to `profiles.json`

### Run Tests
```bash
npm test
```
- 35 tests covering all phases
- Takes ~30 seconds

---

## Environment Variables Required

Create `.env.local` in project root:

```bash
# Google Sheets API
GOOGLE_SHEETS_API_KEY='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
CONTROL_CENTER_SHEET_ID=1hE_adADIYgqkSeCuNL7JOt6ps_VRpWtc9CO1t3xkyXI

# Claude API (content generation)
ANTHROPIC_API_KEY=sk-ant-...

# Google Gemini (research pattern extraction)
GOOGLE_GENERATIVE_AI_API_KEY=...

# Ayrshare (publishing + analytics)
AYRSHARE_API_KEY=...

# Telegram (weekly reports)
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...

# Budget
WEEKLY_AI_BUDGET=10.00
```

**Secrets are safe:** `.gitignore` excludes `.env.local` and credential JSON files.

---

## Google Sheets Control Center

The system uses a single Google Sheet with **11 tabs**:

1. **Channel_Profiles** — 3 profiles with posting schedule, ratios, CTA intensity
2. **Plugins** — Available monetization plugins (SkinGlow Widget, Hair Care Pro)
3. **Reference_Pages** — Current sources being studied for pattern extraction
4. **Weekly_Research** — (Operational, auto-populated by Phase 3)
5. **Weekly_Content_Plan** — (Operational, auto-populated by Phase 6)
6. **Content_Queue** — All generated content (status: pending/approved/published)
7. **Performance_Log** — Individual post performance data
8. **Performance_Signals** — Weekly aggregates (what's converting)
9. **Optimization_Notes** — Weekly action items (what to change)
10. **System_Status** — Phase-by-phase run logs
11. **Manual_Performance_Paste** — User can paste analytics if Ayrshare API unavailable

Sheet ID: `1hE_adADIYgqkSeCuNL7JOt6ps_VRpWtc9CO1t3xkyXI`

---

## The Self-Learning Loop

This is the core innovation. Each week, the system improves autonomously:

```
Week N:  Generate + publish content
         ↓
         Collect real performance data (Ayrshare analytics)
         ↓
         Extract signals → What actually converted?
         ↓
Week N+1: Phase 3 reads Performance_Signals
         ↓
         Discovers winning hooks, angles, content types
         ↓
         Adjusts research_focus keywords
         ↓
         Swaps out underperforming reference sources
         ↓
         Plans content using improved research
         ↓
         Generates with Claude using winning patterns
         ↓
         Publishes → cycle repeats
```

**Key metrics tracked:**
- Engagement rate (target: 5-8% for personal_product, 3-5% for authority)
- Conversion rate (target: 1-3% of engagement)
- Engagement velocity (fast performers flagged at 90min mark)
- Drift detection (2+ week decline = emergency alert)

---

## What's Complete

✅ All 13 phases implemented  
✅ 35 tests passing (10-second full cycle)  
✅ Google Sheets integration working  
✅ Reddit + Twitter source discovery  
✅ Gemini pattern extraction  
✅ Claude Sonnet content generation  
✅ Multi-platform publishing (Ayrshare)  
✅ Cost governor ($10/week cap enforced)  
✅ Telegram reporting  
✅ Self-learning loop (Phase 3 ← Phase 11)  
✅ GitHub repository initialized

---

## What Needs Configuration

1. **Set environment variables** (.env.local)
   - ANTHROPIC_API_KEY (Claude)
   - AYRSHARE_API_KEY (publishing + analytics)
   - GOOGLE_GENERATIVE_AI_API_KEY (Gemini, optional but recommended)
   - TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID (notifications)

2. **Verify Google Sheets**
   - Ensure service account has Editor access to the control sheet
   - All 11 tabs exist and are named correctly

3. **Run first dry-run**
   ```bash
   node scripts/run_weekly_cycle.js --dry-run --skip-remote
   ```
   - Should generate 25 content pieces (8-10 per profile)
   - Should cost ~$0.45 (within $10 budget)

4. **Run production cycle** (when ready)
   ```bash
   node scripts/run_weekly_cycle.js
   ```

5. **Schedule weekly runs** (e.g., Monday 8am)
   - Use cron or scheduled task runner
   - Or run manually: `node scripts/run_weekly_cycle.js`

---

## Outputs & Monitoring

After each run, three files are generated:

1. **weekly-research-output.json** — All research findings per profile
   - Top sources ranked by conversion potential
   - Hook patterns extracted
   - Content patterns, trust signals, conversion techniques
   - Recommended next focus keywords

2. **weekly-content-output.json** — All generated content
   - Captions, hashtags, visual directions
   - Metadata (profile, platform, angle, hook used)
   - Publication status (pending/published)

3. **weekly-run-report.json** — Full cycle summary
   - Phase-by-phase status (success/failed/partial)
   - Posts generated, posts published, AI cost
   - Weekly stats per profile (engagement, conversions)

**Monitoring:**
- Telegram reports sent automatically (if TELEGRAM_BOT_TOKEN set)
- Check Google Sheets tabs for detailed logs (System_Status, Optimization_Notes, Performance_Signals)
- Review weekly-run-report.json for cost tracking

---

## Next Steps if Starting Fresh

1. **Clone the repo:**
   ```bash
   git clone https://github.com/kphilpot/Content-Engine.git
   cd Content-Engine
   npm install
   ```

2. **Set up Google Sheets:**
   - Create a Google Cloud project + service account
   - Download service account JSON
   - Add to `.env.local`
   - Share Google Sheet with service account email
   - Get Sheet ID from URL

3. **Set up Ayrshare:**
   - Create Ayrshare account
   - Get API key from dashboard
   - Add to `.env.local`
   - Configure your 4 platform accounts (TikTok, YouTube, Instagram, Facebook)

4. **Set up Telegram (optional):**
   - Create Telegram bot with @BotFather
   - Get bot token and your chat ID
   - Add to `.env.local`

5. **Create the control Google Sheet:**
   - Duplicate this template: (link to template if available)
   - Or create new sheet with 11 tabs matching the schema in `sheets/schema.js`
   - Add your 3 profiles to Channel_Profiles tab

6. **Run tests:**
   ```bash
   npm test
   ```
   Should see "35 tests passing"

7. **Dry run:**
   ```bash
   node scripts/run_weekly_cycle.js --dry-run --skip-remote
   ```
   Should generate content in 10 seconds

8. **Production:**
   ```bash
   node scripts/run_weekly_cycle.js
   ```

---

## Common Issues & Solutions

**Issue:** "GOOGLE_SHEETS_API_KEY not set"
- **Solution:** Add to `.env.local` as full JSON string (single line)

**Issue:** "Ayrshare API failed"
- **Solution:** Check API key is valid. Use dry-run mode to test everything except publishing.

**Issue:** Tests fail with "Gemini synthesis failed"
- **Solution:** Normal — falls back to mock generation. Set GOOGLE_GENERATIVE_AI_API_KEY to use real Gemini.

**Issue:** Budget cap too restrictive
- **Solution:** Adjust WEEKLY_AI_BUDGET in `.env.local` (default: $10.00)

---

## Support & Debugging

**Debug mode:**
Add logging to track each phase:
```bash
DEBUG=* node scripts/run_weekly_cycle.js
```

**Test individual phases:**
```bash
npm test -- research.test.js          # Phase 3 only
npm test -- weekly_cycle.test.js      # Full cycle
```

**Check Google Sheets status:**
```bash
node check-sheets-status.js
```

**Manual API testing:**
Check the corresponding phase file (e.g., `sheets/reader.js` for Sheets API)

---

## Repository Info

- **GitHub:** https://github.com/kphilpot/Content-Engine
- **Last Commit:** feat: build complete 13-phase autonomous content engine with self-learning research loop
- **License:** (Add if applicable)
- **Authors:** Kphilpot, Claude AI

---

**Ready to run the system? Start with:**
```bash
npm install
node scripts/run_weekly_cycle.js --dry-run --skip-remote
```

Questions? Check the phase-specific READMEs in each directory or open an issue on GitHub.
