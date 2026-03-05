# Monitoring & Alerting Runbook

## Overview

Ok, Box Box uses a multi-layered monitoring approach:

| Layer | Tool | Purpose |
|-------|------|---------|
| Error Tracking | Sentry | Exceptions, crashes, performance |
| Metrics | Prometheus | Counters, gauges, histograms |
| Health Checks | Express endpoints | Liveness/readiness probes |
| Logs | Console + structured | Debug and audit trail |

---

## 1. Sentry Configuration

### Backend (packages/server)
```typescript
// Initialized in src/index.ts
Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: config.nodeEnv,
    tracesSampleRate: 0.1, // 10% in production
});
```

### Frontend (apps/app)
```typescript
// Initialized in src/main.tsx
Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration(),
    ],
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0, // 100% replay on errors
});
```

### Environment Variables
```bash
# Server
SENTRY_DSN=https://xxx@sentry.io/xxx

# Frontend (Vite)
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
```

---

## 2. Health Check Endpoints

### `/health` - Full Health Check
Returns overall system health with component status.

```bash
curl https://api.okboxbox.com/health
```

Response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "0.1.0-alpha",
    "uptime": 12345.67,
    "checks": {
      "database": "ok",
      "redis": "ok",
      "ai": "ok"
    },
    "timestamp": "2026-03-05T12:00:00.000Z"
  }
}
```

### `/health/ready` - Readiness Probe
For Kubernetes/container orchestration. Returns 200 if ready, 503 if not.

```bash
curl https://api.okboxbox.com/health/ready
```

### `/health/telemetry` - Active Sessions
Shows current relay connections and active sessions.

```bash
curl https://api.okboxbox.com/health/telemetry
```

Response:
```json
{
  "activeSessions": 2,
  "sessions": [
    {
      "sessionId": "live_12345",
      "trackName": "Daytona International Speedway",
      "sessionType": "race",
      "driverCount": 24,
      "lastUpdate": 1709650800000,
      "ageMs": 150
    }
  ]
}
```

---

## 3. Prometheus Metrics

### Enable Metrics
```bash
METRICS_ENABLED=true
```

### Endpoint
```bash
curl https://api.okboxbox.com/metrics
```

### Key Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `controlbox_relay_connections_total` | Counter | Total relay connections |
| `controlbox_relay_disconnects_total` | Counter | Total relay disconnections |
| `controlbox_websocket_clients_connected` | Gauge | Current WebSocket clients |
| `controlbox_telemetry_frames_in_total` | Counter | Telemetry frames received |
| `controlbox_telemetry_frames_out_total` | Counter | Telemetry events emitted |
| `controlbox_telemetry_drop_total` | Counter | Dropped frames (by reason) |
| `controlbox_timing_updates_total` | Counter | Timing updates broadcast |
| `controlbox_incident_events_total` | Counter | Incident events |
| `controlbox_db_write_latency_ms` | Histogram | Database write latency |
| `controlbox_ws_emit_latency_ms` | Histogram | WebSocket emit latency |

### Grafana Dashboard Queries

**Active Relay Connections:**
```promql
controlbox_websocket_clients_connected{role="relay"}
```

**Telemetry Throughput (frames/sec):**
```promql
rate(controlbox_telemetry_frames_in_total[1m])
```

**P95 Database Latency:**
```promql
histogram_quantile(0.95, rate(controlbox_db_write_latency_ms_bucket[5m]))
```

**Error Rate:**
```promql
rate(controlbox_telemetry_drop_total[5m])
```

---

## 4. Alerting Rules

### Critical Alerts (PagerDuty)

| Alert | Condition | Action |
|-------|-----------|--------|
| API Down | `/health/ready` returns 503 for 2m | Page on-call |
| Database Down | `checks.database != "ok"` for 1m | Page on-call |
| High Error Rate | Error rate > 5% for 5m | Page on-call |

### Warning Alerts (Slack)

| Alert | Condition | Action |
|-------|-----------|--------|
| High Latency | P95 > 500ms for 5m | Slack #alerts |
| No Relays | `websocket_clients_connected{role="relay"} == 0` for 10m | Slack #alerts |
| Memory High | Node memory > 80% for 10m | Slack #alerts |

### Example Alertmanager Config
```yaml
groups:
  - name: controlbox
    rules:
      - alert: APIDown
        expr: up{job="controlbox-api"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "ControlBox API is down"
          
      - alert: HighErrorRate
        expr: rate(controlbox_telemetry_drop_total[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High telemetry drop rate"
```

---

## 5. Uptime Monitoring

### Recommended: UptimeRobot or Better Uptime

**Endpoints to Monitor:**
- `https://api.okboxbox.com/health` - API health
- `https://okboxbox.com` - Frontend
- `wss://api.okboxbox.com/socket.io/` - WebSocket

**Check Interval:** 1 minute
**Alert Channels:** Email, Slack, PagerDuty

---

## 6. Log Analysis

### Structured Logging
Server uses structured JSON logging via `wsLogger`:

```typescript
wsLogger.info({ sessionId, event: 'telemetry' }, 'Telemetry received');
wsLogger.error({ error, sessionId }, 'Failed to process telemetry');
```

### Key Log Events
- `SESSION INFO:` - New session started
- `SESSION END:` - Session ended
- `FIRST TELEMETRY:` - First telemetry packet (debug)
- `RACE EVENT:` - Flag changes, safety car

### DigitalOcean Logs
```bash
doctl apps logs <app-id> --follow
```

---

## 7. Incident Response

### Severity Levels

| Level | Description | Response Time | Example |
|-------|-------------|---------------|---------|
| P1 | Service down | 15 min | API unreachable |
| P2 | Major degradation | 1 hour | High latency, partial outage |
| P3 | Minor issue | 4 hours | Single feature broken |
| P4 | Low priority | Next business day | UI bug |

### Escalation Path
1. On-call engineer (PagerDuty)
2. Lead developer
3. CTO

### Rollback Procedure
```bash
# DigitalOcean App Platform
doctl apps create-deployment <app-id> --force-rebuild=false

# Or revert to previous commit
git revert HEAD
git push origin main
```

---

## 8. Dashboard URLs

| Dashboard | URL | Purpose |
|-----------|-----|---------|
| Sentry | https://sentry.io/organizations/okboxbox | Errors & performance |
| Grafana | https://grafana.okboxbox.com | Metrics dashboards |
| DigitalOcean | https://cloud.digitalocean.com | Infrastructure |
| UptimeRobot | https://uptimerobot.com | Uptime monitoring |

---

## 9. Quick Diagnostic Commands

```bash
# Check API health
curl -s https://api.okboxbox.com/health | jq

# Check active sessions
curl -s https://api.okboxbox.com/health/telemetry | jq

# Check metrics (if enabled)
curl -s https://api.okboxbox.com/metrics | head -50

# Tail logs
doctl apps logs <app-id> --follow --type=run

# Check deployment status
doctl apps get <app-id> --format ID,DefaultIngress,ActiveDeployment.Phase
```
