/**
 * Stripe Configuration
 * 
 * Central configuration for Stripe integration.
 * Fails fast in production if required keys are missing.
 */

// Required Environment Variables
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

// Tier-specific Price IDs (Stripe Dashboard > Products > Prices)
const STRIPE_PRICE_DRIVER = process.env.STRIPE_PRICE_DRIVER || '';  // BlackBox Driver
const STRIPE_PRICE_TEAM = process.env.STRIPE_PRICE_TEAM || '';      // BlackBox Team / ControlBox
const STRIPE_PRICE_LEAGUE = process.env.STRIPE_PRICE_LEAGUE || '';  // ControlBox + League Features

// Entitlement tier type
export type EntitlementTier = 'driver' | 'team' | 'league';

// Mapping from logical tier to Stripe Price ID
export const TIER_TO_PRICE_ID: Record<EntitlementTier, string> = {
    driver: STRIPE_PRICE_DRIVER,
    team: STRIPE_PRICE_TEAM,
    league: STRIPE_PRICE_LEAGUE,
};

// Mapping from Stripe Price ID to internal Product type
// This is used when syncing entitlements from webhooks
export const PRICE_ID_TO_PRODUCT: Record<string, 'blackbox' | 'controlbox' | 'bundle'> = {
    [STRIPE_PRICE_DRIVER]: 'blackbox',
    [STRIPE_PRICE_TEAM]: 'controlbox',
    [STRIPE_PRICE_LEAGUE]: 'bundle',
};

/**
 * Validates that all required Stripe configuration is present.
 * Should be called during server startup.
 * 
 * @param enforceInProduction - If true, throws errors in production when config is missing.
 */
export function validateStripeConfig(enforceInProduction = true): { valid: boolean; missing: string[] } {
    const isProduction = process.env.NODE_ENV === 'production';
    const missing: string[] = [];

    if (!STRIPE_SECRET_KEY) {
        missing.push('STRIPE_SECRET_KEY');
    }
    if (!STRIPE_WEBHOOK_SECRET) {
        missing.push('STRIPE_WEBHOOK_SECRET');
    }
    if (!STRIPE_PRICE_DRIVER) {
        missing.push('STRIPE_PRICE_DRIVER');
    }
    if (!STRIPE_PRICE_TEAM) {
        missing.push('STRIPE_PRICE_TEAM');
    }
    if (!STRIPE_PRICE_LEAGUE) {
        missing.push('STRIPE_PRICE_LEAGUE');
    }

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

/**
 * Get the Stripe secret key.
 * Returns empty string if not configured (will cause Stripe calls to fail).
 */
export function getStripeSecretKey(): string {
    return STRIPE_SECRET_KEY;
}

/**
 * Get the Stripe webhook secret for signature verification.
 */
export function getStripeWebhookSecret(): string {
    return STRIPE_WEBHOOK_SECRET;
}

/**
 * Resolve a logical tier name to its Stripe Price ID.
 * Throws if the tier is unknown or the price ID is not configured.
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
 * Returns null if the price ID is not recognized.
 */
export function resolveProductFromPriceId(priceId: string): 'blackbox' | 'controlbox' | 'bundle' | null {
    return PRICE_ID_TO_PRODUCT[priceId] || null;
}

// Export config for use in service
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
