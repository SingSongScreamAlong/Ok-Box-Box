import React from 'react';
import { render, screen } from '@testing-library/react';
import MultiDriverLoadingState from './MultiDriverLoadingState';

describe('MultiDriverLoadingState', () => {
  describe('rendering', () => {
    test('renders with default medium size', () => {
      render(<MultiDriverLoadingState message="Loading test..." />);
      
      // Check that the spinner and message are rendered
      const loadingElement = screen.getByText('Loading test...');
      expect(loadingElement).toBeInTheDocument();
      
      // Check that the container has the correct classes
      const container = loadingElement.parentElement;
      expect(container).toHaveClass('multi-driver-loading');
      expect(container).toHaveClass('size-medium');
    });

    test('renders with small size when specified', () => {
      render(<MultiDriverLoadingState message="Loading test..." size="small" />);
      
      // Check that the spinner and message are rendered
      const loadingElement = screen.getByText('Loading test...');
      expect(loadingElement).toBeInTheDocument();
      
      // Check that the container has the correct classes
      const container = loadingElement.parentElement;
      expect(container).toHaveClass('multi-driver-loading');
      expect(container).toHaveClass('size-small');
    });

    test('renders with large size when specified', () => {
      render(<MultiDriverLoadingState message="Loading test..." size="large" />);
      
      // Check that the spinner and message are rendered
      const loadingElement = screen.getByText('Loading test...');
      expect(loadingElement).toBeInTheDocument();
      
      // Check that the container has the correct classes
      const container = loadingElement.parentElement;
      expect(container).toHaveClass('multi-driver-loading');
      expect(container).toHaveClass('size-large');
    });

    test('displays the provided message', () => {
      const testMessage = 'Custom loading message';
      render(<MultiDriverLoadingState message={testMessage} />);
      
      // Check that the custom message is displayed
      expect(screen.getByText(testMessage)).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    test('spinner is presentational and does not affect screen readers', () => {
      const { container } = render(<MultiDriverLoadingState message="Loading test..." />);
      
      // Find the spinner element
      const spinner = container.querySelector('.spinner');
      expect(spinner).not.toBeNull();
      
      // The spinner should not have any accessibility attributes that would make it
      // announced by screen readers, as the message is sufficient
      expect(spinner).not.toHaveAttribute('role');
      expect(spinner).not.toHaveAttribute('aria-label');
    });

    test('loading text is visible to screen readers', () => {
      render(<MultiDriverLoadingState message="Loading test..." />);
      
      // The loading text should be visible to screen readers
      const loadingText = screen.getByText('Loading test...');
      expect(loadingText).toBeVisible();
      expect(loadingText).toHaveClass('loading-text');
    });
  });
});
