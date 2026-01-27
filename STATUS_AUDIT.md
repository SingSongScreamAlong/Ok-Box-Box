# Ok, Box Box - Full Project Status Audit
**Date:** January 26, 2026

---

## Executive Summary

The platform has three tiers (Driver, Team, League) with substantial infrastructure built but several key features incomplete or missing. The core architecture is solid with a well-designed database schema, API routes, and frontend structure.

---

## 1. DRIVER TIER

### Pages & Routes

| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Cockpit/Home | `/driver/home` | ✅ Complete | Crew cards, relay status, quick links |
| Engineer Chat | `/driver/crew/engineer` | ✅ Complete | Chat UI with sidebar, video bg |
| Spotter Chat | `/driver/crew/spotter` | ⚠️ Partial | Chat UI exists, but uses mock responses, no real spotter logic |
| Analyst Chat | `/driver/crew/analyst` | ✅ Complete | Chat UI with sidebar |
| Progress | `/driver/progress` | ✅ Complete | Development-focused redesign done |
| Sessions | `/driver/sessions` | ✅ Functional | Connected to real data, old visual style |
| Stats | `/driver/stats` | ✅ Functional | Connected to real data, old visual style |
| Ratings | `/driver/ratings` | ❓ Unknown | Exists but not in main nav |
| Profile | `/driver/profile` | ✅ Functional | Driver profile page |
| HUD Settings | `/driver/settings/hud` | ❓ Unknown | Exists in routes |
| Voice Settings | `/driver/settings/voice` | ❓ Unknown | Exists in routes |

### Backend Services

| Service | Status | Notes |
|---------|--------|-------|
| Driver Memory System | ✅ Schema Complete | `014_driver_memory.sql` - tables for memory, behaviors, opinions, identity |
| Driver Development Engine | ⚠️ Partial | `services/driver-development/` - analyzer, generator, tracker, detector exist but not wired up |
| Voice API | ✅ Complete | `/voice/query` - Whisper STT → AI → ElevenLabs TTS |
| iRacing OAuth | ✅ Complete | OAuth flow for iRacing account linking |
| Telemetry Gateway | ✅ Complete | Receives relay data, caches for voice |

### What's Missing - Driver Tier

1. **Spotter System** - Real-time callouts during racing (traffic, flags, gaps)
2. **API endpoints** for driver memory/development data
3. **Connection** between Progress page and real driver data
4. **Session behavior analysis** - telemetry → driver_session_behaviors pipeline

---

## 2. TEAM TIER

### Pages & Routes

| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Teams List | `/teams` | ✅ Complete | List user's teams |
| Create Team | `/create-team` | ✅ Complete | Team creation form |
| Team Dashboard | `/team/:teamId` | ✅ Complete | Basic dashboard with members |
| Team Settings | `/team/:teamId/settings` | ✅ Functional | Settings page |
| Pitwall Home | `/team/:teamId/pitwall` | ✅ Complete | Live telemetry dashboard |
| Pitwall Strategy | `/team/:teamId/pitwall/strategy` | ⚠️ Exists | Fuel calc, pit windows |
| Pitwall Practice | `/team/:teamId/pitwall/practice` | ⚠️ Exists | Session analysis |
| Pitwall Roster | `/team/:teamId/pitwall/roster` | ⚠️ Exists | Driver profiles |
| Pitwall Planning | `/team/:teamId/pitwall/planning` | ⚠️ Exists | Event schedule |

### Backend Services

| Service | Status | Notes |
|---------|--------|-------|
| Team System | ✅ Schema Complete | `012_team_system.sql`, `013_team_invites_snapshots.sql` |
| Teams API | ✅ Complete | `/teams`, `/v1/teams` routes |

### What's Missing - Team Tier

1. **Team Race Viewer** - Live multi-driver telemetry with stint management
   - Endurance format (driver swaps, stint tracking)
   - Multi-driver format (parallel driver monitoring)
2. **Team-specific layouts** - No dedicated TeamLayout component
3. **Stint management UI** - Driver swap planning, stint history

---

## 3. LEAGUE TIER

### Pages & Routes

| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Leagues List | `/leagues` | ✅ Complete | List user's leagues |
| Create League | `/create-league` | ✅ Complete | League creation form |
| League Dashboard | `/league/:leagueId` | ✅ Complete | Events, members, steward actions |
| League Settings | `/league/:leagueId/settings` | ✅ Functional | Settings page |
| Incidents | `/league/:leagueId/incidents` | ✅ Functional | Incident queue |
| Incident Detail | `/league/:leagueId/incident/:id` | ✅ Functional | Single incident view |
| Penalties | `/league/:leagueId/penalties` | ✅ Functional | Penalty management |
| Rulebook | `/league/:leagueId/rulebook/:id` | ✅ Functional | Rulebook viewer |

