# Content Engine v2 - Setup Guide
## Browser Automation Architecture

Welcome! This guide walks you through setting up the Content Engine to use browser automation (free, using your existing subscriptions) instead of API costs.

---

## Architecture Overview

```
Your Machine:
┌─────────────────────────────────────────────────────┐
│                                                       │
│  ┌──────────────────────────────────────────┐       │
│  │  Browser Automation Backend (Node.js)    │       │
│  │  - Runs Playwright browser sessions      │       │
│  │  - Navigates Claude.ai, Gemini.ai        │       │
│  │  - Exposes /generate and /synthesize     │       │
│  │  PORT: 3000                              │       │
│  └──────────────────────────────────────────┘       │
│           ↑                          ↑               │
│           │                          │               │
│  ┌────────┴──────────────────────────┴───┐          │
│  │   Content Engine Weekly Cycle          │          │
│  │   - Phase 3: Research (calls /synth)  │          │
│  │   - Phase 7: Generation (calls /gen)  │          │
│  │   - Reads config from YAML files       │          │
│  │   - Publishes via Ayrshare            │          │
│  └────────┬──────────────────────────┬───┘          │
│           │                          │               │
│           ↓                          ↓               │
│     [Claude.ai]              [Gemini.ai]            │
│     (Your Browser)           (Your Browser)         │
│     (Your Subscription)      (Your Subscription)    │
│                                                      │
└─────────────────────────────────────────────────────┘
                           ↓
                      [Ayrshare API]
                           ↓
       ┌──────────────┬──────────────┬──────────┐
       ↓              ↓              ↓          ↓
    TikTok        Instagram       YouTube      Facebook
```

**Cost**: $0/week (uses your existing subscriptions)
**Requirements**: Claude.ai + Gemini.ai access, Ayrshare API key for publishing

---

## Step 1: Prerequisites

### You need these subscriptions (you probably already have them):
- ✅ **Claude Pro** ($20/month) — for Claude.ai access
- ✅ **Gemini Advanced** (optional, ~$20/month) — for research synthesis
- ✅ **Ayrshare** (free tier) — for publishing to 4 platforms

### You need these tools installed:
```bash
# Check Node.js is installed
node --version  # Should be 20+

# Check npm is installed  
npm --version   # Should be 10+
```

If not installed, get them from: https://nodejs.org/

---

## Step 2: Install Dependencies

```bash
cd "C:\Users\user\Personal_Workspace\02_Projects\Content Engine- Codex Built"

# Install all required packages
npm install

# This installs:
# - playwright (for browser automation)
# - express (for backend server)
# - yaml (for config files)
```

**Expected output**: `added 87 packages, 0 vulnerabilities`

---

## Step 3: Configure Ayrshare (Required for Publishing)

1. **Create Ayrshare account** (free)
   - Go to: https://www.ayrshare.com/
   - Sign up for free account
   - Confirm email

2. **Get your API key**
   - Log in to Ayrshare dashboard
   - Go to: Settings → API Keys
   - Copy your API key

3. **Add API key to `.env.local`**
   ```
   AYRSHARE_API_KEY=your_actual_api_key_here
   ```

4. **Connect social platforms** (in Ayrshare dashboard)
   - TikTok → Authorize
   - Instagram → Authorize
   - YouTube → Authorize
   - Facebook → Authorize
   
   (Ayrshare will guide you through OAuth for each)

---

## Step 4: Configure Your Profiles

Edit `config/profiles.yml` to add your profiles:

```yaml
profiles:
  - profile_id: my_first_channel
    channel_name: My Hair Channel
    niche: hair
    active_platforms:
      - tiktok
      - instagram
      - youtube
      - facebook
    posting_frequency:
      tiktok: 5        # 5 posts/week
      instagram: 4
      youtube: 5
      facebook: 4
    # ... rest of config
```

**What to customize:**
- `profile_id`: Unique identifier (no spaces)
- `channel_name`: Your channel name
- `niche`: Your content niche
- `active_platforms`: Which platforms to post to
- `posting_frequency`: Posts per week for each platform
- `content_ratios`: Distribution of content types (growth, trust, proof, conversion, fluff)
- `active_product_url`: Your product or affiliate URL
- `tone`: How your channel sounds (warm, bold, friendly, etc.)

