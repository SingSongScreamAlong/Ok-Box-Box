/**
 * Stripe Webhook Route
 * 
 * Handles incoming Stripe webhook events.
 * MUST be registered BEFORE JSON body parsing middleware.
 * Uses raw body for signature verification.
 */

import { Router } from 'express';
import express from 'express';
import { getStripeService } from '../../services/billing/stripe-service.js';

const router = Router();

/**
 * POST /api/webhooks/stripe
 * 
 * Receives webhook events from Stripe.
 * Requires raw body for signature verification.
 * 
 * Configure this URL in Stripe Dashboard:
 * https://your-domain.com/api/webhooks/stripe
 */
router.post(
    '/',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
        const signature = req.headers['stripe-signature'];

        if (!signature) {
            console.warn('[Stripe Webhook] Missing stripe-signature header');
            res.status(400).send('Missing signature');
            return;
        }

        try {
            await getStripeService().handleWebhook(signature as string, req.body);
            console.log('[Stripe Webhook] Event processed successfully');
            res.json({ received: true });
        } catch (err: any) {
            console.error('[Stripe Webhook] Error:', err.message);
            res.status(400).send(`Webhook Error: ${err.message}`);
        }
    }
);

export default router;
