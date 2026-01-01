# Dashboard Testing Strategy

This document outlines a comprehensive testing strategy for the ProjectPitBox dashboard application, with special emphasis on multi-driver components and real-time data handling.

## Current Testing Status

The current testing infrastructure is minimal:
- Only a default React test file (`App.test.tsx`) exists
- No comprehensive test coverage for components, services, or utilities
- No integration or end-to-end tests
- No specific tests for multi-driver components

## Testing Goals

1. **Improve Code Quality**: Identify and fix bugs early in the development process
2. **Ensure Reliability**: Verify that components work as expected under various conditions
3. **Facilitate Refactoring**: Enable safe code changes with confidence
4. **Document Behavior**: Tests serve as living documentation of expected component behavior
5. **Validate Multi-Driver Features**: Ensure robust handling of team-based interactions

## Testing Levels

### 1. Unit Tests

**Target Coverage**: 80% of all components, services, and utilities

**Key Areas to Test**:
- Individual React components (rendering, props handling, state changes)
- Service functions (WebSocketService, MultiDriverService)
- Utility functions
- Redux actions and reducers (especially driversSlice)

**Tools**:
- Jest
- React Testing Library
- jest-dom

### 2. Integration Tests

**Target Coverage**: Critical component interactions and data flows

**Key Areas to Test**:
- Component interactions within feature groups
- Redux state management with connected components
- WebSocket service integration with components
- Multi-driver component interactions

**Tools**:
- Jest
- React Testing Library
- Mock Service Worker (MSW) for API mocking

### 3. End-to-End Tests

**Target Coverage**: Critical user flows and scenarios

**Key Areas to Test**:
- Complete user journeys
- Multi-driver handoff workflows
- Validation server interactions
- Real-time data visualization

**Tools**:
- Cypress
- Playwright

## Multi-Driver Component Testing Strategy

### Components to Test

1. **Driver Selector**
   - Rendering of driver profiles
   - Status updates
   - Selection functionality
   - Error states

2. **Team Messages**
   - Message rendering
   - Priority handling
   - Read/unread status
   - Attachment handling
   - Error states

3. **Handoff Manager**
   - Request creation
   - Status transitions
   - UI state for different handoff statuses
   - Error handling

4. **Driver Comparison**
   - Data visualization
   - Performance metric calculations
   - Responsive layout
   - Error states

### Testing Approaches

#### Mock-Based Testing

Create detailed mock data that mirrors the structure from the validation server:

```typescript
// Example mock for team messages
const teamMessagesMock = [
  {
    id: "msg_1",
    content: "Strategy update: Switch to medium tires on next pit stop",
    senderId: "driver_1",
    senderName: "John Driver",
    priority: "high",
    sentAt: "2025-07-14T10:30:00Z",
    read: false,
    attachment: {
      type: "strategy",
      url: "https://example.com/attachments/123",
      name: "Strategy-1.json"
    }
  },
  // Additional messages...
];
```

#### Event-Based Testing

Test WebSocket event handling:

```typescript
// Example test for team message event handling
test('handles team message events correctly', async () => {
  // Setup component with mocked WebSocketService
  render(<TeamMessages />);
  
  // Simulate WebSocket message event
  act(() => {
    mockWebSocketService.simulateEvent('team_message', {
      message: {
        id: "msg_new",
        content: "Test message",
        // Other properties...
      }
    });
  });
  
  // Assert component updated correctly
  expect(screen.getByText("Test message")).toBeInTheDocument();
  expect(screen.getByText("John Driver")).toBeInTheDocument();
});
```

#### Error Boundary Testing

Test error handling in multi-driver components:

```typescript
test('renders error boundary when component throws', async () => {
  // Mock a component that throws an error
  jest.spyOn(console, 'error').mockImplementation(() => {});
  
  // Force an error in the component
  jest.spyOn(TeamMessages.prototype, 'render').mockImplementation(() => {
    throw new Error('Test error');
  });
  
  // Render with error boundary
  render(
    <MultiDriverErrorBoundary>
      <TeamMessages />
    </MultiDriverErrorBoundary>
  );
  
  // Assert error boundary rendered correctly
  expect(screen.getByText(/error in team messages/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
});
```

## Implementation Roadmap

### Phase 1: Setup Testing Infrastructure (Week 1)

1. **Configure Testing Tools**
   - Update Jest configuration
   - Add React Testing Library setup
   - Configure test coverage reporting

2. **Create Test Utilities**
   - Test renderers for components with providers
   - Mock factories for common data structures
   - WebSocket service mocks

3. **Document Testing Standards**
   - Naming conventions
   - Test structure
   - Mock data management

### Phase 2: Unit Testing Core Components (Weeks 2-3)

1. **Test Redux State Management**
   - Actions
   - Reducers
   - Selectors

2. **Test Service Layer**
   - WebSocketService
   - MultiDriverService
   - Validation services

3. **Test Utility Functions**
   - Helper functions
   - Data transformations
   - Formatting utilities

### Phase 3: Multi-Driver Component Testing (Weeks 4-5)

1. **Driver Selector Tests**
   - Component rendering
   - Interaction tests
   - Redux integration

2. **Team Messages Tests**
   - Message rendering
   - Filtering and sorting
   - WebSocket event handling

3. **Handoff Manager Tests**
   - Request flow
   - Status handling
   - UI state transitions

4. **Driver Comparison Tests**
   - Data visualization
   - Metric calculations
   - Responsive layout

### Phase 4: Integration and E2E Testing (Weeks 6-8)

1. **Setup Cypress/Playwright**
   - Configure environment
   - Create test helpers

2. **Create Critical Path Tests**
   - Driver handoff workflow
   - Team communication flow
   - Validation server interaction

3. **Performance Testing**
   - Component rendering performance
   - WebSocket message handling
   - UI responsiveness under load

## Continuous Integration

1. **GitHub Actions Workflow**
   - Run tests on pull requests
   - Generate and publish coverage reports
   - Fail builds that don't meet coverage thresholds

2. **Pre-commit Hooks**
   - Run relevant tests for changed files
   - Enforce test coverage requirements

## Best Practices

1. **Test Organization**
   - Co-locate tests with implementation files
   - Group tests by feature or component
   - Use descriptive test names

2. **Mock Data Management**
   - Create reusable mock factories
   - Version control large test fixtures
   - Document mock data structure

3. **Testing Real-time Components**
   - Use fake timers for time-dependent tests
   - Mock WebSocket connections
   - Test both success and failure paths

4. **Accessibility Testing**
   - Include accessibility assertions in component tests
   - Use axe-core for automated accessibility testing

## Conclusion

This testing strategy provides a comprehensive approach to ensuring the quality and reliability of the ProjectPitBox dashboard, with special emphasis on the multi-driver components. By implementing this strategy, we can improve code quality, facilitate safe refactoring, and ensure that the application meets its requirements for real-time performance and reliability.
