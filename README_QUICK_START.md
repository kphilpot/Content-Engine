# Content Engine v2 - Quick Start (5 minutes)

## What You're Getting

A **zero-cost** content engine that:
- ✅ Generates content using Claude.ai (your subscription)
- ✅ Researches trends using Gemini.ai (your subscription)
- ✅ Publishes to TikTok, Instagram, YouTube, Facebook (Ayrshare)
- ✅ Learns from performance and improves each week
- ✅ **Costs $0/week** in AI fees (vs $10/week for APIs)

---

## 3 Things You Need

1. **Ayrshare API key** (free tier works) — [Get here](https://www.ayrshare.com/)
2. **Claude.ai access** (already have Claude Pro? You're set)
3. **Gemini.ai access** (optional, for research synthesis)

---

## 4-Step Setup

### Step 1: Add your Ayrshare API key

Edit `.env.local`:
```
AYRSHARE_API_KEY=paste_your_actual_key_here
```

### Step 2: Edit your profiles

Edit `config/profiles.yml` with your channels:
```yaml
profiles:
  - profile_id: my_channel
    channel_name: My Channel
    niche: hair
    active_platforms: [tiktok, instagram, youtube, facebook]
    posting_frequency:
      tiktok: 5
      instagram: 4
      youtube: 5
      facebook: 4
```

### Step 3: Validate setup

```bash
npm run validate
```

**Expected:**
```
✅ Passed: 7/8
⚠️  AYRSHARE_API_KEY is set (just checking it's not placeholder)
```

### Step 4: Run it!

**Terminal 1** (leave open):
```bash
npm run start:backend
```

**Terminal 2** (in another terminal):
```bash
npm run run:cycle -- --dry-run --skip-remote
```

---

## What Happens

```
1. Loads your profiles from YAML config
2. Researches trends (Reddit + AI synthesis)
3. Plans content for the week
4. Generates captions with Claude.ai
5. Outputs: weekly-content-output.json
6. Shows cost: $0.00 (browser automation, no APIs)
```

**See results:**
```bash
cat weekly-content-output.json
```

---

## Go Live

When you're ready to actually post:

```bash
npm run run:cycle
```

This will:
1. Do everything above
2. Approve content automatically
3. Publish via Ayrshare to all platforms
4. Track engagement
5. Optimize next week's strategy

---

## Schedule Weekly Runs

### Windows Task Scheduler:
1. Open Task Scheduler
2. Create task for Sunday 8 AM
3. Run: `node "C:\path\to\run_weekly_cycle.js"`

### Mac/Linux cron:
```bash
crontab -e
# Add: 0 8 * * 0 cd ~/Content-Engine && npm run run:cycle
```

### Manual:
Just run `npm run run:cycle` each Sunday

---

## File Structure

```
├── config/
│   ├── profiles.yml          ← YOUR CHANNELS (edit!)
│   ├── plugins.yml           ← Monetization options
│   └── reference_pages.yml   ← Learning examples
├── browser-automation/
│   ├── browser_backend.js    ← Runs in Terminal 1
│   ├── claude_ai_bot.js      ← Navigates Claude
│   └── gemini_bot.js         ← Navigates Gemini
├── engine/
│   └── weekly_cycle.js       ← Main orchestrator
├── .env.local                ← Put your API keys here
└── scripts/
    ├── run_weekly_cycle.js   ← The main script
    └── validate_setup.js     ← Check everything works
```

---

## Troubleshooting

### "Browser backend not running"
```bash
# Terminal 1 needs to stay open:
npm run start:backend
```

### "AYRSHARE_API_KEY not found"
```bash
# Add to .env.local:
AYRSHARE_API_KEY=your_actual_key
```

### "Profiles not loading"
```bash
# Check config exists:
ls config/profiles.yml

# Validate YAML syntax:
npm run validate
```

### "Timeout waiting for Claude response"
This means:
- Browser session crashed (normal after many generations)
- Claude.ai interface changed (rare)

**Fix**: Restart backend in Terminal 1

---

## Next: Deep Customization

Once it's running, customize:

1. **Content ratios** — How much growth vs trust vs conversion
2. **Reference pages** — Which creators to learn from
3. **Plugins** — Add quiz/affiliate/landing page CTAs
4. **Tone** — Brand voice settings
5. **Visual themes** — Content rotation patterns

See `SETUP_GUIDE.md` for full details.

---

## What Runs Each Week

**Sunday 8 AM:**

```
Research (15 min) 
  → Finds trending Reddit posts
  → Extracts patterns via Gemini
  → Learns from your reference pages

Content Plan (5 min)
  → Creates weekly calendar
  → Assigns content types
  → Schedules by platform best times

Generation (20 min)
  → Generates captions with Claude
  → Creates hashtags
  → Plans visual directions

Approval (auto)
  → Quality checks pass/fail

Publishing (on schedule)
  → Posts to all 4 platforms
  → Tracks engagement

Optimization (daily)
  → Learns what worked
  → Adjusts next week's strategy
```

---

## Support

1. Check `SETUP_GUIDE.md` for detailed instructions
2. Run `npm run validate` to check everything
3. Check `weekly-run-report.json` for detailed logs
4. Look in browser backend terminal (Terminal 1) for errors

---

## Cost Comparison

| Method | Cost/Week | Setup | Learning |
|--------|-----------|-------|----------|
| **Browser Automation** (you're here) | $0 | 5 min | Easy |
| Claude API | $5-7 | 10 min | Easy |
| Ayrshare alone | $0-29 | 10 min | Hard |
| Full manual | N/A | Hours | Hard |

**You're saving ~$250-350/year** vs API approach! 🎉

---

## You're All Set!

```bash
# Final checklist:
✅ npm install (done)
✅ .env.local configured
✅ config/profiles.yml customized
✅ npm run validate passes
✅ npm run start:backend running (Terminal 1)
✅ npm run run:cycle working (Terminal 2)

Next: npm run run:cycle (for real this time!)
```

Questions? Check SETUP_GUIDE.md or run `npm run validate` 🚀
