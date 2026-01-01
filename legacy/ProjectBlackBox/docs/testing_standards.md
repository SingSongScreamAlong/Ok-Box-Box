# Testing Standards and Conventions

This document outlines the testing standards and conventions for the ProjectPitBox dashboard application. Following these guidelines will ensure consistency across tests and make them easier to write, read, and maintain.

## Test File Organization

### File Location

- Place test files adjacent to the files they test
- Use the naming convention `[filename].(test|spec).(ts|tsx)`
- Example: For `MultiDriverValidationWrapper.tsx`, create `MultiDriverValidationWrapper.test.tsx` in the same directory

### Test File Structure

```typescript
// 1. Imports
import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test-utils/test-utils';
import { createMockDriver } from '../../test-utils/mock-factories';
import ComponentToTest from './ComponentToTest';

// 2. Mocks
jest.mock('../../services/WebSocketService');

// 3. Test suite
describe('ComponentToTest', () => {
  // 4. Setup/teardown
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  // 5. Tests grouped by functionality
  describe('rendering', () => {
    test('renders correctly with default props', () => {
      // Test implementation
    });
  });
  
  describe('user interactions', () => {
    test('handles click events', async () => {
      // Test implementation
    });
  });
});
```

## Naming Conventions

### Test Suite Names

- Use the component or function name as the describe block name
- For nested describe blocks, use functionality or scenario descriptions

### Test Names

- Start with a verb (renders, handles, calls, updates, etc.)
- Clearly describe what is being tested
- Include the expected outcome
- Examples:
  - `renders loading state when isLoading is true`
  - `calls onSelect when a driver is clicked`
  - `updates message list when new message is received`

## Test Implementation

### Arrange-Act-Assert Pattern

Follow the AAA pattern in each test:

```typescript
test('updates count when button is clicked', async () => {
  // Arrange
  const { getByRole } = renderWithProviders(<Counter />);
  const button = getByRole('button', { name: /increment/i });
  
  // Act
  await userEvent.click(button);
  
  // Assert
  expect(screen.getByText('Count: 1')).toBeInTheDocument();
});
```

### Querying Elements

- Prefer user-centric queries from Testing Library:
  1. `getByRole` - Most preferred
  2. `getByLabelText` - For form fields
  3. `getByText` - For non-interactive elements
  4. `getByTestId` - Last resort when other queries won't work

- Use `screen` object for queries after initial render

### Assertions

- Use specific assertions that clearly communicate intent
- Prefer positive assertions over negative ones
- Examples:
  ```typescript
  // Good
  expect(element).toBeInTheDocument();
  expect(button).toBeEnabled();
  
  // Avoid when possible
  expect(element).not.toBeNull();
  expect(elements.length).toBe(3);
  ```

## Mocking

### Service Mocks

- Create dedicated mock files for services in `__mocks__` directory
- Return predictable data from mock functions
- Reset mocks between tests with `jest.clearAllMocks()`

### Mock Data

- Use the mock factories from `test-utils/mock-factories.ts`
- Customize only the properties relevant to the test
- Example:
  ```typescript
  const mockDriver = createMockDriver({ 
    name: 'Test Driver', 
    status: 'inactive' 
  });
  ```

## Testing Asynchronous Code

### Promises and Async/Await

- Use `async/await` syntax for asynchronous tests
- Wait for state updates with `waitFor` or `findBy` queries

```typescript
test('loads data on mount', async () => {
  renderWithProviders(<DataComponent />);
  
  // Wait for loading to complete
  expect(await screen.findByText('Data loaded')).toBeInTheDocument();
});
```

### Timers

- Use Jest's fake timers for time-dependent tests
- Setup and cleanup properly:

```typescript
describe('with timers', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });
  
  test('updates after delay', () => {
    renderWithProviders(<DelayedComponent />);
    jest.advanceTimersByTime(1000);
    expect(screen.getByText('Updated')).toBeInTheDocument();
  });
});
```

## Testing Multi-Driver Components

### WebSocket Testing

- Use the `MockWebSocket` class from test-utils
- Simulate WebSocket events to test component reactions
- Example:
  ```typescript
  test('handles team message events', async () => {
    const { mockWebSocketService } = renderWithProviders(<TeamMessages />);
    
    mockWebSocketService.simulateMessage({
      type: 'team_message',
      data: createMockTeamMessage({ content: 'New message' })
    });
    
    expect(await screen.findByText('New message')).toBeInTheDocument();
  });
  ```

### Redux Integration Testing

- Use `renderWithProviders` with preloaded state
- Test component interaction with Redux state
- Example:
  ```typescript
  test('displays active driver', () => {
    const preloadedState = {
      drivers: {
        drivers: [createMockDriver({ id: 'driver-1', name: 'Active Driver' })],
        activeDriverId: 'driver-1'
      }
    };
    
    renderWithProviders(<DriverInfo />, { preloadedState });
    expect(screen.getByText('Active Driver')).toBeInTheDocument();
  });
  ```

## Test Coverage

- Aim for 80% code coverage for critical components
- Focus on testing:
  - Component rendering with different props
  - User interactions
  - Error states
  - Edge cases
  - Integration with services and state management

## Accessibility Testing

- Include basic accessibility assertions in component tests
- Use `jest-axe` for automated accessibility testing
- Example:
  ```typescript
  import { axe, toHaveNoViolations } from 'jest-axe';
  
  expect.extend(toHaveNoViolations);
  
  test('has no accessibility violations', async () => {
    const { container } = renderWithProviders(<MyComponent />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
  ```

## Continuous Integration

- All tests must pass before merging pull requests
- Coverage reports are generated automatically
- Test failures block merges to main branch

## Best Practices

1. **Keep tests focused**: Test one thing per test
2. **Avoid test interdependence**: Tests should not depend on other tests
3. **Use realistic data**: Tests should reflect real-world usage
4. **Test behavior, not implementation**: Focus on what the component does, not how it does it
5. **Maintain tests**: Update tests when component behavior changes
6. **Write tests first**: Consider Test-Driven Development for critical components
7. **Test error handling**: Ensure components handle errors gracefully
8. **Keep tests fast**: Optimize slow tests to maintain developer productivity
