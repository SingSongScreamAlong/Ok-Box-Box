# Ok, Box Box — Full System Audit Report

**Date:** 2026  
**Auditor:** Cascade AI  
**Scope:** Complete line-by-line audit of every file, package, service, infrastructure component, and deployment configuration  
**Classification:** Internal — CTO/CEO Review

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Monorepo Structure & Dependencies](#3-monorepo-structure--dependencies)
4. [Server / API Audit](#4-server--api-audit)
5. [Dashboard (ControlBox) Audit](#5-dashboard-controlbox-audit)
6. [App (Driver/Team/League Tier) Audit](#6-app-drivertierleague-tier-audit)
7. [Shared Packages Audit](#7-shared-packages-audit)
8. [Relay Agent Audit](#8-relay-agent-audit)
9. [WebSocket & Real-Time System Audit](#9-websocket--real-time-system-audit)
10. [Database & Migrations Audit](#10-database--migrations-audit)
11. [Authentication & Authorization Audit](#11-authentication--authorization-audit)
12. [Billing & Entitlements Audit](#12-billing--entitlements-audit)
13. [AI Services Audit](#13-ai-services-audit)
14. [Infrastructure & Deployment Audit](#14-infrastructure--deployment-audit)
15. [Security Audit](#15-security-audit)
16. [Racebox Components Audit](#16-racebox-components-audit)
17. [Legacy Code Audit](#17-legacy-code-audit)
18. [Scripts & Tooling Audit](#18-scripts--tooling-audit)
19. [Findings Summary & Risk Matrix](#19-findings-summary--risk-matrix)
20. [Recommendations](#20-recommendations)

---

## 1. Executive Summary

**Ok, Box Box** is a comprehensive iRacing ecosystem platform consisting of:

- **ControlBox** — Race control dashboard for league stewards (incident review, penalties, AI advisor)
- **BlackBox** — Team pit wall surface (live telemetry, strategy, car status)
- **Driver Tier** — Individual driver profile, AI crew chat, HUD, history, ratings
- **RaceBox** — Broadcast/spectator features (director controls, public timing)
- **Relay Agent** — Windows desktop app bridging iRacing SDK → cloud server via WebSocket

### Key Metrics

| Metric | Value |
|--------|-------|
| **Total packages** | 10+ (monorepo workspaces) |
| **Server routes** | 40+ REST endpoints |
| **WebSocket events** | 25+ bidirectional event types |
| **Database tables** | 20+ (PostgreSQL with auto-migrations) |
| **Frontend pages** | 60+ routes across 2 React apps |
| **Python relay files** | 24 modules |
| **Docker configurations** | 5 (dev, prod, RC, server, dashboard) |
| **CI/CD jobs** | 5 (lint, test, build, integration, E2E) |

### Overall Health: **GOOD — Production-Ready with Caveats**

The system is architecturally sound with clear separation of concerns, proper auth flows, tiered rate limiting, and comprehensive telemetry pipelines. Key concerns are around **exposed secrets in committed `.env` files**, **hardcoded default admin credentials**, and several **TODO items in billing/entitlement logic** that indicate incomplete product gating.

---

## 2. Architecture Overview

### System Topology

```
┌─────────────┐     WebSocket      ┌──────────────────┐     PostgreSQL
│ Relay Agent  │ ──────────────────▶│  ControlBox       │ ──────────────▶ DB
│ (Python/Win) │   telemetry,       │  Server (Node.js) │     
│ iRacing SDK  │   strategy_raw,    │  Express + WS     │     Redis
└─────────────┘   incidents         └────────┬─────────┘ ──────────────▶ Cache
                                             │
                    REST API + WS            │
              ┌──────────────────────────────┤
              │              │               │
     ┌────────▼───┐  ┌──────▼─────┐  ┌──────▼──────┐
     │ Dashboard   │  │ App (SPA)  │  │ Legacy LROC │
     │ (ControlBox)│  │ Driver/    │  │ BlackBox    │
     │ React+Vite  │  │ Team/League│  │ Dashboard   │
     └─────────────┘  └────────────┘  └─────────────┘
```

### Technology Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js 20, Python 3.11+ |
| **Server** | Express 4, Socket.IO 4 |
| **Database** | PostgreSQL 15 (pg driver) |
| **Cache** | Redis 7 |
| **Frontend** | React 18, Vite 5, TailwindCSS 3, Zustand |
| **Auth** | JWT (jsonwebtoken + jose), Supabase (apps/app) |
| **AI** | OpenAI GPT-4, ElevenLabs TTS, Whisper STT |
| **Billing** | Stripe Checkout + Customer Portal |
| **Deployment** | DigitalOcean App Platform, Docker, Nginx |
| **CI/CD** | GitHub Actions |
| **Testing** | Vitest, Playwright, Testing Library |

---

## 3. Monorepo Structure & Dependencies

### Root `package.json`

- **Workspaces:** `packages/*`, `tools/*`, `apps/*`
- **Engine:** `node >= 20.0.0`
- **Key scripts:** `build`, `dev`, `test`, `lint`, `typecheck`, `db:migrate`

### TypeScript Configuration (`tsconfig.base.json`)

- **Target:** ES2022
- **Module:** NodeNext
- **Strict mode:** Enabled
- **Good practices enforced:** `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`

### Workspace Packages

| Package | Version | Purpose |
|---------|---------|---------|
| `@controlbox/common` | 0.1.0-alpha | Shared types, constants, validators |
| `@controlbox/protocol` | — | Zod schemas for relay↔server protocol |
| `@controlbox/server` | — | Express API + WebSocket server |
| `@controlbox/dashboard` | 1.0.0-rc1 | ControlBox React SPA |
| `@okboxbox/app` | 0.1.0 | Driver/Team/League React SPA |
| `packages/contracts` | — | Shared data contracts (standalone types) |

### Findings

- **GOOD:** Strict TypeScript, consistent module resolution, proper workspace references
- **NOTE:** `packages/contracts` duplicates some types from `@controlbox/common` — potential for drift
- **NOTE:** `@okboxbox/app` uses `@supabase/supabase-js` while `@controlbox/dashboard` uses internal JWT auth — two auth systems coexist

---

## 4. Server / API Audit

### Entry Point (`packages/server/src/index.ts`)

**Flow:** Load env → Init DB → Run migrations → Seed admin → Start iRacing sync scheduler → Create HTTP server → Init WebSocket → Listen

- Graceful shutdown handlers for `SIGTERM`/`SIGINT`
- Database connection tested before server starts
- Migrations are resilient (errors logged, not fatal)

### Express App (`packages/server/src/app.ts`)

**Middleware chain:**
1. `correlationMiddleware` — Request correlation IDs
2. CORS — Production-specific origin filtering from `config.corsOrigins`
3. `helmet` — Security headers
4. `optionalAuth` — JWT verification (non-blocking)
5. `tieredRateLimiter` — Entitlement-based rate limiting
6. `morgan` — Request logging
7. Body parsing (JSON 10MB, URL-encoded)
8. Prometheus `/metrics` endpoint (gated by env flag)
9. API router at `/api`
10. Legacy BlackBox static files at `/blackbox`
11. Global error handler

### API Routes (`packages/server/src/api/routes/index.ts`)

**40+ route groups mounted:**

| Path | Purpose | Auth |
|------|---------|------|
| `/api/health` | Health checks, readiness, telemetry diagnostics | None |
| `/api/auth` | Login, register, logout, refresh, bootstrap | Mixed |
| `/api/admin` | User/role/license management | Super Admin |
| `/api/sessions` | Session CRUD | None (should be auth'd) |
| `/api/incidents` | Incident CRUD + AI analysis | None (should be auth'd) |
| `/api/billing/stripe` | Checkout, portal | Auth required |
| `/api/v1/drivers` | Driver IDP (profiles, identities, stats, crew-chat) | Auth required |
| `/api/v1/teams` | Team CRUD, membership, roster, events, debriefs | Auth required |
| `/api/iracing/oauth` | iRacing OAuth flow | Auth required |

### Route-Level Findings

1. **CRITICAL — Sessions/Incidents routes lack auth middleware.** `sessionsRouter` and `incidentsRouter` are mounted without `requireAuth`. Any unauthenticated request can create/update sessions and incidents.

2. **HIGH — Incident analysis endpoint trusts client-supplied rules.** `POST /api/incidents/:id/analyze` accepts `rules` from `req.body` — a client could inject arbitrary rules to influence AI recommendations.

3. **MEDIUM — Bootstrap endpoint uses dynamic imports.** `GET /api/auth/me/bootstrap` dynamically imports entitlement service on every request. Should be top-level import for performance.

4. **LOW — Entitlements endpoint has hardcoded TODOs.** `GET /api/auth/entitlements` returns hardcoded product access instead of reading from database.

### Middleware Audit

#### Auth (`packages/server/src/api/middleware/auth.ts`)
- Supports both internal JWT and Supabase tokens
- `requireAuth` extracts from `Authorization` header or `token` query param
- `optionalAuth` allows unauthenticated requests through
- `requireSuperAdmin` checks `user.isSuperAdmin`
- **GOOD:** Token verification uses `jsonwebtoken.verify()`

#### Rate Limiting (`packages/server/src/api/middleware/rate-limit-tiers.ts`)
- 5 tiers: anonymous (30/15min), blackbox (120/15min), controlbox (300/15min), bundle (600/15min), admin (unlimited)
- Key generation uses user ID or IP
- **GOOD:** Proper 429 responses with rate limit headers

#### License (`packages/server/src/api/middleware/license.ts`)
- Entitlement-based access control with role hierarchy
- League context resolution from session/params
- License validation for season-scoped operations
- **GOOD:** Fails closed on entitlement check errors

#### Error Handler (`packages/server/src/api/middleware/error-handler.ts`)
- Standardized `ApiError` class with factory methods
- Catches all errors, logs, returns JSON
- **GOOD:** Does not leak stack traces in production

### Configuration (`packages/server/src/config/index.ts`)
- All settings from environment variables
- Production validation: JWT_SECRET length check, localhost warnings
- **GOOD:** Warns against weak secrets in production

### Database Client (`packages/server/src/db/client.ts`)
- `pg.Pool` with dynamic SSL configuration
- Self-signed cert support for DigitalOcean
- Graceful pool shutdown
- **GOOD:** Connection pooling with proper cleanup

---

## 5. Dashboard (ControlBox) Audit

### Package: `@controlbox/dashboard`

**Stack:** React 18, React Router 6, Vite 5, TailwindCSS 3, Zustand, Recharts, Socket.IO Client, Lucide React, date-fns

### Routing (`packages/dashboard/src/App.tsx`)

**60+ routes organized by surface:**

| Surface | Routes | Auth | Capability Gate |
|---------|--------|------|-----------------|
| **Public** | `/login`, `/about/build`, `/pricing`, `/download-relay`, `/my-idp` | None | None |
| **RaceBox** | `/broadcast`, `/watch/:sessionId` | Mixed | None/Free |
| **Driver** | `/driver/*` (IDP, sessions, stats, ratings, crew) | Required | `driver_hud`, `driver_idp` |
| **BlackBox** | `/team`, `/team/pitwall`, `/team/:sessionId` | Mixed | `pitwall_view` |
| **Team System** | `/teams/:teamId/*` (roster, events, reports, planning) | Required | None |
| **ControlBox** | `/controlbox/*` (incidents, rulebooks, reports, RCO) | Required | `incident_review`, `rulebook_manage`, etc. |
| **Billing** | `/billing/return`, `/billing/manage` | Required | None |
| **Admin** | `/controlbox/admin/diagnostics`, `/controlbox/audit` | Required | `session_authority` |

### Architecture Patterns
- `BootstrapProvider` — Single source of truth for user capabilities
- `RequireCapability` — Component-level capability gating
- `ProtectedRoute` — Auth-required wrapper
- `ErrorBoundary` — Global error catching
- `ToastProvider` / `ToastContainer` — Notification system
- `CanonicalBuildBadge` — Build version indicator

### Findings

1. **MEDIUM — Alpha testing bypasses.** `/team/:sessionId` renders `<SessionView />` without auth or capability checks (comment says "auth disabled for alpha testing").

2. **MEDIUM — `/driver-test` and `/session-test` routes exist without auth.** These appear to be development/testing routes that should be removed or gated in production.

3. **LOW — Route conflict.** `/driver` is defined twice — once for `DriverStatusPanel` (with capability gate) and once for `DriverLayout` with nested routes. React Router will match the first.

---

## 6. App (Driver/Team/League Tier) Audit

### Package: `@okboxbox/app`

**Stack:** React 18, React Router 6, Vite 5, TailwindCSS 3, Framer Motion, Recharts, Socket.IO Client, Supabase, Rive

### Key Differences from Dashboard
- Uses **Supabase** for auth (not internal JWT)
- Has its own `useAuth` context wrapping Supabase client
- Includes `RelayProvider` for WebSocket telemetry
- `DevAuditOverlay` for development debugging

### Route Structure
- **Auth:** `/login`, `/signup`, `/forgot-password`, `/auth/reset-password`, `/auth/callback`
- **Driver:** `/driver/*` (cockpit, history, ratings, profile, crew/engineer|spotter|analyst, progress, replay, HUD, voice)
- **Team:** `/team/:teamId/*` (pitwall/strategy|practice|roster|planning|race|compare|stint-planner|events|reports|setups|incidents)
- **League:** `/league/:leagueId/*` (incidents, rulebook, penalties, championship, broadcast, protests, steward-console)
- **Public:** `/rco` (Race Control Test), `/download`, `/league/:leagueId/timing`
- **OAuth:** `/oauth/iracing/callback`

### Findings

1. **CRITICAL — `.env` file committed with live Supabase credentials.**
   ```
   VITE_SUPABASE_URL=https://muypplgzqqtjlwinhunw.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
   VITE_API_URL=https://octopus-app-qsi3i.ondigitalocean.app
   ```
   The Supabase anon key is a public key by design, but the production API URL and Supabase project ID are exposed in version control. The `.env` file should be in `.gitignore`.

2. **HIGH — Two separate auth systems.** `apps/app` uses Supabase auth while `packages/dashboard` uses internal JWT. This creates complexity for shared API endpoints that must validate both token types.

3. **MEDIUM — `/rco` route has no auth.** Race Control Test page is accessible without authentication.

---

## 7. Shared Packages Audit

### `@controlbox/common`

**Exports:** 17 type modules, 2 constant modules, 2 utility modules

Types cover: telemetry, incidents, sessions, rulebooks, penalties, API responses, disciplines, recommendations, relay protocol, auth, events, Discord, scoring, AI advisor, protests, voting, teams, audit logs, track shapes, evidence.

**GOOD:** Clean barrel exports, no runtime dependencies, TypeScript-only package.

### `@controlbox/protocol`

**Exports:** Zod schemas for v1 (session metadata, telemetry, incident, race event, intelligence) and v2 protocol.

**NOTE:** The TelemetryHandler currently **skips protocol validation** on the hot path (comment in code: "relay format is richer than the strict protocol schema"). This means the protocol package is partially unused at runtime.

### `packages/contracts`

**333 lines** of standalone TypeScript interfaces covering: SessionState, SessionDriver, LiveTimingBoard, StintPlan, StrategyPlan, FuelModel, FuelCalculation, DriverMetrics, DriverTrait, TelemetryData, TeamRoster, TeamMember, TeamEvent, DriverAvailability, TeamDebrief, DriverDebrief, UserEntitlements.

**Finding:** This package overlaps significantly with `@controlbox/common`. Types like `TelemetryData`, `DriverTrait`, and team types exist in both packages with slightly different shapes. This is a **drift risk**.

---

## 8. Relay Agent Audit

### `tools/relay-agent` (Primary — Python)

**24 Python modules** forming the desktop relay application.

#### Core Components

| Module | Purpose |
|--------|---------|
| `main.py` | Entry point, `RelayAgent` class, main polling loop |
| `iracing_reader.py` | pyirsdk wrapper, `CarData`/`SessionData` dataclasses |
| `pitbox_client.py` | Socket.IO client for server communication |
| `data_mapper.py` | Maps iRacing data → protocol format |
| `config.py` | Environment-based configuration |
| `video_encoder.py` | Screen capture → JPEG → WebSocket streaming |
| `voice_recognition.py` | PTT voice input handling |
| `overlay.py` | PTT overlay UI |
| `gui.py` | Settings GUI |
| `auto_updater.py` | Self-update mechanism |
| `backend_manager.py` | Multi-backend fan-out support |
| `settings_manager.py` | Persistent user settings |

#### Telemetry Pipeline

```
iRacing SDK → IRacingReader.get_all_cars() → data_mapper → PitBoxClient
                                                              ├── telemetry (binary, 10Hz)
                                                              ├── baseline stream (4Hz)
                                                              ├── controls stream (15Hz)
                                                              └── strategy_raw (1Hz)
```

#### Data Ingestion (Phase 16 — Full SDK)

The relay reads **50+ iRacing SDK variables** per car including:
- Position, lap, speed, gear, RPM, throttle, brake, clutch, steering
- Fuel level, fuel %, fuel use per hour
- Tire wear (L/M/R per corner, averaged)
- Tire temperatures (L/M/R per corner, Celsius)
- Brake pressure (per corner)
- Engine health (oil temp/pressure, water temp, voltage, warnings bitfield)
- Tire compound, engine warnings
- GPS coordinates (player car only)

#### Findings

1. **GOOD — Proper frame freezing.** `freeze_frame()` / `unfreeze_frame()` ensures consistent telemetry reads across all variables.

2. **GOOD — Pit stop tracking.** Edge-triggered pit entry/exit detection with per-car counters.

3. **GOOD — Engine damage inference.** Parses `EngineWarnings` bitfield to derive damage levels (oil pressure, water temp, oil temp, fuel pressure, stalled).

4. **MEDIUM — `incident_count` reads `CarIdxSessionFlags` instead of actual incident count.** Line 258: `self.ir['CarIdxSessionFlags'][car_idx]` — this is session flags (bitfield), not incident count. The actual incident count variable is not available per-car in iRacing's indexed arrays; only the player's total is available via `PlayerCarMyIncidentCount`.

5. **MEDIUM — Safety rating parsing is fragile.** Line 273: Strips all letter characters from `LicString` — works for "A 4.99" but may fail on edge cases.

6. **LOW — `gapAhead` and `gapBehind` are TODO.** Lines 405-406 in telemetry send — gaps are `None`, only computed server-side from standings.

### `tools/relay-python` (Legacy)

6 Python files — appears to be an older/simpler relay implementation. Contains `iracing_reader.py`, `controlbox_client.py`, `data_mapper.py`, `config.py`, `main.py`, `track_recorder.py`.

---

## 9. WebSocket & Real-Time System Audit

### Server-Side WebSocket (`packages/server/src/websocket/`)

#### Components

| File | Purpose |
|------|---------|
| `index.ts` | Socket.IO server init, auth gate, handler registration |
| `AuthGate.ts` | JWT verification + entitlement loading for WS connections |
| `SessionHandler.ts` | Session lifecycle (metadata, end, cleanup) |
| `TelemetryHandler.ts` | 825-line telemetry processing pipeline |
| `BroadcastHandler.ts` | Director controls, voice TTS, steward actions |
| `RoomManager.ts` | Session room join/leave |
| `telemetry-cache.ts` | In-memory telemetry snapshot for voice AI |
| `inference-engine.ts` | Server-side strategy inference from raw data |
| `rate-limit.ts` | Per-socket rate limiting |

#### Event Flow

**Inbound (Relay → Server):**
- `session_metadata` → Store session, broadcast `session:active`
- `session_end` → Trigger IDP pipeline, iRacing sync, post-session learning, cleanup
- `telemetry` → Process, cache, emit `timing:update`, `telemetry_update`, `telemetry:driver`, `session_info`
- `telemetry_binary` → Parse binary buffer, emit `timing:update`
- `strategy_raw` → Inference engine, emit `strategy:update`, `car:status`, `race:intelligence`, `spotter:callout`
- `standings` → Cache, emit `competitor_data`
- `incident` → Broadcast `incident:new`, `event:log`
- `race_event` → Broadcast `race:event`, `race:state`, `event:log`

**Outbound (Server → Clients):**
- `timing:update`, `telemetry_update`, `telemetry:driver` — Real-time telemetry
- `session:active`, `session:ended`, `session:state` — Session lifecycle
- `strategy:update`, `car:status` — Inferred strategy data
- `race:intelligence`, `spotter:callout`, `engineer:update` — AI insights
- `competitor_data` — Standings
- `incident:new`, `event:log` — Race events
- `voice:audio` — TTS responses
- `steward:decision` — Steward actions

#### Findings

1. **CRITICAL — AuthGate allows unauthenticated WebSocket connections.** Lines 16-20 of `AuthGate.ts`:
   ```typescript
   if (!token) {
       console.log(`Allowing unauthenticated connection for alpha testing`);
       socket.data.user = { sub: 'anonymous', entitlements: [] };
       return next();
   }
   ```
   This means **any client can connect to the WebSocket without authentication** and receive all telemetry, strategy, and race data.

2. **HIGH — TelemetryHandler is 825 lines.** This single file handles telemetry processing, caching, LROC compatibility, standings, strategy inference, session analyzer, proactive spotter, situational awareness, and incident detection. Should be decomposed.

3. **MEDIUM — Broadcast delay uses `setTimeout`.** Lines 307-313: Delayed broadcasts use `setTimeout` which can accumulate if many sessions are active. Consider a proper delay queue.

4. **MEDIUM — Intelligence emission uses `Math.random()`.** Line 593: `Math.random() < 0.1` to throttle intelligence updates is non-deterministic. Should use a proper timer/counter.

5. **LOW — Session cleanup interval is 30 seconds with 5-minute timeout.** Stale sessions are cleaned up every 30s if no update in 5 minutes. This is reasonable for handling red flags and long pit stops.

---

## 10. Database & Migrations Audit

### Migration System (`packages/server/src/db/migrations.ts`)

- Auto-creates `_migrations` tracking table
- Reads `.sql` files from multiple possible paths (Docker, workspace root, direct)
- Each migration runs in a transaction with rollback on failure
- **Resilient:** Failed migrations are logged but don't crash the server
- **One-time reset:** Clears stale migration records from legacy ProjectBlackBox deployment

### Admin Seeding

**CRITICAL — Default admin credentials are hardcoded:**
```typescript
const email = 'admin@okboxbox.com';
const password = 'ControlBox2024!';
```
This creates a super admin user with a known password on first deployment. While it uses `ON CONFLICT DO NOTHING` and only runs if no admin exists, the password should be generated or required from environment.

---

## 11. Authentication & Authorization Audit

### Auth Routes (`packages/server/src/api/routes/auth.ts`)

| Endpoint | Purpose | Validation |
|----------|---------|------------|
| `POST /api/auth/login` | Email/password login | Email + password required |
| `POST /api/auth/register` | Free account creation | Email format, password ≥ 8 chars, duplicate check |
| `POST /api/auth/logout` | Revoke refresh token | Optional refresh token |
| `POST /api/auth/refresh` | Token refresh | Refresh token required |
| `GET /api/auth/me` | Current user | Auth required |
| `GET /api/auth/entitlements` | User entitlements | Auth required |
| `GET /api/auth/me/bootstrap` | Full client bootstrap | Auth required |

### Bootstrap Endpoint

The `/api/auth/me/bootstrap` endpoint is the **single source of truth** for client initialization. It returns:
- User info
- Memberships (teams/leagues) — currently empty TODO
- Licenses (derived from entitlements)
- Roles (derived from licenses)
- Capabilities (derived from entitlements + roles)
- UI config (default landing, available surfaces)

**GOOD:** Super admin override grants all capabilities.
**NOTE:** Memberships are hardcoded empty — team/league membership not yet read from DB.

### Dual Auth System

| System | Used By | Token Type |
|--------|---------|------------|
| Internal JWT | `@controlbox/dashboard`, `@controlbox/server` | `jsonwebtoken` signed with `JWT_SECRET` |
| Supabase | `@okboxbox/app` | Supabase JWT (verified with `jose`) |

The server auth middleware handles both:
1. First tries internal JWT verification
2. Falls back to Supabase token verification via JWKS

---

## 12. Billing & Entitlements Audit

### Stripe Integration (`packages/server/src/api/routes/billing-stripe.ts`)

| Endpoint | Purpose |
|----------|---------|
| `POST /api/billing/stripe/checkout` | Create Stripe Checkout session for tier (driver/team/league) |
| `POST /api/billing/stripe/portal` | Open Stripe Customer Portal |

- Validates tier against `['driver', 'team', 'league']`
- Uses `DASHBOARD_URL` env var for redirect URLs with localhost fallback
- **GOOD:** Auth required on both endpoints

### Entitlement System

The bootstrap endpoint derives capabilities from entitlements:
- `driver` or `bundle` → driver license
- `team` or `bundle` → team license
- `league` or `bundle` → league license
- Capabilities like `driver_hud`, `pitwall_view`, `incident_review`, `session_authority` are derived from entitlements + roles

**Finding:** The entitlement-to-capability derivation is the **correct architectural pattern** (app branches on capabilities, never license names). However, several TODO comments indicate the system is not fully wired to the database yet.

---

## 13. AI Services Audit

### Services Identified

| Service | Purpose | API |
|---------|---------|-----|
| `llm-service.ts` | Chat completions for crew chat | OpenAI GPT-4 |
| `steward-advisor.ts` | Incident analysis recommendations | Rule-based + AI |
| `situational-awareness.ts` | Race engineer intel generation | OpenAI |
| `live-session-analyzer.ts` | Accumulated race intelligence | Internal |
| `proactive-spotter.ts` | Edge-triggered spotter callouts | Internal |
| `post-session-learner.ts` | Driver memory updates from sessions | OpenAI |
| Voice (Whisper + ElevenLabs) | STT + TTS for voice queries | OpenAI Whisper, ElevenLabs |

### Crew Chat Integration

The `POST /api/v1/drivers/me/crew-chat` endpoint injects live telemetry into AI crew member system prompts. When the driver is in a live session, the engineer/spotter/analyst can answer questions about current fuel, tires, gaps, position, damage, weather, standings, and engine health. Includes a 30-second staleness check.

### Findings

1. **GOOD:** AI services are properly gated by API key availability (`isLLMConfigured()`)
2. **GOOD:** Voice query handler includes context from live telemetry and driver profiles
3. **MEDIUM:** Steward advisor is rule-based (`generateAdvice`), not LLM-based — the "AI analysis" endpoint name is somewhat misleading

---

## 14. Infrastructure & Deployment Audit

### Docker

| File | Purpose | Base Image |
|------|---------|------------|
| `Dockerfile` | Server (general) | `node:20-alpine` |
| `Dockerfile.server` | Server (specialized) | `node:20-alpine` |
| `Dockerfile.dashboard` | Dashboard (Nginx) | `node:20-alpine` → `nginx:alpine` |

All Dockerfiles use multi-stage builds. The server Dockerfiles are nearly identical — **should be consolidated**.

### Docker Compose

| File | Purpose | Services |
|------|---------|----------|
| `docker-compose.yml` | Development | postgres, redis |
| `docker-compose.prod.yml` | Production template | postgres, redis, server, dashboard |
| `docker-compose.rc.yml` | Release Candidate | postgres, redis, server, dashboard |

**GOOD:** Production compose does not expose DB/Redis ports externally.

### Nginx (`nginx.conf`)

- SPA fallback (`try_files $uri $uri/ /index.html`)
- Gzip compression for common web assets
- Aggressive caching for static assets
- **GOOD:** Proper SPA routing configuration

### CI/CD (`.github/workflows/ci.yml`)

**5 jobs:**
1. `lint-and-typecheck` — ESLint + TypeScript
2. `unit-tests` — Vitest for `packages/server`
3. `build` — Build all packages
4. `integration-tests` — Docker services (Postgres + Redis) for API tests
5. `e2e-tests` — Playwright for `packages/dashboard`

**Triggers:** Push/PR to `main` and `develop`

**GOOD:** Comprehensive CI pipeline with proper job dependencies.

### DigitalOcean App Platform (`.do/app.yaml`)

- API service using `Dockerfile.server`
- Static sites for dashboard and ops-console
- GitHub integration for auto-deploy
- Managed PostgreSQL database
- Environment variables and secrets properly configured
- Health checks configured

### Deploy Scripts

| Script | Purpose |
|--------|---------|
| `deploy-to-droplet.sh` | SSH-based deployment to DO droplet |
| `deploy-remote.sh` | Remote execution on droplet (Docker, Git, UFW) |
| `DEPLOY-DROPLET.bat` | Windows wrapper for deployment |

**Finding:** `deploy-remote.sh` dynamically generates `docker-compose.live.yml` and `Dockerfile.dashboard` on the remote server. This is fragile — any change to the deployment script could break production.

---

## 15. Security Audit

### CRITICAL Issues

| # | Issue | Location | Risk |
|---|-------|----------|------|
| S1 | **`.env` committed with live credentials** | `apps/app/.env` | Supabase URL, anon key, production API URL exposed in git |
| S2 | **Hardcoded default admin password** | `packages/server/src/db/migrations.ts:153` | `ControlBox2024!` — known credential |
| S3 | **Unauthenticated WebSocket connections** | `packages/server/src/websocket/AuthGate.ts:17-20` | All telemetry/strategy data accessible without auth |
| S4 | **Sessions/Incidents API routes lack auth** | `packages/server/src/api/routes/sessions.ts`, `incidents.ts` | Anyone can CRUD sessions and incidents |

### HIGH Issues

| # | Issue | Location | Risk |
|---|-------|----------|------|
| S5 | **JWT_SECRET validation only warns** | `packages/server/src/config/index.ts` | Weak secrets in production only generate console warnings |
| S6 | **Client-supplied rules in AI analysis** | `packages/server/src/api/routes/incidents.ts:108` | Untrusted input influences AI recommendations |
| S7 | **Production API URL hardcoded in relay config** | `tools/relay-agent/config.py:20` | `https://octopus-app-qsi3i.ondigitalocean.app` as default |

### MEDIUM Issues

| # | Issue | Location | Risk |
|---|-------|----------|------|
| S8 | **CORS origins from env without validation** | `packages/server/src/app.ts` | Misconfigured origins could allow cross-origin attacks |
| S9 | **Rate limit bypass for telemetry events** | `packages/server/src/websocket/AuthGate.ts:56` | `telemetry`, `telemetry_binary`, `video_frame` skip rate limiting |
| S10 | **Refresh token not validated against DB on every use** | `packages/server/src/api/routes/auth.ts` | Depends on `authService.refreshAccessToken` implementation |

### Positive Security Measures

- **Helmet** middleware for security headers
- **bcrypt** with cost factor 12 for password hashing
- **Tiered rate limiting** based on entitlements
- **SSL/TLS** support for PostgreSQL connections
- **CORS** with configurable origins
- **JWT expiration** configured via environment
- **UFW firewall** rules in deploy scripts
- **Docker** isolation for services
- **No stack traces** leaked in production error responses

---

## 16. Racebox Components Audit

### `racebox-components/`

| Component | Purpose |
|-----------|---------|
| `Director.tsx/css` | Broadcast director controls |
| `PublicTiming.tsx/css` | Public timing board |
| `overlays/BattleBox.tsx/css` | Battle overlay graphics |
| `overlays/IncidentBanner.tsx/css` | Incident banner overlay |
| `overlays/PositionTracker.tsx/css` | Position tracker overlay |
| `overlays/StandingsOverlay.tsx/css` | Standings overlay |

These are standalone React components for broadcast graphics. They appear to be designed for OBS/streaming integration.

---

## 17. Legacy Code Audit

### `legacy/ProjectBlackBox/`

Contains the original ProjectBlackBox codebase with:
- Shell scripts (17), batch files (3), PowerShell scripts (2)
- Python files (3), JavaScript files (4)
- Configuration files (JSON, TOML, YAML)
- A `.bfg-report` directory (indicating BFG Repo-Cleaner was used — likely to remove secrets from git history)

**Finding:** The legacy directory is large and should be evaluated for removal or archival. The `.bfg-report` suggests sensitive data was previously committed and cleaned.

---

## 18. Scripts & Tooling Audit

### `scripts/`

| Script | Purpose |
|--------|---------|
| `guard-legacy.js` | Prevents accidental legacy code modifications |
| `manual_rate_limit_test.js` | Rate limit testing utility |
| `package-release.sh` | Release packaging |
| `rc-chaos.sh` | RC chaos testing |
| Various `.sh` scripts | Build, deploy, test utilities |

### `tools/`

| Tool | Purpose |
|------|---------|
| `tools/relay` | TypeScript relay (alternative to Python) |
| `tools/relay-agent` | Primary Python relay agent (24 files) |
| `tools/relay-python` | Legacy Python relay (6 files) |
| `tools/test-harness` | Test harness for relay testing |
| `tools/analyze_track.ts` | Track analysis utility |
| `tools/export-reference.ts` | Reference data export |

**Finding:** Three relay implementations exist (TypeScript, Python relay-agent, Python relay-python). Only `tools/relay-agent` appears to be the active/maintained version.

---

## 19. Findings Summary & Risk Matrix

### Critical (Immediate Action Required)

| ID | Finding | Impact |
|----|---------|--------|
| F1 | `.env` with live Supabase credentials committed to git | Credential exposure |
| F2 | Hardcoded default admin password `ControlBox2024!` | Known credential attack |
| F3 | WebSocket AuthGate allows unauthenticated connections | Full telemetry data leak |
| F4 | Sessions/Incidents REST routes lack authentication | Unauthorized data manipulation |

### High (Address Before Production)

| ID | Finding | Impact |
|----|---------|--------|
| F5 | Two separate auth systems (Supabase + internal JWT) | Complexity, potential bypass |
| F6 | Client-supplied rules influence AI analysis | Untrusted input in AI pipeline |
| F7 | TelemetryHandler.ts is 825 lines — needs decomposition | Maintainability risk |
| F8 | Production API URL hardcoded in relay config defaults | Accidental production connections |
| F9 | Duplicate/near-identical Dockerfiles | Maintenance burden |

### Medium (Address in Next Sprint)

| ID | Finding | Impact |
|----|---------|--------|
| F10 | Alpha testing auth bypasses in dashboard routes | Unauthorized access |
| F11 | Protocol validation skipped on telemetry hot path | Schema drift risk |
| F12 | `packages/contracts` duplicates `@controlbox/common` types | Type drift |
| F13 | Bootstrap endpoint uses dynamic imports | Performance |
| F14 | Entitlements endpoint returns hardcoded data | Incomplete product gating |
| F15 | `Math.random()` for intelligence emission throttling | Non-deterministic behavior |
| F16 | Relay `incident_count` reads session flags, not incidents | Incorrect incident detection |
| F17 | Three relay implementations exist | Confusion, maintenance burden |

### Low (Track for Future)

| ID | Finding | Impact |
|----|---------|--------|
| F18 | Memberships in bootstrap are hardcoded empty | Incomplete feature |
| F19 | Dev/test routes (`/driver-test`, `/session-test`) in production | Minor exposure |
| F20 | Legacy ProjectBlackBox directory still present | Repo bloat |
| F21 | `setTimeout` for broadcast delay | Potential accumulation |

---

## 20. Recommendations

### Immediate (This Week)

1. **Remove `apps/app/.env` from git** and add to `.gitignore`. Rotate the Supabase anon key if it was ever used with elevated permissions.

2. **Remove or environment-gate the default admin password.** Replace with:
   ```typescript
   const password = process.env.DEFAULT_ADMIN_PASSWORD;
   if (!password) { console.warn('No DEFAULT_ADMIN_PASSWORD set, skipping seed'); return; }
   ```

3. **Remove the alpha testing bypass in AuthGate.** Require authentication for WebSocket connections or implement a proper anonymous access tier with limited data.

4. **Add `requireAuth` middleware to sessions and incidents routes.**

### Short-Term (Next 2 Weeks)

5. **Consolidate auth systems.** Either migrate `apps/app` to internal JWT or implement a proper auth gateway that validates both token types uniformly.

6. **Decompose TelemetryHandler.ts** into focused modules: telemetry processing, LROC compatibility, strategy inference, AI integration.

7. **Consolidate Dockerfiles.** Use build args to differentiate server vs. general builds.

8. **Remove or archive legacy code.** `legacy/ProjectBlackBox/` and `tools/relay-python/` should be archived or deleted.

9. **Re-enable protocol validation** on the telemetry path, or update the protocol schemas to match the relay's actual output.

### Medium-Term (Next Month)

10. **Complete entitlement wiring.** Replace hardcoded entitlements with database-driven product access.

11. **Implement proper team/league membership** in the bootstrap endpoint.

12. **Add input validation** for AI analysis endpoints — don't trust client-supplied rules.

13. **Add comprehensive API tests** for all route groups, especially auth and billing flows.

14. **Implement proper telemetry throttling** — replace `Math.random()` with deterministic counters.

### Long-Term (Next Quarter)

15. **Implement Redis caching** for frequently accessed data (entitlements, driver profiles).

16. **Add observability** — structured logging, distributed tracing, alerting.

17. **Implement database connection pooling monitoring** and query performance tracking.

18. **Security hardening** — implement CSP headers, HSTS, and regular dependency audits.

---

*End of Full System Audit Report*
