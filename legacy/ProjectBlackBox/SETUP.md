# ProjectPitBox - Setup Guide

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+ with TimescaleDB
- iRacing (for live telemetry)

---

## 📦 Installation

### 1. Database Setup

```bash
# Install PostgreSQL and TimescaleDB
# macOS:
brew install postgresql timescaledb

# Start PostgreSQL
brew services start postgresql

# Create database
createdb pitbox

# Enable TimescaleDB extension
psql pitbox -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"

# Run schema
psql pitbox < database/schema.sql
```

### 2. Python Backend

```bash
# Install Python dependencies
cd relay_agent
pip install -r requirements.txt

# Install API dependencies
cd ../api
pip install -r requirements.txt

# Install iRacing SDK
pip install pyirsdk
```

### 3. Node.js Server

```bash
# Install dependencies
cd server
npm install

# Build
npm run build
```

### 4. React Dashboard

```bash
# Install dependencies
cd dashboard
npm install

# Start development server
npm run dev
```

---

## 🔧 Configuration

### Environment Variables

Create `.env` file in project root:

```bash
# Database
DATABASE_URL=postgresql://pitbox:pitbox@localhost:5432/pitbox

# API Keys (optional for voice)
OPENAI_API_KEY=your_openai_key
ELEVENLABS_API_KEY=your_elevenlabs_key

# Server
API_PORT=8000
WS_PORT=8001
```

---

## 🏁 Running the System

### Option A: Development Mode

**Terminal 1 - Database**:
```bash
# Already running from setup
```

**Terminal 2 - Python API**:
```bash
cd api
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 3 - Relay Agent (iRacing Connection)**:
```bash
cd relay_agent
python -m iracing_sdk_wrapper
```

**Terminal 4 - Dashboard**:
```bash
cd dashboard
npm run dev
```

### Option B: Production Mode

```bash
# TODO: Docker Compose setup
docker-compose up
```

---

## 🎮 Using the System

### 1. Start iRacing

- Launch iRacing
- Join a session (practice, qualify, or race)

### 2. Connect Relay Agent

```bash
cd relay_agent
python agent_main.py
```

This will:
- Connect to iRacing SDK
- Stream telemetry to backend (60Hz)
- Monitor session events
- Trigger analysis

### 3. Open Dashboard

Navigate to `http://localhost:3000`

You'll see:
- Live telemetry
- 3D track visualization
- Timing tower
- Team radio messages

### 4. Voice Communication

Say:
- "Hey team, how are my tires?"
- "When should I pit?"
- "Can I catch the guy ahead?"

Team responds with voice and updates UI.

---

## 📊 System Architecture

```
┌─────────────┐
│   iRacing   │
└──────┬──────┘
       │ SDK
       ▼
┌─────────────────┐
│  Relay Agent    │ ← Python, streams telemetry
│  (60Hz stream)  │
└────────┬────────┘
         │ WebSocket
         ▼
┌─────────────────┐
│  FastAPI Server │ ← Python, analysis systems
│  + WebSocket    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌──────────┐
│Database│ │Dashboard │ ← React, visualization
│PostGres│ │(Browser) │
└────────┘ └──────────┘
```

---

## 🧪 Testing

### Test Database Connection

```bash
cd database
python -c "from manager import DatabaseManager; db = DatabaseManager('postgresql://pitbox:pitbox@localhost:5432/pitbox'); db.create_tables(); print('✅ Database OK')"
```

### Test iRacing Connection

```bash
cd relay_agent
python test_iracing_sdk.py
```

### Test API

```bash
# Start API
cd api
uvicorn main:app --reload

# In another terminal
curl http://localhost:8000/health
```

---

## 🐛 Troubleshooting

### "Can't connect to iRacing"
- Make sure iRacing is running
- Make sure you're in a session (not main menu)
- Check `pyirsdk` is installed

### "Database connection failed"
- Check PostgreSQL is running: `brew services list`
- Check database exists: `psql -l | grep pitbox`
- Check connection string in `.env`

### "WebSocket connection failed"
- Check API is running on port 8000
- Check firewall settings
- Check browser console for errors

---

## 📁 Project Structure

```
ProjectPitBox/
├── relay_agent/          # Python - iRacing connection
│   ├── iracing_sdk_wrapper.py
│   ├── telemetry_streamer.py
│   ├── corner_performance_analyzer.py
│   ├── incident_analyzer.py
│   └── ...
│
├── database/             # Database layer
│   ├── schema.sql
│   ├── models.py
│   └── manager.py
│
├── api/                  # FastAPI backend
│   ├── main.py
│   └── requirements.txt
│
├── server/               # Node.js server (existing)
│   └── src/
│
├── dashboard/            # React frontend
│   └── src/
│
└── docs/                 # Documentation
```

---

## 🚀 Next Steps

1. **Test with live race**
   - Join iRacing session
   - Start relay agent
   - Verify data flow

2. **Configure voice**
   - Add API keys to `.env`
   - Test voice input/output

3. **Customize**
   - Adjust analysis parameters
   - Customize team responses
   - Configure UI preferences

---

## 📚 Documentation

- [Complete System Walkthrough](../brain/.../complete_system_walkthrough.md)
- [Implementation Plan](../brain/.../complete_implementation_plan.md)
- [Development Roadmap](../brain/.../development_status_roadmap.md)

---

## 🆘 Support

Issues? Check:
1. All services running
2. Database connected
3. iRacing session active
4. Firewall not blocking ports

Still stuck? Check logs:
- API: Console output
- Relay Agent: Console output
- Database: PostgreSQL logs
