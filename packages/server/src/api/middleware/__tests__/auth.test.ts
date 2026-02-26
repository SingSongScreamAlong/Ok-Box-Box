/**
 * Auth Middleware Tests
 * Tests for authentication middleware behavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';

// Mock the auth service before importing
vi.mock('../../../services/auth/auth-service.js', () => {
    const mockAuthService = {
        verifySupabaseToken: vi.fn(),
        verifyToken: vi.fn(),
        login: vi.fn(),
        createUser: vi.fn(),
    };
    return {
        AuthService: vi.fn(() => mockAuthService),
        getAuthService: vi.fn(() => mockAuthService),
    };
});

vi.mock('../../../db/client.js', () => ({
    pool: {
        query: vi.fn().mockResolvedValue({ rows: [] }),
    },
}));

vi.mock('../../../services/billing/entitlement-service.js', () => ({
    getEntitlementService: vi.fn(() => ({
        getUserEntitlements: vi.fn().mockResolvedValue([]),
    })),
}));

describe('Auth Middleware Integration', () => {
    let app: Express;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.resetModules();
    });

    it('should reject requests without Authorization header', async () => {
        app = express();
        app.use(express.json());

        const { requireAuth } = await import('../auth.js');
        app.get('/protected', requireAuth, (_req, res) => {
            res.json({ success: true });
        });

        const res = await request(app)
            .get('/protected')
            .expect(401);

        expect(res.body.error).toBeDefined();
    });

    it('should reject requests with malformed Authorization header', async () => {
        app = express();
        app.use(express.json());

        const { requireAuth } = await import('../auth.js');
        app.get('/protected', requireAuth, (_req, res) => {
            res.json({ success: true });
        });

        const res = await request(app)
            .get('/protected')
            .set('Authorization', 'NotBearer token')
            .expect(401);

        expect(res.body.error).toBeDefined();
    });

    it('should allow optionalAuth to pass without token', async () => {
        app = express();
        app.use(express.json());

        const { optionalAuth } = await import('../auth.js');
        app.get('/public', optionalAuth, (req, res) => {
            res.json({ hasUser: !!(req as any).user });
        });

        const res = await request(app)
            .get('/public')
            .expect(200);

        expect(res.body.hasUser).toBe(false);
    });
});

describe('Auth Token Parsing', () => {
    it('should extract Bearer token correctly', () => {
        const extractToken = (header: string | undefined): string | null => {
            if (!header) return null;
            const parts = header.split(' ');
            if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
            return parts[1];
        };

        expect(extractToken('Bearer abc123')).toBe('abc123');
        expect(extractToken('Bearer ')).toBe('');
        expect(extractToken('NotBearer abc123')).toBeNull();
        expect(extractToken(undefined)).toBeNull();
        expect(extractToken('')).toBeNull();
    });
});
