# Deep System Audit — Ok, Box Box / ControlBox Monorepo

**Date:** 2026-03-10

**Prepared for:** product, engineering, and operations decision-making

**Audit objective:** produce a comprehensive, readable system report covering active vs legacy inventory, deployment truth map, security/config audit, dead code and duplicate systems, runtime dependency map, and an immediate cleanup plan.

---

# 1. Executive Summary

This repository contains a **real, production-capable racing platform**, but it is carrying the weight of several previous product shapes at the same time.

The current system appears to have four genuinely active pillars:

- `apps/app` — the main driver-facing web app
- `apps/website` — the marketing/public website
- `apps/desktop` — the modern Electron desktop/relay product candidate
- `packages/server` — the primary backend API + WebSocket + background-service core

At the same time, the repository still contains:

- legacy `ControlBox` identity in package names, docs, and deployment materials
- multiple relay implementations
- stale references to deleted `packages/dashboard`
- multiple competing deployment descriptions
- orphaned build artifact folders that look like apps but are not maintained source packages
- duplicate CI workflow intent
- security-sensitive configuration fallbacks and hardcoded production endpoints

## Executive conclusion

The system is **not broken at the core**, but it is **architecturally ambiguous**.

The primary risks are not “missing features.” The primary risks are:

- **deployment ambiguity**
- **duplicate runtime surfaces**
- **stale docs and scripts acting as false authority**
- **auth/config fragility**
- **high maintenance burden from drift**

If left alone, these issues will continue to create:

- slow onboarding
- operational uncertainty
- accidental regressions
- wrong deploys
- parallel maintenance of obsolete surfaces

---

# 2. Audit Methodology

This report is based on direct inspection of the repository structure, package manifests, deployment specs, CI workflows, server/app entry points, and targeted runtime/config files.

## Evidence sources reviewed

### Root and workspace structure
- `package.json`
- root deployment files
- root docs and audit documents
- `.github/workflows/*`

### Active app/server surfaces
- `apps/app/package.json`
- `apps/app/src/main.tsx`
- `apps/app/app-spec.yaml`
- `apps/website/package.json`
- `apps/website/src/main.tsx`
- `apps/desktop/package.json`
- `apps/desktop/README.md`
- `apps/desktop/electron/main.ts`
- `packages/server/package.json`
- `packages/server/src/index.ts`
- `packages/server/src/app.ts`
- `packages/server/src/config/index.ts`
- `packages/common/package.json`

### Duplicate / legacy / ambiguous surfaces
- `apps/relay/package.json`
- `apps/relay/DEPRECATED.md`
- `apps/relay/src/main-simple.ts`
- `apps/relay/src/settings.ts`
- `tools/relay/package.json`
- `tools/relay-agent/package.json`
- `tools/test-harness/package.json`
- `tools/relay-agent/README.md`
- `tools/relay-python/README.md`
- `legacy/ProjectBlackBox/*`
- `services/api/*`
- root scripts and docs still referencing `packages/dashboard`

### Deployment and infrastructure materials
- `.do/app.yaml`
- `apps/app/app-spec.yaml`
- `docker-compose.prod.yml`
- `Dockerfile.server`
- `packages/server/Dockerfile`
- `DEPLOY.md`
- `DROPLET-SETUP-COMMANDS.md`
- `deploy-remote.sh`

### Security/config/CI
- `.env`
- `.env.example`
- `.github/workflows/ci.yml`
- `.github/workflows/e2e-tests.yml`
- targeted grep results for secrets, URLs, and auth fallbacks
- targeted `git ls-files` check for config tracking

## Limitation

This report is deep, but it is still not a literal line-by-line execution audit of every source file in the monorepo. It is a **comprehensive architectural, operational, and risk audit** based on the authoritative surfaces that determine product behavior, deployment, and system maintenance.

---

# 3. System Overview

## 3.1 What the system appears to be today

The repository currently represents a combined platform for:

- driver-facing live racing assistance
- team/race support surfaces
- telemetry streaming from iRacing relays
- AI chat / voice interactions
- post-session analysis and IDP-style insights
- league/control/race operations history from earlier product iterations

## 3.2 Primary current runtime surfaces

### A. Driver app
**Path:** `apps/app`

This is the main authenticated browser application for driver-facing experiences. It builds with Vite and React and includes current driver surfaces such as cockpit, pitwall, voice, IDP, BlackBox, and crew interactions.

### B. Marketing website
**Path:** `apps/website`

This appears to be a separate marketing/public-facing website, also Vite + React.

### C. Desktop app / relay
**Path:** `apps/desktop`

This is a substantive Electron product with login, local state, voice/PTT, iRacing SDK integration, and socket connectivity to the production server.

### D. Backend server
**Path:** `packages/server`

This is the main backend runtime: Express API, WebSocket server, DB init, migrations, rate limiting, Sentry, metrics, OAuth callback handling, and legacy static serving for `/blackbox`.

---

# 4. Active vs Legacy Inventory

This section classifies the major surfaces discovered during the audit.

## 4.1 Active surfaces

### `apps/app`
**Status:** Active

**Evidence:**
- has normal package manifest
- recent code changes and working build
- has dedicated deployment spec `apps/app/app-spec.yaml`
- included in root scripts: `npm run app`

