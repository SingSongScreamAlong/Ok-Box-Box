// =====================================================================
// Auth Middleware
// JWT verification and user attachment
// =====================================================================

import { Request, Response, NextFunction } from 'express';
import type { AdminUser } from '@controlbox/common';
import { getAuthService } from '../../services/auth/auth-service.js';

/**
 * Extend Express Request with auth context
 */
declare global {
    namespace Express {
        interface Request {
            user?: AdminUser & { entitlements?: any[] };
            token?: string;
        }
    }
}

/**
 * Extract JWT from Authorization header
 */
function extractToken(req: Request): string | null {
    // 1. Authorization header (standard)
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const [type, token] = authHeader.split(' ');
        if (type === 'Bearer' && token) {
            return token;
        }
    }

    // 2. Query parameter fallback (for browser redirects like OAuth /start)
    const queryToken = req.query.token as string | undefined;
    if (queryToken) {
        return queryToken;
    }

    return null;
}

import {
    getEntitlementRepository,
    deriveCapabilitiesFromEntitlements,
    type Capabilities
} from '../../services/billing/entitlement-service.js';

/**
 * Middleware to require authentication
 * Verifies JWT and attaches user to request
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Optimization: If user already attached (e.g. by optionalAuth), skip re-verification
    if (req.user) {
        return next();
    }

    const token = extractToken(req);

    if (!token) {
        res.status(401).json({
            success: false,
            error: {
                code: 'AUTH_REQUIRED',
                message: 'Authentication required. Please provide a valid access token.'
            }
        });
        return;
    }

    const authService = getAuthService();
    const user = await authService.resolveUserFromToken(token);

    if (!user || !user.isActive) {
        res.status(401).json({
            success: false,
            error: {
                code: 'TOKEN_INVALID',
                message: 'Invalid or expired access token. Please login again.'
            }
        });
        return;
    }

    // Fetch entitlements for rate limiting
    try {
        const entitlementRepo = getEntitlementRepository();
        const entitlements = await entitlementRepo.getForUser(user.id);
        (user as any).entitlements = entitlements;
    } catch (err) {
        console.error('Failed to fetch entitlements for user', user.id, err);
        // Continue without entitlements (downgrades to anonymous defaults)
    }

    // Attach user and token to request
    req.user = user;
    req.token = token;

    next();
}

/**
 * Middleware to optionally authenticate
 * If token present, verifies and attaches user
 * If no token, continues without user
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
    // Optimization: If user already attached, skip
    if (req.user) {
        return next();
    }

    const token = extractToken(req);

    if (!token) {
        next();
        return;
    }

    const authService = getAuthService();
    const user = await authService.resolveUserFromToken(token);

    if (user && user.isActive) {
        // Fetch entitlements for rate limiting
        try {
            const entitlementRepo = getEntitlementRepository();
            const entitlements = await entitlementRepo.getForUser(user.id);
            (user as any).entitlements = entitlements;
        } catch (err) {
            console.error('Failed to fetch entitlements (optional auth) for user', user.id, err);
        }

        req.user = user;
        req.token = token;
    }

    next();
}

/**
 * Middleware factory: require a specific capability from the user's entitlements.
 *
 * Must be used AFTER requireAuth (entitlements already loaded onto req.user).
 *
 * Usage:
 *   router.post('/voice/query', requireAuth, requireCapability('voice_engineer'), handler)
 */
export function requireCapability(capability: keyof Capabilities) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: { code: 'AUTH_REQUIRED', message: 'Authentication required.' }
            });
            return;
        }

        // Super admins bypass capability checks
        if (req.user.isSuperAdmin) {
            return next();
        }

        const entitlements: any[] = (req.user as any).entitlements ?? [];
        const caps = deriveCapabilitiesFromEntitlements(entitlements, []);

        if (!caps[capability]) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'SUBSCRIPTION_REQUIRED',
                    message: 'Your plan does not include access to this feature. Visit /pricing to upgrade.'
                }
            });
            return;
        }

        next();
    };
}

/**
 * Middleware to require super admin
 */
export async function requireSuperAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    // First ensure authenticated
    if (!req.user) {
        res.status(401).json({
            success: false,
            error: {
                code: 'AUTH_REQUIRED',
                message: 'Authentication required.'
            }
        });
        return;
    }

    if (!req.user.isSuperAdmin) {
        res.status(403).json({
            success: false,
            error: {
                code: 'FORBIDDEN',
                message: 'Super admin privileges required.'
            }
        });
        return;
    }

    next();
}
