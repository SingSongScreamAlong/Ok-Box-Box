# OK BOX BOX — PRODUCT INTELLIGENCE GAP ASSESSMENT

**Date:** 2026-03-13  
**Scope:** Driver-facing surfaces at app.okboxbox.com + early team surfaces  
**Method:** Full source audit of pages, hooks, services, server-side analytics  
**Assessor:** Cascade (code-level audit, not marketing review)

---

## A) CURRENT FEATURE INVENTORY

### Page-by-Page Intelligence vs Raw Data Assessment

| Page | Intelligence Layer | Raw Data Display | Verdict |
|------|-------------------|-----------------|---------|
| **DriverLanding** | CPI composite (6-factor weighted), PerformanceDirection (focus detection), telemetry-aware behavioral indices (BSI/TCI/CPI-2/RCI), crew insights (engineer/spotter with confidence scores), trend narratives, "Since Last Session" interpretation, NextAction coaching | iRating, SR, license class, finish positions, incidents, sparklines | **65% intelligence / 35% data** — strongest page in the system. Already does interpretation and coaching. |
| **DriverCockpit** | Live engineer AI chat, PTT voice query, behavioral grade from `useLiveBehavioral`, strategy inference (gap/fuel/tire status from `car:status`) | Speed, RPM, fuel level, lap times, position, tire temps, track map | **40% intelligence / 60% data** — good live decision support via car:status + engineer, but the core is still a telemetry dashboard |
| **DriverHistory** | Crew brief per session (API-fetched `fetchCrewBrief`), form metrics with window calculations, track aggregation, discipline breakdown | Session list, finish positions, iRating deltas, incidents, SOF, laps | **25% intelligence / 75% data** — mostly a retrospective table with some aggregation. Crew brief exists but is per-session, not cross-session narrative |
| **DriverIDP** | Driver Memory model (braking/throttle/corner style, fatigue onset, tilt risk, recovery speed), Driver Identity (archetype classification with confidence), Engineer Opinions (prioritized with sentiment + suggested actions), skill trajectory, improvement plan, incident patterns, problem areas by track | License breakdown, session counts, raw metrics | **70% intelligence / 30% data** — the most intelligence-dense page. Has archetype, memory, opinions, improvement plans. But it's buried in nav — not the home page. |
| **DriverProgress** | Unknown — not fully audited but exists in routes | Unknown | Likely development/XP tracking |
| **DriverBlackBox** | Live strategy data from car:status (fuel, tires, gaps, weather) | Raw telemetry values | **30% intelligence / 70% data** — operational dashboard, not coaching |
| **DriverHUD** | Minimal — configuration page for HUD overlay | Settings | **0% intelligence / 100% configuration** |
| **DriverVoice** | Voice settings for engineer/spotter | Configuration | **0% intelligence / 100% configuration** |
| **DriverProfilePage** | iRacing OAuth profile sync | Profile display | **10% intelligence / 90% data** |
| **EngineerChat** | Full conversational AI with session context, telemetry-aware prompts | Chat history | **80% intelligence / 20% data** — the strongest intelligence surface, but it's a chat page, not a dashboard |
| **SpotterChat** | Same architecture as Engineer | Chat history | **80% intelligence / 20% data** |
| **Track Intel** | Track selector + map viewer | Only 2 track shapes (Spa, Watkins Glen) | **5% intelligence / 95% data** — almost entirely placeholder. No per-track performance analysis. |

### Server-Side Intelligence Services

