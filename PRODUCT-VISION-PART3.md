# OK, BOX BOX — PRODUCT VISION & DESIGN SPECIFICATION
## Part 3: User Flows, Data Models & API Specification

---

**Document Version:** 1.0  
**Created:** January 19, 2026  
**Author:** Cascade AI  

---

# 10. USER FLOWS

## 10.1 Onboarding Flow

### New User Registration
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              REGISTRATION FLOW                               │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
    │   LANDING   │────▶│   SIGN UP   │────▶│   VERIFY    │────▶│   PROFILE   │
    │    PAGE     │     │    FORM     │     │   EMAIL     │     │   SETUP     │
    └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                       │
                                                                       ▼
    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
    │   SURFACE   │◀────│   RELAY     │◀────│  SUBSCRIBE  │◀────│   iRACING   │
    │    HOME     │     │   SETUP     │     │   (opt)     │     │   LINK      │
    └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### Step Details

#### 1. Landing Page
- **URL:** `okboxbox.com`
- **Actions:** "Get Started" → Sign Up, "Sign In" → Login
- **Content:** Product overview, pricing, features

#### 2. Sign Up Form
- **Fields:**
  - Email address (required)
  - Password (required, min 8 chars)
  - Display name (required)
- **Validation:** Real-time, inline errors
- **OAuth:** Discord, Google options

#### 3. Email Verification
- **Trigger:** Verification email sent
- **Content:** 6-digit code or magic link
- **Expiry:** 24 hours
- **Resend:** Available after 60 seconds

#### 4. Profile Setup
- **Fields:**
  - Avatar upload (optional)
  - Timezone selection
  - Preferred units (metric/imperial)
- **Skip:** Allowed, defaults applied

#### 5. iRacing Link
- **Purpose:** Connect iRacing account for data sync
- **Method:** OAuth flow with iRacing
- **Data Retrieved:**
  - Customer ID
  - Display name
  - iRating
  - Safety rating
  - License class
- **Skip:** Allowed, limited functionality

#### 6. Subscription (Optional)
- **Display:** Product tier comparison
- **Actions:** Select tier, enter payment
- **Trial:** 14-day free trial for BlackBox
- **Skip:** Continues with free tier (RaceBox)

#### 7. Relay Setup
- **Purpose:** Install desktop telemetry relay
- **Content:** Download link, installation guide
- **Platforms:** Windows (primary), macOS (beta)
- **Skip:** Allowed, required for live telemetry

#### 8. Surface Home
- **Destination:** Main launchpad
- **State:** Shows available surfaces based on subscription

---

## 10.2 Driver Race Session Flow

### Pre-Race to Post-Race
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DRIVER SESSION FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
    │   START     │────▶│   RELAY     │────▶│   SESSION   │
    │   iRACING   │     │  CONNECTS   │     │  DETECTED   │
    └─────────────┘     └─────────────┘     └─────────────┘
                                                   │
                                                   ▼
    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
    │   RACE      │◀────│    HUD      │◀────│   OPEN      │
    │   START     │     │   ACTIVE    │     │    HUD      │
    └─────────────┘     └─────────────┘     └─────────────┘
          │
          ▼
    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
    │   DURING    │────▶│   RACE      │────▶│   SESSION   │
    │   RACE      │     │   END       │     │   SAVED     │
    └─────────────┘     └─────────────┘     └─────────────┘
