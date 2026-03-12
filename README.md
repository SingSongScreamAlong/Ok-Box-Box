# ControlBox v0.1 Alpha

> **Autonomous Race Control System for Online Leagues**

ControlBox is a standalone application + web dashboard providing live race control tools, automated incident detection, rulebook enforcement, and AI-powered analysis for online racing leagues.

---

## Canonical Run Commands

These are the **only** supported development entrypoints.

- **Canonical App / Dashboard (ONLY dashboard)**
  - **Path**: `apps/app`
  - **Run**: `npm run app`
  - **Build identity**: `http://localhost:5175/about/build`

- **Marketing Website (marketing only)**
  - **Path**: `apps/website`
  - **Run**: `npm run website`

- **Relay (Electron desktop app)**
  - **Path**: `apps/desktop`
  - **Run**: `npm run relay`

- **API (backend)**
  - **Path**: `packages/server`
  - **Run**: `npm run api`

---

## Features

- 🏎️ **Live Race Control** — Real-time incident monitoring and steward tools
- ⚠️ **Automated Incident Detection** — Contact, off-track, spin, and loss-of-control detection
- 📊 **Incident Classification** — Severity scoring and contact type analysis
- 🤖 **AI-Powered Analysis** — Fault attribution with confidence scores and explainability
- 📖 **Rulebook Engine** — Load custom league rules and auto-generate penalties
- 📋 **Steward Dashboard** — Penalty approval workflow, replay timestamps, notes
- 📈 **Post-Race Reports** — Exportable incident and penalty summaries

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js 20+ / TypeScript / Express / Socket.IO |
| Frontend | React 18 / TypeScript / Tailwind CSS / Vite |
| Database | PostgreSQL 15+ |
| Cache | Redis 7+ |
| AI | Local inference API (model-agnostic) |

---

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm 10+

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd controlbox

# Copy environment config
cp .env.example .env

# Start database and cache
docker-compose up -d

# Install dependencies
npm install

# Start the application UI
npm run app

# Start the API
npm run api

# Start the desktop relay
npm run relay
```

### Services

| Service | URL |
|---------|-----|
| API Server | http://localhost:3001 |
| Application UI | http://localhost:5175 |
| Marketing Website | http://localhost:5173 |
| Ops Console | http://localhost:3005 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

---

## Project Structure

```
controlbox/
├── apps/
│   ├── app/             # Canonical application UI
│   ├── desktop/         # Canonical desktop relay
│   └── website/         # Marketing website
├── packages/
│   ├── common/          # Shared types, constants, utilities
│   ├── server/          # Backend API server
│   └── protocol/        # Shared protocol definitions
├── tools/
│   ├── relay-agent/     # Python relay/dev tooling
│   └── relay-python/    # Older Python relay tooling
├── docs/                # Documentation
├── docker-compose.yml   # Local dev environment
└── package.json         # Workspace root
```

---

## Development

```bash
# Run backend only
npm run api

# Run application UI only
npm run app

# Run website only
npm run website

# Run desktop relay only
npm run relay

# Run Live Race Ops Console (Legacy)
npm run legacy:ops-console

# Run tests
npm run test

# Type checking
npm run typecheck
```

---

## Documentation

- **[System Architecture (The Manual)](docs/SYSTEM_ARCHITECTURE.md)** 👈 *Start Here!*
- [Architecture Overview (Legacy)](docs/architecture.md)
- [API Specification](docs/api-spec.md)
- [Rulebook Schema](docs/rulebook-schema.md)
- [Windsurf Tasks](docs/windsurf-tasks.md)

---

## Roadmap

- **v0.1 Alpha** — Core systems, iRacing support, basic dashboard
- **v0.2 Beta** — AI improvements, full reporting, polish
- **v0.3** — Multi-sim support (ACC, rF2)
- **v1.0** — Cloud deployment, multi-tenant, mobile app

---

## License

MIT © OKBoxBox
