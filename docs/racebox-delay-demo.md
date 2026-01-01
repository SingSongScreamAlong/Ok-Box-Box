# RaceBox Broadcast Delay + Demo Mode

## Overview

RaceBox supports production-ready broadcast overlays with:
- **Server-authoritative delay** (0–120s) for spoiler protection
- **Demo mode** for offline OBS layout testing
- **Public-safe data redaction** ensuring competitive data never leaks

## Broadcast Delay

### How It Works

1. Director sets delay via Director UI or socket event
2. Server buffers broadcast events for specified duration
3. Events flush to `broadcast:session:{id}` room after delay
4. Driver/team surfaces remain real-time (use `session:{id}` room)

### Supported Delays

| Setting | Use Case |
|---------|----------|
| 0s (LIVE) | No delay, real-time |
| 10s | Minor spoiler protection |
| 30s | Standard broadcast delay |
| 60s | Conservative delay |
| 120s | Maximum protection |

### Director Control

```javascript
// Set delay
socket.emit('broadcast:delay:set', { sessionId: 'sess_123', delayMs: 30000 });

// Get current state
socket.emit('broadcast:delay:get', { sessionId: 'sess_123' });

// Listen for state updates
socket.on('broadcast:delay:state', (state) => {
    console.log(state.delayMs, state.bufferDepthByEvent);
});
```

### Room Separation

| Room | Who Joins | Delay Applied |
|------|-----------|---------------|
| `session:{id}` | Drivers, teams, race control | Never |
| `broadcast:session:{id}` | Public overlays, spectators | Yes, if configured |

---

## Demo Mode

Demo mode generates deterministic fake data for OBS layout testing. No server connection required.

### Usage

Add `?demo=1` to any overlay URL:

```
/racebox/overlay/timing-tower?sessionId=demo-session&demo=1
/racebox/overlay/lower-third?sessionId=demo-session&demo=1&seed=custom
```

### Parameters

| Param | Description |
|-------|-------------|
| `demo=1` | Enable demo mode |
| `seed=xyz` | Custom seed for deterministic data |
| `sessionId` | Session identifier (affects generated drivers) |

### Features

- 20–60 cars with realistic names and numbers
- Simulated battles and overtakes
- Occasional position changes
- Timing emitted at 2Hz, frames at 5Hz
- Stable across reloads (same seed = same data)

### OBS Instructions

1. Add Browser Source in OBS
2. Set URL: `http://localhost:5173/racebox/overlay/timing-tower?demo=1&sessionId=test`
3. Size: 1920x1080 (or match your stream resolution)
4. Background: Transparent

---

## Public Timing

### Route

```
/racebox/public/:sessionId
```

### Behavior

- No authentication required (or uses public session token)
- Automatically joins broadcast room (receives delayed data)
- Shows redacted timing only

### Redacted Fields

The following fields are NEVER sent to broadcast/public feeds:

| Category | Fields |
|----------|--------|
| Fuel | fuelLevel, fuelPct, fuelPerLap |
| Tires | tireWear, tireTemps, tirePressure |
| Strategy | lapDelta, setupHints, pitStrategy |
| AI/Steward | stewardNotes, faultProbability, aiRecommendation |

---

## OBS Setup Guide

### Recommended Browser Source Settings

| Setting | Value |
|---------|-------|
| Width | 1920 |
| Height | 1080 |
| FPS | 30-60 |
| Custom CSS | `:root { background: transparent; }` |

### Overlay URLs

**Timing Tower:**
```
/racebox/overlay/timing-tower?sessionId=SESSION_ID&theme=dark
```

**Lower Third:**
```
/racebox/overlay/lower-third?sessionId=SESSION_ID&driverId=DRIVER_ID
```

**Battle Box:**
```
/racebox/overlay/battle-box?sessionId=SESSION_ID&driverA=A&driverB=B
```

---

## Recommended Delay Settings

| Broadcast Type | Delay | Rationale |
|----------------|-------|-----------|
| Live stream to viewers | 30s | Standard spoiler protection |
| Replay/highlights | 0s | No delay needed |
| Betting/gambling contexts | 60–120s | Regulatory requirements |
| Team-only viewing | 0s | Internal use |

---

## Troubleshooting

### Overlay shows no data in demo mode
- Ensure `?demo=1` is in the URL
- Check browser console for errors
- Verify sessionId parameter is present

### Delay not applying
- Confirm you joined `broadcast:session:{id}` room (not `session:{id}`)
- Check Director capability (`racebox:director:control`)
- Verify server logs show delay set event

### Data shows restricted fields
- This should never happen - redaction is server-enforced
- Report as security issue if observed
