# OKBoxBox — Full Platform Audit (Part 5)
## Authentication, Billing, Security & Observability

---

## 1. AUTHENTICATION

### Auth Stack

| Method | Purpose | Implementation |
|--------|---------|---------------|
| **Supabase Auth** | Primary user auth | JWKS verification via `jose` library |
| **Legacy JWT** | Admin user auth | bcrypt (12 rounds) + jsonwebtoken |
| **iRacing OAuth2** | Account linking | PKCE flow with encrypted token storage |
| **API Keys** | Programmatic access | Database-stored keys |
| **Launch Tokens** | Relay protocol handler | Short-lived tokens for relay launch |
| **Refresh Tokens** | Session extension | 30-day rotation |

### Auth Middleware (`api/middleware/auth.ts`, 6KB)

- `requireAuth` — Rejects unauthenticated requests
- `optionalAuth` — Attempts auth, continues if fails (for rate limit tier detection)
- Dual verification: tries Supabase JWKS first, falls back to legacy JWT
- Extracts user ID, email, role from token payload

### iRacing OAuth (`services/iracing-oauth/`)

| Component | Purpose |
|-----------|---------|
| `iracing-oauth-service.ts` | OAuth2 PKCE flow, token management |
| `profile-sync-service.ts` | Syncs iRacing profile data (iRating, SR, stats) |
| `sync-scheduler.ts` | Background job for periodic profile sync |
| `token-encryption.ts` | AES encryption for OAuth tokens at rest |
| `types.ts` | OAuth type definitions |

**Assessment: B+** — Solid dual-auth system. iRacing OAuth with PKCE and encrypted token storage is well-implemented. The background sync scheduler keeps profile data fresh.

---

## 2. SECURITY

### Middleware Stack

| Middleware | Purpose |
|-----------|---------|
| `helmet` | Security headers (CSP, HSTS, etc.) |
| `cors` | Cross-origin resource sharing |
| `rate-limit-tiers.ts` | 5-tier rate limiting by entitlement |
| `auth.ts` | JWT verification |
| `license.ts` | Entitlement verification |
| `team-guards.ts` | Team role verification |
| `idp-access.ts` | IDP access control |

### Rate Limiting Tiers

| Tier | Limit (per 15 min) | Who |
|------|-------------------|-----|
| Anonymous | 50 | Unauthenticated |
| BlackBox | 200 | Driver subscribers |
| TeamBox/ControlBox | 500 | Team subscribers |
| Bundle | 1000 | Bundle subscribers |
| Admin | 2000 | Super admins |

### Production Validations (`config/index.ts`)

- JWT secret must be set (not default) and ≥32 characters
- Database URL cannot be localhost (unless `ALLOW_LOCAL_DB=true`)
- Redis URL warning if not set (in-memory fallback not suitable for multi-instance)

### Security Concerns

| # | Issue | Severity | Recommendation |
|---|-------|----------|---------------|
| 1 | CORS `origin: true` allows any origin | **Medium** | Restrict to known domains in production |
| 2 | JWT secret default in dev is short | **Low** | Production validation catches this |
| 3 | No per-endpoint rate limits for AI routes | **Medium** | AI/voice endpoints are expensive — add specific limits |
| 4 | Body parsing limit is 10MB | **Low** | Appropriate for voice audio uploads |

---

## 3. BILLING & ENTITLEMENTS

### Payment Providers

| Provider | Integration | Use Case |
|----------|------------|----------|
| **Stripe** | Subscription-based | Primary billing (checkout sessions, webhooks, customer portal) |
| **Squarespace** | Webhook-based | Legacy/alternative purchases |
| **Manual** | Admin UI | Alpha/testing grants |
| **Promo** | System | Promotional access |

### Entitlement Service (`entitlement-service.ts`, 17KB)

**Single source of truth** for entitlement → capability mapping.

| Feature | Detail |
|---------|--------|
| Products | driver, team, league, bundle |
| Statuses | active, trial, past_due, canceled, expired, pending |
| Sources | squarespace, stripe, manual, promo |
| Scopes | user, org |
| Billing periods | monthly, annual |
| Capabilities | 21 discrete capabilities (see Part 1) |
| Audit logging | All entitlement changes logged |
| Pending system | Handles "buy before signup" edge case |

### Stripe Service (`stripe-service.ts`, 13KB)

