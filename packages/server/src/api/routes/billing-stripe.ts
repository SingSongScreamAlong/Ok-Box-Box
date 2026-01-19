/**
 * Stripe Billing API Routes
 * 
 * Endpoints for subscription management.
 * All endpoints require authentication.
 */

import { Router } from 'express';
import { getStripeService } from '../../services/billing/stripe-service.js';
import { requireAuth } from '../middleware/auth.js';
import { EntitlementTier } from '../../config/stripe.config.js';

const router = Router();

/**
 * POST /api/billing/stripe/checkout
 * 
 * Start a Stripe Checkout session for a subscription.
 * Accepts a logical tier (driver/team/league), NOT a Price ID.
 * 
 * Body:
 *  - tier: 'driver' | 'team' | 'league'
 *  - successUrl: string (optional, defaults to profile page)
 *  - cancelUrl: string (optional, defaults to profile page)
 */
router.post('/checkout', requireAuth, async (req, res) => {
    try {
        const { tier, successUrl, cancelUrl } = req.body;
        const userId = req.user!.id;

        // Validate tier
        const validTiers: EntitlementTier[] = ['driver', 'team', 'league'];
        if (!tier || !validTiers.includes(tier)) {
            console.warn(`[Billing API] Invalid tier requested by user ${userId}: ${tier}`);
            res.status(400).json({ error: `Invalid tier. Must be one of: ${validTiers.join(', ')}` });
            return;
        }

        console.log(`[Billing API] User ${userId} starting checkout for tier: ${tier}`);

        const session = await getStripeService().createCheckoutSession(
            userId,
            tier as EntitlementTier,
            successUrl || `${process.env.DASHBOARD_URL || 'http://localhost:5173'}/billing/return?success=true`,
            cancelUrl || `${process.env.DASHBOARD_URL || 'http://localhost:5173'}/my-idp?canceled=true`
        );

        res.json(session);
    } catch (error: any) {
        console.error(`[Billing API] Checkout error:`, error.message);
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /api/billing/stripe/portal
 * 
 * Open the Stripe Customer Portal for subscription management.
 * User can only manage their own billing.
 * 
 * Body:
 *  - returnUrl: string (optional, defaults to profile page)
 */
router.post('/portal', requireAuth, async (req, res) => {
    try {
        const { returnUrl } = req.body;
        const userId = req.user!.id;

        console.log(`[Billing API] User ${userId} opening customer portal`);

        const session = await getStripeService().createPortalSession(
            userId,
            returnUrl || `${process.env.DASHBOARD_URL || 'http://localhost:5173'}/my-idp`
        );

        res.json(session);
    } catch (error: any) {
        console.error(`[Billing API] Portal error:`, error.message);
        res.status(400).json({ error: error.message });
    }
});

export default router;
