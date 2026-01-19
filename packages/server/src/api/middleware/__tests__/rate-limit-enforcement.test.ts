import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTierFromRequest } from '../rate-limit-tiers.js';
import { optionalAuth } from '../auth.js';
import type { Request, Response } from 'express';

// Mock dependencies
const mockGetEntitlements = vi.fn();
// Mock getEntitlementRepository
vi.mock('../../../services/billing/entitlement-service.js', () => ({
    getEntitlementRepository: () => ({
        getForUser: mockGetEntitlements
    })
}));

const mockVerifyToken = vi.fn();
const mockGetUserById = vi.fn();
// Mock getAuthService
vi.mock('../../../services/auth/auth-service.js', () => ({
    getAuthService: () => ({
        verifyAccessToken: mockVerifyToken,
        getUserById: mockGetUserById
    })
}));


describe('Rate Limit Enforcement Integration', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let next: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockReq = {
            headers: {},
            user: undefined
        };
        mockRes = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        next = vi.fn();
    });

    it('getTierFromRequest should failsafe to anonymous if no user attached', () => {
        const tier = getTierFromRequest(mockReq as Request);
        expect(tier.name).toBe('anonymous');
    });

    it('optionalAuth should attach entitlements to valid user', async () => {
        // Setup mocks
        mockReq.headers = { authorization: 'Bearer valid-token' };
        mockVerifyToken.mockReturnValue({ sub: 'user-123' });
        mockGetUserById.mockResolvedValue({ id: 'user-123', isActive: true });
        mockGetEntitlements.mockResolvedValue([{ product: 'blackbox', status: 'active' }]);

        // Run middleware
        await optionalAuth(mockReq as Request, mockRes as Response, next);

        // Verify next called
        expect(next).toHaveBeenCalled();

        // Verify user attached
        expect(mockReq.user).toBeDefined();
        expect(mockReq.user!.id).toBe('user-123');

        // Verify entitlements attached (THIS IS THE KEY FIX)
        expect((mockReq.user as any).entitlements).toBeDefined();
        expect((mockReq.user as any).entitlements[0].product).toBe('blackbox');

        // Verify Tier Calculation results in Upgrade
        const tier = getTierFromRequest(mockReq as Request);
        expect(tier.name).toBe('blackbox');
    });

    it('optionalAuth should attach entitlements for controlbox/bundle too', async () => {
        mockReq.headers = { authorization: 'Bearer valid-token' };
        mockVerifyToken.mockReturnValue({ sub: 'user-456' });
        mockGetUserById.mockResolvedValue({ id: 'user-456', isActive: true });
        mockGetEntitlements.mockResolvedValue([{ product: 'bundle', status: 'active' }]);

        await optionalAuth(mockReq as Request, mockRes as Response, next);

        const tier = getTierFromRequest(mockReq as Request);
        expect(tier.name).toBe('bundle');
    });

    it('optionalAuth should NOT crash if entitlement service fails', async () => {
        mockReq.headers = { authorization: 'Bearer valid-token' };
        mockVerifyToken.mockReturnValue({ sub: 'user-789' });
        mockGetUserById.mockResolvedValue({ id: 'user-789', isActive: true });
        // Entitlement service failure
        mockGetEntitlements.mockRejectedValue(new Error('DB connection failed'));

        await optionalAuth(mockReq as Request, mockRes as Response, next);

        expect(next).toHaveBeenCalled();
        expect(mockReq.user).toBeDefined();
        // Entitlements might be undefined, so check Tier defaults to anonymous
        const tier = getTierFromRequest(mockReq as Request);
        expect(tier.name).toBe('anonymous');
    });
});
