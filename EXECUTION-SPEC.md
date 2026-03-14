# OK BOX BOX — EXECUTION SPEC

**Date:** 2026-03-13  
**Input:** Product Intelligence Gap Assessment (completed same day)  
**Scope:** Driver-facing product restructure from telemetry dashboard → race lifecycle intelligence OS  
**Method:** Full source audit of every driver page, component, hook, service, API route, and state machine

---

## A) TARGET PRODUCT DEFINITION

### What the Driver Product Should Become

The driver experience restructures around five lifecycle phases. These are NOT five separate apps — they are five contextual modes that the same product shifts between based on the driver's current state.

The existing `useDriverState` hook (`apps/app/src/hooks/useDriverState.tsx`) already implements this state machine:

| State | Trigger | Current Behavior | Target Behavior |
|-------|---------|-----------------|----------------|
| `PRE_SESSION` | Relay connecting | Shows `BriefingCard.tsx` (hardcoded placeholder) | Race Week Briefing with real track data, history, prep checklist |
| `IN_CAR` | Relay in_session | Routes to `DriverCockpit.tsx` | No change needed — Cockpit is already the right surface |
| `POST_RUN` | <30min after session end | Shows `DebriefCard.tsx` (hardcoded mock) | Real 4-point debrief from `post-session-learner` pipeline |
| `BETWEEN_SESSIONS` | 30min–24hr since session | Shows `ProgressView.tsx` (hardcoded mock) | Shows DriverLanding command center |
| `SEASON_LEVEL` | >24hr since session | Shows `SeasonView.tsx` (hardcoded mock) | Shows DriverLanding command center with season emphasis |

**Critical discovery:** The state machine (`useDriverState`) and the state view components (`BriefingCard`, `DebriefCard`, `ProgressView`, `SeasonView`) already exist in `apps/app/src/pages/driver/states/` but they are **shells with hardcoded mock data**. They are NOT wired to `DriverLanding` or `DriverHome`. They appear to be unused — `DriverHome.tsx` and `DriverLanding.tsx` both render their own static layouts regardless of driver state.

**The single most important architectural decision is:** Wire `useDriverState` into `DriverLanding.tsx` so the home page is context-aware. The state views become sections within Home, not replacement pages.

---

### Section Definitions

#### HOME (Command Center)

**Purpose:** Answer "What should I do right now?" based on the driver's current lifecycle state.

**User questions it answers:**
- What's my next race?
- Am I ready for it?
- How did my last session go?
- What's my current form?
- What should I work on?

**Core widgets/modules:**
- Race Week Briefing (top, forward-looking)
- Performance State (confidence meter, CPI, constraint)
- Last Session Debrief (auto-generated)
- Crew Intelligence (engineer/spotter preview)
- License / Progression
- Trend / Momentum
- Next Actions (coaching)

**Current pages that map here:**
- `DriverLanding.tsx` — the primary home (already has most intelligence widgets)
- `DriverHome.tsx` — alternate home (crew cards, relay status, live technique) — **should be merged into DriverLanding**
- `states/BriefingCard.tsx` — pre-session briefing shell
- `states/DebriefCard.tsx` — post-session debrief shell
- `states/ProgressView.tsx` — between-sessions view shell
- `states/SeasonView.tsx` — season overview shell

#### PREPARE

**Purpose:** Answer "Am I ready for this specific race?" with track-specific intelligence.

**User questions it answers:**
- What do I know about this track?
- What's my history here?
- What should I practice?
- What are my risk areas?

**Core widgets/modules:**
- Track familiarity score + history at this track
- Incident risk zones for this track
- Practice plan generator
- Race start survival notes
- One-click prep workflow

**Current pages that map here:**
- Track Intel (currently near-empty, only 2 SVG shapes)
- Parts of DriverHistory filtered to current track

#### RACE (In-Session)

**Purpose:** Real-time decision support while driving.

**User questions it answers:**
- What's my fuel/tire status?
- Who's around me?
- Should I pit?
- What's the engineer saying?

**Core widgets/modules:**
- DriverCockpit (main live view)
- DriverBlackBox (strategy data)
- LiveCockpit (compact HUD)
- Engineer/Spotter voice + chat

**Current pages that map here:**
- `DriverCockpit.tsx` — keep as-is
- `DriverBlackBox.tsx` — keep as-is
- `states/LiveCockpit.tsx` — keep as-is
- `DriverPitwall.tsx` / `DriverPitwallAdvanced.tsx` — team surfaces, not driver

#### REVIEW (Post-Session)

**Purpose:** Answer "What happened and what mattered?"

**User questions it answers:**
- What were the key moments?
- What went wrong?
- What improved?
- What does the engineer think?

**Core widgets/modules:**
- Session debrief card (4-point summary)
- Crew brief (engineer/spotter analysis)
- Session replay (if available)
- Historical comparison

**Current pages that map here:**
- `DriverHistory.tsx` — session list + crew briefs
- `states/DebriefCard.tsx` — post-session debrief shell
- `ReplayViewer.tsx` — telemetry replay
- `crew/EngineerChat.tsx` — engineer conversation
- `crew/SpotterChat.tsx` — spotter conversation

#### DEVELOP (Long-term Growth)

**Purpose:** Answer "How am I improving over time?"

**User questions it answers:**
- What's my archetype?
- What are my strengths and weaknesses?
- What goals should I set?
- How has my driver profile evolved?

**Current pages that map here:**
- `DriverIDP.tsx` — driver identity, memory, opinions, improvement plans
- `DriverProgress.tsx` — skills, goals, achievements, gamification
- `DriverProfilePage.tsx` — iRacing profile sync

---

## B) DRIVER HOME / COMMAND CENTER SPEC

### Current DriverLanding Layout (actual order from source)

1. `DriverIdentityStrip` — name, license, iR, CPI, relay status
2. `DriverStatusLine` — one-line performance constraint + behavioral confidence
3. `SinceLastSessionBlock` — what changed since last session
4. `TrainingModeCard` — onboarding for <3 sessions
5. `PerformanceDirectiveCard` — primary focus + expandable "Why?"
6. `PerformanceAttributesCompact` — CPI breakdown bars
7. `CrewPreviewPanel` — engineer/spotter insights with confidence
8. `FiveRaceTrendSummary` — 5-race sparklines + trend narrative
9. `NextActionBlock` — coaching steps + CTA
10. `LicensesCompactPanel` — SR progress bars, promotion status
11. `IRatingSparkline` — iRating trend chart
12. `ValueSignalStrip` — datapoints processed, sessions analyzed
13. `UpgradeTeaser` — locked features preview

