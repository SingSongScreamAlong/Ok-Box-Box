// =====================================================================
// Tiered Rate Limiting Middleware
// Product-based rate limits using entitlements
// =====================================================================

import { rateLimit, type RateLimitRequestHandler } from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';

// =====================================================================
// TIER DEFINITIONS
// =====================================================================

export interface RateLimitTier {
    name: string;
    windowMs: number;
    limit: number;
}

export const RATE_LIMIT_TIERS: Record<string, RateLimitTier> = {
    anonymous: {
        name: 'anonymous',
        windowMs: 15 * 60 * 1000, // 15 minutes
        limit: 50
    },
    blackbox: {
        name: 'blackbox',
        windowMs: 15 * 60 * 1000,
        limit: 200
    },
    controlbox: {
        name: 'controlbox',
        windowMs: 15 * 60 * 1000,
        limit: 500
    },
    bundle: {
        name: 'bundle',
        windowMs: 15 * 60 * 1000,
        limit: 1000
    },
    admin: {
        name: 'admin',
        windowMs: 15 * 60 * 1000,
        limit: 2000
    }
};

// =====================================================================
// TIER DETECTION
// =====================================================================

/**
 * Determine rate limit tier from request user/entitlements
 */
export function getTierFromRequest(req: Request): RateLimitTier {
    const user = (req as any).user;

    if (!user) {
        return RATE_LIMIT_TIERS.anonymous;
    }

    // Super admins get highest tier
    if (user.isSuperAdmin) {
        return RATE_LIMIT_TIERS.admin;
    }

    // Check entitlements (attached by auth middleware)
    const entitlements = user.entitlements || [];
    const activeProducts = entitlements
        .filter((e: any) => e.status === 'active' || e.status === 'trial')
        .map((e: any) => e.product);

    // Bundle gets highest tier
    if (activeProducts.includes('bundle')) {
        return RATE_LIMIT_TIERS.bundle;
    }

    // ControlBox gets second highest
    if (activeProducts.includes('controlbox')) {
        return RATE_LIMIT_TIERS.controlbox;
    }

    // BlackBox gets standard paid tier
    if (activeProducts.includes('blackbox')) {
        return RATE_LIMIT_TIERS.blackbox;
    }

    // Authenticated but no active entitlements = anonymous tier
    return RATE_LIMIT_TIERS.anonymous;
}

// =====================================================================
// RATE LIMITERS BY TIER
// =====================================================================

function createLimiterForTier(tier: RateLimitTier): RateLimitRequestHandler {
    return rateLimit({
        windowMs: tier.windowMs,
        limit: tier.limit,
        standardHeaders: true,
        legacyHeaders: false,
        validate: { xForwardedForHeader: false, default: true },
        keyGenerator: (req: Request) => {
            // Use user ID if authenticated, fallback to IP
            const user = (req as any).user;
            if (user?.id) return user.id;
            // Normalize IPv6-mapped IPv4 (::ffff:1.2.3.4 → 1.2.3.4)
            const ip = req.ip || 'unknown';
            return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
        },
        handler: (_req: Request, res: Response) => {
            res.status(429).json({
                success: false,
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: `Rate limit exceeded. Limit: ${tier.limit} requests per ${tier.windowMs / 60000} minutes.`,
                    tier: tier.name,
                    retryAfterMs: tier.windowMs
                }
            });
        }
    });
}

// Pre-create all limiters at module load time to avoid
// ERR_ERL_CREATED_IN_REQUEST_HANDLER warning from express-rate-limit v7+
const tierLimiters: Map<string, RateLimitRequestHandler> = new Map(
    Object.values(RATE_LIMIT_TIERS).map(tier => [tier.name, createLimiterForTier(tier)])
);

function getLimiterForTier(tier: RateLimitTier): RateLimitRequestHandler {
    return tierLimiters.get(tier.name)!;
}

// =====================================================================
// MIDDLEWARE
// =====================================================================

/**
 * Tiered rate limiting middleware
 * Applies appropriate rate limit based on user's entitlements
 */
export function tieredRateLimiter(req: Request, res: Response, next: NextFunction): void {
    const tier = getTierFromRequest(req);
    const limiter = getLimiterForTier(tier);

    // Add tier info to response headers for debugging
    res.setHeader('X-RateLimit-Tier', tier.name);

    limiter(req, res, next);
}

/**
 * Create a rate limiter for a specific tier (useful for specific routes)
 */
export function createTierLimiter(tierName: keyof typeof RATE_LIMIT_TIERS): RateLimitRequestHandler {
    const tier = RATE_LIMIT_TIERS[tierName];
    if (!tier) {
        throw new Error(`Unknown rate limit tier: ${tierName}`);
    }
    return getLimiterForTier(tier);
}
