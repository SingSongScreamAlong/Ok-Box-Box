# Ok, Box Box - Full System Audit
**Date:** February 4, 2026  
**Auditor:** Cascade AI  

---

## Executive Summary

The Ok, Box Box platform is a **three-tier racing telemetry and team management system**:
1. **Relay** - Electron + Python desktop app that captures iRacing telemetry
2. **Server** - Node.js/Express backend with WebSocket for real-time data
3. **Frontend** - React SPA with Driver, Team, and League tiers

### Overall Status: 🟡 Partially Working

| Component | Status | Notes |
|-----------|--------|-------|
| Relay (Electron) | ✅ Working | Connects to iRacing, sends to server |
| Relay (Python) | ✅ Working | 60Hz telemetry, standings, incidents |
| Server (Standalone) | ✅ Working | WebSocket broadcasting functional |
| Server (Full/index.ts) | ⚠️ Untested | Requires DB, may have issues |
| Frontend (WebSocket) | ✅ Working | Receives telemetry:driver events |
| Frontend (API calls) | ❌ Broken | CORS issues, missing routes |
| Driver Tier UI | 🟡 Partial | Cockpit shows data, but API errors |
| Team Tier | 🟡 Partial | UI exists, backend untested |
| League Tier | 🟡 Partial | UI exists, backend untested |

---

## 1. RELAY APPLICATION (`apps/relay/`)

### Files Audited:
- `src/main-simple.ts` (99 lines) - Entry point
- `src/python-bridge-simple.ts` (337 lines) - Python process manager
- `python/iracing_relay.py` (476 lines) - iRacing SDK interface

### ✅ What's Working:
1. **Auto-start on Windows boot** - Uses `auto-launch` package
2. **Single instance lock** - Prevents multiple relays
3. **Python process spawning** - Finds script in multiple paths
4. **iRacing connection detection** - Uses pyirsdk
5. **60Hz telemetry loop** - Precise timing with `time.perf_counter()`
6. **Session metadata emission** - Track name, session type
7. **Standings array** - Top 20 cars with positions
8. **Incident detection** - Monitors `PlayerCarMyIncidentCount`
9. **Strategy updates at 1Hz** - Fuel, tires, pit status
10. **Cloud server connection** - Auto-reconnect with Socket.IO
11. **Status window** - Visual indicator of connection state

### ⚠️ Issues Found:

| Issue | Severity | Location | Fix |
|-------|----------|----------|-----|
| `gapToLeader` uses wrong iRacing var | Medium | `iracing_relay.py:199` | Use proper gap calculation |
| Tire wear hardcoded to 1.0 | Low | `iracing_relay.py:384-387` | iRacing doesn't expose wear directly |
| No driver identification sent | Medium | `python-bridge-simple.ts:287` | Only sends version, no user ID |
| Embedded Python path may fail | Low | `python-bridge-simple.ts:142-158` | Falls back to system Python |

### 🔧 Refactor Recommendations:

1. **Consolidate main.ts and main-simple.ts** - Two entry points is confusing
2. **Remove unused files**: `main.ts`, `tray.ts`, `python-bridge.ts`, `voice-engineer.ts`, `hud-window.ts`, `mode-selector.ts`, `auth.ts` - These are legacy "full" versions
3. **Add user authentication** - Relay should identify the driver to the server
4. **Add telemetry compression** - 60Hz * 20 cars = lots of data

---

## 2. SERVER (`packages/server/`)

### Files Audited:
- `src/standalone.ts` (334 lines) - Lightweight server (CURRENTLY DEPLOYED)
- `src/index.ts` (73 lines) - Full server entry point
- `src/app.ts` (92 lines) - Express app setup
- `src/websocket/` - WebSocket handlers

### Architecture Issue: TWO SERVERS

The codebase has **two server implementations**:

| Server | File | Features | Status |
|--------|------|----------|--------|
| Standalone | `standalone.ts` | WebSocket only, no DB | ✅ Deployed |
| Full | `index.ts` + `app.ts` | DB, API routes, auth | ❌ Not deployed |

