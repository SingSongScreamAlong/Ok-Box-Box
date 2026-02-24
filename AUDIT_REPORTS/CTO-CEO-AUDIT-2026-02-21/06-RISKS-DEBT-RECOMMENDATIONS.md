# OKBoxBox — Full Platform Audit (Part 6)
## Risk Register, Technical Debt & Recommendations

---

## 1. RISK REGISTER

### HIGH RISK

| # | Risk | Impact | Likelihood | Mitigation |
|---|------|--------|-----------|------------|
| 1 | **No frontend tests** | Regressions in 42 pages go undetected; any refactor is blind | High | Add Vitest + React Testing Library for critical hooks and pages |
| 2 | **189 TypeScript errors in frontend** | Runtime crashes in DriverComparison, league pages, pitwall pages | Medium | Fix null guards — 110 of 189 errors are in one file |
| 3 | **CORS `origin: true` in production** | Cross-site request forgery, unauthorized API access | Medium | Restrict to `app.okboxbox.com`, `okboxbox.com`, known domains |
| 4 | **TelemetryHandler is 37KB single file** | Maintenance burden, single point of failure for all real-time features | Medium | Extract into TelemetryProcessor, IntelligenceEmitter, TelemetryHandler |
| 5 | **PitwallHome is 65KB single component** | Performance issues, impossible to unit test, maintenance nightmare | Medium | Decompose into PitwallTelemetryGrid, PitwallStrategyPanel, etc. |
| 6 | **Dual dashboard apps (apps/app + packages/dashboard)** | Feature drift, duplicated maintenance, user confusion | High | Consolidate into apps/app over time |

### MEDIUM RISK

| # | Risk | Impact | Likelihood | Mitigation |
|---|------|--------|-----------|------------|
| 7 | **No per-endpoint rate limits for AI/voice** | Expensive OpenAI/ElevenLabs calls can be abused | Medium | Add specific rate limits for `/api/ai/*`, `/api/voice/*`, crew-chat |
| 8 | **Migration number collisions (three 004_*, two 005_*)** | Developer confusion, potential ordering issues | Low | Adopt strict sequential numbering going forward |
| 9 | **OpenAI/ElevenLabs key not validated at startup** | AI features silently fail with no user feedback | Medium | Add startup validation + health check endpoint for AI services |
| 10 | **No WebSocket reconnection strategy** | Dropped connections during races = lost telemetry | High | Add exponential backoff reconnection in useRelay |
| 11 | **post-session-learner dynamic import path** | `SessionHandler.ts:148` — module may not resolve, breaking post-session learning | Medium | Verify import path, add error handling around dynamic import |
| 12 | **SpatialAwareness not wired to telemetry feed** | Incident classification may lack spatial context (TODO in code) | Medium | Wire telemetry feed to SpatialAwarenessService singleton |

### LOW RISK

| # | Risk | Impact | Likelihood | Mitigation |
|---|------|--------|-----------|------------|
| 13 | **Unused variables in frontend** | Lint noise, confusing for new developers | Low | Cleanup pass |
| 14 | **Legacy BlackBox serving from server** | Dead code, unnecessary attack surface | Low | Remove when migration complete |
| 15 | **Mock data in services** | Confusion about data source during debugging | Low | Remove or gate behind dev flag |
| 16 | **No API versioning strategy** | Mixed `/api/v1/drivers` vs `/api/incidents` | Low | Formalize v1/v2 strategy |

---

## 2. TECHNICAL DEBT LEDGER

### Critical Debt (Fix This Sprint)

| Item | Location | Effort | Impact |
|------|----------|--------|--------|
| Fix DriverComparison null safety | `apps/app/src/pages/pitwall/DriverComparison.tsx` | 2h | Eliminates 110 of 189 TS errors |
| Fix post-session-learner import | `packages/server/src/websocket/SessionHandler.ts:148` | 30min | Fixes broken post-session learning pipeline |
| Tighten CORS for production | `packages/server/src/app.ts` | 1h | Closes security gap |

### High-Priority Debt (Next 2 Weeks)

| Item | Location | Effort | Impact |
|------|----------|--------|--------|
| Fix league page TS errors | `apps/app/src/pages/league/*.tsx` | 4h | Eliminates ~35 TS errors |
| Fix pitwall page TS errors | `apps/app/src/pages/pitwall/*.tsx` | 3h | Eliminates ~20 TS errors |
| Fix remaining misc TS errors | Various frontend files | 2h | Eliminates ~24 TS errors |
| Add WebSocket reconnection | `apps/app/src/hooks/useRelay.tsx` | 4h | Prevents data loss during races |
| Add frontend test suite | `apps/app/` | 2-3 days | Prevents regressions in 42 pages |
| Validate AI API keys at startup | `packages/server/src/config/index.ts` | 1h | Clear error messages when AI unavailable |

### Moderate Debt (Next Month)

| Item | Location | Effort | Impact |
|------|----------|--------|--------|
| Extract TelemetryHandler sub-modules | `packages/server/src/websocket/TelemetryHandler.ts` | 1 day | Maintainability of 37KB file |
| Split PitwallHome into components | `apps/app/src/pages/pitwall/PitwallHome.tsx` | 1 day | Performance + maintainability of 65KB page |
| Wire SpatialAwareness to telemetry | `packages/server/src/services/incidents/` | 4h | Improves incident classification accuracy |
| Add per-endpoint AI rate limits | `packages/server/src/api/routes/ai.ts`, `voice.ts` | 4h | Prevents cost overruns |
| Sequential migration numbering | `packages/server/src/db/migrations/` | 1h | Developer clarity |

