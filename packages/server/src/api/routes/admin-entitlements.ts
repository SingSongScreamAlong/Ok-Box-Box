/**
 * Admin Entitlements API
 * 
 * Admin-only endpoints for manual entitlement management.
 * Used for alpha testing, demos, and early league onboarding
 * BEFORE Squarespace billing goes live.
 * 
 * All grants use source="manual_admin" to distinguish from
 * paid Squarespace entitlements.
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { pool } from '../../db/client.js';
import {
    getEntitlementRepository,
    Product
} from '../../services/billing/entitlement-service.js';

const router = Router();

// ============================================================================
// MIDDLEWARE: Require Admin
// ============================================================================

async function requireAdmin(req: Request, res: Response, next: Function): Promise<void> {
    const user = req.user;
    if (!user?.isSuperAdmin) {
        res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Admin access required' }
        });
        return;
    }
    next();
}

// ============================================================================
// TYPES
// ============================================================================

interface GrantRequest {
    userId?: string;
    orgId?: string;
    userEmail?: string;  // Alternative to userId - lookup by email
    product: Product;
    notes?: string;
}

interface RevokeRequest {
    entitlementId: string;
    reason?: string;
}

// ============================================================================
// ENDPOINTS
// ============================================================================

/**
 * GET /api/admin/entitlements
 * List all manual entitlements (admin view)
 */
router.get('/entitlements', requireAuth, requireAdmin, async (_req: Request, res: Response): Promise<void> => {
    try {
        const result = await pool.query(`
            SELECT 
                e.*,
                u.email as user_email,
                u.display_name as user_display_name
            FROM entitlements e
            LEFT JOIN users u ON e.user_id = u.id
            WHERE e.source = 'manual_admin'
            ORDER BY e.created_at DESC
            LIMIT 100
        `);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('List entitlements error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'FETCH_ERROR', message: 'Failed to list entitlements' }
        });
    }
});

/**
 * GET /api/admin/entitlements/pending
 * List pending entitlements (unlinked purchases - for future use)
 */
router.get('/entitlements/pending', requireAuth, requireAdmin, async (_req: Request, res: Response): Promise<void> => {
    try {
        const result = await pool.query(`
            SELECT * FROM pending_entitlements
            WHERE status = 'pending'
            ORDER BY created_at DESC
            LIMIT 100
        `);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('List pending entitlements error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'FETCH_ERROR', message: 'Failed to list pending entitlements' }
        });
    }
});

/**
 * POST /api/admin/entitlements/grant
 * Grant manual entitlement to user or org
 */
