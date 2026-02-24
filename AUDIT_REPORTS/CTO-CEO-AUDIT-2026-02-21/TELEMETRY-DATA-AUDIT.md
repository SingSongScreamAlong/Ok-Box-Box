# Telemetry Data Pipeline Audit
**Date:** 2026-02-23  
**Session:** Live iRacing test session at Daytona 2011 Oval  
**Status:** All 3 components running (Relay → Server → Dashboard)

---

## 1. RELAY: What Data Is Being Captured

The Python relay (`apps/relay/python/iracing_relay.py`) reads raw iRacing shared memory and emits **3 event streams** via local Socket.IO (port 9999):

### 1.1 `telemetry` — 60Hz
| Field | Source | Unit | Notes |
|-------|--------|------|-------|
| `speed` | `ir['Speed']` | m/s | Raw, server converts to mph |
| `rpm` | `ir['RPM']` | RPM | |
| `gear` | `ir['Gear']` | int | |
| `throttle` | `ir['Throttle']` | 0.0–1.0 | Server converts to % |
| `brake` | `ir['Brake']` | 0.0–1.0 | Server converts to % |
| `clutch` | `ir['Clutch']` | 0.0–1.0 | |
| `steeringAngle` | `ir['SteeringWheelAngle']` | radians | |
| `position` | `ir['PlayerCarPosition']` | int | |
| `classPosition` | `ir['PlayerCarClassPosition']` | int | |
| `lap` | `ir['Lap']` | int | |
| `lapsCompleted` | `ir['LapCompleted']` | int | |
| `lapDistPct` | `ir['LapDistPct']` | 0.0–1.0 | Track position % |
| `lastLapTime` | `ir['LapLastLapTime']` | seconds | |
| `bestLapTime` | `ir['LapBestLapTime']` | seconds | |
| `deltaToSessionBest` | `ir['LapDeltaToSessionBestLap']` | seconds | |
| `deltaToOptimalLap` | `ir['LapDeltaToOptimalLap']` | seconds | |
| `fuelLevel` | `ir['FuelLevel']` | liters | |
| `fuelPct` | `ir['FuelLevelPct']` | 0.0–1.0 | |
| `fuelUsePerHour` | `ir['FuelUsePerHour']` | L/hr | |
| `tireWearRaw` | `ir['{corner}wear{LMR}']` | 0.0–1.0 | L/M/R per corner |
| `tireTempsRaw` | `ir['{corner}temp{LMR}']` | °C | L/M/R per corner |
| `oilTemp` | `ir['OilTemp']` | °C | |
| `oilPress` | `ir['OilPress']` | kPa | |
| `waterTemp` | `ir['WaterTemp']` | °C | |
| `voltage` | `ir['Voltage']` | V | |
| `engineWarnings` | `ir['EngineWarnings']` | bitfield | |
| `brakeBias` | `ir['dcBrakeBias']` | % | **Fixed: was using ir.get()** |
| `onPitRoad` | `ir['OnPitRoad']` | bool | |
| `isOnTrack` | `ir['IsOnTrack']` | bool | |
| `incidentCount` | `ir['PlayerCarMyIncidentCount']` | int | |
| `driverName` | `DriverInfo` | string | |
| `carName` | `DriverInfo` | string | |
| `iRating` | `DriverInfo` | int | |
| `licenseLevel` | `DriverInfo` | string | |
| `trackName` | `WeekendInfo` | string | |
| `trackLength` | `WeekendInfo` | string | e.g. "3.9927 km" |
| `sessionType` | `SessionInfo` | string | practice/qualifying/race |
| `sessionTimeRemain` | `ir['SessionTimeRemain']` | seconds | |
| `flagStatus` | `ir['SessionFlags']` | string | Decoded from bitfield |
| `trackTemp` | `ir['TrackTemp']` | °C | |
| `airTemp` | `ir['AirTemp']` | °C | |
| `humidity` | `ir['RelativeHumidity']` | 0.0–1.0 | |
| `windSpeed` | `ir['WindVel']` | m/s | |
| `windDir` | `ir['WindDir']` | radians | |
| `skyCondition` | `ir['Skies']` | string | Decoded |
| `standings` | `CarIdx*` arrays | array | Top 20 cars: position, lap, lapDistPct, lastLapTime, bestLapTime, iRating |

