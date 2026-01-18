// =====================================================================
// iRacing OAuth Routes
// Express routes for iRacing OAuth integration
// =====================================================================

import { Router, Request, Response } from 'express';
import { getIRacingOAuthService, getIRacingProfileSyncService } from '../../../services/iracing-oauth/index.js';
import { requireAuth } from '../../middleware/auth.js';

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

export default router;
