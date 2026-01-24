# Legacy Meat Inventory Report

**Source:** `packages/dashboard/src/`  
**Date:** 2026-01-23  
**Purpose:** Identify operational UI components to port to v1 consolidation

---

## 🥩 THE MEAT - Ready to Port

### 1. Team Layout (Pitwall Shell)
**File:** `layouts/TeamLayout.tsx` (98 lines)  
**What it does:** Left sidebar navigation with race control aesthetic  
**Nav items:** Home, Roster, Events, Planning, Setups, Strategy, Practice, Reports, Track Intel  
**Data required:** User auth state  
**Port status:** ✅ Port as-is (update styling to match v1 design system)

---

### 2. Team Pitwall (Live Session View)
**File:** `pages/team/TeamPitwall.tsx` (143 lines)  
**What it does:** Live session monitoring - connection status, session state, driver info  
**Data required:**
- `socketClient` connection events
- Session state (practice/qual/race/offline)
- Driver info (displayName, custId, discipline)
- Team info (teamId, name)  
**Port status:** ✅ Port as-is, wire to Relay socket

---

### 3. Team Strategy (Stint Planning + Fuel Calc)
**File:** `pages/team/TeamStrategy.tsx` (284 lines)  
**What it does:** 
- Stint plan table (driver, laps, fuel load, tire compound)
- Fuel calculator (race laps × fuel/lap + reserve)
- Pit time loss calculations
- Tire compound badges (soft/medium/hard/wet)  
**Data required:**
```typescript
interface StrategyPlan {
  id: string;
  event_name: string;
  race_duration: string;
  total_laps: number;
  fuel_per_lap: number;
  tank_capacity: number;
  pit_time_loss: number;
  stints: StintPlan[];
}

interface StintPlan {
  stint: number;
  driver: string;
  driver_name: string;
  start_lap: number;
  end_lap: number;
  fuel_load: number;
  tire_compound: 'soft' | 'medium' | 'hard' | 'wet';
  notes?: string;
}
```
**Port status:** ✅ Port as-is, excellent operational UI

---

### 4. Team Planning (Event Calendar + Driver Availability)
**File:** `pages/team/TeamPlanning.tsx` (335 lines)  
**What it does:**
- Event calendar (practice, qualifying, race, endurance)
- Driver availability matrix
- Event status tracking (scheduled/confirmed/in_progress/completed)  
**Data required:**
```typescript
interface PlanEvent {
  id: string;
  name: string;
  type: 'practice' | 'qualifying' | 'race' | 'endurance';
  track: string;
  date: string;
  time: string;
  duration: string;
  drivers: string[];
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed';
  notes?: string;
}

interface DriverAvailability {
  driver_id: string;
  display_name: string;
  available: boolean;
  notes?: string;
}
```
**Port status:** ✅ Port as-is

---

### 5. Team Roster (Driver Management)
**File:** `pages/team/TeamRoster.tsx` (335 lines)  
**What it does:**
- Driver cards with iRating, safety rating, traits
- Role badges (owner, team_principal, team_engineer, driver)
- Session/lap/incident stats
- Invite driver modal  
**Data required:** `TeamRosterView`, `DriverSummaryForTeam` from `types/team.types.ts`  
**Port status:** ✅ Port as-is

---

### 6. Team Practice (Run Plans + Stint Analysis)
**File:** `pages/team/TeamPractice.tsx` (248 lines)  
**What it does:**
- Run plan cards (target laps, focus areas, status)
- Driver stint table (laps, best/avg lap, consistency %, incidents)  
**Data required:**
```typescript
interface RunPlan {
  id: string;
  name: string;
  target_laps: number;
  completed_laps: number;
  target_time?: string;
  focus: string[];
  status: 'planned' | 'in_progress' | 'completed';
}

interface DriverStint {
  driver_id: string;
  driver_name: string;
  laps: number;
  best_lap: string;
  avg_lap: string;
  consistency: number;
  incidents: number;
}
```
**Port status:** ✅ Port as-is

---

### 7. Team Reports (AI Debriefs)
**File:** `pages/team/TeamReports.tsx` (289 lines)  
**What it does:**
- Event debrief summaries
- Per-driver headlines and primary limiters
- Team-level observations and common patterns
- Priority focus recommendations  
**Data required:**
```typescript
interface TeamDebrief {
  event_id: string;
  event_name: string | null;
  session_id: string;
  driver_summaries: Array<{
    driver_profile_id: string;
    display_name: string;
    headline: string;
    primary_limiter: string;
  }>;
  team_summary: {
    overall_observation: string;
    common_patterns: string[];
    priority_focus: string;
  } | null;
  status: string;
}
```
**Port status:** ✅ Port as-is

---

### 8. Team Setups
**File:** `pages/team/TeamSetups.tsx` (9054 bytes)  
**What it does:** Setup sharing and management  
**Port status:** ✅ Port as-is

---

### 9. Driver Profile Page (IDP Deep View)
**File:** `pages/team/DriverProfilePage.tsx` (903 lines - LARGE)  
**What it does:**
- Full driver profile with bio, discipline, timezone
- iRacing stats (iRating history, safety rating, license class)
- Driver targets (lap time, consistency, safety goals)
- Session history table
- Performance traits  
**Data required:** `DriverProfile`, `DriverTrait`, `SessionMetric`, `PerformanceData`, `iRacingStats`, `DriverTarget`  
**Port status:** ✅ Port as-is (this is the IDP surface)

