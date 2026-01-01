# PitBox Windows Deployment Guide

## 🚀 Quick Start

1. **Extract the ZIP file** to a folder on your Windows PC
2. **Install Docker Desktop** (if not already installed):
   - Download from: https://www.docker.com/products/docker-desktop
   - Install and start Docker Desktop
3. **Run the setup script**:
   - Double-click `setup_windows.bat`
   - Follow the on-screen instructions
4. **Access PitBox**:
   - Dashboard: http://localhost
   - API: http://localhost/api

## 📋 System Requirements

### Minimum Requirements
- **OS**: Windows 10/11 (64-bit)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 5GB free space
- **CPU**: Intel/AMD 64-bit processor

### Software Requirements
- **Docker Desktop**: Latest version
- **Windows Subsystem for Linux 2** (WSL2) - installed automatically with Docker
- **Administrator privileges** for initial setup

## 🔧 Detailed Setup Instructions

### Step 1: Extract Files
```
Extract the PitBox_Windows.zip file to a folder like:
C:\Projects\PitBox
```

### Step 2: Install Docker Desktop
1. Download Docker Desktop from: https://www.docker.com/products/docker-desktop
2. Run the installer as Administrator
3. Start Docker Desktop
4. Wait for Docker to fully start (whale icon in system tray should be green)

### Step 3: Configure Environment
The setup script will create a `.env` file. You may need to edit it with your API keys:

```env
# Required API Keys (get from respective services)
OPENAI_API_KEY=your_openai_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Optional (can use defaults for testing)
JWT_SECRET=your-secure-jwt-secret
POSTGRES_PASSWORD=your-db-password
```

### Step 4: Start the System
Run `setup_windows.bat` and choose option 1 to start PitBox.

### Step 5: Access the Dashboard
Open your web browser and go to: **http://localhost**

## 🏗️ Architecture Overview

PitBox consists of several components:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Dashboard     │    │     Server      │    │   Database      │
│   (React)       │◄──►│   (Node.js)     │◄──►│  (PostgreSQL)   │
│   Port: 80      │    │   Port: 4000    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Relay Agent    │
                    │   (Python)      │
                    │   Port: 8765    │
                    └─────────────────┘
```

## 📊 Services Included

### Backend Server (Node.js)
- RESTful API for telemetry data
- AI-powered coaching (OpenAI GPT-4)
- Voice synthesis (ElevenLabs)
- Authentication & security

### Relay Agent (Python)
- iRacing SDK integration
- Telemetry data collection
- Real-time data transmission
- Simulation fallback mode

### Dashboard (React)
- Real-time telemetry visualization
- Multi-driver session management
- System monitoring
- Configuration management

### Database (PostgreSQL)
- Telemetry data storage
- User management
- Session tracking
- TimescaleDB for time-series data

## 🎮 Testing Telemetry Collection

### Option 1: Simulation Mode (Recommended for Testing)
The system includes a realistic iRacing simulation that works without iRacing installed:

1. Start the main system using `setup_windows.bat`
2. Open a new command prompt
3. Navigate to the relay_agent folder
4. Run: `python agent_main.py`

### Option 2: Real iRacing (Optional)
If you have iRacing installed and want to use real racing data:

1. Install the iRacing SDK: `pip install pyirsdk`
2. Start iRacing
3. Run the relay agent as described above

## 🔧 Troubleshooting

### Common Issues

#### Docker Issues
```
Error: "Docker is not installed"
Solution: Install Docker Desktop and ensure it's running
```

#### Port Conflicts
```
Error: "Port already in use"
Solution: Stop other applications using ports 80, 5432, 4000, 6379, 8765
```

#### Memory Issues
```
Error: "Insufficient memory"
Solution: Increase Docker Desktop memory allocation to at least 4GB
```

#### Permission Issues
```
Error: "Access denied"
Solution: Run setup_windows.bat as Administrator
```

### Checking System Status

Run `setup_windows.bat` and choose option 3 to view system status:

```bash
CONTAINER ID   IMAGE          STATUS              PORTS
abc123def456   pitbox-server  Up 2 minutes      0.0.0.0:4000->4000/tcp
def456ghi789   pitbox-postgres Up 2 minutes     0.0.0.0:5432->5432/tcp
ghi789jkl012   pitbox-dashboard Up 2 minutes   0.0.0.0:80->80/tcp
```

### Viewing Logs

Run `setup_windows.bat` and choose option 4 to view logs for troubleshooting.

## 📝 API Documentation

### Health Check
```bash
GET http://localhost/health
```

### Authentication
```bash
POST http://localhost/api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

### Telemetry Data
```bash
GET http://localhost/api/sessions/:sessionId/telemetry
Authorization: Bearer <jwt_token>
```

## 🚦 Stopping the System

Run `setup_windows.bat` and choose option 2 to stop all services.

## 🔄 Updating PitBox

1. Stop the current system
2. Extract the new version over the existing files
3. Run the setup script again
4. Choose option 1 to start with the updated version

## 📞 Support

### Getting Help
1. Check the logs using the setup script (option 4)
2. Verify Docker is running and has sufficient resources
3. Ensure all required ports are available
4. Check the .env file has correct configuration

### Common Commands

```batch
REM Start system
setup_windows.bat (choose option 1)

REM Stop system
setup_windows.bat (choose option 2)

REM View status
setup_windows.bat (choose option 3)

REM View logs
setup_windows.bat (choose option 4)

REM Reset system
setup_windows.bat (choose option 5)
```

## 🎯 Next Steps

1. **Test the Dashboard**: Visit http://localhost
2. **Try Telemetry Collection**: Run the relay agent
3. **Configure API Keys**: Add your OpenAI and ElevenLabs keys
4. **Explore Features**: Try multi-driver sessions and AI coaching

## 📋 File Structure

```
PitBox/
├── setup_windows.bat          # Main setup script
├── docker-compose.yml         # Docker orchestration
├── .env                       # Environment configuration
├── .env.example               # Configuration template
├── README_Windows.md          # This file
├── server/                    # Backend API server
├── relay_agent/               # Telemetry collection
├── dashboard/                 # React dashboard
└── deployment/               # Deployment scripts
```

---

**PitBox Windows Deployment - Ready for Racing!** 🏁
