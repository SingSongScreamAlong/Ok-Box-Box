/**
 * Launch Token Service
 * 
 * Generates short-lived tokens for launching the relay with a specific surface.
 * 
 * Token format: JWT with {userId, surface, iat, exp, nonce}
 * Expires in 60 seconds.
 */

import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me-in-prod';
const TOKEN_EXPIRY_SECONDS = 60;

// ============================================================================
// TYPES
// ============================================================================

export type LaunchSurface = 'driver' | 'team' | 'racecontrol';

export interface LaunchTokenPayload {
    userId: string;
    surface: LaunchSurface;
    nonce: string;
    iat: number;
    exp: number;
}

export interface LaunchTokenResult {
    token: string;
    protocolUrl: string;
    fallbackUrl: string;
    expiresAt: number;
}

// ============================================================================
// TOKEN GENERATION
// ============================================================================

/**
 * Generate a short-lived launch token.
 * Only issues token if user has capability for the requested surface.
 */
export function generateLaunchToken(
    userId: string,
    surface: LaunchSurface,
    capabilities: Record<string, boolean>
): LaunchTokenResult | null {
    // Check capability for requested surface
    const SURFACE_CAPABILITY_MAP: Record<LaunchSurface, string> = {
        driver: 'driver_hud',
        team: 'pitwall_view',
        racecontrol: 'incident_review'
    };

    const requiredCapability = SURFACE_CAPABILITY_MAP[surface];
    if (!capabilities[requiredCapability]) {
        console.warn(`Launch token denied: user ${userId} lacks ${requiredCapability} for ${surface}`);
        return null;
    }

    const now = Math.floor(Date.now() / 1000);
    const nonce = randomBytes(16).toString('hex');

    const payload: Omit<LaunchTokenPayload, 'iat' | 'exp'> = {
        userId,
        surface,
        nonce
    };

    const token = jwt.sign(payload, JWT_SECRET, {
        expiresIn: TOKEN_EXPIRY_SECONDS
    });

    const expiresAt = now + TOKEN_EXPIRY_SECONDS;

    // Build URLs
    const protocolUrl = `okboxbox://launch?token=${encodeURIComponent(token)}`;
    const webBase = process.env.APP_URL || 'https://control.okboxbox.com';
    const fallbackUrl = `${webBase}/launch?token=${encodeURIComponent(token)}`;

    return {
        token,
        protocolUrl,
        fallbackUrl,
        expiresAt
    };
}

// ============================================================================
// TOKEN VALIDATION
// ============================================================================

/**
 * Validate a launch token.
 * Returns the payload if valid, null if expired/invalid.
 */
export function validateLaunchToken(token: string): LaunchTokenPayload | null {
    try {
        const payload = jwt.verify(token, JWT_SECRET) as LaunchTokenPayload;

        // Verify required fields
        if (!payload.userId || !payload.surface || !payload.nonce) {
            console.warn('Launch token missing required fields');
            return null;
        }

        // Verify surface is valid
        const validSurfaces: LaunchSurface[] = ['driver', 'team', 'racecontrol'];
        if (!validSurfaces.includes(payload.surface)) {
            console.warn(`Launch token has invalid surface: ${payload.surface}`);
            return null;
        }

        return payload;
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            console.warn('Launch token expired');
        } else if (error instanceof jwt.JsonWebTokenError) {
            console.warn('Launch token invalid:', error.message);
        }
        return null;
    }
}

// ============================================================================
// USED NONCES (prevent replay attacks)
// ============================================================================

const usedNonces = new Set<string>();

/**
 * Mark a nonce as used. Returns false if already used (replay attack).
 */
export function consumeNonce(nonce: string): boolean {
    if (usedNonces.has(nonce)) {
        console.warn('Launch token nonce already used (replay attack?)');
        return false;
    }

    usedNonces.add(nonce);

    // Clean up old nonces periodically (every 1000 entries)
    if (usedNonces.size > 1000) {
        const entries = Array.from(usedNonces);
        entries.slice(0, 500).forEach(n => usedNonces.delete(n));
    }

    return true;
}