router.post('/entitlements/grant', requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
        const adminUser = req.user!;
        const body = req.body as GrantRequest;

        // Validate product
        if (!['blackbox', 'controlbox', 'bundle'].includes(body.product)) {
            res.status(400).json({
                success: false,
                error: { code: 'INVALID_PRODUCT', message: 'Product must be blackbox, controlbox, or bundle' }
            });
            return;
        }

        // Resolve userId from email if needed
        let userId = body.userId;
        if (!userId && body.userEmail) {
            const userResult = await pool.query(
                'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
                [body.userEmail]
            );
            if (userResult.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    error: { code: 'USER_NOT_FOUND', message: `No user found with email: ${body.userEmail}` }
                });
                return;
            }
            userId = userResult.rows[0].id;
        }

        // Must have userId or orgId
        if (!userId && !body.orgId) {
            res.status(400).json({
                success: false,
                error: { code: 'MISSING_TARGET', message: 'Must provide userId, userEmail, or orgId' }
            });
            return;
        }

        const repo = getEntitlementRepository();

        // Check for existing active entitlement
        if (userId) {
            const existing = await pool.query(`
                SELECT id FROM entitlements 
                WHERE user_id = $1 AND product = $2 AND status = 'active'
            `, [userId, body.product]);

            if (existing.rows.length > 0) {
                res.status(409).json({
                    success: false,
                    error: { code: 'ALREADY_GRANTED', message: 'User already has active entitlement for this product' }
                });
                return;
            }
        }

        // Create entitlement with manual_admin source
        const orderId = `manual-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

        const entitlement = await repo.upsertFromExternal({
            userId: userId || null,
            orgId: body.orgId,
            product: body.product,
            status: 'active',
            source: 'manual' as any, // Cast to avoid type issues - DB accepts this
            externalOrderId: orderId
        });

        // Update source to manual_admin (upsertFromExternal uses 'squarespace' default)
        await pool.query(
            "UPDATE entitlements SET source = 'manual_admin' WHERE id = $1",
            [entitlement.id]
        );

        // Audit log
        await repo.auditLog({
            entitlementId: entitlement.id,
            action: 'manual_grant',
            triggeredBy: 'admin',
            triggeredByUserId: adminUser.id,
            newStatus: 'active',
            metadata: {
                product: body.product,
                notes: body.notes,
                grantedBy: adminUser.email
            }
        });

        console.log(`✅ Admin ${adminUser.email} granted ${body.product} to user ${userId || body.orgId}`);

        res.json({
            success: true,
            data: {
                ...entitlement,
                source: 'manual_admin'
            }
        });
    } catch (error) {
        console.error('Grant entitlement error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'GRANT_ERROR', message: 'Failed to grant entitlement' }
        });
    }
});

/**
 * POST /api/admin/entitlements/revoke
 * Revoke an entitlement
 */
router.post('/entitlements/revoke', requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
        const adminUser = req.user!;
        const body = req.body as RevokeRequest;

        if (!body.entitlementId) {
            res.status(400).json({
                success: false,
                error: { code: 'MISSING_ID', message: 'entitlementId is required' }
            });
            return;
        }

        const repo = getEntitlementRepository();

        // Get current entitlement
        const current = await pool.query(
            'SELECT * FROM entitlements WHERE id = $1',
            [body.entitlementId]
        );

        if (current.rows.length === 0) {
            res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Entitlement not found' }
            });
            return;
        }

        const previousStatus = current.rows[0].status;

        // Update to canceled
        await pool.query(
            "UPDATE entitlements SET status = 'canceled', canceled_at = NOW(), updated_at = NOW() WHERE id = $1",
            [body.entitlementId]
        );

        // Audit log
        await repo.auditLog({
            entitlementId: body.entitlementId,
            action: 'manual_revoke',
            triggeredBy: 'admin',
            triggeredByUserId: adminUser.id,
            previousStatus,
            newStatus: 'canceled',
            metadata: {
                reason: body.reason,
                revokedBy: adminUser.email
            }
        });

        console.log(`⚠️ Admin ${adminUser.email} revoked entitlement ${body.entitlementId}`);

        res.json({
            success: true,
            data: { id: body.entitlementId, status: 'canceled' }
        });
    } catch (error) {
        console.error('Revoke entitlement error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'REVOKE_ERROR', message: 'Failed to revoke entitlement' }
        });
    }
});

/**
 * GET /api/admin/entitlements/user/:userId
 * Get all entitlements for a specific user (admin view)
 */
router.get('/entitlements/user/:userId', requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;

        const result = await pool.query(`
            SELECT e.*, u.email as user_email
            FROM entitlements e
            LEFT JOIN users u ON e.user_id = u.id
            WHERE e.user_id = $1
            ORDER BY e.created_at DESC
        `, [userId]);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Get user entitlements error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'FETCH_ERROR', message: 'Failed to get user entitlements' }
        });
    }
});

/**
 * GET /api/admin/audit-log
 * Get recent entitlement audit log entries
 */
router.get('/audit-log', requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

        const result = await pool.query(`
            SELECT 
                l.*,
                u.email as admin_email
            FROM entitlement_audit_log l
            LEFT JOIN users u ON l.triggered_by_user_id = u.id
            ORDER BY l.created_at DESC
            LIMIT $1
        `, [limit]);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Get audit log error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'FETCH_ERROR', message: 'Failed to get audit log' }
        });
    }
});

export default router;