### Target DriverLanding Layout (section by section)

```
┌─────────────────────────────────────────────────────────────────┐
│  1. DRIVER IDENTITY STRIP                                       │
│     REUSE: DriverIdentityStrip (as-is)                         │
│     Source: apps/app/src/pages/driver/DriverLanding.tsx:160-249 │
├─────────────────────────────────────────────────────────────────┤
│  2. RACE WEEK BRIEFING (NEW — replaces SinceLastSession at top)│
│     NEW COMPONENT: RaceWeekBriefing                            │
│     Depends on: driver_schedule data, track_familiarity service │
│     Phase 1 version: use existing session history grouped by   │
│     track to show "You've raced [track] X times, avg P[Y]"    │
│     Phase 0 fallback: show "Since Last Session" block here     │
│     Contains:                                                   │
│     - Next race track + countdown (Phase 1)                     │
│     - Track familiarity score (Phase 1)                         │
│     - Prep checklist status (Phase 0: manual, Phase 1: auto)   │
│     - One-click prep button (Phase 0)                          │
├─────────────────────────────────────────────────────────────────┤
│  3. SESSION DEBRIEF (contextual — only shows POST_RUN state)   │
│     MODIFY: DebriefCard.tsx — replace hardcoded mock with real  │
│     data from post-session-learner + crew brief API             │
│     Existing service: PostSessionLearner, fetchCrewBrief()      │
│     Shows: ✓ Key improvement, ✗ Key weakness, ⚠ Biggest        │
│     mistake, ★ Strongest segment                                │
│     Phase 0: wire DebriefCard to real API data                  │
├─────────────────────────────────────────────────────────────────┤
│  4. PERFORMANCE STATE (consolidated)                            │
│     REUSE: PerformanceDirectiveCard (as-is — already has        │
│     focus detection, expandable Why?, incident analysis)        │
│     REUSE: DriverStatusLine (as-is — confidence + constraint)  │
│     ADD: Performance Confidence Meter (new, small widget)       │
│     - Synthesize from CPI + behavioral stability + iR trend    │
│     - Single gauge: "Performance Confidence: 72%"              │
│     Phase 0: CPI already exists, add visual gauge wrapper      │
├─────────────────────────────────────────────────────────────────┤
│  5. IDP SUMMARY (MOVED from DriverIDP page)                    │
│     MOVE: Archetype classification from DriverIDP.tsx           │
│     MOVE: Top engineer opinion from DriverIDP.tsx               │
│     MOVE: Skill trajectory indicator from DriverIDP.tsx         │
│     Existing API: /api/v1/drivers/me/idp                       │
│     Existing types: DriverMemory, DriverIdentity,              │
│     EngineerOpinion already defined in DriverIDP.tsx            │
│     Phase 0: Compact card showing archetype + top opinion       │
│     + trajectory + "View Full Profile" link                     │
├─────────────────────────────────────────────────────────────────┤
│  6. CREW INTELLIGENCE                                           │
│     REUSE: CrewPreviewPanel (as-is — already has                │
│     telemetry-aware insights, confidence %, data window)        │
│     Source: DriverLanding.tsx:955-1017                          │
├─────────────────────────────────────────────────────────────────┤
│  7. COMPETITIVE TREND                                           │
│     REUSE: FiveRaceTrendSummary (as-is — sparklines + trend)   │
│     REUSE: IRatingSparkline (move up, merge into same section) │
├─────────────────────────────────────────────────────────────────┤
│  8. NEXT ACTIONS                                                │
│     REUSE: NextActionBlock (as-is — coaching steps + CTA)      │
│     Source: DriverLanding.tsx:1132-1217                         │
├─────────────────────────────────────────────────────────────────┤
│  9. LICENSES + PROGRESSION                                      │
│     REUSE: LicensesCompactPanel (as-is — already has SR        │
│     progress bars, promotion thresholds, "→ B ready")          │
│     ADD (Phase 1): SR projection ("3 clean races to promote")  │
├─────────────────────────────────────────────────────────────────┤
│  10. VALUE SIGNALS (de-emphasized, move to bottom)              │
│     REUSE: ValueSignalStrip (as-is but lower priority)         │
├─────────────────────────────────────────────────────────────────┤
│  REMOVE from Home:                                              │
│  - UpgradeTeaser: premature for closed beta                     │
│  - PerformanceAttributesCompact: redundant with                │
│    PerformanceDirectiveCard "Why?" section                      │
│  - TrainingModeCard: keep but only for <3 sessions             │
│  - SinceLastSessionBlock: absorbed into Race Week Briefing     │
│    section and Session Debrief section                          │
└─────────────────────────────────────────────────────────────────┘
```

### Component-Level Spec for Each Home Section

**Section 1: DriverIdentityStrip** — No changes. Already shows name, primary license, iRating, CPI tier, relay status indicator. Keep exactly as-is.

**Section 2: RaceWeekBriefing** — NEW component.
- **Phase 0 implementation:** Rename and restructure `SinceLastSessionBlock` to be forward-looking. Show "Since Last Session" data PLUS a "Prep for Next Race" CTA that links to Track Intel page (or opens one-click prep flow). Use existing `fetchDriverSessions()` to extract most recent track and compute basic readiness signal.
- **Phase 1 implementation:** Full Race Week Briefing with schedule awareness, familiarity score, countdown, and auto-generated prep checklist.
- **Existing service data:** `fetchDriverSessions()` returns `trackName` for every session → can compute track frequency. `fetchPerformanceSnapshot()` returns session details.
- **New data needed Phase 1:** `driver_schedule` model, iRacing schedule API integration.

