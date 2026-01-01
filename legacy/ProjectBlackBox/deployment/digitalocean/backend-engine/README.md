# PitBox Backend Engine

The Backend Engine is the core server component of the PitBox hybrid cloud architecture. It handles data processing, storage, and communication between the driver app, relay agent, AI agent, and team dashboard.

## Features

- RESTful API for telemetry and video data
- WebSocket server for real-time data streaming
- PostgreSQL database integration
- JWT authentication and authorization
- Integration with AI agent for driver coaching
- Integration with voice services for audio feedback
- Session management and data storage
- Scalable and containerized for cloud deployment

## Architecture

The Backend Engine is designed as a Node.js Express application that serves as the central hub for the PitBox hybrid cloud architecture. It communicates with:

1. **Driver App** - Receives telemetry and video data from the local driver application
2. **Relay Agent** - Processes and forwards data from the driver app to the backend
3. **AI Agent** - Sends data for analysis and receives coaching feedback
4. **Dashboard** - Provides data to the team dashboard for monitoring and analysis

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- Docker (for containerized deployment)

### Local Development

1. Install dependencies:
   ```
   npm install
   ```

2. Set up environment variables:
   ```
   cp .env.example .env
   ```
   Edit the `.env` file with your configuration.

3. Initialize the database:
   ```
   psql -U postgres -f db-init.sql
   ```

4. Start the server:
   ```
   npm start
   ```

### Docker Deployment

1. Build the Docker image:
   ```
   docker build -t pitbox-backend-engine .
   ```

2. Run the container:
   ```
   docker run -p 8080:8080 --env-file .env pitbox-backend-engine
   ```

## API Documentation

### Authentication

All API endpoints require JWT authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

### Endpoints

#### Health Check

```
GET /health
```

Returns the health status of the server.

#### Status

```
GET /api/status
```

Returns the current status of the server and user information.

#### Telemetry Data

```
POST /api/telemetry
```

Submit telemetry data from the driver app.

**Request Body:**
```json
{
  "driverId": "uuid",
  "sessionId": "uuid",
  "data": {
    // Telemetry data object
  }
}
```

#### Video Frame

```
POST /api/video
```

Submit a video frame from the driver app.

**Request Body:**
```json
{
  "driverId": "uuid",
  "sessionId": "uuid",
  "frameData": "base64-encoded-image",
  "timestamp": "2023-07-17T12:34:56Z"
}
```

#### AI Feedback

```
POST /api/ai/feedback
```

Request AI feedback for telemetry data.

**Request Body:**
```json
{
  "driverId": "uuid",
  "sessionId": "uuid",
  "telemetryData": {
    // Telemetry data object
  }
}
```

#### Voice Synthesis

```
POST /api/voice/synthesize
```

Synthesize text to speech using ElevenLabs.

**Request Body:**
```json
{
  "text": "Text to synthesize",
  "voiceId": "optional-voice-id"
}
```

#### Session Management

```
POST /api/sessions
```

Create a new session.

**Request Body:**
```json
{
  "driverId": "uuid",
  "name": "Session Name",
  "trackId": "optional-track-id"
}
```

```
GET /api/sessions/:driverId
```

Get all sessions for a driver.

## WebSocket API

Connect to the WebSocket server at `/ws?token=<jwt-token>`.

### Message Types

#### Subscribe

```json
{
  "type": "subscribe",
  "channel": "channel-name"
}
```

Subscribe to a channel for real-time updates.

Available channels:
- `telemetry:<driverId>`
- `video:<driverId>`
- `ai:<driverId>`
- `session:<sessionId>`

#### Unsubscribe

```json
{
  "type": "unsubscribe",
  "channel": "channel-name"
}
```

Unsubscribe from a channel.

## Database Schema

The database schema is defined in `db-init.sql` and includes tables for:

- Users
- Drivers
- Teams
- Tracks
- Sessions
- Telemetry data
- Video frames
- AI feedback
- Voice cache
- API keys

## Configuration

Configuration is managed through environment variables:

- `PORT` - Server port (default: 8080)
- `JWT_SECRET` - Secret for JWT authentication
- `CORS_ORIGINS` - Comma-separated list of allowed origins
- `LOG_LEVEL` - Logging level (default: info)
- `DATABASE_URL` - PostgreSQL connection string
- `AI_AGENT_URL` - URL of the AI agent service
- `DATA_DIR` - Directory for storing data files
- `GRADIENT_AI_API_KEY` - API key for GradientAI
- `ELEVENLABS_API_KEY` - API key for ElevenLabs

## License

Proprietary - All rights reserved
