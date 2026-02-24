# OKBoxBox — Full Platform Audit (Part 4)
## AI, Telemetry Pipeline & Voice Systems

---

## 1. REAL-TIME TELEMETRY PIPELINE

### Data Flow

```
iRacing SDK → Relay App (Electron)
    ↓ WebSocket (raw telemetry frames)
Server TelemetryHandler
    ├── Raw telemetry normalization
    ├── InferenceEngine (raw → computed)
    │   ├── Fuel: level, pct, per-lap, laps remaining, projected finish
    │   ├── Tires: wear estimation, temperatures, compound
    │   ├── Damage: aero, engine assessment
    │   ├── Pit: stop detection, in-lane status
    │   ├── Gaps: to leader, car ahead, from car behind
    │   └── Engine: RPM, water/oil temp, voltage, warnings
    ├── LiveSessionAnalyzer (accumulated intelligence)
    │   ├── Lap-by-lap pace tracking
    │   ├── Pace trend: improving / stable / degrading / erratic
    │   ├── Fuel projection: laps remaining, can-finish, optimal pit lap
    │   ├── Tire degradation rate + cliff detection
    │   ├── Gap trend analysis: closing / stable / opening
    │   ├── Overtake opportunity detection
    │   ├── Incident tracking + clustering detection
    │   ├── Mental fatigue inference: fresh / normal / fatigued / tilted
    │   ├── Stint segmentation
    │   ├── Consistency rating (0-100)
    │   └── Strategy recommendations
    ├── ProactiveSpotter (edge-triggered callouts)
    │   ├── Position changes
    │   ├── DRS/attack range entry
    │   ├── Overtake opportunities
    │   ├── Under attack warnings
    │   ├── Tire cliff warnings
    │   ├── Fuel shortage warnings
    │   └── Gap trend transitions
    ├── SituationalAwarenessService (GPT-powered)
    │   ├── Rich situation prompt with accumulated intelligence
    │   ├── LLM-generated prioritized engineer updates
    │   └── Fallback rule-based updates (when LLM unavailable)
    └── TelemetryCache (for voice queries)
        ↓ Socket Events
Frontend (useRelay hook)
    ├── telemetry → real-time HUD
    ├── strategy_raw / strategy_computed → strategy displays
    ├── race:intelligence → Race Intelligence panel
    ├── spotter:callout → engineer message stream
    └── engineer:update → engineer message stream
        ↓
EngineerCore (processRaceIntelligence)
    ├── Tire cliff voice callouts
    ├── Overtake opportunity callouts
    ├── Under threat callouts
    ├── Pit window callouts
    ├── Fuel shortage callouts
    ├── Mental fatigue callouts
    ├── Pace degradation callouts
    └── Positive reinforcement callouts
```

### Telemetry Data Points

| Category | Fields |
|----------|--------|
| **Car** | position, class position, lap, lap distance %, speed, gear, RPM, steering, throttle, brake |
| **Fuel** | level, percentage, per-lap consumption, laps remaining, projected finish |
| **Tires** | wear (FL/FR/RL/RR), temperatures (FL/FR/RL/RR), compound |
| **Damage** | aero, engine |
| **Engine** | RPM, water temp, oil temp, voltage, warnings |
| **Gaps** | to leader, to car ahead, from car behind |
| **Pit** | in lane, stop count |
| **Session** | type, time remaining, flags, weather, track temp, air temp |

### Socket Event Inventory

#### Server → Client
| Event | Source | Data |
|-------|--------|------|
| `telemetry` | TelemetryHandler | Full telemetry frame |
| `strategy_raw` | TelemetryHandler | Raw strategy data |
| `strategy_computed` | TelemetryHandler | Computed strategy data |
| `race:intelligence` | TelemetryHandler | Accumulated race intelligence (SessionIntelligence) |
| `spotter:callout` | TelemetryHandler | Proactive spotter callouts |
| `engineer:update` | TelemetryHandler | AI engineer updates |
| `session:start` | SessionHandler | Session info |
| `session:end` | SessionHandler | Session ended |
| `session:active` | WebSocket index | Late-join session info |
| `incident:new` | BroadcastHandler | New incident detected |
| `incident:updated` | BroadcastHandler | Incident status change |
| `penalty:proposed` | BroadcastHandler | Penalty proposed |
| `penalty:approved` | BroadcastHandler | Penalty approved |
| `timing:update` | BroadcastHandler | Timing data |
| `session:state` | BroadcastHandler | Session state change |
| `voice:response` | WebSocket index | Voice query response |