| Service | Status | What It Does |
|---------|--------|-------------|
| `driver-development/analyzer.ts` | ✅ Built | Performance gap analysis (pace, consistency, safety, iRating) |
| `driver-development/generator.ts` | ✅ Built | Auto-generates development targets from gaps |
| `driver-development/tracker.ts` | ✅ Built | Tracks progress against targets |
| `driver-development/detector.ts` | ✅ Built | Achievement detection |
| `ai/live-session-analyzer.ts` | ✅ Built | In-session real-time analysis |
| `ai/post-session-learner.ts` | ✅ Built | Post-session learning pipeline |
| `ai/proactive-spotter.ts` | ✅ Built | Proactive spotter callouts |
| `ai/situational-awareness.ts` | ✅ Built | Contextual awareness engine |
| `incidents/classification-engine.ts` | ✅ Built | Incident classification |
| `incidents/contact-analyzer.ts` | ✅ Built | Contact analysis |
| `incidents/severity-scorer.ts` | ✅ Built | Severity scoring |
| `explanations/ExplanationBuilder.ts` | ✅ Built | Human-readable explanations |
| `explanations/SpokenSummaryBuilder.ts` | ✅ Built | Voice-ready summaries |
| `iracing-oauth/profile-sync-service.ts` | ✅ Built | iRacing data sync |
| `iracing-oauth/sync-scheduler.ts` | ✅ Built | Scheduled profile syncs |
| `telemetry/telemetry-streams.ts` | ✅ Built (Redis-dependent) | Telemetry stream storage |
| `telemetry/behavioral-worker.ts` | ✅ Built (Redis-dependent) | Behavioral metric computation |

**Key finding:** The server has significantly more intelligence infrastructure than the frontend currently exposes. The `DriverDevelopmentEngine`, incident analysis pipeline, and post-session learner are built but underutilized in the UI.

---

## B) FEATURE GAP TABLE

### Target Innovation Assessment

