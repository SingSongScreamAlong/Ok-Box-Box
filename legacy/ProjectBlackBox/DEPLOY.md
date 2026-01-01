# Deploying PitBox Racing to DigitalOcean

## Prerequisites

1. **DigitalOcean Account** with App Platform access
2. **GitHub Repository** connected to DigitalOcean
3. **API Keys** for OpenAI and ElevenLabs

## Quick Deploy

### Option 1: DigitalOcean App Platform (Recommended)

1. Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
2. Click "Create App"
3. Select your GitHub repo: `SingSongScreamAlong/ProjectPitBox`
4. DigitalOcean will auto-detect the `.do/app.yaml` configuration
5. Add your secrets in the App Settings:
   - `DATABASE_URL` - Will be auto-filled if using DO managed database
   - `JWT_SECRET` - Generate a random 32+ character string
   - `OPENAI_API_KEY` - Your OpenAI API key
   - `ELEVENLABS_API_KEY` - Your ElevenLabs API key
6. Click "Deploy"

### Option 2: Docker Compose (Self-Hosted)

```bash
# Clone the repo
git clone https://github.com/SingSongScreamAlong/ProjectPitBox.git
cd ProjectPitBox

# Create .env file
cp .env.example .env
# Edit .env with your API keys

# Build and run
docker-compose up -d
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DigitalOcean App Platform                │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐ │
│  │  Dashboard  │    │   Server    │    │   PostgreSQL    │ │
│  │   (nginx)   │◄──►│  (Node.js)  │◄──►│   (Managed)     │ │
│  │   Port 80   │    │  Port 3000  │    │                 │ │
│  └─────────────┘    └─────────────┘    └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ WebSocket
                              │
┌─────────────────────────────┴───────────────────────────────┐
│                     Windows PC (User)                        │
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │    iRacing      │◄──►│      PitBox Relay Agent       │ │
│  │   Simulator     │    │         (Python)                │ │
│  └─────────────────┘    └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Environment Variables

### Server (Required)
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for JWT tokens (32+ chars) |
| `OPENAI_API_KEY` | OpenAI API key for AI coaching |
| `ELEVENLABS_API_KEY` | ElevenLabs API key for voice |

### Server (Optional)
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `production` | Environment |
| `CORS_ORIGINS` | `*` | Allowed origins |

### Relay Agent
| Variable | Default | Description |
|----------|---------|-------------|
| `BLACKBOX_SERVER_URL` | `http://localhost:3000` | Server URL |
| `POLL_RATE_HZ` | `10` | Telemetry rate |

## Relay Agent Setup (Windows)

The relay agent runs on the user's Windows PC alongside iRacing:

```powershell
# Download the relay agent
# (from GitHub releases or build yourself)

# Set the server URL
set BLACKBOX_SERVER_URL=https://your-app.ondigitalocean.app

# Run
python main.py
```

Or use the pre-built executable:
```powershell
PitBox-Relay.exe --url https://your-app.ondigitalocean.app
```

## Monitoring

- **Health Check**: `https://your-app.ondigitalocean.app/health`
- **Metrics**: `https://your-app.ondigitalocean.app/health/metrics`
- **DigitalOcean Dashboard**: View logs, metrics, and scaling options

## Costs (Estimated)

| Service | Size | Cost/Month |
|---------|------|------------|
| API Server | basic-xxs | $5 |
| Dashboard | basic-xxs | $5 |
| PostgreSQL | db-s-dev | $7 |
| **Total** | | **~$17/mo** |

Scale up as needed for more users.
