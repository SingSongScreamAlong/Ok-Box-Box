// =====================================================================
// iRacing OAuth Callback Route
// Handles the redirect from iRacing after authorization
// =====================================================================

import { Router, Request, Response } from 'express';
import { getIRacingOAuthService, getIRacingProfileSyncService } from '../../../services/iracing-oauth/index.js';
import { getGoalGeneratorService } from '../../../services/driver-development/goal-generator.js';
import { pool } from '../../../db/client.js';

const router = Router();

// =====================================================================
// Post-Link Actions
// =====================================================================
// After successful iRacing account link, we:
// 1. Sync the iRacing profile (iRating, SR, license, etc.)
// 2. Generate AI-recommended goals based on the profile data
// 3. Create/update the driver_profile if needed

async function triggerPostLinkActions(userId: string, iracingCustomerId: string): Promise<void> {
    console.log(`[OAuth iRacing] Starting post-link actions for user ${userId}, iRacing ${iracingCustomerId}`);

    try {
        // 1. Sync iRacing profile to get current stats
        const syncService = getIRacingProfileSyncService();
        const profile = await syncService.syncProfile(userId);

        if (!profile) {
            console.warn(`[OAuth iRacing] Profile sync failed for user ${userId}`);
            return;
        }

        console.log(`[OAuth iRacing] Profile synced: ${profile.displayName}, Road iR: ${profile.iratingRoad}`);

        // 2. Ensure driver_profile exists for this user
        let driverProfileId: string | null = null;

        const existingProfile = await pool.query(
            `SELECT id FROM driver_profiles WHERE user_account_id = $1`,
            [userId]
        );

        if (existingProfile.rows.length > 0) {
            driverProfileId = existingProfile.rows[0].id;
        } else {
            // Create a new driver profile
            const newProfile = await pool.query(
                `INSERT INTO driver_profiles (user_account_id, display_name, primary_discipline)
                 VALUES ($1, $2, $3)
                 RETURNING id`,
                [userId, profile.displayName || 'Driver', 'road']
            );
            driverProfileId = newProfile.rows[0].id;
            console.log(`[OAuth iRacing] Created driver_profile ${driverProfileId} for user ${userId}`);
        }

        // 3. Link the iRacing identity to the driver profile
        await pool.query(
            `INSERT INTO linked_racing_identities (driver_profile_id, platform, platform_user_id, platform_display_name, verified_at, verification_method)
             VALUES ($1, 'iracing', $2, $3, NOW(), 'oauth')
             ON CONFLICT (platform, platform_user_id) DO UPDATE SET
                 driver_profile_id = EXCLUDED.driver_profile_id,
                 platform_display_name = EXCLUDED.platform_display_name,
                 verified_at = NOW(),
                 updated_at = NOW()`,
            [driverProfileId, iracingCustomerId, profile.displayName]
        );

        // 4. Generate AI-recommended goals based on profile data
        if (driverProfileId) {
            const goalGenerator = getGoalGeneratorService();
            const goals = await goalGenerator.generateInitialGoals(driverProfileId, profile);
            console.log(`[OAuth iRacing] Generated ${goals.length} initial goals for driver ${driverProfileId}`);
        }

    } catch (error) {
        console.error('[OAuth iRacing] Post-link actions error:', error);
        // Don't throw - this is async and shouldn't block the user
    }
}

// =====================================================================
// GET /oauth/iracing/callback
// =====================================================================
// This route is called by iRacing after user authorization.
// It does NOT require authentication - the user's identity comes from
// the state parameter stored in Redis during flow initiation.
//
// The route is at /oauth/iracing/callback (not /api/...) to match
// the registered redirect URI exactly.

router.get('/callback', async (req: Request, res: Response) => {
    const { code, state, error, error_description } = req.query;

    // Handle user denial or error from iRacing
    if (error) {
        console.error('[OAuth iRacing] Authorization error:', error, error_description);
        res.redirect(`/settings?iracing_error=${encodeURIComponent(String(error))}`);
        return;
    }

    // Validate required params
    if (!code || !state) {
        res.redirect('/settings?iracing_error=missing_params');
        return;
    }

    try {
        const service = getIRacingOAuthService();

        const result = await service.handleCallback(
            String(code),
            String(state)
        );

        if (!result.success) {
            console.error('[OAuth iRacing] Callback failed:', result.error);
            res.redirect(`/settings?iracing_error=${encodeURIComponent(result.error || 'unknown')}`);
            return;
        }

        // Trigger async profile sync and goal generation (don't block redirect)
        triggerPostLinkActions(result.userId!, result.identity!.customerId).catch(err => {
            console.error('[OAuth iRacing] Post-link actions failed:', err);
        });

        // Success - redirect to settings with success message
        const displayName = result.identity?.displayName
            ? `&name=${encodeURIComponent(result.identity.displayName)}`
            : '';

        res.redirect(`/settings?iracing_linked=true${displayName}`);

    } catch (error) {
        console.error('[OAuth iRacing] Callback exception:', error);
        res.redirect('/settings?iracing_error=internal_error');
    }
});

export default router;
