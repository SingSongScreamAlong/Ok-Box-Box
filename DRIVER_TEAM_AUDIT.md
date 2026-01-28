# Driver & Team Tier Systems Audit
## Date: Jan 28, 2026

---

## DRIVER TIER AUDIT

### Pages & Data Sources

| Page | File | Data Source | Status |
|------|------|-------------|--------|
| Home | `DriverHome.tsx` | `useRelay` (mock/real) | ✅ Real Socket.IO + Mock fallback |
| Cockpit | `DriverCockpit.tsx` | `useRelay`, `useEngineer`, `useVoice` | ✅ Real Socket.IO + Mock fallback |
| Progress | `DriverProgress.tsx` | `fetchDevelopmentData`, `fetchGoals` | ✅ API + Demo fallback |
| History | `DriverHistory.tsx` | `fetchDriverSessions` | ✅ API + Demo fallback |
| Profile | `DriverProfilePage.tsx` | `useDriverData` | ✅ API + Demo fallback |
| Ratings | `DriverRatings.tsx` | `useDriverData` | ✅ API + Demo fallback |
| Sessions | `DriverSessions.tsx` | `fetchDriverSessions` | ✅ API + Demo fallback |
| Stats | `DriverStats.tsx` | `fetchDriverStats` | ✅ API + Demo fallback |
| Pitwall | `DriverPitwall.tsx` | `useRelay` | ✅ Real Socket.IO + Mock fallback |
| Voice | `DriverVoice.tsx` | `useVoice` | ✅ Works (browser TTS) |
| BlackBox | `DriverBlackBox.tsx` | `useRelay` | ✅ Real Socket.IO + Mock fallback |
| HUD | `DriverHUD.tsx` | `useRelay` | ✅ Real Socket.IO + Mock fallback |

### Hooks Status

| Hook | Purpose | Real Data? | Notes |
|------|---------|------------|-------|
| `useRelay` | Live telemetry from iRacing | ✅ CONNECTED | Socket.IO to server, mock fallback via VITE_RELAY_MOCK |
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
| Pitwall Home | `PitwallHome.tsx` | `useTeamData` | ✅ API + Demo fallback |
| Stint Planner | `StintPlanner.tsx` | `useTeamData` | ✅ API + Demo fallback |
| Strategy | `PitwallStrategy.tsx` | `useTeamData` | ✅ API + Demo fallback |
| Practice | `PitwallPractice.tsx` | `useTeamData` | ⚠️ Partial (runPlans still mock) |
| Race Plan | `RacePlan.tsx` | `useTeamData` | ✅ API + Demo fallback |
| Roster | `PitwallRoster.tsx` | `useTeamData` | ⚠️ Partial (roster still mock) |
| Events | `PitwallEvents.tsx` | `useTeamData` | ✅ API + Demo fallback |
| Incidents | `TeamIncidents.tsx` | `useTeamData` | ⚠️ Partial (needs incidents API) |
| Race Viewer | `TeamRaceViewer.tsx` | `useTeamData` | ✅ API + Demo fallback |
| Driver Compare | `DriverComparison.tsx` | `useTeamData` | ✅ API + Demo fallback |

### `useTeamData` Hook Analysis

**Current State:** Connected to real API via `teamService.ts`
- ✅ `team` - fetched from `/api/v1/teams/:id`
- ✅ `drivers` - fetched from `/api/v1/teams/:id/drivers`
- ✅ `events` - fetched from `/api/v1/teams/:id/events`
- ✅ `racePlans` - fetched from `/api/v1/teams/:id/race-plans`
- ✅ `stints` - fetched from `/api/v1/teams/:id/race-plans/:id/stints`
- ⚠️ `tracks` - still mock (needs tracks API)
- ⚠️ `radioChannels` - still mock (needs radio API)
- ⚠️ `runPlans` - still mock (needs practice API)
- ⚠️ `driverStints` - still mock (needs session stints API)
- ⚠️ `strategyPlan` - still mock (needs strategy API)
- ⚠️ `roster` - still mock (needs roster API)

### Backend API Endpoints for Team

| Endpoint | Status | Priority |
|----------|--------|----------|
| `GET /api/v1/teams/:id` | ✅ CREATED | HIGH |
| `GET /api/v1/teams/:id/drivers` | ✅ CREATED | HIGH |
| `GET /api/v1/teams/:id/events` | ✅ CREATED | HIGH |
| `GET /api/v1/teams/:id/race-plans` | ✅ CREATED | HIGH |
| `POST /api/v1/teams/:id/race-plans` | ✅ CREATED | HIGH |
| `PATCH /api/v1/teams/:id/race-plans/:id/activate` | ✅ CREATED | HIGH |
| `GET /api/v1/teams/:id/race-plans/:id/stints` | ✅ CREATED | HIGH |
| `POST /api/v1/teams/:id/race-plans/:id/stints` | ✅ CREATED | HIGH |
| `PATCH /api/v1/teams/:id/stints/:id` | ✅ CREATED | MEDIUM |
| `DELETE /api/v1/teams/:id/stints/:id` | ✅ CREATED | MEDIUM |
| `GET /api/v1/teams/:id/roster` | ❌ MISSING | MEDIUM |
| `GET /api/v1/teams/:id/stints` | ❌ MISSING | MEDIUM |
| `POST /api/v1/teams/:id/stints` | ❌ MISSING | MEDIUM |

### Database Tables for Team

| Table | Status | Notes |
|-------|--------|-------|
| `teams` | ✅ EXISTS | Basic team info |
| `team_members` | ✅ EXISTS | Driver-team relationships |
| `team_events` | ✅ CREATED | Race events for team (migration 016) |
| `race_plans` | ✅ CREATED | Strategy plans (migration 016) |
| `stints` | ✅ CREATED | Stint assignments (migration 016) |
| `pit_stops` | ✅ CREATED | Pit stop data (migration 016) |
| `plan_changes` | ✅ CREATED | Audit trail for strategy changes (migration 016) |
| `event_roster` | ✅ CREATED | Event-specific driver assignments (migration 016) |

---

## ACTION ITEMS

### Phase 1: Driver Tier ✅ COMPLETE
1. ✅ Goals system - DONE
2. ✅ useRelay connected to real Socket.IO
3. ✅ driverService connected to real API
4. ✅ goalsService connected to real API
5. ⚠️ Ensure iRacing OAuth works in production (needs testing)

### Phase 2: Team Tier ✅ MOSTLY COMPLETE
1. ✅ Created `team_events` migration (016)
2. ✅ Created `race_plans` and `stints` migrations (016)
3. ✅ Built Team API routes (`team-operations.ts`)
4. ✅ Updated `useTeamData` to call real API via `teamService.ts`
5. ⚠️ Some data still mock: tracks, radioChannels, runPlans, roster

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