| # | Feature | Status | Backend | Frontend | Complexity | User Impact | Phase |
|---|---------|--------|---------|----------|------------|-------------|-------|
| 1 | **Race Week Briefing** | **Partial** — NextActionBlock + PerformanceDirectiveCard exist but are generic coaching, not track/week-specific. No upcoming race awareness, no countdown, no track-specific prep. | Needs: iRacing schedule API integration OR manual series/schedule model. Session history per track exists. | Needs: Briefing card on DriverLanding replacing/augmenting NextActionBlock. Track-specific risk zones. Race countdown widget. | Medium-High | **Critical** — this is the single biggest differentiator. No competitor does this. | Phase 1 |
| 2 | **Fatigue / Energy Awareness** | **Missing entirely** | Needs: Session frequency tracking (timestamps exist in session data), performance degradation model (compare late-session vs early-session metrics), rolling 7/14/30 day load model | Needs: Fatigue indicator on DriverLanding, rest recommendation widget | Medium | **High** — unique feature, directly addresses a real problem iRacing drivers have | Phase 1 |
| 3 | **Session Intent Mode** | **Missing entirely** | Needs: `session_intent` field on session records, intent-aware telemetry interpretation pipeline (different thresholds for practice vs race sim vs limit pushing) | Needs: Intent selector before/at session start (could be in relay or in DriverCockpit), intent-aware debrief | Medium | **High** — changes how every session is interpreted. Practice laps analyzed differently than race laps. | Phase 1 |
| 4 | **Championship / Season Awareness** | **Missing entirely** | Needs: Season/Schedule/Event domain models (DB tables), iRacing series schedule integration, standings tracking, drop-week modeling | Needs: Season overview widget, standings tracker, risk tolerance coaching per race | High | **Medium** (future value) — foundational for Phase 2+ features | Phase 2 |
| 5 | **Track Familiarity Score** | **Partial** — DriverHistory has per-track aggregation (sessions, best finish, avg finish, incidents, last raced). But no composite familiarity signal. | Needs: Composite score from clean laps, incident rate, pace vs field, exposure hours. Track shape data for all tracks. | Needs: Familiarity confidence signal on Race Week Briefing. Track Intel page rebuild. | Low-Medium | **High** — directly answers "am I ready for this track?" | Phase 1 (after schedule awareness) |
| 6 | **Incident Pattern Recognition** | **Partial** — Server has `classification-engine.ts`, `contact-analyzer.ts`, `severity-scorer.ts`. IDP page has `incidentPatterns` with pattern/frequency/description/fix. DriverLanding has incident impact analysis. | Exists but needs: race phase correlation (lap 1 vs mid-race vs late), corner type clustering, defensive context detection, fatigue state correlation | Needs: Visual incident pattern dashboard. Currently buried in IDP expandable sections. | Medium | **High** — this is where coaching becomes concrete and actionable | Phase 1 |
| 7 | **Race Start Survival Coach** | **Missing entirely** | Needs: First-lap analysis pipeline (lap 1 incident rate, position delta lap 1 vs lap 2, cold tire incident correlation), pre-grid recommendation generator | Needs: Pre-grid workflow card (appears when session type = race, before green flag), launch guidance, cold tire warning, congestion risk | Medium | **High** — lap 1 is where most iRacing incidents happen. Directly prevents rating loss. | Phase 1 |
| 8 | **Long Run Pace Projection** | **Partial** — `car:status` has tire wear/temps, fuel consumption. Server has `TelemetryHandler` with real-time strategy inference. But no forward projection model. | Needs: Tire degradation curve model (per compound, per track temp), late-race competitiveness window estimation, patience/strategy guidance engine | Needs: Projection widget in DriverCockpit or BlackBox showing "your pace window closes in X laps" | Medium-High | **Medium-High** — valuable for endurance, less for sprint races | Phase 2 |
| 9 | **Driver Availability Planner** | **Missing entirely** | Needs: Availability model (driver × race week), lineup sufficiency calculator | Needs: Team calendar UI with availability marking, coverage warnings | Low-Medium | **Medium** (team feature) | Phase 2 |
| 10 | **Auto Stint Rotation Generator** | **Missing entirely** | Needs: Stint planning algorithm (race duration, driver count, preferred lengths, driver strengths), constraint solver | Needs: Stint planner UI (exists at `PitwallStintPlanner` — needs algorithm backend) | Medium | **Medium** (team feature) | Phase 2 |
| 11 | **Team Risk Dashboard** | **Partial** — Server has `PerformanceAnalyzer`, CPI exists. But no team-level aggregation of crash propensity, consistency profile, quali vs race strength. | Needs: Team-level driver comparison engine, risk profiling per driver, role-restricted access | Needs: Team admin dashboard with driver risk cards | Medium | **Medium** (team feature) | Phase 2 |
| 12 | **Driver Skill Profile Cards** | **Partial** — IDP has archetype classification (calculated_racer, aggressive_hunter, consistent_grinder, raw_talent, developing) with confidence scores. But no long-term classification like "tire saver" or "wet specialist". | Needs: Extended archetype model with discipline-specific traits, historical classification pipeline | Needs: Skill profile card component, shareable format | Low-Medium | **Low** (future) | Phase 3 |
| 13 | **Strategy Rejoin Estimator** | **Missing entirely** | Needs: Probabilistic position model, must be explicitly framed as estimate not prediction | Needs: Experimental UI with clear uncertainty indicators | High | **Low** (experimental, high misinterpretation risk) | Phase 3 |
| 14 | **One Click Race Prep Workflow** | **Missing entirely** | Needs: Orchestration service that chains: track intel load → history review → practice plan → reminder scheduling. Most underlying services exist but aren't chained. | Needs: Single "Prepare for Race" button on DriverLanding that triggers a guided workflow | Low-Medium | **Critical** — this is the UX differentiator. Converts data into workflow. | Phase 0 |
| 15 | **Performance Confidence Meter** | **Partial** — DriverStatusLine has a confidence score and behavioral stability indicator. CPI exists. But no single synthesized "confidence" signal. | Needs: Composite confidence model from recent CPI trend, incident trajectory, iRating momentum, behavioral stability | Needs: Single prominent gauge on DriverLanding | Low | **High** — emotional anchor, gives driver a clear signal | Phase 0 |
| 16 | **License Promotion Tracker** | **Partial** — LicensesCompactPanel shows SR progress bar toward next class, "→ B ready" / "0.42 SR to C" indicators. | Needs: SR trajectory projection (races needed to promote at current rate), risk tolerance recommendation (how aggressive can you be and still promote) | Needs: Enhanced license panel with projection, or separate widget | Low | **High** — every iRacing driver cares about promotion | Phase 1 |
| 17 | **Session Debrief Card** | **Partial** — DriverHistory has crew brief per session. IDP has improvement plan. But no automatic post-session popup with key improvement / key weakness / biggest mistake / strongest segment. | Needs: Auto-debrief generator that fires after session end, summarizes 4 key points | Needs: Post-session modal/card that appears automatically, or notification | Medium | **Critical** — this is the "aha moment" for new users. Every session should end with insight. | Phase 0 |