```

### Step Details

#### 1. Start iRacing
- **User Action:** Launch iRacing, join session
- **System:** Relay detects iRacing process

#### 2. Relay Connects
- **System:** Relay establishes WebSocket to server
- **Data:** Begins streaming telemetry
- **Indicator:** Relay tray icon turns green

#### 3. Session Detected
- **System:** Server creates session record
- **Data:** Track, car, session type captured
- **Notification:** Optional desktop notification

#### 4. Open HUD
- **User Action:** Navigate to `/driver/hud` or use hotkey
- **System:** HUD connects to session WebSocket
- **Display:** Real-time telemetry begins

#### 5. HUD Active
- **Display:** All telemetry panels active
- **AI:** Race engineer ready for PTT
- **Updates:** 60Hz telemetry, 1Hz positions

#### 6. Race Start
- **Trigger:** Session state changes to racing
- **AI:** "Green flag, green flag. Good luck."
- **HUD:** Full functionality enabled

#### 7. During Race
- **Continuous:** Telemetry streaming
- **PTT:** Driver can query AI anytime
- **AI Proactive:** Pit window alerts, gap changes
- **Events:** Logged for post-race review

#### 8. Race End
- **Trigger:** Checkered flag or session end
- **AI:** "Checkered flag. P[X] finish. Good race."
- **System:** Final telemetry captured

#### 9. Session Saved
- **System:** Session data persisted
- **Available:** Session history, replay, analytics
- **Notification:** "Session saved" confirmation

---

## 10.3 Incident Review Flow (Steward)

### Incident Detection to Resolution
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          INCIDENT REVIEW FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
    │  INCIDENT   │────▶│     AI      │────▶│   ADDED     │
    │  DETECTED   │     │  CLASSIFIES │     │  TO QUEUE   │
    └─────────────┘     └─────────────┘     └─────────────┘
                                                   │
                                                   ▼
    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
    │   STEWARD   │────▶│   REVIEW    │────▶│   WATCH     │
    │   CLAIMS    │     │   MODAL     │     │   REPLAY    │
    └─────────────┘     └─────────────┘     └─────────────┘
                                                   │
                                                   ▼
    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
    │  DECISION   │────▶│   PENALTY   │────▶│   NOTIFY    │
    │   MADE      │     │   ISSUED    │     │   DRIVER    │
    └─────────────┘     └─────────────┘     └─────────────┘
```

### Step Details

#### 1. Incident Detected
- **Trigger:** Telemetry analysis detects contact/off-track
- **Data Captured:**
  - Timestamp and lap
  - Involved cars
  - Telemetry snapshot (speed, steering, throttle, brake)
  - Track position

#### 2. AI Classifies
- **Process:** AI analyzes telemetry patterns
- **Output:**
  - Incident type (contact, off-track, unsafe rejoin, etc.)
  - Severity (light, medium, heavy)
  - Suggested penalty
  - Confidence score
  - Reasoning text

#### 3. Added to Queue
- **System:** Incident added to pending review queue
- **Notification:** Stewards notified (in-app, Discord)
- **Priority:** Sorted by severity, then time

#### 4. Steward Claims
- **User Action:** Steward clicks "Review" on incident
- **System:** Incident locked to that steward
- **Timer:** Optional review time limit

#### 5. Review Modal
- **Display:** Full incident detail modal
- **Content:**
  - Video replay (if available)
  - Telemetry graphs
  - AI classification
  - Rulebook reference
  - Decision form

#### 6. Watch Replay
- **User Action:** Play video replay
- **Controls:** Play, pause, slow-mo, frame-by-frame
- **Views:** Multiple camera angles if available

#### 7. Decision Made
- **User Action:** Select decision from options
- **Options:**
  - No action required
  - Warning
  - Time penalty (5s, 10s, 15s, etc.)
  - Drive through
  - Disqualification
- **Required:** Driver at fault, notes

#### 8. Penalty Issued
- **System:** Penalty recorded in database
- **Audit:** Full decision logged with steward ID
- **Stats:** Driver penalty history updated

#### 9. Notify Driver
- **Channels:**
  - In-app notification
  - Discord DM (if configured)
  - Email (if configured)
- **Content:** Incident summary, decision, penalty

---

## 10.4 Rulebook Import Flow

### PDF to Active Rules
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          RULEBOOK IMPORT FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
    │   UPLOAD    │────▶│     AI      │────▶│   REVIEW    │
    │    PDF      │     │   PARSES    │     │   RULES     │
    └─────────────┘     └─────────────┘     └─────────────┘
                                                   │
                                                   ▼
    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
    │   RULES     │◀────│   APPROVE   │◀────│   EDIT      │
    │   ACTIVE    │     │   RULES     │     │   RULES     │
    └─────────────┘     └─────────────┘     └─────────────┘
