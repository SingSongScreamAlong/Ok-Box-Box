# Windows Requirements for ProjectPitBox

## Overview

This document outlines the Windows-specific requirements for the ProjectPitBox driver app and relay agent. Since iRacing is a Windows-only application, the driver app must be fully compatible with Windows operating systems to capture and process telemetry data from iRacing.

## Driver App Windows Requirements

### System Requirements

- **Operating System**: Windows 10 or Windows 11 (64-bit)
- **Processor**: Intel Core i5 or equivalent (recommended)
- **Memory**: 8GB RAM (minimum), 16GB RAM (recommended)
- **Storage**: 500MB available space for the driver app
- **Graphics**: DirectX 11 compatible graphics card
- **Network**: Stable internet connection for telemetry data transmission

### Software Dependencies

- **Node.js**: v16.x or later
- **Electron**: v24.x or later (included in package.json)
- **iRacing**: Latest version installed
- **Visual C++ Redistributable**: Latest version (required for node-irsdk)

### Windows-Specific Modules

- **node-irsdk**: This is a Windows-only dependency that interfaces with the iRacing SDK
  - Listed as an optional dependency in package.json
  - Requires proper installation on Windows for iRacing telemetry access
  - Not functional on macOS (development only)

### Screen Capture on Windows

- The driver app uses `electron-screenshot-app` and `screenshot-desktop` for video capture
- On Windows, these libraries use different native methods than on macOS:
  - Windows: Uses GDI/Desktop Duplication API
  - Requires proper permissions for screen recording

### Building for Windows

- Use `electron-forge` for packaging:
  ```bash
  npm run make
  ```
- Windows-specific build configuration is in `electron-forge.config.js`
- Produces `.exe` installer for Windows distribution

## Relay Agent Windows Requirements

### Python Environment

- **Python**: v3.8 or later
- **Virtual Environment**: Recommended for dependency isolation

### Python Dependencies

- **pyirsdk**: Windows-specific package for iRacing SDK access
- **psutil**: For system monitoring
- **websockets**: For WebSocket communication
- **opencv-python**: For video processing
- **numpy**: For numerical operations
- **requests**: For HTTP requests
- **websocket-client**: For WebSocket client functionality
- **Pillow**: For image processing

### Installation on Windows

```bash
# Create virtual environment
python -m venv relay_agent_venv

# Activate virtual environment (Windows)
relay_agent_venv\Scripts\activate

# Install dependencies
pip install psutil websockets opencv-python numpy requests websocket-client Pillow pyirsdk
```

## Development Workflow

### Cross-Platform Development

- Core functionality can be developed on macOS or Linux
- Mock data can be used for testing on non-Windows platforms
- Final testing and validation must be performed on Windows with iRacing

### Windows-Specific Testing

- Video capture functionality must be tested on Windows
- iRacing SDK integration can only be tested on Windows
- Full end-to-end pipeline validation requires Windows

## Deployment Considerations

- **Auto-updates**: Windows-specific update mechanism
- **Installer**: Windows installer should handle all dependencies
- **Permissions**: Proper Windows permissions for screen capture and system access
- **Startup**: Option to run at Windows startup

## Known Windows-Specific Issues

- Screen capture may require additional permissions on Windows 10/11
- iRacing SDK access requires the iRacing client to be installed
- Some antivirus software may block screen recording functionality

## Validation Checklist for Windows

- [ ] Driver app builds successfully on Windows
- [ ] Screen capture works on Windows with iRacing
- [ ] iRacing SDK integration functions correctly
- [ ] Relay agent receives and processes video frames
- [ ] Full telemetry pipeline works end-to-end
- [ ] Performance is acceptable on target Windows systems
