/**
 * Driver Profile API Routes
 * RESTful endpoints for Individual Driver Profile system
 */

import { Router, Request, Response } from 'express';
import {
    createDriverProfile,
    getDriverProfileById,
    getDriverProfileByUserId,
    updateDriverProfile,
    getLinkedIdentities,
    linkRacingIdentity,
    verifyIdentity,
    unlinkIdentity,
    getActiveGrants,
    createAccessGrant,
    revokeGrant,
} from '../../db/repositories/driver-profile.repo.js';
import {
    requireOwner,
    allowPublic,
    filterByScope,
} from '../middleware/idp-access.js';
import { requireAuth } from '../middleware/auth.js';
import {
    DriverSummary,
    CreateDriverProfileDTO,
    UpdateDriverProfileDTO,
    LinkIdentityDTO,
    CreateAccessGrantDTO,
} from '../../types/idp.types.js';

const router = Router();

// ========================
// Profile CRUD
// ========================

/**
 * GET /api/v1/drivers/me
 * Get current user's driver profile (must be before /:id)
 */
router.get('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const profile = await getDriverProfileByUserId(req.user!.id);
        if (!profile) {
            res.status(404).json({ error: 'No driver profile found for current user' });
            return;
        }
        res.json(profile);
    } catch (error) {
        console.error('[IDP] Error fetching own profile:', error);
        res.status(500).json({ error: 'Failed to fetch driver profile' });
    }
});

/**
 * GET /api/v1/drivers/:id
 * Get driver profile (respects privacy settings)
 */
router.get('/:id', allowPublic, async (req: Request, res: Response): Promise<void> => {
    try {
        const profile = await getDriverProfileById(req.params.id);
        if (!profile) {
            res.status(404).json({ error: 'Driver profile not found' });
            return;
        }

        // Filter fields based on scope
        const fieldRules: Record<string, 'team_standard' | 'team_deep' | 'owner'> = {
            bio: 'team_standard',
            timezone: 'team_standard',
            total_incidents: 'team_standard',
        };

        const filtered = filterByScope(profile as object, req.idpContext?.scope || 'public', fieldRules);
        res.json(filtered);
    } catch (error) {
        console.error('[IDP] Error fetching profile:', error);
        res.status(500).json({ error: 'Failed to fetch driver profile' });
    }
});

/**
 * GET /api/v1/drivers/:id/summary
 * Get public-safe driver summary with headline stats
 */
router.get('/:id/summary', allowPublic, async (req: Request, res: Response): Promise<void> => {
    try {
        const profile = await getDriverProfileById(req.params.id);
        if (!profile) {
            res.status(404).json({ error: 'Driver profile not found' });
            return;
        }

        // TODO: Fetch aggregates for headline_stats
        const summary: DriverSummary = {
            id: profile.id,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            primary_discipline: profile.primary_discipline,
            headline_stats: {
                total_sessions: profile.total_sessions,
                total_laps: profile.total_laps,
                avg_pace_percentile: null, // TODO: from driver_aggregates
                consistency_index: null,
                risk_index: null,
            },
        };

        res.json(summary);
    } catch (error) {
        console.error('[IDP] Error fetching summary:', error);
        res.status(500).json({ error: 'Failed to fetch driver summary' });
    }
});

/**
 * POST /api/v1/drivers
 * Create a new driver profile (for authenticated user)
 */
router.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const dto: CreateDriverProfileDTO = req.body;

        if (!dto.display_name) {
            res.status(400).json({ error: 'display_name is required' });
            return;
        }

        // Check if user already has a profile
        const existing = await getDriverProfileByUserId(req.user!.id);
        if (existing) {
            res.status(409).json({
                error: 'User already has a driver profile',
                profile_id: existing.id
            });
            return;
        }

        const profile = await createDriverProfile(dto, req.user!.id);
        res.status(201).json(profile);
    } catch (error) {
        console.error('[IDP] Error creating profile:', error);
        res.status(500).json({ error: 'Failed to create driver profile' });
    }
});

/**
 * PATCH /api/v1/drivers/:id
 * Update driver profile (owner only)
 */
router.patch('/:id', requireOwner, async (req: Request, res: Response): Promise<void> => {
    try {
        const dto: UpdateDriverProfileDTO = req.body;
        const profile = await updateDriverProfile(req.params.id, dto);

        if (!profile) {
            res.status(404).json({ error: 'Driver profile not found' });
            return;
        }

        res.json(profile);
    } catch (error) {
        console.error('[IDP] Error updating profile:', error);
        res.status(500).json({ error: 'Failed to update driver profile' });
    }
});

