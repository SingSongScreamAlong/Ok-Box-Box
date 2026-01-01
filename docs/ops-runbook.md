# Operations Runbook

## Overview

This runbook covers common failure modes and triage procedures for Ok, Box Box operations. Use the `/admin/ops` dashboard and `/api/ops/*` endpoints for investigation.

---

## Quick Reference

| Endpoint | Purpose |
|----------|---------|
| `GET /api/ops/summary` | System overview, ingest rates, error counts |
| `GET /api/ops/sockets` | Active socket connections |
| `GET /api/ops/sessions` | Session stats, frame counts |
| `GET /api/ops/events?type=error` | Recent error events |
| `POST /api/ops/trace/start` | Start trace for a session |
| `POST /api/ops/support-pack` | Generate diagnostics bundle |

---

## Failure Modes

### 1. Relay Not Connecting

**Symptoms:**
- No sessions in `/api/ops/sessions`
- Ingest rate = 0 in summary
- `relay:connected` events missing

**Checks:**
```bash
# Check relay events
GET /api/ops/events?type=relay&limit=50

# Look for connection errors or drift warnings
```

**Likely Causes:**
- Relay agent not running
- Network connectivity issues
- Kill switch enabled (`RELAY_KILL_SWITCH=1`)
- Wrong backend URL configured

**Fixes:**
1. Verify relay agent is running: `ps aux | grep relay`
2. Check relay config: `RELAY_BACKENDS` env var
3. Check kill switch: `RELAY_KILL_SWITCH` should be `0`
4. Review relay logs for connection errors

---

### 2. Frames Coming In But Dashboard Stale

**Symptoms:**
- Ingest rate > 0 in summary
- Session frame counts increasing
- Dashboard not updating

**Checks:**
```bash
# Check socket connections
GET /api/ops/sockets

# Look for dashboard role sockets
# Check if joined to correct session room
```

**Likely Causes:**
- Dashboard not subscribed to correct session
- WebSocket disconnected
- Broadcast delay configured (expected behavior)

**Fixes:**
1. Check socket list for `role: dashboard`
2. Verify `joinedRooms` includes session
3. If broadcast delay is set, data is buffered (check delay state)
4. Refresh dashboard and re-subscribe

---

### 3. High Clock Drift

**Symptoms:**
- `drift_warn` events in relay events
- `driftP95` > 5000ms in session stats
- Timing data appears out of sync

**Checks:**
```bash
# Check relay events for drift warnings
GET /api/ops/events?type=relay

# Check session-specific drift
GET /api/ops/sessions
```

**Likely Causes:**
- Relay machine clock out of sync
- High latency between relay and server
- Processing backlog

**Fixes:**
1. Sync relay machine time: `ntpdate pool.ntp.org`
2. Check network latency to server
3. Review relay queue depth (local debug endpoint)
4. Reduce sample rate if server overloaded

---

### 4. Burst Subscriptions Stuck

**Symptoms:**
- High socket count without corresponding sessions
- `join` events without matching `leave` events
- Memory usage growing

**Checks:**
```bash
# Check event patterns
GET /api/ops/events?type=socket&limit=200

# Compare joins vs leaves
```

**Likely Causes:**
- Clients not cleanly disconnecting
- Subscription cleanup not firing
- Socket.IO room leaks

**Fixes:**
1. Restart server to clear socket state
2. Check for disconnect handler issues
3. Review client-side cleanup code

---

### 5. Broadcast Delay Not Working

**Symptoms:**
- Director set delay but overlays receive real-time data
- `broadcast:delay:set` events not visible
- Overlay joins wrong room

**Checks:**
```bash
# Check if sockets are in broadcast room
GET /api/ops/sockets

# Look for broadcast:session:* rooms
```

**Likely Causes:**
- Overlay joining `session:*` instead of `broadcast:session:*`
- Delay service not initialized
- Director capability missing

**Fixes:**
1. Verify overlay URL uses broadcast mode
2. Check BroadcastDelayService initialization
3. Confirm director has `racebox:director:control` capability

---

### 6. DB Latency Spikes

**Symptoms:**
- Slow API responses
- `db_error` events in error buffer
- High `db_query_ms_p95` in metrics

**Checks:**
```bash
# Check error events
GET /api/ops/events?type=error

# Look for DB-related errors
```

**Likely Causes:**
- Connection pool exhausted
- Slow queries / missing indexes
- Database server overload

**Fixes:**
1. Check database connection count
2. Review slow query logs
3. Add indexes for frequent queries
4. Increase connection pool size

---

## Support Pack Guide

### Generating a Support Pack

**Via Dashboard:**
1. Go to `/admin/ops`
2. Click "Export Support Pack" button
3. Optionally select a session first

**Via API:**
```bash
curl -X POST /api/ops/support-pack \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "sess_xxx", "includeConfig": true}'
```

### What's Included

- System summary (uptime, versions)
- Recent events (socket, relay, session, error)
- Session stats (if sessionId provided)
- Parity metrics (if available)
- Redacted config
- Active trace (if traceId provided)

### What's Redacted

- JWT tokens and secrets
- API keys
- User IDs (truncated)
- Session IDs (truncated)
- Email addresses

---

## Trace Mode

### Starting a Trace

```bash
POST /api/ops/trace/start
{
  "sessionId": "sess_xxx",
  "durationSec": 30
}
```

### Fetching Trace Results

```bash
GET /api/ops/trace/{traceId}
```

Trace includes:
- Events captured during trace window
- Counters and summaries
- Notable anomalies

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `OPS_UI_ENABLED=1` | Enable ops endpoints and UI |
| `METRICS_ENABLED=true` | Enable Prometheus metrics |
| `DIAGNOSTICS_ENABLED=true` | Enable diagnostics endpoints |
| `LOG_LEVEL=debug` | Increase log verbosity |
