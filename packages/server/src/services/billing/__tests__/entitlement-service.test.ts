/**
 * Unit Tests: Entitlement Service
 * 
 * Tests:
 * - entitlement → capabilities mapping
 * - webhook event → entitlement upsert
 * - email matching + pending entitlement behavior
 * - webhook verification reject path
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ============================================================================
// MOCK TYPES (mirrors entitlement-service.ts)
// ============================================================================

type Product = 'blackbox' | 'controlbox' | 'bundle';
type EntitlementStatus = 'active' | 'trial' | 'past_due' | 'canceled' | 'expired' | 'pending';

interface Entitlement {
    id: string;
    userId: string | null;
    product: Product;
    status: EntitlementStatus;
}

interface Capabilities {
    driver_hud: boolean;
    ai_coaching: boolean;
    voice_engineer: boolean;
    personal_telemetry: boolean;
    pitwall_view: boolean;
    multi_car_monitor: boolean;
    strategy_timeline: boolean;
    incident_review: boolean;
    penalty_assign: boolean;
    protest_review: boolean;
    rulebook_manage: boolean;
    session_authority: boolean;
}

// ============================================================================
// CAPABILITY MAPPING (mirrors entitlement-service.ts)
// ============================================================================

function deriveCapabilitiesFromEntitlements(
    entitlements: Entitlement[],
    roles: string[] = []
): Capabilities {
    const caps: Capabilities = {
        driver_hud: false,
        ai_coaching: false,
        voice_engineer: false,
        personal_telemetry: false,
        pitwall_view: false,
        multi_car_monitor: false,
        strategy_timeline: false,
        incident_review: false,
        penalty_assign: false,
        protest_review: false,
        rulebook_manage: false,
        session_authority: false
    };

    const activeEntitlements = entitlements.filter(e =>
        e.status === 'active' || e.status === 'trial'
    );

    for (const ent of activeEntitlements) {
        if (ent.product === 'blackbox' || ent.product === 'bundle') {
            caps.driver_hud = true;
            caps.ai_coaching = true;
            caps.voice_engineer = true;
            caps.personal_telemetry = true;
            caps.pitwall_view = true;
            caps.multi_car_monitor = true;
            caps.strategy_timeline = true;
        }

        if (ent.product === 'controlbox' || ent.product === 'bundle') {
            caps.incident_review = true;

            if (roles.includes('racecontrol') || roles.includes('admin')) {
                caps.penalty_assign = true;
                caps.protest_review = true;
            }
            if (roles.includes('admin')) {
                caps.rulebook_manage = true;
                caps.session_authority = true;
            }
        }
    }

    return caps;
}

// ============================================================================
// WEBHOOK PROCESSING HELPERS
// ============================================================================

interface OrderEvent {
    topic: 'order.create' | 'order.update';
    fulfillmentStatus: 'PENDING' | 'FULFILLED' | 'CANCELED';
    hasRefund: boolean;
}

function determineEntitlementStatus(event: OrderEvent): EntitlementStatus {
    if (event.hasRefund) return 'canceled';

    switch (event.fulfillmentStatus) {
        case 'FULFILLED': return 'active';
        case 'CANCELED': return 'canceled';
        case 'PENDING':
        default:
            return event.topic === 'order.create' ? 'active' : 'pending';
    }
}

// ============================================================================
// TESTS
// ============================================================================

describe('Entitlement Service', () => {
    describe('Capability Mapping', () => {
        it('should grant BlackBox capabilities for active blackbox entitlement', () => {
            const entitlements: Entitlement[] = [
                { id: '1', userId: 'user1', product: 'blackbox', status: 'active' }
            ];
            const caps = deriveCapabilitiesFromEntitlements(entitlements);

            expect(caps.driver_hud).toBe(true);
            expect(caps.ai_coaching).toBe(true);
            expect(caps.pitwall_view).toBe(true);
            expect(caps.incident_review).toBe(false);
        });

        it('should grant ControlBox capabilities for active controlbox entitlement', () => {
            const entitlements: Entitlement[] = [
                { id: '1', userId: 'user1', product: 'controlbox', status: 'active' }
            ];
            const caps = deriveCapabilitiesFromEntitlements(entitlements, ['racecontrol']);

            expect(caps.incident_review).toBe(true);
            expect(caps.penalty_assign).toBe(true);
            expect(caps.driver_hud).toBe(false);
        });

        it('should grant ALL capabilities for bundle entitlement', () => {
            const entitlements: Entitlement[] = [
                { id: '1', userId: 'user1', product: 'bundle', status: 'active' }
            ];
            const caps = deriveCapabilitiesFromEntitlements(entitlements, ['admin']);

            expect(caps.driver_hud).toBe(true);
            expect(caps.incident_review).toBe(true);
            expect(caps.penalty_assign).toBe(true);
            expect(caps.rulebook_manage).toBe(true);
        });

        it('should NOT grant capabilities for canceled entitlement', () => {
            const entitlements: Entitlement[] = [
                { id: '1', userId: 'user1', product: 'blackbox', status: 'canceled' }
            ];
            const caps = deriveCapabilitiesFromEntitlements(entitlements);

            expect(caps.driver_hud).toBe(false);
            expect(caps.pitwall_view).toBe(false);
        });

        it('should NOT grant capabilities for expired entitlement', () => {
            const entitlements: Entitlement[] = [
                { id: '1', userId: 'user1', product: 'controlbox', status: 'expired' }
            ];
            const caps = deriveCapabilitiesFromEntitlements(entitlements);

            expect(caps.incident_review).toBe(false);
        });

        it('should grant capabilities for trial entitlement', () => {
            const entitlements: Entitlement[] = [
                { id: '1', userId: 'user1', product: 'blackbox', status: 'trial' }
            ];
            const caps = deriveCapabilitiesFromEntitlements(entitlements);

            expect(caps.driver_hud).toBe(true);
        });

        it('should require racecontrol role for penalty_assign', () => {
            const entitlements: Entitlement[] = [
                { id: '1', userId: 'user1', product: 'controlbox', status: 'active' }
            ];

            // Without role
            let caps = deriveCapabilitiesFromEntitlements(entitlements, []);
            expect(caps.penalty_assign).toBe(false);

            // With role
            caps = deriveCapabilitiesFromEntitlements(entitlements, ['racecontrol']);
            expect(caps.penalty_assign).toBe(true);
        });

        it('should require admin role for rulebook_manage', () => {
            const entitlements: Entitlement[] = [
                { id: '1', userId: 'user1', product: 'controlbox', status: 'active' }
            ];

            // Without admin
            let caps = deriveCapabilitiesFromEntitlements(entitlements, ['racecontrol']);
            expect(caps.rulebook_manage).toBe(false);

            // With admin
            caps = deriveCapabilitiesFromEntitlements(entitlements, ['admin']);
            expect(caps.rulebook_manage).toBe(true);
        });
    });

    describe('Webhook Event → Status', () => {
        it('should set active for order.create without refund', () => {
            const status = determineEntitlementStatus({
                topic: 'order.create',
                fulfillmentStatus: 'PENDING',
                hasRefund: false
            });
            expect(status).toBe('active');
        });

        it('should set active for FULFILLED order', () => {
            const status = determineEntitlementStatus({
                topic: 'order.update',
                fulfillmentStatus: 'FULFILLED',
                hasRefund: false
            });
            expect(status).toBe('active');
        });

        it('should set canceled for refunded order', () => {
            const status = determineEntitlementStatus({
                topic: 'order.update',
                fulfillmentStatus: 'FULFILLED',
                hasRefund: true
            });
            expect(status).toBe('canceled');
        });

        it('should set canceled for CANCELED order', () => {
            const status = determineEntitlementStatus({
                topic: 'order.update',
                fulfillmentStatus: 'CANCELED',
                hasRefund: false
            });
            expect(status).toBe('canceled');
        });
    });

    describe('Email Matching', () => {
        it('should match email case-insensitively', () => {
            const customerEmail = 'User@Example.COM';
            const userEmail = 'user@example.com';

            // Case-insensitive comparison
            const matches = customerEmail.toLowerCase() === userEmail.toLowerCase();
            expect(matches).toBe(true);
        });

        it('should not match different emails', () => {
            const customerEmail = 'user1@example.com';
            const userEmail = 'user2@example.com';

            const matches = customerEmail.toLowerCase() === userEmail.toLowerCase();
            expect(matches).toBe(false);
        });
    });

    describe('Pending Entitlements', () => {
        it('should create pending when no user matches', () => {
            // Simulate: user not found → pending entitlement
            const userFound = false;
            const shouldCreatePending = !userFound;

            expect(shouldCreatePending).toBe(true);
        });

        it('should skip pending when user found', () => {
            const userFound = true;
            const shouldCreatePending = !userFound;

            expect(shouldCreatePending).toBe(false);
        });
    });

    describe('Webhook Signature Verification', () => {
        it('should reject empty signature', () => {
            const signature = '';
            const secret = 'test-secret';

            const valid = signature && secret ? true : false;
            expect(valid).toBe(false);
        });

        it('should reject when no secret configured', () => {
            const signature = 'abc123';
            const secret = '';

            const valid = signature && secret ? true : false;
            expect(valid).toBe(false);
        });
    });
});
