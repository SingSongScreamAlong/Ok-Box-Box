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
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return null;
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
        return null;
    }

    return token;
}

// Lazy import to avoid circular defaults if possible, but standard import is fine for services
import { getEntitlementRepository } from '../../services/billing/entitlement-service.js';

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
    let user: AdminUser | null = null;

    // 1. Try internal JWT first
    const payload = authService.verifyAccessToken(token);
    if (payload) {
        user = await authService.getUserById(payload.sub);
    }

    // 2. Fallback: Try Supabase JWT (from apps/app frontend)
    if (!user) {
        const supabasePayload = await authService.verifySupabaseToken(token);
        if (supabasePayload) {
            user = await authService.findOrCreateSupabaseUser(
                supabasePayload.sub,
                supabasePayload.email,
                supabasePayload.displayName || supabasePayload.email.split('@')[0]
            );
        }
    }

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
    let user: AdminUser | null = null;

    // 1. Try internal JWT
    const payload = authService.verifyAccessToken(token);
    if (payload) {
        user = await authService.getUserById(payload.sub);
    }

    // 2. Fallback: Try Supabase JWT
    if (!user) {
        const supabasePayload = await authService.verifySupabaseToken(token);
        if (supabasePayload) {
            user = await authService.findOrCreateSupabaseUser(
                supabasePayload.sub,
                supabasePayload.email,
                supabasePayload.displayName || supabasePayload.email.split('@')[0]
            );
        }
    }

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
