# Release Candidate Gate

## Overview

This document defines the Release Candidate (RC) verification workflow for Ok, Box Box. One command boots the stack, one command runs tests, one checklist decides "RC ready" vs "not ready".

---

## Quick Start

```bash
# 1. Start RC stack
./scripts/rc-up.sh

# 2. Wait for health
./scripts/rc-health.sh

# 3. Run tests
cd tools/test-harness && npm install && npm run all

# 4. (Optional) Run load test
npm run load

# 5. (Optional) Run chaos test
./scripts/rc-chaos.sh

# 6. Generate support bundle
curl -X POST http://localhost:3001/api/ops/support-pack -H "Content-Type: application/json" -d '{}'

# 7. Tear down
./scripts/rc-down.sh
```

---

## RC Commands

| Command | Purpose | Time |
|---------|---------|------|
| `./scripts/rc-up.sh` | Start full stack (postgres, redis, server, dashboard) | ~2 min |
| `./scripts/rc-down.sh` | Stop stack | ~10s |
| `./scripts/rc-reset.sh` | Stop + wipe all data | ~10s |
| `./scripts/rc-logs.sh` | View logs | - |
| `./scripts/rc-health.sh` | Check all health endpoints | ~5s |
| `./scripts/rc-chaos.sh` | Run chaos/failover scenario | ~2 min |

---

## Test Harness

```bash
cd tools/test-harness
npm install
```

| Command | Purpose | Time |
|---------|---------|------|
| `npm run smoke` | Basic connectivity + data flow | <1 min |
| `npm run replay` | Persistence verification | <1 min |
| `npm run rate` | Role-based rate limits | <1 min |
| `npm run load` | 60 drivers, 20 spectators | ~1 min |
| `npm run all` | Run smoke + replay + rate | <5 min |

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `SERVER_URL` | `http://localhost:3001` | Target server |
| `DRIVER_COUNT` | `60` | Load test drivers |
| `SPECTATOR_COUNT` | `20` | Load test spectators |
| `DURATION_SEC` | `60` | Load test duration |

---

## Go/No-Go Criteria

### Required for RC

| Criterion | Required | Verification |
|-----------|----------|--------------|
| Stack boots | ✅ | `rc-up.sh` completes without error |
| Health passes | ✅ | `rc-health.sh` returns all green |
| Smoke test | ✅ | `npm run smoke` exits 0 |
| Replay test | ✅ | `npm run replay` exits 0 |
| Rate test | ✅ | `npm run rate` exits 0 |
| P0 issues | ✅ Zero | No blocking bugs |
| Support bundle | ✅ | Generates without secrets |

### Recommended (Not Blocking)

| Criterion | Target | Verification |
|-----------|--------|--------------|
| Load test | Completes | `npm run load` finishes |
| Chaos failover | Recovers | `rc-chaos.sh failover` passes |
| 2-hour soak | Stable | Manual monitoring |
| Latency p95 | <100ms | Load test output |

---

## RC Checklist

```
[ ] rc-up.sh completes
[ ] rc-health.sh all green
[ ] npm run smoke - PASS
[ ] npm run replay - PASS
[ ] npm run rate - PASS
[ ] npm run load - completes (review metrics)
[ ] rc-chaos.sh failover - PASS
[ ] Support bundle contains no secrets
[ ] No P0 issues in tracker
[ ] 2-hour soak stable (manual)
```

---

## Support Bundle

Generate a diagnostic bundle:

```bash
curl -X POST http://localhost:3001/api/ops/support-pack \
  -H "Content-Type: application/json" \
  -d '{"includeConfig": true}' \
  -o support-pack.json
```

Verify no secrets:
```bash
grep -i "token\|secret\|password\|apiKey" support-pack.json
# Should return nothing
```

---

## Chaos Scenarios

### Server Failover

```bash
./scripts/rc-chaos.sh failover
```

1. Kills server container
2. Waits 5s
3. Restarts server
4. Verifies recovery in 30s

### Database Outage

```bash
./scripts/rc-chaos.sh db-kill
```

1. Kills postgres container
2. Verifies graceful degradation
3. Restarts postgres
4. Verifies recovery

---

## Troubleshooting

### Stack won't start

```bash
# Check Docker
docker ps -a

# View logs
./scripts/rc-logs.sh server

# Reset and try again
./scripts/rc-reset.sh
./scripts/rc-up.sh
```

### Tests failing

```bash
# Verify server is healthy
curl http://localhost:3001/api/health

# Check dashboard
curl http://localhost:5173

# View detailed logs
./scripts/rc-logs.sh server
```

### No secrets in bundle

The support bundle automatically redacts:
- JWT tokens/secrets
- API keys
- Database passwords
- Authorization headers

If secrets appear, check `/api/ops/support-pack` implementation.
