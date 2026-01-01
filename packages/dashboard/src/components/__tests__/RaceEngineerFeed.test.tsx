// =====================================================================
// RaceEngineerFeed Component Tests
// =====================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RaceEngineerFeed } from '../RaceEngineerFeed';

// Mock the socket client
vi.mock('../../lib/socket-client', () => ({
    socketClient: {
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn(),
    },
}));

// Mock date-fns format function
vi.mock('date-fns', () => ({
    format: vi.fn(() => '12:34:56'),
}));

describe('RaceEngineerFeed', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render empty state when no events', () => {
        render(<RaceEngineerFeed />);

        expect(screen.getByText('🤖 Race Intelligence')).toBeInTheDocument();
        expect(screen.getByText('Waiting for race events...')).toBeInTheDocument();
    });

    it('should have correct header with Voice Log badge', () => {
        render(<RaceEngineerFeed />);

        expect(screen.getByText('Voice Log')).toBeInTheDocument();
    });

    it('should render with proper container structure', () => {
        const { container } = render(<RaceEngineerFeed />);

        // Check for main container class
        expect(container.firstChild).toHaveClass('flex', 'flex-col', 'h-full');
    });
});
