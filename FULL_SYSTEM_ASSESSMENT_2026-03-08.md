# Ok, Box Box — Full System Assessment
**Date:** March 8, 2026  
**Scope:** Every layer from relay agent → server → web app → infrastructure → ops

---

## System Architecture Overview

```
┌─────────────────┐    WebSocket     ┌──────────────────┐    PostgreSQL    ┌──────────┐
│  Relay Agent    │ ──────────────── │   API Server     │ ──────────────── │ Postgres │
│  (Python/Win)   │   telemetry      │  (Node/Express)  │                  │   15     │
│  ~60Hz iRacing  │   events         │  Socket.IO       │    Redis         │          │
└─────────────────┘                  │  REST API        │ ──────────────── ┌──────────┐
                                     │  AI Services     │                  │ Redis 7  │
┌─────────────────┐                  └──────────────────┘                  └──────────┘
│  Desktop App    │    WebSocket           │
│  (Electron)     │ ───────────────────────┘
│  Login + Voice  │
└─────────────────┘

┌─────────────────┐    REST + WS     ┌──────────────────┐
│  Web App        │ ──────────────── │   Supabase Auth  │
│  (React/Vite)   │                  │   (hosted)       │
│  app.okboxbox   │                  └──────────────────┘
└─────────────────┘

┌─────────────────┐
│  Marketing Site │    Static
│  (React/Vite)   │    okboxbox.com
└─────────────────┘
```

---

## 1. RELAY AGENT (Python) — `tools/relay-agent/`

### What It Does
Reads iRacing telemetry via shared memory at ~60Hz, maps it to protocol events, and streams to the server over Socket.IO. Supports session lifecycle (start/end/change), incident detection, MoTeC export, race logging with gzip compression, PTT voice input, and an overlay HUD.

### Strengths
- **Robust session lifecycle** — auto-fires `session_end` on stop/disconnect/session-change/checkered
- **Multi-stream protocol** — baseline 4Hz + controls 15Hz + instant events
- **MoTeC export** — real `.ld` file generation for post-session analysis
- **Race logger** — gzip-compressed `.jsonl.gz` files (96% compression vs raw)
- **Rich tooling** — `compress_logs.py`, `replay_session.py`, `process_logged_session.py`, `analyze_*.py`
- **Protocol layer** — clean separation (`protocol/telemetry.py`, `protocol/incident.py`, etc.)

### Issues

| Severity | Issue | Detail |
|----------|-------|--------|
| **HIGH** | **Two relay codebases exist** | `tools/relay-agent/main.py` (Python CLI) AND `apps/relay/python/iracing_relay.py` AND `apps/desktop/electron/main.ts` (Electron). Three paths to maintain. |
| **HIGH** | **Desktop app hardcoded production URL at audit time** | `apps/desktop/electron/main.ts` used the old `octopus-app-qsi3i` host during this assessment; follow-up cleanup moved the fallback to `https://api.okboxbox.com` |
| **MEDIUM** | **No requirements.txt lock file** | `tools/relay-agent/requirements.txt` has no pinned versions beyond what's listed — fragile installs |
| **MEDIUM** | **`.env` with secrets in repo** | `tools/relay-agent/.env` (1152 bytes) and `relay/agent/.env` (660 bytes) are tracked |
| **MEDIUM** | **Release directory contains stale snapshots** | `tools/relay-agent/release/okboxbox-relay-1.0.0/` is a frozen copy, will drift from source |
| **LOW** | **`race_logs/` directory (46 items) in repo** | Large binary-ish log files tracked in git |
| **LOW** | **Legacy PyInstaller build artifacts** | `relay/build/` contains 41MB `.pkg` — should be in CI, not repo |
| **LOW** | **`apps/relay/` (4914 items)** | Electron relay with `release/win-unpacked/` — 4914 items including `node_modules` artifacts |

### Recommendation
Consolidate to ONE relay: the `apps/desktop` Electron app (for end-users) that embeds the Python relay. Kill `apps/relay/` and `relay/`. Keep `tools/relay-agent/` as the dev/CLI tool only.

---

## 2. SERVER (`packages/server/`) — Node.js/Express/Socket.IO

