/**
 * Entitlement Service
 * 
 * Manages entitlements (paid access) derived from Stripe/Squarespace purchases.
 * Maps entitlements → capabilities deterministically.
 * 
 * PRODUCTS: BlackBox (driver), TeamBox (team), LeagueBox (league)
 * NOTE: "ControlBox" is deprecated. Use "LeagueBox".
 */

import { Pool } from 'pg';
import { pool as defaultPool } from '../../db/client.js';

// ============================================================================
// TYPES
// ============================================================================

export type Product = 'driver' | 'team' | 'league' | 'bundle';
export type EntitlementStatus = 'active' | 'trial' | 'past_due' | 'canceled' | 'expired' | 'pending';
export type EntitlementSource = 'squarespace' | 'stripe' | 'manual' | 'promo';
export type EntitlementScope = 'user' | 'org';
export type BillingPeriod = 'monthly' | 'annual';

export interface Entitlement {
    id: string;
    userId: string | null;
    orgId: string | null;
    product: Product;
    status: EntitlementStatus;
    scope: EntitlementScope;
    billingPeriod: BillingPeriod;
    seriesAddonsCount: number;
    startAt: Date;
    endAt: Date | null;
    renewedAt: Date | null;
    canceledAt: Date | null;
    source: EntitlementSource;
    externalCustomerId: string | null;
    externalSubscriptionId: string | null;
    externalOrderId: string | null;
    externalCustomerEmail: string | null;
    externalEventId: string | null;  // For idempotency
    createdAt: Date;
    updatedAt: Date;
}

export interface EntitlementAuditEntry {
    entitlementId: string | null;
    action: string;
    triggeredBy: string;
    triggeredByUserId?: string;
    previousStatus?: string;
    newStatus?: string;
    webhookPayloadId?: string;
    externalOrderId?: string;
    metadata?: Record<string, unknown>;
}

export interface PendingEntitlement {
    id: string;
    product: Product;
    externalCustomerEmail: string;
    externalCustomerId: string | null;
    externalOrderId: string;
    externalSubscriptionId: string | null;
    status: 'pending' | 'linked' | 'expired' | 'manual';
    attemptedUserId: string | null;
    resolutionNotes: string | null;
    createdAt: Date;
    resolvedAt: Date | null;
}

// ============================================================================
// CAPABILITIES MAPPING
// ============================================================================

export interface Capabilities {
    // Free tier - always granted to authenticated users
    relay_auth: boolean;

    // BlackBox (Driver) — $14/mo
    driver_hud: boolean;
    situational_awareness: boolean;
    voice_engineer: boolean;
    personal_telemetry: boolean;
    livespotter_access: boolean;      // Read-only, single-driver, shareable view

    // TeamBox (Team) — $26/mo
    pitwall_view: boolean;            // Full Pit Wall (multi-car, interactive)
    multi_car_monitor: boolean;
    strategy_timeline: boolean;

    // LeagueBox (League) — $48/mo
    incident_review: boolean;
    penalty_assign: boolean;
    protest_review: boolean;
    rulebook_manage: boolean;
    session_authority: boolean;

    // Broadcast (included with higher tiers)
    racebox_access: boolean;
    broadcast_overlays: boolean;
    director_controls: boolean;
    public_timing: boolean;
}

/**
 * CRITICAL: Single source of truth for entitlement → capabilities mapping.
 * 
 * Rules:
 * - Free tier: ONLY relay_auth is true
 * - 'active' or 'trial' entitlements grant paid capabilities
 * - Roles modify certain capabilities (penalty_assign, etc.)
 */