**Section 3: Session Debrief** — MODIFY `DebriefCard.tsx`.
- **Current state:** Hardcoded mock ("Best Lap 1:42.847", "Gained 0.3s through Turn 4 complex"). SessionMemory interface exists with track, position, session type.
- **Phase 0 fix:** Wire to `fetchCrewBrief()` (already exists in `driverService.ts`, already used by `DriverHistory.tsx`). The API endpoint `/api/v1/drivers/me/crew-briefs` returns AI-generated session debriefs. Replace hardcoded "Key Moments" and "Work On This" with real crew brief data.
- **Visibility:** Only render when `useDriverState().state === 'POST_RUN'` (within 30 min of session end). Otherwise collapse into a "Last Session" compact summary linking to History.
- **Existing service:** `PostSessionLearner` on server fires on `session_end` event → generates debrief → stored in DB → served by crew-briefs API.

**Section 4: Performance Confidence Meter** — NEW small component.
- **Existing computation:** CPI is already computed in `driverIntelligence.ts:computeConsistency()`. Returns 0-100 index with tier (elite/competitive/inconsistent/at_risk). Behavioral stability from `telemetryIntelligence.ts:computeBehavioralIndices()`.
- **New work:** Single `PerformanceConfidenceMeter` component that takes CPI index + behavioral stability + iRating trend direction → renders a single gauge. ~50 lines of new JSX.
- **Data flow:** All data already available in DriverLanding via `consistency`, `direction`, `sessionTelemetry` state.

**Section 5: IDP Summary** — NEW compact card component.
- **Existing data:** `DriverIDP.tsx` fetches from `/api/v1/drivers/me/idp` → returns `{ memory, opinions, identity }`. Types `DriverMemory`, `DriverIdentity`, `EngineerOpinion` already defined.
- **New work:** `IDPSummaryCard` component (~80 lines JSX) showing: archetype badge (reuse `ARCHETYPE_INFO` mapping from IDP), top engineer opinion (highest priority), skill trajectory icon, and "View Full Profile" link.
- **Data flow:** Add `fetchIDPData()` call to DriverLanding's `useEffect`. The IDP page already has this exact fetch pattern.

---

## C) CURRENT → TARGET PAGE MAPPING

| Current Page | File | Action | Destination | Rationale |
|-------------|------|--------|-------------|-----------|
| `DriverLanding.tsx` | `pages/driver/DriverLanding.tsx` | **KEEP + MODIFY** | Home (command center) | Already the strongest page. Add state awareness, IDP summary, debrief integration. Remove redundant sections. |
| `DriverHome.tsx` | `pages/driver/DriverHome.tsx` | **DEPRECATE** | Merge into DriverLanding | Duplicate home page with crew cards + relay status. DriverLanding already has better versions of both. Relay status is in the header nav. Live technique panel moves to Cockpit. |
| `BriefingCard.tsx` | `pages/driver/states/BriefingCard.tsx` | **MODIFY** | Embedded in Home (PRE_SESSION state) | Wire to real session/track data instead of hardcoded placeholders. |
| `DebriefCard.tsx` | `pages/driver/states/DebriefCard.tsx` | **MODIFY** | Embedded in Home (POST_RUN state) | Wire to `fetchCrewBrief()` API. Replace hardcoded mock data. |
| `ProgressView.tsx` | `pages/driver/states/ProgressView.tsx` | **DEPRECATE** | Content absorbed by DriverLanding | Hardcoded mock (iRating "2,847", Win Rate "12%"). DriverLanding already has real versions of all these widgets. |
| `SeasonView.tsx` | `pages/driver/states/SeasonView.tsx` | **DEPRECATE for now** | Content deferred to Phase 2 | Hardcoded mock (Season 1, Week 8 of 12, 3 wins). No season model exists. Defer until championship awareness is built. |
| `DriverCockpit.tsx` | `pages/driver/DriverCockpit.tsx` | **KEEP** | Race section | Already correct — live telemetry, engineer chat, voice, behavioral grades. |
| `DriverBlackBox.tsx` | `pages/driver/DriverBlackBox.tsx` | **KEEP** | Race section | Strategy dashboard. Correct as-is. |
| `LiveCockpit.tsx` | `pages/driver/states/LiveCockpit.tsx` | **KEEP** | Race section (compact mode) | Glanceable HUD view. |
| `DriverHistory.tsx` | `pages/driver/DriverHistory.tsx` | **KEEP** | Review section | Session list + crew briefs + form metrics. Already has real data, no mocks. |
| `ReplayViewer.tsx` | `pages/driver/ReplayViewer.tsx` | **KEEP** | Review section | Telemetry replay viewer. |
| `EngineerChat.tsx` | `pages/driver/crew/EngineerChat.tsx` | **KEEP** | Accessible from multiple sections | AI engineer conversation. |
| `SpotterChat.tsx` | `pages/driver/crew/SpotterChat.tsx` | **KEEP** | Accessible from multiple sections | AI spotter conversation. |
| `AnalystChat.tsx` | `pages/driver/crew/AnalystChat.tsx` | **KEEP** | Currently redirects to IDP | Could become dedicated page later. |
| `DriverIDP.tsx` | `pages/driver/DriverIDP.tsx` | **KEEP + surface summary on Home** | Develop section | Deep driver profile. Keep full page, add compact summary card to Home. |
| `DriverProgress.tsx` | `pages/driver/DriverProgress.tsx` | **KEEP** | Develop section | Goals, skills, achievements. Already uses real API data (`fetchDevelopmentData`, `fetchGoals`, `fetchGoalSuggestions`). |
| `DriverProfilePage.tsx` | `pages/driver/DriverProfilePage.tsx` | **KEEP** | Develop / Settings | iRacing profile sync. |
| `DriverHUD.tsx` | `pages/driver/DriverHUD.tsx` | **MOVE** | Settings sub-page | HUD overlay configuration. Already at `/driver/settings/hud`. |
| `DriverVoice.tsx` | `pages/driver/DriverVoice.tsx` | **MOVE** | Settings sub-page | Voice configuration. Already at `/driver/settings/voice`. |
| `DriverPitwall.tsx` | `pages/driver/DriverPitwall.tsx` | **KEEP** | Team surface | Team pitwall — not a driver-home page. |
| `DriverPitwallAdvanced.tsx` | `pages/driver/DriverPitwallAdvanced.tsx` | **KEEP** | Team surface | Advanced pitwall — not a driver-home page. |
| `DriverSessions.tsx` | `pages/driver/DriverSessions.tsx` | **EVALUATE** | Possibly merge into History | May be redundant with History. |
| `DriverStats.tsx` | `pages/driver/DriverStats.tsx` | **EVALUATE** | Possibly merge into History | May be redundant with History. |

