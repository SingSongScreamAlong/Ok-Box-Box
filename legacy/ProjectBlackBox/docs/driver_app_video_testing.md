# Driver App Video Capture Testing Strategy

## Overview

This document outlines the testing strategy for the ProjectPitBox driver app's video capture functionality, with special consideration for cross-platform development and Windows-specific requirements.

## Testing Environments

### Development Testing (macOS/Linux)

While full end-to-end testing requires Windows with iRacing, initial development and integration testing can be performed on macOS or Linux with the following limitations:

- **Mock Mode**: Use `mockCapture: true` in video settings for simulated frames
- **Relay Agent**: The Python-based relay agent can run on any platform
- **WebSocket Communication**: Connection between driver app and relay agent can be tested
- **Frame Processing**: Basic frame capture and processing can be validated

### Production Testing (Windows)

Complete validation must be performed on Windows with iRacing:

- **Real Capture**: Screen/window capture from actual iRacing sessions
- **iRacing SDK**: Full integration with iRacing telemetry via node-irsdk
- **Performance**: Frame rate and resource usage under real conditions
- **End-to-End**: Complete pipeline from capture to relay to dashboard

## Test Categories

### Unit Tests

- **VideoCapture Service**: Test individual methods with mocks
- **IPC Handlers**: Test main process IPC handlers
- **Configuration**: Test AppConfig integration

### Integration Tests

- **Driver App ↔ Relay Agent**: Test WebSocket communication
- **PitBoxCore ↔ VideoCapture**: Test service integration
- **Main Process ↔ Renderer**: Test IPC communication

### End-to-End Tests

- **Full Pipeline**: Test complete flow from capture to dashboard
- **Long-Running**: Test stability over extended sessions
- **Error Recovery**: Test reconnection and error handling

## Test Scripts

### video-capture-test.ts

This script tests the VideoCapture service in isolation:

- Initializes VideoCapture with configurable settings
- Connects to relay agent via WebSocket
- Captures and sends frames
- Reports events and errors

Usage:
```bash
# Build TypeScript
npm run build

# Run test with Electron
npm run test:video
```

### Manual Testing Procedure

1. Start relay agent:
   ```bash
   # Activate virtual environment
   source relay_agent_venv/bin/activate  # On Windows: relay_agent_venv\Scripts\activate
   
   # Run relay agent
   cd relay_agent
   python agent_main.py
   ```

2. Start driver app:
   ```bash
   npm run start
   ```

3. Enable video capture via tray menu

4. Verify in relay agent logs that frames are being received

## Cross-Platform Considerations

### macOS Development

- Use try/catch blocks for Electron-specific APIs
- Provide fallbacks for Windows-specific features
- Use environment detection for platform-specific code

### Windows-Specific Testing

- Test with various Windows versions (10, 11)
- Verify screen capture permissions
- Test with different iRacing configurations
- Validate with multiple monitor setups

## Validation Checklist

### Basic Functionality

- [ ] VideoCapture initializes correctly
- [ ] Relay agent connection established
- [ ] Frames captured at specified resolution and rate
- [ ] Frames transmitted to relay agent

### Error Handling

- [ ] Graceful handling of relay agent disconnection
- [ ] Recovery from capture errors
- [ ] Proper cleanup on shutdown

### Performance

- [ ] CPU usage within acceptable limits
- [ ] Memory usage stable over time
- [ ] Frame rate consistent with settings

## Future Test Improvements

- Automated UI testing with Spectron
- Performance benchmarking tools
- Continuous integration for cross-platform testing
- Telemetry simulation for non-Windows testing