```

### Step Details

#### 1. Upload PDF
- **User Action:** Drag PDF or click to upload
- **Validation:** File type, size limit (10MB)
- **Alternative:** Paste text directly

#### 2. AI Parses
- **Process:** GPT-4 extracts rules from document
- **Output:** Structured rule objects
- **Time:** 10-30 seconds depending on length

#### 3. Review Rules
- **Display:** List of extracted rules
- **Each Rule Shows:**
  - Name
  - Category (auto-assigned)
  - Description
  - Conditions
  - Penalty specification
  - Confidence indicator

#### 4. Edit Rules
- **User Action:** Click rule to edit
- **Editable:**
  - Name and description
  - Category assignment
  - Conditions (severity, contact type)
  - Penalty values
- **Delete:** Remove incorrectly parsed rules

#### 5. Approve Rules
- **User Action:** Click "Approve" on each rule or "Approve All"
- **Validation:** At least one rule required
- **Confirmation:** "X rules will be added to rulebook"

#### 6. Rules Active
- **System:** Rules added to active rulebook
- **Effect:** AI uses rules for incident classification
- **Audit:** Import logged with timestamp

---

## 10.5 Team Pit Wall Session Flow

### Strategist Monitoring Driver
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PIT WALL SESSION FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
    │   DRIVER    │────▶│   TEAM      │────▶│   OPEN      │
    │   IN SESSION│     │  NOTIFIED   │     │  DASHBOARD  │
    └─────────────┘     └─────────────┘     └─────────────┘
                                                   │
                                                   ▼
    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
    │   MONITOR   │────▶│   STRATEGY  │────▶│   VOICE     │
    │   TELEMETRY │     │   PLANNING  │     │   COMMS     │
    └─────────────┘     └─────────────┘     └─────────────┘
                                                   │
                                                   ▼
                        ┌─────────────┐
                        │   SESSION   │
                        │   COMPLETE  │
                        └─────────────┘
```

### Step Details

#### 1. Driver In Session
- **Trigger:** Team driver's relay connects
- **System:** Session associated with team

#### 2. Team Notified
- **Notification:** "Alex is now in session at Spa"
- **Channels:** In-app, Discord (if configured)

#### 3. Open Dashboard
- **User Action:** Navigate to `/team/dashboard`
- **System:** Dashboard connects to driver's session
- **Display:** Real-time telemetry begins

#### 4. Monitor Telemetry
- **Display:**
  - Race state (position, lap, gaps)
  - Car status (fuel, tires)
  - Opponent intel
  - Event log

#### 5. Strategy Planning
- **Tools:**
  - Pit window calculator
  - Fuel strategy simulator
  - Tire deg projections
- **AI Suggestions:** Proactive strategy recommendations

#### 6. Voice Comms
- **Method:** Integrated voice or external (Discord)
- **Content:** Relay strategy calls to driver
- **Example:** "Box this lap, box this lap"

#### 7. Session Complete
- **Trigger:** Race ends
- **System:** Session data saved
- **Available:** Post-race debrief, analytics

---

## 10.6 Broadcast Setup Flow

### Going Live
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BROADCAST SETUP FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
    │   SELECT    │────▶│  CONFIGURE  │────▶│   PREVIEW   │
    │   SESSION   │     │  OVERLAYS   │     │   CHECK     │
    └─────────────┘     └─────────────┘     └─────────────┘
                                                   │
                                                   ▼
    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
    │   MANAGE    │◀────│   GO LIVE   │◀────│   SET       │
    │   OVERLAYS  │     │             │     │   DELAY     │
    └─────────────┘     └─────────────┘     └─────────────┘
```

### Step Details

#### 1. Select Session
- **User Action:** Choose session to broadcast
- **Options:** Live sessions, upcoming scheduled
- **Display:** Session details (track, cars, start time)

#### 2. Configure Overlays
- **User Action:** Enable/disable overlay components
- **Components:**
  - Timing tower (position, style)
  - Lower third (driver info)
  - Battle box (threshold)
  - Incident banner (auto/manual)
- **Customization:** Colors, positions, branding

#### 3. Preview Check
- **Display:** Live preview of overlay configuration
- **Test:** Verify all elements display correctly
- **Adjust:** Fine-tune positions and styles

#### 4. Set Delay
- **User Action:** Select stream delay
- **Options:** 0s, 15s, 30s, 45s, 60s
- **Purpose:** Prevent stream sniping

#### 5. Go Live
- **User Action:** Click "Go Live" button
- **System:** Overlays begin updating
- **Indicator:** Live badge displayed

#### 6. Manage Overlays
- **During Broadcast:**
  - Toggle overlays on/off
  - Trigger lower thirds
  - Switch scene presets
  - Manual incident banners

---

# 11. DATA MODELS

## 11.1 User & Authentication

### User
```typescript
interface User {
  id: string;                    // UUID
  email: string;                 // Unique, verified
  passwordHash: string;          // bcrypt hash
  displayName: string;           // Public display name
  avatarUrl: string | null;      // Profile image URL
  timezone: string;              // IANA timezone
  preferredUnits: 'metric' | 'imperial';
  