### Navigation Change

**Current nav** (`DriverLayout.tsx` line 50-57):
```
Cockpit | Crew | Progress | Profile | History | Tracks
```

**Phase 0 nav** (minimal change):
```
Home | Cockpit | Crew | Develop | History | Tracks
```

Changes:
- Add explicit **Home** link (currently logo click only)
- Rename **Progress** → **Develop** (contains both Progress and IDP)
- Rename **Profile** → moves to Develop section or user menu dropdown
- Keep Cockpit, Crew, History, Tracks

**Phase 1 nav** (lifecycle-oriented):
```
Home | Prepare | Race | Review | Develop
```

Where:
- **Home** = DriverLanding command center
- **Prepare** = Track Intel (rebuilt) + practice planner
- **Race** = Cockpit + BlackBox (context-switches when live)
- **Review** = History + session debriefs + replay
- **Develop** = IDP + Progress + goals

---

## D) REUSE VS MODIFY VS BUILD MATRIX

| Capability | Existing Assets | Reusable As-Is? | Requires Modification? | Requires Net-New? | Notes |
|-----------|----------------|-----------------|----------------------|-------------------|-------|
| **Race Week Briefing** | `SinceLastSessionBlock` (DriverLanding), `BriefingCard.tsx` (states/), `fetchDriverSessions()`, per-track aggregation in DriverHistory | Partially | Yes — BriefingCard needs real data, SinceLastSession needs forward-looking framing | Yes — `RaceWeekBriefing` component, `driver_schedule` model (Phase 1), track familiarity service (Phase 1) | Phase 0: restructure existing. Phase 1: full build. |
| **Session Debrief** | `DebriefCard.tsx` (states/), `fetchCrewBrief()` (driverService.ts), `PostSessionLearner` (server), `useDriverState` hook | Shell exists | Yes — wire DebriefCard to crew brief API, replace hardcoded mock data | Minimal — maybe a `fetchLatestDebrief()` wrapper | **Biggest bang for least work.** The shell AND the server pipeline both exist. |
| **Performance Confidence** | `computeConsistency()` (driverIntelligence.ts), `computeBehavioralIndices()` (telemetryIntelligence.ts), `DriverStatusLine` (DriverLanding) | Computation exists | No | Yes — `PerformanceConfidenceMeter` component (~50 LOC) | Wraps existing CPI + behavioral into a single gauge. |
| **One-Click Race Prep** | Track history in `DriverHistory.tsx` trackStats, `fetchDriverSessions()`, `BriefingCard.tsx` shell | Data exists | No | Yes — `RacePrepOrchestrator` component that chains: show track history → generate practice plan → track checklist state | Phase 0: frontend-only workflow. Phase 1: server-side orchestration. |
| **Session Intent** | Nothing | No | N/A | Yes — `session_intent` DB model, intent picker UI, intent-aware telemetry interpretation | Fully net-new. Phase 1. |
| **Track Familiarity** | `DriverHistory.tsx` trackStats (sessions, bestFinish, avgFinish, totalIncidents per track) | Aggregation exists | Yes — compute composite score from existing aggregation | Yes — `TrackFamiliarityService` (server), familiarity score component | Phase 0: simple formula from existing trackStats. Phase 1: server-side with caching. |
| **Fatigue / Load** | Session timestamps exist in `DriverSessionSummary.startedAt` | Raw data exists | No | Yes — `FatigueModelService` (server), fatigue indicator component | Phase 1. Compute from session frequency. |
| **Incident Patterns** | `classification-engine.ts`, `contact-analyzer.ts`, `severity-scorer.ts` (server), `incidentPatterns` in IDP data | Server pipeline exists | Yes — expose via API endpoint if not already | Yes — visual dashboard component | Phase 1. Server work exists, need frontend. |
| **Race Start Survival** | Nothing specific to lap 1 | No | N/A | Yes — `LapOneAnalyzer` pipeline, pre-grid card component | Phase 1. Fully net-new. |
| **License Projection** | `LicensesCompactPanel` (DriverLanding) already shows SR progress to promotion | UI shell exists | Yes — add projection calculation | Yes — projection formula (~20 LOC) using SR delta history | Phase 0/1 boundary. Simple math. |
| **Long Run Pace Projection** | `car:status` has tire wear, fuel consumption, strategy data | Live data exists | No | Yes — degradation model, projection component | Phase 2. Needs historical degradation data. |
| **IDP on Home** | `DriverIDP.tsx` types + fetch, `/api/v1/drivers/me/idp` endpoint | API + types exist | No | Yes — `IDPSummaryCard` component (~80 LOC) | Phase 0. Just a new component consuming existing API. |

---

## E) ARCHITECTURE / DOMAIN SPEC

### 1. New Domain Models

**`session_intent`** (Phase 1)
```sql
CREATE TABLE session_intent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  intent_type TEXT NOT NULL CHECK (intent_type IN ('practice', 'quali_sim', 'race_sim', 'limit_pushing', 'testing')),
  declared_at TIMESTAMPTZ DEFAULT NOW()
);
```
- **Why:** Without intent, a practice session with 6 incidents looks the same as a race with 6 incidents. The entire intelligence layer is weaker without this context.
- **Depends on:** Nothing — standalone table.
- **Phase:** 1

**`track_familiarity`** (Phase 1, computed)
```sql
CREATE TABLE track_familiarity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  track_name TEXT NOT NULL,
  clean_laps INTEGER DEFAULT 0,
  total_laps INTEGER DEFAULT 0,
  incident_rate NUMERIC,
  avg_finish NUMERIC,
  sessions_count INTEGER DEFAULT 0,
  exposure_hours NUMERIC DEFAULT 0,
  composite_score NUMERIC,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, track_name)
);
```
- **Why:** Race Week Briefing needs a single number for "how ready are you for this track."
- **Depends on:** Existing session data (already in DB).
- **Phase:** 1 (Phase 0 can compute client-side from session list)

