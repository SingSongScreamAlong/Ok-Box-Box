# Driver & Team Tier Systems Audit
## Date: Jan 28, 2026

---

## DRIVER TIER AUDIT

### Pages & Data Sources

| Page | File | Data Source | Status |
|------|------|-------------|--------|
| Home | `DriverHome.tsx` | `useRelay` (mock/real) | ⚠️ Mock by default |
| Cockpit | `DriverCockpit.tsx` | `useRelay`, `useEngineer`, `useVoice` | ⚠️ Mock by default |
| Progress | `DriverProgress.tsx` | `fetchDevelopmentData`, `fetchGoals` | ✅ API + Demo fallback |
| History | `DriverHistory.tsx` | `fetchDriverSessions` | ✅ API + Demo fallback |
| Profile | `DriverProfilePage.tsx` | `useDriverData` | ✅ API + Demo fallback |
| Ratings | `DriverRatings.tsx` | `useDriverData` | ✅ API + Demo fallback |
| Sessions | `DriverSessions.tsx` | `fetchDriverSessions` | ✅ API + Demo fallback |
| Stats | `DriverStats.tsx` | `fetchDriverStats` | ✅ API + Demo fallback |
| Pitwall | `DriverPitwall.tsx` | `useRelay` | ⚠️ Mock by default |
| Voice | `DriverVoice.tsx` | `useVoice` | ✅ Works (browser TTS) |
| BlackBox | `DriverBlackBox.tsx` | `useRelay` | ⚠️ Mock by default |
| HUD | `DriverHUD.tsx` | `useRelay` | ⚠️ Mock by default |

### Hooks Status

| Hook | Purpose | Real Data? | Notes |
|------|---------|------------|-------|
| `useRelay` | Live telemetry from iRacing | ⚠️ MOCK | Needs relay connection |
| `useDriverData` | Profile, sessions, stats | ✅ YES | Falls back to demo |
| `useDriverMemory` | Engineer personality/memory | ✅ YES | Supabase tables |
| `useEngineer` | AI engineer responses | ⚠️ PARTIAL | Uses local logic, not LLM |
| `useVoice` | Text-to-speech | ✅ YES | Browser Speech API |
| `useDriverState` | Driver state machine | ✅ YES | Local state |

