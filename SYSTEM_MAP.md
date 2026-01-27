# OK, BOX BOX — SYSTEM MAP

**Generated:** January 26, 2026  
**Purpose:** Complete inventory of all pages, routes, and features

---

# 1. AUTHENTICATION (Public Routes)

| Route | File | What It Does |
|-------|------|--------------|
| `/login` | `pages/auth/Login.tsx` | User login with email/password or OAuth |
| `/signup` | `pages/auth/Signup.tsx` | New user registration |
| `/forgot-password` | `pages/auth/ForgotPassword.tsx` | Password reset request |
| `/auth/reset-password` | `pages/auth/ResetPassword.tsx` | Password reset completion |
| `/auth/callback` | `pages/auth/AuthCallback.tsx` | OAuth callback handler (iRacing) |

---

# 2. BLACKBOX TIER (Driver Tools) — $14/mo

## 2.1 Main Driver Pages

| Route | File | What It Does |
|-------|------|--------------|
| `/driver/home` | `pages/driver/DriverCockpit.tsx` | Main dashboard with session state detection, briefing/debrief cards |
| `/driver/cockpit` | `pages/driver/DriverCockpit.tsx` | Same as home (alias) |
| `/driver/sessions` | `pages/driver/DriverSessions.tsx` | Session history list with filtering |
| `/driver/stats` | `pages/driver/DriverStats.tsx` | Career statistics, win rate, incident rate |
| `/driver/ratings` | `pages/driver/DriverRatings.tsx` | iRating/SR tracking with charts |
| `/driver/profile` | `pages/driver/DriverProfilePage.tsx` | Driver identity, licenses, disciplines |
| `/driver/progress` | `pages/driver/DriverProgress.tsx` | IDP (Individual Development Plan), skill tree, goals |

## 2.2 AI Crew (Voice/Chat Interfaces)

| Route | File | What It Does |
|-------|------|--------------|
| `/driver/crew/engineer` | `pages/driver/crew/EngineerChat.tsx` | Race engineer AI — strategy, fuel, tires, setup |
| `/driver/crew/spotter` | `pages/driver/crew/SpotterChat.tsx` | Spotter AI — traffic, gaps, live proximity detection |
| `/driver/crew/analyst` | `pages/driver/crew/AnalystChat.tsx` | Data analyst AI — telemetry review, lap comparison |

## 2.3 Settings

| Route | File | What It Does | Status |
|-------|------|--------------|--------|
| `/driver/settings/hud` | `pages/driver/DriverHUD.tsx` | HUD overlay configuration | ⚠️ Import error |
| `/driver/settings/voice` | `pages/driver/DriverVoice.tsx` | Voice AI settings (wake word, voice selection) | ⚠️ Import error |
| `/settings` | `pages/Settings.tsx` | General app settings |

## 2.4 Supporting Components

| Component | File | What It Does |
|-----------|------|--------------|
| LiveSpotter | `components/LiveSpotter.tsx` | Real-time car proximity detection, callouts |
| SpotterDataPanel | `components/SpotterDataPanel.tsx` | Track-specific spotter briefing data |
| EngineerDataPanel | `components/EngineerDataPanel.tsx` | Strategy/setup data for engineer |
| AnalystDataPanel | `components/AnalystDataPanel.tsx` | Telemetry data for analyst |
| BriefingCard | `pages/driver/states/BriefingCard.tsx` | Pre-race briefing display |
| DebriefCard | `pages/driver/states/DebriefCard.tsx` | Post-race debrief display |
| LiveCockpit | `pages/driver/states/LiveCockpit.tsx` | In-session live view |
| ProgressView | `pages/driver/states/ProgressView.tsx` | Development progress summary |
| SeasonView | `pages/driver/states/SeasonView.tsx` | Season overview |

## 2.5 Driver Services (API Layer)

