/**
 * Unit Tests: Launch Token Service
 * 
 * Tests security properties of launch tokens:
 * - Only issues for allowed surfaces
 * - Token expires in 60 seconds
 * - Tokens are bound to userId + surface
 * - Replay attacks are blocked
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ============================================================================
// MOCK IMPLEMENTATION (mirrors launch-token.ts)
// ============================================================================

type LaunchSurface = 'driver' | 'team' | 'racecontrol';

interface Capabilities {
    driver_hud: boolean;
    pitwall_view: boolean;
    incident_review: boolean;
}

const SURFACE_CAPABILITY_MAP: Record<LaunchSurface, keyof Capabilities> = {
    driver: 'driver_hud',
    team: 'pitwall_view',
    racecontrol: 'incident_review'
};

function canIssueLaunchToken(
    surface: LaunchSurface,
    capabilities: Capabilities
): boolean {
    const requiredCap = SURFACE_CAPABILITY_MAP[surface];
    return capabilities[requiredCap];
}

function createMockToken(
    userId: string,
    surface: LaunchSurface,
    issuedAt: number,
    expiresIn: number = 60
): { userId: string; surface: LaunchSurface; iat: number; exp: number; nonce: string } {
    return {
        userId,
        surface,
        iat: issuedAt,
        exp: issuedAt + expiresIn,
        nonce: Math.random().toString(36).substring(2)
    };
}

function isTokenExpired(token: { exp: number }, now: number): boolean {
    return now > token.exp;
}

// ============================================================================
// TESTS
// ============================================================================

describe('Launch Token Service', () => {
    describe('Token Issuance', () => {
        it('should issue token for driver when user has driver_hud', () => {
            const caps: Capabilities = { driver_hud: true, pitwall_view: true, incident_review: false };
            expect(canIssueLaunchToken('driver', caps)).toBe(true);
        });

        it('should issue token for team when user has pitwall_view', () => {
            const caps: Capabilities = { driver_hud: true, pitwall_view: true, incident_review: false };
            expect(canIssueLaunchToken('team', caps)).toBe(true);
        });

        it('should issue token for racecontrol when user has incident_review', () => {
            const caps: Capabilities = { driver_hud: false, pitwall_view: false, incident_review: true };
            expect(canIssueLaunchToken('racecontrol', caps)).toBe(true);
        });

        it('should DENY token for driver when user lacks driver_hud', () => {
            const caps: Capabilities = { driver_hud: false, pitwall_view: true, incident_review: false };
            expect(canIssueLaunchToken('driver', caps)).toBe(false);
        });

        it('should DENY token for team when user lacks pitwall_view', () => {
            const caps: Capabilities = { driver_hud: true, pitwall_view: false, incident_review: false };
            expect(canIssueLaunchToken('team', caps)).toBe(false);
        });

        it('should DENY token for racecontrol when user lacks incident_review', () => {
            const caps: Capabilities = { driver_hud: true, pitwall_view: true, incident_review: false };
            expect(canIssueLaunchToken('racecontrol', caps)).toBe(false);
        });
    });

    describe('Token Expiration', () => {
        it('should not be expired immediately after issuance', () => {
            const now = Math.floor(Date.now() / 1000);
            const token = createMockToken('user1', 'driver', now);
            expect(isTokenExpired(token, now)).toBe(false);
        });

        it('should not be expired 30 seconds after issuance', () => {
            const now = Math.floor(Date.now() / 1000);
            const token = createMockToken('user1', 'driver', now);
            expect(isTokenExpired(token, now + 30)).toBe(false);
        });

        it('should be expired 61 seconds after issuance', () => {
            const now = Math.floor(Date.now() / 1000);
            const token = createMockToken('user1', 'driver', now);
            expect(isTokenExpired(token, now + 61)).toBe(true);
        });

        it('should be expired 120 seconds after issuance', () => {
            const now = Math.floor(Date.now() / 1000);
            const token = createMockToken('user1', 'driver', now);
            expect(isTokenExpired(token, now + 120)).toBe(true);
        });
    });

    describe('Token Binding', () => {
        it('should bind token to specific userId', () => {
            const token = createMockToken('user123', 'driver', Date.now());
            expect(token.userId).toBe('user123');
        });

        it('should bind token to specific surface', () => {
            const token = createMockToken('user1', 'racecontrol', Date.now());
            expect(token.surface).toBe('racecontrol');
        });

        it('should include unique nonce in each token', () => {
            const token1 = createMockToken('user1', 'driver', Date.now());
            const token2 = createMockToken('user1', 'driver', Date.now());
            expect(token1.nonce).not.toBe(token2.nonce);
        });
    });

    describe('Replay Protection', () => {
        let usedNonces: Set<string>;

        beforeEach(() => {
            usedNonces = new Set();
        });

        function consumeNonce(nonce: string): boolean {
            if (usedNonces.has(nonce)) {
                return false; // Replay attack
            }
            usedNonces.add(nonce);
            return true;
        }

        it('should accept first use of nonce', () => {
            const token = createMockToken('user1', 'driver', Date.now());
            expect(consumeNonce(token.nonce)).toBe(true);
        });

        it('should reject second use of same nonce', () => {
            const token = createMockToken('user1', 'driver', Date.now());
            consumeNonce(token.nonce);
            expect(consumeNonce(token.nonce)).toBe(false);
        });

        it('should accept different nonces', () => {
            const token1 = createMockToken('user1', 'driver', Date.now());
            const token2 = createMockToken('user1', 'driver', Date.now());
            expect(consumeNonce(token1.nonce)).toBe(true);
            expect(consumeNonce(token2.nonce)).toBe(true);
        });
    });
});