**Role:** main driver-facing product web app

**Risk if kept as-is:** moderate only due to surrounding repo drift

### `apps/website`
**Status:** Active

**Evidence:**
- normal package manifest
- standard Vite React entrypoint
- root script `npm run website`

**Role:** marketing/public web surface

### `apps/desktop`
**Status:** Active

**Evidence:**
- full Electron manifest and build scripts
- real runtime integrations: auth, socket, iRacing SDK, voice/PTT
- current development command referenced by deprecated relay notes
- `apps/desktop/README.md` explicitly states: “This is the main desktop app” and labels other relay directories legacy/dev tools

**Role:** primary modern end-user desktop/relay path

### `packages/server`
**Status:** Active

**Evidence:**
- root backend script points here
- production entrypoint `src/index.ts`
- deployment config references `Dockerfile.server`
- contains live API, websocket, auth, voice, telemetry, billing, and route handling

**Role:** central backend runtime

### `packages/common`
**Status:** Active-ish shared dependency

**Evidence:**
- published workspace package
- consumed by `packages/server`
- still named `@controlbox/common` and described as "Shared types, constants, and utilities for ControlBox"

**Role:** shared types/utilities

### `packages/protocol`
**Status:** Active-ish shared dependency

**Evidence:**
- buildable package manifest
- server Dockerfile copies/builds it
- purpose fits relay/server data contract layer

**Role:** telemetry/protocol schema layer

### `packages/contracts`
**Status:** Probably active but immature

**Evidence:**
- package manifest exists
- intended shared contracts package

**Risk:** its packaging is incomplete-looking (`main` points directly at `index.ts`)

### `tools/test-harness`
**Status:** Active support tooling

**Evidence:**
- package manifest exists
- CI workflow calls it for smoke testing
- has explicit smoke/replay/rate/load scripts

**Role:** support validation tooling for server/runtime behavior

---

## 4.2 Legacy or deprecated surfaces

### `apps/relay`
**Status:** Deprecated but still source-bearing

**Evidence:**
- explicit `DEPRECATED.md`: “The primary desktop app is `apps/desktop/`.”
- still contains full Electron source, dist, release outputs, embedded python assets, package lock, packaging config

**Role:** old minimal tray relay agent

**Problem:**
This is explicitly deprecated, yet still close enough to active that it can mislead maintainers, package flows, release processes, and runtime choices.

### `legacy/ProjectBlackBox/dashboard`
**Status:** Legacy

**Evidence:**
- lives under `legacy/`
- root scripts `legacy:website`, `legacy:dashboard`, `ops:console` still point to legacy paths

**Problem:**
Legacy systems are still runnable via root scripts, which keeps them semi-alive operationally.

### `legacy/ProjectBlackBox/blackbox-web`
**Status:** Legacy

**Evidence:**
- lives under `legacy/`
- referenced in root scripts

---

## 4.3 Duplicate surfaces

### `tools/relay-agent`
**Status:** Duplicate / parallel relay path

**Evidence:**
- standalone Python relay with its own README, config, installer, run scripts
- production URL references
- auth/config model separate from Electron desktop

**Role:** CLI/packaged Python relay path

### `tools/relay`
**Status:** Duplicate / support relay path

**Evidence:**
- package manifest exists as `@controlbox/relay`
- described as a relay test client for simulating iRacing data
- overlaps protocol/runtime territory with other relay surfaces

**Role:** simulation/test relay surface, but still part of the relay sprawl problem

### `tools/relay-python`
**Status:** Duplicate / older relay path

**Evidence:**
- ControlBox-branded relay docs
- references old DigitalOcean URL `coral-app-x988a.ondigitalocean.app`
- standalone Python runtime with overlapping purpose

### `relay/`
**Status:** Ambiguous duplicate runtime family

**Evidence:**
- separate relay directory with local env/config and binaries/artifacts
- not integrated into workspaces as a normal package surface

**Risk:** highest confusion potential for “what is the real relay?”

---

## 4.4 Ambiguous or orphaned surfaces

### `apps/blackbox`
**Status:** Orphaned build artifact folder

**Evidence:**
- contains only `dist/`
- no manifest discovered
- no clear source entrypoint

### `apps/racebox`
**Status:** Orphaned build artifact folder

**Evidence:**
- contains only `dist/`
- no manifest discovered

### `apps/launcher`
**Status:** Orphaned build artifact folder

**Evidence:**
- contains only built output layout
- no obvious manifest or source package around it in inventory sweep

### `packages/shared`
**Status:** Orphaned build output or half-removed package

**Evidence:**
- `dist/` exists
- no package manifest found

### `services/api`
**Status:** Ambiguous stale backend output

**Evidence:**
- contains `.env` and `dist/`
- no package manifest found
- appears to be detached compiled output rather than active workspace source

---

# 5. Deployment Truth Map

This section describes what seems to be the current deployment picture, and where the truth is contradictory.

## 5.1 Deployment authorities found

### Authority A — `.do/app.yaml`
This is the strongest single production deployment spec found in the repo.

It defines:

- **API service** using `Dockerfile.server`
- **static site** for the dashboard/app using `apps/app`
- **managed Postgres** database
- runtime/build env vars
- route handling for `/api` and `/oauth/iracing`

