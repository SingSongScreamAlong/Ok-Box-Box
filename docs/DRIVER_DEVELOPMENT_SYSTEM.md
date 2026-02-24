# Driver Development System (IDP)

> **Intelligent Driver Profile** — The system that learns who you are as a driver and helps you improve.

## Overview

The Driver Development System is the core intelligence layer that transforms raw telemetry and session data into actionable insights about a driver's tendencies, strengths, weaknesses, and mental state. It powers the AI crew's ability to give personalized advice and tracks long-term driver growth.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DRIVER DEVELOPMENT FLOW                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐ │
│   │  Live Race   │───▶│   Session    │───▶│   Post-Session Learner   │ │
│   │  Telemetry   │    │   Analyzer   │    │   (writes behaviors)     │ │
│   └──────────────┘    └──────────────┘    └────────────┬─────────────┘ │
│                                                        │               │
│                                                        ▼               │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐ │
│   │   AI Crew    │◀───│   Engineer   │◀───│   Memory Aggregation     │ │
│   │   Advice     │    │   Opinions   │    │   (rolling averages)     │ │
│   └──────────────┘    └──────────────┘    └────────────┬─────────────┘ │
│                                                        │               │
│                                                        ▼               │
│                                           ┌──────────────────────────┐ │
│                                           │   Driver Identity        │ │
│                                           │   (archetype, trajectory)│ │
│                                           └──────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Driver Memory (`driver_memory` table)

The persistent record of everything the system has learned about a driver. Updated after every session.

| Field | Type | Description |
|-------|------|-------------|
| **Driving Style** | | |
| `braking_style` | `early` / `late` / `trail` / `threshold` / `unknown` | How the driver typically approaches braking zones |
| `braking_consistency` | 0.0 – 1.0 | How repeatable their braking is lap-to-lap |
| `throttle_style` | `aggressive` / `smooth` / `hesitant` / `unknown` | Throttle application pattern on corner exit |
| `traction_management` | 0.0 – 1.0 | Ability to manage wheelspin and traction |
| `corner_entry_style` | `aggressive` / `conservative` / `variable` | How they commit to corner entry |
| `overtaking_style` | `aggressive` / `patient` / `opportunistic` | Approach to passing other cars |
| **Mental State** | | |
| `current_confidence` | 0.0 – 1.0 | Current estimated confidence level |
| `confidence_trend` | `rising` / `falling` / `stable` / `volatile` | Direction of confidence over recent sessions |
| `post_incident_tilt_risk` | 0.0 – 1.0 | Likelihood of making more mistakes after an incident |
| `fatigue_onset_lap` | integer | Lap number where performance typically starts degrading |
| `late_race_degradation` | 0.0 – 1.0 | How much pace drops off late in races |
| `session_length_sweet_spot` | minutes | Optimal session length before fatigue sets in |
| **Racecraft** | | |
| `incident_proneness` | 0.0 – 1.0 | Inverse of clean racing (1.0 = very clean) |
| `recovery_speed` | `fast` / `slow` / `unknown` | How quickly they recover pace after incidents |
| **Meta** | | |
| `sessions_analyzed` | integer | Total sessions processed |
| `laps_analyzed` | integer | Total laps processed |
| `memory_confidence` | 0.0 – 1.0 | How confident the system is in its assessments |

#### How Memory is Built

Memory is built through **exponential moving averages (EMA)** across sessions:

```
new_value = (old_value × 0.7) + (session_observation × 0.3)
```

This means:
- Recent sessions have more weight than older ones
- Outlier sessions don't drastically change the profile
- Trends emerge over 5-10 sessions
- The system becomes more confident with more data

---

### 2. Session Behaviors (`driver_session_behaviors` table)

A per-session snapshot of behavioral observations. These are the raw inputs that feed memory aggregation.