  // iRacing Link
  iracingCustomerId: number | null;
  iracingDisplayName: string | null;
  iracingLinkedAt: Date | null;
  
  // Subscription
  subscriptionTier: 'free' | 'blackbox' | 'controlbox' | 'raceboxplus';
  subscriptionStatus: 'active' | 'past_due' | 'canceled' | 'trialing';
  subscriptionExpiresAt: Date | null;
  stripeCustomerId: string | null;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  emailVerifiedAt: Date | null;
}
```

### Team
```typescript
interface Team {
  id: string;                    // UUID
  name: string;                  // Team name
  slug: string;                  // URL-safe identifier
  logoUrl: string | null;        // Team logo
  primaryColor: string;          // Hex color
  secondaryColor: string;        // Hex color
  
  ownerId: string;               // User ID of owner
  
  createdAt: Date;
  updatedAt: Date;
}
```

### TeamMembership
```typescript
interface TeamMembership {
  id: string;
  teamId: string;
  userId: string;
  role: 'owner' | 'manager' | 'strategist' | 'driver';
  joinedAt: Date;
}
```

### League
```typescript
interface League {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
  
  ownerId: string;               // User ID of owner
  
  // Settings
  discordServerId: string | null;
  discordWebhookUrl: string | null;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### LeagueMembership
```typescript
interface LeagueMembership {
  id: string;
  leagueId: string;
  userId: string;
  role: 'owner' | 'admin' | 'steward' | 'broadcaster' | 'driver';
  joinedAt: Date;
}
```

---

## 11.2 Session & Telemetry

### Session
```typescript
interface Session {
  id: string;                    // UUID
  
  // iRacing Data
  iracingSessionId: number;      // iRacing subsession ID
  iracingTrackId: number;
  trackName: string;
  trackConfig: string | null;    // Track configuration name
  
  // Session Info
  sessionType: 'practice' | 'qualify' | 'race' | 'time_trial';
  sessionState: 'pending' | 'active' | 'finished';
  
  // Timing
  startedAt: Date;
  endedAt: Date | null;
  totalLaps: number | null;      // For races
  
  // Associations
  leagueId: string | null;       // If league session
  seriesId: string | null;       // If part of series
  
  createdAt: Date;
  updatedAt: Date;
}
```

### SessionParticipant
```typescript
interface SessionParticipant {
  id: string;
  sessionId: string;
  userId: string | null;         // Null if not linked
  
  // iRacing Data
  iracingCustomerId: number;
  carNumber: string;
  carId: number;
  carName: string;
  carClassId: number;
  
  // Results
  startPosition: number | null;
  finishPosition: number | null;
  lapsCompleted: number;
  bestLapTime: number | null;    // Milliseconds
  totalTime: number | null;      // Milliseconds
  incidents: number;             // iRacing incident count
  
  // Status
  status: 'running' | 'finished' | 'dnf' | 'dsq';
  dnfReason: string | null;
}
```

### TelemetrySnapshot
```typescript
interface TelemetrySnapshot {
  id: string;
  sessionId: string;
  participantId: string;
  
  timestamp: Date;
  lap: number;
  lapDistPct: number;            // 0-1 position on track
  
  // Motion
  speed: number;                 // m/s
  rpm: number;
  gear: number;                  // -1=R, 0=N, 1-7
  throttle: number;              // 0-1
  brake: number;                 // 0-1
  steering: number;              // Radians
  
  // Position
  posX: number;                  // Track coordinates
  posY: number;
  posZ: number;
  yaw: number;                   // Heading
  
  // Car State
  fuelLevel: number;             // Liters
  tireWearFL: number;            // 0-1
  tireWearFR: number;
  tireWearRL: number;
  tireWearRR: number;
  
  // Calculated
  gapAhead: number | null;       // Seconds
  gapBehind: number | null;
  position: number;
}
```

### LapTime
```typescript
interface LapTime {
  id: string;
  sessionId: string;
  participantId: string;
  
  lapNumber: number;
  lapTime: number;               // Milliseconds
  sector1: number | null;        // Milliseconds
  sector2: number | null;
  sector3: number | null;
  
  isPersonalBest: boolean;
  isSessionBest: boolean;
  isValid: boolean;              // No off-tracks, etc.
  
  fuelUsed: number;              // Liters
  tireWearDelta: number;         // Average wear this lap
  
  timestamp: Date;
}
```

---

## 11.3 Incidents & Penalties

### Incident
```typescript
interface Incident {
  id: string;
  sessionId: string;
  
  // Timing
  timestamp: Date;
  lap: number;
  lapDistPct: number;
  turnNumber: number | null;
  turnName: string | null;
  
  // Classification
  type: 'contact' | 'off_track' | 'unsafe_rejoin' | 'blocking' | 'pit_violation' | 'flag_violation';
  severity: 'light' | 'medium' | 'heavy';
  
  // AI Analysis
  aiClassification: {
    type: string;
    severity: string;
    suggestedPenalty: string;
    confidence: number;          // 0-1
    reasoning: string;
  };
  
  // Involved Parties
  involvedParticipants: string[]; // Participant IDs
  
  // Evidence
  telemetrySnapshotIds: string[];
  videoClipUrl: string | null;
  
  // Status
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';
  reviewedBy: string | null;     // User ID of steward
  reviewedAt: Date | null;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### Penalty
```typescript
interface Penalty {
  id: string;
  incidentId: string;
  sessionId: string;
  
