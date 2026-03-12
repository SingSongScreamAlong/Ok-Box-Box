# Development Environments

This document tracks what components are developed and tested on which machine, and their current status.

---

## 🍎 Mac (Primary Development)

**Role:** All core development, server, application UI, website, and documentation

| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| Server (Node.js) | `packages/server/` | ✅ Active | Express + Socket.IO |
| Application UI (React) | `apps/app/` | ✅ Active | Vite + TailwindCSS |
| Marketing Website (React) | `apps/website/` | ✅ Active | Vite |
| Common Types | `packages/common/` | ✅ Active | Shared TypeScript types |
| Protocol Schemas | `packages/protocol/` | ✅ Active | Telemetry protocol definitions |
| Documentation | `docs/` | ✅ Active | All markdown docs |
| Scripts | `scripts/` | ✅ Active | RC deployment scripts |
| Docker Config | `docker-compose*.yml` | ✅ Active | Container orchestration |

**Development Server URLs:**
- Application UI: http://localhost:5175
- Marketing Website: http://localhost:5173
- API Server: http://localhost:3001
- WebSocket: ws://localhost:3001

---

## 🖥️ Windows PC (iRacing + Testing)

**Role:** iRacing integration, relay agent, end-to-end testing

| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| Desktop Relay (Electron) | `apps/desktop/` | ✅ Active | Canonical desktop relay app |
| Relay Agent Tooling (Python) | `tools/relay-agent/` | ⏳ Pending Test | Dev tooling and standalone relay path |
| Legacy Relay App (Electron) | `apps/relay/` | ⚠️ Legacy | Older relay desktop app |
| Python Client Lib | `tools/relay-python/` | ⚠️ Legacy | Older ControlBox Python API |

**Requirements:**
- Python 3.9+
- iRacing installed and running
- Network access to Mac server (or deployed server)

---

## 📊 Cross-Platform Status Matrix

| Feature | Mac Dev | Windows Test | Last Verified | Notes |
|---------|---------|--------------|---------------|-------|
| **Server**
| API Routes | ✅ | N/A | 2026-01-18 | |
| WebSocket | ✅ | N/A | 2026-01-18 | Refactored Jan 2026 |
| Stripe Billing | ✅ | N/A | 2026-01-18 | Needs test keys |
| IDP/Driver Stats | ✅ | N/A | 2026-01-18 | |
| Rate Limiting | ✅ | N/A | 2026-01-18 | |
| **Application UI**
| All Pages | ✅ | N/A | 2026-01-18 | `apps/app` |
| My IDP Page | ✅ | N/A | 2026-01-18 | Radar chart + billing |
| **Relay**
| Desktop Relay | ✅ Built | ⏳ Pending | - | Canonical desktop relay |
| Relay Agent Tooling | ✅ Built | ⏳ Pending | - | Needs iRacing |
| Legacy Electron Relay | ✅ Built | ⏳ Pending | - | Legacy path only |
| Protocol v2 | ✅ Defined | ⏳ Pending | - | |
| **End-to-End**
| Mac → Server | ✅ | N/A | 2026-01-18 | |
| PC → Server | N/A | ⏳ Pending | - | |
| Full Pipeline | N/A | ⏳ Pending | - | iRacing → Relay → Server → App |

---

## 🔄 Sync Workflow

### From Mac (Development)
```bash
# After making changes
git add .
git commit -m "[MAC] Description of changes"
git push origin main
```

### From Windows PC (Testing)
```bash
# Get latest changes
git pull origin main

# After testing
git add .
git commit -m "[PC] Description of testing/changes"
git push origin main
```

---

## 📋 Pending Windows Testing Checklist

When on the Windows PC, verify:

- [ ] `apps/desktop` launches and connects as the canonical relay
- [ ] `tools/relay-agent/main.py` connects to server
- [ ] Telemetry flows from iRacing → Server → App
- [ ] Session start/end events work
- [ ] Driver identification works
- [ ] Launch token authentication works
- [ ] Desktop relay packaging works correctly
- [ ] Protocol v2 messages parse correctly

---

## 🔧 Git Configuration

### Mac Setup (Already Done)
```bash
git config user.name "Conrad (Mac)"
```

### Windows Setup (Do This Once)
```bash
git config user.name "Conrad (PC)"
```

This allows filtering commits by machine:
```bash
# See all Mac commits
git log --author="Mac"

# See all PC commits  
git log --author="PC"
```

---

## 📅 Update Log

| Date | Machine | What Changed |
|------|---------|--------------|
| 2026-01-18 | Mac | Stripe billing hardening complete |
| 2026-01-18 | Mac | PROJECT-STRUCTURE.md updated |
| 2026-01-18 | Mac | IDP Radar chart added to dashboard |
| 2026-01-18 | Mac | WebSocket refactor verified |
| | | |

---

*Update this document after significant changes or testing sessions.*
