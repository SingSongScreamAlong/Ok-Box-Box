# Support Pack Format

## Overview

A support pack is a JSON bundle containing diagnostic information for troubleshooting. All sensitive data is redacted before inclusion.

## Top-Level Structure

```json
{
  "packId": "pack-1735654800000-abc123",
  "generatedAt": 1735654800000,
  "generatedAtIso": "2024-12-31T12:00:00.000Z",
  
  "summary": { ... },
  "socketStats": { ... },
  "relayStats": { ... },
  "runtimeStats": { ... },
  "eventBufferStats": { ... },
  "recentEvents": { ... },
  "supportBundle": { ... },
  
  "sessionParity": { ... },     // If sessionId provided
  "sessionEvents": { ... },     // If sessionId provided
  "trace": { ... },             // If traceId provided
  "config": { ... }             // If includeConfig=true
}
```

## Field Descriptions

### summary

```json
{
  "environment": "development",
  "uptime": 86400000,
  "activeSessions": 3,
  "activeConnections": 42
}
```

### socketStats

```json
{
  "totalConnections": 42,
  "activeConnections": 42,
  "totalConnects": 150,
  "totalDisconnects": 108,
  "totalAuthFails": 2,
  "totalJoins": 340,
  "totalLeaves": 298,
  "byRole": {
    "driver": 10,
    "dashboard": 25,
    "overlay": 7
  },
  "bySurface": {
    "racebox": 20,
    "dashboard": 22
  }
}
```

### relayStats

```json
{
  "totalFrames": 125000,
  "totalDrops": 5,
  "totalDriftWarnings": 2,
  "activeSessions": 3,
  "ingestRate": 45.2
}
```

### runtimeStats

```json
{
  "memory": {
    "heapUsed": "125MB",
    "heapTotal": "256MB",
    "external": "10MB"
  },
  "cpu": {
    "user": 15000,
    "system": 5000
  }
}
```

### eventBufferStats

```json
{
  "socket": { "count": 450, "evicted": 50 },
  "relay": { "count": 500, "evicted": 100 },
  "session": { "count": 200, "evicted": 0 },
  "error": { "count": 15, "evicted": 0 }
}
```

### recentEvents

```json
{
  "socket": [
    {
      "id": "rb-123",
      "timestamp": 1735654800000,
      "type": "connect",
      "socketId": "abcd...wxyz",
      "role": "dashboard",
      "surface": "racebox"
    }
  ],
  "relay": [...],
  "session": [...],
  "error": [...]
}
```

### sessionParity (if sessionId provided)

```json
{
  "sessionId": "sess...1234",
  "streams": {
    "baseline": { "framesIn": 5000, "acked": 250 },
    "controls": { "framesIn": 12000, "acked": 600 }
  },
  "duplicates": 0,
  "outOfOrder": 3,
  "lastError": null
}
```

### trace (if traceId provided)

```json
{
  "traceId": "trace-1735654800000-abc123",
  "sessionId": "sess...1234",
  "startedAt": 1735654770000,
  "samples": []
}
```

### config (if includeConfig=true)

```json
{
  "nodeEnv": "development",
  "port": 3001,
  "logLevel": "debug",
  "metricsEnabled": true,
  "diagnosticsEnabled": true,
  "opsUiEnabled": true
}
```

**Note:** Sensitive fields (JWT secret, database URL, API keys) are NOT included.

## Redaction Rules

| Field | Redaction |
|-------|-----------|
| socketId | Keep first 4 + last 4 chars |
| sessionId | Keep first 4 + last 4 chars |
| userId | Keep last 6 chars only |
| room names | Redact session portion |
| tokens | Completely removed |
| API keys | Completely removed |
| passwords | Completely removed |
| email | Completely removed |

## Usage

### Generating via API

```bash
curl -X POST /api/ops/support-pack \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "sess_abc123def456",
    "traceId": "trace-123",
    "includeConfig": true
  }'
```

### Generating via Dashboard

1. Navigate to `/admin/ops`
2. Click "📦 Export Support Pack" button
3. JSON file downloads automatically

### Attaching to Support Requests

1. Generate support pack
2. Verify no secrets visible (search for "token", "key", "secret")
3. Attach to support ticket or share via secure channel
