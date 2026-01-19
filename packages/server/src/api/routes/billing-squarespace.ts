/**
 * Squarespace Webhook Handler
 * 
 * Processes order.create and order.update events from Squarespace.
 * Maps purchases to entitlements and handles identity linking.
 * 
 * Webhook events:
 * - order.create → new purchase, create entitlement
 * - order.update (FULFILLED) → subscription renewal
 * - order.update (CANCELED/REFUNDED) → cancel entitlement
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import {
    getEntitlementRepository,
    Product,
    EntitlementStatus
} from '../../services/billing/entitlement-service.js';
import { pool } from '../../db/client.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// ============================================================================
// TYPES
// ============================================================================

interface SquarespaceWebhookPayload {
    websiteId: string;
    subscriptionId: string;
    topic: 'order.create' | 'order.update';
    data: {
        orderId: string;
        orderNumber?: string;
    };
    createdOn: string;
}

interface SquarespaceOrder {
    id: string;
    orderNumber: string;
    createdOn: string;
    modifiedOn: string;
    fulfillmentStatus: 'PENDING' | 'FULFILLED' | 'CANCELED';
    customerEmail: string;
    lineItems: Array<{
        id: string;
        productId: string;
        productName: string;
        sku: string;
        quantity: number;
    }>;
    billingAddress?: {
        firstName: string;
        lastName: string;
    };
    grandTotal: {
        value: string;
        currency: string;
    };
    refundedTotal?: {
        value: string;
        currency: string;
    };
}

// ============================================================================
// CONFIG
// ============================================================================

const SQUARESPACE_WEBHOOK_SECRET = process.env.SQUARESPACE_WEBHOOK_SECRET || '';
const SQUARESPACE_API_KEY = process.env.SQUARESPACE_API_KEY || '';

// Product SKU → Product mapping (maps Squarespace SKUs to new tier names)
const SKU_TO_PRODUCT: Record<string, Product> = {
    // Driver tier ($14/mo) - old BlackBox SKUs
    'BLACKBOX': 'driver',
    'BB-MONTHLY': 'driver',
    'BB-ANNUAL': 'driver',
    'DRIVER': 'driver',
    'DRIVER-MONTHLY': 'driver',
    'DRIVER-ANNUAL': 'driver',
    // Team tier ($26/mo)
    'TEAM': 'team',
    'TEAM-MONTHLY': 'team',
    'TEAM-ANNUAL': 'team',
    // League tier ($48/mo) - old ControlBox SKUs
    'CONTROLBOX': 'league',
    'CB-MONTHLY': 'league',
    'CB-ANNUAL': 'league',
    'LEAGUE': 'league',
    'LEAGUE-MONTHLY': 'league',
    'LEAGUE-ANNUAL': 'league',
    // Bundle (all tiers)
    'BUNDLE': 'bundle',
    'BUNDLE-MONTHLY': 'bundle',
    'BUNDLE-ANNUAL': 'bundle'
};

// SKU → Scope mapping (user or org)
type Scope = 'user' | 'org';
const SKU_TO_SCOPE: Record<string, Scope> = {
    'BB-MONTHLY': 'user',
    'BB-ANNUAL': 'user',
    'BLACKBOX': 'user',
    'CB-MONTHLY': 'org',
    'CB-ANNUAL': 'org',
    'CONTROLBOX': 'org',
    'RBX-PLUS-MONTHLY': 'org',
    'RBX-PLUS-ANNUAL': 'org',
    'RACEBOX-PLUS': 'org',
    'BUNDLE-MONTHLY': 'user',  // Bundle creates both user + org entitlements
    'BUNDLE-ANNUAL': 'user',
    'BUNDLE': 'user'
};

// SKU → Billing period
type BillingPeriod = 'monthly' | 'annual';
const SKU_TO_BILLING_PERIOD: Record<string, BillingPeriod> = {
    'BB-MONTHLY': 'monthly',
    'BB-ANNUAL': 'annual',
    'CB-MONTHLY': 'monthly',
    'CB-ANNUAL': 'annual',
    'RBX-PLUS-MONTHLY': 'monthly',
    'RBX-PLUS-ANNUAL': 'annual',
    'BUNDLE-MONTHLY': 'monthly',
    'BUNDLE-ANNUAL': 'annual'
};

// Series add-on SKUs (quantity-aware)
const SERIES_ADDON_SKUS: Record<string, Product> = {
    'CB-SERIES-ADDON': 'league',
    'LEAGUE-SERIES-ADDON': 'league'
};

// ============================================================================
// WEBHOOK ENDPOINT
// ============================================================================

/**
 * POST /api/billing/squarespace/webhook
 * 
 * Receives Squarespace order events and syncs entitlements.
 */
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers['squarespace-signature'] as string;
    const rawBody = JSON.stringify(req.body);

    // Verify webhook signature
    if (SQUARESPACE_WEBHOOK_SECRET && !verifySignature(rawBody, signature)) {
        console.warn('⚠️ Squarespace webhook signature verification failed');
        res.status(401).json({ error: 'Invalid signature' });
        return;
    }

    try {
        const payload = req.body as SquarespaceWebhookPayload;
        console.log(`📦 Squarespace webhook: ${payload.topic} for order ${payload.data.orderId}`);

        await processWebhookEvent(payload);

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Squarespace webhook error:', error);
        res.status(500).json({ error: 'Internal error' });
    }
});

