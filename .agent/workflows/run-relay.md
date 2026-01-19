---
description: Run iRacing relay agent for telemetry testing
---

# Run Relay Agent Workflow

Starts the Python relay agent to send iRacing telemetry to the ControlBox server.

## Prerequisites

- iRacing must be installed and running (or about to run)
- Python dependencies installed (run `/pc-setup` first if not done)
- Server URL configured in environment

## Steps

1. Navigate to relay agent:
```bash
cd tools/relay-agent
```

2. Start the relay agent:
```bash
python main.py
```

## Options

### Connect to local Mac server:
```bash
CONTROLBOX_SERVER_URL=http://YOUR_MAC_IP:3001 python main.py
```

### Connect to production:
```bash
CONTROLBOX_SERVER_URL=https://octopus-app-qsi3i.ondigitalocean.app python main.py
```

### Dry run (test without iRacing):
```bash
python main.py --dry-run
```

## Expected Output

When working correctly:
```
[Relay] Connected to server
[Relay] Waiting for iRacing session...
[Relay] Session started: [track name]
[Relay] Sending telemetry...
```
