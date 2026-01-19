/**
 * Stripe Service
 * 
 * Handles all Stripe-related operations for subscription management.
 * Uses central config, handles idempotency, and syncs entitlements.
 */

import Stripe from 'stripe';
import { getEntitlementRepository, Product, EntitlementStatus } from './entitlement-service.js';
import { getAuthService } from '../auth/auth-service.js';
import {
    getStripeSecretKey,
    getStripeWebhookSecret,
    resolvePriceId,
    resolveProductFromPriceId,
    EntitlementTier
} from '../../config/stripe.config.js';

// Initialize Stripe (with fallback for dev)
const stripe = new Stripe(getStripeSecretKey() || 'sk_test_placeholder', {
    apiVersion: '2023-10-16' as any,
});

// Track processed event IDs to prevent duplicate processing (in-memory for simplicity)
// In production, use Redis or database for persistence across restarts
const processedEvents = new Set<string>();

export class StripeService {

    /**
     * Check if Stripe is properly configured.
     */
    isConfigured(): boolean {
        return !!getStripeSecretKey();
    }

    /**
     * Create or retrieve a Stripe Customer for a given user.
     */
    async getOrCreateCustomer(userId: string, email: string, name?: string): Promise<string> {
        if (!this.isConfigured()) throw new Error('Stripe not configured');

        // Search Stripe by email to avoid duplicates
        const existing = await stripe.customers.list({ email: email, limit: 1 });

        if (existing.data.length > 0) {
            console.log(`[Stripe] Found existing customer for ${email}: ${existing.data[0].id}`);
            return existing.data[0].id;
        }

        const newCustomer = await stripe.customers.create({
            email,
            name,
            metadata: {
                userId: userId
            }
        });

        console.log(`[Stripe] Created new customer for ${email}: ${newCustomer.id}`);
        return newCustomer.id;
    }