  // Target
  participantId: string;
  userId: string | null;
  
  // Decision
  type: 'warning' | 'time_penalty' | 'drive_through' | 'stop_go' | 'disqualification' | 'points_deduction';
  value: number | null;          // Seconds for time penalty, points for deduction
  
  // Metadata
  notes: string | null;
  rulebookRuleId: string | null; // Reference to rule applied
  
  // Issued By
  issuedBy: string;              // User ID of steward
  issuedAt: Date;
  
  // Appeal
  appealStatus: 'none' | 'pending' | 'upheld' | 'overturned';
  appealNotes: string | null;
  appealReviewedBy: string | null;
  appealReviewedAt: Date | null;
}
```

### Rulebook
```typescript
interface Rulebook {
  id: string;
  leagueId: string;
  
  name: string;
  description: string | null;
  version: string;
  
  isActive: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### Rule
```typescript
interface Rule {
  id: string;
  rulebookId: string;
  
  name: string;
  description: string;
  category: 'contact' | 'track_limits' | 'pit_lane' | 'flags' | 'conduct' | 'other';
  
  // Conditions
  conditions: {
    incidentTypes: string[];     // Which incident types this applies to
    severities: string[];        // Which severities
    contactTypes: string[];      // Specific contact types
  };
  
  // Penalty Specification
  penaltySpec: {
    light: { type: string; value: number | null };
    medium: { type: string; value: number | null };
    heavy: { type: string; value: number | null };
  };
  
  isActive: boolean;
  sortOrder: number;
  
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 11.4 Driver Development

### DriverProfile
```typescript
interface DriverProfile {
  id: string;
  userId: string;
  teamId: string | null;
  
  // iRacing Stats (synced)
  irating: number;
  safetyRating: number;
  licenseClass: string;          // 'A', 'B', 'C', 'D', 'R'
  starts: number;
  wins: number;
  podiums: number;
  poles: number;
  lapsLed: number;
  avgIncidentsPerRace: number;
  
  // Ok, Box Box Analysis
  strengths: string[];
  areasForImprovement: string[];
  
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### DevelopmentPlan (IDP)
```typescript
interface DevelopmentPlan {
  id: string;
  driverProfileId: string;
  
  // Target Metrics
  targets: {
    metric: string;              // 'avg_finish', 'qualifying', 'incidents', 'consistency'
    current: number;
    target: number;
    deadline: Date | null;
  }[];
  
  // Focus Areas
  focusAreas: {
    area: string;
    description: string;
    exercises: string[];
    status: 'not_started' | 'in_progress' | 'completed';
  }[];
  
  // Notes
  notes: string | null;
  
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 11.5 Broadcast

### BroadcastConfig
```typescript
interface BroadcastConfig {
  id: string;
  leagueId: string;
  
  name: string;
  
  // Branding
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  
  // Overlay Settings
  timingTower: {
    enabled: boolean;
    position: 'top-left' | 'top-right';
    style: 'compact' | 'expanded';
    showGaps: boolean;
    showLastLap: boolean;
  };
  
  lowerThird: {
    enabled: boolean;
    autoShow: boolean;
    duration: number;            // Seconds
  };
  