| Service | File | What It Does |
|---------|------|--------------|
| Driver Service | `lib/driverService.ts` | Profile, sessions, stats, track performance |
| Driver Development | `lib/driverDevelopment.ts` | IDP data, memories, targets, coaching |
| Driver Profile | `lib/driverProfile.ts` | Profile management |

---

# 3. TEAMBOX TIER (Team Tools) — $26/mo

## 3.1 Team Management

| Route | File | What It Does |
|-------|------|--------------|
| `/teams` | `pages/Teams.tsx` | List of user's teams |
| `/create-team` | `pages/CreateTeam.tsx` | Create new team |
| `/team/:teamId` | `pages/TeamDashboard.tsx` | Team overview, members, recent activity |
| `/team/:teamId/settings` | `pages/TeamSettings.tsx` | Team configuration, roles, invites |

## 3.2 Pitwall (Team Operations Center)

| Route | File | What It Does |
|-------|------|--------------|
| `/team/:teamId/pitwall` | `pages/pitwall/PitwallHome.tsx` | Pitwall dashboard with department links |
| `/team/:teamId/pitwall/strategy` | `pages/pitwall/PitwallStrategy.tsx` | Race strategy — fuel, tires, pit windows |
| `/team/:teamId/pitwall/practice` | `pages/pitwall/PitwallPractice.tsx` | Practice session analysis, driver comparison |
| `/team/:teamId/pitwall/roster` | `pages/pitwall/PitwallRoster.tsx` | Driver roster, availability, performance |
| `/team/:teamId/pitwall/planning` | `pages/pitwall/PitwallPlanning.tsx` | Event scheduling, prep checklists |
| `/team/:teamId/pitwall/race` | `pages/pitwall/TeamRaceViewer.tsx` | Live race view — stints, driver rotation, telemetry |

## 3.3 Supporting Components

| Component | File | What It Does |
|-----------|------|--------------|
| PitwallWelcome | `components/PitwallWelcome.tsx` | Onboarding for new pitwall users |
| PitwallLayout | `layouts/PitwallLayout.tsx` | Sidebar navigation for pitwall |
| DriverProfile (Pitwall) | `pages/pitwall/DriverProfile.tsx` | Team view of driver profile |
| PitwallEvents | `pages/pitwall/PitwallEvents.tsx` | Team event calendar |
| PitwallReports | `pages/pitwall/PitwallReports.tsx` | Performance reports |

---

# 4. LEAGUEBOX TIER (League Control) — $42/mo

## 4.1 League Management

| Route | File | What It Does |
|-------|------|--------------|
| `/leagues` | `pages/Leagues.tsx` | List of user's leagues |
| `/create-league` | `pages/CreateLeague.tsx` | Create new league |
| `/league/:leagueId` | `pages/LeagueDashboard.tsx` | League overview, members, events, steward actions |
| `/league/:leagueId/settings` | `pages/LeagueSettings.tsx` | League configuration, roles, rules |

## 4.2 Race Control & Stewarding

| Route | File | What It Does |
|-------|------|--------------|
| `/league/:leagueId/incidents` | `pages/LeagueIncidents.tsx` | Incident queue for review |
| `/league/:leagueId/incident/:incidentId` | `pages/LeagueIncidentDetail.tsx` | Individual incident review with video, verdict |
| `/league/:leagueId/rulebook/:rulebookId` | `pages/LeagueRulebook.tsx` | Rulebook viewer/editor |
| `/league/:leagueId/penalties` | `pages/LeaguePenalties.tsx` | Penalty history and management |

## 4.3 Championship & Events

| Route | File | What It Does |
|-------|------|--------------|
| `/league/:leagueId/championship` | `pages/LeagueChampionship.tsx` | Championship standings, points, results |
| (via dashboard) | `pages/CreateEvent.tsx` | Schedule new league event |
| (via dashboard) | `pages/EventView.tsx` | View event details |

---

# 5. SHARED COMPONENTS

