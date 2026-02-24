# OKBoxBox — Full Platform Audit (Part 3)
## Frontend App Audit (`apps/app`)

---

## 1. APP STRUCTURE

- **Router:** React Router v6 with nested layouts (Auth, Driver, Team, League)
- **State:** React Context (Auth, Relay, DevAudit) + 14 custom hooks
- **Styling:** TailwindCSS with dark theme
- **Icons:** Lucide React
- **Error handling:** ErrorBoundary + RouteErrorBoundary
- **Feature gating:** `FeatureGate` component checks entitlements

---

## 2. ROUTE ARCHITECTURE (42 pages, 4 layouts)

### Auth Routes (public)
| Route | Component | Purpose |
|-------|-----------|---------|
| `/login` | Login | Email/password + social login |
| `/signup` | Signup | Account creation |
| `/forgot-password` | ForgotPassword | Password reset request |
| `/auth/reset-password` | ResetPassword | Password reset form |
| `/auth/callback` | AuthCallback | Supabase OAuth callback |
| `/oauth/iracing/callback` | IRacingCallback | iRacing OAuth callback |

### Driver Routes (protected, DriverLayout)
| Route | Component | Size | Purpose |
|-------|-----------|------|---------|
| `/driver/home` | DriverLanding | 52KB | Main dashboard — 5-state machine (briefing→live→debrief→progress→season) |
| `/driver/cockpit` | DriverCockpit | 24KB | Full telemetry dashboard |
| `/driver/history` | DriverHistory | 35KB | Session history browser |
| `/driver/ratings` | DriverRatings | 8KB | iRating/SR tracking |
| `/driver/profile` | DriverProfilePage | 16KB | IDP display |
| `/driver/crew/engineer` | EngineerChat | 15KB | AI engineer chat |
| `/driver/crew/spotter` | SpotterChat | 15KB | AI spotter chat |
| `/driver/crew/analyst` | AnalystChat | 16KB | AI analyst chat |
| `/driver/progress` | DriverProgress | 47KB | Development tracking |
| `/driver/replay/:sessionId` | ReplayViewer | 30KB | Session replay |
| `/driver/settings/hud` | DriverHUD | 11KB | HUD configuration |
| `/driver/settings/voice` | DriverVoice | 15KB | Voice settings |

### Team Routes (protected, TeamLayout)
| Route | Component | Size | Purpose |
|-------|-----------|------|---------|
| `/team/:teamId` | TeamDashboard | 14KB | Team overview |
| `/team/:teamId/settings` | TeamSettings | 11KB | Team config |
| `/team/:teamId/pitwall` | PitwallHome | 65KB | Full pit wall (LARGEST PAGE) |
| `/team/:teamId/pitwall/strategy` | PitwallStrategy | 32KB | Strategy planning |
| `/team/:teamId/pitwall/practice` | PitwallPractice | 33KB | Practice management |
| `/team/:teamId/pitwall/roster` | PitwallRoster | 14KB | Team roster |
| `/team/:teamId/pitwall/planning` | PitwallPlanning | 13KB | Race weekend planning |
| `/team/:teamId/pitwall/race-plan` | RacePlan | 25KB | Race plan builder |
| `/team/:teamId/pitwall/race` | TeamRaceViewer | 36KB | Live race viewer |
| `/team/:teamId/pitwall/compare` | DriverComparison | 37KB | Driver comparison (110 TS errors) |
| `/team/:teamId/pitwall/stint-planner` | StintPlanner | 35KB | Endurance stint planning |
| `/team/:teamId/pitwall/events` | PitwallEvents | 6KB | Team events |
| `/team/:teamId/pitwall/reports` | PitwallReports | 13KB | Post-race reports |
| `/team/:teamId/pitwall/setups` | PitwallSetups | 6KB | Setup sharing |
| `/team/:teamId/pitwall/incidents` | TeamIncidents | 15KB | Team incidents |
| `/team/:teamId/pitwall/driver/:driverId` | PitwallDriverProfile | — | Driver profile (pitwall view) |