// ========================
// Linked Identities
// ========================

/**
 * GET /api/v1/drivers/:id/identities
 * Get linked racing identities (owner only)
 */
router.get('/:id/identities', requireOwner, async (req: Request, res: Response): Promise<void> => {
    try {
        const identities = await getLinkedIdentities(req.params.id);
        res.json(identities);
    } catch (error) {
        console.error('[IDP] Error fetching identities:', error);
        res.status(500).json({ error: 'Failed to fetch linked identities' });
    }
});

/**
 * POST /api/v1/drivers/:id/identities/link
 * Link a new racing identity
 */
router.post('/:id/identities/link', requireOwner, async (req: Request, res: Response): Promise<void> => {
    try {
        const dto: LinkIdentityDTO = req.body;

        if (!dto.platform || !dto.platform_user_id || !dto.verification_method) {
            res.status(400).json({
                error: 'platform, platform_user_id, and verification_method are required'
            });
            return;
        }

        const identity = await linkRacingIdentity(req.params.id, dto);
        res.status(201).json(identity);
    } catch (error) {
        console.error('[IDP] Error linking identity:', error);
        res.status(500).json({ error: 'Failed to link racing identity' });
    }
});

/**
 * POST /api/v1/drivers/:id/identities/:identityId/verify
 * Mark an identity as verified (internal/manual verification)
 */
router.post('/:id/identities/:identityId/verify', requireOwner, async (req: Request, res: Response): Promise<void> => {
    try {
        const identity = await verifyIdentity(req.params.identityId);
        if (!identity) {
            res.status(404).json({ error: 'Identity not found' });
            return;
        }
        res.json(identity);
    } catch (error) {
        console.error('[IDP] Error verifying identity:', error);
        res.status(500).json({ error: 'Failed to verify identity' });
    }
});

/**
 * DELETE /api/v1/drivers/:id/identities/:identityId
 * Unlink a racing identity
 */
router.delete('/:id/identities/:identityId', requireOwner, async (req: Request, res: Response): Promise<void> => {
    try {
        const success = await unlinkIdentity(req.params.identityId);
        if (!success) {
            res.status(404).json({ error: 'Identity not found' });
            return;
        }
        res.status(204).send();
    } catch (error) {
        console.error('[IDP] Error unlinking identity:', error);
        res.status(500).json({ error: 'Failed to unlink identity' });
    }
});

// ========================
// Access Grants
// ========================

/**
 * GET /api/v1/drivers/:id/access-grants
 * List active access grants (owner only)
 */
router.get('/:id/access-grants', requireOwner, async (req: Request, res: Response): Promise<void> => {
    try {
        const grants = await getActiveGrants(req.params.id);
        res.json(grants);
    } catch (error) {
        console.error('[IDP] Error fetching grants:', error);
        res.status(500).json({ error: 'Failed to fetch access grants' });
    }
});

/**
 * POST /api/v1/drivers/:id/access-grants
 * Create a new access grant
 */
router.post('/:id/access-grants', requireOwner, async (req: Request, res: Response): Promise<void> => {
    try {
        const dto: CreateAccessGrantDTO = req.body;

        if (!dto.grantee_type || !dto.grantee_id || !dto.scope) {
            res.status(400).json({
                error: 'grantee_type, grantee_id, and scope are required'
            });
            return;
        }

        const grant = await createAccessGrant(req.params.id, dto, req.idpContext?.driverProfileId);
        res.status(201).json(grant);
    } catch (error) {
        console.error('[IDP] Error creating grant:', error);
        res.status(500).json({ error: 'Failed to create access grant' });
    }
});

/**
 * DELETE /api/v1/drivers/:id/access-grants/:grantId
 * Revoke an access grant
 */
router.delete('/:id/access-grants/:grantId', requireOwner, async (req: Request, res: Response): Promise<void> => {
    try {
        const success = await revokeGrant(req.params.grantId);
        if (!success) {
            res.status(404).json({ error: 'Grant not found or already revoked' });
            return;
        }
        res.status(204).send();
    } catch (error) {
        console.error('[IDP] Error revoking grant:', error);
        res.status(500).json({ error: 'Failed to revoke access grant' });
    }
});

export default router;