---

## C) ARCHITECTURAL ADDITIONS REQUIRED

### New Domain Models (Database)

| Model | Purpose | Fields | Priority |
|-------|---------|--------|----------|
| `session_intent` | Pre-session intent declaration | session_id, intent_type (practice/quali_sim/race_sim/limit_pushing/testing), declared_at | Phase 1 |
| `driver_schedule` | Upcoming race schedule awareness | driver_id, series_id, track_id, race_date, week_number, season_id | Phase 1 |
| `season` | Season/championship structure | id, series_name, season_year, week_count, drop_weeks | Phase 2 |
| `track_familiarity` | Computed familiarity scores | driver_id, track_id, clean_laps, incident_rate, pace_vs_field, exposure_hours, composite_score, computed_at | Phase 1 |
| `session_fatigue_model` | Fatigue/load tracking | driver_id, date, session_count_7d, session_count_14d, performance_trend, risk_level | Phase 1 |
| `driver_availability` | Team availability tracking | driver_id, team_id, race_week, available, notes | Phase 2 |
| `race_prep_state` | One-click prep workflow state | driver_id, race_week_id, steps_completed, track_intel_loaded, history_reviewed, practice_plan_set | Phase 0 |

### New Services

| Service | Purpose | Depends On | Priority |
|---------|---------|-----------|----------|
| `RaceWeekBriefingService` | Generates structured pre-race briefing | driver_schedule, track_familiarity, session history, PerformanceAnalyzer | Phase 1 |
| `FatigueModelService` | Computes session load and degradation signals | Session timestamps, performance metrics | Phase 1 |
| `SessionIntentInterpreter` | Adjusts telemetry interpretation based on intent | session_intent, existing TelemetryHandler | Phase 1 |
| `TrackFamiliarityService` | Computes composite familiarity score per track | Session history, incident data, lap times | Phase 1 |
| `LapOneAnalyzer` | Analyzes first-lap performance and incidents | Session data with per-lap breakdown | Phase 1 |
| `DebriefGenerator` | Auto-generates 4-point debrief after session | Post-session learner, TelemetryHandler cache | Phase 0 |
| `RacePrepOrchestrator` | Chains prep workflow steps | Multiple existing services | Phase 0 |
| `LicenseProjectionService` | Projects SR trajectory and races-to-promote | License history, SR deltas per race | Phase 1 |
| `PaceProjectionService` | Forward-looking tire/fuel/competitiveness model | Live telemetry, historical degradation data | Phase 2 |
| `StintRotationSolver` | Generates optimal stint plans | Driver roster, race params, driver strengths | Phase 2 |

### New Analytics Pipelines

