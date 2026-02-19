// =====================================================================
// iRacing OAuth Routes
// Express routes for iRacing OAuth integration
// =====================================================================

import { Router, Request, Response } from 'express';
import { getIRacingOAuthService, getIRacingProfileSyncService } from '../../../services/iracing-oauth/index.js';
import { requireAuth } from '../../middleware/auth.js';
import { getGoalGeneratorService } from '../../../services/driver-development/goal-generator.js';
import { pool } from '../../../db/client.js';

const router = Router();

// =====================================================================
// GET /api/oauth/iracing/start
// =====================================================================
// Initiates the OAuth flow for an authenticated user
// Redirects to iRacing authorization page

router.get('/start', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const service = getIRacingOAuthService();

        const { authorizationUrl } = await service.startOAuthFlow(userId);

        // Redirect user to iRacing
        res.redirect(authorizationUrl);

    } catch (error) {
        console.error('[OAuth iRacing] Start error:', error);
        res.status(500).json({
            error: 'Failed to initiate OAuth flow',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// =====================================================================
// GET /api/oauth/iracing/status
// =====================================================================
// Check if the authenticated user has a linked iRacing account

router.get('/status', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const service = getIRacingOAuthService();

        const linkedAccount = await service.getLinkedAccount(userId);

        if (!linkedAccount) {
            res.json({ linked: false });
            return;
        }

        res.json({
            linked: true,
            isValid: linkedAccount.isValid,
            iracingCustomerId: linkedAccount.iracingCustomerId,
            iracingDisplayName: linkedAccount.iracingDisplayName,
            linkedAt: linkedAccount.linkedAt,
            lastUsedAt: linkedAccount.lastUsedAt
        });

    } catch (error) {
        console.error('[OAuth iRacing] Status error:', error);
        res.status(500).json({ error: 'Failed to check iRacing link status' });
    }
});

// =====================================================================
// POST /api/oauth/iracing/revoke
// =====================================================================
// Unlink the user's iRacing account

router.post('/revoke', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const service = getIRacingOAuthService();

        await service.revokeTokens(userId);

        res.json({ success: true, message: 'iRacing account unlinked' });

    } catch (error) {
        console.error('[OAuth iRacing] Revoke error:', error);
        res.status(500).json({ error: 'Failed to unlink iRacing account' });
    }
});

// =====================================================================
// GET /api/oauth/iracing/profile
// =====================================================================
// Get the user's synced iRacing profile data (iRating, SR, license, etc.)

router.get('/profile', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const syncService = getIRacingProfileSyncService();

        const profile = await syncService.getProfile(userId);

        if (!profile) {
            res.status(404).json({
                error: 'No profile found',
                message: 'iRacing account not linked or profile not yet synced'
            });
            return;
        }

        // Return profile data for dashboard display
        res.json({
            iracingCustomerId: profile.iracingCustomerId,
            displayName: profile.displayName,
            firstName: profile.firstName,
            lastName: profile.lastName,

            // Ratings
            ratings: {
                oval: profile.iratingOval,
                road: profile.iratingRoad,
                dirtOval: profile.iratingDirtOval,
                dirtRoad: profile.iratingDirtRoad
            },

            // Safety Ratings (convert from stored integers)
            safetyRatings: {
                oval: profile.srOval ? (profile.srOval / 100).toFixed(2) : null,
                road: profile.srRoad ? (profile.srRoad / 100).toFixed(2) : null,
                dirtOval: profile.srDirtOval ? (profile.srDirtOval / 100).toFixed(2) : null,
                dirtRoad: profile.srDirtRoad ? (profile.srDirtRoad / 100).toFixed(2) : null
            },

            // Licenses
            licenses: {
                oval: profile.licenseOval,
                road: profile.licenseRoad,
                dirtOval: profile.licenseDirtOval,
                dirtRoad: profile.licenseDirtRoad
            },

            // Account info
            memberSince: profile.memberSince,
            club: profile.clubName ? { id: profile.clubId, name: profile.clubName } : null,

            // Helmet
            helmet: profile.helmetPattern ? {
                pattern: profile.helmetPattern,
                colors: [profile.helmetColor1, profile.helmetColor2, profile.helmetColor3]
            } : null,

            lastSyncedAt: profile.lastSyncedAt
        });

    } catch (error) {
        console.error('[OAuth iRacing] Profile fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch iRacing profile' });
    }
});

// =====================================================================
// POST /api/oauth/iracing/sync
// =====================================================================
// Force refresh the user's iRacing profile data