  battleBox: {
    enabled: boolean;
    threshold: number;           // Seconds gap to trigger
    autoDetect: boolean;
  };
  
  incidentBanner: {
    enabled: boolean;
    autoShow: boolean;
    duration: number;
  };
  
  // Stream Settings
  defaultDelay: number;          // Seconds
  
  createdAt: Date;
  updatedAt: Date;
}
```

### BroadcastSession
```typescript
interface BroadcastSession {
  id: string;
  sessionId: string;
  broadcastConfigId: string;
  
  // State
  isLive: boolean;
  streamDelay: number;
  
  // Active Overlays
  activeOverlays: string[];      // ['timing_tower', 'battle_box']
  
  // Current Scene
  currentScenePreset: string | null;
  
  startedAt: Date | null;
  endedAt: Date | null;
  
  createdAt: Date;
}
```

---

# 12. API SPECIFICATION

## 12.1 API Overview

### Base URL
```
Production: https://api.okboxbox.com/v1
Staging: https://api.staging.okboxbox.com/v1
```

### Authentication
All authenticated endpoints require Bearer token:
```
Authorization: Bearer <access_token>
```

### Response Format
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-01-19T12:00:00Z"
  }
}
```

### Error Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "field": "email",
      "constraint": "email"
    }
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-01-19T12:00:00Z"
  }
}
```

### Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## 12.2 Authentication Endpoints

### POST /auth/register
Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "displayName": "RacerAlex"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_abc123",
      "email": "user@example.com",
      "displayName": "RacerAlex"
    },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

### POST /auth/login
Authenticate and receive tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

### POST /auth/refresh
Refresh access token.

**Request:**
```json
{
  "refreshToken": "eyJ..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

### POST /auth/logout
Invalidate refresh token.

**Request:**
```json
{
  "refreshToken": "eyJ..."
}
```

### POST /auth/verify-email
Verify email with code.

**Request:**
```json
{
  "code": "123456"
}
```

### POST /auth/forgot-password
Request password reset.

**Request:**
```json
{
  "email": "user@example.com"
}
```

### POST /auth/reset-password
Reset password with token.

**Request:**
```json
{
  "token": "reset_token_here",
  "newPassword": "newsecurepassword123"
}
```

---

## 12.3 User Endpoints

### GET /users/me
Get current user profile.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "displayName": "RacerAlex",
    "avatarUrl": "https://...",
    "timezone": "America/New_York",
    "preferredUnits": "imperial",
    "iracingCustomerId": 123456,
    "iracingDisplayName": "Alex Thompson",
    "subscriptionTier": "blackbox",
    "subscriptionStatus": "active"
  }
}
```

### PATCH /users/me
Update current user profile.

**Request:**
```json
{
  "displayName": "NewName",
  "timezone": "Europe/London",
  "preferredUnits": "metric"
}
```

### POST /users/me/avatar
Upload avatar image.

**Request:** `multipart/form-data` with `avatar` file

### DELETE /users/me/avatar
Remove avatar image.

### POST /users/me/link-iracing
Initiate iRacing OAuth flow.

**Response:**
```json
{
  "success": true,
  "data": {
    "authUrl": "https://members.iracing.com/oauth/..."
  }
}
```

### POST /users/me/link-iracing/callback
Complete iRacing OAuth.

**Request:**
```json
{
  "code": "oauth_code_here"
}
```

---

## 12.4 Session Endpoints

### GET /sessions
List sessions for current user.

**Query Parameters:**
- `limit` (int, default 20)
- `offset` (int, default 0)
- `type` (string, optional): practice, qualify, race
- `from` (ISO date, optional)
- `to` (ISO date, optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "ses_abc123",
        "trackName": "Spa-Francorchamps",
        "sessionType": "race",
        "startedAt": "2026-01-19T12:00:00Z",
        "finishPosition": 3,
        "totalParticipants": 24
      }
    ],
    "total": 45
  }
}
```

