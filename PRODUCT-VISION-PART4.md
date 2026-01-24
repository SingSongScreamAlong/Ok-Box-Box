# OK, BOX BOX — PRODUCT VISION & DESIGN SPECIFICATION
## Part 4: Real-Time Protocol, Voice & AI System, Desktop Relay, Integration Points & Roadmap

---

**Document Version:** 1.0  
**Created:** January 19, 2026  
**Author:** Cascade AI  

---

# 13. REAL-TIME PROTOCOL

## 13.1 WebSocket Architecture

### Connection Topology
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         REAL-TIME ARCHITECTURE                               │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────┐                                      ┌─────────────┐
    │   DESKTOP   │                                      │   DRIVER    │
    │   RELAY     │──────┐                        ┌──────│    HUD      │
    └─────────────┘      │                        │      └─────────────┘
                         │                        │
                         ▼                        ▼
                    ┌─────────────────────────────────┐
                    │                                 │
                    │      WEBSOCKET GATEWAY          │
                    │                                 │
                    │   ┌─────────────────────────┐   │
                    │   │    Session Manager      │   │
                    │   │    - Room management    │   │
                    │   │    - Message routing    │   │
                    │   │    - Rate limiting      │   │
                    │   └─────────────────────────┘   │
                    │                                 │
                    └─────────────────────────────────┘
                         │                        │
                         ▼                        ▼
    ┌─────────────┐      │                        │      ┌─────────────┐
    │  PIT WALL   │◀─────┘                        └─────▶│  BROADCAST  │
    │  DASHBOARD  │                                      │   OVERLAY   │
    └─────────────┘                                      └─────────────┘
```

### WebSocket Endpoints

| Endpoint | Purpose | Auth |
|----------|---------|------|
| `wss://ws.okboxbox.com/v1/relay` | Desktop relay telemetry upload | Relay token |
| `wss://ws.okboxbox.com/v1/session/:id` | Session data subscription | User token |
| `wss://ws.okboxbox.com/v1/broadcast/:id` | Broadcast overlay data | Public/API key |

## 13.2 Message Protocol

### Message Format
```typescript
interface WebSocketMessage {
  type: string;           // Message type identifier
  payload: any;           // Message-specific data
  timestamp: number;      // Unix timestamp (ms)
  seq?: number;           // Sequence number for ordering
}
```

### Relay → Server Messages

#### `telemetry.frame`
High-frequency telemetry data from iRacing.
```json
{
  "type": "telemetry.frame",
  "payload": {
    "sessionTime": 1234.567,
    "lap": 12,
    "lapDistPct": 0.456,
    "speed": 78.5,
    "rpm": 7200,
    "gear": 4,
    "throttle": 1.0,
    "brake": 0.0,
    "steering": 0.05,
    "fuelLevel": 34.2,
    "tireWear": [0.78, 0.75, 0.82, 0.80],
    "position": [1234.5, 45.2, 567.8],
    "yaw": 1.23
  },
  "timestamp": 1705669200000,
  "seq": 12345
}
```

#### `telemetry.positions`
All car positions on track (lower frequency).
```json
{
  "type": "telemetry.positions",
  "payload": {
    "cars": [
      {
        "carIdx": 0,
        "position": 1,
        "lapDistPct": 0.456,
        "lap": 12,
        "lastLapTime": 94567,
        "bestLapTime": 93891,
        "inPit": false,
        "onTrack": true
      }
    ]
  },
  "timestamp": 1705669200000
}
```

#### `session.state`
Session state changes.
```json
{
  "type": "session.state",
  "payload": {
    "state": "racing",
    "flag": "green",
    "timeRemaining": 1800,
    "lapsRemaining": 12
  },
  "timestamp": 1705669200000
}
```

#### `incident.detected`
Incident detection from telemetry analysis.
```json
{
  "type": "incident.detected",
  "payload": {
    "id": "inc_temp_123",
    "lap": 11,
    "lapDistPct": 0.456,
    "type": "contact",
    "involvedCars": [0, 5],
    "telemetrySnapshot": { ... }
  },
  "timestamp": 1705669200000
}
```

### Server → Client Messages

#### `session.update`
Aggregated session state for clients.
```json
{
  "type": "session.update",
  "payload": {
    "lap": 12,
    "totalLaps": 24,
    "flag": "green",
    "positions": [
      {
        "position": 1,
        "carNumber": "44",
        "driverName": "Hamilton",
        "gap": null,
        "lastLap": "1:34.567",
        "bestLap": "1:33.891"
      }
    ]
  },
  "timestamp": 1705669200000
}
```