    /**
     * Create a Checkout Session for a subscription.
     * 
     * @param userId - Internal user ID
     * @param tier - Logical tier (driver/team/league), NOT the price ID
     * @param successUrl - URL to redirect after successful checkout
     * @param cancelUrl - URL to redirect if checkout is canceled
     */
    async createCheckoutSession(
        userId: string,
        tier: EntitlementTier,
        successUrl: string,
        cancelUrl: string
    ): Promise<{ url: string | null }> {
        if (!this.isConfigured()) throw new Error('Stripe not configured');

        // Resolve tier to Stripe Price ID server-side
        const priceId = resolvePriceId(tier);
        console.log(`[Stripe] Creating checkout for user ${userId}, tier: ${tier}, priceId: ${priceId}`);

        const authService = getAuthService();
        const user = await authService.getUserById(userId);
        if (!user) throw new Error('User not found');

        const customerId = await this.getOrCreateCustomer(userId, user.email || '', user.displayName);

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                userId: userId,
                tier: tier,
                source: 'controlbox_dashboard'
            },
            subscription_data: {
                metadata: {
                    userId: userId,
                    tier: tier
                }
            }
        });

        console.log(`[Stripe] Checkout session created: ${session.id}`);
        return { url: session.url };
    }

    /**
     * Create a Portal Session for managing subscriptions.
     * Only allows managing the authenticated user's own billing.
     */
    async createPortalSession(userId: string, returnUrl: string): Promise<{ url: string }> {
        if (!this.isConfigured()) throw new Error('Stripe not configured');

        const authService = getAuthService();
        const user = await authService.getUserById(userId);
        if (!user) throw new Error('User not found');

        // Find customer by email
        const customers = await stripe.customers.list({ email: user.email, limit: 1 });
        if (customers.data.length === 0) {
            console.warn(`[Stripe] No billing account found for user ${userId} (${user.email})`);
            throw new Error('No billing account found for this user.');
        }

        // Safety: Verify that the customer metadata matches the requesting user
        const customer = customers.data[0];
        if (customer.metadata?.userId && customer.metadata.userId !== userId) {
            console.error(`[Stripe] SECURITY: User ${userId} attempted to access billing for customer ${customer.id} (belongs to ${customer.metadata.userId})`);
            throw new Error('Access denied: Cannot manage another user\'s billing.');
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: customer.id,
            return_url: returnUrl,
        });

        console.log(`[Stripe] Portal session created for user ${userId}`);
        return { url: session.url };
    }

    /**
     * Handle Stripe Webhooks to sync entitlements.
     * Implements signature verification and idempotency.
     */
    async handleWebhook(signature: string, rawBody: Buffer): Promise<void> {
        const webhookSecret = getStripeWebhookSecret();
        if (!webhookSecret) throw new Error('Webhook secret not configured');

        // Verify webhook signature
        let event: Stripe.Event;
        try {
            event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
        } catch (err: any) {
            console.error(`[Stripe] Webhook signature verification failed:`, err.message);
            throw new Error(`Webhook signature verification failed: ${err.message}`);
        }

        console.log(`[Stripe] 🔔 Webhook received: ${event.type} (${event.id})`);

        // Idempotency: Check if we've already processed this event
        if (processedEvents.has(event.id)) {
            console.log(`[Stripe] ⏭️ Event ${event.id} already processed, skipping.`);
            return;
        }

        // Process the event
        try {
            switch (event.type) {
                case 'checkout.session.completed': {
                    const session = event.data.object as Stripe.Checkout.Session;
                    console.log(`[Stripe] ✅ Checkout completed: ${session.id}, customer: ${session.customer}`);
                    // Subscription events will handle the actual entitlement sync
                    break;
                }

                case 'customer.subscription.created':
                case 'customer.subscription.updated': {
                    const subscription = event.data.object as Stripe.Subscription;
                    await this.syncEntitlementFromSubscription(subscription, event.id);
                    break;
                }

                case 'customer.subscription.deleted': {
                    const subscription = event.data.object as Stripe.Subscription;
                    await this.syncEntitlementFromSubscription(subscription, event.id, 'canceled');
                    break;
                }

                case 'invoice.payment_failed': {
                    const invoice = event.data.object as Stripe.Invoice;
                    await this.handlePaymentFailed(invoice, event.id);
                    break;
                }

                default:
                    console.log(`[Stripe] Unhandled event type: ${event.type}`);
            }

            // Mark event as processed
            processedEvents.add(event.id);

            // Clean up old events (prevent memory leak) - keep last 10000
            if (processedEvents.size > 10000) {
                const toDelete = Array.from(processedEvents).slice(0, 1000);
                toDelete.forEach(id => processedEvents.delete(id));
            }

        } catch (error) {
            console.error(`[Stripe] ❌ Error processing webhook ${event.type}:`, error);
            throw error;
        }
    }

    /**
     * Sync entitlement from a Stripe subscription.
     */
    private async syncEntitlementFromSubscription(
        sub: Stripe.Subscription,
        eventId: string,
        forceStatus?: 'canceled'
    ): Promise<void> {
        const userId = sub.metadata?.userId;

        if (!userId) {
            console.warn(`[Stripe] ⚠️ Subscription ${sub.id} has no userId in metadata. Cannot sync entitlement.`);
            return;
        }

        // Determine product from price ID
        const priceId = sub.items.data[0]?.price?.id;
        const product: Product = priceId ? (resolveProductFromPriceId(priceId) || 'blackbox') : 'blackbox';

        // Map Stripe status to our entitlement status
        let status: EntitlementStatus;
        if (forceStatus) {
            status = forceStatus;
        } else if (sub.status === 'active') {
            status = 'active';
        } else if (sub.status === 'trialing') {
            status = 'trial';
        } else if (sub.status === 'past_due') {
            status = 'past_due';
        } else if (sub.status === 'canceled' || sub.status === 'unpaid') {
            status = 'canceled';
        } else {
            status = 'expired';
        }

        console.log(`[Stripe] 🔄 Syncing entitlement for user ${userId}: product=${product}, status=${status}`);

        const entitlementRepo = getEntitlementRepository();

        await entitlementRepo.upsertFromExternal({
            userId,
            source: 'stripe',
            product,
            status,
            externalOrderId: sub.id, // Use subscription ID as the unique key
            externalCustomerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
            externalSubscriptionId: sub.id,
            startAt: new Date((sub as any).current_period_start * 1000),
            endAt: new Date((sub as any).current_period_end * 1000),
        });

        // Audit log
        await entitlementRepo.auditLog({
            entitlementId: null,
            action: `stripe_${sub.status}`,
            triggeredBy: 'stripe_webhook',
            newStatus: status,
            webhookPayloadId: eventId,
            externalOrderId: sub.id,
            metadata: {
                priceId,
                customerId: sub.customer,
            }
        });

        console.log(`[Stripe] ✅ Entitlement synced for user ${userId}`);
    }

    /**
     * Handle payment failure - update entitlement status.
     */
    private async handlePaymentFailed(invoice: Stripe.Invoice, eventId: string): Promise<void> {
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
        // Invoice.subscription can be string, Subscription object, or null
        const subscriptionId = (invoice as any).subscription
            ? (typeof (invoice as any).subscription === 'string'
                ? (invoice as any).subscription
                : (invoice as any).subscription.id)
            : null;

        console.warn(`[Stripe] ⚠️ Payment failed for customer ${customerId}, subscription ${subscriptionId}`);

        if (!subscriptionId) {
            console.warn(`[Stripe] No subscription ID on failed invoice, cannot update entitlement.`);
            return;
        }

        const entitlementRepo = getEntitlementRepository();

        // Find entitlement by subscription ID
        const entitlement = await entitlementRepo.getByExternalOrderId(subscriptionId);

        if (entitlement) {
            // Update status to past_due
            await entitlementRepo.upsertFromExternal({
                userId: entitlement.userId,
                source: 'stripe',
                product: entitlement.product,
                status: 'past_due',
                externalOrderId: subscriptionId,
                externalCustomerId: customerId || undefined,
                externalSubscriptionId: subscriptionId,
            });

            await entitlementRepo.auditLog({
                entitlementId: entitlement.id,
                action: 'stripe_payment_failed',
                triggeredBy: 'stripe_webhook',
                previousStatus: entitlement.status,
                newStatus: 'past_due',
                webhookPayloadId: eventId,
                externalOrderId: subscriptionId,
                metadata: {
                    invoiceId: invoice.id,
                    amountDue: invoice.amount_due,
                }
            });

            console.log(`[Stripe] Entitlement ${entitlement.id} marked as past_due due to payment failure.`);
        }
    }
}

// Singleton
const stripeService = new StripeService();
export const getStripeService = () => stripeService;