### Authority B — `apps/app/app-spec.yaml`
This is a second DigitalOcean app spec focused specifically on the app static site.

### Authority C — `docker-compose.prod.yml`
This defines another production model:

- postgres
- redis
- server
- dashboard frontend container

But it describes a world closer to older `ControlBox` structure.

### Authority D — droplet/manual deployment docs and scripts
- `DEPLOY.md`
- `DROPLET-SETUP-COMMANDS.md`
- `deploy-remote.sh`
- `deploy-to-droplet.sh`
- `DEPLOY-DROPLET.bat`

These imply a separate or earlier deployment model.

### Authority E — `packages/server/Dockerfile`
There is a second server Dockerfile located under `packages/server/`.

Unlike the root `Dockerfile.server`, it only references:

- `packages/common`
- `packages/protocol`
- `packages/server`

and does **not** reference the deleted `packages/dashboard` package.

This suggests the repo contains two competing server container stories:

- **root `Dockerfile.server`** — stale / likely broken
- **`packages/server/Dockerfile`** — cleaner and closer to current structure

### Authority F — `Dockerfile.dashboard`
There is a dedicated dashboard Dockerfile at the repo root, but it still builds `packages/dashboard` and copies `packages/dashboard/dist`.

Given that `packages/dashboard` is absent from the current workspace inventory, this file should be treated as stale until proven otherwise.

## 5.2 Best current interpretation of production truth

The most likely current production architecture is:

### Browser app
- `apps/app`
- hosted as a static site on DigitalOcean App Platform
- build-time envs inject API and Supabase values

### Backend API/WebSocket
- `packages/server`
- deployed via DigitalOcean App Platform service using `Dockerfile.server`
- currently serves API and websocket on the `api.okboxbox.com` domain

### Database
- DigitalOcean managed Postgres according to `.do/app.yaml`

### Redis
- expected externally / managed, env-injected

### Auth
- Supabase hosted externally

### Error tracking
- Sentry on browser and backend

## 5.3 Contradictions and uncertainty

### Contradiction 1: app deployment spec duplication
- `.do/app.yaml`
- `apps/app/app-spec.yaml`

These are both plausible deployment specs for the app.

### Contradiction 2: production compose model vs DO App Platform
`docker-compose.prod.yml` suggests a containerized server + dashboard topology, but the repo also contains direct DO App Platform specs.

### Contradiction 3: deleted dashboard still referenced in deployment docs
Multiple docs/scripts still say the frontend is `packages/dashboard`, but that package is absent from `packages/`.

### Contradiction 4: server Dockerfile appears stale
`Dockerfile.server` still copies `packages/dashboard/package*.json`, even though `packages/dashboard` is missing.

That means one of the following must be true:
- the Dockerfile is broken and current deploys are not using it as-is
- the deployed infra is using an older branch/image
- there is hidden/manual patching outside repo truth

This is a serious operational problem.

### Contradiction 5: two server Dockerfiles imply split container authority
The repo contains both:

- `Dockerfile.server`
- `packages/server/Dockerfile`

Only the latter matches the current package layout cleanly.

This creates additional uncertainty around:

- what App Platform actually builds
- whether current deploys are reproducible from repo truth
- which Dockerfile operators should trust

### Contradiction 6: deployment guide still describes deleted frontend package
`DEPLOY.md` still tells operators to verify the "Dashboard" static site at `packages/dashboard`.

This means the human-facing deployment instructions disagree with the current app workspace and current app deployment spec.

---

# 6. Security and Configuration Audit

## Severity rubric
- **Critical** — can break prod or expose trust/security immediately
- **High** — serious security/ops risk
- **Medium** — likely to cause drift, failure, or poor hardening
- **Low** — cleanup or hygiene concern

## 6.1 Critical findings

### C1. Root production server Docker build path is stale and likely broken
**Evidence:** root `Dockerfile.server` still references `packages/dashboard`, while `packages/server/Dockerfile` does not

**Why this matters:**
If production rebuilds from the root Dockerfile path declared in certain deployment materials, image creation may fail or rely on stale assumptions.

**Impact:** deploy blocker / non-reproducible deploys

**Action:** declare one canonical server Dockerfile and archive the other immediately

### C2. Deployment truth is split across incompatible specs
**Evidence:** `.do/app.yaml`, `apps/app/app-spec.yaml`, `docker-compose.prod.yml`, droplet docs/scripts

**Why this matters:**
No single operator can know the authoritative deploy path with confidence.

**Impact:** wrong deploy target, wrong env assumptions, rollback confusion

**Action:** designate one production authority and archive the rest

### C3. Dashboard deployment artifacts are stale in both code and documentation
**Evidence:**
- `Dockerfile.dashboard` targets deleted `packages/dashboard`
- `DEPLOY.md` instructs operators to deploy/verify `packages/dashboard`

**Why this matters:**
Even if the actual production app now comes from `apps/app`, operators following repo docs can still choose a dead frontend path.

**Impact:** broken rebuilds, misdirected deploy work, false rollback assumptions

**Action:** remove or archive stale dashboard deployment materials immediately

---

## 6.2 High findings

### H1. Hardcoded production URLs appear across app, desktop, relay, and docs
**Evidence:** grep results for `octopus-app-qsi3i.ondigitalocean.app` and older `coral-app-x988a.ondigitalocean.app`