### League Routes (protected, LeagueLayout)
| Route | Component | Size | Purpose |
|-------|-----------|------|---------|
| `/league/:leagueId` | LeagueDashboard | 12KB | League overview |
| `/league/:leagueId/settings` | LeagueSettings | 11KB | League config |
| `/league/:leagueId/incidents` | LeagueIncidents | 10KB | Incident list |
| `/league/:leagueId/incident/:id` | LeagueIncidentDetail | 13KB | Incident detail |
| `/league/:leagueId/rulebook/:id` | LeagueRulebook | 18KB | Rulebook viewer |
| `/league/:leagueId/penalties` | LeaguePenalties | 11KB | Penalty management |
| `/league/:leagueId/championship` | LeagueChampionship | 28KB | Championship standings |
| `/league/:leagueId/protests` | LeagueProtests | 22KB | Protest system |
| `/league/:leagueId/steward-console` | StewardConsole | 26KB | Steward operations |
| `/league/:leagueId/broadcast` | BroadcastGraphics | 20KB | Broadcast overlays |
| `/league/:leagueId/create-event` | CreateEvent | — | Event creation |

### Public Routes (no auth)
| Route | Component | Purpose |
|-------|-----------|---------|
| `/league/:leagueId/timing` | PublicTiming (14KB) | Public timing page |
| `/rco` | RaceControlTest (14KB) | Race control testing |
| `/download` | DownloadPage (5KB) | Relay download |

---

## 3. CUSTOM HOOKS (14)

| Hook | Size | Purpose |
|------|------|---------|
| `useRelay` | 17.7KB | WebSocket lifecycle, telemetry, session, incidents, engineer updates, race intelligence, spotter callouts |
| `useDriverMemory` | 15KB | Driver memory CRUD, identity, opinions, personality derivation |
| `useTeamData` | 13.1KB | Team data, members, events, strategy |
| `useEngineer` | 9.3KB | AI engineer personality, messages, briefings, verdicts, mental state |
| `useDriverData` | 6.7KB | Driver profile data fetching |
| `useTrackData` | 6.6KB | Track intelligence data |
| `useVoice` | 5.4KB | Voice recording + PTT |
| `useLeagueData` | 5.3KB | League data fetching |
| `useEntitlements` | 4.9KB | Entitlement/capability checking |
| `useNearbyCars` | 4.6KB | Nearby car detection from standings |
| `useDriverState` | 4.4KB | Driver state machine (briefing→live→debrief→progress→season) |
| `useLiveTelemetry` | 3.9KB | Simplified telemetry access |
| `useRaceSimulation` | 3.9KB | Race simulation for testing |
| `useTheme` | 1.6KB | Theme management |

### Key Hook: `useRelay`
The central nervous system of the frontend. Manages:
- Socket.IO connection to server
- Session lifecycle (start/end/active)
- Real-time telemetry state
- Standings/position data
- Incident detection events
- Engineer update stream
- Race intelligence accumulation
- Spotter callout integration
- Telemetry cache for voice queries

### Key Hook: `useEngineer`
Orchestrates the AI engineer experience:
- Consumes `useRelay` data
- Feeds telemetry to `EngineerCore`
- Processes race intelligence for voice callouts
- Manages engineer message history
- Handles briefing/debrief generation

---

## 4. SERVICES (3)

### EngineerCore (`EngineerCore.ts`, 34KB)
The opinionated race engineer personality engine:
- **Personality system:** confidence level, communication style, opinion strength
- **Mental state monitoring:** tilt, fatigue, confidence, focus, overdriving detection
- **Live telemetry callouts:** fuel warnings, tire warnings, damage alerts, gap changes
- **Race intelligence callouts:** tire cliff, overtake opportunity, under threat, pit window, mental fatigue
- **Session lifecycle:** briefings, verdicts, driver assessments
- **Cooldown system:** prevents callout spam
- **Track reminders:** corner-specific advice