### Backend Services

| Service | Status | Notes |
|---------|--------|-------|
| Leagues API | ✅ Complete | Full CRUD, memberships, roles |
| Incidents API | ✅ Complete | Incident submission, review |
| Penalties API | ✅ Complete | Penalty management |
| Rulebooks API | ✅ Complete | Rulebook CRUD |
| Rulebook AI | ✅ Complete | AI interpretation of rules |
| Protests/Appeals | ✅ Complete | Protest system |
| Steward Panels | ✅ Complete | Voting panels |
| Scoring Engine | ✅ Complete | Points calculation |

### What's Missing - League Tier

1. **Championship/Season management** - Series, seasons, standings
2. **Event creation flow** - `/league/:leagueId/create-event` route missing
3. **Driver standings page** - Championship points view
4. **Schedule/Calendar view** - Season calendar
5. **Member management UI** - Invite flow, role assignment

---

## 4. INFRASTRUCTURE

### Database Migrations (18 total)

| Migration | Status | Description |
|-----------|--------|-------------|
| 001_initial | ✅ | Core tables |
| 002_discipline_profiles | ✅ | Discipline profiles |
| 003_licensing_auth | ✅ | Auth system |
| 004_events_discord | ✅ | Events, Discord |
| 004_iracing_oauth | ✅ | iRacing OAuth |
| 004_lap_data | ✅ | Lap data storage |
| 005_entitlements | ✅ | Billing entitlements |
| 005_iracing_profiles | ✅ | iRacing profile sync |
| 005_scoring | ✅ | Scoring system |
| 006_paints | ✅ | Livery management |
| 007_rulebook_ai | ✅ | AI rulebook interpretation |
| 008_protests_appeals | ✅ | Protest system |
| 009_evidence | ✅ | Video evidence |
| 010_entitlement_v1_fields | ✅ | Entitlement updates |
| 011_individual_driver_profile | ✅ | Driver profiles |
| 012_team_system | ✅ | Team system |
| 013_team_invites_snapshots | ✅ | Team invites |
| 014_driver_memory | ✅ | Driver memory system |

### API Routes (44 route files)

Core routes are complete. Key routes:
- `/auth` - Authentication
- `/leagues` - League management
- `/teams` - Team management
- `/incidents` - Incident handling
- `/penalties` - Penalty management
- `/voice` - Voice AI
- `/sessions` - Session data
- `/profiles` - Driver profiles
- `/oauth/iracing` - iRacing OAuth

### Apps

| App | Status | Description |
|-----|--------|-------------|
| `apps/app` | ✅ Active | Main web application |
| `apps/relay` | ✅ Active | Python iRacing relay |
| `apps/website` | ✅ Active | Marketing website |
| `apps/blackbox` | ❓ Unknown | Purpose unclear |
| `apps/launcher` | ❓ Unknown | Desktop launcher? |
| `apps/racebox` | ❓ Unknown | Purpose unclear |

---

## 5. PRIORITY BUILD LIST

### P0 - Critical Missing Features

1. **Team Race Viewer** - Core team feature
   - Endurance mode (stint tracking, driver swaps)
   - Multi-driver mode (parallel monitoring)
   - Live telemetry for all team drivers

2. **Spotter System** - Core driver feature
   - Real-time traffic callouts
   - Gap tracking
   - Flag notifications
   - Integration with voice system

3. **League System Completion**
   - Championship/season management
   - Event creation flow
   - Standings pages
   - Calendar view

### P1 - Engine & Data Connection

4. **Driver Development Engine**
   - Wire up existing analyzer/generator/tracker
   - Create API endpoints for Progress page
   - Build telemetry → session_behaviors pipeline
   - Connect to driver_memory tables

5. **API Connections**
   - Progress page → real driver data
   - Sessions/Stats pages → already connected ✅
   - Team pages → real team data

### P2 - Polish & Enhancement

6. **Visual Consistency**
   - Restyle Sessions page (sidebar + video bg)
   - Restyle Stats page (sidebar + video bg)

7. **Settings & Configuration**
   - Voice preferences
   - HUD configuration
   - Notification settings

8. **Onboarding**
   - First-time user flow
   - iRacing connection wizard

---

## 6. TECHNICAL DEBT

1. **Unused imports** - Various lint warnings across files
2. **Mock data** - Progress page, Spotter chat using mock responses
3. **Missing error handling** - Some API calls lack proper error states
4. **Inconsistent styling** - Some pages use old visual style

---

## 7. NEXT STEPS (Recommended Order)

1. **Team Race Viewer** - Build endurance + multidriver formats
2. **Spotter System** - Real-time callout logic
3. **League System** - Championship management, event creation
4. **Driver Development Engine** - Refine and connect
5. **API Connections** - Wire all pages to real data
6. **Polish** - Visual consistency, settings, onboarding