#### `driver.telemetry`
Driver-specific telemetry for HUD.
```json
{
  "type": "driver.telemetry",
  "payload": {
    "position": 3,
    "lap": 12,
    "gapAhead": 1.234,
    "gapBehind": 0.892,
    "speed": 287,
    "gear": 4,
    "rpm": 7200,
    "rpmMax": 8500,
    "delta": 0.234,
    "fuelLevel": 42.3,
    "fuelLapsRemaining": 8,
    "tireWear": 0.78,
    "lastLap": "1:34.567",
    "bestLap": "1:33.891"
  },
  "timestamp": 1705669200000
}
```

#### `pitwall.update`
Pit wall dashboard data.
```json
{
  "type": "pitwall.update",
  "payload": {
    "raceState": {
      "position": 3,
      "lap": 12,
      "totalLaps": 24,
      "gapToLeader": 12.4,
      "gapToAhead": 4.2,
      "gapToBehind": 1.8
    },
    "carStatus": {
      "fuelLevel": 34.2,
      "fuelPct": 0.68,
      "fuelLapsRemaining": 6,
      "tireCompound": "medium",
      "tireWear": 0.78,
      "tireLapsOptimal": 12
    },
    "strategy": {
      "pitWindowOpens": 18,
      "fuelCritical": 22,
      "recommendation": "Pit Lap 19 for optimal undercut on P2"
    },
    "opponents": [
      {
        "position": 1,
        "name": "Verstappen",
        "gap": 12.4,
        "trend": "stable",
        "pace": "1:33.2"
      }
    ]
  },
  "timestamp": 1705669200000
}
```

#### `incident.new`
New incident notification.
```json
{
  "type": "incident.new",
  "payload": {
    "id": "inc_abc123",
    "lap": 11,
    "turn": "Turn 5",
    "type": "contact",
    "severity": "medium",
    "drivers": ["Hamilton", "Verstappen"]
  },
  "timestamp": 1705669200000
}
```

#### `ai.message`
AI race engineer message.
```json
{
  "type": "ai.message",
  "payload": {
    "text": "Box this lap, box this lap. Pit window is open.",
    "audioUrl": "https://...",
    "priority": "high"
  },
  "timestamp": 1705669200000
}
```

### Client → Server Messages

#### `subscribe`
Subscribe to session updates.
```json
{
  "type": "subscribe",
  "payload": {
    "sessionId": "ses_abc123",
    "channels": ["positions", "telemetry", "incidents"]
  }
}
```

#### `unsubscribe`
Unsubscribe from session.
```json
{
  "type": "unsubscribe",
  "payload": {
    "sessionId": "ses_abc123"
  }
}
```

#### `ptt.start`
Start push-to-talk recording.
```json
{
  "type": "ptt.start",
  "payload": {
    "sessionId": "ses_abc123"
  }
}
```

#### `ptt.audio`
Send audio chunk during PTT.
```json
{
  "type": "ptt.audio",
  "payload": {
    "chunk": "base64_audio_data...",
    "format": "webm",
    "final": false
  }
}
```

#### `ptt.end`
End push-to-talk recording.
```json
{
  "type": "ptt.end",
  "payload": {
    "sessionId": "ses_abc123"
  }
}
```

## 13.3 Connection Management

### Heartbeat
```json
// Client sends every 30 seconds
{ "type": "ping", "timestamp": 1705669200000 }

// Server responds
{ "type": "pong", "timestamp": 1705669200000 }
```

### Reconnection Strategy
1. **Immediate retry** (0-3 attempts): No delay
2. **Short backoff** (4-10 attempts): 1-5 second delay
3. **Long backoff** (11+ attempts): 10-30 second delay
4. **Max attempts**: 50, then require manual reconnect

### Connection States
```typescript
type ConnectionState = 
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error';
```

## 13.4 Rate Limiting

| Message Type | Max Rate | Burst |
|--------------|----------|-------|
| `telemetry.frame` | 60/sec | 120 |
| `telemetry.positions` | 4/sec | 10 |
| `session.state` | 1/sec | 5 |
| `ptt.audio` | 50/sec | 100 |

---

# 14. VOICE & AI SYSTEM

