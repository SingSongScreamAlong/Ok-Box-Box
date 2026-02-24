# OKBoxBox — Full Platform Audit (Part 2)
## Server Platform Audit

---

## 1. ENTRY POINT & STARTUP (`packages/server/src/index.ts`)

Startup sequence:
1. Database connection + migration runner
2. Admin user seeding
3. iRacing background sync scheduler start
4. HTTP server creation
5. WebSocket server initialization
6. Graceful shutdown handlers (SIGTERM/SIGINT)

**Grade: A** — Clean, well-structured. Graceful shutdown properly stops sync scheduler and closes HTTP server.

---

## 2. EXPRESS APPLICATION (`app.ts`)

Middleware stack (in order):
1. **Correlation ID** — request tracing
2. **CORS** — permissive (`origin: true`) with credentials
3. **Helmet** — security headers
4. **Optional Auth** — JWT verification on all `/api` routes
5. **Tiered Rate Limiter** — 5 tiers (anon 50/15m → admin 2000/15m)
6. **Morgan** — request logging
7. **Body parsing** — JSON 10MB limit
8. **Prometheus metrics** — gated by `METRICS_ENABLED`
9. **iRacing OAuth callback** — public route
10. **API router** — all `/api` routes
11. **Legacy BlackBox static** — serves `/blackbox` SPA
12. **Error handler** — global

**Grade: A-** — Solid ordering. CORS `origin: true` should be tightened for production.

---

## 3. CONFIGURATION (`config/index.ts`)

- 20 config values from environment with sensible defaults
- Production validation: JWT secret length ≥32, DB URL localhost check, Redis warning
- `as const` assertion for type safety

**Missing:** No validation for OpenAI/ElevenLabs keys (silent failure if missing).

---

## 4. WEBSOCKET SERVER (`websocket/index.ts`)

Handlers per connection:
- **RoomManager** — join/leave rooms
- **SessionHandler** — session lifecycle
- **TelemetryHandler** — real-time telemetry + AI processing
- **BroadcastHandler** — broadcast/overlay events
- **Voice query handler** — inline PTT → Whisper → AI → TTS

Additional: dashboard late-join handler, `onAny` debug logging, rate limiter cleanup.

---

## 5. WEBSOCKET SUB-SYSTEMS

### SessionHandler (`SessionHandler.ts`, 8.2KB)
- Active sessions map
- Session start/end lifecycle
- Post-session learning pipeline (dynamic import)
- Cleanup: destroys inference engine, analyzer, spotter state, telemetry cache
- Stale session cleanup interval (5min timeout, 30s check)

**Issue:** Line 148 — `import('../services/ai/post-session-learner.js')` — module path may not resolve correctly. Needs verification.

### TelemetryHandler (`TelemetryHandler.ts`, 37.5KB) — LARGEST SERVER FILE
- Raw telemetry processing from relay
- InferenceEngine: raw → computed strategy data
- LiveSessionAnalyzer: lap-by-lap intelligence accumulation
- ProactiveSpotter: edge-triggered callouts
- SituationalAwarenessService: GPT-powered engineer updates
- Rate-limited SA updates (every 15s)
- Intelligence summary emission (~10% of ticks)

**Emits:** `telemetry`, `strategy_raw`, `strategy_computed`, `race:intelligence`, `spotter:callout`, `engineer:update`

**Grade: A-** — Well-organized but at 37KB should be considered for extraction into sub-handlers.

### BroadcastHandler (`BroadcastHandler.ts`, 9.9KB)
- Timing updates, incident broadcasts, penalty broadcasts, session state

### AuthGate (`AuthGate.ts`, 2.9KB)
- WebSocket authentication middleware, token verification on connection

### InferenceEngine (`inference-engine.ts`, 16.6KB)
- Fuel calculations (level, pct, per-lap, laps remaining)
- Tire wear estimation
- Tire temperature monitoring
- Damage assessment (aero, engine)
- Pit stop detection
- Gap calculations
- Engine health monitoring

### Telemetry Cache (`telemetry-cache.ts`, 3.8KB)
- In-memory cache for voice query context
- 30-second staleness check