| Category | Fields | What They Measure |
|----------|--------|-------------------|
| **Technique** | `brake_consistency_score`, `throttle_application_score`, `corner_entry_aggression`, `corner_exit_quality` | Raw driving skill metrics |
| **Mental State** | `lap_time_variance_trend`, `incident_clustering`, `post_incident_pace_delta`, `late_session_pace_delta` | Signs of mental state during the session |
| **Racecraft** | `overtakes_attempted`, `overtakes_completed`, `positions_lost_to_mistakes`, `defensive_incidents` | Wheel-to-wheel performance |
| **Confidence** | `estimated_confidence`, `confidence_trajectory` | Inferred confidence level |

#### Lap Time Variance Trend

| Value | Meaning |
|-------|---------|
| `stable` | Variance < 0.5s — Very consistent |
| `improving` | Variance 0.5-1.5s — Getting faster |
| `degrading` | Variance 1.5-3.0s — Losing pace |
| `erratic` | Variance > 3.0s — Inconsistent |

#### Incident Clustering

Detected when 3+ incidents occur in a session. This is a strong signal of:
- Tilt (frustration leading to more mistakes)
- Fatigue (concentration lapsing)
- Overdriving (pushing beyond current skill level)

---

### 3. Engineer Opinions (`engineer_opinions` table)

AI-generated assessments that the crew can reference when talking to the driver. These are human-readable summaries of what the data shows.

| Domain | What It Covers |
|--------|----------------|
| `pace` | Raw speed, qualifying performance, race pace |
| `consistency` | Lap-to-lap repeatability, variance |
| `racecraft` | Overtaking, defending, incident rate |
| `mental` | Confidence, tilt risk, fatigue |
| `technique` | Braking, throttle, corner technique |
| `development` | Overall trajectory, readiness for challenges |

#### Opinion Structure

```typescript
{
  opinion_summary: "Your consistency is excellent. Lap times are predictable.",
  opinion_sentiment: "positive" | "neutral" | "concern" | "critical",
  suggested_action: "Maintain this consistency while gradually pushing for pace.",
  priority: 1-10,  // Higher = more important to address
  opinion_confidence: 0.0-1.0,  // How sure the system is
  evidence_sessions: ["session-uuid-1", "session-uuid-2"],
}
```

#### Sentiment Levels

| Sentiment | Meaning | Example |
|-----------|---------|---------|
| `positive` | Strength to maintain | "Your racecraft is excellent" |
| `neutral` | Acceptable, room to grow | "Consistency is good but has room for improvement" |
| `concern` | Needs attention | "Incident rate is higher than ideal" |
| `critical` | Urgent issue | "High incident rate is hurting your iRating" |

---

### 4. Driver Identity (`driver_identity` table)

The high-level narrative of who this driver is and where they're going.

#### Driver Archetypes

| Archetype | Description | Typical Traits |
|-----------|-------------|----------------|
| `calculated_racer` | Methodical, consistent, low-risk | High consistency, low incidents, patient overtaking |
| `aggressive_hunter` | Bold, attacking, high-risk/high-reward | Aggressive corner entry, many overtake attempts |
| `consistent_grinder` | Steady improvement, reliable | Very high consistency, moderate pace |
| `raw_talent` | Natural speed, still learning racecraft | Fast but incident-prone |
| `developing` | Not enough data to classify | < 10 sessions analyzed |

#### Skill Trajectory

| Trajectory | Meaning |
|------------|---------|
| `ascending` | Improving over recent sessions |
| `plateaued` | Consistent performance, not improving |
| `breaking_through` | Recent significant improvement |
| `declining` | Performance dropping |
| `developing` | Too early to determine |

#### Readiness Signals

The system tracks when a driver is ready for new challenges:

| Signal | Criteria |
|--------|----------|
| `ready_for_longer_races` | 20+ sessions, low late-race degradation |
| `ready_for_higher_splits` | Positive positions gained, clean racing |
| `ready_for_new_discipline` | 30+ sessions, stable performance |

#### Narrative Elements