## 14.1 AI Race Engineer Architecture

### Pipeline Overview
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AI RACE ENGINEER PIPELINE                             │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
    │   DRIVER    │────▶│   WHISPER   │────▶│   GPT-4     │────▶│ ELEVENLABS  │
    │   SPEAKS    │     │    STT      │     │  REASONING  │     │    TTS      │
    └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
          │                   │                   │                   │
          │                   ▼                   ▼                   ▼
          │            ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
          │            │  TRANSCRIPT │     │  RESPONSE   │     │   AUDIO     │
          │            │   "Gap to   │     │  "Gap to P1 │     │   OUTPUT    │
          │            │   leader?"  │     │  is 12.4s"  │     │             │
          │            └─────────────┘     └─────────────┘     └─────────────┘
          │                                      ▲
          │                                      │
          │            ┌─────────────────────────┴─────────────────────────┐
          │            │                CONTEXT INJECTION                   │
          │            │  • Current telemetry (position, gaps, fuel, tires)│
          │            │  • Session state (lap, flags, time remaining)     │
          │            │  • Opponent data (pace, trends, pit status)       │
          │            │  • Historical data (best laps, sector times)      │
          └───────────▶│  • Conversation history                           │
                       └───────────────────────────────────────────────────┘
```

## 14.2 Speech-to-Text (Whisper)

### Configuration
```typescript
interface WhisperConfig {
  model: 'whisper-1';
  language: 'en';                // Force English for racing terminology
  prompt: string;                // Racing terminology hints
  temperature: 0;                // Deterministic transcription
}
```

### Racing Terminology Prompt
```
Racing terminology: pit, box, gap, delta, undercut, overcut, 
tire wear, fuel load, DRS, slipstream, apex, chicane, 
iRating, safety rating, incident, penalty, black flag,
sector times, purple, green, yellow flag, safety car,
P1, P2, P3, position, laps remaining, fuel critical
```

### Audio Requirements
- **Format:** WebM Opus or WAV
- **Sample Rate:** 16kHz minimum
- **Channels:** Mono
- **Max Duration:** 30 seconds
- **Max Size:** 25MB

## 14.3 Language Model (GPT-4)

### System Prompt
```
You are an AI race engineer for a professional sim racing driver. 
Your role is to provide real-time race information, strategy advice, 
and situational awareness during iRacing sessions.

PERSONALITY:
- Calm, confident, and direct like a real F1 race engineer
- Use proper racing terminology
- Keep responses brief (1-2 sentences max during racing)
- Prioritize actionable information

CAPABILITIES:
- Report gaps to other cars
- Provide fuel and tire strategy
- Alert to threats and opportunities
- Answer questions about race state
- Suggest pit windows and strategy

CONSTRAINTS:
- Never make up data - only use provided telemetry
- If unsure, say so briefly
- Don't engage in non-racing conversation during active sessions
- Respond in under 3 seconds of speech

CURRENT CONTEXT:
{telemetry_context}

