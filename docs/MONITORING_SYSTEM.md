# Ok, Box Box - Production Monitoring System

## Overview

This document outlines the complete monitoring infrastructure for Ok, Box Box production systems.

---

## 1. Monitoring Stack

### Core Components

| Component | Purpose | Provider |
|-----------|---------|----------|
| **Error Tracking** | Capture & alert on errors | Sentry |
| **APM** | Application performance | Sentry Performance |
| **Uptime Monitoring** | Endpoint availability | UptimeRobot / Better Uptime |
| **Infrastructure** | Server health | DigitalOcean Monitoring |
| **Logs** | Centralized logging | Papertrail / Logtail |
| **Metrics** | Custom business metrics | Grafana Cloud |
| **Alerting** | On-call notifications | PagerDuty / Opsgenie |

---

## 2. Sentry Configuration

### Installation

```bash
# Server
npm install @sentry/node @sentry/profiling-node

# Frontend
npm install @sentry/react
```

### Server Setup (`packages/server/src/index.ts`)

```typescript
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.npm_package_version,
  integrations: [
    new ProfilingIntegration(),
  ],
  tracesSampleRate: 0.1, // 10% of transactions
  profilesSampleRate: 0.1,
});

// Express error handler (add after routes)
app.use(Sentry.Handlers.errorHandler());
```

### Frontend Setup (`apps/app/src/main.tsx`)

```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

### Environment Variables

```env
# Server
SENTRY_DSN=https://xxx@sentry.io/xxx

# Frontend
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
```

---

## 3. Uptime Monitoring

### Endpoints to Monitor

| Endpoint | Check Interval | Alert Threshold |
|----------|----------------|-----------------|
| `https://api.okboxbox.com/health` | 1 min | 2 failures |
| `https://app.okboxbox.com` | 1 min | 2 failures |
| `https://okboxbox.com` | 5 min | 2 failures |
| `wss://api.okboxbox.com/socket.io` | 1 min | 3 failures |

### Health Check Endpoint

```typescript
// packages/server/src/routes/health.ts
router.get('/health', async (req, res) => {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: await checkDatabase(),
    redis: await checkRedis(),
    memory: process.memoryUsage(),
  };
  
  const allHealthy = checks.database && checks.redis;
  res.status(allHealthy ? 200 : 503).json(checks);
});
```

---

## 4. Infrastructure Monitoring

### DigitalOcean Droplet Alerts

| Metric | Warning | Critical |
|--------|---------|----------|
| CPU Usage | > 70% for 5 min | > 90% for 2 min |
| Memory Usage | > 80% | > 95% |
| Disk Usage | > 80% | > 90% |
| Bandwidth | > 80% of limit | > 95% of limit |

### Database Alerts (PostgreSQL)

| Metric | Warning | Critical |
|--------|---------|----------|
| Connection Pool | > 80% used | > 95% used |
| Query Time p95 | > 500ms | > 2000ms |
| Disk Usage | > 70% | > 85% |
| Replication Lag | > 10s | > 60s |

### Redis Alerts

| Metric | Warning | Critical |
|--------|---------|----------|
| Memory Usage | > 70% | > 90% |
| Connected Clients | > 80% max | > 95% max |
| Evicted Keys | > 0 | > 100/min |

---

## 5. Application Metrics

### Key Performance Indicators (KPIs)

```typescript
// Custom metrics to track
const metrics = {
  // Business metrics
  'driver.sessions.active': Gauge,
  'driver.relay.connections': Gauge,
  'driver.crew_chat.requests': Counter,
  'driver.crew_chat.latency': Histogram,
  
  // Technical metrics
  'api.requests.total': Counter,
  'api.requests.latency': Histogram,
  'api.errors.total': Counter,
  'websocket.connections': Gauge,
  'websocket.messages.sent': Counter,
  'websocket.messages.received': Counter,
};
```

### Prometheus Metrics Endpoint

```typescript
// packages/server/src/routes/metrics.ts
import { collectDefaultMetrics, Registry } from 'prom-client';

const register = new Registry();
collectDefaultMetrics({ register });

router.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
});
```

---

## 6. Logging Strategy

### Log Levels

| Level | Usage |
|-------|-------|
| `error` | Exceptions, failures requiring attention |
| `warn` | Degraded performance, recoverable issues |
| `info` | Key business events, request summaries |
| `debug` | Detailed debugging (dev/staging only) |

### Structured Logging

```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: {
    service: 'okboxbox-api',
    version: process.env.npm_package_version,
  },
});

// Usage
logger.info({ userId, action: 'login' }, 'User logged in');
logger.error({ err, requestId }, 'Request failed');
```