## 5.1 Layouts

| Component | File | What It Does |
|-----------|------|--------------|
| AppLayout | `components/layout/AppLayout.tsx` | Main app shell |
| AuthLayout | `components/layout/AuthLayout.tsx` | Auth page wrapper |
| DriverLayout | `layouts/DriverLayout.tsx` | Driver tier navigation |
| PitwallLayout | `layouts/PitwallLayout.tsx` | Pitwall sidebar |

## 5.2 Track Visualization

| Component | File | What It Does |
|-----------|------|--------------|
| TrackMap | `components/TrackMap.tsx` | Basic track map display |
| TrackMapPro | `components/TrackMapPro/index.tsx` | Advanced track map with controls |
| TrackControls | `components/TrackMapPro/TrackControls.tsx` | Map zoom/pan controls |
| TrackGhosts | `components/TrackMapPro/TrackGhosts.tsx` | Ghost car overlays |
| TrackLabels | `components/TrackMapPro/TrackLabels.tsx` | Corner/sector labels |
| TrackVisuals | `components/TrackMapPro/TrackVisuals.tsx` | Track surface rendering |
| TrackMapRive | `components/TrackMapRive.tsx` | Rive-animated track map |
| TrackDataPanel | `components/TrackDataPanel.tsx` | Track info display |
| TrackDetailModal | `components/TrackDetailModal.tsx` | Track detail popup |

## 5.3 Driver Components

| Component | File | What It Does |
|-----------|------|--------------|
| IdentityPanel | `components/driver/IdentityPanel.tsx` | Driver identity card |
| BriefingPanel | `components/driver/BriefingPanel.tsx` | Pre-race briefing |
| DriverRadar | `components/driver/DriverRadar.tsx` | Skill radar chart |
| MentalStatePanel | `components/driver/MentalStatePanel.tsx` | Mental state tracking |
| VerdictPanel | `components/driver/VerdictPanel.tsx` | Race verdict display |

## 5.4 Brand & UI

| Component | File | What It Does |
|-----------|------|--------------|
| ObbBrandMark | `components/brand/ObbBrandMark.tsx` | Logo component |
| SurfaceHeader | `components/brand/SurfaceHeader.tsx` | Branded header |
| ObbCard | `components/ui/ObbCard.tsx` | Styled card component |
| FeatureGate | `components/FeatureGate.tsx` | Tier-based feature gating |
| HelpTooltip | `components/HelpTooltip.tsx` | Help tooltips |

---

# 6. BACKEND & INFRASTRUCTURE

## 6.1 API Server (`packages/server/`)

| Endpoint Group | What It Does |
|----------------|--------------|
| `/api/v1/drivers/*` | Driver profile, sessions, stats, development |
| `/api/v1/teams/*` | Team management, members, roles |
| `/api/v1/leagues/*` | League management, events, incidents |
| `/api/v1/schedule/*` | Upcoming races |
| `/api/v1/auth/*` | Authentication, OAuth |

## 6.2 Relay Agent (`apps/relay-agent/`)

| Feature | What It Does |
|---------|--------------|
| iRacing SDK | Connects to iRacing telemetry |
| WebSocket | Streams data to frontend |
| Session Detection | Detects session state changes |

## 6.3 Hooks & Context

| Hook/Context | File | What It Does |
|--------------|------|--------------|
| useRelay | `hooks/useRelay.tsx` | Real-time telemetry subscription |
| useAuth | `contexts/AuthContext.tsx` | Authentication state |

---

# 7. PAGES NEEDED (Not Yet Built)

Based on product vision, these features are mentioned but don't have dedicated pages:

| Feature | Tier | Notes |
|---------|------|-------|
| Broadcast Graphics | LeagueBox | RaceBox Plus — timing tower, battle detection |
| Replay Viewer | LeagueBox | Incident replay with telemetry overlay |
| Voice Settings | BlackBox | `/driver/settings/voice` exists but has import error |
| HUD Settings | BlackBox | `/driver/settings/hud` exists but has import error |
| Driver Comparison | TeamBox | Side-by-side telemetry comparison |
| Stint Planner | TeamBox | Pre-race stint planning tool |
| Weather Integration | All | Weather forecast display |

---

# 8. WHAT EACH PAGE ALREADY DOES

## BlackBox (Driver)

| Page | Current Functionality |
|------|----------------------|
| **DriverCockpit** | Session state detection (idle/briefing/live/debrief), displays appropriate card, quick links to crew |
| **DriverSessions** | Lists recent sessions with track, series, position, incidents; filtering by discipline |
| **DriverStats** | Career totals (starts, wins, top5s, poles), averages, incident rate |
| **DriverRatings** | iRating/SR history charts, license display per discipline |
| **DriverProgress** | Skill tree with levels, focus areas with drills, learning moments, goals, coaching notes |
| **EngineerChat** | Chat interface with AI engineer, strategy questions, setup advice |
| **SpotterChat** | Live/Track/Chat tabs — live proximity, track briefing, chat with spotter AI |
| **AnalystChat** | Chat interface with AI analyst, telemetry questions |

## TeamBox (Team)

| Page | Current Functionality |
|------|----------------------|
| **TeamDashboard** | Team overview, member list, recent activity |
| **PitwallHome** | Department tiles (Race Viewer, Strategy, Practice, Roster, Planning), system status |
| **PitwallStrategy** | Stint planning, fuel calc, tire strategy, pit windows |
| **PitwallPractice** | Session analysis, lap times, driver comparison |
| **PitwallRoster** | Driver profiles, availability, performance metrics |
| **PitwallPlanning** | Event calendar, prep checklists, availability |
| **TeamRaceViewer** | Endurance mode (stint timeline, driver queue) or Multidriver mode (roster grid), live telemetry |

## LeagueBox (League)

| Page | Current Functionality |
|------|----------------------|
| **LeagueDashboard** | League overview, member list, events, steward action links |
| **LeagueSettings** | League config, roles, rules |
| **LeagueIncidents** | Incident queue with status (pending/reviewed/closed) |
| **LeagueIncidentDetail** | Video embed, driver statements, verdict form, penalty assignment |
| **LeagueRulebook** | Rulebook display with sections |
| **LeaguePenalties** | Penalty history, active penalties, points deductions |
| **LeagueChampionship** | Standings table, points system, driver results, upcoming rounds |
| **CreateEvent** | Event scheduling form |

---

# 9. FILE LOCATION QUICK REFERENCE

```
apps/app/src/
├── pages/
│   ├── auth/           # Login, Signup, Password Reset
│   ├── driver/         # BlackBox tier pages
│   │   ├── crew/       # AI crew chat interfaces
│   │   └── states/     # Session state cards
│   └── pitwall/        # TeamBox tier pages
├── components/
│   ├── brand/          # Logo, headers
│   ├── driver/         # Driver-specific components
│   ├── layout/         # App layouts
│   ├── ui/             # Generic UI components
│   └── TrackMapPro/    # Advanced track visualization
├── contexts/           # React contexts (Auth)
├── hooks/              # Custom hooks (useRelay)
├── layouts/            # Page layouts
└── lib/                # API services, utilities
```

---

# 10. SUMMARY

| Tier | Pages Built | Status |
|------|-------------|--------|
| **Auth** | 5 | ✅ Complete |
| **BlackBox** | 10+ | ✅ Complete (2 settings pages have import issues) |
| **TeamBox** | 8 | ✅ Complete |
| **LeagueBox** | 9 | ✅ Complete |
| **Components** | 26 | ✅ Complete |

**Total Pages:** 51  
**Total Components:** 26  
**Remaining Work:** Fix DriverHUD/DriverVoice imports, connect to real data, broadcast graphics