**Why this matters:**
Hardcoded URLs couple builds and docs to one environment and preserve stale infrastructure references indefinitely.

**Impact:** staging impossible or fragile, accidental drift, legacy clients point to old cloud

**Status after cleanup:** corrected in live app, relay, desktop, and deployment config surfaces; remaining references are primarily historical audit/report evidence.

### H2. Desktop main process hardcodes Supabase and server configuration
**Evidence:** `apps/desktop/electron/main.ts`

Findings include:
- hardcoded production fallback server URL at audit time
- hardcoded Supabase URL
- hardcoded Supabase anon key
- hardcoded app version

**Why this matters:**
This reduces environment portability and complicates release management.

**Note:** Supabase anon keys are public by design, but embedding environment assumptions in desktop main process is still brittle.

**Status after cleanup:** the desktop server fallback now points at `https://api.okboxbox.com`; Supabase values remain embedded and should still be treated as a portability concern rather than a secret-leak issue.

### H3. Auth-related code contains default JWT secret fallbacks
**Evidence:**
- `packages/server/src/services/auth/launch-token.ts`
- `packages/server/src/services/auth/auth-service.ts`
- `packages/server/src/config/index.ts`

**Why this matters:**
Any production misconfiguration can silently fall back to predictable/dev-like secrets.

**Impact:** severe auth trust degradation if envs are missing

### H4. Relay auth path uses permissive dev shortcut logic
**Evidence:** `packages/server/src/websocket/AuthGate.ts`

The relay accepts any relayId in development and exact `RELAY_SECRET` match in production.

**Why this matters:**
This is reasonable for dev, but should be tightly controlled and clearly documented because relay trust is a privileged ingress path.

### H5. Stale CI workflow assumptions reduce deploy/test confidence
**Evidence:** duplicated workflow setup in `.github/workflows/ci.yml` and `.github/workflows/e2e-tests.yml`

**Why this matters:**
CI drift leads to false confidence: one workflow can pass while another tests a different assumption set.

### H6. Audit/document sprawl has become its own false-authority problem
**Evidence:** the repo contains dozens of top-level and `AUDIT_REPORTS/` markdown files, including overlapping audits, system maps, deployment guides, readiness docs, and prior executive reports.

**Why this matters:**
Documentation volume is now large enough that operators and developers can cite contradictory documents with equal plausibility.

**Impact:** onboarding confusion, bad decisions based on stale docs, duplicated planning effort

### H7. Shared package naming still reinforces the old product identity
**Evidence:** `packages/common/package.json` is still named `@controlbox/common` and described in ControlBox terms.

**Why this matters:**
This deepens the repo-wide identity split between `ControlBox`, `BlackBox`, and `Ok, Box Box`, especially in package/dependency graphs and future publish/build decisions.

---

## 6.3 Medium findings

### M1. Local `.env` includes Sentry DSN
**Evidence:** root `.env`

**Why this matters:**
Not typically a secret, but still indicates config is casually mixed into repo-local working state.

### M2. `.env.example` contains outdated or blended product assumptions
**Evidence:** references to `BLACKBOX_SERVER_URL`, Squarespace, iRacing email/password, and older config vocabulary

**Why this matters:**
This file is the onboarding truth for new developers; if it is wrong, every new environment begins wrong.

### M3. Tooling/docs still mix ControlBox and OkBoxBox config names
**Evidence:**
- `CONTROLBOX_CLOUD_URL`
- `BLACKBOX_SERVER_URL`
- `OKBOXBOX_API_URL`
- `OKBOXBOX_SERVER_URL`

**Why this matters:**
This causes hidden env drift and incompatible assumptions between tools.

### M4. `services/api/.env` exists alongside ambiguous stale backend output
**Why this matters:**
Even if not tracked, it suggests an additional backend/config surface that can confuse operators.

### M5. Tooling surface area is larger than the root workspace narrative suggests
**Evidence:** package manifests exist for:
- `tools/relay`
- `tools/relay-agent`
- `tools/test-harness`

**Why this matters:**
These are real maintained surfaces with runtime significance, but they are not explained clearly in root architecture docs.

---

## 6.4 Tracking audit result

A targeted `git ls-files` check confirmed these were tracked:

- `.do/app.yaml`
- `.env.example`
- `.github/workflows/ci.yml`
- `.github/workflows/e2e-tests.yml`
- `apps/app/app-spec.yaml`

The same targeted check did **not** report as tracked:

- `.env`
- `tools/relay-agent/.env`
- `relay/agent/.env`
- `services/api/.env`

This is good, but those local files still matter operationally and should be normalized or removed from ambiguous locations.

---

# 7. Dead Code / Duplicate Systems Audit

## 7.1 Deleted package still referenced everywhere

### Deleted or absent package
- `packages/dashboard`

### Still referenced in
- `README.md`
- `scripts/package-release.sh`
- `DEPLOY.md`
- `DROPLET-SETUP-COMMANDS.md`
- `deploy-remote.sh`
- `DEVELOPMENT_ENVIRONMENTS.md`
- `PHASE2-PROOF-CHECKLIST.md`
- `package-lock.json` as extraneous
- `Dockerfile.server`
- `Dockerfile.dashboard`

**Assessment:**
This is the single clearest dead-code/documentation drift signal in the repo.

