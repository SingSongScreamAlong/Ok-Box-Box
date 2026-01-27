# Ok, Box Box — CTO Technical Architecture Report
**Audit Date:** January 26, 2026  
**Prepared For:** Chief Technology Officer  
**Classification:** Internal - Technical Review

---

## Executive Summary

Ok, Box Box is built on a modern TypeScript-first stack with a monorepo architecture. The system demonstrates solid architectural decisions with clear separation of concerns. This report analyzes the technical architecture, scalability considerations, and technology choices.

---

## 1. Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           OK, BOX BOX ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│  │   Driver PC  │     │  Cloud Server │     │  Web Clients │                │
│  │              │     │              │     │              │                │
│  │  ┌────────┐  │     │  ┌────────┐  │     │  ┌────────┐  │                │
│  │  │iRacing │  │     │  │Node.js │  │     │  │ React  │  │                │
│  │  │  Sim   │──┼────▶│  │  API   │──┼────▶│  │  App   │  │                │
│  │  └────────┘  │     │  └────────┘  │     │  └────────┘  │                │
│  │       │      │     │       │      │     │              │                │
│  │  ┌────────┐  │     │  ┌────────┐  │     │  ┌────────┐  │                │
│  │  │ Python │  │     │  │Postgres│  │     │  │Website │  │                │
│  │  │ Relay  │  │     │  │   DB   │  │     │  │        │  │                │
│  │  └────────┘  │     │  └────────┘  │     │  └────────┘  │                │
│  │       │      │     │       │      │                    │                │
│  │  ┌────────┐  │     │  ┌────────┐  │                    │                │
│  │  │Electron│  │     │  │ Redis  │  │                    │                │
│  │  │  Tray  │  │     │  │ Cache  │  │                    │                │
│  │  └────────┘  │     │  └────────┘  │                    │                │
│  └──────────────┘     └──────────────┘     └──────────────┘                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Architecture Pattern: Hub-and-Spoke

- **Hub:** Central Node.js server processes all telemetry and serves clients
- **Spokes:** Relay agents (drivers) and web clients connect via WebSocket
- **Data Flow:** iRacing → Python Relay → WebSocket → Server → Socket.IO → Clients

---

## 2. Technology Stack

### Backend

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Runtime | Node.js | 20+ | Server runtime |
| Language | TypeScript | 5.x | Type safety |
| Framework | Express.js | 4.x | HTTP API |
| Real-time | Socket.IO | 4.x | WebSocket layer |
| Database | PostgreSQL | 15+ | Primary data store |
| Cache | Redis | 7+ | Rate limiting, pub/sub |
| ORM | Raw SQL | - | Direct queries via pg |

### Frontend

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Framework | React | 18.x | UI framework |
| Build Tool | Vite | 5.x | Fast bundling |
| Styling | Tailwind CSS | 3.x | Utility-first CSS |
| Icons | Lucide React | - | Icon library |
| Routing | React Router | 6.x | Client routing |
| State | React Hooks | - | Local state management |

### Desktop Relay

| Layer | Technology | Purpose |
|-------|------------|---------|
| Shell | Electron | Desktop wrapper |
| Bridge | Python 3.11 | iRacing memory access |
| iRacing SDK | pyirsdk | Memory-mapped data |
| Protocol | WebSocket | Server communication |

### External Services

| Service | Provider | Purpose |
|---------|----------|---------|
| Auth | Supabase | User authentication |
| STT | OpenAI Whisper | Speech-to-text |
| LLM | OpenAI GPT-4 | AI responses |
| TTS | ElevenLabs | Text-to-speech |
| Payments | Stripe | Subscriptions |
| Webhooks | Squarespace | Legacy payments |

---

## 3. Codebase Metrics

### Repository Structure