---

### 10. Driver HUD (Live Telemetry Display)
**File:** `components/DriverHUD.tsx` (352 lines)  
**What it does:**
- Speed/gear/RPM display
- Fuel level and laps remaining
- Tire wear (FL/FR/RL/RR)
- Position and gaps
- PTT voice recording to AI engineer  
**Data required:**
```typescript
interface TelemetryData {
  speed: number;
  rpm: number;
  rpmMax: number;
  gear: number;
  fuelLevel: number;
  fuelPerLap: number;
  lapsRemaining: number;
  tireWear: { fl: number; fr: number; rl: number; rr: number };
  position: number;
  totalCars: number;
  gapAhead: number | null;
  gapBehind: number | null;
  lapNumber: number;
  lastLapTime: number | null;
  bestLapTime: number | null;
  delta: number | null;
}
```
**Port status:** ✅ Port as-is (Driver runtime view)

---

### 11. Strategy Panel (Live Strategy Data)
**File:** `components/StrategyPanel.tsx` (195 lines)  
**What it does:**
- Live fuel percentage and level
- Tire wear grid (FL/FR/RL/RR)
- Damage indicators (aero, engine)
- Pit status  
**Data required:** `StrategyUpdate` from socket  
**Port status:** ✅ Port as-is

---

### 12. Live Timing
**File:** `components/timing/LiveTiming.tsx` (7297 bytes)  
**What it does:** Live timing board  
**Port status:** ✅ Port as-is

---

### 13. Track Map
**File:** `components/session/TrackMap.tsx` (13534 bytes)  
**What it does:** Visual track map with car positions  
**Port status:** ✅ Port as-is

---

### 14. Supporting Components
| File | Purpose | Port? |
|------|---------|-------|
| `components/team/CarStatusPane.tsx` | Car status display | ✅ |
| `components/team/DriverCard.tsx` | Driver card component | ✅ |
| `components/team/DriverDrawer.tsx` | Driver detail drawer | ✅ |
| `components/team/EventLog.tsx` | Event log display | ✅ |
| `components/team/OpponentIntelPane.tsx` | Opponent analysis | ✅ |
| `components/team/RaceStatePane.tsx` | Race state display | ✅ |
| `components/team/TeamDashboard.tsx` | Team dashboard | ✅ |
| `components/session/SessionHeader.tsx` | Session header | ✅ |

---

### 15. Type Definitions
**File:** `types/team.types.ts` (121 lines)  
**Contains:** Team, TeamRosterView, DriverSummaryForTeam, DriverProfile, DriverTrait, SessionMetric, PerformanceData  
**Port status:** ✅ Move to `packages/contracts`

---

### 16. Stores (State Management)
| File | Purpose |
|------|---------|
| `stores/auth.store.ts` | Auth state |
| `stores/session.store.ts` | Session state |
| `stores/events.store.ts` | Events state |
| `stores/reports.store.ts` | Reports state |

---

### 17. Hooks
| File | Purpose |
|------|---------|
| `hooks/useSessionSocket.ts` | Socket connection for sessions |
| `hooks/useBootstrap.tsx` | App initialization |

---

## 📁 Files to Port (Priority Order)

### Phase 1: Pitwall Shell
1. `layouts/TeamLayout.tsx` → Layout with left nav
2. `pages/team/TeamHome.tsx` → Home dashboard
3. `pages/team/TeamPitwall.tsx` → Live session view

### Phase 2: Operational Tools
4. `pages/team/TeamRoster.tsx` → Driver management
5. `pages/team/TeamPlanning.tsx` → Event planning
6. `pages/team/TeamStrategy.tsx` → Stint/fuel planning
7. `pages/team/TeamPractice.tsx` → Practice analysis
8. `pages/team/TeamReports.tsx` → AI debriefs

### Phase 3: Driver Surface
9. `pages/team/DriverProfilePage.tsx` → IDP deep view
10. `components/DriverHUD.tsx` → Live driver HUD

### Phase 4: Live Components
11. `components/StrategyPanel.tsx`
12. `components/timing/LiveTiming.tsx`
13. `components/session/TrackMap.tsx`

---

## 🔌 Data Contracts Needed

Move to `packages/contracts/`:
- `SessionState` (live timing board)
- `StintPlan` (driver assignments + stint length + pit window)
- `FuelModel` (fuel per lap, remaining, required)
- `DriverMetrics` (consistency, incidents, pace targets)
- `TelemetryData` (from DriverHUD)
- `StrategyUpdate` (from StrategyPanel)

---

## ⚠️ Refactor Notes

1. **Socket client:** Currently uses `lib/socket-client.ts` - need to wire to Relay
2. **Auth store:** Currently uses Zustand - integrate with Supabase auth
3. **Styling:** Uses custom CSS + Tailwind - align with v1 design tokens
4. **Demo mode:** All pages have mock data fallback - keep for development

---

## ✅ Summary

**Total files to port:** ~25 files  
**Total lines of operational UI:** ~4,500+ lines  
**Port complexity:** Medium (mostly copy + restyle)  
**Data contracts needed:** 6 core types  

**THE MEAT EXISTS AND IS SUBSTANTIAL.**