| Pipeline | Description | Priority |
|----------|-------------|----------|
| **First-Lap Analyzer** | Extract lap 1 data from every race: position change, incidents, cold-tire events. Build lap-1 survival profile per driver. | Phase 1 |
| **Fatigue Correlation** | Correlate session time-of-day, sessions-per-week, and position-in-stint with incident rate and pace degradation. | Phase 1 |
| **Track Familiarity Builder** | After each session, recompute familiarity score. Feed into Race Week Briefing. | Phase 1 |
| **Intent-Aware Normalization** | When session intent is declared, adjust what "good" looks like. A limit-pushing practice session with 6 incidents is fine. A race with 6 incidents is not. | Phase 1 |

---

## D) UX RESTRUCTURING RECOMMENDATIONS

### Pages to Merge or Deprecate

| Current Page | Recommendation | Rationale |
|-------------|---------------|-----------|
| **DriverProgress** | Merge into DriverLanding | Progress should be visible on home, not a separate click |
| **DriverHUD** + **DriverVoice** | Merge into single Settings sub-page | Two separate pages for configuration is unnecessary |
| **Track Intel** (current) | Rebuild as Race Week Intelligence page | Current page is nearly empty (2 track shapes). Should become the Race Week Briefing destination. |

### Widgets to Move to DriverLanding

DriverLanding is already the strongest page, but it needs restructuring around the **race lifecycle** rather than a linear scroll of cards:

**Current DriverLanding layout (top to bottom):**
1. Identity Strip
2. Status Line (performance constraint)
3. Since Last Session
4. Training Mode (if <3 sessions)
5. Performance Directive
6. CPI Breakdown
7. Crew Intelligence Preview
8. 5-Race Trend
9. Next Action
10. Licenses
11. iRating Sparkline
12. Value Signal Strip
13. Upgrade Teaser

**Proposed DriverLanding restructure:**

```
┌─────────────────────────────────────────────────────┐
│  IDENTITY STRIP (name, license, iR, CPI, relay)    │
├─────────────────────────────────────────────────────┤
│  RACE WEEK BRIEFING (NEW)                           │
│  - Next race: [Track] in [X days]                   │
│  - Familiarity: [score] / Confidence: [meter]       │
│  - Prep status: [checklist]                         │
│  - [One-Click Prep] button                          │
├──────────────────────────┬──────────────────────────┤
│  PERFORMANCE STATE       │  DRIVER STATUS           │
│  - Constraint + Why      │  - Fatigue/Load          │
│  - CPI Breakdown         │  - License Promotion     │
│  - Confidence Meter      │  - Session Intent        │
├──────────────────────────┴──────────────────────────┤
│  LAST SESSION DEBRIEF (auto-generated)              │
│  ✓ Key improvement  ✗ Key weakness                  │
│  ⚠ Biggest mistake  ★ Strongest segment             │
├─────────────────────────────────────────────────────┤
│  CREW INTELLIGENCE (engineer/spotter)               │
├─────────────────────────────────────────────────────┤
│  COMPETITIVE TREND (5-race + iRating sparkline)     │
├─────────────────────────────────────────────────────┤
│  NEXT ACTIONS (coaching directives)                 │
└─────────────────────────────────────────────────────┘
```

**Key change:** The page opens with a *forward-looking briefing* instead of a backward-looking summary. The driver sees "what's next" before "what happened."

### Navigation Restructuring

**Current driver nav (DriverLayout sidebar):**
- Home
- Cockpit
- History
- Profile
- Crew → Engineer / Spotter
- Progress
- IDP
- Settings → HUD / Voice
- BlackBox

**Proposed nav (lifecycle-oriented):**
- **Home** (Race Week Briefing + state)
- **Prepare** (Race Prep workflow, Track Intel, practice plan)
- **Race** (Cockpit, BlackBox, HUD — context-switches when live)
- **Review** (Session Debrief, History, Replay)
- **Develop** (IDP, Progress, Crew conversations)
- **Profile** (identity, licenses, settings)

This maps to the race lifecycle: **Prepare → Race → Review → Develop → repeat**.

---

## E) IMPLEMENTATION ROADMAP

### Phase 0: Closed Beta (Weeks 1-3)

