# Driver Tier Launch Readiness

## Overview

This document outlines everything needed to launch the Driver Tier of Ok, Box Box.

---

## 1. Driver Tier Pages & Features

### Core Pages
| Route | Component | Status | Notes |
|-------|-----------|--------|-------|
| `/driver` | DriverHome | ✅ | Landing/dashboard |
| `/driver/cockpit` | DriverCockpit | ✅ | Live telemetry + track map |
| `/driver/hud` | DriverHUD | ✅ | Minimal HUD overlay |
| `/driver/pitwall` | DriverPitwall | ✅ | Strategy view |
| `/driver/pitwall/advanced` | DriverPitwallAdvanced | ✅ | Extended strategy |
| `/driver/blackbox` | DriverBlackBox | ✅ | Telemetry dashboard |
| `/driver/ratings` | DriverRatings | ✅ | License & iRating |
| `/driver/stats` | DriverStats | ✅ | Performance stats |
| `/driver/history` | DriverHistory | ✅ | Race history |
| `/driver/sessions` | DriverSessions | ✅ | Session browser |
| `/driver/idp` | DriverIDP | ✅ | Individual Development Plan |
| `/driver/progress` | DriverProgress | ✅ | Progress tracking |
| `/driver/profile` | DriverProfilePage | ✅ | Profile settings |
| `/driver/voice` | DriverVoice | ✅ | Voice settings |
| `/driver/replay/:id` | ReplayViewer | ✅ | Replay analysis |

### Crew Chat Pages
| Route | Component | Status |
|-------|-----------|--------|
| `/driver/crew/engineer` | EngineerChat | ✅ |
| `/driver/crew/spotter` | SpotterChat | ✅ |
| `/driver/crew/analyst` | AnalystChat | ✅ |

### State Components
| Component | Purpose |
|-----------|---------|
| LiveCockpit | In-session live view |
| BriefingCard | Pre-race briefing |
| DebriefCard | Post-race debrief |
| ProgressView | Progress visualization |
| SeasonView | Season overview |

---

## 2. Critical Data Flows

### Relay → Server → Frontend
```
Python Relay (iRacing) 
    → WebSocket → 
Server (TelemetryHandler) 
    → Socket.io → 
Frontend (useRelay hook)
    → Components
```

### Key Events
- `session:active` - Session metadata (track, car, driver)
- `telemetry:driver` - Live telemetry (60Hz → 1Hz throttled)
- `car:status` - Strategy data (1Hz)
- `standings:update` - Leaderboard updates

### API Endpoints (Driver Tier)
- `GET /api/v1/drivers/me` - Driver profile
- `GET /api/v1/drivers/me/stats` - Performance stats
- `GET /api/v1/drivers/me/history` - Race history
- `GET /api/v1/drivers/me/sessions` - Session list
- `GET /api/v1/drivers/me/idp` - Development plan
- `POST /api/v1/drivers/me/crew-chat` - AI crew chat
- `POST /api/v1/drivers/me/memory` - Driver memory CRUD

---

## 3. Testing Suite Requirements

### E2E Tests (Playwright)
1. **Authentication Flow**
   - Login with valid credentials
   - Redirect to driver home
   - Persist session across refresh

2. **Navigation Tests**
   - All driver routes accessible
   - Sidebar navigation works
   - Back/forward browser navigation

3. **Page Load Tests**
   - Each page renders without errors
   - Loading states display correctly
   - Error states handle gracefully

4. **Data Display Tests**
   - Profile data displays correctly
   - Stats/ratings show real data
   - History loads and paginates

5. **Live Telemetry Tests** (requires mock relay)
   - Cockpit receives telemetry
   - Track map updates
   - Gauges animate

6. **AI Crew Chat Tests**
   - Chat messages send/receive
   - Context includes telemetry
   - Rate limiting works

### Unit Tests (Vitest)
1. **Hooks**
   - useDriverData
   - useRelay
   - useLiveTelemetry
   - useDriverMemory

2. **Utilities**
   - Lap time formatting
   - Unit conversions
   - Track ID resolution

3. **Components**
   - TrackMap rendering
   - Gauge components
   - Data cards

---

## 4. Monitoring System

### Application Monitoring
- **Sentry** - Error tracking & performance
- **LogRocket** - Session replay (optional)
- **Custom metrics** - Business KPIs

### Infrastructure Monitoring
- **DigitalOcean Monitoring** - Droplet health
- **Uptime Robot** - Endpoint availability
- **Grafana + Prometheus** - Metrics dashboards

### Key Metrics to Track
1. **Availability**
   - API uptime
   - WebSocket connection success rate
   - Page load success rate

2. **Performance**
   - API response times (p50, p95, p99)
   - WebSocket latency
   - Frontend Core Web Vitals

3. **Business**
   - Active sessions
   - Relay connections
   - AI chat usage
   - Error rates by endpoint

4. **Alerts**
   - API error rate > 1%
   - Response time p95 > 500ms
   - WebSocket disconnection spike
   - Database connection failures

---

## 5. Dev Team Structure

### Roles
| Role | Responsibility |
|------|----------------|
| **Lead Developer** | Architecture, code review, releases |
| **Frontend Dev** | React/TypeScript, UI/UX |
| **Backend Dev** | Node.js, API, database |
| **DevOps** | Infrastructure, CI/CD, monitoring |
| **QA** | Testing, bug triage |

### On-Call Rotation
- 24/7 coverage during launch week
- PagerDuty or Opsgenie for alerts
- Escalation path: On-call → Lead → CTO

### Communication
- **Slack** - Real-time communication
- **GitHub Issues** - Bug tracking
- **Linear/Jira** - Sprint planning

---

## 6. Launch Checklist

### Pre-Launch (T-7 days)
- [ ] All E2E tests passing
- [ ] Performance audit complete
- [ ] Security audit complete
- [ ] Monitoring dashboards configured
- [ ] Alerting rules set up
- [ ] Runbooks documented
- [ ] Rollback procedure tested

### Launch Day (T-0)
- [ ] Feature flags ready
- [ ] Gradual rollout plan
- [ ] War room established
- [ ] All team members available
- [ ] Customer support briefed

### Post-Launch (T+1 to T+7)
- [ ] Monitor error rates
- [ ] Collect user feedback
- [ ] Hotfix process ready
- [ ] Daily standup reviews

---

## 7. Known Issues & Risks

### Technical Risks
1. **Relay connectivity** - iRacing SDK changes
2. **WebSocket scaling** - High concurrent users
3. **AI rate limits** - OpenAI API quotas

### Mitigations
1. Relay version pinning, fallback modes
2. Redis pub/sub for horizontal scaling
3. Request queuing, graceful degradation

---

## 8. Success Criteria

### Launch Success
- 99.5% uptime in first week
- < 1% error rate
- < 500ms p95 API response time
- Zero critical bugs

### User Success
- Positive user feedback
- Relay connection success > 95%
- AI chat satisfaction > 80%