### What It Does
Full-stack backend: REST API (48 route files), WebSocket gateway (telemetry, sessions, broadcast), AI services (OpenAI, ElevenLabs), driver intelligence pipeline (IDP), behavioral analysis, strategy engine, incident classification, rulebook parsing, billing/entitlements, and iRacing OAuth sync.

### Strengths
- **Massive feature depth** — 48 route files, 17 repositories, 23 migrations, 23 test files
- **IDP pipeline is real** — `PostSessionLearner` → `computeDriverAggregates` → `deriveDriverTraits` → `generateSessionDebrief`
- **Behavioral worker** — computes BSI/TCI/CPI-2/RCI indices every 2 seconds during live sessions
- **AI integration** — crew chat with live telemetry context injection, spoken summary builder, proactive spotter
- **Strategy engine** — lap tracking, stint tracking, opponent modeling, pit window prediction
- **Incident classification** — evidence system, protest workflow, penalty engine, steward advisor
- **Observability** — Sentry integration, metrics, error buffer, health checks
- **Test suite** — 250+ tests across 23 test files covering auth, billing, incidents, strategy, telemetry
- **Clean architecture** — repositories, services, routes separation

### Issues

| Severity | Issue | Detail |
|----------|-------|--------|
| **HIGH** | **`drivers.ts` is 154KB (one file)** | `driverbox/routes/drivers.ts` — single file with all driver endpoints. Unmaintainable. Should be split into 8-10 route files. |
| **HIGH** | **Dockerfile references deleted `packages/dashboard`** | Lines 15, 28 — `COPY packages/dashboard/...` will FAIL on build. Dashboard was removed but Dockerfile not updated. |
| **HIGH** | **`Dockerfile.dashboard` references deleted package** | Entire file is stale — references `packages/dashboard` which no longer exists. |
| **HIGH** | **`Dockerfile.server` may reference stale paths** | Needs audit against current package structure. |
| **MEDIUM** | **`standalone.ts` hardcoded build version** | Line 24: `BUILD_VERSION = '2026-02-04-v1'` — over a month stale. Should use env var. |
| **MEDIUM** | **`index.ts` hardcoded build version** | Line 75: `Build: 2026-03-07-v1` — manual bumping is unreliable. |
| **MEDIUM** | **Strategy predictor has placeholder** | `calculateGap()` returns `0` with `// TODO: Calculate from timing data` |
| **MEDIUM** | **Stint tracker hardcoded compound** | `compound: 'unknown'` with `// TODO: Infer from pit duration or SDK data` |
| **MEDIUM** | **Report service is a stub** | `parseAndGenerateSummary()` — `TODO: Implement actual file parsing from object storage` |
| **MEDIUM** | **S3 malware scan is a stub** | Returns placeholder — `TODO: Implement actual malware scanning` |
| **LOW** | **`SpokenSummaryBuilder` has TODO stubs** | `summarizeThreeWide()` and `summarizeOfftrack()` are unimplemented |
| **LOW** | **No database backup strategy visible** | No pg_dump scripts, no backup cron, no WAL archiving config |

### Recommendation
1. **Fix Dockerfiles immediately** — remove `packages/dashboard` references; this is a deploy blocker.
2. Split `drivers.ts` into domain-specific route files (profile, sessions, crew, coaching, telemetry, etc.)
3. Automate build version injection via CI/env vars.

---

## 3. WEB APP (`apps/app/`) — React/Vite/TailwindCSS

### What It Does
The primary user-facing application at `app.okboxbox.com`. Three product tiers: Driver (individual coaching), Team (pitwall/strategy), League (race control/protests). ~80 pages, 56 components, 20 hooks, 25 lib/service files.