## 7.1.1 Documentation and audit sprawl as a duplicate-system problem

### Large parallel documentation surfaces discovered
- root audits and assessments
- `AUDIT_REPORTS/*`
- deployment docs
- system maps
- readiness docs
- product vision docs

**Assessment:**
The repo has accumulated enough reports that documentation itself now behaves like a duplicate system: many files explain the platform, but they do not all describe the same platform state.

## 7.2 Duplicate relay stack

### Relay family discovered
- `apps/desktop`
- `apps/relay` (deprecated but still full source)
- `tools/relay`
- `tools/relay-agent`
- `tools/relay-python`
- `relay/`

**Assessment:**
This is a structurally dangerous duplication cluster.

## 7.3 Orphaned build outputs posing as products

### Suspected orphan artifact directories
- `apps/blackbox`
- `apps/racebox`
- `apps/launcher`
- `packages/shared`
- `services/api`

These should either become real packages/apps or be archived/removed.

## 7.4 Legacy product scripts still runnable

Root scripts still enable legacy surfaces:
- `legacy:website`
- `legacy:dashboard`
- `ops:console`

**Assessment:**
This keeps legacy systems operationally alive even if they are conceptually retired.

---

# 8. Runtime Dependency Map

This is the practical runtime map inferred from current repo truth.

## 8.1 Browser app runtime

### `apps/app`
Depends on:
- React / Vite runtime
- Supabase auth
- backend API (`VITE_API_URL`)
- websocket backend (`VITE_WS_URL`)
- Sentry browser instrumentation

Consumes backend for:
- auth-protected driver data
- crew chat / voice APIs
- live telemetry and websocket state
- history / IDP / session analysis

## 8.2 Marketing site runtime

### `apps/website`
Depends on:
- React / Vite
- likely mostly static content
- may link into app but does not appear to be core authenticated runtime

## 8.3 Desktop runtime

### `apps/desktop`
Depends on:
- Electron main/renderer split
- `irsdk-node`
- local persisted settings via `electron-store`
- `socket.io-client`
- backend server URL
- Supabase auth flow
- local voice stack and PTT logic

Interaction flow:
1. user authenticates
2. desktop obtains/stores session
3. desktop connects to server socket
4. iRacing SDK streams local telemetry state
5. voice/PTT can send role-aware queries
6. server responds with AI/voice outputs

## 8.4 Backend runtime

### `packages/server`
Depends on:
- Node.js / Express
- Postgres
- Redis
- Socket.IO
- Sentry
- Supabase server credentials
- Stripe
- OpenAI
- ElevenLabs
- iRacing OAuth credentials
- local shared packages `@controlbox/common` and `@controlbox/protocol`

Responsibilities include:
- API routing
- auth/token validation
- rate limiting
- websocket session handling
- telemetry handling
- voice/AI orchestration
- billing routes
- background sync scheduler
- legacy static `/blackbox` hosting

## 8.5 Relay-side duplicate runtime paths

### `tools/relay`
TypeScript test/simulation relay used to simulate iRacing data and exercise protocol paths.

### `apps/relay`
Electron shell that launches a Python bridge with tray/status UI and custom protocol linking.

### `tools/relay-agent`
Standalone Python relay path with its own installer/config surface.

### `tools/relay-python`
Older ControlBox-branded Python relay path.

### `tools/test-harness`
Support validation harness for smoke, replay, rate, and load-style checks against the server.

**Observation:**
These systems create multiple possible client-to-server ingress or validation paths around telemetry and runtime behavior. Some are useful, but they are not currently organized under a clear canonical testing/runtime model.

---

# 9. Architecture Quality Assessment

## What is strong

### Backend capability
The backend is substantial and production-credible. It has:
- proper startup entrypoint
- migrations
- auth middleware
- rate limiting
- Sentry
- metrics support
- websocket layer
- telemetry and voice capabilities

### Main app momentum
`apps/app` is a real product surface with meaningful structure and current development focus.

### Desktop ambition
`apps/desktop` is not a stub; it is already a meaningful end-user product candidate.

## What is weak

### Product identity consistency
The repo still speaks in at least three identities:
- ControlBox
- BlackBox
- Ok, Box Box

### Operational clarity
There is no single canonical answer to:
- which deploy path is authoritative
- which relay is canonical
- which frontend history is live vs legacy
- which docs should be trusted first

### Surface sprawl
The repo contains too many half-retired or semi-alive paths.

### Documentation sprawl
The repo contains enough audits, plans, maps, and historical docs that reading documentation alone does not reliably reveal present-day truth.

---

# 10. Immediate Cleanup Plan

This section is written as the action document.

## 10.1 P0 — do now

### 1. Fix or remove stale production Dockerfiles
**Action:**
- declare either root `Dockerfile.server` or `packages/server/Dockerfile` canonical
- repair or remove the non-canonical one immediately
- remove or archive `Dockerfile.dashboard` if it still references deleted `packages/dashboard`

**Why first:** deploy truth must become reproducible

### 2. Choose one deployment authority
**Action:**
Declare one of the following as canonical:
- `.do/app.yaml`
- `apps/app/app-spec.yaml`
- compose/droplet model

Everything else should be marked:
- archived
- legacy
- local-only

