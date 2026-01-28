# Ok, Box Box - Data Flow Audit

## Overview

This document maps the data flow across all three tiers (Driver, Team, League) to ensure complete coverage and identify any gaps.

---

## Data Provider Architecture

```
App.tsx
├── RelayProvider (live telemetry WebSocket)
│
├── DriverLayout
│   └── DriverDataProvider ← useDriverData hook
│       ├── profile (DriverIdentityProfile)
│       ├── sessions (DriverSessionSummary[])
│       ├── stats (DriverStatsSnapshot[])
│       ├── telemetry (TelemetryData)
│       └── raceProgress (RaceProgress)
│
├── TeamLayout
│   └── TeamDataProvider ← useTeamData hook
│       ├── drivers (Driver[])
│       ├── tracks (Track[])
│       ├── events (TeamEvent[])
│       ├── racePlans (RacePlan[])
│       ├── radioChannels (RadioChannel[])
│       ├── runPlans (RunPlan[])
│       ├── driverStints (DriverStint[])
│       ├── strategyPlan (StrategyPlan)
│       └── roster (TeamRoster)
│
└── LeagueLayout
    └── LeagueDataProvider ← useLeagueData hook
        ├── league (League)
        ├── role (owner|admin|steward|member)
        ├── members (LeagueMembership[])
        ├── events (Event[])
        ├── incidents (Incident[])
        ├── championship (Championship)
        └── standings (ChampionshipStanding[])
```

---

## Driver Tier Data Flow

| Page | Hook | Data Consumed | Status |
|------|------|---------------|--------|
| DriverCockpit | useRelay, useRaceSimulation | telemetry, simPlayer | ✅ Uses existing hooks |
| DriverHistory | useDriverData | sessions, stats, profile | ✅ Wired |
| DriverRatings | useDriverData | profile | ✅ Wired |
| DriverProgress | driverDevelopment service | DevelopmentData | ⚠️ Uses separate service |
| DriverProfilePage | driverService | profile | ⚠️ Direct service call |
| EngineerChat | useEngineer | AI chat context | ✅ Separate hook |
| SpotterChat | useVoice | voice context | ✅ Separate hook |
| AnalystChat | useEngineer | AI chat context | ✅ Separate hook |
| ReplayViewer | telemetryService | replay data | ⚠️ Direct service call |

---

## Team Tier Data Flow

| Page | Hook | Data Consumed | Status |
|------|------|---------------|--------|
| TeamDashboard | teams lib | team info | ⚠️ Direct lib call |
| PitwallHome | useTeamData | radioChannels | ✅ Wired |
| PitwallPractice | useTeamData | runPlans, driverStints | ✅ Wired |
| PitwallStrategy | useTeamData | strategyPlan | ✅ Wired |
| PitwallRoster | useTeamData | roster | ✅ Wired |
| PitwallEvents | useTeamData | events, tracks | ✅ Wired |
| PitwallPlanning | useTeamData | events, drivers, tracks | ✅ Wired |
| RacePlan | useTeamData | drivers | ✅ Wired |
| StintPlanner | useTeamData | drivers | ✅ Wired |
| TeamRaceViewer | useTeamData, useRelay | drivers, telemetry | ✅ Wired |
| DriverComparison | local mock | comparison data | ⚠️ Not wired |
| PitwallReports | local mock | reports data | ⚠️ Not wired |
| PitwallSetups | local mock | setups data | ⚠️ Not wired |
| TeamIncidents | local mock | incidents data | ⚠️ Not wired |

---

## League Tier Data Flow

| Page | Hook | Data Consumed | Status |
|------|------|---------------|--------|
| LeagueDashboard | useLeagueData | league, role, members, events | ✅ Wired |
| LeagueIncidents | incidents lib | incidents | ⚠️ Direct lib call |
| LeagueIncidentDetail | incidents lib | incident detail | ⚠️ Direct lib call |
| LeagueChampionship | championshipService | standings, events | ⚠️ Direct service call |
| LeaguePenalties | penalties lib | penalties | ⚠️ Direct lib call |
| LeagueProtests | local mock | protests | ⚠️ Not wired |
| LeagueRulebook | rulebooks lib | rulebook | ⚠️ Direct lib call |
| LeagueSettings | leagues lib | league settings | ⚠️ Direct lib call |
| StewardConsole | incidents lib | incidents | ⚠️ Direct lib call |
| BroadcastGraphics | broadcastService | broadcast data | ⚠️ Direct service call |
| PublicTiming | local mock | timing data | ⚠️ Not wired |

---

## Mock Data Sources

### Centralized (services/mockData/)
- `types.ts` - All shared type definitions
- `data.ts` - Mock data for drivers, tracks, events, run plans, stints, strategy, roster

### Service-Level Mock Data
- `lib/driverService.ts` - DEMO_PROFILE, DEMO_SESSIONS, DEMO_STATS
- `lib/leagues.ts` - DEMO_LEAGUE, DEMO_LEAGUE_MEMBERS
- `lib/incidents.ts` - DEMO_INCIDENTS
- `lib/championshipService.ts` - generateDemoStandings(), generateDemoChampionship()
- `lib/events.ts` - Demo events
- `lib/driverDevelopment.ts` - Development mock data

---

## Data Flow Gaps Identified

### High Priority
1. **DriverProgress** - Uses separate `driverDevelopment` service, should integrate with useDriverData
2. **LeagueIncidents** - Should use useLeagueData.incidents instead of direct lib call
3. **LeagueChampionship** - Should use useLeagueData.championship/standings

### Medium Priority
4. **TeamDashboard** - Could use useTeamData for consistency
5. **DriverComparison, PitwallReports, PitwallSetups, TeamIncidents** - Need mock data added to service

### Low Priority (Working but not centralized)
6. Various League pages using direct lib calls - functional but not using context

---

## Recommendations

1. **Complete Team Tier** - Add mock data for comparison, reports, setups, team incidents
2. **Complete League Tier** - Wire remaining pages to useLeagueData
3. **Add Development Data to Driver Hook** - Integrate driverDevelopment into useDriverData
4. **Add Data Validation** - Create test utilities to verify data flows correctly
5. **Add Loading States** - Ensure all pages handle loading/error states consistently

---

## Testing Checklist

- [ ] Driver Cockpit displays telemetry data
- [ ] Driver History shows session list
- [ ] Driver Ratings shows license info
- [ ] Team Pitwall Home shows radio channels
- [ ] Team Practice shows run plans
- [ ] Team Strategy shows strategy plan
- [ ] Team Roster shows team members
- [ ] Team Events shows event list
- [ ] League Dashboard shows league info
- [ ] League shows incidents list
- [ ] League Championship shows standings

---

*Last Updated: January 28, 2026*