| Field | Purpose |
|-------|---------|
| `current_chapter` | Where they are in their journey ("Building your foundation") |
| `next_milestone` | What they should aim for ("Complete 10 clean races") |
| `defining_moment` | A memorable achievement or breakthrough |

---

## Confidence Scoring

Confidence is a key metric that affects how the AI crew interacts with the driver.

### How Confidence is Calculated

```typescript
function computeConfidence(session: SessionSummary): number {
  let confidence = 0.5;  // Start neutral

  // Good consistency boosts confidence
  if (session.consistency > 80) confidence += 0.15;
  else if (session.consistency > 60) confidence += 0.05;
  else confidence -= 0.1;

  // Gaining positions boosts confidence
  if (session.positionsGained > 3) confidence += 0.15;
  else if (session.positionsGained > 0) confidence += 0.05;
  else if (session.positionsGained < -3) confidence -= 0.15;

  // Low incidents boost confidence
  if (session.incidentRate < 0.1) confidence += 0.1;
  else if (session.incidentRate > 0.5) confidence -= 0.15;

  // Incident clustering hurts confidence
  if (session.incidentClustering) confidence -= 0.1;

  // Improving pace boosts confidence
  if (session.paceTrend === 'improving') confidence += 0.05;
  else if (session.paceTrend === 'degrading') confidence -= 0.05;

  return Math.max(0, Math.min(1, confidence));
}
```

### Confidence Trajectory

| Trajectory | Condition |
|------------|-----------|
| `rising` | Recent avg > older avg by 0.1+ |
| `falling` | Recent avg < older avg by 0.1+ |
| `stable` | Difference < 0.1 |

---

## Data Sources

The IDP system learns from **two sources**:

### 1. Live Relay Sessions
Sessions where the driver runs with the OkBoxBox relay connected. These provide:
- Real-time telemetry (throttle, brake, steering inputs)
- Lap-by-lap performance data
- Incident detection and clustering
- Mental state indicators

### 2. Historical iRacing Races
When a driver links their iRacing account, the system can backfill up to 50 historical races:
- Fetched via iRacing Data API (requires `IRACING_CLIENT_ID` and `IRACING_CLIENT_SECRET`)
- Includes lap times, positions, incidents, iRating changes
- Processed through the same IDP pipeline as live sessions
- Automatically triggered on OAuth link, or manually via "Sync Race History" button

**Note:** Historical races provide less granular data than live relay sessions (no telemetry), but still contribute to:
- Consistency metrics (lap time variance)
- Racecraft (positions gained/lost, incidents)
- Confidence scoring
- Driver archetype detection

---

## The Learning Pipeline

### 1. During Session (Real-time)

The `LiveSessionAnalyzer` accumulates intelligence:
- Lap times and consistency
- Incident count and clustering
- Positions gained/lost
- Pace trend (improving/degrading/stable)
- Mental state indicators

### 2. Session End (Post-Session Learner)

When a session ends with 3+ laps:

```typescript
async function updateDriverMemoryFromSession(driverId, sessionId, summary) {
  // 1. Write session behavior record
  await writeSessionBehavior(driverId, sessionId, summary);

  // 2. Update direct memory fields
  await updateDirectMemoryFields(driverId, sessionId, summary);

  // 3. Increment counters
  await incrementMemoryStats(driverId, 1, summary.totalLaps);

  // 4. Re-aggregate memory from all recent behaviors
  await aggregateMemoryFromBehaviors(driverId);
}
```

### 3. Memory Aggregation

Pulls the last 20 session behaviors and computes rolling averages:

