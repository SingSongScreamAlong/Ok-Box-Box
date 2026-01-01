# PitBox Hybrid Cloud System - User Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Driver App](#driver-app)
4. [Dashboard](#dashboard)
5. [Multi-Driver Features](#multi-driver-features)
6. [AI Coaching](#ai-coaching)
7. [Voice Commands](#voice-commands)
8. [Troubleshooting](#troubleshooting)
9. [FAQ](#faq)

## Introduction

The PitBox Hybrid Cloud System is a comprehensive telemetry and coaching platform for iRacing sim racing. It combines local data collection with cloud-based processing to provide real-time feedback, AI coaching, and team coordination features.

### Key Features

- **Real-time Telemetry**: Capture and analyze iRacing telemetry data
- **AI Coaching**: Receive personalized driving tips and feedback
- **Voice Interaction**: Natural voice commands and audio feedback
- **Multi-Driver Support**: Team coordination and driver handoffs
- **Performance Dashboard**: Real-time monitoring and analysis
- **Hybrid Architecture**: Combines local processing with cloud capabilities

## Getting Started

### System Requirements

- **Operating System**: Windows 10/11 (64-bit) for Driver App
- **CPU**: Intel Core i5 or equivalent (i7 recommended)
- **RAM**: 8GB minimum (16GB recommended)
- **Storage**: 500MB free space
- **Network**: Stable internet connection (5Mbps+ upload speed)
- **Software**: iRacing subscription and installation
- **Browser**: Chrome, Firefox, or Edge for Dashboard access

### Installation

#### Driver App (Windows)

1. Download the latest installer from [GitHub Releases](https://github.com/SingSongScreamAlong/pitboxdriverapp/releases)
2. Run the installer and follow the prompts
3. Launch PitBox Driver App from your Start menu
4. Enter your API keys when prompted (if you have them)

#### Dashboard (Any Platform)

1. Access the dashboard at your configured URL:
   - Local: http://localhost:3000
   - Cloud: https://your-configured-domain.com
2. Log in with your team credentials
3. Select your role (Driver, Coach, or Observer)

## Driver App

### Main Interface

![Driver App Interface](../assets/screenshots/driver_app_main.png)

1. **Connection Status**: Shows status of iRacing, Relay Agent, and Cloud connections
2. **Telemetry Display**: Real-time data from your current session
3. **AI Coach Panel**: Coaching feedback and suggestions
4. **Voice Control**: Voice command indicator and settings
5. **Team Status**: Team member status and handoff controls

### First-Time Setup

1. Launch the Driver App
2. Go to **Settings > Configuration**
3. Configure the following:
   - **Relay Agent**: Local WebSocket URL (default: ws://localhost:8765)
   - **Cloud Backend**: Your team's cloud endpoint
   - **API Keys**: Enter your OpenAI and ElevenLabs API keys
   - **Voice Settings**: Configure voice recognition sensitivity
4. Click **Save Configuration**
5. Restart the app when prompted

### Using with iRacing

1. Launch iRacing and join a session
2. The Driver App will automatically detect iRacing and begin collecting data
3. The connection indicator will turn green when successful
4. Telemetry data will appear in real-time

## Dashboard

### Main Interface

![Dashboard Interface](../assets/screenshots/dashboard_main.png)

1. **Team Overview**: Status of all team drivers
2. **Telemetry Panels**: Real-time data visualization
3. **Track Map**: Position tracking and lap analysis
4. **Competitor Analysis**: Compare performance with competitors
5. **Communication Panel**: Team messaging and coordination

### Dashboard Navigation

- **Home**: Overall team status and summary
- **Driver**: Detailed view of the selected driver
- **Analysis**: Performance metrics and comparisons
- **Settings**: Dashboard configuration options
- **Admin**: Team management (admin users only)

### Performance Monitoring

The dashboard includes several performance monitoring tools:

1. **Telemetry Graphs**: Real-time and historical data visualization
2. **Lap Analysis**: Compare lap times and identify areas for improvement
3. **Sector Breakdown**: Detailed analysis of performance by track sector
4. **Tire Wear**: Visual representation of tire degradation
5. **Fuel Calculator**: Estimate remaining fuel and pit stop strategy

## Multi-Driver Features

### Team Communication

1. **Text Chat**: Built-in messaging system for team coordination
2. **Voice Alerts**: Important notifications delivered via voice
3. **Strategy Sharing**: Share race strategies and setup notes

### Driver Handoffs

1. **Requesting a Handoff**:
   - Click the "Request Handoff" button in the Driver App
   - Select the target driver from the team roster
   - Add optional notes about car condition or strategy
   - Click "Send Request"

2. **Accepting a Handoff**:
   - Incoming requests appear in the notification panel
   - Review the request details and car status
   - Click "Accept" to begin the handoff process
   - Follow the on-screen instructions for a smooth transition

3. **Handoff Coordination**:
   - The dashboard will display the handoff status to all team members
   - Automated voice countdown will guide the timing
   - Telemetry data will transfer to the new driver automatically

## AI Coaching

### Setup and Configuration

1. Go to **Settings > AI Coach** in the Driver App
2. Configure your preferences:
   - **Coaching Style**: Aggressive, Balanced, or Supportive
   - **Focus Areas**: Braking, Racing Line, Consistency, etc.
   - **Feedback Frequency**: How often you receive coaching tips
   - **Voice Settings**: Voice type, volume, and speed

### Using the AI Coach

1. The AI coach analyzes your driving in real-time
2. Feedback appears in the Coach Panel and via voice (if enabled)
3. Suggestions are tailored to your skill level and focus areas
4. Review detailed analysis after each session in the Dashboard

### Coaching Features

- **Real-time Tips**: Immediate feedback on driving technique
- **Lap Analysis**: Post-lap breakdown of performance
- **Skill Development**: Personalized improvement plan
- **Reference Comparison**: Compare with optimal racing lines
- **Video Analysis**: AI-powered review of your driving footage

## Voice Commands

### Available Commands

| Command | Action |
|---------|--------|
| "PitBox, status" | Reports system status |
| "PitBox, lap time" | Reports current lap time |
| "PitBox, fuel status" | Reports fuel level and estimate |
| "PitBox, tire wear" | Reports tire condition |
| "PitBox, coach on/off" | Enables/disables AI coaching |
| "PitBox, request handoff" | Initiates driver handoff process |
| "PitBox, team message" | Records a message for the team |
| "PitBox, strategy" | Reports current race strategy |

### Using Voice Commands

1. Voice recognition is always listening for the wake word "PitBox"
2. Speak clearly and at a normal pace
3. A tone will sound when a command is recognized
4. Wait for the response before giving another command

## Troubleshooting

### Common Issues

#### Driver App Not Detecting iRacing

1. Ensure iRacing is running and you're in an active session
2. Restart the Driver App
3. Check if iRacing is running with administrator privileges
4. Verify firewall settings aren't blocking the connection

#### Dashboard Not Receiving Data

1. Check that the Relay Agent is running
2. Verify WebSocket connection settings
3. Check your network connection
4. Restart the Relay Agent service

#### AI Coach Not Responding

1. Verify your API keys are correctly entered
2. Check your internet connection
3. Ensure you have sufficient API credits
4. Restart the AI coaching service

#### Voice Commands Not Working

1. Check microphone settings and permissions
2. Adjust voice recognition sensitivity
3. Try speaking more clearly and directly
4. Restart the voice recognition service

### Diagnostic Tools

1. **Connection Tester**: Settings > Diagnostics > Test Connections
2. **Log Viewer**: Settings > Diagnostics > View Logs
3. **System Check**: Settings > Diagnostics > System Check

## FAQ

### General Questions

**Q: Is PitBox compatible with other racing simulators?**
A: Currently, PitBox is optimized for iRacing. Support for other simulators is planned for future releases.

**Q: How much bandwidth does the system use?**
A: The system typically uses 2-5 Mbps upload bandwidth during normal operation. Video streaming features may increase this requirement.

**Q: Can I use PitBox without the cloud features?**
A: Yes, the system can operate in local-only mode with reduced functionality. AI coaching and some team features will be limited.

### Technical Questions

**Q: How do I update to the latest version?**
A: The Driver App will automatically check for updates on startup. You can also manually check by going to Help > Check for Updates.

**Q: Can I run multiple instances on the same network?**
A: Yes, multiple drivers can use PitBox on the same network. Each instance needs its own API keys for full functionality.

**Q: How secure is my data?**
A: All data transmission uses encrypted WebSocket connections. API keys are stored locally with encryption and never transmitted to other team members.

### Support

For additional support:
- **Documentation**: [https://pitbox.docs.singscream.com](https://pitbox.docs.singscream.com)
- **GitHub Issues**: [https://github.com/SingSongScreamAlong/pitboxdriverapp/issues](https://github.com/SingSongScreamAlong/pitboxdriverapp/issues)
- **Email Support**: support@singscream.com
