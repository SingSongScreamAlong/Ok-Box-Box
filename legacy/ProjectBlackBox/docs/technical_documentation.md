# PitBox Hybrid Cloud System - Technical Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Component Specifications](#component-specifications)
3. [API Reference](#api-reference)
4. [WebSocket Protocol](#websocket-protocol)
5. [Data Models](#data-models)
6. [Performance Optimization](#performance-optimization)
7. [Testing Framework](#testing-framework)
8. [Deployment Guide](#deployment-guide)
9. [Security Considerations](#security-considerations)

## Architecture Overview

The PitBox system implements a hybrid cloud architecture with four main components:

1. **Driver App**: Electron-based desktop application for Windows
2. **Relay Agent**: Python WebSocket server for data processing
3. **Cloud Backend**: DigitalOcean-hosted services for AI and storage
4. **Dashboard**: React web application for team monitoring

### System Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Driver App    │───▶│   Relay Agent   │───▶│ DigitalOcean    │
│   (Electron)    │    │   (Python)      │    │   Backend       │
│                 │    │                 │    │                 │
│ • iRacing SDK   │    │ • WebSocket     │    │ • AI Agent      │
│ • Video Capture │    │ • Video Encode  │    │ • Voice Service │
│ • Local STT     │    │ • Telemetry     │    │ • Data Storage  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                ▲
                                │
                       ┌─────────────────┐
                       │   Dashboard     │
                       │   (React)       │
                       │                 │
                       │ • Team Monitor  │
                       │ • WebSocket UI  │
                       │ • Multi-Driver  │
                       └─────────────────┘
```

### Data Flow

1. **Telemetry Collection**: Driver App collects data from iRacing SDK
2. **Local Processing**: Relay Agent processes and buffers data
3. **Cloud Transmission**: Processed data is sent to cloud backend
4. **AI Analysis**: Cloud services analyze data and generate coaching
5. **Dashboard Distribution**: Data is distributed to team dashboards
6. **Voice Synthesis**: Coaching feedback is converted to speech
7. **Voice Recognition**: Driver commands are processed locally

## Component Specifications

### Driver App

- **Framework**: Electron with TypeScript
- **UI**: React with Material-UI components
- **Key Dependencies**:
  - `electron-forge`: Application packaging
  - `node-irsdk`: iRacing SDK interface
  - `ws`: WebSocket client
  - `@tensorflow/tfjs`: Local voice processing
  - `node-audiorecorder`: Audio capture

#### Main Modules

- **IracingService**: Interfaces with iRacing SDK
- **WebSocketService**: Manages connection to Relay Agent
- **VideoService**: Captures and encodes video
- **VoiceService**: Handles STT and voice commands
- **AICoachService**: Processes AI coaching feedback
- **DataTransmissionService**: Manages data flow and fallbacks

### Relay Agent

- **Language**: Python 3.8+
- **Framework**: asyncio with websockets
- **Key Dependencies**:
  - `websockets`: WebSocket server
  - `numpy`: Data processing
  - `opencv-python`: Video processing
  - `aiohttp`: HTTP client for cloud communication
  - `cryptography`: Secure data handling

#### Main Modules

- **WebSocketServer**: Manages client connections
- **TelemetryProcessor**: Processes raw telemetry data
- **VideoEncoder**: Encodes video streams
- **CloudTransmitter**: Sends data to cloud backend
- **FallbackHandler**: Manages offline operation

### Cloud Backend

- **Platform**: DigitalOcean App Platform
- **Containers**: Docker with docker-compose
- **Services**:
  - **API Server**: Node.js with Express
  - **AI Service**: OpenAI integration
  - **Voice Service**: ElevenLabs TTS
  - **Database**: PostgreSQL
  - **Cache**: Redis
  - **Storage**: DigitalOcean Spaces (S3-compatible)

### Dashboard

- **Framework**: React with TypeScript
- **State Management**: Redux with Redux Toolkit
- **UI Components**: Custom components with styled-components
- **Key Dependencies**:
  - `react`: UI framework
  - `redux`: State management
  - `chart.js`: Data visualization
  - `ws`: WebSocket client
  - `lodash`: Utility functions

#### Main Modules

- **WebSocketService**: Manages WebSocket connections
- **MultiDriverService**: Handles team coordination
- **TelemetryDisplay**: Visualizes telemetry data
- **TrackMap**: Renders track position visualization
- **CompetitorAnalysis**: Analyzes competitor data
- **PerformanceMonitor**: Monitors dashboard performance

## API Reference

### Cloud Backend API

#### Authentication

```
POST /api/auth/login
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}

Response:
{
  "token": "string",
  "user": {
    "id": "string",
    "username": "string",
    "role": "string"
  }
}
```

#### Telemetry API

```
POST /api/telemetry
Authorization: Bearer {token}
Content-Type: application/json

{
  "driverId": "string",
  "timestamp": "string",
  "data": {
    // Telemetry data object
  }
}

Response:
{
  "success": true,
  "id": "string"
}
```

#### AI Coaching API

```
POST /api/coaching/analyze
Authorization: Bearer {token}
Content-Type: application/json

{
  "driverId": "string",
  "telemetryData": [...],
  "focusAreas": ["string"],
  "skillLevel": "string"
}

Response:
{
  "feedback": "string",
  "suggestions": ["string"],
  "analysis": {
    // Detailed analysis object
  }
}
```

#### Voice Synthesis API

```
POST /api/voice/synthesize
Authorization: Bearer {token}
Content-Type: application/json

{
  "text": "string",
  "voiceId": "string",
  "speed": number,
  "priority": "string"
}

Response:
{
  "audioUrl": "string",
  "duration": number
}
```

### Driver App API

#### Configuration API

```
GET /api/config
Response:
{
  "relayAgent": {
    "url": "string",
    "port": number
  },
  "cloud": {
    "endpoint": "string",
    "enabled": boolean
  },
  "voice": {
    "enabled": boolean,
    "sensitivity": number,
    "voiceId": "string"
  }
}
```

#### Local Telemetry API

```
GET /api/telemetry/current
Response:
{
  "speed": number,
  "rpm": number,
  "gear": number,
  "throttle": number,
  "brake": number,
  "steeringAngle": number,
  "lap": number,
  "position": number,
  "fuelLevel": number,
  "tireWear": {
    "frontLeft": number,
    "frontRight": number,
    "rearLeft": number,
    "rearRight": number
  }
}
```

## WebSocket Protocol

### Connection Establishment

1. Client connects to WebSocket server: `ws://localhost:8765`
2. Server sends welcome message:
   ```json
   {
     "type": "connection_established",
     "data": {
       "serverId": "string",
       "timestamp": "string",
       "version": "string"
     }
   }
   ```
3. Client sends authentication:
   ```json
   {
     "type": "authenticate",
     "data": {
       "token": "string",
       "clientType": "string",
       "version": "string"
     }
   }
   ```
4. Server confirms authentication:
   ```json
   {
     "type": "authentication_result",
     "data": {
       "success": true,
       "userId": "string",
       "role": "string"
     }
   }
   ```

### Message Types

#### Telemetry Data

```json
{
  "type": "telemetry_update",
  "data": {
    "driverId": "string",
    "timestamp": "string",
    "speed": number,
    "rpm": number,
    "gear": number,
    "throttle": number,
    "brake": number,
    "steeringAngle": number,
    "latitude": number,
    "longitude": number,
    "trackPosition": number,
    "lap": number,
    "sector": number,
    "fuelLevel": number,
    "tireWear": {
      "frontLeft": number,
      "frontRight": number,
      "rearLeft": number,
      "rearRight": number
    }
  }
}
```

#### Team Messages

```json
{
  "type": "team_message",
  "data": {
    "id": "string",
    "content": "string",
    "senderId": "string",
    "senderName": "string",
    "priority": "string",
    "sentAt": "string",
    "read": boolean,
    "attachment": {
      "type": "string",
      "url": "string",
      "name": "string"
    }
  }
}
```

#### Handoff Requests

```json
{
  "type": "handoff_request",
  "data": {
    "id": "string",
    "requesterId": "string",
    "requesterName": "string",
    "targetDriverId": "string",
    "targetDriverName": "string",
    "reason": "string",
    "urgency": "string",
    "requestedAt": "string",
    "status": "string",
    "telemetrySnapshot": {
      // Telemetry snapshot object
    }
  }
}
```

#### AI Coaching Messages

```json
{
  "type": "ai_coaching",
  "data": {
    "feedback": "string",
    "confidence": number,
    "telemetryAnalysis": {
      "strengths": ["string"],
      "weaknesses": ["string"],
      "improvementAreas": ["string"]
    },
    "timestamp": "string",
    "priority": "string"
  }
}
```

## Data Models

### Driver Profile

```typescript
interface DriverProfile {
  id: string;
  name: string;
  team: string;
  number: number;
  status: 'active' | 'inactive' | 'standby';
  role: 'primary' | 'secondary' | 'reserve';
  avatarUrl: string;
  telemetryConnected: boolean;
  lastActive: string; // ISO timestamp
}
```

### Telemetry Snapshot

```typescript
interface TelemetrySnapshot {
  timestamp: string; // ISO timestamp
  speed: number; // km/h
  rpm: number;
  gear: number; // -1 = reverse, 0 = neutral, 1+ = forward gears
  throttle: number; // 0-100%
  brake: number; // 0-100%
  steeringAngle: number; // degrees, negative = left
  latitude: number;
  longitude: number;
  trackPosition: number; // 0-1 representing % around track
  lap: number;
  sector: number;
  fuelLevel: number; // percentage
  tireWear: {
    frontLeft: number; // percentage
    frontRight: number;
    rearLeft: number;
    rearRight: number;
  };
}
```

### Team Message

```typescript
interface TeamMessage {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  sentAt: string; // ISO timestamp
  read: boolean;
  attachment: {
    type: 'document' | 'image' | 'telemetry';
    url: string;
    name: string;
  } | null;
}
```

### Handoff Request

```typescript
interface HandoffRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  targetDriverId: string;
  targetDriverName: string;
  reason: string;
  urgency: 'normal' | 'urgent';
  requestedAt: string; // ISO timestamp
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  telemetrySnapshot: TelemetrySnapshot;
}
```

### Validation Result

```typescript
interface ValidationResult {
  componentName: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  timestamp: string; // ISO timestamp
  details: {
    [key: string]: any;
  } | null;
}
```

## Performance Optimization

### Dashboard Optimizations

#### React Component Optimization

- **React.memo**: Used for pure components to prevent unnecessary re-renders
- **useMemo/useCallback**: Applied to expensive calculations and event handlers
- **Component Splitting**: Large components broken into smaller, focused components
- **Virtualized Lists**: Implemented for large data sets in competitor displays

#### Data Processing Optimization

- **Data Throttling**: WebSocketService implements throttled event dispatch
- **WebWorkers**: Heavy computations offloaded to background threads
- **Batch Updates**: Related state changes combined to minimize renders
- **Selective Updates**: Components only receive data they need

#### Rendering Efficiency

- **Canvas Rendering**: TrackMap uses canvas for efficient graphics
- **Key-Based Rendering**: Optimized list rendering with stable keys
- **Conditional Rendering**: Complex UI elements only rendered when needed
- **CSS Optimization**: Minimized style recalculations and layout shifts

#### Memory Management

- **Object Pooling**: Reuse objects for frequently created/destroyed items
- **Event Cleanup**: Proper cleanup of event listeners and subscriptions
- **Asset Management**: Optimized image loading/unloading
- **Memory Monitoring**: Implemented with PerformanceMonitor utility

### Relay Agent Optimizations

- **Async Processing**: Non-blocking I/O with asyncio
- **Buffer Management**: Efficient data buffering with numpy
- **Selective Transmission**: Only changed data transmitted
- **Compression**: Data compressed before transmission
- **Connection Pooling**: Reuse connections to cloud backend

### Driver App Optimizations

- **Native Modules**: Performance-critical code in native modules
- **Throttled Updates**: UI updates throttled to maintain responsiveness
- **Background Processing**: Heavy tasks run in background processes
- **Efficient SDK Integration**: Optimized iRacing SDK integration
- **Memory Management**: Careful management of video and audio buffers

## Testing Framework

### Testing Standards

The project follows comprehensive testing standards documented in `docs/testing_standards.md`, covering:

- Test file organization and structure
- Naming conventions
- Implementation patterns (AAA pattern)
- Mocking strategies
- Asynchronous testing
- Performance testing
- WebWorker testing
- Hybrid cloud testing
- Accessibility testing

### Mock Factories

Mock factories in `dashboard/src/test-utils/mock-factories.ts` provide consistent test data for:

- Driver profiles
- Telemetry data
- Team messages
- Handoff requests
- Validation results
- WebSocket events
- Redux state
- Performance metrics
- WebWorker messages
- Cloud API responses
- AI coaching responses
- Voice synthesis responses

### Test Types

#### Unit Tests

- Component rendering tests
- Service function tests
- Utility function tests
- State management tests

#### Integration Tests

- Component interaction tests
- Service integration tests
- WebSocket communication tests
- Redux integration tests

#### Performance Tests

- Component rendering performance
- Data processing performance
- Memory leak detection
- WebWorker efficiency

#### End-to-End Tests

- User flow validation
- Multi-driver scenarios
- Hybrid cloud validation

### Running Tests

```bash
# Dashboard Tests
cd dashboard
npm test                   # Run all tests
npm run test:unit          # Run unit tests
npm run test:integration   # Run integration tests
npm run test:performance   # Run performance tests
npm run test:e2e           # Run end-to-end tests

# Driver App Tests
cd driver_app
npm test                   # Run all tests
npm run test:video         # Test video capture
npm run test:websocket     # Test WebSocket client

# Relay Agent Tests
cd relay_agent
python -m pytest           # Run all tests
python -m pytest tests/test_websocket_server.py  # Test WebSocket server
```

## Deployment Guide

### Local Development Deployment

1. **Clone Repository**:
   ```bash
   git clone https://github.com/SingSongScreamAlong/pitboxdriverapp.git
   cd pitboxdriverapp
   ```

2. **Start Relay Agent**:
   ```bash
   cd relay_agent
   python -m venv relay_agent_venv
   source relay_agent_venv/bin/activate  # Windows: relay_agent_venv\Scripts\activate
   pip install -r requirements.txt
   python agent_main.py
   ```

3. **Start Dashboard**:
   ```bash
   cd dashboard
   npm install
   npm start
   ```

4. **Start Driver App**:
   ```bash
   cd driver_app
   npm install
   npm start
   ```

### DigitalOcean Deployment

#### Prerequisites

- DigitalOcean account
- doctl CLI installed and authenticated
- Docker and docker-compose installed

#### Deployment Steps

1. **Configure API Keys**:
   Edit `deployment/digitalocean/config.env`:
   ```
   OPENAI_API_KEY=your_openai_key
   ELEVENLABS_API_KEY=your_elevenlabs_key
   ```

2. **Deploy to DigitalOcean**:
   ```bash
   cd deployment/digitalocean
   ./deploy-dashboard-solution.sh
   ```

3. **Verify Deployment**:
   ```bash
   doctl apps list
   ```

4. **Configure DNS**:
   Add a CNAME record pointing to your DigitalOcean app URL.

#### Alternative Deployment with Droplet

If experiencing issues with App Platform:

1. **Create Droplet**:
   ```bash
   doctl compute droplet create pitbox-server \
     --image docker-20-04 \
     --size s-2vcpu-4gb \
     --region nyc1 \
     --ssh-keys your-ssh-key-id
   ```

2. **SSH to Droplet**:
   ```bash
   doctl compute ssh pitbox-server
   ```

3. **Clone Repository**:
   ```bash
   git clone https://github.com/SingSongScreamAlong/pitboxdriverapp.git
   cd pitboxdriverapp
   ```

4. **Deploy with Docker Compose**:
   ```bash
   cd deployment/digitalocean
   cp config.env.example config.env
   # Edit config.env with your API keys
   docker-compose up -d
   ```

### CI/CD Pipeline

The project uses GitHub Actions for continuous integration and deployment:

- `.github/workflows/build.yml`: Builds and tests the application
- `.github/workflows/deploy.yml`: Deploys to DigitalOcean on merge to main

## Security Considerations

### API Key Management

- API keys are stored encrypted at rest
- Keys are never exposed in client-side code
- Environment variables used in production
- Separate development and production keys

### Data Transmission

- All WebSocket connections use WSS (WebSocket Secure)
- HTTP connections use HTTPS
- Data is encrypted in transit
- Sensitive data is never cached on disk

### Authentication

- JWT-based authentication
- Tokens expire after 24 hours
- Refresh token rotation
- Role-based access control

### Cloud Security

- DigitalOcean App Platform security features
- Regular security updates
- Firewall rules limiting access
- Database encryption at rest

### Local Security

- Local files encrypted when possible
- API keys stored in secure storage
- Automatic session timeouts
- No sensitive data in logs
