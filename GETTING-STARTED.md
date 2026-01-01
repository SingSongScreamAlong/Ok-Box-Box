# 🏁 Ok, Box Box - Getting Started Guide

## Prerequisites

### Required Software
```bash
# Node.js 20+
node --version  # Should be >= 20.0.0

# Python 3.9+  
python3 --version  # Should be >= 3.9.0

# PostgreSQL 15+
psql --version  # Should be >= 15.0
```

### Required Accounts
- **iRacing Subscription** (for telemetry data)
- **OpenAI API Key** (for AI coaching features)
- **ElevenLabs API Key** (optional, for voice synthesis)

## Quick Setup (5 minutes)

### 1. Install Dependencies
```bash
cd Ok-Box-Box-Project
npm install
```

### 2. Database Setup
```bash
# Create PostgreSQL database
createdb controlbox

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
# Minimum required: DATABASE_URL, JWT_SECRET
```

### 3. Run Migrations
```bash
npm run db:migrate
```

### 4. Start Development
```bash
# Start both server and dashboard
npm run dev

# Or start individually:
npm run dev:server   # Port 3001
npm run dev:dashboard # Port 5173
```

### 5. Open Dashboard
Navigate to **http://localhost:5173** in your browser.

## Full Production Setup

### 1. Environment Configuration
Edit `.env` with all required values:
```bash
# Database (required)
DATABASE_URL=postgresql://user:pass@localhost:5432/controlbox

# Authentication (required)
JWT_SECRET=your-256-bit-secret-key

# OpenAI (required for AI features)
OPENAI_API_KEY=sk-your-openai-key

# Optional services
ELEVENLABS_API_KEY=your-elevenlabs-key
SQUARESPACE_WEBHOOK_SECRET=your-webhook-secret
```

### 2. Python Relay Agent Setup
```bash
cd tools/relay-agent
pip install -r requirements.txt

# Test the relay
python main.py --help
```

### 3. iRacing Integration
```bash
# Make sure iRacing is installed and working
# The relay agent will connect automatically when iRacing is running
```

## Usage Workflow

### For Drivers (BlackBox)
1. Start the platform: `npm run dev`
2. Launch iRacing and join a session
3. Run relay agent: `python tools/relay-agent/main.py`
4. Open dashboard: http://localhost:5173
5. Select "Driver HUD" surface
6. Get AI coaching and telemetry analysis

### For Teams (Team Pit Wall)
1. Follow driver setup above
2. Select "Team Pit Wall" surface  
3. Multiple team members can connect
4. Coordinate strategy and driver handoffs
5. Monitor opponent intelligence

### For Race Control (ControlBox)
1. Follow basic setup
2. Select "Race Control" surface
3. Monitor live incidents
4. Use AI-assisted stewarding tools
5. Issue penalties and manage protests

### For Broadcasting (RaceBox)
1. Set up OBS Studio
2. Add browser sources pointing to overlay URLs:
   - Director: http://localhost:5173/racebox/director
   - Public Timing: http://localhost:5173/racebox/timing
   - Battle Box: http://localhost:5173/racebox/battlebox
3. Configure broadcast scenes
4. Stream live racing with professional overlays

## Development Commands

```bash
# Development
npm run dev              # Start both server + dashboard
npm run dev:server       # Start only API server
npm run dev:dashboard    # Start only React dashboard

# Building
npm run build           # Build all packages
npm run typecheck       # TypeScript verification
npm run lint            # Code linting

# Database
npm run db:migrate      # Run database migrations

# Testing
npm test               # Run all tests
npm run test:server    # Server tests only
npm run test:dashboard # Dashboard tests only
```

## File Structure

```
Ok-Box-Box-Project/
├── packages/
│   ├── server/         # API backend (Express + Socket.IO)
│   ├── dashboard/      # Web interface (React + Vite)
│   ├── common/         # Shared types
│   └── protocol/       # Data schemas
├── tools/
│   └── relay-agent/    # Python iRacing integration
├── apps/
│   └── relay/          # Electron launcher app
└── racebox-components/ # Broadcasting overlays
```

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
brew services start postgresql
# or
sudo systemctl start postgresql

# Test connection
psql -d controlbox -c "SELECT version();"
```

### iRacing Connection Issues
```bash
# Verify iRacing SDK is accessible
# Make sure iRacing is running and in a session
python tools/relay-agent/main.py --debug
```

### Port Conflicts
```bash
# Kill processes on default ports
lsof -ti:3001 | xargs kill -9  # API server
lsof -ti:5173 | xargs kill -9  # Dashboard
```

### Build Issues
```bash
# Clear all dependencies and reinstall
npm run clean
npm install
npm run build
```

## Next Steps

1. **Configure your environment** with API keys
2. **Test with iRacing** by joining a practice session
3. **Explore the interfaces** - try all three product surfaces
4. **Set up broadcasting** if you want to stream
5. **Read the documentation** in `/docs` for advanced features

## Support

- Check the GitHub issues for known problems
- Review the audit report in `PROJECT-STRUCTURE.md`
- Legacy documentation in `/legacy/ProjectBlackBox/docs`

**Ready to race! 🏁**