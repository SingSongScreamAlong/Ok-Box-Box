import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock socket.io-client with proper structure
vi.mock('socket.io-client', () => {
    const mockSocket = {
        on: vi.fn().mockReturnThis(),
        off: vi.fn().mockReturnThis(),
        emit: vi.fn().mockReturnThis(),
        connect: vi.fn().mockReturnThis(),
        disconnect: vi.fn().mockReturnThis(),
        connected: false,
        io: {
            on: vi.fn().mockReturnThis(),
            off: vi.fn().mockReturnThis(),
        },
    };
    return {
        io: vi.fn(() => mockSocket),
    };
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});