**Goal:** Make the existing system feel like intelligence, not data.

| Item | Effort | Depends On |
|------|--------|-----------|
| **Session Debrief Card** — auto-generated 4-point card after each session | 3-4 days | Existing post-session-learner service |
| **Performance Confidence Meter** — single synthesized gauge from CPI + behavioral + trend | 1-2 days | Existing CPI computation |
| **One-Click Race Prep** — button that chains: load track data → show history → generate practice plan | 3-4 days | Existing services, new orchestrator |
| **Move IDP insights to DriverLanding** — archetype, memory, top engineer opinion visible on home | 2-3 days | Existing IDP API |
| Surface **"Your Digital Race Engineer"** framing more prominently | 1 day | Copy/layout changes |

**Total: ~2 weeks**

### Phase 1: Public Launch Intelligence Layer (Weeks 4-10)

**Goal:** Differentiate from every competitor. This is where "data dashboard" becomes "racing intelligence OS."

| Item | Effort | Depends On |
|------|--------|-----------|
| **Race Week Briefing** — upcoming track awareness, prep checklist, countdown | 5-7 days | iRacing schedule data (API or manual), track familiarity service |
| **Session Intent Mode** — intent picker, intent-aware interpretation | 4-5 days | New DB field, modified TelemetryHandler |
| **Fatigue / Energy Awareness** — session load model, rest recommendations | 4-5 days | Session timestamp analysis |
| **Track Familiarity Score** — composite signal from history | 3-4 days | Session history aggregation |
| **Incident Pattern Recognition** — race phase, corner type, context clustering | 5-7 days | Enhanced incident pipeline |
| **Race Start Survival Coach** — lap 1 analysis, pre-grid card | 4-5 days | First-lap analyzer pipeline |
| **License Promotion Tracker** — SR projection, races-to-promote | 2-3 days | SR delta history |
| **Nav restructure** — lifecycle-oriented navigation | 3-4 days | All above features |
| **Track shape expansion** — at least top 20 tracks | 3-5 days | Telemetry capture or SVG generation |

**Total: ~6 weeks**

### Phase 2: Team Operations Expansion (Weeks 11-18)

| Item | Effort | Depends On |
|------|--------|-----------|
| **Championship / Season Awareness** | 5-7 days | Season domain models |
| **Driver Availability Planner** | 3-4 days | New DB model |
| **Auto Stint Rotation Generator** | 5-7 days | Constraint solver |
| **Team Risk Dashboard** | 4-5 days | Team-level CPI aggregation |
| **Long Run Pace Projection** | 5-7 days | Tire degradation model |
| **Pitwall intelligence upgrade** — strategy recommendations, not just data display | 5-7 days | Existing strategy inference |

**Total: ~6-8 weeks**

### Phase 3: Advanced Behavioral Coaching (Weeks 19+)

| Item | Effort | Depends On |
|------|--------|-----------|
| **Driver Skill Profile Cards** — extended archetype, shareable | 3-4 days | Extended classification model |
| **Strategy Rejoin Estimator** — probabilistic, clearly framed | 5-7 days | Position model, careful UX |
| **Cross-season development tracking** | 4-5 days | Season model |
| **Adaptive coaching personality** — engineer/spotter adapt tone based on driver state | 3-5 days | Fatigue model + preference parser |

### Sequencing Dependencies

```
Phase 0 (Debrief + Confidence + Race Prep)
    ↓
Phase 1a (Session Intent + Fatigue + Track Familiarity)
    ↓
Phase 1b (Race Week Briefing ← depends on schedule + familiarity)
    ↓
Phase 1c (Incident Patterns + Race Start Coach + License Tracker)
    ↓
Phase 2a (Season Model ← enables championship awareness)
    ↓
Phase 2b (Team features ← depends on season model for planning)
    ↓
Phase 3 (Behavioral coaching ← depends on all Phase 1/2 data)
```