```
okboxbox/                    # Monorepo root
├── apps/                    # 6 applications
│   ├── app/                 # Main React app (51 pages)
│   ├── website/             # Marketing site (21 files)
│   ├── relay/               # Electron + Python relay
│   ├── blackbox/            # (Unused)
│   ├── launcher/            # (Unused)
│   └── racebox/             # (Unused)
├── packages/                # 6 shared packages
│   ├── server/              # Backend (220+ files)
│   ├── common/              # Shared types (26 files)
│   ├── protocol/            # WebSocket schemas (13 files)
│   ├── dashboard/           # Legacy dashboard
│   ├── contracts/           # API contracts
│   └── shared/              # Utilities
├── docs/                    # 22 documentation files
├── legacy/                  # ProjectBlackBox (archived)
└── scripts/                 # Build/deploy scripts
```

### Code Statistics

| Metric | Count |
|--------|-------|
| TypeScript/TSX Files | 760 |
| Lines of TypeScript | 136,280 |
| Python Files | 2,478 |
| SQL Migrations | 18 |
| Test Files | 42 |
| API Route Files | 44 |
| React Components | 100+ |
| Database Tables | 50+ |

### Largest Files (Technical Debt Indicators)

| File | Lines | Concern |
|------|-------|---------|
| `DriverProfilePage.tsx` | 50,166 | Needs refactoring |
| `pitwall/DriverProfile.tsx` | 47,347 | Needs refactoring |
| `WebSocketService.ts` (legacy) | 42,184 | Legacy code |
| `PitwallStrategy.tsx` | 34,791 | Complex component |
| `TelemetryHandler.ts` | 27,379 | Core but large |

---

## 4. Database Architecture

### Migration History (18 migrations)

| Migration | Purpose | Tables Created |
|-----------|---------|----------------|
| 001_initial | Core schema | users, leagues, sessions |
| 002_discipline_profiles | Driver disciplines | discipline_profiles |
| 003_licensing_auth | Auth system | licenses, tokens |
| 004_events_discord | Events, Discord | events, discord_config |
| 004_iracing_oauth | iRacing OAuth | iracing_tokens |
| 004_lap_data | Lap storage | lap_data, sectors |
| 005_entitlements | Billing | entitlements |
| 005_iracing_profiles | Profile sync | iracing_profiles |
| 005_scoring | Points system | scoring_rules |
| 006_paints | Liveries | paints, liveries |
| 007_rulebook_ai | AI rules | rulebook_interpretations |
| 008_protests_appeals | Protests | protests, appeals |
| 009_evidence | Video evidence | evidence, clips |
| 010_entitlement_v1_fields | Billing updates | (alter) |
| 011_individual_driver_profile | IDP | driver_profiles |
| 012_team_system | Teams | teams, team_members |
| 013_team_invites_snapshots | Invites | team_invites |
| 014_driver_memory | AI memory | driver_memory, behaviors |

### Key Database Features

- **Row-Level Security (RLS)** — Supabase-compatible
- **JSONB columns** — Flexible schema for telemetry
- **Triggers** — Automatic timestamp updates
- **Functions** — Stored procedures for complex operations

---

## 5. API Architecture

### Route Organization (44 route files)

| Category | Routes | Purpose |
|----------|--------|---------|
| Auth | auth, oauth/iracing | Authentication |
| Core | sessions, incidents, penalties | Race control |
| Leagues | leagues, events, rulebooks | League management |
| Teams | teams, v1/teams | Team management |
| AI | ai, voice, commentary | AI services |
| Billing | billing-stripe, billing-squarespace | Payments |
| Admin | admin, admin-entitlements | Administration |
| Dev | dev/diagnostics | Development tools |

### API Patterns

- **RESTful design** — Standard CRUD operations
- **Middleware chain** — Auth → License → Rate Limit → Handler
- **Zod validation** — Schema validation on all inputs
- **Error handling** — Centralized error middleware

---

## 6. Real-Time Architecture

### WebSocket Protocol

```typescript
// Protocol versions
v1: Legacy telemetry schema
v2: Current production schema (Zod-validated)

// Message types
- session_metadata: Track, car, session info
- telemetry: Real-time car state (30Hz)
- bulk_telemetry: All cars in session
- incident: Detected incidents
- intelligence: AI insights
```

### Telemetry Pipeline