**`race_prep_state`** (Phase 0, lightweight)
```sql
CREATE TABLE race_prep_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  track_name TEXT NOT NULL,
  history_reviewed BOOLEAN DEFAULT FALSE,
  practice_plan_set BOOLEAN DEFAULT FALSE,
  goals_reviewed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, track_name)
);
```
- **Why:** One-click race prep needs to track what steps the driver has completed.
- **Depends on:** Nothing.
- **Phase:** 0 (can start as localStorage, move to DB later)

**`driver_schedule`** (Phase 1)
```sql
CREATE TABLE driver_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  series_name TEXT,
  track_name TEXT NOT NULL,
  race_date TIMESTAMPTZ,
  week_number INTEGER,
  season_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
- **Why:** Race Week Briefing needs to know what race is coming.
- **Depends on:** iRacing schedule API or manual entry.
- **Phase:** 1

### 2. New Services

**`DebriefGenerator`** (Phase 0)
- **Location:** `packages/server/src/services/ai/debrief-generator.ts`
- **Why:** Auto-generate 4-point debrief (key improvement, key weakness, biggest mistake, strongest segment) after every session.
- **Depends on:** `PostSessionLearner` (already fires on `session_end`), session behavioral data.
- **Existing code:** `PostSessionLearner` already runs. `SpokenSummaryBuilder` and `ExplanationBuilder` exist. This service orchestrates them into a structured 4-point output.
- **Phase:** 0

**`TrackFamiliarityComputer`** (Phase 1)
- **Location:** `packages/server/src/services/track-familiarity.ts`
- **Why:** Compute composite familiarity from session history.
- **Depends on:** Session data in DB.
- **Phase:** 1 (Phase 0 uses client-side computation from existing session list)

**`RacePrepOrchestrator`** (Phase 0, frontend-only initially)
- **Location:** `apps/app/src/lib/racePrepService.ts`
- **Why:** Chain existing services into a single workflow.
- **Depends on:** `fetchDriverSessions()`, track history aggregation, goals service.
- **Phase:** 0 (frontend), Phase 1 (server-side)

**`LicenseProjector`** (Phase 1)
- **Location:** `apps/app/src/lib/licenseProjection.ts` (client-side, ~30 LOC)
- **Why:** Calculate races-to-promote from SR delta history.
- **Depends on:** Existing session SR delta data.
- **Phase:** 1

### 3. API Endpoints

| Endpoint | Method | Purpose | Phase | Notes |
|----------|--------|---------|-------|-------|
| `/api/v1/drivers/me/latest-debrief` | GET | Return most recent session debrief | 0 | May already be served by crew-briefs endpoint — verify |
| `/api/v1/drivers/me/track-familiarity/:trackName` | GET | Return familiarity score for specific track | 1 | New endpoint |
| `/api/v1/drivers/me/track-familiarity` | GET | Return all track familiarity scores | 1 | New endpoint |
| `/api/v1/drivers/me/race-prep/:trackName` | GET/PUT | Get/update prep state for a track | 0 | New endpoint (or localStorage initially) |
| `/api/v1/drivers/me/session-intent` | POST | Declare session intent | 1 | New endpoint |
| `/api/v1/drivers/me/schedule` | GET | Return upcoming race schedule | 1 | New endpoint |
| `/api/v1/drivers/me/fatigue-model` | GET | Return current fatigue/load state | 1 | New endpoint |

**Existing endpoints already in use:**
- `/api/v1/drivers/me` — profile
- `/api/v1/drivers/me/sessions` — session list
- `/api/v1/drivers/me/stats` — aggregate stats
- `/api/v1/drivers/me/idp` — driver memory, identity, opinions
- `/api/v1/drivers/me/report` — full driver report
- `/api/v1/drivers/me/crew-briefs` — AI session briefs
- `/api/v1/drivers/me/performance-snapshot` — recent performance
- `/api/v1/drivers/me/telemetry-metrics` — behavioral indices
- `/api/v1/drivers/me/sync-history` — iRacing sync
- `/api/v1/goals` — development goals

### 4. Frontend State / Orchestration

- **Wire `useDriverState` into DriverLanding.** Currently the hook exists but is not consumed. DriverLanding should import `useDriverState()` and conditionally render the Debrief section when `state === 'POST_RUN'`, the prep emphasis when `state === 'PRE_SESSION'`.
- **Add IDP data fetch to DriverLanding.** Currently only DriverIDP.tsx fetches from `/api/v1/drivers/me/idp`. Add a lightweight version to DriverLanding that fetches summary only.
- **Merge DriverHome data into DriverLanding.** The crew cards and live technique from `DriverHome.tsx` should be absorbed. Crew cards are already in `CrewPreviewPanel`. Live technique should be in Cockpit, not Home.

### 5. Background Jobs / Recomputation

| Job | Trigger | What It Does | Phase |
|-----|---------|-------------|-------|
| **Debrief generation** | `session_end` websocket event | Generate structured 4-point debrief | 0 — extends existing PostSessionLearner pipeline |
| **Track familiarity recompute** | After session data sync | Recompute familiarity for the track just raced | 1 |
| **Fatigue model update** | Daily or after session | Update 7d/14d session load metrics | 1 |
| **License projection recalc** | After session data sync | Update races-to-promote projection | 1 |

### 6. Caching

- **IDP summary for Home:** Cache in React state (already done for other data in DriverLanding). Refetch on mount, not on every render.
- **Track familiarity:** Cache in `track_familiarity` table. Recompute only after new sessions.
- **Debrief:** Stored in DB by PostSessionLearner. Fetched once on Home load.
- **No new Redis requirements.** All new caching is DB-level or React state-level.

---

## F) PHASE 0 / CLOSED BETA BUILD PLAN

### Goal
Make OBB feel immediately more like an intelligence system by surfacing existing intelligence more prominently and wiring existing shells to real data. **No new server-side models. No new analytics pipelines. Maximum leverage of existing code.**

### Phase 0 Bundle

#### F.1 — Wire DebriefCard to Real Data

**Why Phase 0:** The DebriefCard shell exists. The PostSessionLearner pipeline exists. The crew-briefs API exists. This is the highest ROI fix — connecting two things that are already built.

**Components involved:**
- `apps/app/src/pages/driver/states/DebriefCard.tsx` — modify
- `apps/app/src/lib/driverService.ts` — `fetchCrewBrief()` already exists
- `packages/server/src/services/ai/post-session-learner.ts` — already runs

**New work:**
1. Add `latestBrief` prop to DebriefCard interface (or fetch internally)
2. Replace hardcoded "Best Lap 1:42.847" with real crew brief data
3. Replace hardcoded "Key Moments" with real data from brief
4. Replace hardcoded "Work On This" with real suggestions from brief
5. If no brief available, show "Processing your session..." state

**Dependencies:** None — all services exist.
**Implementation order:** 1st
**User-facing outcome:** Within 30 minutes of finishing a session, driver sees a real AI-generated debrief on their home page.

#### F.2 — Add IDP Summary Card to DriverLanding

**Why Phase 0:** The IDP page has the richest intelligence in the product (archetype, memory, engineer opinions, trajectory) but it's buried 2 clicks deep. Surfacing a compact summary on Home makes the product feel 2x smarter instantly.

**Components involved:**
- `apps/app/src/pages/driver/DriverLanding.tsx` — modify (add new section)
- `apps/app/src/pages/driver/DriverIDP.tsx` — reference types and fetch pattern
- `/api/v1/drivers/me/idp` — existing endpoint

**New work:**
1. Create `IDPSummaryCard` component (~80 lines)
   - Show archetype badge (reuse `ARCHETYPE_INFO` from IDP)
   - Show top engineer opinion (highest priority, 1-2 lines)
   - Show skill trajectory (ascending/plateaued/declining icon)
   - Show memory confidence level
   - "View Full Profile" CTA → `/driver/idp`
2. Add IDP data fetch to DriverLanding's useEffect chain
3. Insert `IDPSummaryCard` between PerformanceDirectiveCard and CrewPreviewPanel

**Dependencies:** None.
**Implementation order:** 2nd
**User-facing outcome:** Driver sees their archetype, top engineer opinion, and skill trajectory on the home page without navigating elsewhere.

#### F.3 — Performance Confidence Meter

**Why Phase 0:** Emotional anchor. A single "72% confident" gauge gives the driver an instant read on their state. All computation already exists.

**Components involved:**
- `apps/app/src/pages/driver/DriverLanding.tsx` — modify
- `apps/app/src/lib/driverIntelligence.ts` — `computeConsistency()` already returns CPI index
- `apps/app/src/lib/telemetryIntelligence.ts` — behavioral indices

**New work:**
1. Create `PerformanceConfidenceMeter` component (~50 lines)
   - Input: CPI index (0-100), behavioral stability (0-100), iRating trend direction
   - Output: Single circular/radial gauge with percentage
   - Color: green >70, yellow >50, red <50
   - Label: "Performance Confidence" + tier name
2. Insert in Section 4 of new layout, next to DriverStatusLine

**Dependencies:** None — all inputs already computed in DriverLanding.
**Implementation order:** 3rd
**User-facing outcome:** Single prominent confidence indicator.

#### F.4 — Wire useDriverState to DriverLanding

**Why Phase 0:** The state machine is built. The state views exist as shells. DriverLanding ignores both. Connecting them makes Home context-aware.

**Components involved:**
- `apps/app/src/pages/driver/DriverLanding.tsx` — modify
- `apps/app/src/hooks/useDriverState.tsx` — already exists, no changes needed
- `apps/app/src/pages/driver/states/DebriefCard.tsx` — already fixed in F.1

**New work:**
1. Import `useDriverState` in DriverLanding
2. When `state === 'POST_RUN'`: show DebriefCard (wired from F.1) prominently at position 3
3. When `state === 'PRE_SESSION'`: show a "Session Starting" indicator (lightweight, not full BriefingCard yet)
4. When `state === 'IN_CAR'`: show "You're racing! Open Cockpit →" banner
5. Default (`BETWEEN_SESSIONS` / `SEASON_LEVEL`): show current layout

**Dependencies:** F.1 (DebriefCard wired).
**Implementation order:** 4th
**User-facing outcome:** Home page shifts based on what the driver is doing. Post-session shows debrief. Pre-session shows prep context.

#### F.5 — One-Click Race Prep (Frontend-Only)

**Why Phase 0:** The biggest UX differentiator. Converts "data available" into "workflow triggered." Can be built entirely client-side using existing APIs.

**Components involved:**
- `apps/app/src/pages/driver/DriverLanding.tsx` — add prep CTA
- New: `apps/app/src/components/RacePrepFlow.tsx`
- `apps/app/src/lib/driverService.ts` — `fetchDriverSessions()` for track history
- `apps/app/src/lib/goalsService.ts` — `fetchGoals()` for relevant goals

**New work:**
1. Create `RacePrepFlow` component (modal/drawer, ~150 lines)
   - Step 1: Show track history summary (sessions, best/avg finish, incidents)
   - Step 2: Show relevant goals for this track/discipline
   - Step 3: Generate practice focus (from PerformanceDirection + IDP opinions)
   - Step 4: Checklist (history reviewed ✓, goals set ✓, practice plan ✓)
2. Track prep state in localStorage (Phase 0) or DB (Phase 1)
3. Add "Prepare for Next Race" button in RaceWeekBriefing section

**Dependencies:** F.2 (IDP data available on Home for practice focus).
**Implementation order:** 5th
**User-facing outcome:** Single button triggers a guided race preparation workflow.

#### F.6 — Navigation Update

**Why Phase 0:** Makes the restructured product navigable.

**Components involved:**
- `apps/app/src/layouts/DriverLayout.tsx` — modify navItems array
- `apps/app/src/App.tsx` — verify route mapping

**New work:**
1. Add explicit "Home" nav item → `/driver/home`
2. Rename "Progress" → "Develop"
3. Make "Profile" (IDP) accessible under "Develop" or keep as separate nav item
4. Remove `DriverHome.tsx` route (or redirect to `/driver/home` → DriverLanding)

**Dependencies:** None.
**Implementation order:** 6th (last, after content changes)
**User-facing outcome:** Navigation reflects the product's purpose.

### Phase 0 Implementation Order (exact sequence)

```
1. Wire DebriefCard to real crew brief API data
   └─ DebriefCard.tsx: replace mocks with fetchCrewBrief()
   