CONVERSATION HISTORY:
{conversation_history}
```

### Context Injection Format
```json
{
  "telemetry_context": {
    "position": 3,
    "totalCars": 24,
    "lap": 12,
    "totalLaps": 24,
    "gapToLeader": 12.4,
    "gapAhead": 4.2,
    "gapBehind": 1.8,
    "driverAhead": "Hamilton",
    "driverBehind": "Leclerc",
    "fuelLevel": 34.2,
    "fuelLapsRemaining": 6,
    "tireWear": 0.78,
    "lastLap": "1:34.567",
    "bestLap": "1:33.891",
    "sessionBestLap": "1:33.245",
    "flag": "green",
    "inPitWindow": true,
    "pitWindowOpens": 18,
    "fuelCritical": 22
  }
}
```

### Response Guidelines
| Query Type | Response Style |
|------------|----------------|
| Gap query | "Gap to P1 is 12.4 seconds. Stable." |
| Pace query | "You're 2 tenths off your best. Losing time in sector 2." |
| Strategy query | "Pit window opens lap 18. Recommend lap 19 for undercut." |
| Threat query | "P4 is 1.2 back on fresher tires. Closing 0.3 per lap." |
| Fuel query | "6 laps of fuel remaining. Pit by lap 18." |

## 14.4 Text-to-Speech (ElevenLabs)

### Configuration
```typescript
interface ElevenLabsConfig {
  voice_id: string;              // Custom race engineer voice
  model_id: 'eleven_turbo_v2';   // Low latency model
  voice_settings: {
    stability: 0.75;             // Consistent delivery
    similarity_boost: 0.75;      // Voice accuracy
    style: 0.0;                  // Neutral style
    use_speaker_boost: true;
  };
  output_format: 'mp3_44100_128';
}
```

### Voice Characteristics
- **Tone:** Professional, calm, authoritative
- **Pace:** Moderate to fast (racing urgency)
- **Accent:** Neutral English (configurable)
- **Emotion:** Minimal, data-focused

### Latency Targets
| Stage | Target | Max |
|-------|--------|-----|
| STT (Whisper) | 500ms | 1000ms |
| LLM (GPT-4) | 800ms | 2000ms |
| TTS (ElevenLabs) | 300ms | 500ms |
| **Total** | **1600ms** | **3500ms** |

## 14.5 Proactive AI Messages

### Trigger Conditions
| Trigger | Condition | Message Example |
|---------|-----------|-----------------|
| Pit window open | Lap == pitWindowOpens | "Pit window is now open." |
| Fuel critical | fuelLaps <= 2 | "Fuel critical. Box this lap." |
| Gap change | gapBehind decreased by >1s | "P4 closing. Now 1.2 behind." |
| Position change | position changed | "Position gained. Now P3." |
| Yellow flag | flag == 'yellow' | "Yellow flag. Caution." |
| Checkered flag | flag == 'checkered' | "Checkered flag. P3 finish." |

### Cooldown Rules
- Minimum 10 seconds between proactive messages
- Priority messages (fuel critical, flags) bypass cooldown
- Max 1 proactive message per lap for non-critical

## 14.6 AI Incident Classification

### Classification Pipeline
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      INCIDENT CLASSIFICATION PIPELINE                        │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
    │  TELEMETRY  │────▶│  DETECTION  │────▶│  ANALYSIS   │────▶│ CLASSIFICA- │
    │   STREAM    │     │   ENGINE    │     │   (GPT-4)   │     │    TION     │
    └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### Detection Heuristics
```typescript
interface IncidentDetection {
  // Contact detection
  contactThreshold: {
    proximityMeters: 2.0,        // Cars within 2m
    velocityDeltaMs: 5.0,        // Sudden speed change
    yawRateDelta: 0.5            // Sudden rotation
  };
  
  // Off-track detection
  offTrackThreshold: {
    trackSurfaceId: number[],    // Non-track surface IDs
    durationMs: 500              // Minimum off-track time
  };
  
  // Unsafe rejoin
  unsafeRejoinThreshold: {
    offTrackThenContact: true,
    timeWindowMs: 5000
  };
}
```

### Classification Prompt
```
Analyze this racing incident and provide classification.

INCIDENT DATA:
- Timestamp: {timestamp}
- Lap: {lap}, Turn: {turn}
- Involved cars: {cars}
- Telemetry snapshots: {telemetry}

TELEMETRY ANALYSIS:
Car A: Speed {speed_a} kph, Throttle {throttle_a}%, Brake {brake_a}%, Steering {steering_a}°
Car B: Speed {speed_b} kph, Throttle {throttle_b}%, Brake {brake_b}%, Steering {steering_b}°

RULEBOOK CONTEXT:
{relevant_rules}

Provide:
1. Incident type (contact, off_track, unsafe_rejoin, blocking, etc.)
2. Severity (light, medium, heavy)
3. Suggested penalty based on rulebook
4. Confidence score (0-1)
5. Brief reasoning (2-3 sentences)

