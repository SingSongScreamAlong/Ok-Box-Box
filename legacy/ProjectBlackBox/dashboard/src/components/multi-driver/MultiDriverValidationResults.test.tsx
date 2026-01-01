import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MultiDriverValidationResults from './MultiDriverValidationResults';

describe('MultiDriverValidationResults', () => {
  // Sample validation results for testing
  const sampleResults = [
    {
      component: 'team_messages',
      status: 'success' as const,
      message: 'Team messages validated successfully',
      timestamp: '2025-07-14T10:30:00Z',
      details: {
        messageCount: 5,
        unreadCount: 2,
        priorityMessages: 1
      }
    },
    {
      component: 'handoff_manager',
      status: 'warning' as const,
      message: 'Handoff manager validated with warnings',
      timestamp: '2025-07-14T10:31:00Z',
      details: {
        pendingHandoffs: 2,
        completedHandoffs: 0,
        issues: ['Missing telemetry data']
      }
    },
    {
      component: 'driver_comparison',
      status: 'error' as const,
      message: 'Driver comparison validation failed',
      timestamp: '2025-07-14T10:32:00Z',
      details: {
        error: 'Missing driver data',
        driversLoaded: 1,
        requiredDrivers: 2
      }
    }
  ];

  describe('rendering', () => {
    test('renders all validation results when no component filter is applied', () => {
      render(<MultiDriverValidationResults results={sampleResults} component="" />);
      
      // Check that all results are rendered
      expect(screen.getByText('team messages')).toBeInTheDocument();
      expect(screen.getByText('handoff manager')).toBeInTheDocument();
      expect(screen.getByText('driver comparison')).toBeInTheDocument();
      
      // Check that messages are displayed
      expect(screen.getByText('Team messages validated successfully')).toBeInTheDocument();
      expect(screen.getByText('Handoff manager validated with warnings')).toBeInTheDocument();
      expect(screen.getByText('Driver comparison validation failed')).toBeInTheDocument();
    });

    test('renders only filtered results when component filter is applied', () => {
      render(<MultiDriverValidationResults results={sampleResults} component="team_messages" />);
      
      // Check that only team_messages results are rendered
      expect(screen.getByText('team messages')).toBeInTheDocument();
      expect(screen.getByText('Team messages validated successfully')).toBeInTheDocument();
      
      // Check that other components are not rendered
      expect(screen.queryByText('handoff manager')).not.toBeInTheDocument();
      expect(screen.queryByText('driver comparison')).not.toBeInTheDocument();
    });

    test('displays "No validation results" message when no results match filter', () => {
      render(<MultiDriverValidationResults results={sampleResults} component="driver_selector" />);
      
      expect(screen.getByText('No validation results available for this component.')).toBeInTheDocument();
    });

    test('displays timestamps in locale time format', () => {
      // Mock the toLocaleTimeString method to return a predictable value for testing
      const originalToLocaleTimeString = Date.prototype.toLocaleTimeString;
      Date.prototype.toLocaleTimeString = jest.fn(() => '10:30:00 AM');
      
      render(<MultiDriverValidationResults results={sampleResults} component="" />);
      
      // Check that timestamps are formatted correctly
      const timestamps = screen.getAllByText('10:30:00 AM');
      expect(timestamps.length).toBe(3);
      
      // Restore the original method
      Date.prototype.toLocaleTimeString = originalToLocaleTimeString;
    });
  });

  describe('details toggle functionality', () => {
    test('shows and hides details when toggle is clicked', async () => {
      const user = userEvent.setup();
      render(<MultiDriverValidationResults results={sampleResults} component="" />);
      
      // Initially, details should be hidden
      expect(screen.queryByText(/"messageCount": 5/)).not.toBeInTheDocument();
      
      // Find and click the "Show Details" button for team_messages
      const showDetailsButtons = screen.getAllByText('Show Details');
      await user.click(showDetailsButtons[0]);
      
      // Details should now be visible
      expect(screen.getByText(/"messageCount": 5/)).toBeInTheDocument();
      expect(screen.getByText(/"unreadCount": 2/)).toBeInTheDocument();
      expect(screen.getByText(/"priorityMessages": 1/)).toBeInTheDocument();
      
      // The button should now say "Hide Details"
      expect(screen.getByText('Hide Details')).toBeInTheDocument();
      
      // Click the "Hide Details" button
      await user.click(screen.getByText('Hide Details'));
      
      // Details should be hidden again
      expect(screen.queryByText(/"messageCount": 5/)).not.toBeInTheDocument();
    });

    test('can toggle multiple details sections independently', async () => {
      const user = userEvent.setup();
      render(<MultiDriverValidationResults results={sampleResults} component="" />);
      
      // Find all "Show Details" buttons
      const showDetailsButtons = screen.getAllByText('Show Details');
      
      // Click the first and third buttons
      await user.click(showDetailsButtons[0]); // team_messages
      await user.click(showDetailsButtons[2]); // driver_comparison
      
      // Check that both details sections are visible
      expect(screen.getByText(/"messageCount": 5/)).toBeInTheDocument();
      expect(screen.getByText(/"error": "Missing driver data"/)).toBeInTheDocument();
      
      // The middle one should still be hidden
      expect(screen.queryByText(/"pendingHandoffs": 2/)).not.toBeInTheDocument();
      
      // Now click the second button
      await user.click(showDetailsButtons[1]); // handoff_manager
      
      // All three details sections should be visible
      expect(screen.getByText(/"messageCount": 5/)).toBeInTheDocument();
      expect(screen.getByText(/"pendingHandoffs": 2/)).toBeInTheDocument();
      expect(screen.getByText(/"error": "Missing driver data"/)).toBeInTheDocument();
    });
  });

  describe('status styling', () => {
    test('applies correct styling based on status', () => {
      const { container } = render(<MultiDriverValidationResults results={sampleResults} component="" />);
      
      // Get all result items
      const resultItems = container.querySelectorAll('[class^="sc-"]');
      
      // Check that there are at least 3 styled components (one for each result)
      expect(resultItems.length).toBeGreaterThanOrEqual(3);
      
      // Check for status-specific styling (this is a bit tricky with styled-components)
      // We'll check for the existence of the status in the component's props or class
      const html = container.innerHTML;
      
      // Check for success styling
      expect(html).toContain('rgba(76, 175, 80, 0.1)');
      
      // Check for warning styling
      expect(html).toContain('rgba(255, 152, 0, 0.1)');
      
      // Check for error styling
      expect(html).toContain('rgba(244, 67, 54, 0.1)');
    });
  });
});
