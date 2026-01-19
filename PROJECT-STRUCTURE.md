# Ok, Box Box - Project Structure

## 🏁 Complete iRacing Telemetry Platform

A comprehensive iRacing telemetry and race control platform with AI-powered coaching, driver development, team coordination, and broadcasting capabilities.

**Last Updated:** January 2026

---

## 📁 Project Structure

```
Ok-Box-Box-Project/
├── packages/                     # Core Platform Services
│   ├── common/                   # Shared types, constants, utilities
│   ├── protocol/                 # Telemetry protocol schemas (v1 + v2)
│   ├── server/                   # Node.js API server (Express + Socket.IO)
│   │   └── src/
│   │       ├── api/              # REST API routes
│   │       │   ├── routes/       # All API endpoints
│   │       │   └── middleware/   # Auth, rate limiting, validation
│   │       ├── config/           # Configuration modules
│   │       │   └── stripe.config.ts  # Stripe billing config
│   │       ├── db/               # Database layer
│   │       │   ├── migrations/   # PostgreSQL migrations
│   │       │   └── repositories/ # Data access layer
│   │       ├── driverbox/        # IDP (Identity Provider) system
│   │       │   ├── routes/       # Driver/Team API routes
│   │       │   └── services/
│   │       │       └── idp/      # Driver aggregates, traits, reports
│   │       ├── services/         # Business logic
│   │       │   ├── auth/         # Authentication
│   │       │   ├── billing/      # Stripe + Squarespace integration
│   │       │   ├── gateway/      # Telemetry ingestion
│   │       │   ├── incidents/    # Incident detection & classification
│   │       │   ├── strategy/     # Race strategy prediction
│   │       │   └── voice/        # AI voice engineer (GPT + TTS)
│   │       ├── track-intel/      # Track intelligence & mapping
│   │       ├── websocket/        # Real-time communication
│   │       │   ├── AuthGate.ts   # JWT authentication
│   │       │   ├── RoomManager.ts # Session room management
│   │       │   ├── SessionHandler.ts # Session lifecycle
│   │       │   ├── TelemetryHandler.ts # Live telemetry
│   │       │   └── BroadcastHandler.ts # Broadcast controls
│   │       └── observability/    # Logging, metrics, tracing
│   └── dashboard/                # React web interface (Vite + TailwindCSS)
│       └── src/
│           ├── components/       # Reusable UI components
│           ├── pages/            # Route pages
│           │   └── team/idp/     # Driver development pages
│           ├── services/         # API clients
│           └── stores/           # Zustand state management
│
├── apps/                         # Desktop Applications
│   └── relay/                    # Electron relay launcher
│       └── src/
│           └── python-bridge.ts  # Python process manager
│
├── tools/                        # Development & Integration Tools
│   ├── relay-agent/              # Python iRacing telemetry relay
│   ├── relay-python/             # Python ControlBox client library
│   ├── relay/                    # Additional relay utilities
│   ├── iracing-tracks/           # Track data assets (SVG, coordinates)
│   ├── test-harness/             # RC testing (smoke, load, chaos)
│   └── export-reference.ts       # Code reference export tool
│
├── scripts/                      # Deployment & Operations
│   ├── rc-up.sh                  # Start RC environment
│   ├── rc-down.sh                # Stop RC environment
│   ├── rc-health.sh              # Health checks
│   ├── rc-chaos.sh               # Chaos testing
│   ├── package-release.sh        # Release packaging
│   └── setup-db.js               # Database initialization
│
├── racebox-components/           # Broadcasting overlay components
│   ├── overlays/                 # Timing tower, battle box, etc.
│   └── director/                 # Director controls
│
├── docs/                         # Documentation
│   ├── STRIPE_CONFIG.md          # Stripe setup guide
│   ├── RATE_LIMITS.md            # Rate limiting documentation
│   ├── SYSTEM_ARCHITECTURE.md    # Architecture overview
│   ├── RELEASE_CANDIDATE.md      # RC workflow guide
│   ├── ops-runbook.md            # Operations playbook
│   └── ...                       # Additional guides
│
├── legacy/                       # Original ProjectBlackBox (reference)
│
└── Configuration Files
    ├── docker-compose.yml        # Local development
    ├── docker-compose.rc.yml     # Release candidate
    ├── docker-compose.prod.yml   # Production
    ├── Dockerfile.server         # Server container
    ├── Dockerfile.dashboard      # Dashboard container
    └── tsconfig.base.json        # Shared TypeScript config
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Python 3.9+
- PostgreSQL 15+
- Redis (optional, for rate limiting persistence)
- iRacing subscription (for telemetry)

### Development Setup
```bash
# Install dependencies
npm install

# Start development servers
npm run dev
# Server: http://localhost:3001
# Dashboard: http://localhost:5173