Respond in JSON format.
```

### Classification Output
```json
{
  "type": "racing_contact",
  "severity": "medium",
  "suggestedPenalty": {
    "type": "time_penalty",
    "value": 5
  },
  "confidence": 0.78,
  "reasoning": "Contact occurred during legitimate overtaking attempt. Car #44 was alongside at turn-in. Car #1 appeared to leave space but contact occurred at apex. Minor position change resulted.",
  "driverAtFault": "car_44",
  "mitigatingFactors": ["racing_incident", "both_cars_contributed"]
}
```

---

# 15. DESKTOP RELAY APPLICATION

## 15.1 Overview

The Desktop Relay is a lightweight application that runs on the user's PC alongside iRacing. It captures telemetry data from iRacing's shared memory and streams it to Ok, Box Box servers.

### Key Features
- **Automatic iRacing detection** — Starts streaming when iRacing launches
- **Low resource usage** — <50MB RAM, <1% CPU
- **System tray operation** — Runs silently in background
- **Offline resilience** — Buffers data during connection issues
- **Auto-updates** — Silent background updates

## 15.2 Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DESKTOP RELAY ARCHITECTURE                           │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────────────────────┐
    │                           USER'S PC                                      │
    │                                                                          │
    │  ┌─────────────┐     ┌─────────────────────────────────────────────┐    │
    │  │             │     │              OK, BOX BOX RELAY               │    │
    │  │   iRACING   │     │                                             │    │
    │  │             │     │  ┌─────────────┐     ┌─────────────┐        │    │
    │  │  ┌───────┐  │     │  │   MEMORY    │────▶│  TELEMETRY  │        │    │
    │  │  │SHARED │──┼────▶│  │   READER    │     │  PROCESSOR  │        │    │
    │  │  │MEMORY │  │     │  └─────────────┘     └─────────────┘        │    │
    │  │  └───────┘  │     │                            │                │    │
    │  │             │     │                            ▼                │    │
    │  └─────────────┘     │  ┌─────────────┐     ┌─────────────┐        │    │
    │                      │  │   BUFFER    │◀────│  WEBSOCKET  │────────┼───▶│
    │                      │  │   QUEUE     │     │   CLIENT    │        │    │
    │                      │  └─────────────┘     └─────────────┘        │    │
    │                      │                                             │    │
    │                      │  ┌─────────────┐     ┌─────────────┐        │    │
    │                      │  │   SYSTEM    │     │    AUTO     │        │    │
    │                      │  │    TRAY     │     │   UPDATER   │        │    │
    │                      │  └─────────────┘     └─────────────┘        │    │
    │                      │                                             │    │
    │                      └─────────────────────────────────────────────┘    │
    │                                                                          │
    └─────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ WebSocket (TLS)
                                        ▼
                            ┌─────────────────────┐
                            │   OK, BOX BOX       │
                            │   SERVERS           │
                            └─────────────────────┘
```

## 15.3 Technology Stack

| Component | Technology |
|-----------|------------|
| Runtime | Electron or Tauri |
| Language | TypeScript/Rust |
| iRacing SDK | node-irsdk or custom binding |
| WebSocket | ws (Node) or tungstenite (Rust) |
| Auto-update | electron-updater or tauri-updater |
| Installer | NSIS (Windows), DMG (macOS) |

## 15.4 iRacing Data Capture

### Shared Memory Variables
```typescript
interface IRacingTelemetry {
  // Session
  SessionTime: number;
  SessionState: number;
  SessionFlags: number;
  
  // Car
  Speed: number;
  RPM: number;
  Gear: number;
  Throttle: number;
  Brake: number;
  SteeringWheelAngle: number;
  
  // Position
  Lap: number;
  LapDistPct: number;
  CarIdxPosition: number[];
  CarIdxLapDistPct: number[];
  
  // Fuel & Tires
  FuelLevel: number;
  FuelLevelPct: number;
  LFwearL: number;
  LFwearM: number;
  LFwearR: number;
  // ... (all tire wear values)
  
  // Timing
  LapLastLapTime: number;
  LapBestLapTime: number;
  LapDeltaToBestLap: number;
}
```

### Capture Rates
| Data Type | Rate | Notes |
|-----------|------|-------|
| Core telemetry | 60 Hz | Speed, RPM, inputs |
| Position data | 4 Hz | All car positions |
| Session state | 1 Hz | Flags, lap count |
| Tire/fuel | 1 Hz | Wear, levels |

## 15.5 System Tray Interface

### Tray Menu
```
┌─────────────────────────────────┐
│  Ok, Box Box Relay              │
├─────────────────────────────────┤
│  ● Connected                    │
│  Session: GT3 @ Spa             │
├─────────────────────────────────┤
│  Open Dashboard      →          │
│  Settings            →          │
├─────────────────────────────────┤
│  □ Start with Windows           │
│  □ Minimize to tray             │
├─────────────────────────────────┤
│  Check for Updates              │
│  About                          │
├─────────────────────────────────┤
│  Quit                           │
└─────────────────────────────────┘
```

### Tray Icon States
| State | Icon | Tooltip |
|-------|------|---------|
| Disconnected | Gray | "Not connected" |
| Connecting | Yellow | "Connecting..." |
| Connected (no session) | Blue | "Connected, waiting for iRacing" |
| Connected (active) | Green | "Streaming: GT3 @ Spa" |
| Error | Red | "Connection error" |

