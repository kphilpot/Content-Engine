# Content Engine v2 - Architecture Documentation

## System Overview

The Content Engine is a multi-phase autonomous content creation system designed to generate, publish, and optimize social media content across 4 platforms using browser automation for cost-free AI operations.

**Architecture Type**: Modular pipeline with feedback loop
**Cost Model**: Zero API costs (uses browser automation of existing subscriptions)
**Deployment**: Local (single machine) or server-based
**Scalability**: Supports 1-10+ profiles, 40+ posts per week

---

## Phase Architecture (13 Phases)

```
┌─────────────────────────────────────────────────────────────┐
│                    WEEKLY CYCLE RUNNER                       │
│                  (engine/weekly_cycle.js)                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────────────────────────┐
        │  Phase 1-2: Control Center            │
        │  ├─ Read YAML config files            │
        │  ├─ Validate schema                   │
        │  └─ Normalize profile objects         │
        └───────────────────────────────────────┘
                            ↓
        ┌───────────────────────────────────────┐
        │  Phase 3: Research Engine             │
        │  ├─ Reddit post discovery             │
        │  ├─ Twitter trend analysis            │
        │  ├─ Reference page fetching           │
        │  ├─ Gemini synthesis (→ browser API)  │
        │  └─ Learning loop from Performance    │
        └───────────────────────────────────────┘
                            ↓
        ┌───────────────────────────────────────┐
        │  Phase 4: Performance Signals         │
        │  ├─ Analyze previous week's metrics   │
        │  ├─ Identify top hooks & content      │
        │  ├─ Detect engagement decline        │
        │  └─ Score conversion patterns        │
        └───────────────────────────────────────┘
                            ↓
        ┌───────────────────────────────────────┐
        │  Phase 5: Cost Governor               │
        │  ├─ Project token budget              │
        │  ├─ Enforce $0 budget (no API cost)   │
        │  └─ Throttle if needed               │
        └───────────────────────────────────────┘
                            ↓
        ┌───────────────────────────────────────┐
        │  Phase 6: Weekly Content Planner      │
        │  ├─ Build week's calendar             │
        │  ├─ Assign content types by ratio     │
        │  ├─ Enforce media variety rotation    │
        │  └─ Schedule by platform best times   │
        └───────────────────────────────────────┘
                            ↓
        ┌───────────────────────────────────────┐
        │  Phase 7: Content Generator           │
        │  ├─ Build generation prompts          │
        │  ├─ Call browser API → Claude.ai      │
        │  ├─ Parse hook + caption + script     │
        │  └─ Enforce platform limits           │
        └───────────────────────────────────────┘
                            ↓
        ┌───────────────────────────────────────┐
        │  Phase 8: Approval Workflow           │
        │  ├─ Quality scoring (hook, CTA, etc)  │
        │  ├─ Auto-approve or flag for review   │
        │  └─ Smart approval based on signals   │
        └───────────────────────────────────────┘
                            ↓
        ┌───────────────────────────────────────┐
        │  Phase 9: Publishing Engine           │
        │  ├─ Call Ayrshare API                 │
        │  ├─ Post to TikTok, Instagram, etc.   │
        │  ├─ Store post IDs for tracking       │
        │  └─ Handle failures with retry logic  │
        └───────────────────────────────────────┘
                            ↓
        ┌───────────────────────────────────────┐
        │  Phase 10: Analytics Retrieval        │
        │  ├─ Wait 24+ hours for data           │
        │  ├─ Pull views, likes, comments       │
        │  ├─ Calculate engagement rates        │
        │  └─ Flag fast/slow performers         │
        └───────────────────────────────────────┘
                            ↓
        ┌───────────────────────────────────────┐
        │  Phase 11: Optimization Loop          │
        │  ├─ Grade engagement (excellent/good) │
        │  ├─ Identify winning patterns         │
        │  ├─ Detect drift (2+ week decline)    │
        │  ├─ Generate action items             │
        │  └─ Feed back to Phase 3 research     │
        └───────────────────────────────────────┘
                            ↓
        ┌───────────────────────────────────────┐
        │  Phase 12: Telegram Reporting         │
        │  ├─ Weekly summary to Telegram        │
        │  ├─ Post confirmations                │
        │  ├─ Performance alerts                │
        │  └─ Drift warnings                    │
        └───────────────────────────────────────┘
                            ↓
        ┌───────────────────────────────────────┐
        │  Phase 13: System Status              │
        │  ├─ Log phase results                 │
        │  ├─ Track processing times            │
        │  ├─ Record errors & retries           │
        │  └─ Generate run report               │
        └───────────────────────────────────────┘
```