#### Client → Server
| Event | Handler | Data |
|-------|---------|------|
| `telemetry` | TelemetryHandler | Raw telemetry from relay |
| `session_start` | SessionHandler | Session start info |
| `session_end` | SessionHandler | Session end signal |
| `dashboard:join` | WebSocket index | Dashboard connection |
| `voice:query` | WebSocket index | Voice audio (base64) |
| `join:room` / `leave:room` | RoomManager | Room management |

**Assessment: A** — World-class telemetry pipeline. The layered architecture (raw → inferred → accumulated → AI-analyzed → voice) is excellent. Edge-triggered spotter prevents spam. LiveSessionAnalyzer provides genuine race intelligence that improves over the session.

---

## 2. AI & INTELLIGENCE SYSTEMS

### 2.1 LLM Service (`llm-service.ts`, 9KB)
- OpenAI GPT integration (gpt-4o-mini default)
- Configurable model, temperature, max tokens
- Graceful degradation when API key missing
- Used by: SituationalAwareness, crew-chat, rulebook AI, commentary, voice

### 2.2 Situational Awareness Service (`situational-awareness.ts`, 16KB)
- Builds rich situation prompts from driver state + traffic + weather + accumulated intelligence
- GPT generates prioritized engineer updates with categories: gap, fuel, tire, traffic, weather, strategy, damage, opportunity
- Fallback rule-based updates when LLM unavailable (uses accumulated intelligence for smarter fallbacks)
- Rate-limited to every 15 seconds
- Accumulated intelligence from LiveSessionAnalyzer injected into prompts

### 2.3 Live Session Analyzer (`live-session-analyzer.ts`, 33KB)
Core intelligence accumulator — the "brain" of the live learning loop.

**SessionIntelligence interface (60+ fields):**

| Category | Fields |
|----------|--------|
| **Pace** | overallAvgPace, recentAvgPace, bestLap, paceTrend, paceStdDev, consistencyRating |
| **Fuel** | actualFuelPerLap, projectedFuelLaps, fuelToFinish, optimalPitLap |
| **Tires** | currentTireLife (FL/FR/RL/RR), tireDegRate, estimatedTireLapsLeft, tireCliff |
| **Gaps** | currentPosition, positionsGainedTotal, gapAheadTrend, gapBehindTrend, gapAhead, gapBehind, overtakeOpportunity, underThreat |
| **Racecraft** | overtakeAttempts, overtakeSuccesses, positionsLostToIncidents |
| **Mental** | totalIncidents, incidentRate, incidentClustering, paceAfterIncident, mentalFatigue |
| **Stints** | currentStintNumber, currentStintLaps, stints[] |
| **Strategy** | pitStops, recommendedAction |
| **Meta** | lapCount, sessionDurationMinutes |

**16 integration tests — all passing.**

### 2.4 Proactive Spotter (`proactive-spotter.ts`, 12KB)
- Edge-triggered callouts (fires on state transitions, not every tick)
- Per-session state tracking with cooldowns
- Callout types: position_change, drs_range, overtake_opportunity, under_attack, tire_cliff, fuel_short, gap_trend
- Emits via `spotter:callout` socket event
- State cleanup on session end

### 2.5 Post-Session Learner (`post-session-learner.ts`, 12KB)
- Processes LiveSessionAnalyzer summary after session end
- Updates driver memory fields in database
- Learns: braking style, throttle style, overtaking style, incident proneness, fatigue patterns, confidence
- Feeds into future crew-chat context

### 2.6 Crew Chat System
Three AI crew members with distinct personalities:

| Role | Specialty | Context Injected |
|------|-----------|-----------------|
| **Engineer** | Car setup, fuel strategy, tire management, pit timing | Live telemetry + accumulated intelligence + driver memory |
| **Spotter** | Traffic, gaps, overtake opportunities, defensive positioning | Live telemetry + accumulated intelligence + driver memory |
| **Analyst** | Pace analysis, consistency, development areas, long-term trends | Live telemetry + accumulated intelligence + driver memory |