export function deriveCapabilitiesFromEntitlements(
    entitlements: Entitlement[],
    roles: string[] = []
): Capabilities {
    // FREE TIER: Only relay_auth is granted
    // All other capabilities require a paid subscription
    const caps: Capabilities = {
        relay_auth: true,             // Always true for authenticated users
        driver_hud: false,
        situational_awareness: false,
        voice_engineer: false,
        personal_telemetry: false,
        livespotter_access: false,    // BlackBox: read-only spotter view
        pitwall_view: false,          // TeamBox: full pit wall (multi-car)
        multi_car_monitor: false,
        strategy_timeline: false,
        incident_review: false,
        penalty_assign: false,
        protest_review: false,
        rulebook_manage: false,
        session_authority: false,
        racebox_access: false,
        broadcast_overlays: false,
        director_controls: false,
        public_timing: false
    };

    // Filter to active entitlements only
    const activeEntitlements = entitlements.filter(e =>
        e.status === 'active' || e.status === 'trial'
    );

    for (const ent of activeEntitlements) {
        // BlackBox (Driver) — $14/mo
        // Personal driving tools + LiveSpotter (read-only, single-driver)
        if (ent.product === 'driver' || ent.product === 'bundle') {
            caps.driver_hud = true;
            caps.situational_awareness = true;
            caps.voice_engineer = true;
            caps.personal_telemetry = true;
            caps.livespotter_access = true;   // Read-only spotter view (NOT Pit Wall)
        }

        // TeamBox (Team) — $26/mo
        // Full Pit Wall system (multi-car, interactive)
        if (ent.product === 'team' || ent.product === 'bundle') {
            // Team includes all Driver capabilities
            caps.driver_hud = true;
            caps.situational_awareness = true;
            caps.voice_engineer = true;
            caps.personal_telemetry = true;
            caps.livespotter_access = true;
            // Plus team-specific: Full Pit Wall (NOT LiveSpotter)
            caps.pitwall_view = true;         // Multi-car, interactive, NOT shareable
            caps.multi_car_monitor = true;
            caps.strategy_timeline = true;
            caps.racebox_access = true;
            caps.public_timing = true;
        }

        // League tier ($48/mo) - Race control
        if (ent.product === 'league' || ent.product === 'bundle') {
            // League includes timing/broadcast
            caps.racebox_access = true;
            caps.broadcast_overlays = true;
            caps.director_controls = true;
            caps.public_timing = true;
            // Race control capabilities
            caps.incident_review = true;

            // Role-gated capabilities
            if (roles.includes('racecontrol') || roles.includes('admin')) {
                caps.penalty_assign = true;
                caps.protest_review = true;
            }
            if (roles.includes('admin')) {
                caps.rulebook_manage = true;
                caps.session_authority = true;
            }
        }
    }

    return caps;
}

// ============================================================================
// ENTITLEMENT REPOSITORY
// ============================================================================

export class EntitlementRepository {
    private pool: Pool;

    constructor(pool?: Pool) {
        this.pool = pool || defaultPool;
    }

    /**
     * Get all entitlements for a user (by userId or email match)
     */
    async getForUser(userId: string): Promise<Entitlement[]> {
        const result = await this.pool.query<any>(
            `SELECT * FROM entitlements WHERE user_id = $1 ORDER BY created_at DESC`,
            [userId]
        );
        return result.rows.map(this.mapRow);
    }

    /**
     * Find entitlements by customer email (for identity linking)
     */
    async getByCustomerEmail(email: string): Promise<Entitlement[]> {
        const result = await this.pool.query<any>(
            `SELECT * FROM entitlements WHERE LOWER(external_customer_email) = LOWER($1) ORDER BY created_at DESC`,
            [email]
        );
        return result.rows.map(this.mapRow);
    }

    /**
     * Find by external order ID (for webhook idempotency)
     */
    async getByExternalOrderId(orderId: string): Promise<Entitlement | null> {
        const result = await this.pool.query<any>(
            `SELECT * FROM entitlements WHERE external_order_id = $1 LIMIT 1`,
            [orderId]
        );
        return result.rows[0] ? this.mapRow(result.rows[0]) : null;
    }

    /**
     * Create or update entitlement from external source
     */
    async upsertFromExternal(data: {
        userId: string | null;
        orgId?: string | null;
        product: Product;
        status: EntitlementStatus;
        source: EntitlementSource;
        externalCustomerId?: string;
        externalSubscriptionId?: string;
        externalOrderId: string;
        externalCustomerEmail?: string;
        startAt?: Date;
        endAt?: Date;
    }): Promise<Entitlement> {
        // Check if exists
        const existing = await this.getByExternalOrderId(data.externalOrderId);

        if (existing) {
            // Update
            const result = await this.pool.query<any>(
                `UPDATE entitlements SET
                    status = $1,
                    renewed_at = CASE WHEN $1 = 'active' THEN NOW() ELSE renewed_at END,
                    canceled_at = CASE WHEN $1 = 'canceled' THEN NOW() ELSE canceled_at END,
                    updated_at = NOW()
                WHERE external_order_id = $2
                RETURNING *`,
                [data.status, data.externalOrderId]
            );
            return this.mapRow(result.rows[0]);
        }

        // Create new
        const result = await this.pool.query<any>(
            `INSERT INTO entitlements 
                (user_id, org_id, product, status, source, 
                 external_customer_id, external_subscription_id, external_order_id, external_customer_email,
                 start_at, end_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *`,
            [
                data.userId,
                data.orgId || null,
                data.product,
                data.status,
                data.source,
                data.externalCustomerId || null,
                data.externalSubscriptionId || null,
                data.externalOrderId,
                data.externalCustomerEmail || null,
                data.startAt || new Date(),
                data.endAt || null
            ]
        );
        return this.mapRow(result.rows[0]);
    }

