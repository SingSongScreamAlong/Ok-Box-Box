# Ok, Box Box - System Architecture

> **The Grand Unified Theory of the Project**

This document provides a comprehensive technical and functional overview of the entire *Ok, Box Box* ecosystem. It explains how the pieces fit together—from the C++ memory mapping in iRacing to the React components on the Steward's dashboard.

---

## 1. High-Level Architecture

The system follows a **Hub-and-Spoke** architecture where the **Central Server** acts as the brain, processing real-time telemetry from **Relay Agents** (drivers) and serving synchronized state to **Web Clients** (dashboards).

```mermaid
graph TD
    subgraph "Driver's PC (Windows)"
        IR[iRacing Simulator] -->|Shared Memory| RA[Relay Agent (Python)]
        RA -->|WebSocket / Protocol Buffers| SRV[Cloud Server]
    end

    subgraph "Cloud Infrastructure (DigitalOcean)"
        SRV[Node.js API Server]
        DB[(PostgreSQL)]
        Redis[(Redis Cache)]
        AI[Voice AI Service]
        
        SRV <--> DB
        SRV <--> Redis
        SRV <--> AI
    end

    subgraph "Web Clients (React)"
        SRV -->|Socket.IO Events| BB[BlackBox\n(Driver HUD)]
        SRV -->|Socket.IO Events| CB[ControlBox\n(Race Control)]
        SRV -->|Socket.IO Events| RB[RaceBox\n(Broadcast)]
    end
```

---

## 2. The Three Surfaces

The application presents three distinct "surfaces" based on the user's role. Access is strictly gated by the **Entitlement System**.

### 🏎️ BlackBox (Driver Experience)
*   **Target:** Sim Racers.
*   **Key Features:**
    *   **Strategic HUD:** Fuel calculations, tire wear projections, relative gaps.
    *   **Voice Engineer:** Talk to the car using PTT. "How's my pace?", "Box this lap".
    *   **Spotter:** Audio alerts for traffic and flags.
*   **Tech:** React (Canvas-heavy), Web Audio API (Mic capture).

### 👮 ControlBox (Steward Experience)
*   **Target:** League Admins & Race Directors.
*   **Key Features:**
    *   **Live Incident Feed:** Auto-detected crashes, spins, and off-tracks.
    *   **Penalty Management:** Review evidence, assign penalties (DT, Stop&Go).
    *   **Rulebook Engine:** AI-assisted ruling based on PDF rulebooks.
*   **Tech:** Real-time tables, Admin-only WebSocket namespaces.

### 📺 RaceBox (Broadcast Experience)
*   **Target:** Broadcasters & Spectators.
*   **Key Features:**
    *   **TV Overlays:** Timing tower, battle gaps, incident banners.
    *   **Director Mode:** Control overlays remotely.
    *   **Delay Buffer:** Configurable 0-60s delay to sync data with Twitch streams.
*   **Tech:** CSS Animations, Server-side data buffering.

---

## 3. Data Pipeline: The Journey of a Packet

1.  **Ingestion (Relay Agent)**
    *   The Python Relay Agent (`tools/relay-agent`) reads iRacing's memory map using `irsdk`.
    *   It samples data at 60Hz but downsamples to **30Hz** for transmission.
    *   **Protocol:** Data is validated against strict Zod schemas (`@controlbox/protocol`) before sending.
    *   **Payloads:** `session_metadata`, `telemetry` (car state), `bulk_telemetry` (all cars).

2.  **Processing (Server)**
    *   **Validation:** Incoming WebSocket packets are strictly validated. Malformed packets are dropped.
    *   **Session Management:** The server maintains an in-memory `LiveSession` state.
    *   **Enrichment:**
        *   *LapTracker*: Detects lap crossings and sector times.
        *   *IncidentAnalysis*: Detects contacts using vector physics.
        *   *StrategyEngine*: Updates fuel/tire models based on consumption rates.

3.  **Broadcast (Socket.IO)**
    *   **Live Room:** Data is emitted immediately to `session:live:{id}`.
    *   **Delayed Room:** Data is buffered in a circular buffer and emitted to `broadcast:delayed:{id}` based on the configured delay.

---

## 4. Key Subsystems

### 🗣️ Voice AI Pipeline
A "Push-to-Talk" system that feels like a real race engineer.
1.  **Browser:** Captures audio blobs via MediaRecorder API.
2.  **API:** `POST /api/voice/query` receives the blob.
3.  **Transcription:** OpenAI **Whisper** model converts Audio → Text.
4.  **Intelligence:** GPT-4 (or similar) analyzes text + current telemetry context.
    *   *Context:* "Fuel: 3.2L", "Pos: P5", "Gap Ahead: 1.2s".
5.  **Response:** AI generates a concise textual response.
6.  **TTS:** **ElevenLabs** converts text to audio.
7.  **Playback:** Browser plays the returned MP3.

### ⏱️ Telemetry Delay Buffer
Used by broadcasters to match the overlays with the video delay (usually 7-15s).
*   **Mechanism:** Server maintains a `TelemetryBuffer` class.
*   **Storage:** Snapshots are stored with a timestamp.
*   **Playback:** A `setTimeout` loop checks the buffer tail against `now - delayMs`.
*   **Efficiency:** Snapshots are binary-packed where possible to save memory.

### 💼 Commercial & Entitlements (V1)
The revenue engine.
*   **Source of Truth:** Squarespace (Webhooks).
*   **Products:**
    *   `BlackBox` (User Scope): Personal tools.
    *   `ControlBox` (Org Scope): League tools.
    *   `RaceBox Plus` (Org Scope): Broadcast tools.
*   **Enforcement:**
    *   Middleware checks `req.user.entitlements`.
    *   WebSocket connections are rejected if limits are exceeded.

---

## 5. Infrastructure

### 🐳 Deployment
*   **Platform:** DigitalOcean App Platform.
*   **Containerization:** Dockerfile builds the Monorepo (Server + Dashboard static build).
*   **Auto-Deploy:** Commits to `main` trigger a build.

### 💾 Data Persistence
*   **PostgreSQL:** Stores Users, Leagues, Sessions, Incidents, and Entitlements.
*   **Redis:** Handles Rate Limiting counters and Session Pub/Sub (optional for scaling).

---

## 6. How to Run It

### The Relay (Client Side)
Users run the standalone executable on their racing PC.
*   **Installer:** `OkBoxBox-Relay-Setup.exe` (NSIS).
*   **Auto-Update:** Checks `/api/relay/version` on launch and self-updates.

### The Server (Development)
```bash
npm run dev # Launches Server (3001) + Dashboard (5173) parallel
```

---

*Documentation maintained by the Engineering Team. Last Updated: Jan 2026.*
