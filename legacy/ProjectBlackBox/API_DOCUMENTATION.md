# PitBox API Documentation

## Overview

The PitBox API provides comprehensive telemetry data collection, analysis, and management for racing applications. It supports multi-driver sessions, AI-powered coaching, voice synthesis, and real-time data streaming.

## Authentication

All API endpoints (except health check and authentication routes) require JWT authentication.

### Headers
```
Authorization: Bearer <jwt_token>
```

### Authentication Endpoints

#### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  },
  "token": "jwt_token"
}
```

#### POST /auth/login
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  },
  "token": "jwt_token"
}
```

#### GET /auth/profile
Get current user profile information.

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

#### POST /auth/refresh
Refresh JWT token.

**Response:**
```json
{
  "message": "Token refreshed successfully",
  "token": "new_jwt_token"
}
```

## Sessions

### GET /sessions
List all sessions for the authenticated user.

**Query Parameters:**
- `limit` (optional): Maximum number of sessions to return (default: 50)
- `offset` (optional): Number of sessions to skip (default: 0)

**Response:**
```json
{
  "sessions": [
    {
      "id": "session_uuid",
      "name": "Test Session",
      "track": "Monza",
      "createdAt": 1640995200000,
      "driverCount": 2
    }
  ]
}
```

### POST /sessions
Create a new telemetry session.

**Request Body:**
```json
{
  "name": "Race Session",
  "track": "Silverstone"
}
```

**Response:**
```json
{
  "id": "session_uuid",
  "name": "Race Session",
  "track": "Silverstone",
  "createdAt": 1640995200000
}
```

### POST /sessions/:sessionId/telemetry
Append telemetry data to a session.

**Request Body:** Single telemetry object or array of telemetry objects
```json
{
  "driverId": "driver_1",
  "timestamp": 1640995200000,
  "speed": 250.5,
  "rpm": 8500,
  "gear": 6,
  "throttle": 0.9,
  "brake": 0.0,
  "position": { "x": 100.5, "y": 200.3, "z": 10.0 },
  "tires": {
    "frontLeft": { "temp": 85.2, "wear": 0.15, "pressure": 2.8 },
    "frontRight": { "temp": 86.1, "wear": 0.12, "pressure": 2.9 },
    "rearLeft": { "temp": 92.3, "wear": 0.08, "pressure": 2.7 },
    "rearRight": { "temp": 91.8, "wear": 0.10, "pressure": 2.8 }
  },
  "lap": 5,
  "sector": 2,
  "gForce": { "lateral": 1.2, "longitudinal": 0.3, "vertical": 1.1 },
  "trackPosition": 0.75,
  "racePosition": 3,
  "gapAhead": 2.5,
  "gapBehind": 1.8
}
```

**Response:**
```json
{
  "appended": 1
}
```

### GET /sessions/:sessionId/telemetry
Retrieve telemetry data from a session.

**Query Parameters:**
- `fromTs` (optional): Start timestamp (milliseconds)
- `toTs` (optional): End timestamp (milliseconds)
- `driverId` (optional): Filter by driver ID

**Response:**
```json
{
  "count": 100,
  "data": [
    {
      "driverId": "driver_1",
      "timestamp": 1640995200000,
      "speed": 250.5,
      "rpm": 8500,
      "gear": 6,
      "throttle": 0.9,
      "brake": 0.0,
      "position": { "x": 100.5, "y": 200.3, "z": 10.0 },
      "tires": {
        "frontLeft": { "temp": 85.2, "wear": 0.15, "pressure": 2.8 },
        "frontRight": { "temp": 86.1, "wear": 0.12, "pressure": 2.9 },
        "rearLeft": { "temp": 92.3, "wear": 0.08, "pressure": 2.7 },
        "rearRight": { "temp": 91.8, "wear": 0.10, "pressure": 2.8 }
      },
      "lap": 5,
      "sector": 2,
      "gForce": { "lateral": 1.2, "longitudinal": 0.3, "vertical": 1.1 },
      "trackPosition": 0.75,
      "racePosition": 3,
      "gapAhead": 2.5,
      "gapBehind": 1.8
    }
  ]
}
```

## Multi-Driver Sessions

### POST /multi-driver/sessions
Create a new multi-driver session.

**Request Body:**
```json
{
  "name": "Endurance Race",
  "track": "Le Mans",
  "driverIds": ["user_uuid_1", "user_uuid_2", "user_uuid_3"]
}
```

**Response:**
```json
{
  "sessionId": "md_1640995200000_abc123",
  "message": "Multi-driver session created successfully"
}
```

### GET /multi-driver/sessions
List multi-driver sessions for the authenticated user.