### 1.2 `strategy_raw` — 1Hz
Same fuel/tire/engine/brake data as above but at lower frequency. Includes `tireCompound`.

### 1.3 `incident` — On change
Fires when `PlayerCarMyIncidentCount` increases. Includes delta, severity, lap, trackPosition.

### 1.4 `session_metadata` — Once per session
Track name, session type, session ID, timestamp.

---

## 2. SERVER: What Data Is Processed

The server has **two paths** depending on mode:

### 2.1 Production Server (`TelemetryHandler.ts`)
Full processing pipeline:

| Stage | What Happens |
|-------|-------------|
| **Receive** | `telemetry` event at 60Hz, `strategy_raw` at 1Hz |
| **Inference Engine** | Computes tire wear model (temp-based degradation), gap calculations (from CarIdxF2Time), pit stop tracking, damage inference, brake pressure, fuel per lap |
| **Telemetry Cache** | Stores latest snapshot for voice AI context (crew-chat uses this) |
| **LiveSessionAnalyzer** | Accumulates race intelligence: pace trends, consistency, overtake stats, mental fatigue |
| **ProactiveSpotter** | Edge-triggered callouts: gap closing, overtake opportunity, fuel/tire warnings |
| **SituationalAwareness** | GPT-powered race engineer analysis (async, non-blocking) |
| **Broadcast** | Emits to dashboard clients via multiple event types (see §2.3) |

### 2.2 Standalone Server (`standalone.ts`)
Simplified pipeline — no inference engine, no AI:

| Stage | What Happens |
|-------|-------------|
| **Receive** | Same events from relay |
| **Rebroadcast** | Forwards raw data with minimal formatting |
| **Format** | Converts speed m/s→mph, creates LROC-compatible payload |
| **Standings** | Sorts and formats competitor data |

### 2.3 Events Emitted to Dashboard Clients

| Event | Frequency | Content | Consumer |
|-------|-----------|---------|----------|
| `timing:update` | 60Hz | Position, lap, speed, lapDistPct per car | Session room clients |
| `telemetry_update` | 60Hz | Speed (mph), RPM, gear, throttle%, brake%, fuel, lap times | LROC / CrewEngineerPage |
| `telemetry:driver` | 60Hz | Full raw telemetry + trackName/sessionType | DriverHUD / apps/app |
| `session_info` | 60Hz (volatile) | Track, session type, weather, driver, car | apps/app RelayProvider |
| `competitor_data` | 60Hz (volatile) | Sorted standings with gaps and lap times | CrewEngineerPage leaderboard |
| `car:status` | 1Hz | Inferred tire wear, fuel, damage, engine, gaps, pit stops | apps/app strategy panels |
| `strategy:update` | 1Hz | Full computed strategy per car | Team pitwall |
| `race:intelligence` | ~0.1Hz | Pace trends, consistency, overtake stats, mental fatigue | apps/app RaceIntelligence |
| `engineer:update` | Async | AI-generated race engineer callouts | apps/app EngineerUpdates |
| `spotter:callout` | Edge-triggered | Gap closing, overtake opportunity, warnings | apps/app SpotterCallouts |
| `incident:new` | On event | Incident details, involved cars, severity | Incident panels |
| `session:active` | Once | Session ID, track, type | Auto-join / late-joiner |

---

## 3. DASHBOARD: What Data Is Displayed

### 3.1 `apps/app` (Vite React — port 5173)
**Primary driver-facing app.** Uses `useRelay` hook → connects to production server.