---

## Step 5: Add Reference Pages (Optional but Recommended)

Reference pages are examples the system learns from. Edit `config/reference_pages.yml`:

```yaml
reference_pages:
  - reference_id: ref_competitor_1
    profile_id: my_first_channel
    reference_name: Competitor Hair Channel
    reference_type: social_account
    reference_url: https://tiktok.com/@successful_channel
    why_it_matters: Learn their hook patterns and engagement
    enabled: true
```

**Types of references:**
- `social_account` — TikTok, Instagram, YouTube accounts to learn from
- `article_url` — Blog posts, case studies
- `google_doc` — Your own playbook/notes (requires public sharing)

The system will analyze these pages to extract patterns for your content.

---

## Step 6: Start the System (Two Terminals)

### Terminal 1: Start Browser Backend

```bash
cd "C:\Users\user\Personal_Workspace\02_Projects\Content Engine- Codex Built"

npm run start:backend
```

**Expected output:**
```
🤖 Browser Automation Backend Ready
   Server: http://localhost:3000
   /generate - POST Claude.ai content generation
   /synthesize - POST Gemini.ai research synthesis
   /health - GET server health
   /stats - GET session statistics

   Waiting for requests...
```

✅ Leave this running in the background

---

### Terminal 2: Run the Weekly Cycle

```bash
cd "C:\Users\user\Personal_Workspace\02_Projects\Content Engine- Codex Built"

# Test run (no publishing, uses mock data)
npm run run:cycle -- --dry-run --skip-remote

# This will:
# 1. Load your profiles from YAML
# 2. Research trends (Reddit/Twitter + Gemini synthesis)
# 3. Plan content for the week
# 4. Generate captions/hooks/visuals with Claude
# 5. Output JSON files (don't publish yet)
```

**Expected output:**
```
Starting Content Engine Weekly Cycle
Sheet ID: (using YAML config)
Options: { dryRun: true, skipRemote: true }

[Phase 1-2] Loading profiles from YAML ✓
[Phase 3] Running research engine...
[Phase 6] Creating weekly plan...
[Phase 7] Generating content (14 pieces)...
✅ Weekly cycle complete!
   Run ID: 2026-04-13-1
   Posts generated: 14
   Posts published: 0 (dry-run mode)
   AI Cost: $0.00 (browser automation, no API costs)

Outputs saved:
   weekly-research-output.json
   weekly-content-output.json
   weekly-run-report.json
```

---

## Step 7: Review Generated Content

After the dry-run, check the generated content:

```bash
# View what was generated
cat weekly-content-output.json | more
```

**Sample output structure:**
```json
{
  "profile_id": "my_first_channel",
  "items": [
    {
      "platform": "tiktok",
      "hook": "Did you know your hair care routine is backwards?",
      "caption": "...",
      "hashtags": ["#hair", "#haircare"],
      "visual_direction": "Before/after split screen",
      "status": "generated"
    }
  ]
}
```

---

## Step 8: Publish to Social Platforms

Once you're happy with the content:

```bash
# Real run (will publish to platforms)
npm run run:cycle

# This will:
# 1-7: Same as dry-run
# 8: Approve content
# 9: Publish via Ayrshare to all connected platforms
# 10: Wait 24 hours for analytics
# 11: Generate optimization report
```

**Ayrshare will schedule posts** at optimal times you configured.

---

## Step 9: Schedule Weekly Runs

### Option A: Windows Task Scheduler

1. Open: Task Scheduler
2. Create New Task
3. Trigger: Weekly, Sunday 8:00 AM
4. Action:
   ```
   Program: C:\Program Files\nodejs\node.exe
   Arguments: "C:\Users\user\Personal_Workspace\02_Projects\Content Engine- Codex Built\scripts\run_weekly_cycle.js"
   ```

### Option B: Manual Cron (Linux/Mac)

```bash
# Edit crontab
crontab -e

# Add this line (every Sunday at 8 AM):
0 8 * * 0 cd /path/to/Content-Engine && npm run run:cycle
```

### Option C: Manual

Just run `npm run run:cycle` every Sunday

