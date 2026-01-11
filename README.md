# Ok, Box Box

Professional-grade race intelligence platform for sim racing.

## Architecture

```
Launcher -> starts Relay -> Relay streams to Backend -> Backend fans out realtime -> Apps render
```

## Structure

```
okboxbox/
├── apps/
│   ├── launcher/      # Desktop launcher (Electron) - license check, module selection, starts Relay
│   ├── racebox/       # Free core UI - timing, gaps, session state, basic telemetry
│   ├── blackbox/      # Paid driver intelligence UI (future)
│   └── controlbox/    # Paid steward UI (future)
├── relay/
│   └── agent/         # Local agent - ONLY component that reads iRacing SDK
├── services/
│   └── api/           # Backend - Node/Express + Socket.IO + Postgres
└── packages/
    └── shared/        # Shared types, contracts, API client, auth helpers
```

## Boundaries

- **Launcher**: Does NOT process telemetry or implement race logic
- **Relay**: Does NOT render UI or decide license rules
- **Backend**: Licensing truth source and realtime distributor
- **Apps**: Never talk to iRacing SDK directly

## V1 Definition of Done

1. Launcher starts
2. License validation succeeds (free tier allowed)
3. Relay starts in background
4. Relay detects iRacing and streams heartbeat + session metadata + basic timing/telemetry
5. Backend stores to Postgres
6. Backend emits realtime updates via Socket.IO
7. RaceBox UI displays live timing/gaps and basic telemetry

## Development

```bash
# Install dependencies
npm install

# Start API server
npm run dev:api

# Start RaceBox UI
npm run dev:racebox

# Start Launcher (Electron)
npm run dev:launcher

# Start Relay Agent (Python)
cd relay/agent && python agent.py
```

## License

MIT © OKBoxBox
