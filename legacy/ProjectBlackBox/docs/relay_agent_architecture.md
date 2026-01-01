# PitBox Relay Agent & Streaming System Architecture

This document outlines the architecture for the PitBox Relay Agent, a lightweight client that enables drivers to automatically stream telemetry and video data to the ProjectPitBox system.

## System Overview

The PitBox Relay Agent is designed to be:
- Self-installing and auto-updating
- Extremely lightweight with minimal performance impact
- Zero-configuration for drivers
- Capable of operating in multiple streaming modes
- Resilient and self-healing

## Architecture Components

```
┌─────────────────────────────────┐      ┌──────────────────────────────┐
│                                 │      │                              │
│    Driver PC                    │      │    PitBox Backend          │
│    ┌─────────────────────────┐  │      │    ┌────────────────────┐    │
│    │                         │  │      │    │                    │    │
│    │  PitBox Relay Agent   │  │      │    │  Telemetry Ingest  │    │
│    │  ┌─────────────────┐    │  │      │    │  Server            │    │
│    │  │ Core Agent      │    │  │      │    │                    │    │
│    │  └─────────────────┘    │  │      │    └────────────────────┘    │
│    │  ┌─────────────────┐    │  │      │    ┌────────────────────┐    │
│    │  │ Telemetry       │────┼──┼──────┼────▶ Redis/Kafka Queue  │    │
│    │  │ Collector       │    │  │      │    │                    │    │
│    │  └─────────────────┘    │  │      │    └────────────────────┘    │
│    │  ┌─────────────────┐    │  │      │    ┌────────────────────┐    │
│    │  │ Video Encoder   │────┼──┼──────┼────▶ Video Ingest       │    │
│    │  │ (NVENC/AMD)     │    │  │      │    │ Server (SRT/RTMP)  │    │
│    │  └─────────────────┘    │  │      │    └────────────────────┘    │
│    │  ┌─────────────────┐    │  │      │    ┌────────────────────┐    │
│    │  │ External        │    │  │      │    │                    │    │
│    │  │ Encoder         │────┼──┼──────┼────▶ Sync Engine        │    │
│    │  │ Detection       │    │  │      │    │                    │    │
│    │  └─────────────────┘    │  │      │    └────────────────────┘    │
│    │  ┌─────────────────┐    │  │      │    ┌────────────────────┐    │
│    │  │ Auto-Update     │◀───┼──┼──────┼────▶ Update Server      │    │
│    │  │ System          │    │  │      │    │                    │    │
│    │  └─────────────────┘    │  │      │    └────────────────────┘    │
│    │  ┌─────────────────┐    │  │      │    ┌────────────────────┐    │
│    │  │ System Tray UI  │    │  │      │    │ Frontend Dashboard │    │
│    │  └─────────────────┘    │  │      │    │ (Engineers/Coaches)│    │
│    └─────────────────────────┘  │      │    └────────────────────┘    │
│                                 │      │                              │
└─────────────────────────────────┘      └──────────────────────────────┘
```

## Driver-Side Components

### Core Agent
- **Purpose**: Main controller for the relay agent
- **Features**:
  - Auto-starts with Windows or when iRacing launches
  - Monitors system resources
  - Coordinates between telemetry and video components
  - Handles error logging and recovery
  - Manages connection to backend servers

### Telemetry Collector
- **Purpose**: Capture and transmit real-time telemetry data
- **Technologies**:
  - iRacing SDK or pyirsdk for data capture
  - WebSocket or encrypted UDP for transmission
- **Features**:
  - Minimal CPU usage (<1%)
  - Automatic reconnection on connection loss
  - Configurable sampling rate based on network conditions
  - Data compression for bandwidth optimization

### Video Encoder (Internal)
- **Purpose**: Capture and encode video from the driver's game
- **Technologies**:
  - NVENC (NVIDIA) or AMD VCE for hardware encoding
  - FFmpeg or OBS headless mode for capture
  - SRT or WebRTC for low-latency streaming
- **Features**:
  - Automatic quality adjustment based on available bandwidth
  - Configurable bitrate (2-4 Mbps default)
  - Auto-disable when GPU/CPU usage exceeds thresholds
  - Multiple quality presets (low, medium, high)

### External Encoder Detection
- **Purpose**: Support for external capture devices
- **Features**:
  - Detect HDMI output to capture cards (Elgato, AVerMedia, etc.)
  - Synchronize telemetry data with external video stream
  - Provide timing information for backend sync