---

## Browser Automation Backend

The heart of the zero-cost approach. Instead of calling APIs, the system navigates web interfaces.

```
┌─────────────────────────────────────────┐
│    Browser Automation Backend            │
│    (Node.js + Express + Playwright)      │
│    PORT: 3000                            │
└─────────────────────────────────────────┘
           ↑                   ↑
           │                   │
    /generate          /synthesize
       (POST)             (POST)
           ↑                   ↑
           │                   │
    ┌──────┴──────┐    ┌───────┴──────┐
    │ Claude.ai   │    │   Gemini.ai   │
    │ (Your       │    │   (Your       │
    │  subscription) │    │  subscription)│
    └──────┬──────┘    └───────┬──────┘
           │                   │
           └─────→ [Result]←───┘
```

### Session Management

The backend pools browser sessions to avoid constant startup overhead:

```
Request 1: /generate
  ├─ Check session pool
  ├─ If idle session exists → reuse
  └─ If not → create new (Chromium)

Request 2: /generate (30 seconds later)
  ├─ Session from Request 1 is released
  ├─ Request 2 reuses it
  └─ Login state persisted

Request 3: /synthesize (different service)
  ├─ Gemini pool (separate from Claude)
  └─ New browser session started

Cleanup:
  └─ All sessions closed on server shutdown
```

---

## Configuration System

### Before (API-based)
```
Google Sheets API
    ↓
11 tabs (profiles, plugins, research, plans, queue, etc.)
    ↓
Read into objects
    ↓
Generate content
```

### After (Browser Automation)
```
Local YAML Files (simpler!)
├── config/profiles.yml
├── config/plugins.yml
└── config/reference_pages.yml
    ↓
Read into objects (same format)
    ↓
Generate content (same pipeline)
```

**Benefits:**
- No authentication needed
- Instant reads (no network delays)
- Version control friendly
- Local editing
- No API quota limits

---

## Data Flow

### Input Sources

```
YAML Config Files (profiles, plugins, reference pages)
    ↓
Research Data (Reddit, Twitter, Gemini synthesis)
    ↓
Performance Data (last week's Ayrshare analytics)
    ↓
Weekly Content Plan
```

### Processing Pipeline

```
Profile Config
  └─→ [Research Engine]
      └─→ [Content Planner]
          └─→ [Generation Prompt Builder]
              └─→ [Browser API: /generate]
                  └─→ [Claude.ai Response Parser]
                      └─→ [Approval Workflow]
                          └─→ [Ayrshare Publisher]
```

### Output Data

```
Outputs
├── weekly-research-output.json (research findings)
├── weekly-content-output.json (generated captions, hooks, scripts)
├── weekly-run-report.json (full cycle summary)
├── data-performance_log.json (engagement metrics)
└── data-optimization_notes.json (action items for next week)
```

---

## The Self-Learning Loop

This is the core innovation. Every week improves based on performance data:

```
Week N:
├─ Generate content (hook patterns X, Y, Z)
├─ Publish (via Ayrshare)
├─ Collect analytics (24-48 hours)
└─ Analyze: Hook X got 8% engagement, Y got 3%, Z got 12%

Week N+1:
├─ Phase 3 reads: "Hook Z is winning"
├─ Phase 4: Signals say "increase Z, reduce Y"
├─ Phase 6: Plan weights toward Z pattern
├─ Phase 7: Generation prompt emphasizes Z
├─ Generate content using winning pattern
├─ Post better content
└─ Engagement continues improving
```

---

## Cost Analysis