### Strengths
- **Lazy-loaded routes** — every page chunk is `lazy()` imported, good bundle splitting
- **Rich driver tier** — Landing, Cockpit, IDP, Progress, History, Crew Chat (Engineer/Spotter/Analyst), BlackBox, HUD, Voice, Replay
- **Full pitwall** — Strategy, Practice, Roster, Reports, Setups, Race Viewer, Stint Planner, Race Plan, Driver Comparison
- **League system** — Dashboard, Championship, Incidents, Protests, Penalties, Rulebook, Settings
- **Admin panel** — Overview, Ops, Users, Entitlements, Telemetry
- **Entitlement gating** — `useEntitlements` hook + `FeatureGate` component for tier-based access
- **Error boundaries** — both route-level and component-level
- **Dev audit overlay** — `DevAuditOverlay` for runtime inspection
- **Build: 400KB gzipped** — reasonable for the feature set

### Issues

| Severity | Issue | Detail |
|----------|-------|--------|
| **MEDIUM** | **Near-zero frontend test coverage** | Only 2 test files: `useRelay.test.tsx` and `format.test.ts`. ~80 pages, 56 components, 20 hooks — virtually untested. |
| **MEDIUM** | **Massive page files** | `DriverLanding.tsx` (78KB/1500+ lines after cleanup), `DriverIDP.tsx` (64KB), `DriverHistory.tsx` (48KB), `DriverProgress.tsx` (51KB), `PitwallHome.tsx` (63KB). These should be decomposed into smaller components. |
| **MEDIUM** | **League pages use mock/demo data** | `LeagueChampionship`, `LeagueProtests`, `RaceControlTest` — short-circuit to demo data. Not connected to real APIs. |
| **MEDIUM** | **`_league` unused state in `LeagueRulebook.tsx`** | Set but never read — could be fully removed. |
| **MEDIUM** | **Pre-existing unused vars** | `RaceControlTest.tsx` (`statusColors`, `sessionStatus`), `EngineerCore.ts` (`_opinions`, `_lastMessage`) |
| **LOW** | **`useRaceSimulation.ts` hardcoded speed** | `const currentSpeed = 300;` — expected for demo/mock, but should be documented |
| **LOW** | **`services/mockData/types.ts`** still imported by `useTeamData.tsx` | Type imports only, not actual mock data — but confusing naming |

### Recommendation
1. Add integration tests for critical hooks (`useDriverData`, `useRelay`, `useEntitlements`).
2. Decompose the 5 largest page files into sub-components.
3. Rename `services/mockData/` to `services/types/` to avoid confusion.

---

## 4. DESKTOP APP (`apps/desktop/`) — Electron

### What It Does
Native Windows app with login UI, iRacing SDK integration via `irsdk-node`, Socket.IO connection to production server, PTT voice system with Whisper transcription, and deep link protocol (`okboxbox://`).

### Strengths
- **Full auth flow** — Supabase email/password login stored in `electron-store`
- **Voice system** — PTT with joystick/keyboard support, Whisper transcription, ElevenLabs TTS
- **Deep links** — `okboxbox://` protocol for browser → desktop handoff
- **Auto-start** — Registers on Windows boot via `auto-launch`
- **System tray** — Minimizes to tray with status indicators

### Issues

| Severity | Issue | Detail |
|----------|-------|--------|
| **HIGH** | **Hardcoded production server URL at audit time** | Line 17 used the old `octopus-app-qsi3i` host during this assessment; follow-up cleanup moved the fallback to `https://api.okboxbox.com` |
| **HIGH** | **Hardcoded Supabase URL** | Line 18: `SUPABASE_URL = 'https://muypplgzqqtjlwinhunw.supabase.co'` — should be configurable |
| **MEDIUM** | **`.ts` and `.js` files coexist** | `main.ts` + `main.js`, `preload.ts` + `preload.js`, `voice.ts` + `voice.js` — compiled JS checked into repo alongside source |
| **MEDIUM** | **`iracing: any`** | Line 10: untyped iRacing SDK instance |
| **LOW** | **`release/` directory (79 items)** | Built release artifacts tracked in git |

### Recommendation
1. Move server/Supabase URLs to a config file or build-time env injection.
2. Add `.js` and `.d.ts` to `.gitignore` for electron directory — only track `.ts` source.
3. Type the iRacing SDK instance properly.

---

## 5. MARKETING WEBSITE (`apps/website/`)

### What It Does
Static marketing site at `okboxbox.com` — landing page, pricing, features. React/Vite/Tailwind.