**This is the root cause of API errors.** The production server (`standalone.ts`) doesn't have `/api/v1/drivers/me` routes.

### ✅ What's Working (Standalone):
1. **WebSocket connection** - Clients can connect
2. **Telemetry broadcast** - `telemetry:driver`, `telemetry_update`, `competitor_data`
3. **Session tracking** - Stores current session info for late joiners
4. **Health endpoints** - `/api/health`, `/health`
5. **CORS** - Set to `*` (allow all)
6. **Viewer tracking** - Adaptive streaming based on viewers

### ❌ What's Broken:
1. **No API routes** - `/api/v1/drivers/me` returns 404 or HTML
2. **No database** - Can't persist sessions, profiles, stats
3. **No authentication** - Anyone can connect
4. **Standings uses wrong field** - Looks for `drivers` but relay sends `standings`

### 🔧 Refactor Recommendations:

1. **CRITICAL: Deploy full server** - Switch from `standalone.ts` to `index.ts`
2. **Or: Add API routes to standalone** - Proxy to Supabase or add minimal routes
3. **Fix telemetry broadcast** - Use `standings` not `drivers` for leaderboard
4. **Add relay authentication** - Verify relay belongs to a user

---

## 3. FRONTEND (`apps/app/`)

### Files Audited:
- `src/App.tsx` (204 lines) - Routing
- `src/hooks/useRelay.tsx` (632 lines) - WebSocket connection
- `src/pages/driver/DriverCockpit.tsx` (348 lines) - Main telemetry view
- `src/lib/*.ts` - API services

### ✅ What's Working:
1. **WebSocket connection** - Connects to production server
2. **Telemetry reception** - Receives `telemetry:driver` events
3. **Session detection** - Shows "IN SESSION" when relay active
4. **Routing** - All routes defined and accessible
5. **Auth flow** - Supabase authentication works
6. **UI components** - Cockpit, History, Progress pages render

### ❌ What's Broken:

| Issue | Location | Cause | Fix |
|-------|----------|-------|-----|
| API calls fail with CORS | `driverService.ts` | Server returns HTML | Deploy full server |
| `standings: undefined` in logs | `useRelay.tsx:374` | Server doesn't forward `standings` | Fix server broadcast |
| Profile fetch fails | `useDriverData.tsx` | `/api/v1/drivers/me` not on standalone | Deploy full server |
| Supabase 400 errors | Console | `driver_profiles` query fails | Check RLS policies |

### 🔧 Refactor Recommendations:

1. **Remove mock simulation code** - 200+ lines of dead code in `useRelay.tsx`
2. **Consolidate API services** - 20 files in `lib/`, many overlap
3. **Add error boundaries per route** - Currently one global boundary
4. **Add loading states** - Many components show nothing while loading
5. **Type the telemetry data** - Currently uses `any` everywhere

---

## 4. DATA FLOW ANALYSIS

### Current Flow (Working):
```
iRacing → Python (pyirsdk) → Local Socket.IO → Electron → Cloud Socket.IO → Server → Browser
```

### Data Structure Mismatch:

**Relay sends:**
```json
{
  "sessionId": "live_123",
  "cars": [{ detailed player car }],
  "standings": [{ all cars sorted by position }],
  "trackName": "daytona",
  ...
}
```

**Server broadcasts:**
```json
{
  ...telemetryData,
  "trackName": "daytona"
}
```

**Frontend expects:**
```javascript
data.standings || data.drivers  // Fixed in recent commit
data.cars[0]                    // Works
```

### Missing Data:
- **Gap to leader** - Not calculated properly
- **Sector times** - Not sent by relay
- **Tire temperatures** - Sent in strategy_update, not telemetry
- **Damage** - Not available from iRacing SDK

---

## 5. DEPLOYMENT ARCHITECTURE