### Rate Limiter (`rate-limit.ts`, 4.6KB)
- Per-socket rate limiting with cleanup

---

## 6. API ROUTES (47 files, ~180+ endpoints)

### Auth & Admin
| File | Path | Endpoints |
|------|------|-----------|
| `auth.ts` | `/api/auth` | Login, signup, refresh, logout, verify |
| `admin.ts` | `/api/admin` | Admin operations |
| `admin-entitlements.ts` | `/api/admin` | Manual entitlement grants |
| `audit.ts` | `/api/audit` | Audit log viewer |

### Core Racing
| File | Path | Endpoints |
|------|------|-----------|
| `sessions.ts` | `/api/sessions` | Session CRUD |
| `incidents.ts` | `/api/incidents` | Incident CRUD |
| `penalties.ts` | `/api/penalties` | Penalty management |
| `rulebooks.ts` | `/api/rulebooks` | Rulebook CRUD |
| `reports.ts` | `/api/sessions` | Session reports |
| `evidence.ts` | `/api/evidence` | Evidence management |
| `protests.ts` | `/api/protests` | Protest management |
| `panels.ts` | `/api/panels` | Steward voting panels |

### Driver (IDP v1)
| File | Path | Endpoints |
|------|------|-----------|
| `drivers.ts` (driverbox) | `/api/v1/drivers` | Profile, memory, traits, sessions, metrics, crew-chat |
| `goals.ts` | `/api/v1/goals` | Driver development goals |
| `driver-development.ts` | (via drivers) | Development engine |
| `schedule.ts` | `/api/v1/schedule` | Race schedule |

### Team
| File | Path | Endpoints |
|------|------|-----------|
| `teams.ts` | `/api/teams` | Team CRUD |
| `teams.ts` (driverbox) | `/api/v1/teams` | Team view over IDP |
| `team-operations.ts` | `/api/v1/teams` | Events, race plans, stints |
| `team-setups.ts` | `/api/teams` | Setup file sharing |
| `team-strategy.ts` | `/api/teams` | Strategy planning |
| `team-practice.ts` | `/api/teams` | Practice tracking |

### League
| File | Path | Endpoints |
|------|------|-----------|
| `leagues.ts` | `/api/leagues` | League management |
| `events.ts` | `/api/events` | Event management |
| `event-reports.ts` | `/api/events` | Event reports |
| `scoring.ts` | `/api/scoring` | Championship scoring |

### AI & Voice
| File | Path | Endpoints |
|------|------|-----------|
| `ai.ts` | `/api/ai` | AI analysis |
| `rulebook-ai.ts` | `/api/rulebooks` | Rulebook AI interpretation |
| `commentary.ts` | `/api/commentary` | AI commentary |
| `voice.ts` | `/api/voice` | Voice API |
| `recommendations.ts` | `/api/recommendations` | AI recommendations |

### Billing
| File | Path | Endpoints |
|------|------|-----------|
| `billing-stripe.ts` | `/api/billing/stripe` | Stripe integration |
| `billing-squarespace.ts` | `/api/billing/squarespace` | Squarespace webhooks |
| `webhooks-stripe.ts` | `/api/webhooks/stripe` | Stripe webhooks |

### Integrations & Public
| File | Path | Endpoints |
|------|------|-----------|
| `discord.ts` | `/api/discord` | Discord integration |
| `oauth/iracing.ts` | `/api/oauth/iracing` | iRacing OAuth |
| `widgets.ts` | `/api/widgets` | Public widgets |
| `overlay.ts` | `/api/overlay` | Broadcast overlays |
| `paints.ts` | `/api/paints` | Livery management |
| `launch.ts` | `/api/launch` | Launch tokens |
| `relay-version.ts` | `/api/relay` | Relay version check |
| `health.ts` | `/api/health` | Health check |

### Track Intelligence
| File | Path | Endpoints |
|------|------|-----------|
| `routes.ts` (track-intel) | `/api/v1/tracks` | Track data, corners, segments |

---

## 7. SERVER SERVICES (25+ modules)