### RacecraftIntelligence (`RacecraftIntelligence.ts`, 10.6KB)
- Gap management analysis
- Overtake detection and scoring
- Defensive positioning assessment
- Traffic pattern recognition

### VoiceService (`VoiceService.ts`, 6.7KB)
- Client-side audio recording (MediaRecorder API)
- Base64 encoding for transmission
- Audio playback management
- PTT state management

---

## 5. KEY COMPONENTS (20+)

| Component | Size | Purpose |
|-----------|------|---------|
| `LiveSpotter` | 19KB | Real-time spotter view (shareable, read-only) |
| `DevAuditOverlay` | 24KB | Development audit tool (dev only) |
| `InviteBuilder` | 27KB | Team invite link builder |
| `TrackDetailModal` | 14KB | Track detail popup |
| `SpotterDataPanel` | 14KB | Spotter AI data panel |
| `AnalystDataPanel` | 13KB | Analyst AI data panel |
| `EngineerDataPanel` | 13KB | Engineer AI data panel |
| `CreateGoalModal` | 11KB | Goal creation modal |
| `TrackDataPanel` | 10KB | Track intelligence display |
| `WeatherWidget` | 10KB | Weather conditions |
| `PitwallWelcome` | 9KB | Pitwall onboarding |
| `GoalCard` | 9KB | Goal display card |
| `TrackMap` | 6.5KB | SVG track map |
| `TrackMapPro/` | 5 files | Advanced track map with car positions |
| `PageWrapper` | 6KB | Consistent page layout |
| `HelpTooltip` | 6KB | Contextual help |
| `FeatureGate` | 4KB | Entitlement-based feature gating |
| `ErrorBoundary` | 4KB | React error boundary |
| `RouteErrorBoundary` | 3KB | Route-level error boundary |
| `Loading` | 1KB | Loading spinner |

### Component Sub-Directories
- `brand/` (3 items) — Logo, branding components
- `driver/` (8 items) — Driver-specific UI components
- `layout/` (2 items) — Layout components
- `ui/` (2 items) — Generic UI primitives

---

## 6. TYPESCRIPT HEALTH

### 189 errors across 25 files

**Top offenders:**

| File | Errors | Root Cause |
|------|--------|-----------|
| `DriverComparison.tsx` | 110 | `driver2` state is `null | DriverData` — used without null guards in JSX |
| `StewardConsole.tsx` | 13 | Various null safety |
| `BroadcastGraphics.tsx` | 11 | Various null safety |
| `PublicTiming.tsx` | 11 | Various null safety |
| `LeagueProtests.tsx` | 6 | Various |
| `StintPlanner.tsx` | 5 | Unused variables |
| `EngineerCore.ts` | 4 | Underscore-prefixed private fields (reserved) |
| `PitwallPractice.tsx` | 4 | Unused variables |
| `TrackMapPro/index.tsx` | 3 | Various |
| `ReplayViewer.tsx` | 4 | Various |
| Others (15 files) | 1-2 each | Unused imports/variables |

**Fix priority:**
1. `DriverComparison.tsx` — add `if (!driver2) return null` guard → eliminates 110 errors
2. League pages — null safety fixes → eliminates ~35 errors
3. Pitwall pages — unused variable cleanup → eliminates ~20 errors
4. Remaining — misc cleanup → eliminates ~24 errors

**Estimated total fix effort: 1 day**

---

## 7. FRONTEND TESTING

**Current state: ZERO frontend tests.**

This is the single largest quality gap in the platform.

**Recommended test targets (priority order):**
1. `useRelay` — WebSocket lifecycle, event handling
2. `useEngineer` — Message generation, callout logic
3. `EngineerCore` — Personality, mental state, callouts
4. `LiveCockpit` — Intelligence panel rendering
5. `DriverLanding` — State machine transitions
6. `FeatureGate` — Entitlement gating logic