### Long-Term Debt (Next Quarter)

| Item | Location | Effort | Impact |
|------|----------|--------|--------|
| Consolidate dashboard packages | `packages/dashboard` → `apps/app` | 1-2 weeks | Eliminates duplication, single codebase |
| Add E2E tests (Playwright) | New | 1 week | Critical user flow verification |
| Add frontend performance monitoring | `apps/app/` | 2 days | LCP, FID, CLS for telemetry-heavy pages |
| Formalize API versioning | `packages/server/src/api/routes/` | 2 days | Clean API evolution |
| Remove legacy BlackBox serving | `packages/server/src/app.ts` | 30min | Clean codebase |
| Add OpenTelemetry tracing | `packages/server/` | 3 days | Distributed tracing across services |

---

## 3. RECOMMENDATIONS

### Immediate Actions (This Sprint)

**1. Fix DriverComparison.tsx (2 hours)**
Add a null guard for `driver2` state. This single fix eliminates 110 of 189 frontend TypeScript errors.
```tsx
// Add early return when driver2 is null
if (!driver2) return <div>Select a second driver to compare</div>;
```

**2. Fix post-session-learner import (30 minutes)**
Verify the dynamic import path at `SessionHandler.ts:148`. The module `../services/ai/post-session-learner.js` must resolve correctly for the post-session learning pipeline to work.

**3. Tighten CORS (1 hour)**
Replace `origin: true` with explicit domain list:
```ts
origin: config.nodeEnv === 'production' 
  ? config.corsOrigins 
  : true
```

### Short-Term (Next 2 Weeks)

**4. Frontend test suite**
Priority test targets:
- `useRelay` — WebSocket lifecycle, event handling, state management
- `useEngineer` — Message generation, callout logic, cooldowns
- `EngineerCore` — Personality, mental state, intelligence processing
- `LiveCockpit` — Intelligence panel rendering
- `DriverLanding` — State machine transitions
- `FeatureGate` — Entitlement gating logic

**5. Fix remaining TS errors (~1 day total)**
- League pages: null safety fixes (35 errors)
- Pitwall pages: unused variable cleanup (20 errors)
- Misc: unused imports/variables (24 errors)

**6. WebSocket reconnection**
Add exponential backoff reconnection in `useRelay` with:
- Automatic reconnection on disconnect
- Backoff: 1s → 2s → 4s → 8s → 16s → 30s max
- Session state recovery on reconnect
- User notification of connection status

### Medium-Term (Next Month)

**7. Extract TelemetryHandler**
Split the 37KB file into:
- `TelemetryProcessor` — raw → computed
- `IntelligenceEmitter` — analyzer + spotter + SA
- `TelemetryHandler` — orchestrator

**8. Split PitwallHome**
Decompose the 65KB page into:
- `PitwallTelemetryGrid` — multi-car telemetry
- `PitwallStrategyPanel` — strategy overview
- `PitwallGapTracker` — gap management
- `PitwallRadio` — team radio

**9. Dashboard consolidation plan**
Begin migrating `packages/dashboard` features into `apps/app`. The driver pages already exist in both — start there.

### Long-Term (Next Quarter)

**10. E2E testing with Playwright**
Critical flows to test:
- Login → connect relay → live session → crew chat
- Team creation → invite → pitwall → race viewer
- League creation → incident → protest → penalty

**11. Performance monitoring**
Add frontend performance metrics for telemetry-heavy pages (LiveCockpit, PitwallHome, TeamRaceViewer).

**12. API versioning**
Formalize v1/v2 strategy. Currently mixed (`/api/v1/drivers` vs `/api/incidents`).

---

## 4. OVERALL ASSESSMENT

### Strengths
- **AI intelligence pipeline** is world-class — layered architecture from raw telemetry to voice callouts
- **Driver memory system** is a genuine competitive moat — living memory that evolves with every session
- **Server architecture** is clean, well-tested (237/237 passing), and TypeScript-clean (0 errors)
- **Crew chat system** with live telemetry + accumulated intelligence injection is production-ready
- **Entitlement system** is well-designed with proper audit trails and dual billing provider support
- **Observability** foundation (Prometheus, correlation IDs, support bundles) is production-grade
- **Feature breadth** is impressive — 42 frontend pages, 180+ API endpoints, 25+ services

### Weaknesses
- **Zero frontend tests** — the single biggest quality gap
- **189 frontend TS errors** — concentrated but need fixing before production
- **Dual dashboard apps** — maintenance burden and feature drift risk
- **Large monolithic files** — TelemetryHandler (37KB), PitwallHome (65KB) need decomposition
- **CORS configuration** — too permissive for production

### Bottom Line

This is a **remarkably feature-rich platform** for its stage. The AI/telemetry pipeline is the standout — it's genuinely sophisticated and well-architected. The server is production-ready with clean TypeScript and comprehensive tests. The frontend needs TypeScript cleanup and test coverage before it can be considered production-grade.

**Recommended priority: Fix the 3 critical debt items this sprint, add frontend tests and fix TS errors over the next 2 weeks, then tackle the architectural improvements over the next month.**

---

*Report generated February 21, 2026*
*Audit scope: Full monorepo — 6 packages, 6 apps, 47 API route files, 42 frontend pages, 25+ services, 19 DB migrations*
