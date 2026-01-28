# Ok, Box Box - Full System Audit Report
Generated: January 28, 2026

## Executive Summary

This audit covers the complete data flow architecture from relay simulation through hooks to UI components across Driver and Team tiers.

---

## DRIVER TIER AUDIT

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DRIVER TIER DATA FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────────┐    ┌─────────────────────────┐   │
│  │   useRelay   │───▶│  RelayProvider   │───▶│  Mock Telemetry Sim     │   │
│  │  (Context)   │    │  (Auto-connect)  │    │  - Speed, RPM, Gear     │   │
│  └──────────────┘    └──────────────────┘    │  - Fuel, Position       │   │
│         │                                     │  - Track Position       │   │
│         │                                     │  - Other Cars           │   │
│         ▼                                     └─────────────────────────┘   │
│  ┌──────────────┐    ┌──────────────────┐                                   │
│  │useDriverData │───▶│DriverDataProvider│───▶ driverService.ts             │
│  │  (Context)   │    │  (Wraps Layout)  │    │  - fetchDriverProfile()     │
│  └──────────────┘    └──────────────────┘    │  - fetchDriverSessions()    │
│         │                                     │  - fetchDriverStats()       │
│         │                                     │  - Demo fallback data       │
│         ▼                                     └─────────────────────────────┘
│  ┌──────────────┐    ┌──────────────────┐                                   │
│  │ useEngineer  │───▶│  EngineerCore    │───▶ AI Race Engineer             │
│  │  (Hook)      │    │  (Service)       │    │  - Opinion formation        │
│  └──────────────┘    └──────────────────┘    │  - Mental state tracking    │
│                                               │  - Session briefings        │
│                                               └─────────────────────────────┘
└─────────────────────────────────────────────────────────────────────────────┘
```

### Driver Pages Status

| Page | File | Data Source | Relay Connected | Status |
|------|------|-------------|-----------------|--------|
| DriverHome | `driver/DriverHome.tsx` | useRelay, useAuth | ✅ Yes | ✅ Working |
| DriverCockpit | `driver/DriverCockpit.tsx` | useRelay, useEngineer, useVoice, useRaceSimulation | ✅ Yes | ✅ Working |
| DriverPitwall | `driver/DriverPitwall.tsx` | useRelay | ✅ Yes | ⚠️ Needs verification |
| DriverPitwallAdvanced | `driver/DriverPitwallAdvanced.tsx` | useRelay | ✅ Yes | ⚠️ Needs verification |
| DriverProgress | `driver/DriverProgress.tsx` | useDriverData | ❌ Static | ⚠️ Uses mock data |
| DriverHistory | `driver/DriverHistory.tsx` | useDriverData | ❌ Static | ⚠️ Uses mock data |
| DriverSessions | `driver/DriverSessions.tsx` | useDriverData | ❌ Static | ⚠️ Uses mock data |
| DriverStats | `driver/DriverStats.tsx` | useDriverData | ❌ Static | ⚠️ Uses mock data |
| DriverRatings | `driver/DriverRatings.tsx` | useDriverData | ❌ Static | ⚠️ Uses mock data |
| DriverProfilePage | `driver/DriverProfilePage.tsx` | useDriverData | ❌ Static | ⚠️ Uses mock data |
| DriverBlackBox | `driver/DriverBlackBox.tsx` | useRelay, useEngineer | ✅ Yes | ⚠️ Needs verification |
| DriverHUD | `driver/DriverHUD.tsx` | useRelay | ✅ Yes | ⚠️ Needs verification |
| DriverVoice | `driver/DriverVoice.tsx` | useVoice | ❌ Static | ✅ Working |
| ReplayViewer | `driver/ReplayViewer.tsx` | Local state | ❌ Static | ⚠️ Mock only |

### Driver Hooks Analysis

#### useRelay.tsx (PRIMARY TELEMETRY SOURCE)
- **Status**: ✅ WORKING
- **Mock Mode**: Auto-enabled by default
- **Data Provided**:
  - `status`: 'disconnected' | 'connecting' | 'connected' | 'in_session'
  - `telemetry`: TelemetryData (speed, rpm, gear, throttle, brake, fuel, position, etc.)
  - `session`: SessionInfo (trackName, sessionType, timeRemaining)
  - `otherCars`: CarMapPosition[] (for track map)
- **Real Relay**: TODO placeholder at line 231-234
- **Structure Compatibility**: ✅ Ready for real WebSocket connection

#### useDriverData.tsx (PROFILE/HISTORY DATA)
- **Status**: ✅ WORKING
- **Data Provided**:
  - `profile`: DriverIdentityProfile
  - `sessions`: DriverSessionSummary[]
  - `stats`: DriverStatsSnapshot[]
  - `telemetry`: TelemetryData (separate simulation)
  - `raceProgress`: RaceProgress
- **API Fallback**: Falls back to DEMO_* constants when no auth

#### useEngineer.tsx (AI RACE ENGINEER)
- **Status**: ✅ WORKING
- **Depends On**: useRelay, useDriverMemory
- **Provides**: criticalMessages, opinions, sessionBriefing

#### useVoice.tsx (TTS)
- **Status**: ✅ WORKING
- **Provides**: speak(), toggleVoice, isEnabled

---

## TEAM TIER AUDIT

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            TEAM TIER DATA FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────────┐    ┌─────────────────────────┐   │
│  │   useRelay   │───▶│  RelayProvider   │───▶│  Mock Telemetry Sim     │   │
│  │  (Context)   │    │  (Shared w/Drv)  │    │  (Same as Driver)       │   │
│  └──────────────┘    └──────────────────┘    └─────────────────────────┘   │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────┐    ┌──────────────────┐    ┌─────────────────────────┐   │
│  │ useTeamData  │───▶│ TeamDataProvider │───▶│  mockData/data.ts       │   │
│  │  (Context)   │    │  (Wraps Layout)  │    │  - mockDrivers          │   │
│  └──────────────┘    └──────────────────┘    │  - mockTeam             │   │
│         │                                     │  - mockTracks           │   │
│         │                                     │  - mockEvents           │   │
│         │                                     │  - mockRacePlans        │   │
│         │                                     │  - mockRadioChannels    │   │
│         │                                     │  - mockRunPlans         │   │
│         │                                     │  - mockDriverStints     │   │
│         │                                     │  - mockStrategyPlan     │   │
│         │                                     │  - mockRoster           │   │
│         ▼                                     └─────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         TEAM PAGES                                    │   │
│  │  PitwallHome, PitwallStrategy, PitwallRoster, PitwallPractice, etc.  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Team Pages Status

| Page | File | Data Source | Relay Connected | Status |
|------|------|-------------|-----------------|--------|
| TeamDashboard | `TeamDashboard.tsx` | useTeamData, lib/teams | ❌ Static | ⚠️ Partial |
| PitwallHome | `pitwall/PitwallHome.tsx` | useRelay, useTeamData | ✅ Yes | ✅ Working |
| PitwallStrategy | `pitwall/PitwallStrategy.tsx` | useTeamData | ❌ Static | ⚠️ Mock only |
| PitwallRoster | `pitwall/PitwallRoster.tsx` | useTeamData | ❌ Static | ✅ Working |
| PitwallPractice | `pitwall/PitwallPractice.tsx` | useTeamData | ❌ Static | ⚠️ Mock only |
| PitwallEvents | `pitwall/PitwallEvents.tsx` | useTeamData | ❌ Static | ⚠️ Mock only |
| PitwallPlanning | `pitwall/PitwallPlanning.tsx` | useTeamData | ❌ Static | ⚠️ Mock only |
| PitwallReports | `pitwall/PitwallReports.tsx` | Local state | ❌ Static | ⚠️ Mock only |
| PitwallSetups | `pitwall/PitwallSetups.tsx` | Local state | ❌ Static | ⚠️ Mock only |
| StintPlanner | `pitwall/StintPlanner.tsx` | useTeamData | ❌ Static | ⚠️ Mock only |
| RacePlan | `pitwall/RacePlan.tsx` | useTeamData | ❌ Static | ⚠️ Mock only |
| TeamRaceViewer | `pitwall/TeamRaceViewer.tsx` | useRelay, useTeamData | ✅ Yes | ⚠️ Needs verification |
| DriverComparison | `pitwall/DriverComparison.tsx` | useTeamData | ❌ Static | ⚠️ Mock only |
| DriverProfile | `pitwall/DriverProfile.tsx` | useTeamData | ❌ Static | ⚠️ Mock only |
| TeamIncidents | `pitwall/TeamIncidents.tsx` | Local state | ❌ Static | ⚠️ Mock only |

### Team Hooks Analysis

#### useTeamData.tsx (PRIMARY TEAM DATA)
- **Status**: ✅ WORKING
- **Data Provided**:
  - `team`: Team
  - `drivers`: Driver[]
  - `tracks`: Track[]
  - `events`: RaceEvent[]
  - `racePlans`: RacePlan[]
  - `radioChannels`: RadioChannel[]
  - `runPlans`: RunPlan[]
  - `driverStints`: DriverStint[]
  - `strategyPlan`: StrategyPlan
  - `roster`: TeamRoster
- **Helper Functions**: getDriver, getTrack, getEvent, updateStint, addStint, etc.
- **Structure Compatibility**: ✅ Types defined in mockData/types.ts

---

## RELAY STRUCTURE VERIFICATION

### Current Mock Telemetry Structure (useRelay.tsx)

```typescript
interface TelemetryData {
  lapTime: number | null;
  lastLap: number | null;
  bestLap: number | null;
  delta: number | null;
  fuel: number | null;
  fuelPerLap: number | null;
  lapsRemaining: number | null;
  position: number | null;
  lap: number | null;
  speed: number | null;
  gear: number | null;
  rpm: number | null;
  throttle: number | null;
  brake: number | null;
  trackPosition: number | null;  // 0-1 position around track
  sector: number | null;
  inPit: boolean;
  otherCars: CarMapPosition[];
}