| Display Element | Data Source | Event | Displayed As |
|----------------|-------------|-------|-------------|
| Speed | `car.speed * 2.237` | `telemetry:driver` | MPH (integer) |
| Gear | `car.gear` | `telemetry:driver` | Integer |
| RPM | `car.rpm` | `telemetry:driver` | Integer |
| Throttle | `car.throttle * 100` | `telemetry:driver` | Percentage |
| Brake | `car.brake * 100` | `telemetry:driver` | Percentage |
| Position | `car.position` | `telemetry:driver` | P# |
| Lap | `car.lap` | `telemetry:driver` | Integer |
| Last Lap | `driver.lastLapTime` | `telemetry:driver` | M:SS.mmm |
| Best Lap | `driver.bestLapTime` | `telemetry:driver` | M:SS.mmm |
| Delta | `deltaToSessionBest` | `telemetry:driver` | ±S.mmm |
| Fuel Level | `car.fuelLevel` | `telemetry:driver` / `car:status` | Liters |
| Fuel Per Lap | `inferred.fuel.perLap` | `car:status` | Liters |
| Fuel Laps Remaining | Computed client-side | `car:status` | Integer |
| Tire Wear (FL/FR/RL/RR) | `inferred.tireWear` | `car:status` | 0.0–1.0 |
| Tire Temps | `inferred.tireTemps` | `car:status` | °C (L/M/R) |
| Tire Stint Laps | `inferred.tireStintLaps` | `car:status` | Integer |
| Damage (Aero/Engine) | `inferred.damage` | `car:status` | 0.0–1.0 |
| Engine Health | `inferred.engine` | `car:status` | °C, kPa, V |
| Gap to Leader | `inferred.gaps.toLeader` | `car:status` | Seconds |
| Gap to Car Ahead | `inferred.gaps.toCarAhead` | `car:status` | Seconds |
| Pit Stops | `inferred.pit.stops` | `car:status` | Integer |
| Standings/Leaderboard | `standings[]` | `telemetry:driver` / `competitor_data` | Sorted table |
| Track Map Positions | `lapDistPct` per car | `telemetry:driver` | Oval/circuit map |
| Track Name | `trackName` | `session_info` / `session:active` | String |
| Session Type | `sessionType` | `session_info` / `session:active` | PRACTICE/QUAL/RACE |
| In Pit | `car.onPitRoad` | `telemetry:driver` / `car:status` | Boolean |
| Race Intelligence | `LiveSessionAnalyzer` | `race:intelligence` | Pace trends, consistency, etc. |
| Engineer Updates | `SituationalAwareness` | `engineer:update` | AI callout messages |
| Spotter Callouts | `ProactiveSpotter` | `spotter:callout` | Edge-triggered alerts |

### 3.2 `packages/dashboard` (CrewEngineerPage)
**Race engineer interface.** Uses `socketClient` → listens to `telemetry_update` and `competitor_data`.

| Display Element | Event | Notes |
|----------------|-------|-------|
| Speed (MPH) | `telemetry_update` | Pre-converted by server |
| Gear | `telemetry_update` | |
| Lap | `telemetry_update` | |
| Position | `telemetry_update` | |
| Fuel (L) | `telemetry_update` | |
| Last Lap Time | `telemetry_update` | Formatted M:SS.mmm |
| Best Lap Time | `telemetry_update` | Formatted M:SS.mmm |
| Throttle % | `telemetry_update` | Bar visualization |
| Brake % | `telemetry_update` | Bar visualization |
| Standings (top 10) | `competitor_data` | Position, driver, gap, last lap |
| Voice PTT | `voice:query` / `voice:response` | Whisper STT → GPT → ElevenLabs TTS |

### 3.3 `packages/dashboard` (DriverStatusPanel)
**Annunciator panel — NOT a data display.** Only shows:
- Relay connection status (LIVE/OFFLINE)
- Voice status (READY/LISTENING/PROCESSING)
- AI status (READY/BUSY)
- Session type (PRACTICE/QUAL/RACE)
- Voice PTT button

### 3.4 `packages/dashboard` (DriverHUD)
**Lovely-inspired HUD.** Uses `telemetry:driver` event.

| Display Element | Notes |
|----------------|-------|
| Speed (KPH) | ⚠️ **BUG: Label says KPH but data may be raw m/s — see §4** |
| Gear | Large center display |
| RPM bar | With shift light at 95% |
| Position / Total Cars | |
| Gap Ahead / Behind | |
| Lap / Last / Best | Formatted as M:SS.mmm (but expects milliseconds, not seconds) |
| Fuel Level + Laps | |
| Tire Wear (4 corners) | Percentage with color coding |
| Delta | ±S.mmm |

---

## 4. DATA ACCURACY ISSUES FOUND

### 🔴 Critical

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| C1 | **`ir.get()` crash** — Python relay used `ir.get('dcBrakeBias')` but IRSDK has no `.get()` method | `iracing_relay.py:224,411` | **FIXED** this session — changed to `ir['dcBrakeBias']` |
| C2 | **Track name shows "Unknown Track"** on production health endpoint | `TelemetryHandler.ts:204` | Session created before metadata arrives; `trackName` defaults to `'Unknown Track'` and never updates from telemetry |