    /**
     * Link entitlement to user (for identity linking)
     */
    async linkToUser(entitlementId: string, userId: string): Promise<void> {
        await this.pool.query(
            `UPDATE entitlements SET user_id = $1, updated_at = NOW() WHERE id = $2`,
            [userId, entitlementId]
        );
    }

    /**
     * Admin manual override
     */
    async adminOverride(
        entitlementId: string,
        newStatus: EntitlementStatus,
        adminUserId: string,
        notes: string
    ): Promise<Entitlement> {
        const result = await this.pool.query<any>(
            `UPDATE entitlements SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
            [newStatus, entitlementId]
        );

        // Log the override
        await this.auditLog({
            entitlementId,
            action: 'manual_override',
            triggeredBy: 'admin',
            triggeredByUserId: adminUserId,
            newStatus,
            metadata: { notes }
        });

        return this.mapRow(result.rows[0]);
    }

    // ========================================================================
    // AUDIT LOGGING
    // ========================================================================

    async auditLog(entry: EntitlementAuditEntry): Promise<void> {
        await this.pool.query(
            `INSERT INTO entitlement_audit_log 
                (entitlement_id, action, triggered_by, triggered_by_user_id, 
                 previous_status, new_status, webhook_payload_id, external_order_id, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                entry.entitlementId,
                entry.action,
                entry.triggeredBy,
                entry.triggeredByUserId || null,
                entry.previousStatus || null,
                entry.newStatus || null,
                entry.webhookPayloadId || null,
                entry.externalOrderId || null,
                entry.metadata ? JSON.stringify(entry.metadata) : null
            ]
        );
    }

    // ========================================================================
    // PENDING ENTITLEMENTS (identity linking failures)
    // ========================================================================

    async createPending(data: {
        product: Product;
        externalCustomerEmail: string;
        externalCustomerId?: string;
        externalOrderId: string;
        externalSubscriptionId?: string;
    }): Promise<PendingEntitlement> {
        const result = await this.pool.query<any>(
            `INSERT INTO pending_entitlements 
                (product, external_customer_email, external_customer_id, external_order_id, external_subscription_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *`,
            [
                data.product,
                data.externalCustomerEmail,
                data.externalCustomerId || null,
                data.externalOrderId,
                data.externalSubscriptionId || null
            ]
        );
        return this.mapPendingRow(result.rows[0]);
    }

    async getPendingByEmail(email: string): Promise<PendingEntitlement[]> {
        const result = await this.pool.query<any>(
            `SELECT * FROM pending_entitlements WHERE LOWER(external_customer_email) = LOWER($1) AND status = 'pending'`,
            [email]
        );
        return result.rows.map(this.mapPendingRow);
    }

    async resolvePending(pendingId: string, status: 'linked' | 'expired' | 'manual', notes?: string): Promise<void> {
        await this.pool.query(
            `UPDATE pending_entitlements SET status = $1, resolution_notes = $2, resolved_at = NOW() WHERE id = $3`,
            [status, notes || null, pendingId]
        );
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    private mapRow(row: any): Entitlement {
        return {
            id: row.id,
            userId: row.user_id,
            orgId: row.org_id,
            product: row.product,
            status: row.status,
            scope: row.scope || 'user',
            billingPeriod: row.billing_period || 'monthly',
            seriesAddonsCount: row.series_addons_count || 0,
            startAt: row.start_at,
            endAt: row.end_at,
            renewedAt: row.renewed_at,
            canceledAt: row.canceled_at,
            source: row.source,
            externalCustomerId: row.external_customer_id,
            externalSubscriptionId: row.external_subscription_id,
            externalOrderId: row.external_order_id,
            externalCustomerEmail: row.external_customer_email,
            externalEventId: row.external_event_id,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }

    private mapPendingRow(row: any): PendingEntitlement {
        return {
            id: row.id,
            product: row.product,
            externalCustomerEmail: row.external_customer_email,
            externalCustomerId: row.external_customer_id,
            externalOrderId: row.external_order_id,
            externalSubscriptionId: row.external_subscription_id,
            status: row.status,
            attemptedUserId: row.attempted_user_id,
            resolutionNotes: row.resolution_notes,
            createdAt: row.created_at,
            resolvedAt: row.resolved_at
        };
    }
}

// Singleton
let repository: EntitlementRepository | null = null;

export function getEntitlementRepository(): EntitlementRepository {
    if (!repository) {
        repository = new EntitlementRepository();
    }
    return repository;
}