### Assessment
- 13 page files, 4 components — small and focused
- Has its own `dist/` directory — likely deployed separately
- **No issues found** — appropriate scope for a marketing site

---

## 6. SHARED PACKAGES

| Package | Size | Purpose | Status |
|---------|------|---------|--------|
| `packages/common` | 132 items | Shared types/utilities | ✅ Active |
| `packages/protocol` | 68 items | WebSocket protocol definitions | ✅ Active |
| `packages/shared` | 25 items | Shared constants | ✅ Active |
| `packages/contracts` | 2 items | API contracts | ⚠️ Minimal — may be underused |
| `racebox-components` | 22 items | UI component library | ⚠️ Not imported anywhere visible — possibly dead |

---

## 7. INFRASTRUCTURE & DEPLOYMENT

### Current Stack
- **Hosting:** DigitalOcean App Platform (server) + likely Netlify/Vercel (frontend)
- **Database:** PostgreSQL 15 (Docker locally, managed in prod)
- **Cache:** Redis 7 (Docker locally, managed in prod)
- **Auth:** Supabase (hosted)
- **AI:** OpenAI (GPT for crew chat, coaching), ElevenLabs (TTS)
- **Monitoring:** Sentry (error tracking)
- **Billing:** Stripe + Squarespace webhooks

### Issues

| Severity | Issue | Detail |
|----------|-------|--------|
| **CRITICAL** | **Dockerfile broken** | References deleted `packages/dashboard` — **cannot build Docker image** |
| **CRITICAL** | **`Dockerfile.dashboard` entirely stale** | References deleted package — should be removed or replaced |
| **HIGH** | **No CI/CD pipeline visible** | No `.github/workflows/` files found (directory exists but appears empty). Manual deploys only. |
| **HIGH** | **Secrets potentially in repo** | `tools/relay-agent/.env`, `relay/agent/.env`, `services/api/.env` — all tracked |
| **MEDIUM** | **No database backup automation** | No backup scripts, no pg_dump cron, no WAL archiving |
| **MEDIUM** | **`deploy-remote.sh` and `deploy-to-droplet.sh`** may reference stale paths | Need audit against current structure |
| **MEDIUM** | **`services/api/` contains compiled `dist/` only** | 52 items of compiled JS — no source. Appears to be a stale deployment artifact. |
| **LOW** | **30+ markdown docs at repo root** | `AUDIT_REPORTS/` (22 items), plus ~20 standalone `.md` files. Should consolidate into `docs/`. |

---

## 8. CODE HYGIENE & REPO HEALTH

### Dead / Stale Directories

| Directory | Items | Status | Action |
|-----------|-------|--------|--------|
| `apps/blackbox/` | 3 (dist only) | Dead — no source | Remove |
| `apps/launcher/` | 3 (dist only) | Dead — no source | Remove |
| `apps/racebox/` | 3 | Dead — no source | Remove |
| `apps/relay/` | 4914 | Stale Electron relay (deprecated per user) | Remove |
| `relay/` | 20 | PyInstaller build artifacts + deprecated agent | Remove |
| `services/api/` | 52 (dist only) | Stale compiled server output | Remove |
| `legacy/ProjectBlackBox/` | 13 | Legacy codebase preserved for reference | Keep (guarded by `guard-legacy.js`) |
| `control-plane/` | 0 | Empty directory | Remove |
| `racebox-components/` | 22 | Component library — possibly unused | Audit usage |
| `Dockerfile.dashboard` | 1 file | References deleted package | Remove |

### File Size Hotspots

| File | Size | Concern |
|------|------|---------|
| `driverbox/routes/drivers.ts` | **154 KB** | Unmaintainable monolith — split into domain routes |
| `DriverLanding.tsx` | 78 KB | Large but recently cleaned (465 lines removed) |
| `DriverIDP.tsx` | 64 KB | Intelligence Development Plan — complex but functional |
| `PitwallHome.tsx` | 63 KB | Team pitwall — complex but functional |
| `driver-memory.service.ts` | 62 KB | Driver memory/learning system — complex but functional |
| `TelemetryHandler.ts` | 58 KB | Real-time telemetry processing — complex but functional |
| `behavioral-worker.ts` | 46 KB | Behavioral index computation — core engine |