2. Create IDPSummaryCard component
   └─ New component: IDPSummaryCard.tsx (~80 LOC)
   └─ Add IDP fetch to DriverLanding useEffect
   └─ Insert card in DriverLanding layout
   
3. Create PerformanceConfidenceMeter component
   └─ New component: PerformanceConfidenceMeter.tsx (~50 LOC)
   └─ Insert in DriverLanding layout
   
4. Wire useDriverState to DriverLanding
   └─ Import useDriverState hook
   └─ Conditional rendering based on state
   └─ Show DebriefCard when POST_RUN
   
5. Create RacePrepFlow component
   └─ New component: RacePrepFlow.tsx (~150 LOC)
   └─ Add prep CTA to DriverLanding
   └─ localStorage-based prep state tracking
   
6. Update navigation
   └─ DriverLayout.tsx: update navItems
   └─ App.tsx: clean up routing
   └─ Deprecate DriverHome.tsx (redirect)
```

**Total estimated effort: ~2 weeks for one developer.**

---

## G) PHASE 1 / PHASE 2 / PHASE 3 BUILD PLAN

### Phase 1: Launch Intelligence Layer (Weeks 4-10)

**Feature bundle:**
1. **Race Week Briefing (full)** — iRacing schedule awareness, track countdown, auto-generated briefing
2. **Session Intent Mode** — intent picker before/at session start, intent-aware debrief
3. **Fatigue / Energy Awareness** — session load model, rest recommendations
4. **Track Familiarity Score** — server-side composite with DB caching
5. **Incident Pattern Recognition** — race phase, corner type, visual dashboard
6. **Race Start Survival Coach** — lap 1 analysis, pre-grid card
7. **License Promotion Projection** — SR trajectory, races-to-promote
8. **Navigation restructure** — full lifecycle nav (Home/Prepare/Race/Review/Develop)
9. **BriefingCard full rebuild** — real pre-session briefing with track data

**Justification:** These features transform "data dashboard with some intelligence" into "racing intelligence OS." They answer questions no competitor answers: "Am I ready?", "What should I practice?", "Am I overtraining?", "Will I get promoted?"

**Dependencies:**
- Race Week Briefing depends on schedule data (iRacing API or manual)
- Session Intent depends on new DB table
- Fatigue depends on session timestamp analysis
- Track Familiarity depends on session history (exists)
- Incident Patterns depends on existing server pipeline (exists)

**Product outcome:** A driver opening Ok Box Box sees a personalized, context-aware command center that knows what race is coming, how prepared they are, and what to work on. The product feels fundamentally different from a data dashboard.

### Phase 2: Team & Season Expansion (Weeks 11-18)

**Feature bundle:**
1. **Championship / Season Awareness** — season model, standings, drop weeks
2. **Driver Availability Planner** — team calendar, coverage warnings
3. **Auto Stint Rotation Generator** — constraint solver for endurance
4. **Team Risk Dashboard** — team-level CPI aggregation, driver risk cards
5. **Long Run Pace Projection** — tire degradation model, competitiveness window
6. **SeasonView rebuild** — real season data replacing hardcoded mock

**Justification:** Extends intelligence from individual driver to team operations. Unlocks team tier value proposition.

**Dependencies:**
- Season model (new DB tables)
- Team-level driver data aggregation
- Historical degradation data for pace projection

**Product outcome:** Team managers can assess driver risk, plan lineups, and manage endurance strategy intelligently.

### Phase 3: Advanced Behavioral & Experimental (Weeks 19+)

**Feature bundle:**
1. **Extended Driver Skill Profiles** — discipline-specific traits, shareable cards
2. **Strategy Rejoin Estimator** — probabilistic position model (clearly framed as estimate)
3. **Cross-season development tracking** — multi-season trajectory
4. **Adaptive coaching personality** — tone shifts based on driver state
5. **Fatigue-aware coaching** — "you've been racing for 3 hours, consider a break"

**Justification:** These are high-value but high-risk features that require the foundation from Phase 0-2.

**Product outcome:** The system feels like it genuinely knows the driver and adapts its communication style.

---

## H) IMPLEMENTATION ORDER — STEP BY STEP

### Phase 0 Execution Sequence

```
Step 1:  Read and verify DebriefCard.tsx hardcoded sections
Step 2:  Add fetchLatestDebrief() to driverService.ts (wrapper around fetchCrewBrief filtered to latest)
Step 3:  Rewrite DebriefCard.tsx to consume real crew brief data
Step 4:  Test DebriefCard with real post-session data
Step 5:  Create IDPSummaryCard.tsx component (archetype + opinion + trajectory)
Step 6:  Add IDP data fetch to DriverLanding.tsx useEffect
Step 7:  Insert IDPSummaryCard in DriverLanding layout between sections 5-6
Step 8:  Create PerformanceConfidenceMeter.tsx component
Step 9:  Insert PerformanceConfidenceMeter in DriverLanding layout in section 4
Step 10: Import useDriverState in DriverLanding.tsx
Step 11: Add conditional rendering: POST_RUN → show DebriefCard section
Step 12: Add conditional rendering: IN_CAR → show "Open Cockpit" banner
Step 13: Remove PerformanceAttributesCompact from DriverLanding (redundant with PerformanceDirective "Why?")
Step 14: Remove UpgradeTeaser from DriverLanding (premature for beta)
Step 15: Move IRatingSparkline up to merge with FiveRaceTrendSummary section
Step 16: Create RacePrepFlow.tsx component (modal/drawer)
Step 17: Add RaceWeekBriefing placeholder section at top of DriverLanding (restructured SinceLastSession)
Step 18: Wire RacePrepFlow button into RaceWeekBriefing section
Step 19: Update DriverLayout.tsx navItems array
Step 20: Redirect /driver/home → DriverLanding if DriverHome.tsx is still routed separately
Step 21: Verify compile, test all state transitions
```

### Phase 1 Execution Sequence

```
Step 22: Create session_intent DB migration
Step 23: Create session intent API endpoint
Step 24: Create intent picker UI component
Step 25: Create track_familiarity DB migration
Step 26: Create TrackFamiliarityComputer service
Step 27: Create track familiarity API endpoints
Step 28: Create FatigueModelService
Step 29: Create fatigue model API endpoint
Step 30: Create fatigue indicator component for Home
Step 31: Create driver_schedule DB migration
Step 32: Build or integrate iRacing schedule data source
Step 33: Create full RaceWeekBriefing component (replaces placeholder)
Step 34: Rebuild BriefingCard.tsx with real track/weather/history data
Step 35: Create LapOneAnalyzer pipeline (server)
Step 36: Create Race Start Survival Card component
Step 37: Add license projection calculation to LicensesCompactPanel
Step 38: Rebuild Track Intel page as Prepare destination
Step 39: Create incident pattern visualization component
Step 40: Wire incident pattern data from existing classification engine to API
Step 41: Implement lifecycle navigation (Home/Prepare/Race/Review/Develop)
Step 42: Update App.tsx routing to match new nav structure
Step 43: Integration test full lifecycle flow
```

---

## I) RISKS / PRODUCT CORRECTNESS WARNINGS

### Risk 1: Overbuilding Before Surfacing Existing Intelligence
**Severity: HIGH**
The IDP page has archetype classification, driver memory, engineer opinions, and improvement plans that are already computed and stored. Building new intelligence features before surfacing what exists is a waste. Phase 0 explicitly addresses this — surface first, build second.

### Risk 2: DebriefCard Mock Data Shipped to Users
**Severity: HIGH**
`DebriefCard.tsx` currently shows "Best Lap 1:42.847" and "Personal Best Lap 12 — Gained 0.3s through Turn 4 complex" as hardcoded strings. If this component is ever rendered (which `useDriverState` makes possible), users will see fabricated data. **Fix this first.**

### Risk 3: ProgressView and SeasonView Mock Data
**Severity: MEDIUM**
`ProgressView.tsx` shows hardcoded "iRating 2,847", "Win Rate 12%", skill bars at 68%/82%/71%. `SeasonView.tsx` shows "2026 Season 1, Week 8 of 12, 3 Wins". These are dangerously specific fake numbers. If rendered, they destroy trust. **Deprecate or gate behind feature flags until real data wired.**

### Risk 4: Two Competing Home Pages
**Severity: MEDIUM**
`DriverHome.tsx` and `DriverLanding.tsx` both exist and both serve as "home." `DriverHome` has crew cards + relay status + live technique. `DriverLanding` has intelligence + CPI + trends. The route `/ driver` and `/driver/home` both go to `DriverLanding` (App.tsx lines 177-178). `DriverHome` is reachable but unclear when. **Merge or deprecate DriverHome.**

### Risk 5: Creating Fake Intelligence from Weak Signals
**Severity: HIGH**
The fatigue model (Phase 1) and performance confidence meter (Phase 0) risk overstating certainty. A driver with 5 sessions doesn't have enough data for a meaningful fatigue pattern. **Every intelligence output must show its confidence level and data window.** The existing crew insights already do this (confidence %, data window labels). All new features must follow this pattern.

### Risk 6: Making Home Too Dense
**Severity: MEDIUM**
Current DriverLanding already has 13 sections. Adding Race Week Briefing, Debrief, IDP Summary, and Confidence Meter adds 4 more. **The new layout must REMOVE sections to compensate.** The spec removes PerformanceAttributesCompact (redundant) and UpgradeTeaser (premature), and conditionally shows Debrief (only POST_RUN state). This nets +2 sections, acceptable.

### Risk 7: Adding Pages Instead of Restructuring
**Severity: HIGH**
The instinct is to add a "Prepare" page, a "Review" page, a "Season" page. Resist. **The product's problem is fragmentation, not missing pages.** Phase 0 should NOT add new routes. It should make the existing Home smarter. Phase 1 can restructure navigation after the intelligence layer is solid.

### Risk 8: Misleading Confidence/Projection Outputs
**Severity: HIGH**
License projection ("3 clean races to promote") sounds precise but is an estimate. If a driver gets 6 incidents in their next race, the projection is wrong. **All projections must be framed as "at your current rate" with explicit assumptions.** Never show a projection without its conditions.

### Risk 9: useDriverState Not Being Tested
**Severity: MEDIUM**
The `useDriverState` hook determines state based on relay status and localStorage timestamps. If localStorage gets stale or the relay disconnects unexpectedly, the state machine could show the wrong view (e.g., POST_RUN debrief 3 days after a session). **Add a staleness check:** if `timeSinceLastSession > 24 hours`, never show POST_RUN even if localStorage says otherwise.

---

## J) FINAL RECOMMENDATION

### Build This First (Week 1)
**Wire DebriefCard to real data.** This is the single highest-impact, lowest-effort change. The server pipeline (PostSessionLearner) already generates session debriefs. The component shell (DebriefCard.tsx) already exists. The API (crew-briefs) already serves the data. You are connecting two built things. When a driver finishes a race and opens the app, they should see a real, AI-generated debrief — not a static dashboard.

### Reorganize This Second (Week 1-2)
**Surface IDP intelligence on Home.** The archetype, engineer opinions, and skill trajectory are the product's strongest intelligence outputs. They're buried on a page most users won't find. A compact summary card on Home makes the entire product feel smarter without building anything new on the server.

### Build This Third (Week 2)
**One-Click Race Prep + Confidence Meter.** These are the UX differentiators. The prep flow uses existing data (session history, goals, IDP opinions) to create a workflow. The confidence meter wraps existing computation (CPI + behavioral) into a single visual. Neither requires server changes.

### Leave This Alone For Now
- **ProgressView.tsx** — hardcoded mock, deprecate until Season model exists
- **SeasonView.tsx** — hardcoded mock, deprecate until Phase 2
- **DriverHome.tsx** — merge useful parts into DriverLanding, then deprecate
- **Track Intel page** — nearly empty, defer rebuild to Phase 1
- **Session Intent** — important but requires DB schema + pipeline changes, Phase 1
- **Fatigue model** — valuable but requires analytics pipeline, Phase 1
- **Team features** — Phase 2, no driver-facing urgency

### The Core Principle
**The product already has more intelligence than it shows.** The first move is always surfacing, not building. Every Phase 0 item takes something that exists on the server or in a buried page and puts it where the driver will see it. Phase 1 builds net-new intelligence. Phase 2 extends to teams. This order prevents the trap of building features nobody discovers because they're hidden behind navigation.
