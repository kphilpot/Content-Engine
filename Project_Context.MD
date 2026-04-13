# Project: Content-Engine

**Created:** 2026-04-12

## Project Scope
Autonomous social media content creation and monetization system. Generates and publishes content for 3 social profiles across TikTok, YouTube Shorts, Instagram, and Facebook. Self-learning loop that continuously improves based on real performance data.

**Financial Goal:** $10,000/month in affiliate revenue
**AI Cost Cap:** $10/week

## Architecture — 13 Phases
1. Control Center Validation (Google Sheets)
2. Profile Reader + Normalizer
3. Research Engine (Reddit/Twitter discovery + Gemini synthesis)
4. Performance Signal Extractor (Ayrshare analytics)
5. Cost Governor ($10/week hard cap)
6. Weekly Content Planner (ratio-based scheduling)
7. Content Generator (Claude Sonnet)
8. Approval Workflow (smart/auto/manual)
9. Ayrshare Publisher (all 4 platforms)
10. Analytics Retriever
11. Optimization Loop (self-learning)
12. Telegram Reporter (weekly summaries + alerts)
13. System Status Tracker

## Tech Stack
- Google Sheets — Control center (11 tabs, 3 profiles)
- Node.js — Core runtime
- Claude Sonnet — Content generation
- Google Gemini — Research pattern extraction
- Ayrshare API — Multi-platform publishing + analytics
- Telegram Bot — Operational reporting
- Reddit JSON API — Source discovery
- n8n — Workflow orchestration (future)

## Profiles
- `personal_product_main` — personal_product mode, direct sales
- `hair_authority_1` — niche_authority mode, trust-building
- `hair_authority_2` — niche_authority mode, science/education

## Current Status
All 13 phases implemented and tested. 35 tests passing.
Ready for production with API keys configured.

## Next Steps
1. Add API keys to .env.local (Anthropic, Ayrshare, Telegram, Gemini)
2. Run first dry-run cycle: `node scripts/run_weekly_cycle.js --dry-run`
3. Review generated content in weekly-content-output.json
4. Run production cycle: `node scripts/run_weekly_cycle.js`
5. Monitor via Telegram reports and Google Sheets