---

## Troubleshooting

### "Browser backend not running"
```bash
# Make sure you have Terminal 1 open running:
npm run start:backend

# Check it's working:
curl http://localhost:3000/health
```

### "YAML config not found"
```bash
# Make sure these files exist:
ls config/profiles.yml
ls config/plugins.yml
ls config/reference_pages.yml

# They should be in the root directory
```

### "Ayrshare API key invalid"
```bash
# Check .env.local has your real key:
cat .env.local | grep AYRSHARE

# Get new key from: https://www.ayrshare.com/settings/api
```

### "Claude.ai navigation timeout"
This usually means:
- You're not logged into Claude.ai in your browser
- Claude.ai interface changed (rare but happens)
- Browser session crashed

**Solution**: Restart the backend (Ctrl+C and `npm run start:backend` again)

---

## What Happens Each Week

**Sunday 8:00 AM** (if using scheduler):

1. **Research** (10-15 min)
   - Scans Reddit for trending posts in your niche
   - Extracts patterns: hooks, content types, engagement triggers
   - Uses Gemini to synthesize patterns from reference pages

2. **Planning** (5 min)
   - Creates week's content calendar
   - Assigns content types based on ratios (growth/trust/proof/conversion/fluff)
   - Schedules by platform best times

3. **Generation** (20-30 min)
   - Uses Claude.ai to generate captions, hooks, hashtags
   - Creates visual directions
   - Generates optional video scripts
   - **No API costs** — uses your Claude Pro subscription

4. **Approval** (5 min if auto-approval enabled)
   - Quality checks (hook quality, CTA presence, length limits)
   - Auto-approves or flags for manual review

5. **Publishing** (varies)
   - Ayrshare publishes to TikTok, Instagram, YouTube, Facebook
   - Schedules posts at optimal times

6. **Optimization** (5 min)
   - Waits 24-48 hours for engagement data
   - Analyzes what worked best
   - Adjusts next week's strategy

7. **Reporting** (instant if Telegram enabled)
   - Sends weekly summary to Telegram
   - Shows posts published, engagement, next actions

---

## Key Files

```
Content Engine/
├── config/
│   ├── profiles.yml           ← YOUR PROFILES (edit this!)
│   ├── plugins.yml            ← Monetization plugins
│   └── reference_pages.yml    ← Learning sources
│
├── browser-automation/
│   ├── browser_backend.js     ← Express server (port 3000)
│   ├── session_manager.js     ← Browser session pooling
│   ├── claude_ai_bot.js       ← Claude.ai automation
│   └── gemini_bot.js          ← Gemini.ai automation
│
├── engine/
│   └── weekly_cycle.js        ← Main orchestrator
│
├── generation/
│   └── content_generator.js   ← Phase 7 (calls browser API)
│
├── research/
│   └── analysis/
│       └── gemini_synthesizer.js ← Phase 3 (calls browser API)
│
└── .env.local                 ← Configuration (Ayrshare key, etc.)
```

---

## Next Steps

1. ✅ Install dependencies (`npm install`)
2. ✅ Add Ayrshare API key to `.env.local`
3. ✅ Customize `config/profiles.yml` with your channels
4. ✅ Add reference pages to `config/reference_pages.yml`
5. ✅ Run `npm run start:backend` in Terminal 1
6. ✅ Run `npm run run:cycle -- --dry-run` in Terminal 2
7. ✅ Review `weekly-content-output.json`
8. ✅ Run `npm run run:cycle` to publish for real
9. ✅ Set up scheduler for weekly runs

---

## Support

If something breaks:

1. **Check browser backend is running**
   ```bash
   curl http://localhost:3000/health
   ```

2. **Check config files exist**
   ```bash
   ls -la config/
   ```

3. **Check API key is valid**
   ```bash
   cat .env.local | grep AYRSHARE
   ```

4. **Check logs**
   - Browser backend logs in Terminal 1
   - Cycle logs in Terminal 2
   - Check `weekly-run-report.json` for detailed output

5. **Restart everything**
   - Press Ctrl+C on both terminals
   - Run `npm run start:backend` again
   - Run `npm run run:cycle` again

Happy content creating! 🎬
