# Parallel Operation + Kill Switch + Parity Metrics

## Overview

The parallel operation feature enables safe blue/green cutovers and redundancy by allowing the Relay Agent to fan-out telemetry to multiple gateway targets simultaneously. It includes:

- **Multi-target fan-out**: Send to N gateways in parallel
- **Kill switch**: Instantly disable all backend connections
- **Parity metrics**: Verify frame counts match across gateways
- **Graceful degradation**: If target B fails, target A continues

## Configuration

### Relay Agent Environment Variables

```bash
# Comma-separated backend URLs
RELAY_BACKENDS="wss://gateway-a.example.com/relay,wss://gateway-b.example.com/relay"

# Mode: 'single' (default) or 'parallel'
RELAY_BACKEND_MODE="parallel"

# Primary target index for single mode (0-indexed)
RELAY_PRIMARY_INDEX="0"

# Connection timeout per target (ms)
RELAY_TARGET_TIMEOUT_MS="1500"

# Send timeout per frame (ms)
RELAY_SEND_TIMEOUT_MS="250"

# Kill switch: '1' = disable ALL backends (local-only mode)
RELAY_KILL_SWITCH="0"

# Per-target enabled flags (comma-separated)
# "1,1" = both enabled, "1,0" = only first enabled
RELAY_TARGETS_ENABLED="1,1"

# Parity sample rate: fraction of frames that request ack
RELAY_PARITY_SAMPLE_RATE="0.05"

# Debug server port (127.0.0.1 only)
RELAY_DEBUG_PORT="8765"
```

### Server Environment Variables

```bash
# Enable diagnostics endpoints
DIAGNOSTICS_ENABLED="true"

# Enable metrics endpoint
METRICS_ENABLED="true"
```

## Architecture

```
┌─────────────────┐
│   iRacing       │
│   Telemetry     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Relay Agent    │
│  BackendManager │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│Gateway│ │Gateway│
│   A   │ │   B   │
└───────┘ └───────┘
```

## Cutover Playbook (Blue/Green)

### Scenario: Migrate from Gateway A to Gateway B

1. **Prepare Gateway B**
   ```bash
   # Deploy and verify B is healthy
   curl https://gateway-b.example.com/api/health
   ```

2. **Enable Parallel Mode**
   ```bash
   # On relay agent
   export RELAY_BACKENDS="wss://gateway-a/relay,wss://gateway-b/relay"
   export RELAY_BACKEND_MODE="parallel"
   ```

3. **Verify Parity (2 minutes)**
   ```bash
   # Check relay debug endpoint
   curl http://127.0.0.1:8765/debug/parity
   
   # Compare frame counts - should be within 1%
   ```

4. **Switch Primary to B**
   ```bash
   export RELAY_PRIMARY_INDEX="1"
   export RELAY_BACKEND_MODE="single"
   ```

5. **Disable Gateway A**
   ```bash
   export RELAY_TARGETS_ENABLED="0,1"
   ```

6. **Decommission Gateway A**
   ```bash
   export RELAY_BACKENDS="wss://gateway-b/relay"
   ```

## Rollback Playbook

### Quick Rollback (Switch Primary)

```bash
# Swap back to original primary
export RELAY_PRIMARY_INDEX="0"
```

### Emergency Kill Switch

```bash
# Disable ALL backend connections immediately
export RELAY_KILL_SWITCH="1"

# Relay will continue local-only operations
# No telemetry sent to any gateway
```

### Re-enable After Kill Switch

```bash
export RELAY_KILL_SWITCH="0"
# Connections will automatically resume
```

## Debug Endpoints (Relay Agent)

### GET /debug/targets

```json
{
  "targets": [
    {
      "url": "wss://gateway-a/relay",
      "enabled": true,
      "state": "connected",
      "counters": {
        "sent": 12450,
        "failed": 3,
        "acked": 623,
        "dropped": 0
      },
      "queueSize": 2,
      "lastSendOkMs": 1735635285000,
      "lastAckLatencyMs": 45.2,
      "lastError": null
    }
  ],
  "mode": "parallel",
  "primaryIndex": 0,
  "killSwitch": false
}
```

### GET /debug/parity

```json
{
  "totalSent": 24900,
  "totalAcked": 1246,
  "totalFailed": 6,
  "totalDropped": 0,
  "ackLatency": {
    "p50": 42.5,
    "p95": 78.3,
    "samples": 100
  },
  "perTarget": [
    { "url": "wss://gateway-a/relay", "sent": 12450, "acked": 623 },
    { "url": "wss://gateway-b/relay", "sent": 12450, "acked": 623 }
  ]
}
```

### GET /debug/health

```json
{
  "status": "healthy",
  "killSwitch": false,
  "mode": "parallel",
  "version": "1.0.0"
}
```

## Server Endpoints

### GET /api/dev/diagnostics/build

```json
{
  "gitSha": "abc1234",
  "buildTime": "2024-12-31T08:00:00Z",
  "version": "0.1.0-alpha",
  "environment": "development"
}
```

### GET /api/dev/diagnostics/parity?sessionId=...

```json
{
  "sessionId": "sess_abc123",
  "streams": {
    "baseline": { "framesIn": 1000, "acked": 50, "lastFrameTs": 1735635285000 },
    "controls": { "framesIn": 2500, "acked": 125, "lastFrameTs": 1735635285050 }
  },
  "duplicates": 0,
  "outOfOrder": 0,
  "lastError": null
}
```

## Expected Metrics

| Metric | Healthy | Warning | Critical |
|--------|---------|---------|----------|
| Frame drop rate | < 0.1% | < 1% | > 1% |
| Ack latency p95 | < 100ms | < 500ms | > 500ms |
| Target drift | < 1% | < 5% | > 5% |
| Queue size | < 100 | < 300 | > 300 |

## Troubleshooting

### "Kill Switch Active" in debug/health
Relay is in local-only mode. Set `RELAY_KILL_SWITCH=0` to re-enable backends.

### High queue size on one target
That target may be slow or unhealthy. Check target health and network latency.

### Frame drift between targets > 5%
One target is dropping frames. Check:
- Target connection status
- Network saturation
- Target server health

### No acks received
Verify `RELAY_PARITY_SAMPLE_RATE` > 0 and server has `DIAGNOSTICS_ENABLED=true`.
