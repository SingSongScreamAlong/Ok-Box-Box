import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MultiDriverErrorBoundary from './MultiDriverErrorBoundary';

// Create a component that throws an error for testing purposes
const ErrorThrowingComponent = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div data-testid="normal-component">Normal Component Content</div>;
};

// Helper function to suppress React's console error in tests
const originalConsoleError = console.error;
const suppressError = () => {
  console.error = jest.fn();
};
const restoreError = () => {
  console.error = originalConsoleError;
};

describe('MultiDriverErrorBoundary', () => {
  beforeEach(() => {
    suppressError();
  });

  afterEach(() => {
    restoreError();
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    test('renders children when there is no error', () => {
      render(
        <MultiDriverErrorBoundary>
          <div data-testid="test-child">Test Child</div>
        </MultiDriverErrorBoundary>
      );

      expect(screen.getByTestId('test-child')).toBeInTheDocument();
      expect(screen.getByText('Test Child')).toBeInTheDocument();
    });

    test('renders default error UI when a child component throws', () => {
      // We need to use the React error boundary testing pattern
      const { rerender } = render(
        <MultiDriverErrorBoundary>
          <ErrorThrowingComponent shouldThrow={false} />
        </MultiDriverErrorBoundary>
      );

      // First verify the component renders normally
      expect(screen.getByTestId('normal-component')).toBeInTheDocument();

      // Then cause it to throw an error
      rerender(
        <MultiDriverErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </MultiDriverErrorBoundary>
      );

      // Check that the error UI is displayed
      expect(screen.getByText('Multi-Driver Component Error')).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    });

    test('renders custom fallback UI when provided and an error occurs', () => {
      const customFallback = <div data-testid="custom-fallback">Custom Error UI</div>;

      const { rerender } = render(
        <MultiDriverErrorBoundary fallback={customFallback}>
          <ErrorThrowingComponent shouldThrow={false} />
        </MultiDriverErrorBoundary>
      );

      // First verify the component renders normally
      expect(screen.getByTestId('normal-component')).toBeInTheDocument();

      // Then cause it to throw an error
      rerender(
        <MultiDriverErrorBoundary fallback={customFallback}>
          <ErrorThrowingComponent shouldThrow={true} />
        </MultiDriverErrorBoundary>
      );

      // Check that the custom fallback is displayed
      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    test('calls onError callback when an error occurs', () => {
      const onErrorMock = jest.fn();

      const { rerender } = render(
        <MultiDriverErrorBoundary onError={onErrorMock}>
          <ErrorThrowingComponent shouldThrow={false} />
        </MultiDriverErrorBoundary>
      );

      // First verify the component renders normally
      expect(screen.getByTestId('normal-component')).toBeInTheDocument();

      // Then cause it to throw an error
      rerender(
        <MultiDriverErrorBoundary onError={onErrorMock}>
          <ErrorThrowingComponent shouldThrow={true} />
        </MultiDriverErrorBoundary>
      );

      // Check that onError was called
      expect(onErrorMock).toHaveBeenCalled();
      expect(onErrorMock.mock.calls[0][0]).toBeInstanceOf(Error);
      expect(onErrorMock.mock.calls[0][0].message).toBe('Test error');
    });
  });

  describe('retry functionality', () => {
    test('resets error state when retry button is clicked', async () => {
      // Create a component that can toggle throwing errors
      const ToggleErrorComponent = () => {
        const [shouldThrow, setShouldThrow] = React.useState(true);
        
        if (shouldThrow) {
          throw new Error('Test error');
        }
        
        return (
          <div>
            <span data-testid="success-message">Component recovered</span>
            <button onClick={() => setShouldThrow(true)}>Break again</button>
          </div>
        );
      };
      
      // Mock the setState call in the error boundary
      const user = userEvent.setup();
      
      render(
        <MultiDriverErrorBoundary>
          <ToggleErrorComponent />
        </MultiDriverErrorBoundary>
      );
      
      // Check that error UI is shown initially
      expect(screen.getByText('Multi-Driver Component Error')).toBeInTheDocument();
      
      // Click retry button
      await user.click(screen.getByRole('button', { name: 'Retry' }));
      
      // Check that component is now recovered
      expect(screen.getByTestId('success-message')).toBeInTheDocument();
      expect(screen.getByText('Component recovered')).toBeInTheDocument();
      
      // Break it again to verify full cycle
      await user.click(screen.getByRole('button', { name: 'Break again' }));
      
      // Check that error UI is shown again
      expect(screen.getByText('Multi-Driver Component Error')).toBeInTheDocument();
    });
  });
});