### 3. Publish one “current production topology” doc
**Target content:**
- production URLs
- deployed components
- infra dependencies
- env sources
- who deploys what

### 4. Stop legacy scripts from looking current
**Action:**
Move root legacy scripts under clearly labeled legacy grouping or remove from root `package.json`.

## 10.2 P1 — this week

### 5. Collapse relay strategy to one canonical user relay
**Recommended canonical path:** `apps/desktop`

**Action:**
- mark `tools/relay-python` as archived
- mark `tools/relay-agent` as support-only or archive candidate
- move `apps/relay` to archive once migration is confirmed complete

### 6. Eliminate `packages/dashboard` ghost references
Search-and-destroy every stale reference.

### 6.1 Collapse false-authority docs
Identify one canonical doc for each of these categories:
- system architecture
- deployment
- local development
- relay/runtime
- launch readiness

Archive or clearly label the rest as historical.

### 6.2 Promote the desktop README to canonical relay truth
`apps/desktop/README.md` is the clearest current relay statement found during this pass. Either promote it as canonical or create a stronger root-level runtime truth doc that supersedes it.

### 7. Consolidate CI workflows
Merge `ci.yml` and `e2e-tests.yml` into one authoritative workflow or clearly separate them by purpose.

### 8. Remove prod-sensitive fallback secrets from auth paths
Change auth/bootstrap code so production fails closed when required env vars are absent.

## 10.3 P2 — this sprint

### 9. Normalize package naming
Decide whether product identity is:
- all `@okboxbox/*`
- or intentionally mixed

Current state is too confusing.

### 10. Split oversized server route modules
There is already evidence that `driverbox/routes/drivers.ts` is too large and should be decomposed.

### 11. Clean orphan surfaces
Evaluate and then remove/archive:
- `apps/blackbox`
- `apps/racebox`
- `apps/launcher`
- `packages/shared`
- `services/api`

### 12. Standardize environment variable vocabulary
Choose one naming convention and apply it across app/server/desktop/relay/tooling.

## 10.4 P3 — strategic

### 13. Produce system architecture diagrams
- runtime diagram
- deploy topology diagram
- auth flow diagram
- telemetry path diagram

### 14. Create archive policy
Legacy systems should be one of:
- actively supported
- frozen
- archived
- deleted

No more ambiguous middle state.

---

# 11. Recommended Canonical Future Shape

## Suggested canonical surface set

### Keep
- `apps/app`
- `apps/website`
- `apps/desktop`
- `packages/server`
- `packages/common`
- `packages/protocol`
- `packages/contracts`

### Freeze or archive
- `apps/relay`
- `tools/relay-python`
- `legacy/ProjectBlackBox/*`

### Evaluate for deletion
- `apps/blackbox`
- `apps/racebox`
- `apps/launcher`
- `packages/shared`
- `services/api`

### Fix immediately
- root docs/scripts referencing `packages/dashboard`
- stale Dockerfiles/deploy scripts
- duplicated CI workflow intent
- auth secret fallback behavior

---

# 12. Reading Guide for Decision-Making

If you want to act on this report efficiently, read in this order:

## If you care most about production safety
Read:
- Section 5 — Deployment Truth Map
- Section 6 — Security and Configuration Audit
- Section 10 — Immediate Cleanup Plan

## If you care most about codebase sanity
Read:
- Section 4 — Active vs Legacy Inventory
- Section 7 — Dead Code / Duplicate Systems Audit
- Section 11 — Recommended Canonical Future Shape

## If you care most about product/engineering direction
Read:
- Section 3 — System Overview
- Section 8 — Runtime Dependency Map
- Section 9 — Architecture Quality Assessment
- Section 10 — Immediate Cleanup Plan

---

# 13. Final Assessment

This is a **strong core system trapped inside an ambiguous repository**.

The codebase shows clear evidence of:
- real engineering effort
- real product sophistication
- real shipping surfaces

But it also shows clear evidence of:
- pivot residue
- stale authorities
- duplicated relay/runtime paths
- deployment confusion
- product naming drift

## Final verdict

### Technical core
**Good and viable**

### Repository governance
**Weak**

### Deployment clarity
**Insufficient**

### Security/config discipline
**Mixed; needs tightening**

### Maintainability trend
**At risk unless cleanup starts now**

The right next move is not another feature sprint in isolation.

The right next move is a **controlled architecture cleanup**:
- choose canonical surfaces
- choose canonical deployment truth
- remove ghost references
- collapse relay duplication
- harden config/auth assumptions

Once those are done, the system becomes much easier to trust, ship, and evolve.

---

# Appendix A — Key Evidence Index

## Active web app
- `apps/app/package.json`
- `apps/app/src/main.tsx`
- `apps/app/app-spec.yaml`

## Active website
- `apps/website/package.json`
- `apps/website/src/main.tsx`

## Active desktop
- `apps/desktop/package.json`
- `apps/desktop/README.md`
- `apps/desktop/electron/main.ts`

## Active backend
- `packages/common/package.json`
- `packages/server/package.json`
- `packages/server/src/index.ts`
- `packages/server/src/app.ts`
- `packages/server/src/config/index.ts`

## Deprecated relay
- `apps/relay/DEPRECATED.md`
- `apps/relay/src/main-simple.ts`
- `apps/relay/src/settings.ts`

