/**
 * Stripe Configuration
 * 
 * Central configuration for Stripe billing integration.
 * Fails fast in production if required keys are missing.
 * 
 * PRICING (LOCKED):
 * - Free: $0 (relay auth only)
 * - BlackBox (Driver): $14/month
 * - TeamBox (Team): $26/month
 * - LeagueBox (League): $48/month (active season billing)
 * 
 * NOTE: "ControlBox" is DEPRECATED. Use "LeagueBox".
 */

// Required Environment Variables
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

// Tier-specific Price IDs (from Stripe Dashboard)
const STRIPE_PRICE_DRIVER = process.env.STRIPE_PRICE_DRIVER || '';  // $14/mo
const STRIPE_PRICE_TEAM = process.env.STRIPE_PRICE_TEAM || '';      // $26/mo
const STRIPE_PRICE_LEAGUE = process.env.STRIPE_PRICE_LEAGUE || '';  // $48/mo

// Entitlement tier type
export type EntitlementTier = 'driver' | 'team' | 'league';

// Mapping from logical tier to Stripe Price ID
export const TIER_TO_PRICE_ID: Record<EntitlementTier, string> = {
    driver: STRIPE_PRICE_DRIVER,
    team: STRIPE_PRICE_TEAM,
    league: STRIPE_PRICE_LEAGUE,
};

// Mapping from Stripe Price ID to internal Product type
// These must match the Product type in entitlement-service.ts
export const PRICE_ID_TO_PRODUCT: Record<string, 'driver' | 'team' | 'league'> = {
    [STRIPE_PRICE_DRIVER]: 'driver',
    [STRIPE_PRICE_TEAM]: 'team',
    [STRIPE_PRICE_LEAGUE]: 'league',
};

// Tier display info for UI
// Product names: BlackBox, TeamBox, LeagueBox
export const TIER_INFO: Record<EntitlementTier, { name: string; price: number; description: string }> = {
    driver: {
        name: 'BlackBox',
        price: 14,
        description: 'Driver HUD, voice engineer, personal telemetry, Pit Wall Lite'
    },
    team: {
        name: 'TeamBox',
        price: 26,
        description: 'Full Pit Wall, multi-car telemetry, strategy tools'
    },
    league: {
        name: 'LeagueBox',
        price: 48,
        description: 'Seasons, scoring, rules, Steward Console (optional)'
    }
};

/**
 * Validates that all required Stripe configuration is present.
 * Should be called during server startup.
 */
export function validateStripeConfig(enforceInProduction = true): { valid: boolean; missing: string[] } {
    const isProduction = process.env.NODE_ENV === 'production';
    const missing: string[] = [];

    if (!STRIPE_SECRET_KEY) missing.push('STRIPE_SECRET_KEY');
    if (!STRIPE_WEBHOOK_SECRET) missing.push('STRIPE_WEBHOOK_SECRET');
    if (!STRIPE_PRICE_DRIVER) missing.push('STRIPE_PRICE_DRIVER');
    if (!STRIPE_PRICE_TEAM) missing.push('STRIPE_PRICE_TEAM');
    if (!STRIPE_PRICE_LEAGUE) missing.push('STRIPE_PRICE_LEAGUE');

    if (missing.length > 0) {
        const message = `⚠️ Missing Stripe configuration: ${missing.join(', ')}`;

        if (isProduction && enforceInProduction) {
            console.error(`❌ FATAL: ${message}`);
            throw new Error(`Stripe configuration incomplete. Cannot start in production. Missing: ${missing.join(', ')}`);
        } else {
            console.warn(message);
        }
    }

    return { valid: missing.length === 0, missing };
}

export function getStripeSecretKey(): string {
    return STRIPE_SECRET_KEY;
}

export function getStripeWebhookSecret(): string {
    return STRIPE_WEBHOOK_SECRET;
}

/**
 * Resolve a logical tier name to its Stripe Price ID.
 */
export function resolvePriceId(tier: EntitlementTier): string {
    const priceId = TIER_TO_PRICE_ID[tier];
    if (!priceId) {
        throw new Error(`No Stripe Price ID configured for tier: ${tier}`);
    }
    return priceId;
}

/**
 * Resolve a Stripe Price ID to an internal product type.
 */
export function resolveProductFromPriceId(priceId: string): 'driver' | 'team' | 'league' | null {
    return PRICE_ID_TO_PRODUCT[priceId] || null;
}

export const stripeConfig = {
    secretKey: STRIPE_SECRET_KEY,
    webhookSecret: STRIPE_WEBHOOK_SECRET,
    prices: {
        driver: STRIPE_PRICE_DRIVER,
        team: STRIPE_PRICE_TEAM,
        league: STRIPE_PRICE_LEAGUE,
    },
    validate: validateStripeConfig,
    resolvePriceId,
    resolveProductFromPriceId,
};
