# Forensic Telemetry & Driver-Tier Audit
**Date:** 2026-02-23  
**Scope:** Line-by-line audit of every driver-facing component, data hook, server handler, and inference engine  
**Method:** Trace every data field from iRacing shared memory → Python relay → Server → Dashboard display

---

## TABLE OF CONTENTS
1. [Data Pipeline Overview](#1-data-pipeline-overview)
2. [Relay Layer Audit](#2-relay-layer)
3. [Server Layer Audit](#3-server-layer)
4. [useRelay Hook Audit](#4-userelay-hook)
5. [Component-by-Component Audit](#5-component-audit)
6. [Bugs Found & Fixed](#6-bugs-found--fixed)
7. [Remaining Known Issues](#7-remaining-known-issues)
8. [Verification Status](#8-verification-status)

---

## 1. DATA PIPELINE OVERVIEW

```
iRacing Shared Memory
    ↓ pyirsdk (60Hz)
Python Relay (iracing_relay.py)
    ↓ local socket.io (port 9999)
Electron Bridge (python-bridge-simple.ts)
    ↓ socket.io (dual-ship)
    ├── Production Server (octopus-app-qsi3i.ondigitalocean.app)
    └── Local Standalone Server (localhost:3001)
         ↓
    TelemetryHandler.ts
    ├── 60Hz path: telemetry → timing:update, telemetry_update, telemetry:driver, session_info, competitor_data
    ├── 1Hz path: strategy_raw → InferenceEngine → car:status, strategy:update
    ├── Async: SituationalAwareness → engineer:update
    ├── Edge: ProactiveSpotter → spotter:callout
    └── ~0.1Hz: LiveSessionAnalyzer → race:intelligence
         ↓
    Dashboard (apps/app via useRelay hook)
    ├── LiveCockpit (in-car minimal view)
    ├── DriverBlackBox (dense telemetry view)
    ├── DriverCockpit (track map + sidebars)
    ├── DriverPitwall (crew-focused view)
    ├── DriverPitwallAdvanced (power user panels)
    └── packages/dashboard (CrewEngineerPage, DriverHUD, DriverStatusPanel)
```

---

## 2. RELAY LAYER

### File: `apps/relay/python/iracing_relay.py`

| Line | Field | iRacing Source | Unit | Status |
|------|-------|---------------|------|--------|
| 170 | `speed` | `ir['Speed']` | m/s | ✅ Raw, server converts |
| 171 | `rpm` | `ir['RPM']` | RPM | ✅ |
| 172 | `gear` | `ir['Gear']` | int | ✅ |
| 173 | `throttle` | `ir['Throttle']` | 0.0–1.0 | ✅ |
| 174 | `brake` | `ir['Brake']` | 0.0–1.0 | ✅ |
| 175 | `clutch` | `ir['Clutch']` | 0.0–1.0 | ✅ Not displayed anywhere |
| 176 | `steeringAngle` | `ir['SteeringWheelAngle']` | radians | ✅ Used by inference engine |
| 177 | `position` | `ir['PlayerCarPosition']` | int | ✅ |
| 178 | `classPosition` | `ir['PlayerCarClassPosition']` | int | ✅ Not displayed (single-class) |
| 179 | `lap` | `ir['Lap']` | int | ✅ |
| 180 | `lapsCompleted` | `ir['LapCompleted']` | int | ✅ |
| 181 | `lapDistPct` | `ir['LapDistPct']` | 0.0–1.0 | ✅ Track map position |
| 182 | `lastLapTime` | `ir['LapLastLapTime']` | seconds | ✅ |
| 183 | `bestLapTime` | `ir['LapBestLapTime']` | seconds | ✅ |
| 184 | `deltaToSessionBest` | `ir['LapDeltaToSessionBestLap']` | seconds | ✅ |
| 185 | `deltaToOptimalLap` | `ir['LapDeltaToOptimalLap']` | seconds | ✅ Not displayed |
| 186 | `fuelLevel` | `ir['FuelLevel']` | liters | ✅ |
| 187 | `fuelPct` | `ir['FuelLevelPct']` | 0.0–1.0 | ✅ |
| 188 | `fuelUsePerHour` | `ir['FuelUsePerHour']` | L/hr | ✅ |
| 224 | `brakeBias` | `ir['dcBrakeBias']` | % | 🔧 **FIXED** — was `ir.get()` |
| 230 | `onPitRoad` | `ir['OnPitRoad']` | bool | ✅ |
| 231 | `isOnTrack` | `ir['IsOnTrack']` | bool | ✅ |
| 232 | `incidentCount` | `ir['PlayerCarMyIncidentCount']` | int | ✅ |
| 240 | `trackTemp` | `ir['TrackTemp']` | °C | ✅ Cached for voice AI only |
| 241 | `airTemp` | `ir['AirTemp']` | °C | ✅ Cached for voice AI only |
| 242 | `humidity` | `ir['RelativeHumidity']` | 0.0–1.0 | ⚠️ Not converted to % for dashboard |
| 243 | `windSpeed` | `ir['WindVel']` | m/s | ⚠️ Not converted to human units |
| 244 | `windDir` | `ir['WindDir']` | radians | ⚠️ Not converted to compass |
| 260 | `standings[]` | `CarIdx*` arrays | array | ✅ Top 20 cars |
| 411 | `brakeBias` (strategy) | `ir['dcBrakeBias']` | % | 🔧 **FIXED** — was `ir.get()` |

### Relay Dual-Ship

| Target | URL | Status |
|--------|-----|--------|
| Cloud | `https://octopus-app-qsi3i.ondigitalocean.app` | ✅ Confirmed |
| Local | `http://localhost:3001` | ✅ Confirmed |

---

## 3. SERVER LAYER

### File: `packages/server/src/websocket/TelemetryHandler.ts`

#### 60Hz Telemetry Path (lines 75–363)

| Line | Action | Detail | Status |
|------|--------|--------|--------|
| 80 | Receive `telemetry` | Raw from relay | ✅ |
| 85 | First-packet log | Logs keys for debugging | ✅ |
| 95 | Cache for voice AI | `updateTelemetryCache('live', {...})` | ✅ |
| 105 | Speed conversion | `car.speed * 2.237` → mph for cache | ✅ |
| 109 | Throttle/brake | `* 100` for percentage | ✅ |
| 125 | Weather | Cached for voice AI | ✅ |
| 140 | Validate | `relayAdapter.handleTelemetry(data)` | ✅ |
| 200 | Session tracking | Updates `activeSessions` map | ✅ |
| 204 | Track name | Defaults to `'Unknown Track'` | ⚠️ C2: Never updated from telemetry |
| 280 | `timing:update` | Emitted to session room | ✅ |
| 310 | `telemetry_update` | LROC format (speed in mph, throttle/brake in %) | ✅ |
| 330 | `session_info` | Track, session, weather, driver | ⚠️ Emitted at 60Hz (wasteful) |
| 340 | `telemetry:driver` | Full raw data to driver clients | ✅ |
| 360 | `competitor_data` | Sorted standings | ⚠️ Emitted at 60Hz (wasteful) |

#### 1Hz Strategy Path (lines 463–741)

| Line | Action | Detail | Status |
|------|--------|--------|--------|
| 464 | Receive `strategy_raw` | Raw from relay | ✅ |
| 474 | Inference engine | `engine.processStrategyRaw(data)` | ✅ |
| 476 | Get inferred | `engine.getInferredStrategy(rawCar)` | ✅ |
| 491 | Cache strategy | Tire wear, temps, fuel, damage, engine, gaps | ✅ |
| 530 | LiveSessionAnalyzer | Feed accumulated intelligence | ✅ |
| 556 | `race:intelligence` | Emitted ~every 10s | ✅ |
| 573 | ProactiveSpotter | Edge-triggered callouts | ✅ |
| 605 | `strategy:update` | Full computed strategy | ✅ |
| 630 | `car:status` | Inferred values for dashboard | ✅ |
| 670 | SituationalAwareness | GPT-powered analysis (async) | ✅ |
| 728 | `engineer:update` | AI callouts | ✅ |

### File: `packages/server/src/websocket/inference-engine.ts`

| Feature | Method | Algorithm | Status |
|---------|--------|-----------|--------|
| Tire wear | `computeWearForLap()` | Temp-based degradation model (optimal 80–110°C, front bias 1.15, rear 0.90) | ✅ Reasonable model |
| Pit tracking | `updatePitTracking()` | onPitRoad transition detection, resets tires on pit exit | ✅ |
| Aero damage | `updateDamageInference()` | Top speed loss vs baseline (>5% = full damage) | ✅ Conservative |
| Engine damage | `updateDamageInference()` | Oil/water temp deviation + oil pressure drop | ✅ |
| Fuel per lap | `processStrategyRaw()` | `(usePerHour / 3600) * bestLapTime` | ✅ Correct formula |
| Gap to leader | `computeGaps()` | `f2Time` (iRacing native) with lap fraction fallback | ✅ |
| Gap to car ahead | `computeGaps()` | `estTime` differential | ✅ |
| Brake pressure | `computeBrakePressure()` | `brake * brakeBias` split to corners | ✅ |

### File: `packages/server/src/standalone.ts`

| Feature | Status | Notes |
|---------|--------|-------|
| No inference engine | ⚠️ | Strategy data not computed in standalone mode |
| Speed conversion | ✅ | `speed * 2.237` for mph |
| Throttle/brake % | ✅ | `* 100` |
| Standings sort | ✅ | Sorted by position |
| Session tracking | ✅ | Basic `activeSessions` map |

---

## 4. useRelay HOOK AUDIT

### File: `apps/app/src/hooks/useRelay.tsx`

#### Event Handlers

| Event | Handler | Fields Extracted | Status |
|-------|---------|-----------------|--------|
| `session_info` | L267 | trackName, sessionType, timeRemaining, lapsRemaining | ✅ |
| `session:active` | L278 | trackName, sessionType | ✅ |
| `session:metadata` | L288 | trackName, sessionType | ✅ |
| `telemetry_update` | L329 | Via `handleTelemetryData` | ✅ |
| `telemetry:driver` | L333 | Via `handleTelemetryData` + standings extraction | ✅ |
| `competitor_data` | L373 | otherCars array | ✅ |
| `car:status` | L393 | Strategy: tireWear, tireTemps, damage, engine, brakes, fuel, gaps, pit | ✅ |
| `engineer:update` | L418 | AI callouts | ✅ |
| `race:intelligence` | L428 | Full intelligence object | ✅ |
| `spotter:callout` | L434 | Edge-triggered callouts | ✅ |
| `incident:new` | L460 | Incident details | ✅ |
| `session:end` | L450 | Reset all state | ✅ |

#### `handleTelemetryData` Field Mapping (L299–327)

| Field | Source | Conversion | Status |
|-------|--------|-----------|--------|
| `lapTime` | `driverData.lapTime` | None | ✅ |
| `lastLap` | `driver.lastLapTime` | None (seconds) | ✅ |
| `bestLap` | `driver.bestLapTime` | None (seconds) | ✅ |
| `delta` | `deltaToSessionBest` | None (seconds) | ✅ |
| `fuel` | `fuel.level` or `fuelLevel` | None (liters) | ✅ |
| `fuelPerLap` | `prev.fuelPerLap` | 🔧 **FIXED** — was `fuelUsePerHour / 60` (L/min not L/lap) |
| `position` | `driver.position` | None | ✅ |
| `lap` | `driver.lapNumber` | None | ✅ |
| `speed` | `car.speed * 2.237` | m/s → mph | ✅ |
| `gear` | `car.gear` | None | ✅ |
| `rpm` | `car.rpm` | None | ✅ |
| `throttle` | `car.throttle * 100` | 0–1 → 0–100% | ✅ |
| `brake` | `car.brake * 100` | 0–1 → 0–100% | ✅ |
| `trackPosition` | `driver.lapDistPct` | None (0–1) | ✅ |
| `inPit` | `car.onPitRoad` | None | ✅ |
| `otherCars` | `prev.otherCars` | Updated by standings extraction | ✅ |
| `strategy` | `prev.strategy` | Updated by `car:status` handler | ✅ |

#### Standings Extraction (L348–370)

| Field | Source | Status |
|-------|--------|--------|
| `trackPercentage` | `driver.lapDistPct` | ✅ |
| `carNumber` | `driver.carNumber` | ✅ |
| `driverName` | `driver.driverName` | ✅ |
| `position` | `driver.position` | ✅ |
| `gap` | `driver.gapToLeader` formatted | ✅ |
| `lastLap` | `driver.lastLapTime` formatted | ✅ |
| `isPlayer` | `driver.isPlayer` or `carIdx` match | ✅ |

---

## 5. COMPONENT-BY-COMPONENT AUDIT

### 5.1 LiveCockpit (`apps/app/src/pages/driver/states/LiveCockpit.tsx`)

**Purpose:** Minimal in-car view. Voice-first philosophy.

| Line | Display | Data Source | Unit | Status |
|------|---------|------------|------|--------|
| 155 | Session type | `session.sessionType` | string | ✅ |
| 157 | Track name | `session.trackName` | string | ✅ |
| 160–167 | Fuel laps (header) | `telemetry.strategy.fuelLapsRemaining` | int | 🔧 **FIXED** — was showing "L" suffix |
| 198 | Position | `telemetry.position` | P# | ✅ |
| 202 | Lap | `telemetry.lap` | int | ✅ |
| 207–216 | Sector indicator | `telemetry.sector` | 1/2/3 | ⚠️ Sector data not populated by relay |
| 227 | Speed | `telemetry.speed` | mph | ✅ (useRelay converts) |
| 228 | Speed unit | "mph" | label | ✅ |
| 233 | Gear | `telemetry.gear` | int | ✅ |
| 239 | RPM bar | `telemetry.rpm / 8000` | % | ⚠️ Hardcoded 8000 max |
| 247–258 | Delta | `telemetry.delta` | ±seconds | ✅ |
| 266 | Last lap | `telemetry.lastLap` via `formatTime()` | M:SS.mmm | ✅ Correct formatter |
| 270 | Best lap | `telemetry.bestLap` via `formatTime()` | M:SS.mmm | ✅ |
| 288 | Fuel level | `telemetry.fuel` | liters | ✅ |
| 292 | Fuel per lap | `telemetry.fuelPerLap` | L/lap | ✅ (now from server) |
| 300 | Fuel bar | `telemetry.fuel / 20` | % | ⚠️ Hardcoded 20L max tank |
| 312 | Throttle | `telemetry.throttle` | % | ✅ |
| 324 | Brake | `telemetry.brake` | % | ✅ |
| 339 | Gap ahead | `telemetry.strategy.gapToCarAhead` | seconds | ✅ |
| 343 | Gap to leader | `telemetry.strategy.gapToLeader` | seconds | ✅ |
| 359 | Tire stint laps | `telemetry.strategy.tireStintLaps` | int | ✅ |
| 362–376 | Tire wear (4 corners) | `telemetry.strategy.tireWear[corner]` | 0–100% | ✅ |
| 386–416 | Damage (aero/engine) | `telemetry.strategy.damageAero/Engine` | 0–100% | ✅ |
| 414 | Pit stops | `telemetry.strategy.pitStops` | int | ✅ |
| 422–443 | Engine health | `telemetry.strategy.engine` | °C, V | ✅ |
| 448–595 | Race Intelligence | `raceIntelligence.*` | various | ✅ All fields mapped |

**AI Alerts (L52–108):**
- Fuel critical (<2 laps) → ✅
- Fuel warning (<5 laps) → ✅
- Damage warning (>0.3) → ✅
- Tire critical (<0.15) → ✅
- Tire warning (<0.3) → ✅
- Pace good (delta < -0.5) → ✅

### 5.2 DriverBlackBox (`apps/app/src/pages/driver/DriverBlackBox.tsx`)

**Purpose:** Dense telemetry view, similar to LiveCockpit but with different layout.

| Line | Display | Status |
|------|---------|--------|
| 181 | Session type | ✅ |
| 185 | Track name | ✅ |
| 190–197 | Fuel laps (header) | 🔧 **FIXED** — was using `telemetry.lapsRemaining` (always null) |
| 229–231 | Position | ✅ |
| 236–238 | Lap | ✅ |
| 244–253 | Sector indicator | ⚠️ Sector not populated |
| 265 | Speed (mph) | ✅ |
| 279 | RPM bar | ⚠️ Hardcoded 8000 max |
| 289–303 | Delta | ✅ |
| 312 | Last lap | ✅ Correct seconds formatter |
| 316 | Best lap | ✅ |
| 327–330 | Fuel laps display | 🔧 **FIXED** — now uses `strategy.fuelLapsRemaining` |
| 335 | Fuel level | ✅ |
| 339 | Fuel per lap | ✅ (now from server) |
| 345–346 | Fuel bar color | 🔧 **FIXED** — now uses `strategy.fuelLapsRemaining` |
| 361–377 | Throttle/Brake | ✅ |
| 383–396 | Gaps | 🔧 **FIXED** — was hardcoded "+2.341" / "-1.892" |

**AI Alerts (L40–95):**
- Fuel alerts use `telemetry.fuel / telemetry.fuelPerLap` → ⚠️ `fuelPerLap` was wrong (M5), now fixed
- PB lap detection (`lastLap <= bestLap`) → ✅

### 5.3 DriverCockpit (`apps/app/src/pages/driver/DriverCockpit.tsx`)

**Purpose:** Track map + sidebars. Glanceable second monitor view.

| Line | Display | Status |
|------|---------|--------|
| 36 | Gap ahead | ✅ From strategy |
| 37 | Fuel laps | ✅ From strategy |
| 38 | Has damage | ✅ |
| 44 | Position | ✅ |
| 44 | Delta | ⚠️ Falls back to 0 instead of null |
| 123 | Position display | ✅ |
| 128 | Delta display | 🔧 **FIXED** — label said "to leader" but value is delta to best |
| 143 | Last lap | ✅ Correct formatter |
| 147 | Best lap | ✅ |
| 160 | Fuel level | ✅ |
| 164 | Fuel laps | ✅ From strategy |
| 168 | Gap ahead | ✅ |
| 172 | Gap to leader | ✅ |
| 176 | Pit stops | ✅ |
| 188–214 | Tire wear + temps | ✅ From strategy, with temp color coding |
| 220–280 | Damage + engine | ✅ |
| 322–328 | Track map | ✅ Uses `TrackMap` component with `carPosition` and `otherCars` |
| 336 | Speed overlay | ✅ mph |
| 389–419 | Leaderboard | ✅ From `otherCars` |
| 434–452 | Team radio | ✅ From `engineerMessages` |

### 5.4 DriverPitwall (`apps/app/src/pages/driver/DriverPitwall.tsx`)

**Purpose:** Crew-focused view with Engineer, Spotter, Analyst panels.

| Line | Display | Status |
|------|---------|--------|
| 314 | Track name | ✅ |
| 322 | Position | ✅ |
| 328 | Lap | ✅ |
| 361 | Fuel level | ✅ |
| 367 | Fuel per lap | ✅ (now from server) |
| 373 | Laps remaining | ⚠️ Uses `telemetry.lapsRemaining` (always null from 60Hz) |
| 425 | Last lap | ✅ |
| 431 | Best lap | ✅ |
| 436–451 | Delta | ✅ |
| 513–514 | Fuel critical banner | ✅ Uses `fuel / fuelPerLap` |

**Engineer Insights (L51–96):**
- Uses `telemetry.fuel / telemetry.fuelPerLap` for fuel laps → ✅ (fuelPerLap now correct)
- Compares against `telemetry.lapsRemaining` → ⚠️ Always null, so fuel window never triggers

**Spotter Calls (L99–119):**
- Hardcoded messages based on position → ⚠️ Not using live spotter data from server

### 5.5 DriverPitwallAdvanced (`apps/app/src/pages/driver/DriverPitwallAdvanced.tsx`)

**Purpose:** Power user dense telemetry panels.

| Line | Display | Status |
|------|---------|--------|
| 128 | Last lap | ✅ |
| 132 | Best lap | ✅ |
| 137–152 | Delta | ✅ |
| 150 | Gap ahead | 🔧 **FIXED** — was hardcoded mock data |
| 154 | Gap behind | 🔧 **FIXED** — now shows "--" (not forwarded yet) |
| 158 | Gap to leader | 🔧 **FIXED** — now from live strategy |
| 184 | Fuel level | ✅ |
| 190 | Fuel per lap | ✅ |
| 198 | Laps remaining | ⚠️ Uses `telemetry.lapsRemaining` (always null) |
| 235 | Speed | ✅ mph |
| 252 | RPM | ⚠️ Hardcoded 8000 max |
| 275 | Tire stint laps | 🔧 **FIXED** — was "Mock Data" label |
| 283–303 | Tire temps + wear | 🔧 **FIXED** — was hardcoded mock, now live |
| 316–339 | Weather | 🔧 **FIXED** — was hardcoded mock, now shows "--" with explanation |

### 5.6 DriverHUD (`packages/dashboard/src/components/DriverHUD.tsx`)

**Purpose:** Lovely-inspired HUD overlay. Uses `telemetry:driver` event.

| Line | Display | Status |
|------|---------|--------|
| 273 | Speed | ✅ |
| 273 | Speed unit | 🔧 **FIXED** — was "KPH", now "MPH" |
| 187–191 | Lap time formatter | 🔧 **FIXED** — was expecting ms, now handles seconds |
| 252 | Position | ✅ |
| 258 | Gap ahead | ✅ |
| 262 | Gap behind | ✅ |
| 270 | Gear | ✅ |
| 282 | Lap number | ✅ |
| 287 | Last lap | ✅ (formatter fixed) |
| 291 | Best lap | ✅ (formatter fixed) |
| 300 | Fuel level | ✅ |
| 305–317 | Tire wear (4 corners) | ✅ |

### 5.7 CrewEngineerPage (`packages/dashboard/src/pages/driver/CrewEngineerPage.tsx`)

**Purpose:** Race engineer interface with live telemetry + voice PTT.

| Line | Display | Event Source | Status |
|------|---------|-------------|--------|
| 91 | Telemetry | `telemetry_update` | ✅ Pre-converted by server |
| 95 | Competitors | `competitor_data` | ✅ |
| 247 | Speed (mph) | Pre-converted | ✅ |
| 252 | Gear | ✅ |
| 256 | Lap | ✅ |
| 260 | Position | ✅ |
| 264 | Fuel (L) | ✅ |
| 269 | Last lap | ✅ |
| 273 | Best lap | ✅ |
| 282 | Throttle bar | ✅ |
| 289 | Brake bar | ✅ |
| 304–316 | Standings | ✅ |

### 5.8 DriverStatusPanel (`packages/dashboard/src/components/DriverStatusPanel.tsx`)

**Purpose:** Annunciator panel — NOT a data display.

| Line | Display | Status |
|------|---------|--------|
| 268 | Relay status | ✅ |
| 275 | Voice status | ✅ |
| 280 | AI status | ✅ |
| 287 | Session type | ✅ |
| 81–83 | Telemetry flow | ✅ Just confirms relay connected |

### 5.9 LiveSpotter (`apps/app/src/components/LiveSpotter.tsx`)

**Purpose:** Client-side proximity detection from track positions.

| Feature | Status | Notes |
|---------|--------|-------|
| Proximity calculation | ✅ | Uses `trackPercentage` distance |
| Left/right detection | ⚠️ | Uses position number as proxy for lateral position (L154) — inaccurate |
| Gap ahead/behind | ✅ | Track percentage distance |
| Position change detection | ✅ | Compares current vs last position |
| Callout cooldown | ✅ | Priority-based cooldown system |
| Audio playback | ⚠️ | Placeholder only — logs to console |
| `formatGap()` | ⚠️ | Assumes 1% track = 1 second — very rough approximation |

### 5.10 TrackMapPro (`apps/app/src/components/TrackMapPro/index.tsx`)

**Purpose:** SVG track map with car positions.

| Feature | Status | Notes |
|---------|--------|-------|
| Track geometry loading | ✅ | Uses `useTrackData` hook |
| Car position rendering | ✅ | From `carPosition` prop |
| Other cars rendering | ✅ | From `otherCars` prop |
| Zoom/pan | ✅ | Mouse wheel zoom |
| Turn labels | ⚠️ | Disabled — "need accurate track data calibration" |
| Track slug mapping | ✅ | `TRACK_SLUG_MAP` lookup |

### 5.11 DriverComparison (`apps/app/src/pages/pitwall/DriverComparison.tsx`)

**Purpose:** Side-by-side driver telemetry comparison (team feature).

| Feature | Status | Notes |
|---------|--------|-------|
| Driver selection | ✅ | Dropdown selectors |
| Mock data | Disabled | `_generateLaps` and `_generateTelemetryTrace` prefixed with `_` |
| Empty state | ✅ | Shows "Select Two Drivers" prompt |
| Live data integration | ❌ | No live data — starts with empty `drivers[]` array |
| Null safety | ✅ | PR1 fix verified — early return when `!driver1 || !driver2` |

---

## 6. BUGS FOUND & FIXED

### 🔴 Critical (1)

| # | Bug | File | Line | Fix |
|---|-----|------|------|-----|
| C1 | `ir.get('dcBrakeBias')` crashes relay — IRSDK has no `.get()` | `iracing_relay.py` | 224, 411 | Changed to `ir['dcBrakeBias']` with try/except |

### 🟡 High (12 fixed across sessions)

| # | Bug | File | Line | Fix |
|---|-----|------|------|-----|
| H1 | DriverHUD speed label "KPH" but value is MPH | `DriverHUD.tsx` | 274 | Changed to "MPH" |
| H2 | DriverHUD `formatLapTime()` expects ms, gets seconds | `DriverHUD.tsx` | 187 | Rewrote to handle seconds |
| H3 | `useLiveTelemetry` hardcodes `tireWear: {fl:1,fr:1,rl:1,rr:1}` | `useLiveTelemetry.tsx` | 76 | Now reads from `strategy.tireWear` |
| H4 | Fuel per lap = `fuelUsePerHour / 60` (L/min not L/lap) | `useRelay.tsx` | 312 | Removed — server computes correct value via `car:status` |
| H5 | DriverBlackBox gaps hardcoded "+2.341" / "-1.892" | `DriverBlackBox.tsx` | 389 | Now reads from `strategy.gapToCarAhead/gapToLeader` |
| H6 | DriverPitwallAdvanced uses mock tire/weather/gap data | `DriverPitwallAdvanced.tsx` | 30–51 | Replaced with live strategy data |
| H7 | LiveCockpit fuel laps shows "L" suffix (liters) | `LiveCockpit.tsx` | 166 | Changed to "laps" |
| H8 | DriverBlackBox uses `telemetry.lapsRemaining` (always null) | `DriverBlackBox.tsx` | 190+ | Changed to `strategy.fuelLapsRemaining` |
| H9 | DriverPitwall fuel insights never trigger (lapsRemaining always null) | `DriverPitwall.tsx` | 54 | Rewrote to use `strategy.fuelLapsRemaining` |
| H10 | DriverPitwall "Laps Left" display always shows "--" | `DriverPitwall.tsx` | 371 | Changed to `strategy.fuelLapsRemaining` |
| H11 | RPM bar hardcoded to 8000 across all pages | Multiple | All | Added `DriverCarSLBlinkRPM` to relay → server → `session.rpmRedline` |
| H12 | Fuel bar hardcoded to 18–20L across all pages | Multiple | All | Added `DriverCarFuelMaxLit` to relay → server → `session.fuelTankCapacity` |

### ⚠️ Medium (11 fixed)

| # | Bug | File | Line | Fix |
|---|-----|------|------|-----|
| M1 | DriverCockpit delta label "to leader" but value is delta to best | `DriverCockpit.tsx` | 130 | Changed to "to best" |
| M2 | `session_info` + `competitor_data` emitted at 60Hz (bandwidth waste) | `TelemetryHandler.ts` | 334–370 | Throttled to 1Hz with timestamp guard |
| M3 | Weather data not forwarded to dashboard | `TelemetryHandler.ts` | 199–209 | Store weather from 60Hz path, include in `car:status` emission |
| M4 | Gap behind not forwarded to dashboard | `TelemetryHandler.ts` | 673 | Added `fromCarBehind` to `car:status` gaps |
| M5 | DriverPitwall spotter calls hardcoded | `DriverPitwall.tsx` | 99–128 | Now uses live gap data from strategy |
| M6 | LiveSpotter left/right uses position number as lateral proxy | `LiveSpotter.tsx` | 151–161 | Now uses track distance sign |
| M7 | LiveSpotter `formatGap()` assumes 1% = 1 second | `LiveSpotter.tsx` | 256 | Changed to 1% ≈ 0.6s (60s lap / 100%) |
| M8 | DriverPitwallAdvanced pit window uses `telemetry.lapsRemaining` (null) | `DriverPitwallAdvanced.tsx` | 209 | Changed to `strategy.fuelLapsRemaining` |
| M9 | DriverPitwallAdvanced gap behind hardcoded to 0 | `DriverPitwallAdvanced.tsx` | 42 | Now uses `strategy.gapFromCarBehind` |
| M10 | Sector indicator never populated (always shows sector 1) | `useRelay.tsx` | 336 | Computed from `lapDistPct`: <33%=S1, <66%=S2, else S3 |
| M11 | Track name defaults to "Unknown Track" on session creation | `TelemetryHandler.ts` | 224, 429 | Now uses `trackName` from telemetry data or `currentSessionInfo` |

---

## 7. REMAINING KNOWN ISSUES

### Not Fixed (Low Priority / Architectural)

| # | Issue | File | Impact | Recommendation |
|---|-------|------|--------|----------------|
| ~~R1~~ | ~~`telemetry.lapsRemaining` never populated~~ | | | ✅ **FIXED** — All pages now use `strategy.fuelLapsRemaining` |
| ~~R2~~ | ~~RPM max hardcoded to 8000~~ | | | ✅ **FIXED** — Dynamic via `session.rpmRedline` from iRacing `DriverCarSLBlinkRPM` |
| ~~R3~~ | ~~Fuel bar max hardcoded to 18–20L~~ | | | ✅ **FIXED** — Dynamic via `session.fuelTankCapacity` from iRacing `DriverCarFuelMaxLit` |
| ~~R4~~ | ~~Sector indicator never populated~~ | | | ✅ **FIXED** — Computed from `lapDistPct` (3 equal sectors) |
| ~~R5~~ | ~~LiveSpotter left/right uses position as lateral proxy~~ | | | ✅ **FIXED** — Now uses track distance sign (still approximate without lateral data) |
| ~~R6~~ | ~~LiveSpotter `formatGap()` assumes 1% = 1 second~~ | | | ✅ **FIXED** — Changed to 1% ≈ 0.6s |
| ~~R7~~ | ~~`session_info` + `competitor_data` emitted at 60Hz~~ | | | ✅ **FIXED** — Throttled to 1Hz |
| ~~R8~~ | ~~Track name "Unknown Track" on production~~ | | | ✅ **FIXED** — Session creation now uses `trackName` from telemetry/metadata |
| ~~R9~~ | ~~Weather data not forwarded to dashboard~~ | | | ✅ **FIXED** — Now in `car:status` via `lastWeather` |
| ~~R10~~ | ~~Gap behind not forwarded to dashboard~~ | | | ✅ **FIXED** — `gapFromCarBehind` now in `car:status` gaps |
| ~~R11~~ | ~~DriverPitwall spotter calls are hardcoded~~ | | | ✅ **FIXED** — Now uses live gap data |
| R12 | DriverComparison has no live data | `DriverComparison.tsx` | Empty page — team feature not wired | Needs API integration |

---

## 8. VERIFICATION STATUS

### Compilation

| Package | Status | Errors |
|---------|--------|--------|
| `apps/app` | ✅ Compiles | Pre-existing unused import warnings only |
| `packages/dashboard` | ✅ Clean | No errors |
| `packages/server` | ✅ | No new errors |

### Data Flow Verification

| Path | Status |
|------|--------|
| Relay → Server (60Hz telemetry) | ✅ Confirmed live |
| Relay → Server (1Hz strategy) | ✅ Confirmed live |
| Server → Dashboard (telemetry:driver) | ✅ |
| Server → Dashboard (car:status) | ✅ |
| Server → Dashboard (race:intelligence) | ✅ |
| Server → Dashboard (engineer:update) | ✅ |
| Server → Dashboard (spotter:callout) | ✅ |
| Server → Voice AI cache | ✅ |
| Dual-ship (cloud + local) | ✅ |

### Files Modified This Session

| File | Changes |
|------|---------|
| `apps/relay/python/iracing_relay.py` | Fixed `ir.get()` → bracket access |
| `packages/dashboard/src/components/DriverHUD.tsx` | Fixed speed label + lap time formatter |
| `apps/app/src/hooks/useLiveTelemetry.tsx` | Fixed hardcoded tire wear |
| `apps/app/src/hooks/useRelay.tsx` | Removed incorrect fuel per lap calculation |
| `apps/app/src/pages/driver/states/LiveCockpit.tsx` | Fixed fuel laps "L" suffix |
| `apps/app/src/pages/driver/DriverBlackBox.tsx` | Fixed hardcoded gaps + fuel laps source |
| `apps/app/src/pages/driver/DriverCockpit.tsx` | Fixed delta label |
| `apps/app/src/pages/driver/DriverPitwallAdvanced.tsx` | Replaced all mock data with live telemetry |
| `apps/app/src/pages/driver/DriverPitwall.tsx` | Fixed fuel insights + laps display + live spotter calls |
| `packages/server/src/websocket/TelemetryHandler.ts` | Throttled emissions, weather forwarding, gap behind, car metadata |
| `apps/app/src/components/LiveSpotter.tsx` | Improved lateral detection + gap formatting |
| `apps/relay/python/iracing_relay.py` | Added `DriverCarSLBlinkRPM` + `DriverCarFuelMaxLit` to session_metadata |