### GET /sessions/:id
Get session details.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "ses_abc123",
    "trackName": "Spa-Francorchamps",
    "trackConfig": "Grand Prix",
    "sessionType": "race",
    "sessionState": "finished",
    "startedAt": "2026-01-19T12:00:00Z",
    "endedAt": "2026-01-19T13:30:00Z",
    "totalLaps": 24,
    "participants": [ ... ],
    "incidents": [ ... ]
  }
}
```

### GET /sessions/:id/telemetry
Get telemetry data for session.

**Query Parameters:**
- `participantId` (string, required)
- `from` (int, lap number)
- `to` (int, lap number)
- `resolution` (string): full, 1hz, summary

**Response:**
```json
{
  "success": true,
  "data": {
    "snapshots": [ ... ],
    "lapTimes": [ ... ]
  }
}
```

### GET /sessions/:id/live
Get live session state (WebSocket upgrade available).

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionState": "active",
    "currentLap": 12,
    "positions": [ ... ],
    "flags": "green"
  }
}
```

---

## 12.5 Incident Endpoints

### GET /incidents
List incidents.

**Query Parameters:**
- `sessionId` (string, optional)
- `leagueId` (string, optional)
- `status` (string, optional): pending, under_review, resolved, dismissed
- `severity` (string, optional): light, medium, heavy
- `limit` (int, default 20)
- `offset` (int, default 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "incidents": [
      {
        "id": "inc_abc123",
        "sessionId": "ses_xyz789",
        "timestamp": "2026-01-19T12:34:56Z",
        "lap": 11,
        "type": "contact",
        "severity": "medium",
        "status": "pending",
        "involvedDrivers": ["Hamilton", "Verstappen"]
      }
    ],
    "total": 15
  }
}
```

### GET /incidents/:id
Get incident details.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "inc_abc123",
    "sessionId": "ses_xyz789",
    "timestamp": "2026-01-19T12:34:56Z",
    "lap": 11,
    "lapDistPct": 0.456,
    "turnNumber": 5,
    "turnName": "Les Combes",
    "type": "contact",
    "severity": "medium",
    "aiClassification": {
      "type": "racing_contact",
      "severity": "medium",
      "suggestedPenalty": "5_second",
      "confidence": 0.78,
      "reasoning": "Contact occurred during legitimate overtaking..."
    },
    "involvedParticipants": [ ... ],
    "telemetrySnapshots": [ ... ],
    "videoClipUrl": "https://...",
    "status": "pending"
  }
}
```

### POST /incidents/:id/claim
Claim incident for review.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "inc_abc123",
    "status": "under_review",
    "reviewedBy": "usr_steward123"
  }
}
```

### POST /incidents/:id/resolve
Resolve incident with decision.

**Request:**
```json
{
  "decision": "penalty",
  "penaltyType": "time_penalty",
  "penaltyValue": 5,
  "driverAtFault": "par_hamilton123",
  "notes": "Failure to leave racing room at apex",
  "ruleId": "rule_contact_overtaking"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "incident": { ... },
    "penalty": { ... }
  }
}
```

### POST /incidents/:id/dismiss
Dismiss incident without action.

**Request:**
```json
{
  "reason": "Racing incident, no driver predominantly at fault"
}
```

---

## 12.6 Rulebook Endpoints

### GET /leagues/:leagueId/rulebooks
List rulebooks for league.

**Response:**
```json
{
  "success": true,
  "data": {
    "rulebooks": [
      {
        "id": "rb_abc123",
        "name": "GT3 Sprint Series 2026",
        "version": "1.2",
        "isActive": true,
        "rulesCount": 35
      }
    ]
  }
}
```

### POST /leagues/:leagueId/rulebooks
Create new rulebook.

**Request:**
```json
{
  "name": "GT3 Sprint Series 2026",
  "description": "Official rulebook for GT3 Sprint Series"
}
```

### GET /rulebooks/:id
Get rulebook with rules.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "rb_abc123",
    "name": "GT3 Sprint Series 2026",
    "rules": [
      {
        "id": "rule_abc123",
        "name": "Contact During Overtaking",
        "category": "contact",
        "description": "...",
        "conditions": { ... },
        "penaltySpec": { ... },
        "isActive": true
      }
    ]
  }
}
```

### POST /rulebooks/:id/rules
Add rule to rulebook.

**Request:**
```json
{
  "name": "Contact During Overtaking",
  "category": "contact",
  "description": "Drivers must leave racing room...",
  "conditions": {
    "incidentTypes": ["contact"],
    "severities": ["light", "medium", "heavy"]
  },
  "penaltySpec": {
    "light": { "type": "warning", "value": null },
    "medium": { "type": "time_penalty", "value": 5 },
    "heavy": { "type": "time_penalty", "value": 10 }
  }
}
```