### Backend API Endpoints Needed

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/v1/drivers/me` | ✅ EXISTS | Returns driver profile |
| `GET /api/v1/drivers/:id/sessions` | ✅ EXISTS | Session history |
| `GET /api/v1/drivers/:id/performance` | ✅ EXISTS | Stats/aggregates |
| `GET /api/v1/goals` | ✅ CREATED | Goals CRUD |
| `GET /api/v1/goals/suggestions` | ✅ CREATED | AI suggestions |
| `POST /api/oauth/iracing/start` | ✅ EXISTS | OAuth flow |
| `GET /api/oauth/iracing/profile` | ✅ EXISTS | iRacing profile |
| `POST /api/oauth/iracing/sync` | ✅ EXISTS | Force sync |

### What Needs Connection

1. **Relay System** - Currently mock. Real relay requires:
   - Relay desktop app running on driver's PC
   - WebSocket connection to server
   - iRacing SDK data flowing

2. **Engineer AI** - Currently pattern-matching. Could connect to:
   - OpenAI API for smarter responses
   - Or keep local for speed/cost

---

## TEAM TIER AUDIT

### Pages & Data Sources

| Page | File | Data Source | Status |
|------|------|-------------|--------|
| Pitwall Home | `PitwallHome.tsx` | `useTeamData` | ❌ ALL MOCK |
| Stint Planner | `StintPlanner.tsx` | `useTeamData` | ❌ ALL MOCK |
| Strategy | `PitwallStrategy.tsx` | `useTeamData` | ❌ ALL MOCK |
| Practice | `PitwallPractice.tsx` | `useTeamData` | ❌ ALL MOCK |
| Race Plan | `RacePlan.tsx` | `useTeamData` | ❌ ALL MOCK |
| Roster | `PitwallRoster.tsx` | `useTeamData` | ❌ ALL MOCK |
| Events | `PitwallEvents.tsx` | `useTeamData` | ❌ ALL MOCK |
| Incidents | `TeamIncidents.tsx` | `useTeamData` | ❌ ALL MOCK |
| Race Viewer | `TeamRaceViewer.tsx` | `useTeamData` | ❌ ALL MOCK |
| Driver Compare | `DriverComparison.tsx` | `useTeamData` | ❌ ALL MOCK |

### `useTeamData` Hook Analysis

**Current State:** 100% mock data from `mockData.ts`
- `mockDrivers`, `mockTeam`, `mockTracks`, `mockEvents`
- `mockRacePlans`, `mockRadioChannels`, `mockRunPlans`
- `mockDriverStints`, `mockStrategyPlan`, `mockRoster`

### Backend API Endpoints Needed for Team

| Endpoint | Status | Priority |
|----------|--------|----------|
| `GET /api/v1/teams/:id` | ❌ MISSING | HIGH |
| `GET /api/v1/teams/:id/drivers` | ❌ MISSING | HIGH |
| `GET /api/v1/teams/:id/events` | ❌ MISSING | HIGH |
| `GET /api/v1/teams/:id/race-plans` | ❌ MISSING | HIGH |
| `POST /api/v1/teams/:id/race-plans` | ❌ MISSING | HIGH |
| `GET /api/v1/teams/:id/roster` | ❌ MISSING | MEDIUM |
| `GET /api/v1/teams/:id/stints` | ❌ MISSING | MEDIUM |
| `POST /api/v1/teams/:id/stints` | ❌ MISSING | MEDIUM |

### Database Tables Needed for Team

| Table | Status | Notes |
|-------|--------|-------|
| `teams` | ✅ EXISTS | Basic team info |
| `team_members` | ✅ EXISTS | Driver-team relationships |
| `team_events` | ❌ MISSING | Race events for team |
| `race_plans` | ❌ MISSING | Strategy plans |
| `stints` | ❌ MISSING | Stint assignments |
| `pit_stops` | ❌ MISSING | Pit stop data |

---

## ACTION ITEMS

### Phase 1: Driver Tier (Quick Wins)
1. ✅ Goals system - DONE
2. ⚠️ Ensure iRacing OAuth works in production
3. ⚠️ Verify profile sync pulls real data

### Phase 2: Team Tier (Needs Work)
1. Create `team_events` migration
2. Create `race_plans` and `stints` migrations
3. Build Team API routes
4. Update `useTeamData` to call real API

### Phase 3: Deployment
1. Commit all changes to git
2. Push to main branch (triggers DO deploy)
3. Run migrations on production DB
4. Verify live systems

---

## DEPLOYMENT CHECKLIST

- [x] All new files committed (15 files, 3937 insertions)
- [x] Database migrations ready (015_driver_goals.sql, 016_team_events.sql)
- [x] Environment variables set in DO (via app.yaml)
- [x] Push to main branch (commit 13b4d24)
- [ ] Verify health check passes (currently showing standalone mode - deploy in progress)
- [ ] Test driver tier with real iRacing account
- [ ] Test team tier with real data

## DEPLOYMENT STATUS

**Pushed:** Jan 28, 2026 12:35 PM EST
**Commit:** `13b4d24` - "feat: Driver Goal System + Team Operations API"

### Files Deployed:
- `apps/app/src/components/GoalCard.tsx` - Goal display component
- `apps/app/src/components/CreateGoalModal.tsx` - Goal creation UI
- `apps/app/src/lib/goalsService.ts` - Frontend goals API service
- `apps/app/src/lib/teamService.ts` - Frontend team API service
- `apps/app/src/pages/driver/DriverProgress.tsx` - Updated with Goals tab
- `packages/server/src/api/routes/goals.ts` - Goals CRUD API
- `packages/server/src/api/routes/team-operations.ts` - Team operations API
- `packages/server/src/db/migrations/015_driver_goals.sql` - Goals DB schema
- `packages/server/src/db/migrations/016_team_events.sql` - Team events DB schema
- `packages/server/src/services/driver-development/goal-generator.ts` - AI goal generation

### URLs:
- **Frontend:** https://okboxbox.com
- **API:** https://octopus-app-qsi3i.ondigitalocean.app
- **Health:** https://octopus-app-qsi3i.ondigitalocean.app/api/health