### Auto-Update System
- **Purpose**: Keep the agent up to date without driver intervention
- **Features**:
  - Check for updates on startup and periodically
  - Download updates in background
  - Apply updates when iRacing is not running
  - Rollback capability if update fails

### System Tray UI
- **Purpose**: Minimal interface for status and configuration
- **Features**:
  - Connection status indicator
  - Streaming mode selection (Telemetry Only, Video+Telemetry)
  - Manual update check
  - Diagnostic information
  - Exit option

## Backend Components

### Telemetry Ingest Server
- **Purpose**: Receive and process telemetry data
- **Technologies**:
  - Node.js or Go for high-concurrency WebSocket handling
  - UDP server for alternative transport
- **Features**:
  - Authentication and encryption
  - Rate limiting
  - Connection management
  - Initial data validation

### Redis/Kafka Queue
- **Purpose**: Buffer and distribute telemetry data
- **Features**:
  - High-throughput message handling
  - Persistence for reliability
  - Topic-based routing
  - Replay capability for analysis

### Video Ingest Server
- **Purpose**: Receive and process video streams
- **Technologies**:
  - SRT protocol for low-latency streaming
  - RTMP with Nginx for alternative transport
  - FFmpeg for transcoding if needed
- **Features**:
  - Stream authentication
  - Adaptive bitrate handling
  - Stream health monitoring
  - Recording capability

### Sync Engine
- **Purpose**: Combine telemetry and video data in real-time
- **Features**:
  - Time synchronization between data streams
  - Buffer management for jitter compensation
  - Metadata injection for synchronized playback
  - Real-time and historical synchronization

### Update Server
- **Purpose**: Provide updates to relay agents
- **Features**:
  - Version management
  - Staged rollouts
  - Update packages for different platforms
  - Rollback support

### Frontend Dashboard
- **Purpose**: Interface for engineers and coaches
- **Features**:
  - Live telemetry visualization
  - Track map with position
  - Video player with synchronized telemetry
  - Session recording and replay
  - Analysis tools

## Communication Protocols

### Telemetry Streaming
- WebSocket (primary) - secure, bidirectional communication
- UDP (fallback) - lower overhead, higher throughput
- Data format: JSON or binary protocol (MessagePack/Protobuf)
- Compression: zlib or LZ4 for bandwidth efficiency

### Video Streaming
- SRT (primary) - secure, low-latency streaming
- WebRTC (alternative) - browser-compatible streaming
- RTMP (fallback) - widely supported, higher latency
- H.264/H.265 encoding with configurable profiles

### Control Channel
- WebSocket for bidirectional control messages
- REST API for configuration and status updates
- Authentication: JWT or API keys

## Installation and Deployment

### Driver Installation
- Single executable installer (NSIS or Inno Setup)
- Silent installation option for team deployment
- Prerequisites check (DirectX, Visual C++ Redistributables)
- Auto-start configuration

### Backend Deployment
- Docker containers for all components
- Kubernetes orchestration for scaling
- DigitalOcean as primary hosting platform
- Load balancing for high availability

## Security Considerations

- End-to-end encryption for all data transmission
- Authentication for all connections
- Rate limiting to prevent DoS attacks
- Secure storage of credentials
- Regular security audits

## Performance Optimization

### Driver-Side
- Adaptive sampling rate for telemetry based on CPU load
- Dynamic video encoding parameters based on GPU availability
- Background processing priority to minimize impact on game
- Memory usage limits and garbage collection optimization

### Backend
- Horizontal scaling for ingest servers
- Caching for frequently accessed data
- Database sharding for historical data
- CDN integration for video distribution

## Future Expandability

- Training goals system with performance tracking
- Driver profile synchronization
- Multi-driver stint handoff management
- Remote control panel for engineers
- AI-powered analysis and recommendations
- Mobile app for engineers and coaches
- Integration with team communication systems

## Development Roadmap

1. **Phase 1: Core Functionality**
   - Telemetry-only mode implementation
   - Basic backend ingest and storage
   - Simple dashboard for engineers

2. **Phase 2: Video Integration**
   - Internal video encoder implementation
   - Video ingest server setup
   - Sync engine development

3. **Phase 3: Advanced Features**
   - External encoder support
   - Auto-update system
   - Enhanced dashboard with analysis tools

4. **Phase 4: Scaling and Optimization**
   - Performance optimizations
   - Scaling infrastructure
   - Security hardening

5. **Phase 5: Future Capabilities**
   - Training goals system
   - Multi-driver support
   - Remote control capabilities
