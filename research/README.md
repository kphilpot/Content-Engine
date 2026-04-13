# Research Engine - Phase 3

## Overview

The Research Engine is the **self-learning core** of the Content Engine system. It autonomously discovers content sources, extracts patterns from top performers, and continuously adapts research focus based on real performance data.

**Goal:** Take performance signals → Learn what's working → Discover new sources → Extract patterns → Feed insights into content generation

## Architecture

```
Research Engine (orchestrator)
├─ Sources Discovery & Ranking
│  ├─ Reddit Source Scanner (r/curlyhair, r/Haircare, etc.)
│  ├─ Twitter Source Scanner (#HairTok, #HairJourney, etc.)
│  └─ Source Ranker (by conversion potential)
├─ Pattern Extraction (Gemini Synthesizer)
│  ├─ Hook patterns (opening lines that work)
│  ├─ Content patterns (narrative structures)
│  ├─ Trust patterns (credibility signals)
│  └─ Conversion patterns (CTA techniques)
└─ Self-Learning Loop
   ├─ Performance Analyzer (what's converting?)
   ├─ Focus Optimizer (adjust research_focus weekly)
   └─ Source Adapter (swap underperformers)
```

## How It Works

### Phase 1: Performance Analysis
Extracts signals from Google Sheets `Performance_Signals` tab:
- Which hooks are converting?
- Which sources drive the most engagement?
- Is engagement trending up or down?
- What content angles are winning?

**Output:** Performance insights + drift detection

### Phase 2: Source Discovery
Scans Reddit and Twitter for high-quality sources matching the profile's niche and research focus:

**Reddit:**
- Searches subreddits (r/curlyhair, r/NaturalHair, r/HaircareScience, etc.)
- Scores posts by engagement (comments > upvotes)
- Extracts content for trait analysis

**Twitter:**
- Tracks hashtags (#HairTok, #HairJourney, #HairCommunity, etc.)
- Prepares for API integration with Twitter v2

**Scoring:**
- Relevance: does it match research_focus and content_pillars?
- Engagement: comments/upvotes/reach?
- Audience Quality: will these viewers convert?
- Recency: fresh content converts better
- Historical: did similar sources work before?

### Phase 3: Pattern Extraction
Uses Google Gemini API to analyze reference pages + top sources and extract:

1. **Hook Patterns** - Opening lines that capture attention
   - "Did you know...?" curiosity hooks
   - "I used to..." relatable hooks
   - Problem-statement hooks
   - Surprise/counterintuitive hooks

2. **Content Patterns** - Narrative structures that work
   - Problem → Solution → Proof → CTA
   - Story → Lesson → Application
   - Question → Answer → Evidence → Call to Action

3. **Trust Patterns** - How creators build credibility
   - Personal stories + transformation
   - Scientific citations + research references
   - Before/after proof
   - Social proof (likes, comments)

4. **Conversion Patterns** - How they move toward sale
   - Soft CTAs (implicit calls to action)
   - Direct CTAs (explicit product link)
   - Urgency signals (scarcity, limited time)
   - Value stacking (bonuses, extras)

### Phase 4: Research Focus Optimization
Adapts the `research_focus` keywords weekly based on:
- Which content angles are converting (from Performance_Signals)
- What patterns Gemini discovered
- Engagement trend (improving vs declining)

**Example:**
- Previous week: "hair loss solutions styling tips"
- Performance data: "hair loss solutions" converting at 5%, "styling tips" at 1%
- New focus: "hair loss solutions transformation results before/after"

### Phase 5: Source Adaptation
Identifies underperforming reference pages and recommends replacements:
- Removes bottom 20% of sources (low engagement, no conversions)
- Adds top-ranked sources from discovery
- Provides instructions for updating Reference_Pages tab in Google Sheets

## Self-Learning Loop

The engine creates a **virtuous feedback cycle:**

```
Week N: Publish content → Collect performance data
↓
Week N+1: 
1. Analyze: What actually converted?
2. Discover: Find new sources matching top-converting angles
3. Extract: What patterns do winners use?
4. Optimize: Shift research_focus toward winners
5. Adapt: Swap underperforming reference sources
↓
Week N+2: Publish improved content with new patterns
↓
(Repeat)
```

## Key Metrics Tracked

### Performance Signals (from Google Sheets)
- `total_engagement` - Views/impressions/comments
- `conversions` - Actual affiliate sales or signups
- `conversion_rate` - conversions / engagement
- `avg_engagement_rate` - 0.0-1.0 scale
- `top_hook` - Which opening line performed best
- `content_angle` - What angle (transformation, tips, science, etc.)
- `source_url` - Where the inspiration came from

### Drift Detection
- Flags when 2+ consecutive weeks show 10%+ engagement decline
- Triggers emergency focus shift
- Recommends alternative angles to test

## Usage

### In Production
```javascript
const { runResearchEngine } = require('./research/research_engine');

const result = await runResearchEngine(profile, controlCenterState, {
  logger: console
});

// result includes:
// - performanceInsights: what's working
// - topSources: best sources to learn from
// - hookPatterns, contentPatterns, trustPatterns, conversionPatterns
// - recommendedNextFocus: what to focus on next week
// - sourcesToAdd, sourcesToReplace: update Reference_Pages with these
```

### In Testing
```javascript
const result = await runResearchEngine(profile, controlCenterState, {
  skipRemote: true,  // Don't hit Reddit API
  logger: console
});
```

## Data Flow

```
Google Sheets
├─ Channel_Profiles (research_focus, content_pillars, niche)
├─ Reference_Pages (current sources we're learning from)
└─ Performance_Signals (what actually converted last week)
        ↓
Research Engine
├─ Analyzes Performance_Signals (Phase 1)
├─ Discovers new Reddit/Twitter sources (Phase 2)
├─ Ranks by conversion potential (Phase 2)
├─ Extracts patterns with Gemini (Phase 3)
├─ Optimizes research_focus (Phase 4)
└─ Recommends source updates (Phase 5)
        ↓
Research Output JSON
├─ performanceInsights
├─ topSources
├─ hook/content/trust/conversion patterns
├─ recommendedNextFocus
└─ sourcesToAdd/sourcesToReplace

(Update Reference_Pages tab with sourcesToAdd/sourcesToReplace)
```

## Integration with Other Phases

**Phase 3 Output → Phase 4 Input:**
The research output feeds directly into content generation:
- Use extracted `hookPatterns` as opening line templates
- Use `contentPatterns` as narrative structures
- Use `recommendedNextFocus` for keyword targeting
- Use `topSources` for real-time pattern verification

## Environment Variables

- `GOOGLE_SHEETS_API_KEY` - For Google Sheets access (service account JSON)
- `GOOGLE_GENERATIVE_AI_API_KEY` - For Gemini API (free with Google account)

## Notes for Self-Learning

The research engine becomes smarter over time because:

1. **Performance feedback:** Every week, we collect conversion data that shows what actually worked
2. **Source learning:** We discover which Reddit communities and Twitter hashtags produce conversions
3. **Pattern evolution:** As we extract more patterns, we understand what hooks/angles work best
4. **Focus adaptation:** We gradually shift research toward high-converting topics
5. **Reference updates:** We replace underperforming sources with new discoveries

The key insight: **Rather than guessing what will work, we measure, learn, and adapt.**

## Testing

```bash
npm test -- research.test.js
```

Tests cover:
- ✅ Research engine complete workflow
- ✅ Performance signal analysis
- ✅ Research focus optimization
- ✅ Source discovery and ranking
- ✅ Pattern extraction
- ✅ Multi-profile handling
