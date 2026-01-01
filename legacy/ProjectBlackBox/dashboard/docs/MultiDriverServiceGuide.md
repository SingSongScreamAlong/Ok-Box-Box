# MultiDriverService Integration Guide

## Overview

The MultiDriverService is a critical component of the ProjectPitBox dashboard that bridges WebSocketService events with Redux state management for multi-driver collaboration features. It acts as an intermediary layer that processes WebSocket events, transforms them into appropriate Redux actions, and provides a clean API for components to interact with multi-driver functionality.

This guide explains how to use the MultiDriverService effectively, particularly in conjunction with the WebSocketService and Redux store.

## Table of Contents

1. [Architecture](#architecture)
2. [Initialization](#initialization)
3. [Driver Management](#driver-management)
4. [Team Communication](#team-communication)
5. [Handoff Management](#handoff-management)
6. [Driver Comparison](#driver-comparison)
7. [Error Handling](#error-handling)
8. [Testing](#testing)
9. [Security Considerations](#security-considerations)

## Architecture

The MultiDriverService follows a mediator pattern:

```
┌─────────────┐     ┌─────────────────┐     ┌───────────┐     ┌───────────────┐
│   UI        │     │                 │     │           │     │               │
│ Components  │◄───►│ MultiDriverService ◄───►  Redux   │◄───►│ WebSocketService │
│             │     │                 │     │           │     │               │
└─────────────┘     └─────────────────┘     └───────────┘     └───────────────┘
```

- **UI Components**: Interact with MultiDriverService to perform actions and receive updates
- **MultiDriverService**: Processes business logic and coordinates between Redux and WebSocketService
- **Redux**: Stores application state for multi-driver features
- **WebSocketService**: Handles real-time communication with the server

## Initialization

The MultiDriverService should be initialized once at application startup:

```typescript
import { MultiDriverService } from '../services/MultiDriverService';
import { store } from '../store';

// Initialize with Redux store
const multiDriverService = new MultiDriverService(store);

// Export as singleton
export default multiDriverService;
```

In your application entry point:

```typescript
import multiDriverService from '../services/multiDriverService';

// Initialize service when app starts
multiDriverService.initialize();
```

## Driver Management

### Getting Driver Information

```typescript
// Get all drivers
const drivers = multiDriverService.getAllDrivers();

// Get active driver
const activeDriver = multiDriverService.getActiveDriver();

// Get driver by ID
const driver = multiDriverService.getDriverById('driver-123');
```

### Switching Drivers

```typescript
// Switch to a different driver
multiDriverService.switchDriver('driver-456');
```

### Handling Driver Updates

The MultiDriverService automatically listens for driver updates from WebSocketService and updates Redux accordingly. You can subscribe to driver updates in your components using Redux selectors:

```typescript
import { useSelector } from 'react-redux';
import { selectAllDrivers, selectActiveDriver } from '../store/driversSlice';

function DriverDashboard() {
  const drivers = useSelector(selectAllDrivers);
  const activeDriver = useSelector(selectActiveDriver);
  
  // Component logic
}
```

## Team Communication

### Sending Team Messages

```typescript
// Send a regular team message
multiDriverService.sendTeamMessage('Hello team!');

// Send a high priority message
multiDriverService.sendTeamMessage('Important update!', 'high');

// Send a critical message
multiDriverService.sendTeamMessage('Emergency situation!', 'critical');
```

### Getting Team Messages

```typescript
// Get all team messages
const messages = multiDriverService.getTeamMessages();

// Get messages from a specific driver
const driverMessages = multiDriverService.getTeamMessagesByDriver('driver-123');
```

### Filtering Messages

```typescript
// Get only high priority messages
const highPriorityMessages = multiDriverService.getTeamMessages().filter(
  msg => msg.priority === 'high' || msg.priority === 'critical'
);
```

## Handoff Management

### Initiating a Handoff

```typescript
// Request a handoff to another driver
multiDriverService.initiateHandoff(
  'driver-456',                      // Target driver ID
  'Taking a break, please take over' // Optional notes
);
```

### Responding to a Handoff

```typescript
// Accept a handoff request
multiDriverService.acceptHandoff('handoff-789');

// Reject a handoff request
multiDriverService.rejectHandoff('handoff-789');

// Complete a handoff
multiDriverService.completeHandoff('handoff-789');
```

### Getting Handoff Information

```typescript
// Get all pending handoffs
const pendingHandoffs = multiDriverService.getPendingHandoffs();

// Get handoff by ID
const handoff = multiDriverService.getHandoffById('handoff-789');

// Check if there are any pending handoffs for the current driver
const hasIncomingHandoffs = multiDriverService.hasIncomingHandoffs();
```

## Driver Comparison

### Requesting a Comparison

```typescript
// Compare two drivers
multiDriverService.compareDrivers('driver-123', 'driver-456');
```

### Getting Comparison Results

```typescript
// Get latest comparison result
const comparison = multiDriverService.getLatestComparison();

// Get comparison by ID
const specificComparison = multiDriverService.getComparisonById('comparison-789');

// Get all comparisons
const allComparisons = multiDriverService.getAllComparisons();
```

## Error Handling

The MultiDriverService includes comprehensive error handling:

```typescript
try {
  multiDriverService.sendTeamMessage('Hello');
} catch (error) {
  console.error('Failed to send team message:', error);
}
```

For asynchronous operations, you can use the Promise-based API:

```typescript
multiDriverService.initiateHandoff('driver-456')
  .then(handoffId => {
    console.log(`Handoff initiated with ID: ${handoffId}`);
  })
  .catch(error => {
    console.error('Failed to initiate handoff:', error);
  });
```

### Error Types

The MultiDriverService can throw several types of errors:

- `ConnectionError`: WebSocket connection issues
- `ValidationError`: Invalid data format
- `AuthorizationError`: Permission issues
- `NotFoundError`: Resource not found
- `ServiceError`: General service errors

## Testing

### Unit Testing

When unit testing components that use MultiDriverService:

```typescript
// Mock MultiDriverService
jest.mock('../services/MultiDriverService', () => ({
  sendTeamMessage: jest.fn(),
  getActiveDriver: jest.fn().mockReturnValue({
    id: 'driver-123',
    name: 'Test Driver',
    status: 'active'
  }),
  // ... other methods
}));

// Test component
test('Component sends team message on button click', () => {
  // Render component
  const { getByText } = render(<TeamCommunication />);
  
  // Click send button
  fireEvent.click(getByText('Send'));
  
  // Verify MultiDriverService was called
  expect(MultiDriverService.sendTeamMessage).toHaveBeenCalled();
});
```

### Integration Testing

For integration testing between MultiDriverService and WebSocketService:

```typescript
// Mock WebSocketService
jest.mock('../services/WebSocketService', () => ({
  sendTeamMessage: jest.fn(),
  onTeamMessage: jest.fn(),
  // ... other methods
}));

// Test MultiDriverService integration
test('MultiDriverService forwards team messages to WebSocketService', () => {
  // Setup
  const mockStore = createMockStore();
  const multiDriverService = new MultiDriverService(mockStore);
  
  // Call method
  multiDriverService.sendTeamMessage('Test message', 'normal');
  
  // Verify WebSocketService was called
  expect(WebSocketService.sendTeamMessage).toHaveBeenCalledWith(
    'Test message',
    expect.any(String), // senderId
    expect.any(String), // senderName
    'normal'
  );
});
```

## Security Considerations

### Input Validation

The MultiDriverService performs validation on all inputs before passing them to WebSocketService:

```typescript
// This will throw a ValidationError if content is empty
multiDriverService.sendTeamMessage('');

// This will throw a ValidationError if driverId doesn't exist
multiDriverService.switchDriver('invalid-driver-id');
```

### Authentication

The MultiDriverService checks if the user is authenticated before performing sensitive operations:

```typescript
// This will throw an AuthorizationError if the user is not authenticated
multiDriverService.initiateHandoff('driver-456');
```

### Message Sanitization

All messages are sanitized before being sent to prevent XSS attacks:

```typescript
// HTML tags will be escaped
multiDriverService.sendTeamMessage('<script>alert("XSS")</script>');
```

### Rate Limiting

The MultiDriverService includes rate limiting to prevent abuse:

```typescript
// This will throw a RateLimitError if too many messages are sent in a short period
for (let i = 0; i < 100; i++) {
  multiDriverService.sendTeamMessage(`Message ${i}`);
}
```

## Best Practices

1. **Use the MultiDriverService API** instead of directly dispatching Redux actions or calling WebSocketService methods
2. **Handle errors appropriately** by catching exceptions and providing user feedback
3. **Subscribe to Redux state** for real-time updates rather than polling the MultiDriverService
4. **Initialize once** at application startup to ensure all event handlers are properly registered
5. **Clean up on application shutdown** by calling `multiDriverService.cleanup()`
6. **Use the provided helper methods** instead of manipulating data structures directly
7. **Follow the validation rules** to ensure data integrity and security