Each receives:
- Live telemetry context (30-second staleness check)
- Accumulated race intelligence from LiveSessionAnalyzer
- Driver memory/identity context (IDP profile, traits, goals, team strategy)
- Role-specific system prompts

### 2.7 EngineerCore (Client-Side, 34KB)
The opinionated race engineer personality engine:

| Feature | Description |
|---------|-------------|
| **Personality** | Confidence level, communication style, opinion strength |
| **Mental state** | Tilt detection, fatigue inference, confidence tracking, focus monitoring, overdriving detection |
| **Telemetry callouts** | Fuel warnings, tire warnings, damage alerts, gap changes, pace analysis |
| **Intelligence callouts** | Tire cliff, overtake opportunity, under threat, pit window, mental fatigue, pace degradation |
| **Session lifecycle** | Pre-race briefings, post-race verdicts, driver assessments |
| **Cooldown system** | Per-category cooldowns prevent callout spam |
| **Track reminders** | Corner-specific advice based on track data |

### 2.8 Other AI Systems

| System | Purpose |
|--------|---------|
| Rulebook AI | GPT interprets rulebook rules for incident classification |
| AI Commentary | GPT generates race commentary for broadcasts |
| Steward Advisor | AI-assisted steward recommendations |
| Recommendation Engine | Driver improvement recommendations |
| Explanation Builder | Human-readable incident explanations |
| Spoken Summary Builder | TTS-friendly incident summaries |
| Incident Classification | Contact analysis → severity scoring → responsibility prediction |

**Assessment: A** — The AI stack is the platform's strongest differentiator. The layered intelligence pipeline is sophisticated and well-architected. The crew-chat system with live telemetry injection is production-ready.

---

## 3. VOICE PIPELINE

### Architecture

```
Driver PTT (Push-to-Talk) → MediaRecorder API
    ↓ Base64 audio via WebSocket
Server voice:query handler
    ├── OpenAI Whisper STT — transcribes driver speech
    ├── Driver context loading (IDP profile, traits, goals, team strategy)
    ├── Telemetry context injection (live car data, 30s staleness check)
    ├── GPT response generation (race engineer persona)
    └── ElevenLabs TTS — generates spoken response
        ↓ Base64 audio via WebSocket
Frontend voice:response handler
    └── Audio playback
```

### Services

| Service | Location | Size | Purpose |
|---------|----------|------|---------|
| WhisperService | Server | 12KB | OpenAI Whisper STT + AI response generation |
| VoiceService | Server | 8KB | ElevenLabs TTS with voice presets |
| DriverContextService | Server | 12KB | Loads driver IDP for AI context |
| VoiceService | Client | 7KB | Recording + playback |

### Voice Presets
- `raceEngineer` — primary voice for engineer responses

### Dependencies
- **OpenAI API key** — required for Whisper STT + GPT responses
- **ElevenLabs API key** — required for TTS (graceful degradation: text-only response if unavailable)

**Assessment: A-** — Full voice pipeline is functional and well-integrated. Graceful degradation when services unavailable. The driver context injection makes responses contextually aware.

---

## 4. DRIVER MEMORY SYSTEM

### Database Schema (`014_driver_memory.sql`)

The driver memory system is the foundation for the "engineer that knows you" experience.

#### driver_memory table (50+ columns)
| Category | Fields |
|----------|--------|
| **Braking** | braking_style, braking_consistency, brake_bias_preference |
| **Throttle** | throttle_style, throttle_on_exit_tendency, traction_management |
| **Cornering** | corner_entry_style, apex_hit_rate, corner_exit_quality |
| **Racecraft** | overtaking_style, defensive_awareness, traffic_comfort, incident_proneness |
| **Post-incident** | post_incident_tilt_risk, recovery_speed |
| **Fatigue** | late_race_degradation, session_length_sweet_spot, fatigue_onset_lap |
| **Errors** | common_error_types (JSONB), high_risk_corners (JSONB) |
| **Strengths** | strength_track_types, weakness_track_types, strength_corner_types, weakness_corner_types |
| **Performance** | qualifying_vs_race_delta, practice_to_race_improvement |
| **Communication** | preferred_feedback_style, preferred_callout_frequency, responds_well_to_criticism, needs_confidence_building, prefers_data_vs_feeling |
| **Confidence** | baseline_confidence, confidence_volatility, current_confidence, confidence_trend |
| **Meta** | sessions_analyzed, laps_analyzed, last_learning_update, memory_confidence |