```typescript
async function aggregateMemoryFromBehaviors(driverId) {
  const behaviors = await getRecentBehaviors(driverId, 20);
  
  if (behaviors.length < 3) return;  // Need minimum data

  // Calculate aggregated values
  const avgBrakeConsistency = average(behaviors.map(b => b.brake_consistency_score));
  const avgConfidence = average(behaviors.map(b => b.estimated_confidence));
  
  // Determine styles from patterns
  const brakingStyle = avgBrakeConsistency > 0.8 ? 'threshold' 
                     : avgBrakeConsistency > 0.6 ? 'trail' 
                     : 'unknown';

  // Update memory
  await updateDriverMemory(driverId, {
    braking_style: brakingStyle,
    braking_consistency: avgBrakeConsistency,
    current_confidence: avgConfidence,
    memory_confidence: Math.min(1, behaviors.length / 20),
  });
}
```

### 4. Opinion Generation

After memory is updated, engineer opinions are regenerated:

```typescript
async function generateEngineerOpinions(driverId) {
  const memory = await getDriverMemory(driverId);
  
  // Consistency opinion
  if (memory.braking_consistency > 0.8) {
    createOpinion({
      domain: 'consistency',
      sentiment: 'positive',
      summary: 'Your consistency is excellent.',
      action: 'Maintain this while gradually pushing for pace.',
    });
  }
  
  // Racecraft opinion
  if (memory.incident_proneness < 0.5) {
    createOpinion({
      domain: 'racecraft',
      sentiment: 'critical',
      summary: 'High incident rate is hurting your results.',
      action: 'Focus on finishing races cleanly first.',
    });
  }
}
```

### 5. Identity Update

Finally, the driver's identity narrative is updated:

```typescript
async function updateDriverIdentity(driverId) {
  const memory = await getDriverMemory(driverId);
  
  // Determine archetype
  if (memory.incident_proneness > 0.85 && memory.braking_consistency > 0.7) {
    archetype = 'calculated_racer';
  } else if (memory.overtaking_style === 'aggressive') {
    archetype = 'aggressive_hunter';
  }
  
  // Determine trajectory
  if (memory.confidence_trend === 'rising') {
    trajectory = 'ascending';
  }
  
  // Set narrative
  if (memory.sessions_analyzed > 50) {
    currentChapter = 'Refining your craft';
    nextMilestone = 'Consistent top-5 finishes';
  }
}
```

---

## How the AI Crew Uses This Data

When a driver talks to their AI engineer/spotter/analyst, the system:

1. **Loads driver memory** — All learned tendencies and current state
2. **Loads active opinions** — What the engineer "thinks" about the driver
3. **Loads live telemetry** — Current session data (if in a race)
4. **Injects into system prompt** — The AI has full context

Example system prompt injection:

```
DRIVER PROFILE:
- Archetype: Calculated Racer
- Confidence: 0.72 (rising)
- Braking: Threshold style, 0.85 consistency
- Racecraft: Very clean (0.92 incident proneness)
- Fatigue onset: ~lap 35

CURRENT OPINIONS:
- [POSITIVE] Consistency is excellent
- [CONCERN] Late-race pace degradation detected

LIVE SESSION:
- Position: P4
- Fuel: 12 laps remaining
- Gap ahead: +2.3s
```

This allows the AI to give personalized advice:
- "You're doing great on consistency. Let's work on maintaining that pace in the final stint."
- "I know you tend to fade after lap 35 — let's manage the tires early."

---

## Memory Events Log

Every significant change to driver memory is logged for transparency:

| Event Type | When It's Logged |
|------------|------------------|
| `tendency_update` | A driving style field changes |
| `pattern_detected` | A new behavioral pattern is identified |
| `preference_inferred` | A preference is learned from behavior |
| `confidence_shift` | Significant confidence change |

Example log entry:

```json
{
  "event_type": "pattern_detected",
  "memory_field": "fatigue_onset_lap",
  "previous_value": null,
  "new_value": "35",
  "evidence_summary": "Fatigue detected at ~lap 35 in 45min session",
  "learning_confidence": 0.6
}
```

---

## Data Requirements

### Minimum Data for Features