---

## 9. TEST COVERAGE

| Layer | Test Files | Coverage | Assessment |
|-------|-----------|----------|------------|
| **Server** | 23 files, 250+ tests | Good — covers auth, billing, incidents, strategy, telemetry, AI, rulebook | ✅ Solid |
| **Frontend** | 2 files | Near-zero — only `useRelay.test.tsx` and `format.test.ts` | ❌ Critical gap |
| **Relay** | 0 files | No automated tests | ❌ Risk for regressions |
| **Desktop** | 1 file (`test-irsdk.js`) | Manual test only | ❌ No automation |

---

## 10. SECURITY

| Severity | Issue | Detail |
|----------|-------|--------|
| **HIGH** | **`.env` files in repo** | At least 3 `.env` files tracked with potential secrets |
| **HIGH** | **Hardcoded Supabase + server URLs in desktop app** | No runtime configuration |
| **MEDIUM** | **JWT secret in `.env.example`** | Example value could be copy-pasted to production |
| **MEDIUM** | **Admin seed credentials in `.env.example`** | `admin@yourdomain.com` / `change-me-before-deploying` |
| **LOW** | **CORS `origin: true`** in standalone server | Reflects all origins — acceptable for dev, not for prod |

---

## EXECUTIVE SCORECARD

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Architecture** | 9/10 | Clean separation: relay → server → app. Protocol layer, service layer, repository pattern. Excellent. |
| **Feature Depth** | 10/10 | Unmatched in the sim racing space. IDP, behavioral analysis, AI crew, strategy engine, incident system, voice, replay. |
| **Code Quality** | 7/10 | Server is solid. Frontend has massive files. Relay has duplication. 154KB route file is a red flag. |
| **Test Coverage** | 5/10 | Server: good. Frontend: near-zero. Relay: zero. Desktop: zero. |
| **Infrastructure** | 4/10 | Broken Dockerfiles, no CI/CD, secrets in repo, no backup automation, stale deployment scripts. |
| **Repo Hygiene** | 5/10 | 6+ dead directories, 30+ root-level docs, stale build artifacts, compiled JS in source. |
| **Security** | 5/10 | `.env` files tracked, hardcoded URLs, no secrets management. |
| **Production Readiness** | 6/10 | Server runs. App deploys. But Dockerfiles are broken, no CI, no monitoring dashboard, no backup strategy. |

---

## PRIORITY ACTION ITEMS

### P0 — Deploy Blockers (fix now)
1. **Fix `Dockerfile`** — remove `packages/dashboard` references
2. **Delete `Dockerfile.dashboard`** — entirely stale
3. **Remove `.env` files from tracking** — add to `.gitignore`, rotate any exposed secrets

### P1 — High Impact (this week)
4. **Split `drivers.ts` (154KB)** into domain route files (profile, sessions, crew, coaching, telemetry, stats, goals, memory)
5. **Set up CI/CD** — GitHub Actions for build + test + deploy
6. **Remove dead directories** — `apps/blackbox`, `apps/launcher`, `apps/racebox`, `apps/relay`, `relay/`, `services/api/`, `control-plane/`
7. **Configure desktop app URLs via env/config** — not hardcoded

### P2 — Medium Impact (this sprint)
8. **Add frontend tests** — at minimum: `useDriverData`, `useEntitlements`, `useRelay`, auth flow
9. **Automate build version injection** — eliminate manual version bumps in `standalone.ts` and `index.ts`
10. **Database backup automation** — pg_dump cron or managed backup verification
11. **Consolidate root docs** — move `AUDIT_REPORTS/`, standalone `.md` files into `docs/`

### P3 — Cleanup (next sprint)
12. **Decompose large page files** — `DriverLanding`, `DriverIDP`, `DriverProgress`, `PitwallHome`
13. **Rename `services/mockData/`** to `services/types/`
14. **Audit `racebox-components/`** — remove if unused
15. **Implement strategy TODOs** — `calculateGap`, stint compound detection
16. **Clean up desktop electron directory** — don't track compiled `.js` alongside `.ts`