## Duplicate relay/tooling
- `tools/relay/package.json`
- `tools/relay-agent/README.md`
- `tools/relay-agent/package.json`
- `tools/relay-python/README.md`
- `tools/test-harness/package.json`
- `relay/agent/.env` (local runtime evidence)

## Stale deployment and doc references
- `README.md`
- `scripts/package-release.sh`
- `DEPLOY.md`
- `DROPLET-SETUP-COMMANDS.md`
- `deploy-remote.sh`
- `DEVELOPMENT_ENVIRONMENTS.md`
- `package-lock.json`
- `Dockerfile.server`
- `packages/server/Dockerfile`
- `Dockerfile.dashboard`

## CI and config
- `.github/workflows/ci.yml`
- `.github/workflows/e2e-tests.yml`
- `.env`
- `.env.example`
- `.do/app.yaml`

---

# Appendix C — Correction Program

This appendix converts the audit into a practical correction plan.

## C1. Correction goals

The cleanup program should achieve five outcomes:

- establish one authoritative deployment model
- establish one authoritative relay/runtime model
- remove stale frontend and dashboard ghost references
- harden auth/config so production fails closed instead of drifting open
- reduce false authority from duplicated docs, scripts, and legacy surfaces

## C2. Guiding rules for the correction work

- do not remove runtime surfaces before their replacement authority is documented
- do not archive deployment artifacts until production build truth is verified
- do not rename packages or env vocabulary until deploy/runtime paths are stable
- every archival action should leave behind a short replacement pointer
- every root script should be either current, legacy-labeled, or removed

## C3. Recommended workstreams

### Workstream 1 — Deployment truth consolidation
**Priority:** P0

**Scope:**
- `.do/app.yaml`
- `apps/app/app-spec.yaml`
- `Dockerfile.server`
- `packages/server/Dockerfile`
- `Dockerfile.dashboard`
- `DEPLOY.md`
- `docker-compose.prod.yml`
- droplet deploy scripts/docs

**Primary objective:** produce one reproducible answer to "what builds and deploys production?"

**Tasks:**
- choose the canonical production authority
- choose the canonical server Dockerfile
- verify whether `Dockerfile.server` is still used anywhere
- remove or archive `Dockerfile.dashboard` if it is dead
- rewrite `DEPLOY.md` to match current production truth
- mark compose/droplet materials as either active alternative or historical

**Deliverables:**
- one canonical deployment spec
- one canonical server Dockerfile
- one corrected deployment guide
- explicit historical label on non-canonical deployment artifacts

**Suggested owner:** engineering lead / platform owner

### Workstream 2 — Relay consolidation
**Priority:** P0

**Scope:**
- `apps/desktop`
- `apps/relay`
- `tools/relay`
- `tools/relay-agent`
- `tools/relay-python`
- `relay/`

**Primary objective:** produce one authoritative answer to "what relay/client should a user or operator run?"

**Tasks:**
- formally declare the canonical end-user relay
- classify each non-canonical relay as one of:
  - support tool
  - test tool
  - legacy archive
  - delete candidate
- move deprecated relay paths behind explicit archive labeling
- create one root-level relay/runtime truth doc
- update root scripts and docs to align with the canonical relay decision

**Deliverables:**
- one canonical relay/runtime path
- one relay classification matrix
- archived or relabeled non-canonical relay surfaces

**Suggested owner:** product + desktop/telemetry owner

### Workstream 3 — Ghost reference and stale artifact removal
**Priority:** P0

**Scope:**
- `packages/dashboard` references
- `Dockerfile.dashboard`
- stale root docs
- stale root scripts
- orphan folders such as `apps/blackbox`, `apps/racebox`, `apps/launcher`, `packages/shared`, `services/api`

**Primary objective:** eliminate dead references that can still mislead operators and developers.

**Tasks:**
- remove all references to deleted `packages/dashboard`
- verify whether each orphan surface is:
  - active but undocumented
  - generated artifact
  - abandoned source
- archive or delete confirmed dead artifacts
- update package and release scripts to stop implying old package structure

**Deliverables:**
- zero remaining `packages/dashboard` references in active docs/scripts/build files
- a keep/archive/delete decision for each orphan surface

**Suggested owner:** repo maintainer

### Workstream 4 — Security and configuration hardening
**Priority:** P1

**Scope:**
- auth secret fallbacks
- relay auth boundary
- desktop hardcoded endpoints
- env vocabulary drift
- `.env.example`

**Primary objective:** make misconfiguration obvious and safe instead of silent and ambiguous.

**Tasks:**
- remove production fallback secrets from auth paths
- make required production env vars fail closed
- document relay trust/auth expectations clearly
- reduce hardcoded production endpoint assumptions where possible
- rewrite `.env.example` to match current platform truth
- normalize env names across app/server/desktop/tooling

**Deliverables:**
- fail-closed auth/config behavior in production
- corrected env example
- env naming standard

**Suggested owner:** backend owner

### Workstream 5 — Documentation authority cleanup
**Priority:** P1

**Scope:**
- root docs
- `AUDIT_REPORTS/*`
- setup guides
- readiness docs
- system maps

**Primary objective:** ensure there is one trusted document per operational topic.

