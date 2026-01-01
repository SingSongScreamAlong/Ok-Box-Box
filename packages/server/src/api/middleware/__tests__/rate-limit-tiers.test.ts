// =====================================================================
// Tiered Rate Limiting Tests
// =====================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTierFromRequest, RATE_LIMIT_TIERS } from '../rate-limit-tiers.js';
import type { Request } from 'express';

describe('Tiered Rate Limiting', () => {
    describe('getTierFromRequest', () => {
        it('should return anonymous tier for unauthenticated requests', () => {
            const req = {} as Request;
            const tier = getTierFromRequest(req);
            expect(tier.name).toBe('anonymous');
            expect(tier.limit).toBe(50);
        });

        it('should return admin tier for super admin users', () => {
            const req = {
                user: { isSuperAdmin: true }
            } as any;
            const tier = getTierFromRequest(req);
            expect(tier.name).toBe('admin');
            expect(tier.limit).toBe(2000);
        });

        it('should return bundle tier for users with bundle entitlement', () => {
            const req = {
                user: {
                    isSuperAdmin: false,
                    entitlements: [
                        { product: 'bundle', status: 'active' }
                    ]
                }
            } as any;
            const tier = getTierFromRequest(req);
            expect(tier.name).toBe('bundle');
            expect(tier.limit).toBe(1000);
        });

        it('should return controlbox tier for users with controlbox entitlement', () => {
            const req = {
                user: {
                    isSuperAdmin: false,
                    entitlements: [
                        { product: 'controlbox', status: 'active' }
                    ]
                }
            } as any;
            const tier = getTierFromRequest(req);
            expect(tier.name).toBe('controlbox');
            expect(tier.limit).toBe(500);
        });

        it('should return blackbox tier for users with blackbox entitlement', () => {
            const req = {
                user: {
                    isSuperAdmin: false,
                    entitlements: [
                        { product: 'blackbox', status: 'active' }
                    ]
                }
            } as any;
            const tier = getTierFromRequest(req);
            expect(tier.name).toBe('blackbox');
            expect(tier.limit).toBe(200);
        });

        it('should return anonymous tier for authenticated users without active entitlements', () => {
            const req = {
                user: {
                    isSuperAdmin: false,
                    entitlements: [
                        { product: 'blackbox', status: 'expired' }
                    ]
                }
            } as any;
            const tier = getTierFromRequest(req);
            expect(tier.name).toBe('anonymous');
            expect(tier.limit).toBe(50);
        });

        it('should prioritize bundle over other entitlements', () => {
            const req = {
                user: {
                    isSuperAdmin: false,
                    entitlements: [
                        { product: 'blackbox', status: 'active' },
                        { product: 'bundle', status: 'active' }
                    ]
                }
            } as any;
            const tier = getTierFromRequest(req);
            expect(tier.name).toBe('bundle');
        });

        it('should include trial status as active', () => {
            const req = {
                user: {
                    isSuperAdmin: false,
                    entitlements: [
                        { product: 'controlbox', status: 'trial' }
                    ]
                }
            } as any;
            const tier = getTierFromRequest(req);
            expect(tier.name).toBe('controlbox');
            expect(tier.limit).toBe(500);
        });
    });

    describe('RATE_LIMIT_TIERS', () => {
        it('should have all required tiers defined', () => {
            expect(RATE_LIMIT_TIERS.anonymous).toBeDefined();
            expect(RATE_LIMIT_TIERS.blackbox).toBeDefined();
            expect(RATE_LIMIT_TIERS.controlbox).toBeDefined();
            expect(RATE_LIMIT_TIERS.bundle).toBeDefined();
            expect(RATE_LIMIT_TIERS.admin).toBeDefined();
        });

        it('should have increasing limits from anonymous to admin', () => {
            expect(RATE_LIMIT_TIERS.anonymous.limit).toBeLessThan(RATE_LIMIT_TIERS.blackbox.limit);
            expect(RATE_LIMIT_TIERS.blackbox.limit).toBeLessThan(RATE_LIMIT_TIERS.controlbox.limit);
            expect(RATE_LIMIT_TIERS.controlbox.limit).toBeLessThan(RATE_LIMIT_TIERS.bundle.limit);
            expect(RATE_LIMIT_TIERS.bundle.limit).toBeLessThan(RATE_LIMIT_TIERS.admin.limit);
        });
    });
});
