# Dev Diagnostics Suite

## Overview

The Dev Diagnostics Suite provides DEV-only monitoring, debugging, and support tools for the Ok, Box Box platform. This is **not** for end users—it's for the development team to quickly diagnose issues and generate support bundles.

## Enabling Diagnostics

### Server Environment Variables

```bash
# Enable Prometheus metrics at /metrics
METRICS_ENABLED=true

# Enable diagnostics API at /api/dev/diagnostics/*
DIAGNOSTICS_ENABLED=true
```

### Required Capabilities

The diagnostics endpoints require authentication + one of:
- `admin:diagnostics` capability
- `session_authority` capability
- Super admin status

## Endpoints Reference

### Metrics Endpoint

| Endpoint | Auth Required | Description |
|----------|---------------|-------------|
| `GET /metrics` | No auth (gated by env) | Prometheus-format metrics |

### Diagnostics API

All endpoints under `/api/dev/diagnostics/` require auth + capability.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health/relay` | GET | Relay connection status, socket IDs, rooms |
| `/sessions/active` | GET | Active sessions with driver counts, timestamps |
| `/session/:id/flow` | GET | Event pipeline snapshot for a session |
| `/errors/recent` | GET | Recent errors from ring buffer (limit, subsystem params) |
| `/session/:id/inject` | POST | Inject synthetic event (DEV mode only) |
| `/support-bundle` | POST | Generate sanitized diagnostic bundle |
| `/metrics/snapshot` | GET | Metrics as JSON for dashboard |

## Generating a Support Bundle

### Via API

```bash
curl -X POST https://your-server/api/dev/diagnostics/support-bundle \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "optional-session-id", "includeDbSample": true}'
```

### Via Dashboard

1. Navigate to `/admin/diagnostics`
2. Click "📦 Download Support Bundle"
3. JSON file will download automatically

### Bundle Contents

- Server version and git commit
- Sanitized config (no secrets)
- Runtime stats (uptime, connections)
- Active sessions list
- Metrics snapshot
- Recent errors (sanitized)
- Database table counts (optional)

### What Gets Scrubbed

The bundle automatically removes any fields matching:
- `secret`, `password`, `token`, `key`, `jwt`, `api_key`, `auth`, `bearer`, `credential`, `private`

## Dashboard Diagnostics Page

Navigate to `/admin/diagnostics` (requires session_authority capability).

### Panels

1. **Live Connections** - Socket count, relay/dashboard breakdown, socket details
2. **Active Session Flow** - Select session, view track, drivers, DB health
3. **Error Console** - Live tail with subsystem filtering
4. **Backpressure Warning** - Alert banner when drops detected

### Auto-Refresh

Enable/disable 2-second polling with the checkbox. Disable for debugging static state.

## Interpreting Flow Panel

| Metric | Healthy | Concern |
|--------|---------|---------|
| Last Update | < 5s ago | > 30s ago |
| DB Status | ok | error |
| Session Errors | 0 | > 0 |

## Smoke Test Checklist

| # | Test | Command/Action | Expected |
|---|------|----------------|----------|
| 1 | Metrics disabled | `METRICS_ENABLED=false` + `curl /metrics` | 404 |
| 2 | Metrics enabled | `METRICS_ENABLED=true` + `curl /metrics` | Prometheus text |
| 3 | Diagnostics disabled | `DIAGNOSTICS_ENABLED=false` + `curl /api/dev/diagnostics/health/relay` | 404 |
| 4 | Diagnostics no auth | Enable + call without token | 401 |
| 5 | Diagnostics no cap | Enable + call with non-admin | 403 |
| 6 | Diagnostics works | Enable + call with admin | 200 + JSON |
| 7 | Bundle scrubs secrets | Export bundle, grep secrets | No matches |
| 8 | Dashboard loads | Navigate to `/admin/diagnostics` | Page renders |
| 9 | Error console updates | Trigger error, verify in console | Error visible |

## Troubleshooting

### "Diagnostics not enabled" error
Set `DIAGNOSTICS_ENABLED=true` in server environment.

### "Requires admin:diagnostics capability" error
Your user needs `session_authority` capability or super admin status.

### Metrics endpoint returns 404
Set `METRICS_ENABLED=true` in server environment.

### Empty error console
Good news! No errors recorded. Trigger a test error to verify:
```bash
# Call a broken endpoint to generate an error
curl https://your-server/api/nonexistent-route
```