### AI Services (`services/ai/`)
| Service | Size | Purpose |
|---------|------|---------|
| `live-session-analyzer.ts` | 33KB | Core intelligence accumulator — pace, fuel, tires, gaps, mental state |
| `situational-awareness.ts` | 16KB | GPT-powered race engineer updates |
| `proactive-spotter.ts` | 12KB | Edge-triggered spotter callouts |
| `post-session-learner.ts` | 12KB | Post-session memory updates |
| `llm-service.ts` | 9KB | OpenAI GPT integration |

### Voice Services (`services/voice/`)
| Service | Size | Purpose |
|---------|------|---------|
| `whisper-service.ts` | 12KB | OpenAI Whisper STT + AI response |
| `driver-context.service.ts` | 12KB | Driver IDP context for AI |
| `voice-service.ts` | 8KB | ElevenLabs TTS |

### Strategy Services (`services/strategy/`)
| Service | Size | Purpose |
|---------|------|---------|
| `segment-speed-detector.ts` | 22KB | Track segment speed analysis |
| `strategy-predictor.ts` | 12KB | Race strategy prediction |
| `opponent-modeler.ts` | 11KB | Opponent behavior modeling |
| `lap-repository.ts` | 8KB | Lap data storage |
| `intelligence.ts` | 5KB | Strategy intelligence |
| `lap-tracker.ts` | 5KB | Lap tracking |
| `stint-tracker.ts` | 4KB | Stint management |

### Other Services
| Service | Purpose |
|---------|---------|
| `billing/entitlement-service.ts` (17KB) | Entitlement → capability mapping |
| `billing/stripe-service.ts` (13KB) | Stripe subscription management |
| `incidents/classification-engine.ts` | Incident classification pipeline |
| `incidents/contact-analyzer.ts` | Contact analysis |
| `incidents/severity-scorer.ts` | Severity scoring |
| `incidents/responsibility-predictor.ts` | Fault attribution |
| `driver-development/` | Performance analysis, target generation, achievement detection |
| `discord/` | Discord webhook integration |
| `iracing-oauth/` | iRacing OAuth2 + profile sync + background scheduler |
| `rulebook/` | Rulebook parsing + condition evaluation |
| `scoring/` | Championship scoring engine |
| `telemetry/spatial-awareness/` | Spatial awareness for incident detection |
| `explanations/` | Human-readable incident explanations |
| `storage/` | File storage |
| `uploads/` | File upload handling |
| `licensing/` | License key management |
| `scheduler/` | Background job scheduling |
| `broadcast-delay/` | Broadcast delay management |

---

## 8. MIDDLEWARE (`api/middleware/`)

| Middleware | Size | Purpose |
|-----------|------|---------|
| `auth.ts` | 6KB | JWT verification (Supabase JWKS + legacy), `requireAuth`, `optionalAuth` |
| `license.ts` | 9KB | License/entitlement verification |
| `rate-limit-tiers.ts` | 5KB | 5-tier rate limiting |
| `idp-access.ts` | 4KB | IDP access control |
| `team-guards.ts` | 4KB | Team membership + role verification |
| `error-handler.ts` | 2KB | Global error handler |

---

## 9. DATABASE

### Migration History (19 files, ~45+ tables)

| # | Migration | Key Tables |
|---|-----------|-----------|
| 001 | Initial | sessions, session_drivers, incidents, rulebooks, penalties, steward_notes |
| 002 | Discipline | discipline_profiles, profile_snapshots |
| 003 | Auth | admin_users, refresh_tokens, api_keys, license_keys |
| 004 | Events/Discord/OAuth/Laps | events, discord_configs, iracing_oauth_tokens, session_laps |
| 005 | Entitlements/iRacing/Scoring | entitlements, iracing_profiles, scoring_configs, championship_standings |
| 006 | Paints | paints |
| 007 | Rulebook AI | rulebook_ai_interpretations |
| 008 | Protests | protests, protest_evidence, protest_votes |
| 009 | Evidence | evidence_items, evidence_collections, evidence_annotations |
| 010 | Entitlement updates | Schema updates |
| 011 | IDP | driver_profiles, driver_sessions, driver_session_metrics |
| 012 | Teams | teams, team_memberships |
| 013 | Invites | team_invites, team_snapshots |
| 014 | Driver Memory | driver_memory, driver_memory_events, driver_session_behaviors, engineer_opinions, driver_identity |
| 015 | Goals | driver_goals, goal_milestones, goal_notes |
| 016 | Team Events | team_events, team_race_plans, team_stint_plans |
| 017 | Setups | team_setups, setup_versions |
| 018 | Race Results | iracing_race_results |
| 019 | Career Stats | iracing_career_stats |