#### Supporting Tables
- **driver_memory_events** — Learning log (what was learned, evidence, confidence)
- **driver_session_behaviors** — Per-session behavioral snapshot
- **engineer_opinions** — What the engineer "thinks" about the driver
- **driver_identity** — Driver archetype and identity

### Learning Pipeline
1. LiveSessionAnalyzer accumulates session data
2. PostSessionLearner processes summary on session end
3. Driver memory fields updated in database
4. Future crew-chat sessions use updated memory as context

**Assessment: A** — This is an exceptionally well-designed system. The living memory that evolves with every session is a genuine competitive advantage. The transparency (memory events log) is excellent for user trust.

---

## 5. DRIVER DEVELOPMENT ENGINE

### Architecture (`services/driver-development/`)

| Component | Purpose |
|-----------|---------|
| `PerformanceAnalyzer` | Analyzes performance gaps from session data |
| `TargetGenerator` | Generates development targets from gaps |
| `ProgressTracker` | Tracks progress against active targets |
| `AchievementDetector` | Detects achievements and milestones |

### Target Categories
- `lap_time` — Lap time improvement targets
- `consistency` — Consistency improvement targets
- `safety` — Safety rating targets
- `irating` — iRating targets
- `custom` — Custom targets

### Target Sources
- `auto_generated` — System-generated from performance analysis
- `team_assigned` — Assigned by team management
- `self_set` — Set by the driver

### Flow
1. Session data processed by PerformanceAnalyzer
2. Gaps identified (vs personal best, team benchmark, field)
3. TargetGenerator creates suggestions
4. ProgressTracker updates active targets
5. AchievementDetector fires events on completion

**Assessment: B+** — Well-structured engine. Could benefit from more sophisticated ML-based gap analysis in the future.

---

## 6. INCIDENT CLASSIFICATION ENGINE

### Pipeline

```
Incident Trigger (from telemetry)
    ↓
ContactAnalyzer (with SpatialAwareness)
    ↓
SeverityScorer
    ↓
ResponsibilityPredictor
    ↓
ExplanationBuilder + SpokenSummaryBuilder
    ↓
IncidentRepository (persist)
    ↓
BroadcastHandler (emit to clients)
```

### Components
| Component | Purpose |
|-----------|---------|
| `ClassificationEngine` | Orchestrates the full pipeline |
| `ContactAnalyzer` | Analyzes contact type and dynamics |
| `SeverityScorer` | Scores incident severity |
| `ResponsibilityPredictor` | Predicts fault attribution |
| `SpatialAwarenessService` | Spatial context for incidents |
| `ExplanationBuilder` | Human-readable explanations |
| `SpokenSummaryBuilder` | TTS-friendly summaries |

**Assessment: B+** — Functional pipeline. The SpatialAwareness service note in code says it needs to be wired to telemetry feed (TODO comment). This may limit accuracy in production.

---

## 7. STRATEGY SERVICES

### Components (`services/strategy/`)

| Service | Size | Purpose |
|---------|------|---------|
| `segment-speed-detector.ts` | 22KB | Track segment speed analysis |
| `strategy-predictor.ts` | 12KB | Race strategy prediction |
| `opponent-modeler.ts` | 11KB | Opponent behavior modeling |
| `lap-repository.ts` | 8KB | Lap data storage |
| `intelligence.ts` | 5KB | Strategy intelligence aggregation |
| `lap-tracker.ts` | 5KB | Lap tracking |
| `stint-tracker.ts` | 4KB | Stint management |
| `segment-types.ts` | 7KB | Segment type definitions |
| `types.ts` | 3KB | Strategy type definitions |

### Tests (3 test files)
- `strategy-predictor.test.ts` — 14 tests
- `opponent-modeler.test.ts` — 11 tests
- `lap-tracker.test.ts` — 8 tests

**Assessment: B+** — Comprehensive strategy system with good test coverage. The opponent modeler and segment speed detector are sophisticated.