router.post('/sync', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const syncService = getIRacingProfileSyncService();

        const profile = await syncService.syncProfile(userId);

        if (!profile) {
            res.status(400).json({
                error: 'Sync failed',
                message: 'No valid iRacing token found. Please re-link your account.'
            });
            return;
        }

        res.json({
            success: true,
            message: 'Profile synced successfully',
            lastSyncedAt: profile.lastSyncedAt
        });

    } catch (error) {
        console.error('[OAuth iRacing] Sync error:', error);
        res.status(500).json({ error: 'Failed to sync iRacing profile' });
    }
});

// =====================================================================
// GET /api/oauth/iracing/exchange
// =====================================================================
// SPA-friendly token exchange endpoint.
// The SPA catches the iRacing callback at /oauth/iracing/callback and
// forwards the code+state here (under /api/) for server-side processing.
// This avoids needing a DO routing rule for /oauth/iracing/callback.

async function triggerPostLinkActions(userId: string, iracingCustomerId: string, displayName: string | null): Promise<void> {
    console.log(`[OAuth iRacing] Starting post-link actions for user ${userId}, iRacing ${iracingCustomerId}, name: ${displayName}`);
    try {
        // 1. Always ensure driver_profile exists (don't depend on iRacing API)
        let driverProfileId: string | null = null;
        const existingProfile = await pool.query(
            `SELECT id FROM driver_profiles WHERE user_account_id = $1`, [userId]
        );
        if (existingProfile.rows.length > 0) {
            driverProfileId = existingProfile.rows[0].id;
            console.log(`[OAuth iRacing] Found existing driver_profile ${driverProfileId}`);
        } else {
            const newProfile = await pool.query(
                `INSERT INTO driver_profiles (user_account_id, display_name, primary_discipline)
                 VALUES ($1, $2, $3) RETURNING id`,
                [userId, displayName || 'Driver', 'road']
            );
            driverProfileId = newProfile.rows[0].id;
            console.log(`[OAuth iRacing] Created driver_profile ${driverProfileId} for user ${userId}`);
        }

        // 2. Link iRacing identity to driver profile
        if (iracingCustomerId && iracingCustomerId !== 'undefined') {
            await pool.query(
                `INSERT INTO linked_racing_identities (driver_profile_id, platform, platform_user_id, platform_display_name, verified_at, verification_method)
                 VALUES ($1, 'iracing', $2, $3, NOW(), 'oauth')
                 ON CONFLICT (platform, platform_user_id) DO UPDATE SET
                     driver_profile_id = EXCLUDED.driver_profile_id,
                     platform_display_name = EXCLUDED.platform_display_name,
                     verified_at = NOW(), updated_at = NOW()`,
                [driverProfileId, iracingCustomerId, displayName]
            );
            console.log(`[OAuth iRacing] Linked iRacing identity ${iracingCustomerId} to profile ${driverProfileId}`);
        }

        // 3. Try to sync iRacing profile (non-blocking, best-effort)
        try {
            const syncService = getIRacingProfileSyncService();
            const profile = await syncService.syncProfile(userId);
            if (profile) {
                console.log(`[OAuth iRacing] Profile synced: ${profile.displayName}, Road iR: ${profile.iratingRoad}`);
                // 4. Generate AI goals (best-effort)
                try {
                    const goalGenerator = getGoalGeneratorService();
                    const goals = await goalGenerator.generateInitialGoals(driverProfileId!, profile);
                    console.log(`[OAuth iRacing] Generated ${goals.length} initial goals`);
                } catch (goalErr) {
                    console.warn('[OAuth iRacing] Goal generation failed (non-critical):', goalErr);
                }
            } else {
                console.warn(`[OAuth iRacing] Profile sync returned null for user ${userId} (will retry later)`);
            }
        } catch (syncErr) {
            console.warn('[OAuth iRacing] Profile sync failed (non-critical):', syncErr);
        }
    } catch (error) {
        console.error('[OAuth iRacing] Post-link actions error:', error);
    }
}

// =====================================================================
// POST /api/oauth/iracing/repair
// =====================================================================
// Repairs missing data from a previous OAuth link:
// - Fetches iRacing identity if customer_id is NULL
// - Creates driver_profile if missing

