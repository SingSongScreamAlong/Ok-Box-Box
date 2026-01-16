# Ok, Box Box - Release Candidate 1 (v1.0.0-rc1)

🚀 **Release Date:** January 2, 2026

This is the first comprehensive Release Candidate for the Ok, Box Box system. It includes the fully integrated Server, Dashboard, and Relay Agent with the new V1 Commercial & Entitlement model.

---

## 📦 What's Inside?

### 1. Server (OkBoxBox-Server-v1.0.0-rc1.zip)
The brain of the operation.
- **V1 Entitlements:** Support for subscriptions (BlackBox, ControlBox, RaceBox Plus).
- **Telemetry Delay:** Configurable broadcast delay buffer (0-60s).
- **Voice AI:** "Push-to-Talk" endpoint with Whisper + LLM integration.

### 2. Dashboard (OkBoxBox-Dashboard-v1.0.0-rc1.zip)
The user interface.
- **ControlBox:** Steward tools, incident feed, penalty management.
- **RaceBox:** Broadcast overlays with Director Mode.
- **BlackBox:** Driver HUD with Voice Engineer integration.

### 3. Relay Agent (OkBoxBox-Relay-v1.0.0-rc1.zip)
The bridge to iRacing.
- **Windows Installer:** One-click setup (`install.bat`).
- **Auto-Update:** Checks server for new versions on launch.
- **Performance:** Optimized V2 telemetry protocol (30Hz/5Hz split).

---

## 🛠️ Installation

### Linux / Server (Docker)
Ideally, deploy using the Docker image:
```bash
docker pull okboxbox:v1.0.0-rc1
```

Or run from the zip:
1.  Unzip `OkBoxBox-Server-v1.0.0-rc1.zip`
2.  Run `./start_server.sh`

### Windows (Driver/Relay)
1.  Unzip `OkBoxBox-Relay-v1.0.0-rc1.zip` (on your gaming PC).
2.  Run `install.bat` (first time only).
3.  Run `run.bat` to connect.

---

## 📝 Changelog

- **feat(billing):** Implemented authoritative V1 pricing & entitlement model.
- **feat(relay):** Added auto-update mechanism and version check.
- **feat(broadcast):** Added server-side telemetry delay buffer for stream syncing.
- **feat(ui):** Dark mode by default, premium "Tactical" aesthetic.
- **fix(api):** Prioritized `/relay` routes to prevent authentication 401s.
- **fix(protocol):** Corrected V1 schema validation for Weather and Telemetry.
