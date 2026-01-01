# Ok, Box Box - Consolidated Project Structure

## 🏁 Complete iRacing Telemetry Platform

This is the consolidated Ok, Box Box project - a comprehensive iRacing telemetry and race control platform with AI-powered coaching, team coordination, and broadcasting capabilities.

## 📁 Project Structure

```
Ok-Box-Box-Project/
├── packages/                 # Core Platform Services
│   ├── common/              # Shared types and constants
│   ├── protocol/            # Protocol schemas (v1 + v2)
│   ├── server/              # Node.js API server (Express + Socket.IO)
│   └── dashboard/           # React web interface
├── apps/                    # Desktop Applications  
│   └── relay/              # Electron relay launcher
├── tools/                   # Simulator Integrations
│   ├── relay-agent/        # Python iRacing relay
│   ├── relay-python/       # Python ControlBox client
│   └── iracing-tracks/     # Track data assets
├── racebox-components/      # Broadcasting overlay components
├── legacy/                  # Original ProjectBlackBox implementation
└── docs/                   # Documentation

```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Python 3.9+
- PostgreSQL 15+
- iRacing subscription

### Development Setup
```bash
# Install dependencies
npm install

# Start development servers
npm run dev
# This starts both server (port 3001) and dashboard (port 5173)

# Database setup
npm run db:migrate
```

### URLs
- **Dashboard**: http://localhost:5173
- **API Server**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health

## 🎯 Product Tiers

### BlackBox ($16/month per driver)
- Driver HUD overlay
- Situational awareness  
- Voice race engineer
- Team pit wall view

### ControlBox ($18/month per league + $2/series)
- Race control tools
- Incident review system
- Steward workflows
- Protest handling

### RaceBox (FREE baseline)
- Public timing pages
- Basic timing overlays
- Ok, Box Box branding required

### RaceBox Plus ($15/month per league + $2/series)
- Director controls
- Live timing overlays
- Delay buffer
- League branding
- Sponsor slots

## 🏗️ Architecture

### Data Flow
```
iRacing SDK → Python Relay → WebSocket → Node.js Server → PostgreSQL + Live Dashboard
```

### Key Components
- **Telemetry Gateway**: Ingests and processes iRacing data
- **AI Race Engineer**: GPT-powered coaching and strategy
- **Incident Detection**: Automated contact and off-track detection  
- **Broadcasting Suite**: Professional overlay graphics
- **Multi-tenant System**: Teams, leagues, and organizations

## 🔧 Development Commands

```bash
npm run build          # Build all packages
npm run dev            # Start dev servers
npm run test           # Run test suites
npm run typecheck      # TypeScript checking
npm run lint           # Code linting
npm run db:migrate     # Run database migrations
```

## 🌐 Deployment

The platform is configured for DigitalOcean App Platform deployment:
- **Production**: Automatic deployment from GitHub
- **Docker**: Multi-container setup
- **Database**: PostgreSQL with migrations
- **CDN**: Static asset delivery

## 📊 Features Implemented

✅ **Complete Platform** (85% of Week 1-21 roadmap)
- Gateway scaffold with validation
- Multi-tenant licensing system  
- Translation and timing services
- Unified web surfaces
- RaceBox broadcast MVP
- Production ops hardening
- Squarespace billing integration

⚠️ **Partial Implementation**
- Tiered rate limiting (entitlements exist, enforcement partial)
- Time-series persistence (PostgreSQL instead of Timescale)
- Trust system controls (explanations exist, confidence gating missing)

❌ **Missing Components**  
- Parallel operation architecture
- Stripe integration (Squarespace used instead)

## 🎮 Usage

1. **Start the platform**: `npm run dev`
2. **Launch iRacing** and join a session
3. **Run relay agent**: `python tools/relay-agent/main.py`
4. **Open dashboard**: http://localhost:5173
5. **Select surface**: Driver HUD, Team Pit Wall, or Race Control

## 🔐 Authentication

- Unified login system with JWT tokens
- Role-based access control
- Subscription-based feature gating
- Launch tokens for relay authentication

## 📝 Notes

This consolidation includes:
- All core platform packages
- Complete development environment
- Production deployment configuration  
- Legacy ProjectBlackBox code for reference
- RaceBox broadcasting components
- Full documentation and setup guides

Ready for continued development and feature expansion.