**Tasks:**
- choose canonical docs for:
  - architecture
  - deployment
  - local development
  - relay/runtime
  - launch readiness
- add clear historical headers to superseded docs
- create an index that points to the current authoritative documents

**Deliverables:**
- documentation authority index
- historical labeling on superseded docs

**Suggested owner:** engineering lead / operations

### Workstream 6 — Naming and packaging normalization
**Priority:** P2

**Scope:**
- package names
- repo language
- product identity references
- ControlBox vs BlackBox vs Ok, Box Box terminology

**Primary objective:** align the repo around one product vocabulary after the runtime/deploy truth is stable.

**Tasks:**
- decide the canonical product/package identity
- rename packages only after deployment and runtime paths are stabilized
- update docs, manifests, and scripts to match the chosen identity

**Deliverables:**
- naming decision memo
- package naming migration plan

**Suggested owner:** product + engineering lead

## C4. Execution sequence

### Phase 0 — Verify reality before deleting anything
**Duration:** immediate

**Actions:**
- confirm current production deploy path
- confirm which Dockerfile is actually used for server builds
- confirm whether any operator still uses compose/droplet deployment
- confirm the canonical live relay used by current testing or users

**Exit criteria:**
- deployment truth confirmed
- relay truth confirmed

### Phase 1 — Remove the highest-risk false authorities
**Duration:** same day to 1 day

**Actions:**
- fix deployment docs
- archive or relabel stale Dockerfiles
- mark non-canonical relay surfaces clearly
- remove the most dangerous `packages/dashboard` references from deployment materials

**Why first:** these are the items most likely to cause a wrong deploy or wrong runtime choice.

### Phase 2 — Clean the repo control surface
**Duration:** 1 to 3 days

**Actions:**
- clean root scripts
- clean docs and guides
- classify orphan directories
- collapse CI intent into a clearer model

**Exit criteria:**
- root package scripts no longer advertise dead/legacy paths as current
- docs no longer contradict current runtime/deploy truth

### Phase 3 — Harden config and security behavior
**Duration:** 1 to 2 days

**Actions:**
- remove fallback secrets
- enforce required env variables in production
- normalize `.env.example`
- document relay auth boundaries

**Exit criteria:**
- production configuration fails closed
- onboarding env docs reflect current reality

### Phase 4 — Archive and reduce surface area
**Duration:** 2 to 5 days

**Actions:**
- archive confirmed legacy relay surfaces
- archive or delete orphan artifacts
- move historical docs behind explicit archival labeling

**Exit criteria:**
- repo no longer presents half-retired systems as current options

### Phase 5 — Normalize naming and governance
**Duration:** follow-up sprint

**Actions:**
- unify naming vocabulary
- create a durable archive policy
- create a lightweight repo governance standard for new docs/scripts/deploy artifacts

**Exit criteria:**
- one naming system
- one documentation authority model
- one archive policy

## C5. Dependency order

The work should proceed in this order:

1. verify live production truth
2. choose canonical deployment authority
3. choose canonical relay authority
4. remove stale dashboard/deploy references
5. clean docs and root scripts
6. harden auth/config
7. archive duplicate and orphan surfaces
8. normalize naming

If this order is reversed, the repo can become cleaner-looking without becoming safer.

## C6. Recommended owner map

- **Platform / deploy owner**
  - deployment truth
  - Dockerfile selection
  - deploy doc correction

- **Backend owner**
  - auth/config hardening
  - env normalization
  - relay trust boundary documentation

- **Desktop / telemetry owner**
  - relay canonicalization
  - archive decisions for relay variants

- **Repo maintainer**
  - stale reference cleanup
  - orphan surface classification
  - root script cleanup

- **Product / engineering lead**
  - naming decision
  - documentation authority decisions
  - archive policy approval

## C7. First 10 concrete correction tickets

1. Decide whether `.do/app.yaml` or another artifact is the canonical production deployment source.
2. Decide whether `packages/server/Dockerfile` replaces `Dockerfile.server`.
3. Remove or archive `Dockerfile.dashboard`.
4. Rewrite `DEPLOY.md` so it no longer references `packages/dashboard`.
5. Search and remove remaining active `packages/dashboard` references from scripts/docs/build files.
6. Publish one canonical relay decision naming `apps/desktop` or another path as authoritative.
7. Add explicit historical/deprecated labeling to `apps/relay`, `tools/relay-agent`, `tools/relay-python`, and any non-canonical relay docs.
8. Clean root `package.json` scripts so legacy surfaces are clearly separated or removed.
9. Remove production fallback auth secrets and require critical env vars in production.
10. Rewrite `.env.example` to reflect current system vocabulary and current dependencies.

## C8. Success criteria

The correction program is complete when:

- a new engineer can identify the live app, server, relay, and deploy path in under 10 minutes
- no active deployment doc points to deleted packages
- no active Dockerfile references deleted packages
- legacy surfaces are clearly marked and no longer appear current
- production auth/config paths fail closed when required secrets are missing
- the root repo presents one current story instead of several competing ones

# Appendix B — Suggested Follow-on Reports

After this report, the most valuable next documents would be:

1. **Canonical Production Topology**
2. **Relay Consolidation Decision Memo**
3. **Deployment Runbook**
4. **Secrets and Environment Hardening Checklist**
5. **Archive/Delete Candidate List**