router.post('/repair', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    console.log(`[OAuth iRacing] ===== REPAIR endpoint hit for user ${userId} =====`);

    try {
        // 1. Check if we have tokens
        const tokenRow = await pool.query(
            `SELECT iracing_customer_id, iracing_display_name, tokens_encrypted, encryption_iv, encryption_auth_tag
             FROM iracing_oauth_tokens WHERE admin_user_id = $1 AND is_valid = true`,
            [userId]
        );

        if (tokenRow.rows.length === 0) {
            res.json({ success: false, error: 'no_linked_account' });
            return;
        }

        const row = tokenRow.rows[0];
        let customerId = row.iracing_customer_id;
        let displayName = row.iracing_display_name;

        // 2. If customer_id is missing, try to fetch from iRacing member API
        if (!customerId) {
            console.log('[OAuth iRacing] Repair: customer_id is NULL, fetching from member API...');
            try {
                const service = getIRacingOAuthService();
                const accessToken = await service.getValidAccessToken(userId);
                if (accessToken) {
                    const memberRes = await fetch('https://members-ng.iracing.com/data/member/info', {
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                    });
                    if (memberRes.ok) {
                        const memberData = await memberRes.json() as any;
                        customerId = String(memberData.cust_id);
                        displayName = memberData.display_name || displayName;
                        console.log(`[OAuth iRacing] Repair: got customer_id=${customerId}, name=${displayName}`);

                        // Update the token row
                        await pool.query(
                            `UPDATE iracing_oauth_tokens SET iracing_customer_id = $1, iracing_display_name = $2, updated_at = NOW()
                             WHERE admin_user_id = $3`,
                            [customerId, displayName, userId]
                        );
                    } else {
                        console.error('[OAuth iRacing] Repair: member API returned', memberRes.status);
                    }
                }
            } catch (fetchErr) {
                console.error('[OAuth iRacing] Repair: failed to fetch member info:', fetchErr);
            }
        }

        // 3. Ensure driver_profile exists
        let driverProfileId: string | null = null;
        const existing = await pool.query(
            `SELECT id FROM driver_profiles WHERE user_account_id = $1`, [userId]
        );
        if (existing.rows.length > 0) {
            driverProfileId = existing.rows[0].id;
        } else {
            const newProfile = await pool.query(
                `INSERT INTO driver_profiles (user_account_id, display_name, primary_discipline)
                 VALUES ($1, $2, $3) RETURNING id`,
                [userId, displayName || 'Driver', 'road']
            );
            driverProfileId = newProfile.rows[0].id;
            console.log(`[OAuth iRacing] Repair: created driver_profile ${driverProfileId}`);
        }

        // 4. Link identity if we have a customer_id
        if (customerId && driverProfileId) {
            await pool.query(
                `INSERT INTO linked_racing_identities (driver_profile_id, platform, platform_user_id, platform_display_name, verified_at, verification_method)
                 VALUES ($1, 'iracing', $2, $3, NOW(), 'oauth')
                 ON CONFLICT (platform, platform_user_id) DO UPDATE SET
                     driver_profile_id = EXCLUDED.driver_profile_id,
                     platform_display_name = EXCLUDED.platform_display_name,
                     verified_at = NOW(), updated_at = NOW()`,
                [driverProfileId, customerId, displayName]
            );
        }

        res.json({
            success: true,
            repaired: true,
            customerId,
            displayName,
            driverProfileId
        });
    } catch (error) {
        console.error('[OAuth iRacing] Repair error:', error);
        res.status(500).json({ success: false, error: 'repair_failed' });
    }
});

router.get('/exchange', async (req: Request, res: Response) => {
    const { code, state } = req.query;

    console.log('[OAuth iRacing] ===== EXCHANGE endpoint hit =====');

    if (!code || !state) {
        res.json({ success: false, error: 'missing_params' });
        return;
    }

    try {
        const service = getIRacingOAuthService();
        const result = await service.handleCallback(String(code), String(state));

        console.log('[OAuth iRacing] handleCallback result:', JSON.stringify({
            success: result.success, error: result.error,
            userId: result.userId, hasIdentity: !!result.identity,
            customerId: result.identity?.customerId,
            displayName: result.identity?.displayName
        }));

        if (!result.success) {
            res.json({ success: false, error: result.error || 'exchange_failed' });
            return;
        }

        // Trigger async post-link actions
        triggerPostLinkActions(result.userId!, result.identity!.customerId, result.identity?.displayName || null).catch(err => {
            console.error('[OAuth iRacing] Post-link actions failed:', err);
        });

        res.json({
            success: true,
            displayName: result.identity?.displayName || null
        });

    } catch (error) {
        console.error('[OAuth iRacing] Exchange exception:', error);
        res.json({ success: false, error: 'internal_error' });
    }
});

export default router;
