---
description: Test full telemetry pipeline from iRacing to dashboard
---

# End-to-End Test Workflow

Tests the complete data flow: iRacing → Relay Agent → Server → Dashboard

## Prerequisites

- iRacing installed and session active (or replay)
- Relay agent set up (`/pc-setup` completed)
- Server running (on Mac or deployed)

## Steps

### On Windows PC:

1. Ensure iRacing is running (live session or replay)

2. Start the relay agent:
```bash
cd tools/relay-agent
python main.py
```

3. Watch for connection confirmation:
```
[Relay] Connected to server
[Relay] Session started
```

### On Mac (or any browser):

4. Open the dashboard:
- Local: http://localhost:5173
- Or deployed URL

5. Navigate to Team → Live session

6. Verify:
- [ ] Session appears in list
- [ ] Drivers populate
- [ ] Telemetry updates in real-time
- [ ] Map shows car positions

## Logging Results

After testing, update `DEVELOPMENT_ENVIRONMENTS.md`:

1. Update the status matrix
2. Add entry to Update Log
3. Commit with:
```bash
git add DEVELOPMENT_ENVIRONMENTS.md
git commit -m "[PC] E2E test completed - [PASS/FAIL]"
git push origin main
```