// ============================================================================
// WEBHOOK PROCESSING
// ============================================================================

async function processWebhookEvent(payload: SquarespaceWebhookPayload): Promise<void> {
    const repo = getEntitlementRepository();
    const orderId = payload.data.orderId;

    // Fetch full order details from Squarespace API
    const order = await fetchOrderDetails(orderId);
    if (!order) {
        console.error(`Failed to fetch order ${orderId}`);
        return;
    }

    // Determine product from line items
    const product = determineProductFromOrder(order);
    if (!product) {
        console.log(`No recognized product in order ${orderId}, skipping`);
        return;
    }

    // Determine status based on event and order state
    const status = determineEntitlementStatus(payload.topic, order);

    // Find matching user by email
    const user = await findUserByEmail(order.customerEmail);

    if (user) {
        // ✅ User found - create/update entitlement
        const previousEnt = await repo.getByExternalOrderId(orderId);

        const entitlement = await repo.upsertFromExternal({
            userId: user.id,
            product,
            status,
            source: 'squarespace',
            externalOrderId: orderId,
            externalCustomerEmail: order.customerEmail,
            startAt: new Date(order.createdOn)
        });

        // Audit log
        await repo.auditLog({
            entitlementId: entitlement.id,
            action: previousEnt ? 'updated' : 'created',
            triggeredBy: 'webhook',
            previousStatus: previousEnt?.status,
            newStatus: status,
            webhookPayloadId: payload.subscriptionId,
            externalOrderId: orderId,
            metadata: { topic: payload.topic, orderNumber: order.orderNumber }
        });

        console.log(`✅ Entitlement ${previousEnt ? 'updated' : 'created'} for user ${user.email}: ${product} (${status})`);
    } else {
        // ⚠️ No matching user - create pending entitlement
        console.warn(`⚠️ No user found for email ${order.customerEmail}, creating pending entitlement`);

        await repo.createPending({
            product,
            externalCustomerEmail: order.customerEmail,
            externalOrderId: orderId
        });

        await repo.auditLog({
            entitlementId: null,
            action: 'pending_created',
            triggeredBy: 'webhook',
            newStatus: 'pending',
            webhookPayloadId: payload.subscriptionId,
            externalOrderId: orderId,
            metadata: {
                topic: payload.topic,
                reason: 'no_user_match',
                attemptedEmail: order.customerEmail
            }
        });

        // TODO: Send admin alert about pending entitlement
    }
}

// ============================================================================
// HELPERS
// ============================================================================

function verifySignature(payload: string, signature: string): boolean {
    if (!signature || !SQUARESPACE_WEBHOOK_SECRET) {
        return false;
    }

    const expectedSig = crypto
        .createHmac('sha256', SQUARESPACE_WEBHOOK_SECRET)
        .update(payload)
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSig)
    );
}

