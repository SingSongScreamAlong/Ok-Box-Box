# Ok, Box Box Relay Agent

Connects iRacing to your Ok, Box Box dashboard for live telemetry, AI race engineer, and session analysis.

## ⚠️ Requirements

- **Windows 10+** with iRacing installed
- **Python 3.10+** ([Download Python](https://www.python.org/downloads/))
- iRacing must be running (practice, qualifying, or race)

## Quick Start

### 1. Download & Extract
Download the latest release and extract to any folder.

### 2. Setup
Double-click **`SETUP.bat`** — it will:
- Verify Python is installed
- Install dependencies from `requirements.txt`
- Create `.env` from the template and open it for editing

Set your auth token in `.env`:
```
SERVER_URL=https://api.okboxbox.com
AUTH_TOKEN=your_token_here
```

Get your auth token from: **Ok, Box Box App → Settings → Relay Token**

### 3. Run
Double-click **`START-RELAY.bat`** or run manually:
```powershell
python main.py
```

The relay will:
- Auto-detect when iRacing starts a session
- Stream telemetry to your dashboard
- Enable voice commands with your AI engineer
- Log sessions for post-race analysis

## Features

| Feature | Description |
|---------|-------------|
| **Live Telemetry** | 60Hz car data to your dashboard |
| **AI Engineer** | Voice commands during racing |
| **Session Logging** | Compressed race logs for analysis |
| **Auto-Reconnect** | Handles network interruptions |
| **System Tray** | Runs quietly in background |

### Custom Server URL
```powershell
python main.py --url https://your-controlbox-server.com
```

### Verbose Logging
```powershell
python main.py -v
```

### Custom Poll Rate
```powershell
python main.py --rate 20  # 20 Hz telemetry
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SERVER_URL` | `https://api.okboxbox.com` | Ok Box Box server URL |
| `POLL_RATE_HZ` | `10` | Telemetry updates per second |
| `LOG_LEVEL` | `INFO` | Logging verbosity |
| `LOG_TELEMETRY` | `false` | Log each telemetry frame |

## What It Does

1. **Connects to iRacing** via pyirsdk (Windows shared memory)
2. **Reads live telemetry** at configurable rate (default 10 Hz):
   - Car positions, speeds, gaps
   - Flag states
   - Lap times
3. **Detects incidents** by monitoring iRacing's incident counters
4. **Sends data to ControlBox Server** via Socket.IO WebSocket
5. **Receives situational awareness updates** from the server

## Troubleshooting

### "pyirsdk not installed"
```powershell
pip install pyirsdk
```

### "Failed to connect to iRacing"
- Ensure iRacing is running
- Make sure you're in a session (not lobby)
- Try starting a replay if no live session available

### "Connection refused to server"
- Check the `SERVER_URL` in your `.env` is correct
- Verify firewall isn't blocking the connection
- Try `python main.py -v` for verbose output

## Development

The relay is structured as:
- `main.py` - Entry point and main loop
- `iracing_reader.py` - pyirsdk wrapper
- `data_mapper.py` - iRacing → ControlBox protocol translation
- `controlbox_client.py` - Socket.IO server client
- `config.py` - Configuration and constants