### Browser Automation Approach (Current)
```
Weekly API costs:
├─ Claude API: $0 (using browser)
├─ Gemini API: $0 (using browser)
├─ Google Sheets: $0 (using YAML files)
└─ Total: $0/week, $0/year

Subscription costs (already paying):
├─ Claude Pro: $20/month (you already have)
├─ Gemini Advanced: ~$20/month (optional)
└─ Ayrshare: $0 (free tier)

Monthly cost: $0-20 (depending on optional Gemini)
Annual savings vs API approach: $500-750
```

### API Approach (Old)
```
Weekly costs:
├─ Claude API: $5-7
├─ Gemini API: $2-3
├─ Google Sheets: $0
└─ Total: $10/week, $500/year

Not including subscriptions you'd also need.
```

---

## Platform Specifics

### TikTok
- Hook: First 1-3 seconds (text overlay or spoken)
- Length: 15-30 seconds optimal
- Captions: Keyword-rich for search discovery
- Frequency: 3+ hours between posts (no same-day batching)
- Peak times: 3-6 PM local, mid-week

### Instagram Reels
- Hook: First 3 seconds critical
- Length: 15-45 seconds
- Hashtags: 3-5 relevant (#tags)
- Frequency: 3-5x/week for growth
- Aesthetic: Grid consistency matters

### YouTube Shorts
- Hook: First 3 seconds for completion rate
- Length: 15-35 seconds
- Title/Description: Must include target keywords
- Frequency: 5+ per week for algorithm boost
- Link: Always subscribe CTA

### Facebook Reels
- Hook: First 3 seconds
- Captions: Slightly older demographic, conversational tone
- Format: Usually mirrors Instagram Reels
- Engagement: Prioritizes shares and comments
- Frequency: 2-4x/week

---

## Profile Modes

### personal_product
Purpose: Drive direct sales/conversions
Content ratios:
- 25% growth (reach new audience)
- 20% trust (build credibility)
- 20% proof (show results)
- 20% conversion (drive purchases)
- 15% fluff (stay human)

Visual rotation: Product in use, lifestyle, ingredients, before/after, education, text, quotes, stories, pain points, humor

### niche_authority
Purpose: Build trust, establish authority, create indirect monetization paths
Content ratios:
- 35% growth (reach new audience)
- 20% trust (be expert resource)
- 10% proof (show you know)
- 5% conversion (gentle monetization)
- 30% fluff (feel human, entertaining)

Visual rotation: Education, text, relatable scenes, humor, trend commentary, myth busting, stories, quotes, questions, polls

---

## Error Handling

### Browser Automation Failures
```
Request → Timeout
  ├─ Session may be stale
  └─ Retry with fresh session

Request → Parse Error
  ├─ Claude response format unexpected
  └─ Fall back to mock content generation

Request → Network Error
  ├─ Backend not running
  └─ Return helpful error message
```

### Publishing Failures
```
Ayrshare fails
  ├─ Retry 1: Wait 30 seconds
  ├─ Retry 2: Wait 1 minute
  ├─ Retry 3: Log failure, alert user
  └─ Next cycle tries again
```

### Analytics Gaps
```
Ayrshare doesn't return data
  ├─ Manual paste zone in config
  └─ User can paste metrics from platform dashboards
```

---

## Monitoring & Debugging

### Check Backend Health
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "sessionStats": {
    "claude": { "active": 1, "maxSessions": 3 },
    "gemini": { "active": 0, "maxSessions": 3 }
  }
}
```

### View Session Stats
```bash
curl http://localhost:3000/stats
```

### Check Run Report
```bash
cat weekly-run-report.json | jq '.phases'
```

Expected structure:
```json
{
  "phases": [
    {
      "phase": 1,
      "name": "Control Center",
      "status": "success",
      "duration_ms": 500,
      "profiles_loaded": 3
    },
    ...
  ]
}
```

---

## Scaling Considerations

### Single Machine (Current)
- Max profiles: 5-10
- Max posts/week: 40-50
- Storage: ~100MB (logs + outputs)
- Memory: ~500MB (when backend active)
- CPU: 1-2 cores sufficient

### Server Deployment
- Could run on AWS EC2 t3.micro (free tier eligible)
- Or Heroku, DigitalOcean, etc.
- Would need to manage cron jobs instead of Windows Task Scheduler
- Possible to add HTTP webhooks for triggering cycles

### Parallelization
- Currently sequential (one profile, then next)
- Could parallelize: multiple profiles simultaneously
- Backend already supports multiple sessions (max 3 by default)
- Trade-off: faster cycles vs higher memory/CPU

---

## Security Notes

### Credentials Stored
- `.env.local` contains Ayrshare API key
- This file should be in `.gitignore` (it is)
- Never commit `.env.local` to version control

### Session Persistence
- Browser cookies saved between requests
- Login state cached
- Only in-memory (lost on server restart, as intended)
- No credentials stored on disk

### Data Privacy
- All data processing is local
- No content sent to external servers (except final publishing to Ayrshare)
- YAML config files on local machine
- No telemetry or analytics collection

---

## File Organization

```
content-engine/
├── browser-automation/          ← Browser automation backend
│   ├── browser_backend.js       (Express server)
│   ├── session_manager.js       (Session pooling)
│   ├── claude_ai_bot.js         (Claude.ai automation)
│   ├── gemini_bot.js            (Gemini.ai automation)
│   └── chatgpt_bot.js           (Optional: ChatGPT automation)
│
├── config/                      ← Local YAML configuration
│   ├── profiles.yml             (Your profiles)
│   ├── plugins.yml              (Monetization plugins)
│   └── reference_pages.yml      (Learning sources)
│
├── sheets/                      ← Config reading (YAML-based now)
│   └── reader_yaml.js           (Read YAML files)
│
├── core/                        ← Phase 1-2: Control center
│   ├── orchestrator.js          (Coordinator)
│   └── control_center.js        (Validation)
│
├── research/                    ← Phase 3: Research engine
│   ├── research_engine.js       (Main orchestrator)
│   ├── sources/                 (Reddit, Twitter discovery)
│   ├── analysis/                (Gemini synthesis → browser API)
│   └── learning/                (Learning loop)
│
├── performance/                 ← Phase 4: Signal extraction
│   └── performance_extractor.js
│
├── engine/                      ← Phases 5, 13: Cost & status
│   ├── cost_governor.js         (Budget enforcement)
│   └── weekly_cycle.js          (Main orchestrator)
│
├── planning/                    ← Phase 6: Content planning
│   └── weekly_planner.js
│
├── generation/                  ← Phase 7: Content generation
│   └── content_generator.js     (Calls browser API)
│
├── approval/                    ← Phase 8: Approval workflow
│   └── approval_workflow.js
│
├── publishing/                  ← Phase 9: Publishing
│   └── ayrshare_publisher.js
│
├── analytics/                   ← Phase 10: Analytics
│   └── analytics_retriever.js
│
├── optimization/                ← Phase 11: Optimization
│   └── optimization_loop.js
│
├── reporting/                   ← Phase 12: Telegram
│   └── telegram_reporter.js
│
├── status/                      ← Phase 13: Status tracking
│   └── system_status_tracker.js
│
├── scripts/
│   ├── run_weekly_cycle.js      (Entry point)
│   ├── run_orchestrator.js      (Phase 1-2 only)
│   └── validate_setup.js        (Setup validation)
│
├── .env.local                   (Configuration: API keys)
├── package.json                 (Dependencies)
├── ARCHITECTURE.md              (This file)
├── SETUP_GUIDE.md               (Detailed setup)
└── README_QUICK_START.md        (Quick start)
```

---

## Future Enhancements

Possible improvements (not yet implemented):

1. **ChatGPT integration** — Add ChatGPT as third option for generation
2. **A/B testing** — Generate variants and test which performs better
3. **Real-time dashboard** — Web UI to view analytics and make changes
4. **Webhook triggers** — Start cycles from external systems
5. **Plugin system** — Custom content post-processing
6. **Multi-language** — Generate content in multiple languages
7. **Influencer mode** — Collaborate with other creators
8. **Advanced analytics** — Compare profiles, track competitor activity
9. **Auto-optimization** — Fully autonomous learning without manual input
10. **Video generation** — Auto-generate videos from captions (Synthesia, Runway)

---

This architecture balances simplicity (local, no servers), cost-effectiveness (zero API costs), and power (13-phase autonomous system with learning loop).