### Log Aggregation

Send logs to Papertrail/Logtail:

```bash
# Docker logging driver
docker run --log-driver=syslog \
  --log-opt syslog-address=udp://logs.papertrailapp.com:XXXXX \
  okboxbox-api
```

---

## 7. Alerting Rules

### Critical Alerts (Page immediately)

| Condition | Action |
|-----------|--------|
| API down > 2 min | Page on-call |
| Error rate > 5% | Page on-call |
| Database unreachable | Page on-call |
| Redis unreachable | Page on-call |

### Warning Alerts (Slack notification)

| Condition | Action |
|-----------|--------|
| API latency p95 > 500ms | Slack #alerts |
| Error rate > 1% | Slack #alerts |
| WebSocket disconnection spike | Slack #alerts |
| Memory usage > 80% | Slack #alerts |

### PagerDuty Integration

```yaml
# .github/workflows/deploy.yml
- name: Notify PagerDuty on Deploy
  uses: pagerduty/pagerduty-change-events-action@v1
  with:
    integration-key: ${{ secrets.PAGERDUTY_INTEGRATION_KEY }}
    change-event-action: trigger
```

---

## 8. Dashboards

### Operations Dashboard

**Panels:**
1. Request rate (req/s)
2. Error rate (%)
3. Latency p50/p95/p99
4. Active WebSocket connections
5. Database connection pool
6. Memory/CPU usage

### Business Dashboard

**Panels:**
1. Active driver sessions
2. Relay connections by region
3. AI crew chat usage
4. User signups/logins
5. Feature usage breakdown

### Incident Dashboard

**Panels:**
1. Recent errors (grouped)
2. Error rate trend
3. Affected users
4. Deployment markers

---

## 9. Runbooks

### API Down

1. Check DigitalOcean droplet status
2. SSH to server, check `pm2 status`
3. Check logs: `pm2 logs okboxbox-api --lines 100`
4. Restart if needed: `pm2 restart okboxbox-api`
5. If persistent, check database/Redis connectivity

### High Error Rate

1. Check Sentry for error grouping
2. Identify affected endpoint/feature
3. Check recent deployments
4. Rollback if deployment-related: `git revert && deploy`
5. Hotfix if code issue

### Database Connection Issues

1. Check DO managed database status
2. Verify connection pool settings
3. Check for long-running queries: `SELECT * FROM pg_stat_activity`
4. Kill stuck queries if needed
5. Scale database if connection limit reached

### WebSocket Disconnections

1. Check server memory/CPU
2. Verify Redis pub/sub health
3. Check for client-side errors in Sentry
4. Review recent relay changes
5. Scale horizontally if load-related

---

## 10. On-Call Procedures

### Rotation

- Weekly rotation
- Primary + Secondary on-call
- Handoff meeting every Monday

### Escalation Path

1. **L1**: On-call engineer (5 min response)
2. **L2**: Lead developer (15 min response)
3. **L3**: CTO (30 min response)

### Incident Response

1. **Acknowledge** alert within 5 minutes
2. **Assess** severity (P1-P4)
3. **Communicate** in #incidents Slack channel
4. **Mitigate** - restore service ASAP
5. **Resolve** - fix root cause
6. **Postmortem** - document within 48 hours

### Severity Levels

| Level | Description | Response Time | Example |
|-------|-------------|---------------|---------|
| P1 | Service down | 5 min | API unreachable |
| P2 | Major degradation | 15 min | 50% error rate |
| P3 | Minor degradation | 1 hour | Slow responses |
| P4 | Low impact | Next business day | UI bug |

---

## 11. Implementation Checklist

### Phase 1: Foundation
- [ ] Set up Sentry project
- [ ] Add Sentry to server
- [ ] Add Sentry to frontend
- [ ] Configure source maps upload

### Phase 2: Uptime
- [ ] Create UptimeRobot monitors
- [ ] Add health check endpoint
- [ ] Configure status page

### Phase 3: Metrics
- [ ] Add Prometheus metrics
- [ ] Set up Grafana Cloud
- [ ] Create dashboards

### Phase 4: Alerting
- [ ] Configure PagerDuty
- [ ] Set up Slack integration
- [ ] Define alert rules
- [ ] Test alert flow

### Phase 5: Logging
- [ ] Set up Papertrail/Logtail
- [ ] Configure log shipping
- [ ] Create log dashboards

### Phase 6: Documentation
- [ ] Write runbooks
- [ ] Document on-call procedures
- [ ] Train team on tools