---

## F) RISK ASSESSMENT

### Telemetry Misinterpretation Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **Confidence inflation** — showing high confidence with low sample size | High | Already partially addressed (confidence scores exist). Enforce minimum thresholds for all intelligence surfaces. Never show a numerical insight below 3 sessions. |
| **Intent-unaware analysis** — judging a practice session like a race | High | Session Intent Mode (Phase 1) is critical. Until then, separate practice/race analysis in existing views. |
| **False incident attribution** — blaming driver for racing incidents | Medium | Incident classification engine exists but needs careful thresholds. Always frame as "pattern observation" not "fault finding." |
| **Fatigue model overreach** — telling a driver to stop racing | Medium | Frame as "load awareness" not "fatigue diagnosis." Use language like "elevated session density" not "you're tired." |

### User Trust Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **Stale data** — showing outdated recommendations after driver has improved | High | Timestamp all insights. Show data freshness. Auto-expire recommendations older than 2 weeks. |
| **Wrong archetype** — classifying an aggressive driver as conservative | Medium | Already has confidence scores. Show "developing" until confidence > 70%. |
| **Coaching contradictions** — engineer says one thing, spotter says another | Medium | Focus-aware crew insights (already implemented) should be extended to all surfaces. |

### Over-Automation Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **Driver becomes passive** — relies on system instead of developing instinct | Medium | Frame as "crew support" not "autopilot." System suggests, driver decides. |
| **Strategy Rejoin Estimator** — drivers make bad decisions based on estimates | High | Phase 3 only. Must be explicitly probabilistic with wide confidence intervals. |
| **One-click prep** — driver skips actual preparation, just clicks button | Low | The workflow should require engagement (review, not just dismiss). |

### Scaling / Performance Concerns

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **Redis dependency** — currently down in production, blocking telemetry streams and behavioral worker | High | Circuit breaker deployed. For v1: decide if Redis is required or if in-memory + DB is sufficient for single-instance. |
| **Real-time computation load** — fatigue model + familiarity + briefing all computed on page load | Medium | Cache computed scores. Recompute only after new sessions. |
| **iRacing API rate limits** — schedule/profile sync | Medium | Sync scheduler already exists. Respect rate limits. Cache aggressively. |

---

## EXECUTIVE SUMMARY

### What Ok Box Box Has

The system has a **significantly stronger intelligence foundation than the UI reveals**. The server-side services (DriverDevelopmentEngine, incident analysis, post-session learner, behavioral worker, explanation builders) are built and largely functional. The frontend DriverLanding page already does meaningful interpretation (CPI, focus detection, crew insights with confidence scores). The IDP page has genuine intelligence (archetype, memory, improvement plans) but is buried.

### What Ok Box Box Needs

The product needs to **reorganize around the race lifecycle** (prepare → race → review → develop) instead of presenting a collection of data pages. The three highest-impact additions are:

1. **Race Week Briefing** — No competitor does pre-race intelligence. This is the differentiator.
2. **Session Debrief Card** — Every session should end with 4 clear insights. This is the retention hook.
3. **One-Click Race Prep** — Convert "data available" into "workflow triggered." This is the UX breakthrough.

### What Separates Ok Box Box from Competitors

VRS, Garage61, and TrackTitan are telemetry analysis tools. They show you data about what happened.

Ok Box Box, with the additions outlined here, becomes a **racing intelligence operating system** that:
- Tells you what to prepare for (Race Week Briefing)
- Knows how you drive (Driver Memory + Archetype)
- Adapts to what you're trying to do (Session Intent)
- Warns you when you're at risk (Fatigue, Incident Patterns)
- Coaches you through decisions (Race Start Coach, Crew AI)
- Summarizes what mattered (Session Debrief)
- Projects where you're going (License Tracker, Confidence Meter)

The gap between "data presentation" and "decision support" is the gap between a tool and a system. This assessment defines the path across that gap.