## 15.6 Configuration

### Settings File
```json
{
  "auth": {
    "relayToken": "encrypted_token_here"
  },
  "connection": {
    "serverUrl": "wss://relay.okboxbox.com/v1/telemetry",
    "reconnectAttempts": 50,
    "heartbeatInterval": 30000
  },
  "capture": {
    "telemetryRate": 60,
    "positionRate": 4,
    "bufferSize": 1000
  },
  "behavior": {
    "startWithWindows": true,
    "minimizeToTray": true,
    "showNotifications": true
  },
  "updates": {
    "autoUpdate": true,
    "channel": "stable"
  }
}
```

## 15.7 Installation & Updates

### Installation Flow
1. Download installer from okboxbox.com/download
2. Run installer (requires admin for Windows service option)
3. Launch relay
4. Sign in with Ok, Box Box account
5. Relay token stored securely

### Auto-Update Process
1. Check for updates on launch and every 6 hours
2. Download update in background
3. Prompt user to restart (or auto-restart if idle)
4. Apply update on next launch

---

# 16. INTEGRATION POINTS

## 16.1 Discord Integration

### Bot Features
- **Incident notifications** — Post to channel when incidents detected
- **Penalty announcements** — Announce penalties to drivers
- **Session alerts** — Notify when sessions start/end
- **Slash commands** — Query standings, incidents, etc.

### Webhook Payloads

#### Incident Notification
```json
{
  "embeds": [{
    "title": "⚠️ Incident Detected",
    "description": "Contact at Turn 5, Lap 11",
    "color": 16776960,
    "fields": [
      { "name": "Drivers", "value": "#44 Hamilton ↔ #1 Verstappen", "inline": true },
      { "name": "Severity", "value": "Medium", "inline": true },
      { "name": "Status", "value": "Pending Review", "inline": true }
    ],
    "footer": { "text": "Ok, Box Box • GT3 Sprint Series" },
    "timestamp": "2026-01-19T12:34:56Z"
  }]
}
```

#### Penalty Announcement
```json
{
  "embeds": [{
    "title": "🏁 Penalty Issued",
    "description": "5 Second Time Penalty",
    "color": 15158332,
    "fields": [
      { "name": "Driver", "value": "#44 Lewis Hamilton", "inline": true },
      { "name": "Incident", "value": "Contact at Turn 5, Lap 11", "inline": true },
      { "name": "Reason", "value": "Failure to leave racing room", "inline": false }
    ],
    "footer": { "text": "Ok, Box Box • GT3 Sprint Series" },
    "timestamp": "2026-01-19T12:45:00Z"
  }]
}
```

### Slash Commands
| Command | Description |
|---------|-------------|
| `/standings` | Show current race standings |
| `/incidents` | List pending incidents |
| `/driver <name>` | Show driver stats |
| `/session` | Show current session info |

## 16.2 iRacing Data API

### Data Sync
- **Frequency:** Every 15 minutes for active users
- **Data Retrieved:**
  - Member profile (iRating, SR, license)
  - Recent results
  - Career stats

### OAuth Flow
1. User clicks "Link iRacing" in Ok, Box Box
2. Redirect to iRacing OAuth
3. User authorizes
4. Callback with auth code
5. Exchange for tokens
6. Store refresh token securely

## 16.3 Stripe Integration

### Subscription Management
- **Products:** BlackBox, ControlBox, RaceBox Plus
- **Billing:** Monthly recurring
- **Trials:** 14-day free trial for BlackBox
- **Webhooks:** Handle subscription events

### Webhook Events
| Event | Action |
|-------|--------|
| `customer.subscription.created` | Activate subscription |
| `customer.subscription.updated` | Update tier/status |
| `customer.subscription.deleted` | Deactivate subscription |
| `invoice.payment_failed` | Mark as past_due |
| `invoice.paid` | Reactivate if past_due |

## 16.4 OBS Integration

### Browser Source URLs
```
Timing Tower: https://overlay.okboxbox.com/timing-tower?session={id}&key={api_key}
Lower Third:  https://overlay.okboxbox.com/lower-third?session={id}&key={api_key}
Battle Box:   https://overlay.okboxbox.com/battle-box?session={id}&key={api_key}
Incident:     https://overlay.okboxbox.com/incident?session={id}&key={api_key}
```