| Feature | Detail |
|---------|--------|
| Checkout sessions | Creates Stripe checkout for subscriptions |
| Subscription management | Cancel, reactivate, change plan |
| Webhook processing | checkout.session.completed, invoice.paid, customer.subscription.* |
| Customer portal | Self-service subscription management |
| Idempotency | External event ID prevents duplicate processing |

### Tests
- `entitlement-service.test.ts` — 18 tests (capability mapping, status transitions)
- `billing-squarespace.test.ts` — 11 tests (webhook processing)
- `manual-entitlements.test.ts` — 12 tests (admin grants)

**Assessment: B** — Functional dual-provider billing. The entitlement service is well-designed with proper audit trails. The pending entitlement system is a nice touch. Could benefit from more Stripe webhook edge case testing.

---

## 4. OBSERVABILITY

### Components (`observability/`)

| Component | Size | Purpose |
|-----------|------|---------|
| `correlation.ts` | 2KB | Request correlation IDs — traces requests across services |
| `error-buffer.ts` | 4KB | Circular buffer for recent errors (configurable size) |
| `logger.ts` | 5KB | Structured logging with levels (debug, info, warn, error) |
| `metrics.ts` | 5KB | Prometheus-compatible metrics (counters, histograms, gauges) |
| `parity-tracking.ts` | 5KB | Relay ↔ server data parity verification |
| `relay-tap.ts` | 8KB | Relay data inspection and debugging |
| `ring-buffer.ts` | 5KB | Circular buffer for telemetry data (fixed-size, efficient) |
| `socket-tap.ts` | 6KB | WebSocket traffic inspection and debugging |
| `support-bundle.ts` | 5KB | Diagnostic data collection for support tickets |

### Metrics Endpoint
- Prometheus-compatible at `/metrics`
- Gated by `METRICS_ENABLED` environment variable
- Exposes: request counts, latencies, error rates, WebSocket connections

### Diagnostic Tools
- **Dev Diagnostics** — Admin-only endpoint at `/api/dev/diagnostics` (gated by `DIAGNOSTICS_ENABLED`)
- **Support Bundle** — Collects system state for debugging
- **DevAuditOverlay** — Frontend development audit tool (dev mode only)

### Tests
- `error-buffer.test.ts` — 8 tests
- `metrics.test.ts` — 5 tests

**Assessment: B+** — Good observability foundation for a product at this stage. Prometheus metrics, correlation IDs, and support bundles are production-grade. Could benefit from distributed tracing (OpenTelemetry) as the system scales.

---

## 5. DEPLOYMENT

### Docker Configuration

| File | Purpose |
|------|---------|
| `Dockerfile.server` | Server container |
| `Dockerfile.dashboard` | Dashboard container |
| `docker-compose.yml` | Development environment |
| `docker-compose.rc.yml` | Release candidate |
| `docker-compose.prod.yml` | Production (server + dashboard + nginx + postgres) |

### Infrastructure

| Component | Platform |
|-----------|---------|
| Server | DigitalOcean Droplet (Docker) |
| Dashboard | DigitalOcean App Platform |
| Database | PostgreSQL (managed or self-hosted) |
| Redis | Optional (in-memory fallback) |
| Frontend (app) | Static hosting (Vite build) |
| Relay | Electron packaged app (desktop) |

### Environment Variables (20+)

| Category | Variables |
|----------|----------|
| Server | `NODE_ENV`, `PORT`, `HOST` |
| Database | `DATABASE_URL`, `DATABASE_POOL_SIZE` |
| Cache | `REDIS_URL` |
| Auth | `JWT_SECRET`, `JWT_EXPIRES_IN`, `SUPABASE_URL`, `SUPABASE_JWT_SECRET` |
| AI | `OPENAI_API_KEY`, `AI_INFERENCE_URL`, `AI_MODEL_ID` |
| Voice | `ELEVENLABS_API_KEY` |
| CORS | `CORS_ORIGINS` |
| Observability | `METRICS_ENABLED`, `DIAGNOSTICS_ENABLED`, `OPS_UI_ENABLED` |
| Logging | `LOG_LEVEL`, `LOG_FORMAT` |

**Assessment: B** — Clean Docker-based deployment. Environment separation is good. Could benefit from CI/CD pipeline documentation and health check endpoints for container orchestration.