| Feature | Minimum Sessions | Minimum Laps |
|---------|------------------|--------------|
| Session behavior record | 1 | 3 |
| Memory aggregation | 3 | — |
| Engineer opinions | 3 | — |
| Driver archetype | 5 | — |
| Skill trajectory | 10 | — |
| High-confidence memory | 20 | — |

### Memory Confidence Scale

| Sessions Analyzed | Memory Confidence | Meaning |
|-------------------|-------------------|---------|
| 0-2 | 0.0-0.1 | Insufficient data |
| 3-5 | 0.15-0.25 | Early patterns emerging |
| 6-10 | 0.3-0.5 | Reasonable confidence |
| 11-15 | 0.55-0.75 | Good confidence |
| 16-20+ | 0.8-1.0 | High confidence |

---

## Database Schema

### Tables

```sql
-- Core memory record (one per driver)
CREATE TABLE driver_memory (
  id UUID PRIMARY KEY,
  driver_profile_id UUID REFERENCES driver_profiles(id),
  braking_style TEXT,
  braking_consistency DECIMAL(3,2),
  throttle_style TEXT,
  current_confidence DECIMAL(3,2),
  confidence_trend TEXT,
  sessions_analyzed INTEGER DEFAULT 0,
  laps_analyzed INTEGER DEFAULT 0,
  memory_confidence DECIMAL(3,2) DEFAULT 0,
  -- ... many more fields
);

-- Per-session behavioral snapshot
CREATE TABLE driver_session_behaviors (
  id UUID PRIMARY KEY,
  session_id UUID,
  driver_profile_id UUID REFERENCES driver_profiles(id),
  brake_consistency_score DECIMAL(3,2),
  estimated_confidence DECIMAL(3,2),
  incident_clustering BOOLEAN,
  -- ... more fields
  computed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(session_id, driver_profile_id)
);

-- AI-generated opinions
CREATE TABLE engineer_opinions (
  id UUID PRIMARY KEY,
  driver_profile_id UUID REFERENCES driver_profiles(id),
  opinion_domain TEXT,
  opinion_summary TEXT,
  opinion_sentiment TEXT,
  suggested_action TEXT,
  priority INTEGER,
  valid_from TIMESTAMP DEFAULT NOW(),
  superseded_by UUID REFERENCES engineer_opinions(id)
);

-- High-level driver narrative
CREATE TABLE driver_identity (
  id UUID PRIMARY KEY,
  driver_profile_id UUID REFERENCES driver_profiles(id),
  driver_archetype TEXT,
  skill_trajectory TEXT,
  current_chapter TEXT,
  next_milestone TEXT
);

-- Audit log of memory changes
CREATE TABLE driver_memory_events (
  id UUID PRIMARY KEY,
  driver_profile_id UUID,
  event_type TEXT,
  memory_field TEXT,
  previous_value TEXT,
  new_value TEXT,
  evidence_summary TEXT,
  learning_confidence DECIMAL(3,2)
);
```

---

## Future Enhancements

### Planned

- **Per-corner analysis** — Brake point deltas, corner-specific weaknesses
- **Track-specific memory** — Different profiles per track
- **Car-specific memory** — Different profiles per car class
- **Comparative analysis** — How driver compares to similar iRating drivers
- **Predictive fatigue** — Warn before fatigue onset based on patterns

### Under Consideration

- **Voice tone analysis** — Detect stress/frustration from crew chat
- **Reaction time tracking** — Measure response to incidents
- **Weather adaptation** — Track performance in different conditions
- **Setup correlation** — Link setup changes to performance changes

---

## Related Files

| File | Purpose |
|------|---------|
| `packages/server/src/driverbox/services/idp/driver-memory.service.ts` | Core memory service |
| `packages/server/src/services/ai/post-session-learner.ts` | Post-session processing |
| `packages/server/src/services/ai/live-session-analyzer.ts` | Real-time session analysis |
| `packages/server/src/db/repositories/driver-memory.repo.ts` | Database operations |
| `packages/server/src/driverbox/routes/drivers.ts` | API endpoints |