**Response:**
```json
{
  "sessions": [
    {
      "id": "md_1640995200000_abc123",
      "name": "Endurance Race",
      "track": "Le Mans",
      "status": "active",
      "createdAt": 1640995200000,
      "driverCount": 3,
      "driverNames": "John Doe, Jane Smith, Bob Wilson"
    }
  ]
}
```

### GET /multi-driver/sessions/:sessionId
Get detailed information about a multi-driver session.

**Response:**
```json
{
  "session": {
    "id": "md_1640995200000_abc123",
    "name": "Endurance Race",
    "track": "Le Mans",
    "status": "active",
    "createdAt": 1640995200000,
    "createdBy": {
      "id": "user_uuid",
      "name": "Race Director"
    },
    "drivers": [
      {
        "id": "user_uuid_1",
        "name": "John Doe",
        "role": "driver",
        "status": "active",
        "joinedAt": 1640995200000,
        "lastActivity": 1640995260000,
        "telemetryCount": 1500
      }
    ],
    "currentDriverId": "user_uuid_1"
  }
}
```

### POST /multi-driver/sessions/:sessionId/switch
Switch active driver in a multi-driver session.

**Request Body:**
```json
{
  "newDriverId": "user_uuid_2",
  "reason": "Scheduled driver change"
}
```

**Response:**
```json
{
  "message": "Driver switched successfully",
  "newDriverId": "user_uuid_2"
}
```

### PATCH /multi-driver/sessions/:sessionId/drivers/:driverId
Update driver status in a multi-driver session.

**Request Body:**
```json
{
  "status": "standby"
}
```

**Response:**
```json
{
  "message": "Driver status updated successfully"
}
```

## AI Services

### POST /ai/coaching/analyze
Request AI-powered telemetry analysis.

**Request Body:**
```json
{
  "sessionId": "session_uuid",
  "driverId": "driver_uuid",
  "telemetryData": [
    {
      "timestamp": 1640995200000,
      "speed": 250.5,
      "rpm": 8500,
      "lap": 5
    }
  ],
  "sessionInfo": {
    "track": "Silverstone",
    "sessionId": "session_uuid"
  },
  "driverInfo": {
    "id": "driver_uuid",
    "name": "Lewis Hamilton"
  }
}
```

**Response:**
```json
{
  "sessionId": "session_uuid",
  "driverId": "driver_uuid",
  "timestamp": 1640995260000,
  "analysis": {
    "performance": "Strong performance with consistent lap times",
    "recommendations": [
      "Consider adjusting brake bias for better corner entry",
      "Fuel mixture optimization could improve consistency"
    ],
    "riskLevel": "low",
    "keyInsights": [
      "Tire degradation is within optimal range",
      "Fuel efficiency is above average"
    ]
  }
}
```

### POST /ai/voice/coaching
Generate voice coaching message.

**Request Body:**
```json
{
  "text": "Great lap! Keep pushing in sector 2.",
  "voiceId": "custom_voice_id",
  "urgency": "medium"
}
```

**Response:**
```json
{
  "audioData": "base64_encoded_audio",
  "duration": 2500,
  "format": "mp3",
  "voiceId": "custom_voice_id"
}
```

## Health and Monitoring

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "time": 1640995200000,
  "db": "up",
  "version": "1.0.0"
}
```

## Error Responses

All error responses follow this format:

```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "stack": "Error stack trace (development only)"
  }
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `429` - Too Many Requests
- `500` - Internal Server Error
- `502` - External Service Error

## Rate Limiting

API endpoints are rate limited to prevent abuse:
- 100 requests per 15 minutes for authenticated users
- Separate limits for different endpoint types
- Burst limits for high-frequency telemetry data

## WebSocket Integration

Real-time telemetry updates are available via WebSocket:

```javascript
const socket = io('ws://localhost:4000');

socket.emit('join_session', 'session_uuid');

socket.on('telemetry_update', (data) => {
  console.log('New telemetry:', data);
});
```

## Data Formats

### Telemetry Data Structure
All telemetry data follows a standardized format with consistent field naming and units.

### Multi-Driver Session States
- `active` - Session is currently running
- `paused` - Session is temporarily paused
- `completed` - Session has finished

### Driver Roles
- `driver` - Currently driving
- `co-driver` - Available for driving
- `reserve` - Backup driver

### Driver Status
- `active` - Currently driving
- `standby` - Ready to drive
- `offline` - Not available

## Security Considerations

- All API calls require JWT authentication
- Tokens expire after 24 hours
- Sensitive data is encrypted in transit
- Rate limiting prevents abuse
- Input validation prevents injection attacks
- CORS policies restrict cross-origin requests

## Versioning

API versioning is handled through URL paths:
- Current version: v1 (implied in base paths)
- Future versions will use explicit versioning: `/v2/sessions`

## Support

For API support or questions:
- Check the error messages for specific error codes
- Review the logs for detailed error information
- Contact the development team for assistance
