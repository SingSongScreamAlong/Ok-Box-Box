// =====================================================================
// Header Component Tests
// =====================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Header } from '../layout/Header';

// Mock the auth store
const mockLogout = vi.fn();
const mockUser = { id: '1', email: 'test@example.com', displayName: 'Test User' };

vi.mock('../../stores/auth.store', () => ({
    useAuthStore: vi.fn(() => ({
        user: mockUser,
        logout: mockLogout,
    })),
}));

describe('Header', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderWithRouter = (component: React.ReactNode) => {
        return render(
            <BrowserRouter>
                {component}
            </BrowserRouter>
        );
    };

    it('should render user display name', () => {
        renderWithRouter(<Header />);

        expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('should render logout button', () => {
        renderWithRouter(<Header />);

        expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });

    it('should call logout when logout button clicked', () => {
        renderWithRouter(<Header />);

        const logoutButton = screen.getByText('Sign Out');
        fireEvent.click(logoutButton);

        expect(mockLogout).toHaveBeenCalledTimes(1);
    });
});
