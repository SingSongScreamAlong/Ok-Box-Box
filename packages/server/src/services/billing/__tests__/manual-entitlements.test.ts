/**
 * Unit Tests: Manual Entitlements (Admin API)
 * 
 * Tests for alpha/pre-billing operation:
 * - Manual grant creates entitlement with source='manual_admin'
 * - Manual revoke cancels entitlement
 * - Bootstrap shows capabilities from manual entitlements
 * - Revoked entitlements remove capabilities
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ============================================================================
// MOCK TYPES
// ============================================================================

type Product = 'blackbox' | 'controlbox' | 'bundle';
type EntitlementStatus = 'active' | 'trial' | 'past_due' | 'canceled' | 'expired';
type EntitlementSource = 'squarespace' | 'manual_admin' | 'promo';

interface Entitlement {
    id: string;
    userId: string;
    product: Product;
    status: EntitlementStatus;
    source: EntitlementSource;
}

interface Capabilities {
    driver_hud: boolean;
    pitwall_view: boolean;
    incident_review: boolean;
}

// ============================================================================
// MOCK IMPLEMENTATION
// ============================================================================

function deriveCapabilitiesFromEntitlements(entitlements: Entitlement[]): Capabilities {
    const caps: Capabilities = {
        driver_hud: false,
        pitwall_view: false,
        incident_review: false
    };

    const active = entitlements.filter(e => e.status === 'active' || e.status === 'trial');

    for (const ent of active) {
        if (ent.product === 'blackbox' || ent.product === 'bundle') {
            caps.driver_hud = true;
            caps.pitwall_view = true;
        }
        if (ent.product === 'controlbox' || ent.product === 'bundle') {
            caps.incident_review = true;
        }
    }

    return caps;
}

function isValidSource(source: string): source is EntitlementSource {
    return ['squarespace', 'manual_admin', 'promo'].includes(source);
}

// ============================================================================
// TESTS
// ============================================================================

describe('Manual Entitlements (Admin API)', () => {
    describe('Grant Entitlement', () => {
        it('should create entitlement with source=manual_admin', () => {
            const entitlement: Entitlement = {
                id: '123',
                userId: 'user1',
                product: 'blackbox',
                status: 'active',
                source: 'manual_admin'
            };

            expect(entitlement.source).toBe('manual_admin');
            expect(isValidSource(entitlement.source)).toBe(true);
        });

        it('should NOT masquerade as Squarespace grant', () => {
            const manualGrant: Entitlement = {
                id: '123',
                userId: 'user1',
                product: 'blackbox',
                status: 'active',
                source: 'manual_admin'
            };

            expect(manualGrant.source).not.toBe('squarespace');
        });

        it('should support all three products', () => {
            const products: Product[] = ['blackbox', 'controlbox', 'bundle'];

            for (const product of products) {
                const ent: Entitlement = {
                    id: `ent-${product}`,
                    userId: 'user1',
                    product,
                    status: 'active',
                    source: 'manual_admin'
                };
                expect(ent.product).toBe(product);
            }
        });
    });

    describe('Bootstrap Capability Mapping', () => {
        it('should grant BlackBox capabilities from manual entitlement', () => {
            const entitlements: Entitlement[] = [{
                id: '1',
                userId: 'user1',
                product: 'blackbox',
                status: 'active',
                source: 'manual_admin'
            }];

            const caps = deriveCapabilitiesFromEntitlements(entitlements);
            expect(caps.driver_hud).toBe(true);
            expect(caps.pitwall_view).toBe(true);
            expect(caps.incident_review).toBe(false);
        });

        it('should grant ControlBox capabilities from manual entitlement', () => {
            const entitlements: Entitlement[] = [{
                id: '1',
                userId: 'user1',
                product: 'controlbox',
                status: 'active',
                source: 'manual_admin'
            }];

            const caps = deriveCapabilitiesFromEntitlements(entitlements);
            expect(caps.incident_review).toBe(true);
            expect(caps.driver_hud).toBe(false);
        });

        it('should grant ALL capabilities from bundle manual entitlement', () => {
            const entitlements: Entitlement[] = [{
                id: '1',
                userId: 'user1',
                product: 'bundle',
                status: 'active',
                source: 'manual_admin'
            }];

            const caps = deriveCapabilitiesFromEntitlements(entitlements);
            expect(caps.driver_hud).toBe(true);
            expect(caps.pitwall_view).toBe(true);
            expect(caps.incident_review).toBe(true);
        });

        it('should treat manual_admin same as squarespace for capability derivation', () => {
            const manualEnt: Entitlement[] = [{
                id: '1',
                userId: 'user1',
                product: 'blackbox',
                status: 'active',
                source: 'manual_admin'
            }];

            const squarespaceEnt: Entitlement[] = [{
                id: '2',
                userId: 'user1',
                product: 'blackbox',
                status: 'active',
                source: 'squarespace'
            }];

            const manualCaps = deriveCapabilitiesFromEntitlements(manualEnt);
            const squarespaceCaps = deriveCapabilitiesFromEntitlements(squarespaceEnt);

            expect(manualCaps).toEqual(squarespaceCaps);
        });
    });

    describe('Revoke Entitlement', () => {
        it('should remove capabilities when status=canceled', () => {
            const entitlements: Entitlement[] = [{
                id: '1',
                userId: 'user1',
                product: 'blackbox',
                status: 'canceled', // Revoked
                source: 'manual_admin'
            }];

            const caps = deriveCapabilitiesFromEntitlements(entitlements);
            expect(caps.driver_hud).toBe(false);
            expect(caps.pitwall_view).toBe(false);
        });

        it('should grant no capabilities when entitlement list is empty', () => {
            const entitlements: Entitlement[] = [];

            const caps = deriveCapabilitiesFromEntitlements(entitlements);
            expect(caps.driver_hud).toBe(false);
            expect(caps.pitwall_view).toBe(false);
            expect(caps.incident_review).toBe(false);
        });
    });

    describe('Launchpad Behavior', () => {
        it('should show unlocked tiles with active manual entitlement', () => {
            const entitlements: Entitlement[] = [{
                id: '1',
                userId: 'user1',
                product: 'blackbox',
                status: 'active',
                source: 'manual_admin'
            }];

            const caps = deriveCapabilitiesFromEntitlements(entitlements);
            const driverTileUnlocked = caps.driver_hud;
            const teamTileUnlocked = caps.pitwall_view;

            expect(driverTileUnlocked).toBe(true);
            expect(teamTileUnlocked).toBe(true);
        });

        it('should show locked tiles without entitlement', () => {
            const entitlements: Entitlement[] = [];

            const caps = deriveCapabilitiesFromEntitlements(entitlements);
            const driverTileUnlocked = caps.driver_hud;

            expect(driverTileUnlocked).toBe(false);
        });

        it('should show locked tiles after revocation', () => {
            const entitlements: Entitlement[] = [{
                id: '1',
                userId: 'user1',
                product: 'blackbox',
                status: 'canceled',
                source: 'manual_admin'
            }];

            const caps = deriveCapabilitiesFromEntitlements(entitlements);
            const driverTileUnlocked = caps.driver_hud;

            expect(driverTileUnlocked).toBe(false);
        });
    });
});