### PATCH /rulebooks/:rulebookId/rules/:ruleId
Update rule.

### DELETE /rulebooks/:rulebookId/rules/:ruleId
Delete rule.

### POST /rulebooks/:id/import
Import rules from PDF/text.

**Request:** `multipart/form-data` with `document` file or `text` field

**Response:**
```json
{
  "success": true,
  "data": {
    "parsedRules": [
      {
        "name": "Contact During Overtaking",
        "category": "contact",
        "description": "...",
        "confidence": 0.92
      }
    ]
  }
}
```

### POST /rulebooks/:id/import/confirm
Confirm imported rules.

**Request:**
```json
{
  "rules": [
    {
      "name": "Contact During Overtaking",
      "category": "contact",
      "description": "...",
      "conditions": { ... },
      "penaltySpec": { ... }
    }
  ]
}
```

---

## 12.7 Team Endpoints

### GET /teams
List user's teams.

### POST /teams
Create new team.

**Request:**
```json
{
  "name": "Apex Racing",
  "primaryColor": "#3b82f6",
  "secondaryColor": "#1e40af"
}
```

### GET /teams/:id
Get team details.

### PATCH /teams/:id
Update team.

### GET /teams/:id/members
List team members.

### POST /teams/:id/members
Invite member to team.

**Request:**
```json
{
  "email": "driver@example.com",
  "role": "driver"
}
```

### DELETE /teams/:id/members/:memberId
Remove member from team.

### GET /teams/:id/drivers/:driverId/profile
Get driver profile.

### GET /teams/:id/drivers/:driverId/idp
Get driver's Individual Development Plan.

### PATCH /teams/:id/drivers/:driverId/idp
Update driver's IDP.

---

## 12.8 Broadcast Endpoints

### GET /leagues/:leagueId/broadcast-configs
List broadcast configurations.

### POST /leagues/:leagueId/broadcast-configs
Create broadcast configuration.

### GET /broadcast-configs/:id
Get broadcast configuration.

### PATCH /broadcast-configs/:id
Update broadcast configuration.

### POST /sessions/:sessionId/broadcast
Start broadcast session.

**Request:**
```json
{
  "configId": "bc_abc123",
  "streamDelay": 30
}
```

### PATCH /broadcast-sessions/:id
Update live broadcast (toggle overlays, change delay).

**Request:**
```json
{
  "activeOverlays": ["timing_tower", "battle_box"],
  "streamDelay": 45
}
```

### DELETE /broadcast-sessions/:id
End broadcast session.

---

## 12.9 AI Endpoints

### POST /ai/voice-query
Send voice query to AI race engineer.

**Request:**
```json
{
  "sessionId": "ses_abc123",
  "participantId": "par_xyz789",
  "audioBase64": "base64_encoded_audio...",
  "format": "webm"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transcript": "What's my gap to the leader?",
    "response": "Gap to P1 is 12.4 seconds. He's on a 1:33.2 pace, you're on 1:33.8.",
    "audioUrl": "https://..."
  }
}
```

### POST /ai/classify-incident
Get AI classification for incident.

**Request:**
```json
{
  "incidentId": "inc_abc123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "type": "racing_contact",
    "severity": "medium",
    "suggestedPenalty": "5_second",
    "confidence": 0.78,
    "reasoning": "Contact occurred during legitimate overtaking attempt..."
  }
}
```

### POST /ai/parse-rulebook
Parse rulebook document into structured rules.

**Request:** `multipart/form-data` with `document` file

**Response:**
```json
{
  "success": true,
  "data": {
    "rules": [
      {
        "name": "...",
        "category": "...",
        "description": "...",
        "confidence": 0.92
      }
    ]
  }
}
```

---

## 12.10 Relay Endpoints

### POST /relay/connect
Authenticate relay connection.

**Request:**
```json
{
  "relayToken": "relay_token_here",
  "version": "1.2.0",
  "platform": "windows"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "websocketUrl": "wss://relay.okboxbox.com/v1/telemetry",
    "sessionToken": "session_token_here"
  }
}
```

### GET /relay/status
Get relay connection status.

**Response:**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "lastSeen": "2026-01-19T12:34:56Z",
    "activeSession": "ses_abc123"
  }
}
```

---

*End of Part 3*

*Continue to Part 4: Real-Time Protocol, Voice & AI System, Desktop Relay, Integration Points & Roadmap*