**Note:** Migration numbering has collisions (three `004_*`, two `005_*`). Works because runner tracks by filename, but confusing.

### Repository Layer (15 repos)

| Repository | Size | Purpose |
|-----------|------|---------|
| `evidence.repo.ts` | 23KB | Evidence CRUD (largest) |
| `driver-memory.repo.ts` | 16KB | Driver memory CRUD |
| `driver-profile.repo.ts` | 10KB | Driver profile management |
| `profile.repo.ts` | 9KB | Discipline profiles |
| `team-membership.repo.ts` | 7KB | Team membership |
| `penalty.repo.ts` | 7KB | Penalty management |
| `incident.repo.ts` | 7KB | Incident CRUD |
| `session.repo.ts` | 7KB | Session management |
| `driver-aggregates.repo.ts` | 5KB | Aggregate stats |
| `session-metrics.repo.ts` | 5KB | Session metrics |
| `rulebook.repo.ts` | 5KB | Rulebook CRUD |
| `team.repo.ts` | 5KB | Team CRUD |
| `driver-reports.repo.ts` | 4KB | Report generation |
| `team-invite.repo.ts` | 3KB | Invite management |
| `driver-traits.repo.ts` | 3KB | Trait tracking |

---

## 10. OBSERVABILITY (`observability/`)

| Component | Size | Purpose |
|-----------|------|---------|
| `relay-tap.ts` | 8KB | Relay data inspection |
| `socket-tap.ts` | 6KB | WebSocket traffic inspection |
| `logger.ts` | 5KB | Structured logging |
| `support-bundle.ts` | 5KB | Diagnostic data collection |
| `metrics.ts` | 5KB | Prometheus metrics |
| `ring-buffer.ts` | 5KB | Circular buffer for telemetry |
| `parity-tracking.ts` | 5KB | Relay ↔ server data parity |
| `error-buffer.ts` | 4KB | Circular error buffer |
| `correlation.ts` | 2KB | Request correlation IDs |

---

## 11. TEST COVERAGE — 237 tests, ALL PASSING

| Test File | Tests | Area |
|-----------|-------|------|
| `evidence.test.ts` | 21 | Evidence management |
| `entitlement-service.test.ts` | 18 | Entitlement logic |
| `live-session-analyzer.test.ts` | 16 | Intelligence pipeline |
| `launch-token.test.ts` | 16 | Launch tokens |
| `deterministic-parser.test.ts` | 15 | Rulebook parsing |
| `strategy-predictor.test.ts` | 14 | Strategy prediction |
| `bootstrap.test.ts` | 13 | Server bootstrap |
| `classification-engine.test.ts` | 13 | Incident classification |
| `manual-entitlements.test.ts` | 12 | Manual grants |
| `billing-squarespace.test.ts` | 11 | Squarespace billing |
| `incidents.test.ts` | 11 | Incident CRUD |
| `steward-advisor.test.ts` | 11 | AI steward |
| `opponent-modeler.test.ts` | 11 | Opponent modeling |
| `condition-evaluator.test.ts` | 11 | Rulebook conditions |
| `rate-limit-tiers.test.ts` | 10 | Rate limiting |
| `auth-service.test.ts` | 9 | Authentication |
| `error-buffer.test.ts` | 8 | Error buffer |
| `lap-tracker.test.ts` | 8 | Lap tracking |
| `metrics.test.ts` | 5 | Prometheus metrics |
| `rate-limit-enforcement.test.ts` | 4 | Rate limit enforcement |