### Recommended Settings
- **Width:** 1920px
- **Height:** 1080px
- **FPS:** 30
- **Custom CSS:** None required (transparent background)

## 16.5 Streaming Platforms

### Twitch Extension (Future)
- Live timing panel
- Viewer predictions
- Chat commands

### YouTube Integration (Future)
- Live chat commands
- Membership perks

---

# 17. SECURITY & COMPLIANCE

## 17.1 Authentication Security

### Password Requirements
- Minimum 8 characters
- No common passwords (haveibeenpwned check)
- bcrypt hashing (cost factor 12)

### Token Security
- **Access tokens:** JWT, 15-minute expiry
- **Refresh tokens:** Opaque, 30-day expiry, rotated on use
- **Relay tokens:** Long-lived, revocable, scoped to relay only

### Rate Limiting
| Endpoint | Limit |
|----------|-------|
| `/auth/login` | 5/minute per IP |
| `/auth/register` | 3/hour per IP |
| `/auth/forgot-password` | 3/hour per email |
| API (authenticated) | 100/minute per user |
| API (unauthenticated) | 20/minute per IP |

## 17.2 Data Protection

### Data at Rest
- Database encryption (AES-256)
- Encrypted backups
- Secure key management (AWS KMS or similar)

### Data in Transit
- TLS 1.3 for all connections
- Certificate pinning for relay app
- WSS for WebSocket connections

### Data Retention
| Data Type | Retention |
|-----------|-----------|
| Session telemetry | 90 days |
| Incident records | 2 years |
| User accounts | Until deletion requested |
| Audit logs | 1 year |

## 17.3 Privacy

### GDPR Compliance
- Right to access (data export)
- Right to erasure (account deletion)
- Data portability
- Consent management

### Data Collection
- Only collect data necessary for service
- No selling of user data
- Anonymized analytics only

---

# 18. INFRASTRUCTURE & DEPLOYMENT

## 18.1 Cloud Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INFRASTRUCTURE OVERVIEW                              │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────┐
                              │   USERS     │
                              └─────────────┘
                                    │
                                    ▼
                              ┌─────────────┐
                              │ CLOUDFLARE  │
                              │    CDN      │
                              └─────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              ┌─────────┐     ┌─────────┐     ┌─────────┐
              │   WEB   │     │   API   │     │WEBSOCKET│
              │  (Next) │     │ (Node)  │     │ GATEWAY │
              └─────────┘     └─────────┘     └─────────┘
                    │               │               │
                    └───────────────┼───────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              ┌─────────┐     ┌─────────┐     ┌─────────┐
              │POSTGRES │     │  REDIS  │     │   S3    │
              │   DB    │     │  CACHE  │     │ STORAGE │
              └─────────┘     └─────────┘     └─────────┘
