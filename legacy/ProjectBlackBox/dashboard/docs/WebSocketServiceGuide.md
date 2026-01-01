# WebSocketService Integration Guide

## Overview

The WebSocketService is a core component of the ProjectPitBox dashboard that provides real-time communication capabilities. It supports both Socket.io and native WebSocket connections, enabling features like multi-driver collaboration, telemetry data streaming, and component validation.

This guide explains how to use the WebSocketService securely and effectively, particularly in conjunction with the MultiDriverService for team collaboration features.

## Table of Contents

1. [Connection Management](#connection-management)
2. [Message Security](#message-security)
3. [Multi-Driver Support](#multi-driver-support)
4. [Event Handling](#event-handling)
5. [Component Validation](#component-validation)
6. [Performance Considerations](#performance-considerations)
7. [Testing](#testing)

## Connection Management

### Establishing a Connection

The WebSocketService supports two connection types:

1. **Socket.io** - Preferred for most use cases due to its reliability and built-in features
2. **Native WebSocket** - Used as a fallback or for specific performance requirements

```typescript
// Connect using Socket.io (recommended)
webSocketService.connect('http://localhost:8000', ConnectionType.SOCKET_IO);

// Connect using native WebSocket
webSocketService.connect('ws://localhost:8000/ws', ConnectionType.NATIVE_WEBSOCKET);
```

### Connection Status

Always check the connection status before attempting to send messages:

```typescript
if (webSocketService.isConnected()) {
  // Safe to send messages
}
```

### Disconnection

Always disconnect properly when your component unmounts:

```typescript
useEffect(() => {
  // Connect when component mounts
  webSocketService.connect('http://localhost:8000', ConnectionType.SOCKET_IO);
  
  return () => {
    // Disconnect when component unmounts
    webSocketService.disconnect();
  };
}, []);
```

## Message Security

### Message Validation

All messages sent through the WebSocketService are automatically validated using the `websocketMessageValidator` utility. This ensures that messages conform to expected schemas and contain required fields.

The validation process:

1. Checks if the message conforms to the expected schema for its event type
2. Sanitizes the payload to prevent XSS and other injection attacks
3. Returns an error if validation fails

### Sending Messages Securely

When sending messages, always check the return value of `sendMessage()` to ensure the message was sent successfully:

```typescript
const success = webSocketService.sendMessage('team_message', {
  content: 'Hello team!',
  senderId: 'driver-123',
  senderName: 'John Doe',
  priority: 'normal'
});

if (!success) {
  // Handle error
}
```

### Handling Incoming Messages

Always validate and sanitize incoming message data before using it in your UI:

```typescript
webSocketService.onTeamMessage((data) => {
  // The data has already been validated by the WebSocketService
  // But you should still sanitize any user-generated content before rendering
  const sanitizedContent = sanitizeHtml(data.message.content);
  
  // Now safe to use in your UI
  setMessages(prev => [...prev, { ...data.message, content: sanitizedContent }]);
});
```

## Multi-Driver Support

The WebSocketService integrates with MultiDriverService to provide team collaboration features:

### Team Messages

```typescript
// Send a team message
webSocketService.sendTeamMessage(
  'Starting my driving session now', // content
  'driver-123',                      // senderId
  'John Doe',                        // senderName
  'normal'                           // priority (normal, high, critical)
);

// Listen for team messages
webSocketService.onTeamMessage((data) => {
  console.log(`New message from ${data.message.senderName}: ${data.message.content}`);
});
```

### Driver Handoffs

```typescript
// Initiate a handoff
const handoffId = webSocketService.initiateHandoff(
  'driver-123',                      // fromDriverId
  'driver-456',                      // toDriverId
  'Taking over for the next session' // notes
);

// Respond to a handoff
webSocketService.respondToHandoff(
  'handoff-789',                     // handoffId
  'confirmed'                        // status (confirmed, cancelled, completed)
);

// Listen for handoff requests
webSocketService.onHandoffRequest((data) => {
  console.log(`Handoff requested from ${data.handoff.fromDriverId} to ${data.handoff.toDriverId}`);
});

// Listen for handoff responses
webSocketService.onHandoffResponse((data) => {
  console.log(`Handoff ${data.handoffId} status: ${data.status}`);
});
```

### Driver Switching

```typescript
// Switch active driver
webSocketService.switchDriver('driver-123');

// Listen for driver updates
webSocketService.onDriverUpdate((data) => {
  console.log(`Driver ${data.driver.name} status: ${data.driver.status}`);
});

// Listen for driver list updates
webSocketService.onDriverList((data) => {
  console.log(`Active driver: ${data.activeDriverId}`);
  console.log(`Total drivers: ${data.drivers.length}`);
});
```

### Driver Comparisons

```typescript
// Request a driver comparison
const comparisonId = webSocketService.requestDriverComparison(
  'driver-123', // driverAId
  'driver-456'  // driverBId
);

// Listen for comparison results
webSocketService.onComparisonResult((data) => {
  console.log(`Comparison ${data.comparisonId} results:`, data.metrics);
});
```

## Event Handling

### Registering Event Handlers

All event handlers return a cleanup function that should be called when the component unmounts:

```typescript
useEffect(() => {
  // Register event handler
  const cleanup = webSocketService.onTeamMessage((data) => {
    // Handle team message
  });
  
  // Return cleanup function
  return cleanup;
}, []);
```

### Available Events

- `onConnect` - Connection established
- `onDisconnect` - Connection lost
- `onError` - Connection error
- `onTeamMessage` - New team message received
- `onDriverUpdate` - Driver status updated
- `onDriverList` - Driver list updated
- `onHandoffRequest` - New handoff request
- `onHandoffResponse` - Handoff response received
- `onComparisonResult` - Driver comparison results
- `onValidationSummary` - Component validation results
- `onTelemetry` - Telemetry data received
- `onTrackPosition` - Track position update
- `onVideoData` - Video data received

## Component Validation

The WebSocketService provides component validation capabilities for testing UI components:

```typescript
// Request validation for a component
webSocketService.requestValidation('team_messages');

// Listen for validation results
webSocketService.onValidationSummary((data) => {
  console.log('Validation results:', data);
});
```

## Performance Considerations

### Connection Optimization

- Use a single WebSocketService instance across your application
- Connect only when necessary and disconnect when not in use
- Consider using Socket.io for its automatic reconnection capabilities

### Message Optimization

- Minimize message size by sending only necessary data
- Batch updates when possible instead of sending many small messages
- Use appropriate message priorities to ensure critical messages are processed first

## Testing

### Unit Testing

The WebSocketService includes mock methods for testing:

```typescript
// Mock a team message in tests
webSocketService.emitMockTeamMessage({
  message: {
    id: 'msg-123',
    senderId: 'driver-123',
    senderName: 'Test Driver',
    timestamp: Date.now(),
    content: 'Test message',
    priority: 'normal'
  }
});
```

### Integration Testing

When testing integration between WebSocketService and MultiDriverService:

1. Mock the WebSocketService methods in your tests
2. Verify that events are properly propagated to Redux
3. Test both success and error scenarios

Example:

```typescript
// Mock WebSocketService
jest.mock('../services/WebSocketService', () => ({
  sendTeamMessage: jest.fn(),
  onTeamMessage: jest.fn(),
  // ... other methods
}));

// Test MultiDriverService integration
test('MultiDriverService propagates team messages to Redux', () => {
  // Setup
  const mockDispatch = jest.fn();
  const mockStore = { dispatch: mockDispatch };
  
  // Get the onTeamMessage callback
  const onTeamMessageMock = WebSocketService.onTeamMessage;
  let teamMessageCallback;
  
  // Initialize MultiDriverService
  const multiDriverService = new MultiDriverService(mockStore);
  
  // Verify onTeamMessage was registered
  expect(onTeamMessageMock).toHaveBeenCalled();
  teamMessageCallback = onTeamMessageMock.mock.calls[0][0];
  
  // Simulate team message event
  const mockMessage = {
    message: {
      id: 'msg-123',
      senderId: 'driver-123',
      senderName: 'Test Driver',
      timestamp: Date.now(),
      content: 'Test message',
      priority: 'normal'
    }
  };
  
  teamMessageCallback(mockMessage);
  
  // Verify Redux action was dispatched
  expect(mockDispatch).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'drivers/addTeamMessage',
      payload: expect.objectContaining({
        id: 'msg-123',
        content: 'Test message'
      })
    })
  );
});
```

### End-to-End Testing

For E2E testing, consider using a test WebSocket server that can:

1. Record all received messages
2. Send predefined responses
3. Simulate various error conditions

This allows testing the full communication flow from UI interaction to WebSocket message and back.