async function fetchOrderDetails(orderId: string): Promise<SquarespaceOrder | null> {
    if (!SQUARESPACE_API_KEY) {
        console.warn('SQUARESPACE_API_KEY not configured, cannot fetch order details');
        return null;
    }

    try {
        const response = await fetch(
            `https://api.squarespace.com/1.0/commerce/orders/${orderId}`,
            {
                headers: {
                    'Authorization': `Bearer ${SQUARESPACE_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            console.error(`Squarespace API error: ${response.status}`);
            return null;
        }

        return await response.json() as SquarespaceOrder;
    } catch (error) {
        console.error('Failed to fetch Squarespace order:', error);
        return null;
    }
}

function determineProductFromOrder(order: SquarespaceOrder): Product | null {
    for (const item of order.lineItems) {
        const sku = item.sku?.toUpperCase() || '';
        const productName = item.productName?.toUpperCase() || '';

        // Skip series add-on SKUs (handled separately)
        if (SERIES_ADDON_SKUS[sku]) continue;

        // Try SKU first
        if (SKU_TO_PRODUCT[sku]) {
            return SKU_TO_PRODUCT[sku];
        }

        // Fallback to product name matching (maps old names to new tiers)
        if (productName.includes('BLACKBOX') || productName.includes('DRIVER')) return 'driver';
        if (productName.includes('TEAM')) return 'team';
        if (productName.includes('CONTROLBOX') || productName.includes('LEAGUE')) return 'league';
        if (productName.includes('BUNDLE')) return 'bundle';
    }

    return null;
}

export function getOrderScopeAndBilling(order: SquarespaceOrder): { scope: Scope; billingPeriod: BillingPeriod } {
    for (const item of order.lineItems) {
        const sku = item.sku?.toUpperCase() || '';
        if (SKU_TO_SCOPE[sku]) {
            return {
                scope: SKU_TO_SCOPE[sku],
                billingPeriod: SKU_TO_BILLING_PERIOD[sku] || 'monthly'
            };
        }
    }
    return { scope: 'user', billingPeriod: 'monthly' };
}

export function getSeriesAddonsFromOrder(order: SquarespaceOrder): { product: Product; quantity: number }[] {
    const addons: { product: Product; quantity: number }[] = [];
    for (const item of order.lineItems) {
        const sku = item.sku?.toUpperCase() || '';
        if (SERIES_ADDON_SKUS[sku]) {
            addons.push({
                product: SERIES_ADDON_SKUS[sku],
                quantity: item.quantity || 1
            });
        }
    }
    return addons;
}

function determineEntitlementStatus(
    topic: string,
    order: SquarespaceOrder
): EntitlementStatus {
    // Check for refund
    if (order.refundedTotal && parseFloat(order.refundedTotal.value) > 0) {
        return 'canceled';
    }

    // Check fulfillment status
    switch (order.fulfillmentStatus) {
        case 'FULFILLED':
            return 'active';
        case 'CANCELED':
            return 'canceled';
        case 'PENDING':
        default:
            return topic === 'order.create' ? 'active' : 'pending';
    }
}

async function findUserByEmail(email: string): Promise<{ id: string; email: string } | null> {
    const result = await pool.query(
        `SELECT id, email FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        [email]
    );
    return result.rows[0] || null;
}

// ============================================================================
// MANUAL RESOLUTION ENDPOINT (ADMIN)
// ============================================================================

// Note: requireAuth is imported at file top via index.ts or directly

/**
 * POST /api/billing/squarespace/resolve-pending
 * 
 * Admin endpoint to manually resolve pending entitlements.
 * Requires authentication and admin privileges.
 */
router.post('/resolve-pending', requireAuth, async (req: Request, res: Response): Promise<void> => {
    // Check for admin privileges
    const user = (req as any).user;
    if (!user?.isSuperAdmin && !user?.capabilities?.includes('admin:billing')) {
        res.status(403).json({
            success: false,
            error: 'Admin privileges required'
        });
        return;
    }

    const { pendingId, userId, notes } = req.body as {
        pendingId: string;
        userId: string;
        notes?: string;
    };

    if (!pendingId || !userId) {
        res.status(400).json({ error: 'pendingId and userId required' });
        return;
    }

    try {
        const repo = getEntitlementRepository();

        // Get pending entitlement
        const pendingResult = await pool.query(
            `SELECT * FROM pending_entitlements WHERE id = $1`,
            [pendingId]
        );
        const pending = pendingResult.rows[0];

        if (!pending) {
            res.status(404).json({ error: 'Pending entitlement not found' });
            return;
        }

        // Create real entitlement
        const entitlement = await repo.upsertFromExternal({
            userId,
            product: pending.product,
            status: 'active',
            source: 'squarespace',
            externalOrderId: pending.external_order_id,
            externalCustomerEmail: pending.external_customer_email
        });

        // Mark pending as resolved
        await repo.resolvePending(pendingId, 'manual', notes);

        // Audit log
        await repo.auditLog({
            entitlementId: entitlement.id,
            action: 'pending_resolved',
            triggeredBy: 'admin',
            newStatus: 'active',
            externalOrderId: pending.external_order_id,
            metadata: { notes, pendingId }
        });

        res.json({ success: true, entitlement });
    } catch (error) {
        console.error('Resolve pending error:', error);
        res.status(500).json({ error: 'Failed to resolve pending entitlement' });
    }
});

export default router;