# Database setup (first time)
npm run db:migrate
```

### URLs
| Service | URL |
|---------|-----|
| Dashboard | http://localhost:5173 |
| API Server | http://localhost:3001 |
| Health Check | http://localhost:3001/api/health |
| WebSocket | ws://localhost:3001 |

---

## 🎯 Product Tiers

| Tier | Price | Features |
|------|-------|----------|
| **Free Account** | Free | Relay download + auth only |
| **BlackBox** (Driver) | $14/month | Driver HUD, voice engineer, personal telemetry, Pit Wall Lite |
| **TeamBox** (Team) | $26/month | Full Pit Wall, multi-car, strategy tools |
| **LeagueBox** (League) | $48/month | Seasons, scoring, rules, Steward Console (optional) |

> **Note:** "ControlBox" is deprecated. Use "LeagueBox" for league tier.

---

## 🏗️ Architecture

### Data Flow
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  iRacing    │───▶│   Python    │───▶│   Server    │───▶│  Dashboard  │
│    SDK      │    │   Relay     │    │  (Node.js)  │    │   (React)   │
└─────────────┘    └─────────────┘    └──────┬──────┘    └─────────────┘
                                             │
                         ┌───────────────────┼───────────────────┐
                         ▼                   ▼                   ▼
                   ┌──────────┐        ┌──────────┐        ┌──────────┐
                   │PostgreSQL│        │  Redis   │        │  OpenAI  │
                   │  (Data)  │        │ (Cache)  │        │  (AI)    │
                   └──────────┘        └──────────┘        └──────────┘
```

### Key Systems

| System | Purpose | Location |
|--------|---------|----------|
| **IDP (Identity Provider)** | Driver profiles, stats, traits | `server/src/driverbox/` |
| **Telemetry Gateway** | Real-time data ingestion | `server/src/services/gateway/` |
| **Incident Detection** | Automated contact/off-track | `server/src/services/incidents/` |
| **Voice Engineer** | GPT-powered race coaching | `server/src/services/voice/` |
| **Billing** | Stripe + Squarespace | `server/src/services/billing/` |
| **WebSocket** | Live communication | `server/src/websocket/` |

---

## 🔧 Development Commands

```bash
# Development
npm run dev              # Start all dev servers
npm run dev:server       # Server only
npm run dev:dashboard    # Dashboard only

# Building
npm run build            # Build all packages
npm run typecheck        # TypeScript checking
npm run lint             # ESLint

# Testing
npm run test             # Run test suites
npm run test:e2e         # End-to-end tests

# Database
npm run db:migrate       # Run migrations
npm run db:seed          # Seed test data

# Release Candidate
./scripts/rc-up.sh       # Start RC environment
./scripts/rc-health.sh   # Run health checks
./scripts/rc-down.sh     # Stop RC environment
```

---

## 📊 Implementation Status

### ✅ Complete
- Multi-tenant licensing and entitlements
- Telemetry ingestion (Protocol v1 + v2)
- WebSocket architecture (refactored Jan 2026)
- Rate limiting (API + Socket.IO)
- Stripe billing integration
- Squarespace webhook integration
- IDP: Driver aggregates, traits, reports
- Incident detection and classification
- RaceBox broadcast overlays
- Track intelligence module
- JWT authentication + launch tokens
- RC deployment workflow

### ⚠️ Partial Implementation
- Strategy predictor (basic, needs opponent data)
- Trust system (explanations exist, confidence gating TODO)
- Time-series optimization (PostgreSQL, not TimescaleDB)

### 🔮 Future
- Parallel operation architecture (scaling)
- Advanced tire/fuel modeling
- Machine learning incident classification

---

## 🔐 Authentication & Security

- **JWT Tokens**: API and WebSocket authentication
- **Launch Tokens**: One-time relay authentication
- **Role-Based Access**: admin, racecontrol, team_principal, driver
- **Entitlement Gating**: Feature access based on subscription
- **Rate Limiting**: Per-user and per-IP limits
- **Webhook Verification**: Stripe signature validation

---

## 🌐 Deployment

### DigitalOcean App Platform
- Automatic deployment from GitHub `main` branch
- PostgreSQL managed database
- Redis for caching/rate limiting

### Docker
```bash
# Production
docker-compose -f docker-compose.prod.yml up -d

# Release Candidate
docker-compose -f docker-compose.rc.yml up -d
```

---

## 📚 Documentation Index

| Document | Purpose |
|----------|---------|
| [README.md](README.md) | Project overview |
| [GETTING-STARTED.md](GETTING-STARTED.md) | Setup guide |
| [docs/STRIPE_CONFIG.md](docs/STRIPE_CONFIG.md) | Stripe integration |
| [docs/RATE_LIMITS.md](docs/RATE_LIMITS.md) | Rate limiting |
| [docs/SYSTEM_ARCHITECTURE.md](docs/SYSTEM_ARCHITECTURE.md) | Architecture deep-dive |
| [docs/RELEASE_CANDIDATE.md](docs/RELEASE_CANDIDATE.md) | RC workflow |
| [docs/ops-runbook.md](docs/ops-runbook.md) | Operations guide |

---

## 🎮 Quick Usage

1. **Start the platform**: `npm run dev`
2. **Launch iRacing** and join a session
3. **Run relay agent**: `python tools/relay-agent/main.py`
4. **Open dashboard**: http://localhost:5173
5. **Select surface**: Driver HUD, Team Pit Wall, Broadcast, or Race Control

---

*Ready for continued development and feature expansion.*