### 🟡 Moderate

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| M1 | **DriverHUD speed unit mismatch** — Label says "KPH" but `telemetry:driver` sends raw m/s from relay. The `useRelay` hook converts to mph (`* 2.237`). So the HUD shows **mph labeled as KPH** | `DriverHUD.tsx:274` + `useRelay.tsx:316` | Incorrect speed display for DriverHUD users |
| M2 | **DriverHUD lap time format mismatch** — `formatLapTime()` expects milliseconds but iRacing sends seconds. Will display wrong times | `DriverHUD.tsx:187-193` | Lap times will be wildly wrong (e.g., 90s displayed as "0:00.090") |
| M3 | **Double speed conversion** — `TelemetryHandler.ts:109` converts speed to mph for cache, but `useRelay.tsx:316` also converts `car.speed * 2.237`. The `telemetry:driver` event sends raw data, so `useRelay` conversion is correct. But `telemetry_update` (LROC format) pre-converts, so CrewEngineerPage gets correct mph. Inconsistent. | Multiple files | Confusing but not broken for current consumers |
| M4 | **Tire wear always 1.0 in `useLiveTelemetry`** — hardcoded `tireWear: { fl: 1, fr: 1, rl: 1, rr: 1 }` instead of reading from `strategy` | `useLiveTelemetry.tsx:76` | Any consumer of `useLiveTelemetry` gets fake tire data |
| M5 | **Fuel per lap calculation wrong in useRelay** — `fuelUsePerHour / 60` gives L/min, not L/lap | `useRelay.tsx:312` | Fuel laps remaining will be incorrect |
| M6 | **`competitor_data` emitted at 60Hz (volatile)** — standings don't change 60 times per second; this wastes bandwidth | `standalone.ts:250` + `TelemetryHandler.ts:361` | Performance waste |

### 🟢 Low / Cosmetic

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| L1 | **Humidity displayed as 0–1 in some paths** — relay sends 0.0–1.0, server converts to 0–100% for cache, but raw `telemetry:driver` still has 0.0–1.0 | `TelemetryHandler.ts:125` vs raw | Minor inconsistency |
| L2 | **Wind direction in radians** — not human-readable, should be converted to compass bearing | `iracing_relay.py:277` | Voice AI gets radians instead of "NW" |
| L3 | **`session_info` emitted at 60Hz volatile** — same data every frame, wasteful | `TelemetryHandler.ts:332` | Bandwidth waste |

---

## 5. DATA FRESHNESS

| Metric | Value | Status |
|--------|-------|--------|
| Relay → Server latency | ~6ms (measured from health endpoint `ageMs`) | ✅ Excellent |
| Telemetry frequency | 60Hz | ✅ As designed |
| Strategy frequency | 1Hz | ✅ As designed |
| Production server uptime | 139,312s (~38 hours) | ✅ Stable |
| Active sessions (production) | 1 | ✅ Confirmed |
| Active sessions (local) | 1 | ✅ Confirmed |
| Dual-ship working | Cloud + localhost:3001 | ✅ Confirmed |

---

## 6. SUMMARY

### What's Working Well
- **Relay captures comprehensive iRacing data** — 40+ telemetry vars at 60Hz, strategy at 1Hz, incidents on change
- **Server inference engine** computes tire wear, gaps, damage, fuel per lap from raw data
- **Voice AI context** has access to full telemetry snapshot via cache
- **Dual-ship architecture** allows local dev testing alongside production
- **Production server** is healthy with DB, Redis, and AI all operational
- **Data freshness** is excellent at ~6ms relay-to-server latency

### What Needs Fixing
1. **C2**: Track name "Unknown Track" on production — needs to update from telemetry data
2. **M1**: DriverHUD speed label says KPH but shows MPH
3. **M2**: DriverHUD lap time formatter expects ms but gets seconds
4. **M4**: `useLiveTelemetry` hardcodes tire wear to 1.0
5. **M5**: Fuel per lap calculation is L/min not L/lap
6. **M6/L3**: 60Hz emission of data that changes at ≤1Hz wastes bandwidth

### Architecture Observation
The system has **3 different telemetry event formats** (`timing:update`, `telemetry_update`, `telemetry:driver`) plus `car:status` for strategy. This evolved organically to support different dashboard tiers (LROC, Driver, Team). A future consolidation into a single canonical event with typed schemas would reduce bugs like M1/M3.
