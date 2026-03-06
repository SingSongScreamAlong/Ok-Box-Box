# Ok,Box Box Desktop App — PRIMARY RELAY

> **This is the main desktop app.** Other relay directories (`apps/relay/`, `relay/`, `tools/relay-agent/`) are legacy/dev tools.

Electron-based desktop application that bundles the iRacing relay and HUD into a single app.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                     │
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │   node-irsdk    │───▶│  Socket.IO Client (to server)   │ │
│  │ (iRacing data)  │    │  - Telemetry streaming          │ │
│  └────────┬────────┘    │  - Session metadata             │ │
│           │             │  - Cloud AI features            │ │
│           │             └─────────────────────────────────┘ │
│           │ IPC                                              │
│           ▼                                                  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Electron Renderer (React HUD)               ││
│  │  - Speed/RPM/Gear display                                ││
│  │  - Lap times                                             ││
│  │  - Position/Fuel                                         ││
│  │  - Pedal inputs                                          ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Features

- **Single App**: No separate relay process to run
- **System Tray**: Minimizes to tray, stays running
- **Auto-Connect**: Automatically connects to iRacing when available
- **Cloud Sync**: Streams telemetry to Ok,Box Box server for AI features
- **Offline Mode**: Works without internet (local HUD only)

## Development

```bash
cd apps/desktop
npm install
npm run electron:dev
```

## Build

```bash
npm run electron:build
```

Output: `release/Ok,Box Box Setup.exe`

## Dependencies

- **node-irsdk**: iRacing SDK bindings for Node.js
- **electron**: Desktop app framework
- **socket.io-client**: Real-time server communication
- **vite + react**: UI framework
