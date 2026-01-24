# OK, BOX BOX — PRODUCT VISION & DESIGN SPECIFICATION
## Part 1: Vision, Users, Pricing & Features

---

**Document Version:** 1.0  
**Created:** January 19, 2026  
**Author:** Cascade AI  

---

# 1. PRODUCT VISION & IDENTITY

## 1.1 What Is Ok, Box Box?

**Ok, Box Box** is a **professional racing software suite** for iRacing that provides:

1. **Real-time situational awareness** for drivers during races
2. **AI-powered race engineering** with voice interaction
3. **Team coordination tools** for pit wall strategists
4. **Race control automation** for league administrators
5. **Professional broadcast graphics** for streamers

The name comes from Formula 1 radio — the phrase a team uses to call a driver into the pits. It represents **intelligent race strategy and communication**.

## 1.2 Brand Identity

### Tagline
> **"PROFESSIONAL RACING SOFTWARE"**

### Brand Voice
- **Technical but accessible** — Uses racing terminology correctly
- **Confident and direct** — Like a race engineer on the radio
- **Data-driven** — Backs up recommendations with telemetry
- **Calm under pressure** — Maintains composure during incidents

### Logo Treatment
- Primary: "OK, BOX BOX" in bold, uppercase, wide letter-spacing
- Monochrome on dark backgrounds
- Accent color highlight on "BOX BOX" for emphasis

## 1.3 Core Value Propositions

| For | Value |
|-----|-------|
| **Solo Drivers** | AI race engineer that knows your car, your pace, and your competitors |
| **Team Drivers** | Coordinated pit wall with real-time strategy and voice comms |
| **Team Managers** | Driver development tracking with Individual Development Plans (IDP) |
| **League Admins** | Automated incident detection, rulebook enforcement, steward workflows |
| **Broadcasters** | Professional timing graphics, battle tracking, incident replays |

---

# 2. TARGET USERS & PERSONAS

## 2.1 Primary Personas

### 🏎️ **The Competitive Driver** — "Alex"
- **Profile:** iRating 3000-6000, races 3-5x per week
- **Pain Points:** Can't monitor gaps while driving, misses pit windows, no one to discuss strategy with
- **Needs:** Voice-activated race engineer, real-time gap tracking, fuel/tire strategy
- **Product Fit:** **BlackBox** ($14/mo)

### 👥 **The Team Manager** — "Jordan"
- **Profile:** Runs a 4-8 driver endurance team
- **Pain Points:** Coordinating driver stints, tracking driver development, managing practice
- **Needs:** Pit wall dashboard, driver performance analytics, IDP
- **Product Fit:** **BlackBox Team** (multiple licenses)

### 🏁 **The League Admin** — "Sam"
- **Profile:** Runs a 30-50 driver league
- **Pain Points:** Reviewing incidents takes hours, inconsistent penalties, managing protests
- **Needs:** Automated incident detection, rulebook-based penalties, steward workflows
- **Product Fit:** **ControlBox** ($42/mo)

### 📺 **The Broadcaster** — "Casey"
- **Profile:** Streams league races, 100-500 viewers
- **Pain Points:** Manual overlay management, missing battles, no incident alerts
- **Needs:** Auto-updating timing tower, battle detection, incident banners
- **Product Fit:** **RaceBox Plus** (included with ControlBox)

---

# 3. PRODUCT TIERS & PRICING

## 3.1 Tier Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           OK, BOX BOX PRODUCTS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐                        │
│  │   BLACKBOX  │  │ TEAM BLACKBOX│  │  CONTROLBOX │                        │
│  │   $14/mo    │  │   $26/mo     │  │   $42/mo    │                        │
│  │  per driver │  │   per team   │  │  per league │                        │
│  │             │  │              │  │             │                        │
│  │   Driver    │  │  Pit Wall &  │  │   League    │                        │
│  │   Tools     │  │  Team Mgmt   │  │   Control   │                        │
│  └─────────────┘  └──────────────┘  └─────────────┘                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 3.2 Detailed Tier Breakdown

### 🏎️ BlackBox ($14/month per driver)
| Feature | Included |
|---------|----------|
| **Driver HUD** | Real-time telemetry overlay |
| **AI Race Engineer** | Voice interaction via PTT |
| **Gap Tracking** | Live gaps to cars ahead/behind |
| **Fuel Strategy** | Laps remaining, pit window |
| **Tire Strategy** | Wear tracking, deg prediction |
| **Opponent Intel** | Pace comparison, threat assessment |
| **Team Dashboard** | Pit wall view (if on team) |
| **Session History** | Past sessions and analytics |
| **My IDP** | Personal development tracking |
| **Relay Desktop App** | Telemetry uplink |

### 👥 Team BlackBox ($26/month per team)
| Feature | Included |
|---------|----------|
| **All BlackBox Features** | For team owner |
| **Team Dashboard** | Pit wall view for strategists |
| **Driver Roster** | Manage team drivers |
| **Session Coordination** | Multi-driver session view |
| **Driver Profiles** | Performance tracking |
| **Individual Development Plans** | Driver coaching tools |
| **Team Analytics** | Aggregate performance data |