### Current State:
```
DigitalOcean App Platform
├── Server: packages/server (runs standalone.ts via Dockerfile)
├── Frontend: apps/app (static build on Netlify? or DO?)
└── Database: Supabase (external)
```

### Issues:
1. **Dockerfile runs `node dist/index.js`** but production seems to use standalone behavior
2. **No Redis** - Required by full server but not configured
3. **Environment variables** - May not be set correctly

### Recommended Architecture:
```
DigitalOcean App Platform
├── Server: packages/server (full index.ts with DB)
├── Redis: DigitalOcean Managed Redis
├── Database: Supabase PostgreSQL
└── Frontend: Netlify or DO Static Site
```

---

## 6. FILE INVENTORY - WHAT TO KEEP/DELETE

### Relay (`apps/relay/src/`):
| File | Lines | Status | Action |
|------|-------|--------|--------|
| `main-simple.ts` | 99 | ✅ Active | Keep |
| `python-bridge-simple.ts` | 337 | ✅ Active | Keep |
| `tray-simple.ts` | 133 | ✅ Active | Keep |
| `status-window.ts` | 246 | ✅ Active | Keep |
| `main.ts` | 367 | ❌ Legacy | Delete |
| `python-bridge.ts` | 500+ | ❌ Legacy | Delete |
| `tray.ts` | 433 | ❌ Legacy | Delete |
| `voice-engineer.ts` | 537 | ❌ Legacy | Delete |
| `hud-window.ts` | 460 | ❌ Legacy | Delete |
| `mode-selector.ts` | 334 | ❌ Legacy | Delete |
| `auth.ts` | 181 | ❌ Legacy | Delete |
| `engineer-settings.ts` | 463 | ❌ Legacy | Delete |
| `auto-updater.ts` | 204 | ⚠️ Unused | Review |
| `protocol-handler.ts` | 218 | ⚠️ Unused | Review |
| `preload.ts` | 47 | ⚠️ Needed? | Review |

### Server (`packages/server/src/`):
| File | Status | Action |
|------|--------|--------|
| `standalone.ts` | ✅ Deployed | Keep for dev/testing |
| `index.ts` | ⚠️ Not deployed | Should be primary |
| `app.ts` | ⚠️ Not used in prod | Part of full server |

---

## 7. PRIORITY ACTION ITEMS

### P0 - Critical (Do Now):
1. **Deploy full server** - Switch from standalone to index.ts
2. **Configure environment** - DATABASE_URL, REDIS_URL, CORS_ORIGINS
3. **Fix CORS** - Already pushed, verify deployed

### P1 - High (This Week):
1. **Delete legacy relay files** - 2000+ lines of dead code
2. **Add relay user identification** - Link telemetry to driver profile
3. **Fix standings broadcast** - Server should forward `standings` array
4. **Test full API routes** - `/api/v1/drivers/me`, etc.

### P2 - Medium (This Month):
1. **Add telemetry compression** - Binary protocol or delta encoding
2. **Implement gap calculation** - Proper gap to leader/ahead/behind
3. **Add session persistence** - Store sessions in database
4. **Build relay installer** - GitHub releases with auto-update

### P3 - Low (Backlog):
1. **Consolidate API services** - Too many files in `lib/`
2. **Add comprehensive error handling** - Better user feedback
3. **Implement team tier backend** - Pitwall features
4. **Implement league tier backend** - Incidents, penalties, protests

---

## 8. CONCLUSION

The core telemetry pipeline works:
- ✅ Relay captures iRacing data at 60Hz
- ✅ Server broadcasts to connected clients
- ✅ Frontend receives and displays data

The main issues are:
1. **Wrong server deployed** - Standalone lacks API routes
2. **Data structure mismatches** - `standings` vs `drivers`
3. **Legacy code clutter** - 50%+ of relay code is unused
4. **Missing user identification** - Can't link telemetry to profiles

**Estimated effort to fix P0+P1:** 4-8 hours

