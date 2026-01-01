# PitBox AI Agent Service

AI-powered driver coaching and race strategy analysis service using GradientAI/OpenAI.

## Features

- **Real-time Driver Coaching**: AI-powered feedback on driving technique, braking, throttle, and racing line
- **Race Strategy Analysis**: Pit stop timing, tire strategy, and tactical recommendations
- **Telemetry Analysis**: Detailed sector and corner-by-corner performance analysis
- **Voice Integration**: Text-to-speech coaching via ElevenLabs
- **WebSocket Support**: Real-time streaming coaching
- **Response Caching**: 5-minute cache for improved performance
- **Rate Limiting**: Configurable API rate limits
- **API Key Authentication**: Secure API access

## Installation

```bash
cd ai_agent
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required environment variables:
- `GRADIENT_AI_API_KEY` or `OPENAI_API_KEY`: AI service API key
- `ELEVENLABS_API_KEY`: For voice coaching (optional)
- `API_KEY`: For securing the AI agent API
- `JWT_SECRET`: For authenticating with relay agent

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## API Endpoints

### Health Check
```bash
GET /health
```

### Get Configuration
```bash
GET /config
Headers: x-api-key: your_api_key
```

### Analyze Telemetry
```bash
POST /analyze
Headers: x-api-key: your_api_key
Body: {
  "telemetry": {
    "lapTime": 87.543,
    "speed": 180,
    "throttle": 0.85,
    "brake": 0.0,
    "gear": 4,
    "position": 3
  },
  "analysisType": "driverCoach",
  "includeVoice": true
}
```

### Get Driver Coaching
```bash
POST /coach
Headers: x-api-key: your_api_key
Body: {
  "telemetry": { ... },
  "includeVoice": true
}
```

### Get Race Strategy
```bash
POST /strategy
Headers: x-api-key: your_api_key
Body: {
  "telemetry": { ... },
  "raceData": {
    "lapsRemaining": 25,
    "fuelRemaining": 8.5,
    "position": 3
  }
}
```

### Clear Cache
```bash
POST /clear-cache
Headers: x-api-key: your_api_key
```

## WebSocket API

Connect to WebSocket for real-time coaching:

```javascript
const ws = new WebSocket('ws://localhost:3001');

ws.on('open', () => {
  // Send telemetry
  ws.send(JSON.stringify({
    type: 'telemetry',
    telemetry: { ... }
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  if (message.type === 'coaching') {
    console.log('AI Coaching:', message.analysis);
  }
});
```

## Analysis Types

1. **driverCoach**: Real-time driving technique feedback (2-3 sentences, conversational)
2. **strategy**: Race strategy recommendations (3-4 bullet points)
3. **telemetryAnalysis**: Detailed technical analysis with metrics

## Docker Deployment

Build and run with Docker:

```bash
docker build -t pitbox-ai-agent .
docker run -p 3001:3001 --env-file .env pitbox-ai-agent
```

## Integration

The AI Agent integrates with:
- **Relay Agent**: Receives telemetry data
- **Driver App**: Sends coaching back to driver
- **Dashboard**: Provides analysis for team viewing
- **ElevenLabs**: Generates voice coaching

## License

MIT