interface SessionInfo {
  trackName: string | null;
  sessionType: 'practice' | 'qualifying' | 'race' | null;
  timeRemaining: number | null;
  lapsRemaining: number | null;
}
```

### Real Relay Requirements (for future implementation)

The mock structure is **compatible** with iRacing telemetry. Key mappings:
- `trackPosition` → `LapDistPct` (0-1)
- `speed` → `Speed` (m/s, convert to mph/kph)
- `rpm` → `RPM`
- `gear` → `Gear`
- `throttle` → `Throttle` (0-100)
- `brake` → `Brake` (0-100)
- `fuel` → `FuelLevel` (liters)
- `position` → `PlayerCarPosition`
- `lap` → `Lap`

---

## SERVICES AUDIT

### EngineerCore.ts
- **Purpose**: AI Race Engineer with opinions
- **Status**: ✅ Implemented
- **Features**:
  - Opinion formation based on telemetry
  - Mental state tracking (tilt, fatigue, confidence)
  - Session briefings
  - Message generation with urgency levels

### RacecraftIntelligence.ts
- **Purpose**: Racing strategy analysis
- **Status**: ✅ Implemented
- **Features**:
  - Overtaking opportunity detection
  - Defensive positioning
  - Traffic analysis

### VoiceService.ts
- **Purpose**: Text-to-speech for engineer callouts
- **Status**: ✅ Implemented
- **Features**:
  - Browser TTS integration
  - Voice selection
  - Rate/pitch control

### mockData/MockTelemetryService.ts
- **Purpose**: Standalone telemetry simulation
- **Status**: ✅ Implemented
- **Note**: Separate from useRelay mock - used for specific components

---

## IDENTIFIED GAPS

### Critical
1. **Real WebSocket connection** - TODO placeholder in useRelay.tsx (line 231-234)
2. **No live telemetry to Team pages** - PitwallStrategy, StintPlanner use static mock data

### Medium
3. **Driver tier pages not using useDriverData** - Some pages have local mock data
4. **No real-time sync** between Driver and Team tier telemetry views
5. **Replay system** - Uses local mock data, not connected to session history

### Low
6. **Unused imports** - Various lint warnings across files
7. **Mock data duplication** - Some pages have inline mock data instead of using services

---

## RECOMMENDATIONS

1. **Phase 1**: Verify all pages render with current mock data
2. **Phase 2**: Consolidate all mock data to use hooks consistently
3. **Phase 3**: Implement real WebSocket relay connection
4. **Phase 4**: Add real-time sync between tiers

---

## BLOCKER OVERLAY SYSTEM

The DevAuditOverlay component will:
1. Scan DOM for all interactive elements (buttons, links, inputs)
2. Overlay numbered markers on each element
3. Generate a checklist for systematic testing
4. Be toggleable via `Ctrl+Shift+A`
5. Persist state in localStorage

See: `src/components/DevAuditOverlay.tsx`