```

## 18.2 Service Components

| Service | Technology | Scaling |
|---------|------------|---------|
| Web Frontend | Next.js on Vercel | Auto-scale |
| API Server | Node.js on Railway/Render | Horizontal |
| WebSocket Gateway | Node.js on dedicated | Vertical + Horizontal |
| Database | PostgreSQL (Supabase/Neon) | Managed |
| Cache | Redis (Upstash) | Managed |
| Storage | S3/R2 | Unlimited |
| AI | OpenAI API | Pay-per-use |
| TTS | ElevenLabs API | Pay-per-use |

## 18.3 Monitoring & Observability

### Metrics
- Request latency (p50, p95, p99)
- Error rates
- WebSocket connections
- AI response times
- Relay connections

### Logging
- Structured JSON logs
- Centralized log aggregation (Axiom/Datadog)
- Request tracing

### Alerting
- Error rate spikes
- Latency degradation
- Service health checks
- AI API failures

---

# 19. DEVELOPMENT ROADMAP

## 19.1 Phase 1: Foundation (Days 1-30)

### Week 1-2: Core Infrastructure
- [ ] Project setup (monorepo, TypeScript, linting)
- [ ] Database schema and migrations
- [ ] Authentication system (register, login, JWT)
- [ ] Basic API structure

### Week 3-4: Relay & Telemetry
- [ ] Desktop relay MVP (Electron)
- [ ] iRacing shared memory capture
- [ ] WebSocket server for telemetry
- [ ] Basic telemetry storage

### Deliverables
- Working auth flow
- Relay captures and streams telemetry
- Basic session recording

## 19.2 Phase 2: Driver Experience (Days 31-60)

### Week 5-6: Driver HUD
- [ ] HUD component implementation
- [ ] Real-time telemetry display
- [ ] Gap calculations
- [ ] Lap time tracking

### Week 7-8: AI Race Engineer
- [ ] PTT audio capture
- [ ] Whisper STT integration
- [ ] GPT-4 context injection
- [ ] ElevenLabs TTS integration
- [ ] End-to-end voice flow

### Deliverables
- Functional Driver HUD
- Working AI race engineer (basic queries)
- Session history view

## 19.3 Phase 3: Race Control (Days 61-90)

### Week 9-10: Incident System
- [ ] Incident detection algorithms
- [ ] AI classification integration
- [ ] Incident queue UI
- [ ] Review modal

### Week 11-12: Rulebook & Penalties
- [ ] Rulebook editor
- [ ] AI rulebook import
- [ ] Penalty issuance flow
- [ ] Notification system

### Deliverables
- Automatic incident detection
- Steward review workflow
- Rulebook management

## 19.4 Phase 4: Team & Broadcast (Days 91-120)

### Week 13-14: Team Features
- [ ] Team creation and management
- [ ] Pit wall dashboard
- [ ] Driver profiles
- [ ] Basic IDP

### Week 15-16: Broadcast
- [ ] Timing tower overlay
- [ ] Battle box detection
- [ ] Director panel
- [ ] OBS integration

### Deliverables
- Team pit wall functional
- Broadcast overlays working
- Public timing pages

## 19.5 Phase 5: Polish & Launch (Days 121-150)

### Week 17-18: Integration & Testing
- [ ] Discord integration
- [ ] Stripe subscription flow
- [ ] End-to-end testing
- [ ] Performance optimization

### Week 19-20: Launch Prep
- [ ] Documentation
- [ ] Marketing site
- [ ] Beta testing
- [ ] Bug fixes

### Deliverables
- Production-ready application
- Documentation complete
- Beta launch

---

# 20. SUCCESS METRICS

## 20.1 Key Performance Indicators

### User Metrics
| Metric | Target (6 months) |
|--------|-------------------|
| Registered users | 1,000 |
| Active subscribers | 200 |
| Monthly active users | 500 |
| User retention (30-day) | 60% |

### Technical Metrics
| Metric | Target |
|--------|--------|
| API latency (p95) | <200ms |
| WebSocket latency | <50ms |
| AI response time | <3s |
| Uptime | 99.5% |

### Business Metrics
| Metric | Target (6 months) |
|--------|-------------------|
| Monthly recurring revenue | $3,000 |
| Customer acquisition cost | <$20 |
| Churn rate | <10% |

## 20.2 Feature Success Criteria

### AI Race Engineer
- 90% query comprehension accuracy
- <3 second response time
- Positive user feedback (>4/5 rating)

### Incident Detection
- 85% detection rate for contacts
- <20% false positive rate
- AI classification accuracy >75%

### Broadcast Overlays
- <100ms update latency
- Stable for 4+ hour sessions
- Positive broadcaster feedback

---

# 21. APPENDIX

## 21.1 Glossary

| Term | Definition |
|------|------------|
| **Box** | Pit stop (from F1 radio: "box box") |
| **DDU** | Digital Dash Unit |
| **Delta** | Time difference vs reference lap |
| **DRS** | Drag Reduction System |
| **IDP** | Individual Development Plan |
| **iRating** | iRacing skill rating |
| **PTT** | Push-to-Talk |
| **Safety Rating** | iRacing incident-based rating |
| **Stint** | Period between pit stops |
| **Undercut** | Pitting before competitor to gain advantage |

## 21.2 Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 19, 2026 | Cascade AI | Initial document |

## 21.3 References

- iRacing SDK Documentation
- OpenAI API Documentation
- ElevenLabs API Documentation
- WebSocket Protocol (RFC 6455)
- OAuth 2.0 (RFC 6749)

---

*End of Product Vision & Design Specification*

*Document complete across 4 parts:*
- *Part 1: Vision, Users, Pricing & Features*
- *Part 2: Information Architecture, Pages, Design System & Components*
- *Part 3: User Flows, Data Models & API Specification*
- *Part 4: Real-Time Protocol, Voice & AI, Desktop Relay, Integrations & Roadmap*
