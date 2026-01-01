# BlackBox Cloud

The brain and backbone of BlackBox - AI Race Engineering Platform.

## What It Does

- Receives telemetry from Relay clients via WebSocket
- Runs AI analysis to generate race engineer radio calls
- Broadcasts calls to drivers (via Relay TTS) and teams (via Web UI)
- Provides REST API for session management

## Quick Start

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your OpenAI key

# Run in development
npm run dev

# Build for production
npm run build
npm start
```

## API Endpoints

### REST

- `GET /health` - Health check
- `GET /api/sessions` - List sessions
- `POST /api/sessions` - Create session
- `GET /api/sessions/:id` - Get session details
- `POST /api/sessions/:id/radio` - Send manual radio call

### WebSocket Events

**From Relay:**
- `join_session` - Join a session
- `telemetry` - Send telemetry frame
- `driver_voice` - Driver question/command

**From Cloud:**
- `session_joined` - Confirmation
- `telemetry` - Broadcast to viewers
- `radio_call` - AI or engineer message

## Deployment

```bash
# Build Docker image
docker build -t blackbox-cloud .

# Run container
docker run -p 3000:3000 -e OPENAI_API_KEY=xxx blackbox-cloud
```