1. **Ingestion** — Python relay reads iRacing memory (60Hz)
2. **Downsampling** — Reduced to 30Hz for transmission
3. **Validation** — Zod schema validation on server
4. **Processing** — Enrichment (lap tracking, incidents)
5. **Caching** — Redis for voice AI context
6. **Broadcast** — Socket.IO to connected clients
7. **Delay Buffer** — Optional 0-60s delay for broadcasts

---

## 7. Scalability Assessment

### Current Capacity (Single Server)

| Metric | Estimated Capacity |
|--------|-------------------|
| Concurrent WebSocket connections | 1,000-5,000 |
| Telemetry messages/second | 10,000-50,000 |
| API requests/second | 500-2,000 |
| Database connections | 100 (pooled) |

### Scaling Strategy

| Phase | Users | Architecture |
|-------|-------|--------------|
| Phase 1 | 0-1,000 | Single server |
| Phase 2 | 1,000-10,000 | Horizontal scaling, Redis pub/sub |
| Phase 3 | 10,000+ | Kubernetes, sharded databases |

### Bottlenecks Identified

1. **Voice AI** — OpenAI API latency (200-500ms)
2. **Telemetry processing** — CPU-bound at scale
3. **Database writes** — Lap data volume

---

## 8. Security Architecture

### Authentication Flow

```
User → Supabase Auth → JWT → API Middleware → Protected Routes
```

### Authorization Layers

1. **JWT validation** — Token verification
2. **License check** — Entitlement verification
3. **Role-based access** — Owner/Admin/Member/Steward
4. **Rate limiting** — Tiered by subscription

### Data Protection

- **Environment variables** — Secrets in .env (not committed)
- **HTTPS only** — TLS in production
- **CORS configured** — Allowed origins specified
- **SQL injection prevention** — Parameterized queries

---

## 9. Technical Debt

### High Priority

| Issue | Location | Impact |
|-------|----------|--------|
| Large components | DriverProfilePage (50k lines) | Maintainability |
| Legacy code | /legacy folder | Confusion |
| Unused apps | blackbox, launcher, racebox | Clutter |
| 42 TODO comments | Various | Incomplete features |

### Medium Priority

| Issue | Location | Impact |
|-------|----------|--------|
| Mock data | DriverProgress page | Not production-ready |
| Missing tests | Many services | Quality risk |
| Inconsistent styling | Sessions/Stats pages | UX inconsistency |

### Low Priority

| Issue | Location | Impact |
|-------|----------|--------|
| Unused imports | Various files | Lint warnings |
| Console.log statements | Various | Debug noise |

---

## 10. Recommendations

### Immediate (0-2 weeks)

1. **Refactor large components** — Split 50k+ line files
2. **Remove unused apps** — Clean up blackbox, launcher, racebox
3. **Complete missing features** — Team Race Viewer, Spotter
4. **Add integration tests** — Critical paths

### Short-term (2-8 weeks)

1. **Implement caching layer** — Redis for API responses
2. **Add monitoring** — APM, error tracking
3. **Database optimization** — Indexes, query analysis
4. **CI/CD pipeline** — Automated testing and deployment

### Long-term (2-6 months)

1. **Microservices extraction** — Voice AI, telemetry processing
2. **Kubernetes migration** — Container orchestration
3. **Multi-region deployment** — EU, Asia servers
4. **API versioning** — v2 API with breaking changes

---

## 11. Technology Health Score

| Category | Score | Notes |
|----------|-------|-------|
| Architecture | 8/10 | Clean separation, good patterns |
| Code Quality | 7/10 | TypeScript helps, some large files |
| Scalability | 7/10 | Good foundation, needs work at scale |
| Security | 7/10 | Solid basics, needs audit |
| Testing | 5/10 | 42 tests, needs more coverage |
| Documentation | 8/10 | 128 markdown files, well-documented |
| DevOps | 6/10 | Docker ready, needs CI/CD |
| **Overall** | **6.9/10** | **Solid foundation, execution-dependent** |

---

*Report prepared by Cascade AI for technical architecture review.*