### 🏁 ControlBox ($42/month per league)
| Feature | Included |
|---------|----------|
| **Incident Detection** | Automatic contact/off-track detection |
| **Incident Classification** | AI severity assessment |
| **Steward Workflows** | Review → Decision → Notify |
| **Rulebook Management** | Upload, parse, enforce rules |
| **Penalty Matrix** | Configurable penalty guidelines |
| **Evidence System** | Video clips, telemetry snapshots |
| **Protest Management** | Driver protests and appeals |
| **Audit Logging** | Full decision history |
| **Discord Integration** | Penalty notifications |

### 📺 Broadcast Features (Included with ControlBox)
| Feature | Included |
|---------|----------|
| **Director Panel** | Scene control, camera switching |
| **Stream Delay** | Configurable 0-60 second delay |
| **Battle Box** | Auto-detected battles overlay |
| **Incident Banners** | Real-time incident notifications |
| **Custom Branding** | League logo, sponsor slots |
| **Scene Presets** | One-click overlay configurations |
| **Public Timing Pages** | Shareable live timing |

---

# 4. COMPLETE FEATURE MATRIX

## 4.1 Driver HUD (BlackBox)

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│ ████████████████████████████████████████████████ RPM BAR        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────┐      ┌─────────────────┐      ┌─────────┐         │
│  │ P3/24   │      │       4         │      │ FUEL    │         │
│  │ +1.234  │      │      287        │      │ 42.3 L  │         │
│  │ -0.892  │      │      KPH        │      │ ~8 LAPS │         │
│  │ GAP     │      │    +0.234       │      │ TIRES   │         │
│  └─────────┘      └─────────────────┘      └─────────┘         │
│  LAP 12    LAST 1:34.567    BEST 1:33.891                       │
│  🎧 "Box this lap, box this lap"                                │
│              ┌─────────────────────┐                            │
│              │  🎙️ ASK ENGINEER   │                            │
│              └─────────────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

**Data Points:**
| Element | Source | Update Rate |
|---------|--------|-------------|
| Position | `CarIdxPosition` | 1 Hz |
| Gap Ahead/Behind | Calculated from `CarIdxLapDistPct` | 4 Hz |
| Speed | `Speed` | 60 Hz |
| Gear | `Gear` | 60 Hz |
| RPM | `RPM` | 60 Hz |
| Delta | Calculated vs best lap | 15 Hz |
| Fuel Level | `FuelLevel` | 1 Hz |
| Tire Wear | `LFwearL/M/R`, etc. | 1 Hz |

## 4.2 AI Race Engineer

**Interaction Model:**
1. Driver presses PTT button
2. Audio captured → Whisper STT
3. Transcript + telemetry → GPT-4
4. Response → ElevenLabs TTS
5. Audio playback

**Sample Interactions:**
| Driver Says | AI Responds |
|-------------|-------------|
| "How's my pace?" | "You're 2 tenths off your best. Consistent through sector 1, losing time in the chicane." |
| "Gap to leader?" | "Gap to P1 is 12.4 seconds. He's on a 1:33.2 pace, you're on 1:33.8." |
| "When should I pit?" | "Pit window opens lap 18. Fuel critical at lap 22. Recommend lap 19." |
| "Who's behind me?" | "P4 is Driver X, 1.2 seconds back, on fresher tires. Gaining 0.3 per lap." |

## 4.3 Team Pit Wall Dashboard

**Layout:**
```
┌───────────────────┬─────────────────────────────────────────────┐
│    RACE STATE     │           STRATEGY TIMELINE                  │
│  P3 / LAP 42      │  ═══════●═══════════════════════════════    │
│  GAP: +12.4s      │    Current    Pit Window    Fuel Critical   │
├───────────────────┼─────────────────────────────────────────────┤
│    CAR STATUS     │           OPPONENT INTEL                     │
│  FUEL: 34.2L      │  P2  Driver A    -4.2s   ↓ Losing           │
│  TIRES: 78%       │  P4  Driver B    +1.8s   ↑ Gaining          │
├───────────────────┴─────────────────────────────────────────────┤
│  EVENT LOG: LAP 41 Sector 2 PB • LAP 40 Yellow flag sector 3   │
└─────────────────────────────────────────────────────────────────┘
```

## 4.4 Incident Detection (ControlBox)

**Detection Types:**
| Type | Detection Method |
|------|------------------|
| Contact | Proximity + velocity change |
| Off-Track | Track position + speed |
| Spin | Yaw rate + speed |
| Unsafe Rejoin | Off-track → contact |
| Blocking | Defensive line + proximity |

**Severity Classification:**
| Severity | Criteria |
|----------|----------|
| Light | Minor contact, no position change |
| Medium | Contact with position change or damage |
| Heavy | Contact causing spin/crash/retirement |

## 4.5 Rulebook System

**Rule Structure:**
- Name and description
- Category (contact, track limits, pit lane, flags)
- Conditions (severity, contact type, etc.)
- Penalty specification (type and value)
- Active/inactive toggle

**AI Rulebook Import:**
1. Upload PDF/text rulebook
2. AI parses into structured rules
3. Human reviews and approves
4. Rules added to active rulebook

## 4.6 Broadcast Features

**Timing Tower (Free):**
- Position, car number, driver name
- Gap to leader, last lap time
- Ok, Box Box branding required

**Battle Box (Plus):**
- Auto-detects cars within 1.5 seconds
- Highlights position changes
- Shows closing rate

**Incident Banner (Plus):**
- Real-time incident notifications
- Lap, turn, drivers involved
