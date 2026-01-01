import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MultiDriverValidationWrapper from './MultiDriverValidationWrapper';
import MultiDriverErrorBoundary from './MultiDriverErrorBoundary';

// Mock the error boundary component to simulate errors
jest.mock('./MultiDriverErrorBoundary', () => {
  return {
    __esModule: true,
    default: ({ children, onError, fallback }: any) => {
      return (
        <div data-testid="error-boundary">
          {/* Add a button to simulate error triggering */}
          <button 
            data-testid="trigger-error" 
            onClick={() => onError(new Error('Test error'))}
          >
            Trigger Error
          </button>
          {children}
        </div>
      );
    }
  };
});

// Mock the loading state component
jest.mock('./MultiDriverLoadingState', () => {
  return {
    __esModule: true,
    default: ({ message }: { message: string }) => (
      <div data-testid="loading-state">{message}</div>
    )
  };
});

describe('MultiDriverValidationWrapper', () => {
  const defaultProps = {
    component: 'test_component',
    isValidating: false,
    children: <div data-testid="test-children">Test Content</div>
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    test('renders children when not validating', () => {
      render(<MultiDriverValidationWrapper {...defaultProps} />);
      
      // Check that the wrapper renders with correct header
      expect(screen.getByText('Multi-Driver Component')).toBeInTheDocument();
      expect(screen.getByText('test component')).toBeInTheDocument();
      
      // Check that children are rendered
      expect(screen.getByTestId('test-children')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    test('renders loading state when isValidating is true', () => {
      render(
        <MultiDriverValidationWrapper 
          {...defaultProps} 
          isValidating={true} 
        />
      );
      
      // Check that loading state is rendered with correct message
      expect(screen.getByTestId('loading-state')).toBeInTheDocument();
      expect(screen.getByText('Validating test component...')).toBeInTheDocument();
      
      // Children should not be visible during validation
      expect(screen.queryByTestId('test-children')).not.toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    test('displays error UI when an error occurs', async () => {
      const user = userEvent.setup();
      render(<MultiDriverValidationWrapper {...defaultProps} />);
      
      // Trigger an error
      await user.click(screen.getByTestId('trigger-error'));
      
      // Check that error UI is rendered
      expect(screen.getByText('Error in test component')).toBeInTheDocument();
      expect(screen.getByText('An error occurred while validating this component.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    });

    test('retry button resets error state', async () => {
      const user = userEvent.setup();
      render(<MultiDriverValidationWrapper {...defaultProps} />);
      
      // Trigger an error
      await user.click(screen.getByTestId('trigger-error'));
      
      // Click retry button
      await user.click(screen.getByRole('button', { name: 'Retry' }));
      
      // Check that error UI is no longer displayed and children are visible again
      expect(screen.queryByText('Error in test component')).not.toBeInTheDocument();
      expect(screen.getByTestId('test-children')).toBeInTheDocument();
    });
  });

  describe('component name formatting', () => {
    test('formats component name by replacing underscores with spaces', () => {
      render(
        <MultiDriverValidationWrapper 
          {...defaultProps} 
          component="team_messages" 
        />
      );
      
      expect(screen.getByText('team messages')).toBeInTheDocument();
    });
  });
});
