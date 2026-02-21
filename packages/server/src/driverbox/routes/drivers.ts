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
import { pool } from '../../db/client.js';
import { backfillDriverHistory } from '../services/idp/iracing-sync.service.js';
import { getIRacingProfileSyncService } from '../../services/iracing-oauth/profile-sync-service.js';
import { getMetricsForDriver } from '../../db/repositories/session-metrics.repo.js';
import { getAllAggregatesForDriver, getGlobalAggregate } from '../../db/repositories/driver-aggregates.repo.js';
import { getCurrentTraits } from '../../db/repositories/driver-traits.repo.js';
import { getReportsForDriver } from '../../db/repositories/driver-reports.repo.js';
import { chatCompletion, isLLMConfigured } from '../../services/ai/llm-service.js';
import {
    requireOwner,
    requireTeamStandard,
    allowPublic,
    filterByScope,
} from '../../api/middleware/idp-access.js';
import { requireAuth } from '../../api/middleware/auth.js';
import {
    DriverSummary,
    CreateDriverProfileDTO,
    UpdateDriverProfileDTO,
    LinkIdentityDTO,
    CreateAccessGrantDTO,
} from '../types/idp.types.js';

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
        let profile = await getDriverProfileByUserId(req.user!.id);
        if (!profile) {
            // Auto-create driver profile for authenticated users
            const displayName = req.user!.displayName || req.user!.email?.split('@')[0] || 'Driver';
            console.log(`[IDP] Auto-creating driver profile for user ${req.user!.id} (${displayName})`);
            profile = await createDriverProfile(
                { display_name: displayName, primary_discipline: 'road' },
                req.user!.id
            );
        }

        // Enrich with iRacing profile data if available
        const iracingResult = await pool.query(
            `SELECT * FROM iracing_profiles WHERE admin_user_id = $1`,
            [req.user!.id]
        );

        const enriched: any = { ...profile };

        if (iracingResult.rows.length > 0) {
            const ir = iracingResult.rows[0];

            enriched.iracing_cust_id = parseInt(ir.iracing_customer_id) || null;
            enriched.member_since = ir.member_since;

            // Build licenses array from per-discipline data
            const licenses: any[] = [];
            const disciplines = [
                { key: 'oval', id: 1, irating: ir.irating_oval, sr: ir.sr_oval, license: ir.license_oval },
                { key: 'sportsCar', id: 2, irating: ir.irating_road, sr: ir.sr_road, license: ir.license_road },
                { key: 'dirtOval', id: 3, irating: ir.irating_dirt_oval, sr: ir.sr_dirt_oval, license: ir.license_dirt_oval },
                { key: 'dirtRoad', id: 4, irating: ir.irating_dirt_road, sr: ir.sr_dirt_road, license: ir.license_dirt_road },
            ];

            for (const d of disciplines) {
                if (d.license || d.irating || d.sr) {
                    licenses.push({
                        discipline: d.key,
                        licenseClass: d.license || 'R',
                        safetyRating: d.sr ? d.sr / 100 : 0,
                        iRating: d.irating || null,
                    });
                }
            }

            enriched.licenses = licenses;

            // Overall = best/primary discipline (road first, then highest iRating)
            const roadLicense = disciplines.find(d => d.key === 'sportsCar');
            const bestByIrating = disciplines
                .filter(d => d.irating)
                .sort((a, b) => (b.irating || 0) - (a.irating || 0))[0];
            const primary = roadLicense?.irating ? roadLicense : bestByIrating;

            enriched.irating_overall = primary?.irating || null;
            enriched.safety_rating_overall = primary?.sr ? primary.sr / 100 : null;
        } else {
            enriched.licenses = [];
            enriched.irating_overall = null;
            enriched.safety_rating_overall = null;
        }

        res.json(enriched);
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
 * GET /api/v1/drivers/me/sessions
 * Get iRacing race results for the current user
 */
router.get('/me/sessions', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        const syncService = getIRacingProfileSyncService();
        const results = await syncService.getRaceResults(req.user!.id, limit, offset);
        const count = await syncService.getRaceResultsCount(req.user!.id);

        // Map DB rows to frontend-expected format
        const sessions = results.map((r: any) => {
            // Map license_category to discipline
            const catMap: Record<string, string> = { 'oval': 'oval', 'road': 'sportsCar', 'dirt_oval': 'dirtOval', 'dirt_road': 'dirtRoad' };
            return {
                session_id: String(r.subsession_id),
                started_at: r.session_start_time,
                track_name: r.track_name || '',
                track_config: r.track_config || '',
                series_name: r.series_name || '',
                discipline: catMap[r.license_category] || 'sportsCar',
                start_pos: r.start_position,
                finish_pos: r.finish_position,
                finish_pos_class: r.finish_position_in_class,
                incidents: r.incidents,
                laps_complete: r.laps_complete,
                laps_lead: r.laps_lead,
                irating_change: r.irating_change,
                new_irating: r.newi_rating,
                old_irating: r.oldi_rating,
                new_sub_level: r.new_sub_level,
                old_sub_level: r.old_sub_level,
                strength_of_field: r.strength_of_field,
                field_size: r.field_size,
                car_name: r.car_name || '',
                event_type: r.event_type || 'race',
            };
        });

        res.json({
            count,
            limit,
            offset,
            sessions,
        });
    } catch (error) {
        console.error('[IDP] Error fetching iRacing sessions:', error);
        res.status(500).json({ error: 'Failed to fetch session history' });
    }
});

/**
 * GET /api/v1/drivers/me/stats
 * Get aggregate stats — prefers lifetime career stats from iRacing /data/stats/member_career,
 * falls back to computing from stored race results (limited to sync window).
 */
router.get('/me/stats', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const syncService = getIRacingProfileSyncService();

        // Try career stats first (accurate lifetime data from iRacing API)
        const careerStats = await syncService.getCareerStats(req.user!.id);
        if (careerStats && careerStats.length > 0) {
            // iRacing career stats use category names like "oval", "road", "dirt_oval", "dirt_road"
            // Field names from iRacing: starts, wins, top5, poles, avgStart, avgFinish, avgIncPerRace, lapsLed, totalLaps, category
            const catMap: Record<string, string> = { 'oval': 'oval', 'road': 'sportsCar', 'dirt_oval': 'dirtOval', 'dirt_road': 'dirtRoad' };
            const disciplines = careerStats.map((s: any) => ({
                discipline: catMap[s.category] || s.category || 'sportsCar',
                starts: s.starts || 0,
                wins: s.wins || 0,
                podiums: 0, // Not provided by career endpoint
                top5s: s.top5 || 0,
                poles: s.poles || 0,
                avgStart: s.avgStart || 0,
                avgFinish: s.avgFinish || 0,
                avgIncidents: s.avgIncPerRace || 0,
                totalLaps: s.totalLaps || 0,
                totalLapsLed: s.lapsLed || 0,
                avgSof: 0,
                peakIrating: 0,
                source: 'career',
            }));
            res.json({ disciplines });
            return;
        }

        // Fallback: compute from stored race results (limited to sync window)
        const stats = await syncService.getAggregateStats(req.user!.id);
        const catMap: Record<string, string> = { 'oval': 'oval', 'road': 'sportsCar', 'dirt_oval': 'dirtOval', 'dirt_road': 'dirtRoad' };
        const disciplines = stats.map((s: any) => ({
            discipline: catMap[s.license_category] || s.license_category || 'sportsCar',
            starts: parseInt(s.total_races) || 0,
            wins: parseInt(s.wins) || 0,
            podiums: parseInt(s.podiums) || 0,
            top5s: parseInt(s.top5s) || 0,
            poles: parseInt(s.poles) || 0,
            avgStart: parseFloat(s.avg_start) || 0,
            avgFinish: parseFloat(s.avg_finish) || 0,
            avgIncidents: parseFloat(s.avg_incidents) || 0,
            totalLaps: parseInt(s.total_laps) || 0,
            totalLapsLed: parseInt(s.total_laps_led) || 0,
            avgSof: parseInt(s.avg_sof) || 0,
            peakIrating: parseInt(s.peak_irating) || 0,
            source: 'aggregate',
        }));

        res.json({ disciplines });
    } catch (error) {
        console.error('[IDP] Error fetching iRacing stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

/**
 * GET /api/v1/drivers/me/performance-snapshot
 * Returns aggregated performance from last N sessions, or null if insufficient data.
 * Query params: min_sessions (default 3)
 */
router.get('/me/performance-snapshot', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const minSessions = parseInt(req.query.min_sessions as string) || 3;
        const windowSize = 5;

        const result = await pool.query(
            `SELECT
                finish_position, start_position, incidents, irating_change,
                newi_rating, strength_of_field, laps_complete, session_start_time,
                track_name, series_name, car_name, event_type, license_category
             FROM iracing_race_results
             WHERE admin_user_id = $1 AND finish_position IS NOT NULL
             ORDER BY session_start_time DESC NULLS LAST
             LIMIT $2`,
            [req.user!.id, windowSize]
        );

        if (result.rows.length < minSessions) {
            res.json(null);
            return;
        }

        const rows = result.rows;
        const avgFinish = rows.reduce((s, r) => s + (r.finish_position || 0), 0) / rows.length;
        const avgStart = rows.reduce((s, r) => s + (r.start_position || 0), 0) / rows.length;
        const avgIncidents = rows.reduce((s, r) => s + (r.incidents || 0), 0) / rows.length;
        const totalIRatingDelta = rows.reduce((s, r) => s + (r.irating_change || 0), 0);
        const latestIRating = rows[0]?.newi_rating || null;

        res.json({
            session_count: rows.length,
            avg_finish: Math.round(avgFinish * 10) / 10,
            avg_start: Math.round(avgStart * 10) / 10,
            avg_incidents: Math.round(avgIncidents * 10) / 10,
            irating_delta: totalIRatingDelta,
            latest_irating: latestIRating,
            sessions: rows.map(r => ({
                finish_position: r.finish_position,
                start_position: r.start_position,
                incidents: r.incidents,
                irating_change: r.irating_change,
                track_name: r.track_name,
                series_name: r.series_name,
                car_name: r.car_name,
                session_start_time: r.session_start_time,
            })),
        });
    } catch (error) {
        console.error('[IDP] Error fetching performance snapshot:', error);
        res.status(500).json({ error: 'Failed to fetch performance snapshot' });
    }
});

/**
 * GET /api/v1/drivers/me/crew-brief
 * Returns crew analysis brief if post-session analysis exists, otherwise null.
 * Currently no analysis pipeline exists, so this always returns null.
 */
router.get('/me/crew-brief', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        // Check if any driver reports exist for this user
        const profile = await getDriverProfileByUserId(req.user!.id);
        if (!profile) {
            res.json(null);
            return;
        }

        const reports = await getReportsForDriver(profile.id, {
            status: 'published',
            limit: 3,
        });

        if (!reports || reports.length === 0) {
            res.json(null);
            return;
        }

        // Return the most recent reports as crew briefs
        res.json({
            briefs: reports.map(r => ({
                id: r.id,
                type: r.report_type,
                title: r.title,
                session_id: r.session_id,
                content: r.content_json,
                created_at: r.created_at,
            })),
        });
    } catch (error) {
        console.error('[IDP] Error fetching crew brief:', error);
        res.status(500).json({ error: 'Failed to fetch crew brief' });
    }
});

/**
 * POST /api/v1/drivers/me/resync-profile
 * Trigger a full OAuth-based profile + career stats re-sync for the current user
 */
router.post('/me/resync-profile', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const syncService = getIRacingProfileSyncService();
        const profile = await syncService.syncProfile(req.user!.id);

        if (!profile) {
            res.status(400).json({ error: 'Profile sync failed — no valid iRacing OAuth token' });
            return;
        }

        res.json({
            success: true,
            displayName: profile.displayName,
            message: 'Profile and career stats synced from iRacing',
        });
    } catch (error) {
        console.error('[IDP] Error re-syncing profile:', error);
        res.status(500).json({ error: 'Failed to re-sync profile' });
    }
});

/**
 * POST /api/v1/drivers/me/sync-iracing
 * Trigger manual sync of iRacing data for the current user
 */
router.post('/me/sync-iracing', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const profile = await getDriverProfileByUserId(req.user!.id);
        if (!profile) {
            res.status(404).json({ error: 'Driver profile not found' });
            return;
        }

        // Check for linked iRacing identity
        const identities = await getLinkedIdentities(profile.id);
        const iracingIdentity = identities.find(i => i.platform === 'iracing');

        if (!iracingIdentity) {
            res.status(400).json({ error: 'No iRacing account linked to this profile' });
            return;
        }

        // Trigger backfill (max 10 races for manual sync to be fast)
        const result = await backfillDriverHistory(profile.id, parseInt(iracingIdentity.platform_user_id), 10);

        res.json({
            success: true,
            synced_races: result.synced,
            errors: result.errors,
            message: `Synced ${result.synced} recent races`
        });
    } catch (error) {
        console.error('[IDP] Error syncing iRacing data:', error);
        res.status(500).json({ error: 'Failed to sync iRacing data' });
    }
});
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

// ========================
// Sessions & Performance
// ========================

/**
 * GET /api/v1/drivers/:id/sessions
 * Get session metrics history for a driver (team access)
 */
router.get('/:id/sessions', requireTeamStandard, async (req: Request, res: Response): Promise<void> => {
    try {
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        const metrics = await getMetricsForDriver(req.params.id, limit, offset);
        res.json({
            driver_profile_id: req.params.id,
            count: metrics.length,
            limit,
            offset,
            sessions: metrics,
        });
    } catch (error) {
        console.error('[IDP] Error fetching sessions:', error);
        res.status(500).json({ error: 'Failed to fetch session metrics' });
    }
});

/**
 * GET /api/v1/drivers/:id/performance
 * Get aggregated performance data for a driver
 */
router.get('/:id/performance', allowPublic, async (req: Request, res: Response): Promise<void> => {
    try {
        const [globalAggregate, allAggregates, traits] = await Promise.all([
            getGlobalAggregate(req.params.id, 'all_time'),
            getAllAggregatesForDriver(req.params.id),
            getCurrentTraits(req.params.id),
        ]);

        if (!globalAggregate) {
            res.status(404).json({ error: 'No performance data available for this driver' });
            return;
        }

        res.json({
            driver_profile_id: req.params.id,
            global: globalAggregate,
            by_context: allAggregates.filter(a => a.car_name || a.track_name),
            traits: traits.map(t => ({
                key: t.trait_key,
                label: t.trait_label,
                category: t.trait_category,
                confidence: t.confidence,
            })),
            computed_at: globalAggregate.computed_at,
        });
    } catch (error) {
        console.error('[IDP] Error fetching performance:', error);
        res.status(500).json({ error: 'Failed to fetch performance data' });
    }
});

/**
 * GET /api/v1/drivers/:id/traits
 * Get current characteristic indicators for a driver
 */
router.get('/:id/traits', allowPublic, async (req: Request, res: Response): Promise<void> => {
    try {
        const traits = await getCurrentTraits(req.params.id);
        res.json({
            driver_profile_id: req.params.id,
            count: traits.length,
            traits: traits.map(t => ({
                key: t.trait_key,
                label: t.trait_label,
                category: t.trait_category,
                confidence: t.confidence,
                evidence: t.evidence_summary,
                computed_at: t.computed_at,
            })),
        });
    } catch (error) {
        console.error('[IDP] Error fetching traits:', error);
        res.status(500).json({ error: 'Failed to fetch driver traits' });
    }
});

/**
 * GET /api/v1/drivers/:id/reports
 * Get AI-generated reports for a driver (team access)
 */
router.get('/:id/reports', requireTeamStandard, async (req: Request, res: Response): Promise<void> => {
    try {
        const reportType = req.query.type as string | undefined;
        const limit = parseInt(req.query.limit as string) || 20;

        const reports = await getReportsForDriver(req.params.id, {
            reportType: reportType as 'session_debrief' | 'monthly_narrative' | undefined,
            status: 'published',
            limit,
        });

        res.json({
            driver_profile_id: req.params.id,
            count: reports.length,
            reports: reports.map(r => ({
                id: r.id,
                type: r.report_type,
                title: r.title,
                session_id: r.session_id,
                content: r.content_json,
                created_at: r.created_at,
            })),
        });
    } catch (error) {
        console.error('[IDP] Error fetching reports:', error);
        res.status(500).json({ error: 'Failed to fetch driver reports' });
    }
});

// ========================
// Development & Progress
// ========================

/**
 * GET /api/v1/drivers/me/development
 * Get driver development data including focus areas, skills, and goals
 */
router.get('/me/development', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const profile = await getDriverProfileByUserId(req.user!.id);
        if (!profile) {
            res.status(404).json({ error: 'No driver profile found' });
            return;
        }

        // Get performance data to build development insights
        const [globalAggregate, traits, metrics] = await Promise.all([
            getGlobalAggregate(profile.id, 'all_time'),
            getCurrentTraits(profile.id),
            getMetricsForDriver(profile.id, 10, 0), // Last 10 sessions
        ]);

        // Build development data from real performance metrics
        const developmentData = {
            currentPhase: determineDevelopmentPhase(globalAggregate, traits),
            phaseProgress: calculatePhaseProgress(globalAggregate),
            weeklyFocus: determineWeeklyFocus(traits, metrics),
            focusAreas: buildFocusAreas(traits, metrics),
            skillTree: buildSkillTree(globalAggregate, traits),
            learningMoments: buildLearningMoments(metrics),
            goals: [], // Goals come from separate goals API
            coachingNotes: buildCoachingNotes(traits, globalAggregate),
            nextSession: buildNextSessionPlan(traits, metrics),
        };

        res.json(developmentData);
    } catch (error) {
        console.error('[IDP] Error fetching development data:', error);
        res.status(500).json({ error: 'Failed to fetch development data' });
    }
});

// ========================
// Driver Memory & Development Endpoints
// ========================

/**
 * GET /api/v1/drivers/me/memories
 * Get driver memory insights (tendencies, strengths, weaknesses learned from sessions)
 */
router.get('/me/memories', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const profile = await getDriverProfileByUserId(req.user!.id);
        if (!profile) {
            res.json({ memories: [] });
            return;
        }

        // Get driver memory + memory events
        const [memoryResult, eventsResult] = await Promise.all([
            pool.query(
                `SELECT * FROM driver_memory WHERE driver_profile_id = $1`,
                [profile.id]
            ),
            pool.query(
                `SELECT * FROM driver_memory_events 
                 WHERE driver_profile_id = $1 
                 ORDER BY created_at DESC LIMIT 20`,
                [profile.id]
            ),
        ]);

        const memory = memoryResult.rows[0] || null;
        const events = eventsResult.rows;

        // Build memory items from the memory record and events
        const memories: any[] = [];

        if (memory) {
            // Extract tendencies as memory items
            if (memory.braking_style && memory.braking_style !== 'unknown') {
                memories.push({
                    id: `mem-braking`,
                    driverId: profile.id,
                    category: 'tendency',
                    content: `Braking style: ${memory.braking_style}. Consistency: ${Math.round((memory.braking_consistency || 0) * 100)}%`,
                    confidence: memory.braking_consistency || 0,
                    source: 'session_analysis',
                    createdAt: memory.updated_at,
                    updatedAt: memory.updated_at,
                });
            }
            if (memory.throttle_style && memory.throttle_style !== 'unknown') {
                memories.push({
                    id: `mem-throttle`,
                    driverId: profile.id,
                    category: 'tendency',
                    content: `Throttle style: ${memory.throttle_style}. Traction management: ${Math.round((memory.traction_management || 0) * 100)}%`,
                    confidence: memory.traction_management || 0,
                    source: 'session_analysis',
                    createdAt: memory.updated_at,
                    updatedAt: memory.updated_at,
                });
            }
            if (memory.overtaking_style) {
                memories.push({
                    id: `mem-racecraft`,
                    driverId: profile.id,
                    category: 'tendency',
                    content: `Overtaking style: ${memory.overtaking_style}. Traffic comfort: ${Math.round((memory.traffic_comfort || 0) * 100)}%`,
                    confidence: memory.traffic_comfort || 0,
                    source: 'session_analysis',
                    createdAt: memory.updated_at,
                    updatedAt: memory.updated_at,
                });
            }

            // Strengths
            const strengths = memory.strength_track_types || [];
            if (strengths.length > 0) {
                memories.push({
                    id: `mem-strength-tracks`,
                    driverId: profile.id,
                    category: 'strength',
                    content: `Strong on ${strengths.join(', ')} track types`,
                    confidence: memory.memory_confidence || 0,
                    source: 'session_analysis',
                    createdAt: memory.updated_at,
                    updatedAt: memory.updated_at,
                });
            }

            // Weaknesses
            const weaknesses = memory.weakness_track_types || [];
            if (weaknesses.length > 0) {
                memories.push({
                    id: `mem-weakness-tracks`,
                    driverId: profile.id,
                    category: 'weakness',
                    content: `Needs work on ${weaknesses.join(', ')} track types`,
                    confidence: memory.memory_confidence || 0,
                    source: 'session_analysis',
                    createdAt: memory.updated_at,
                    updatedAt: memory.updated_at,
                });
            }

            // Mental state
            if (memory.post_incident_tilt_risk > 0.5) {
                memories.push({
                    id: `mem-tilt`,
                    driverId: profile.id,
                    category: 'insight',
                    content: `Elevated tilt risk after incidents. Recovery speed: ${memory.recovery_speed || 'unknown'}`,
                    confidence: memory.memory_confidence || 0,
                    source: 'session_analysis',
                    createdAt: memory.updated_at,
                    updatedAt: memory.updated_at,
                });
            }
        }

        // Add recent learning events as memory items
        events.forEach((e: any) => {
            memories.push({
                id: e.id,
                driverId: profile.id,
                category: e.event_type === 'pattern_detected' ? 'insight' : 'tendency',
                content: e.evidence_summary,
                confidence: e.learning_confidence,
                source: e.evidence_type,
                createdAt: e.created_at,
                updatedAt: e.created_at,
            });
        });

        res.json({ memories });
    } catch (error) {
        console.error('[IDP] Error fetching memories:', error);
        res.status(500).json({ error: 'Failed to fetch memories' });
    }
});

/**
 * GET /api/v1/drivers/me/targets
 * Get driver performance targets
 */
router.get('/me/targets', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const profile = await getDriverProfileByUserId(req.user!.id);
        if (!profile) {
            res.json({ targets: [] });
            return;
        }

        const result = await pool.query(
            `SELECT id, driver_profile_id as "driverId", metric_key as metric, 
                    current_value as "currentValue", target_value as "targetValue",
                    deadline, status, progress_pct as progress
             FROM driver_goals 
             WHERE driver_profile_id = $1 AND status IN ('active', 'suggested')
             ORDER BY priority DESC, created_at DESC`,
            [profile.id]
        );

        res.json({ targets: result.rows });
    } catch (error) {
        console.error('[IDP] Error fetching targets:', error);
        res.status(500).json({ error: 'Failed to fetch targets' });
    }
});

/**
 * POST /api/v1/drivers/me/targets
 * Create a new performance target
 */
router.post('/me/targets', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const profile = await getDriverProfileByUserId(req.user!.id);
        if (!profile) {
            res.status(404).json({ error: 'No driver profile found' });
            return;
        }

        const { metric, currentValue, targetValue, deadline, status } = req.body;

        const result = await pool.query(
            `INSERT INTO driver_goals (driver_profile_id, title, category, metric_key, 
             current_value, starting_value, target_value, deadline, status, source)
             VALUES ($1, $2, 'custom', $3, $4, $4, $5, $6, $7, 'self_set')
             RETURNING id, driver_profile_id as "driverId", metric_key as metric,
                       current_value as "currentValue", target_value as "targetValue",
                       deadline, status, progress_pct as progress`,
            [profile.id, `Target: ${metric}`, metric, currentValue || 0, targetValue, deadline || null, status || 'active']
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('[IDP] Error creating target:', error);
        res.status(500).json({ error: 'Failed to create target' });
    }
});

/**
 * PATCH /api/v1/drivers/me/development/drills
 * Update drill completion status
 */
router.patch('/me/development/drills', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const profile = await getDriverProfileByUserId(req.user!.id);
        if (!profile) {
            res.status(404).json({ error: 'No driver profile found' });
            return;
        }

        const { focusAreaId, drillName, completed } = req.body;

        // Store drill completion in driver_memory common_error_types JSONB (repurposed as drill tracking)
        // Or use a lightweight approach: store in a JSONB column
        await pool.query(
            `INSERT INTO driver_memory (driver_profile_id, common_error_types)
             VALUES ($1, $2::jsonb)
             ON CONFLICT (driver_profile_id) DO UPDATE SET
                common_error_types = COALESCE(driver_memory.common_error_types, '[]'::jsonb) || $2::jsonb,
                updated_at = NOW()`,
            [profile.id, JSON.stringify([{ focusAreaId, drillName, completed, completedAt: new Date().toISOString() }])]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('[IDP] Error updating drill:', error);
        res.status(500).json({ error: 'Failed to update drill' });
    }
});

/**
 * POST /api/v1/drivers/me/coaching
 * Get AI coaching insight based on context
 */
router.post('/me/coaching', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const profile = await getDriverProfileByUserId(req.user!.id);
        if (!profile) {
            res.status(404).json({ error: 'No driver profile found' });
            return;
        }

        const { context } = req.body;

        // Gather driver data for context
        const [aggregate, traits, recentSessions] = await Promise.all([
            getGlobalAggregate(profile.id, 'all_time'),
            getCurrentTraits(profile.id),
            getMetricsForDriver(profile.id, 5, 0),
        ]);

        // Build driver context string
        const driverContext = buildDriverContextForAI(profile, aggregate, traits, recentSessions);

        if (!isLLMConfigured()) {
            // Fallback coaching without AI
            const fallbackInsight = buildFallbackCoachingInsight(aggregate, traits);
            res.json({ insight: fallbackInsight });
            return;
        }

        const result = await chatCompletion([
            {
                role: 'system',
                content: `You are an experienced motorsport race engineer providing coaching to a sim racer. 
You know this driver well and speak directly, concisely, and with authority. 
Keep responses under 3 sentences. Be specific and actionable.
Never use generic platitudes — reference their actual data.`
            },
            {
                role: 'user',
                content: `Driver data:\n${driverContext}\n\nDriver's question/context: ${context || 'Give me a coaching tip for my next session.'}`
            }
        ], { temperature: 0.7, maxTokens: 300 });

        if (result.success && result.content) {
            res.json({ insight: result.content });
        } else {
            const fallbackInsight = buildFallbackCoachingInsight(aggregate, traits);
            res.json({ insight: fallbackInsight });
        }
    } catch (error) {
        console.error('[IDP] Error generating coaching insight:', error);
        res.status(500).json({ error: 'Failed to generate coaching insight' });
    }
});

/**
 * GET /api/v1/drivers/me/recommendations
 * Get skill recommendations based on current performance
 */
router.get('/me/recommendations', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const profile = await getDriverProfileByUserId(req.user!.id);
        if (!profile) {
            res.json({ recommendations: [] });
            return;
        }

        const [rawAggregate, traits, recentSessions] = await Promise.all([
            getGlobalAggregate(profile.id, 'all_time'),
            getCurrentTraits(profile.id),
            getMetricsForDriver(profile.id, 10, 0),
        ]);
        const aggregate = rawAggregate as any;

        const recommendations: string[] = [];

        if (!aggregate || !aggregate.session_count) {
            recommendations.push('Complete your first few races to unlock personalized recommendations.');
            recommendations.push('Focus on finishing races cleanly — incidents hurt more than slow laps.');
            recommendations.push('Learn one track well before moving to the next.');
            res.json({ recommendations });
            return;
        }

        const avgIncidents = (aggregate.avg_incidents_per_100_laps || 0) / 100 * (aggregate.lap_count / Math.max(aggregate.session_count, 1));
        const avgFinish = aggregate.avg_positions_gained !== null ? 10 : 20;
        const sessions = aggregate.session_count || 0;

        // Incident-based recommendations
        if (avgIncidents > 3) {
            recommendations.push('Your incident rate is high. Focus on smooth inputs and leaving space in traffic.');
        } else if (avgIncidents > 1.5) {
            recommendations.push('Work on reducing incidents — aim for 1x or less per race to protect your SR.');
        } else {
            recommendations.push('Your clean racing is excellent. You can start pushing harder on pace.');
        }

        // Position-based recommendations
        if (avgFinish > 15) {
            recommendations.push('Focus on qualifying pace — starting further up avoids first-lap chaos.');
        } else if (avgFinish > 8) {
            recommendations.push('Practice race starts and first-lap positioning to gain early positions.');
        } else {
            recommendations.push('Your finishing positions are strong. Focus on consistency across different tracks.');
        }

        // Trait-based recommendations (traits with negative connotation)
        const improvementTraits = traits.filter(t => 
            t.trait_key === 'high_variance' || t.trait_key === 'aggressive_risk' || 
            t.trait_key === 'weak_long_run' || t.trait_key === 'slow_starter' || t.trait_key === 'tire_sensitive'
        );
        improvementTraits.slice(0, 2).forEach((w: any) => {
            recommendations.push(`Work on ${w.trait_label}: ${w.evidence_summary || 'identified from your recent sessions'}`);
        });

        // Session count recommendations
        if (sessions < 20) {
            recommendations.push('Keep racing regularly — more seat time builds muscle memory faster than anything.');
        }

        // If we have AI available, try to get a personalized recommendation
        if (isLLMConfigured() && recommendations.length < 5) {
            try {
                const driverContext = buildDriverContextForAI(profile, aggregate, traits, recentSessions);
                const aiResult = await chatCompletion([
                    {
                        role: 'system',
                        content: `You are a sim racing coach. Give exactly 2 specific, actionable skill recommendations. 
Each should be one sentence. Return as a JSON array of strings.`
                    },
                    {
                        role: 'user',
                        content: `Driver data:\n${driverContext}\n\nGive 2 specific skill recommendations.`
                    }
                ], { temperature: 0.6, maxTokens: 200 });

                if (aiResult.success && aiResult.content) {
                    try {
                        const parsed = JSON.parse(aiResult.content);
                        if (Array.isArray(parsed)) {
                            recommendations.push(...parsed.slice(0, 2));
                        }
                    } catch {
                        // AI didn't return valid JSON, use the raw text
                        recommendations.push(aiResult.content);
                    }
                }
            } catch {
                // AI failed, that's fine — we have fallback recommendations
            }
        }

        res.json({ recommendations: recommendations.slice(0, 5) });
    } catch (error) {
        console.error('[IDP] Error fetching recommendations:', error);
        res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
});

/**
 * POST /api/v1/drivers/me/crew-chat
 * AI crew chat endpoint — Engineer, Spotter, or Analyst persona
 */
router.post('/me/crew-chat', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const profile = await getDriverProfileByUserId(req.user!.id);
        const { message, role, history } = req.body;

        if (!message || !role) {
            res.status(400).json({ error: 'message and role are required' });
            return;
        }

        // Gather driver context
        let driverContext = '';
        if (profile) {
            const [aggregate, traits, recentSessions] = await Promise.all([
                getGlobalAggregate(profile.id, 'all_time'),
                getCurrentTraits(profile.id),
                getMetricsForDriver(profile.id, 5, 0),
            ]);
            driverContext = buildDriverContextForAI(profile, aggregate, traits, recentSessions);
        }

        const systemPrompts: Record<string, string> = {
            engineer: `You are a professional motorsport race engineer working with a sim racer. 
You are technical, precise, and data-driven. You reference the driver's actual performance data.
You help with car setup, strategy, track analysis, and race preparation.
Keep responses concise (2-4 sentences) unless the driver asks for detail.
Use racing terminology naturally. Address the driver directly.
${driverContext ? `\nDriver data:\n${driverContext}` : ''}`,

            spotter: `You are a professional motorsport spotter working with a sim racer.
You are alert, direct, and focused on situational awareness. You speak in short, clear callouts.
You help with race starts, traffic management, competitor analysis, and on-track awareness.
Keep responses brief and punchy (1-3 sentences). Use spotter language naturally.
${driverContext ? `\nDriver data:\n${driverContext}` : ''}`,

            analyst: `You are a professional motorsport performance analyst working with a sim racer.
You are analytical, thorough, and focused on data patterns. You find insights in the numbers.
You help with session debrief, performance trends, consistency analysis, and improvement areas.
Keep responses focused (2-4 sentences) with specific data references when available.
${driverContext ? `\nDriver data:\n${driverContext}` : ''}`,
        };

        const systemPrompt = systemPrompts[role] || systemPrompts.engineer;

        if (!isLLMConfigured()) {
            // Fallback responses when AI is not configured
            const fallbacks: Record<string, string> = {
                engineer: `I've reviewed your data. ${driverContext ? 'Based on your recent sessions, focus on consistency and clean racing.' : 'Connect your iRacing account so I can analyze your sessions.'} Let me know what you'd like to work on.`,
                spotter: `Copy that. ${driverContext ? 'I see your recent results — let\'s talk race strategy.' : 'Link your iRacing account and I\'ll have your data ready.'} What do you need?`,
                analyst: `Looking at the numbers. ${driverContext ? 'Your recent performance data shows some interesting patterns.' : 'I\'ll need your iRacing data connected to provide analysis.'} What would you like me to dig into?`,
            };
            res.json({ response: fallbacks[role] || fallbacks.engineer });
            return;
        }

        // Build message history for context
        const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
            { role: 'system', content: systemPrompt },
        ];

        // Add conversation history (last 10 messages for context window)
        if (Array.isArray(history)) {
            history.slice(-10).forEach((h: any) => {
                messages.push({
                    role: h.role === 'user' ? 'user' : 'assistant',
                    content: h.content,
                });
            });
        }

        // Add current message
        messages.push({ role: 'user', content: message });

        const result = await chatCompletion(messages, {
            temperature: 0.7,
            maxTokens: 500,
        });

        if (result.success && result.content) {
            res.json({ response: result.content });
        } else {
            // Fallback
            res.json({ response: `I'm having trouble processing that right now. ${result.error || 'Try again in a moment.'}` });
        }
    } catch (error) {
        console.error('[IDP] Error in crew chat:', error);
        res.status(500).json({ error: 'Failed to process crew chat' });
    }
});

// ========================
// AI Helper Functions
// ========================

function buildDriverContextForAI(profile: any, aggregate: any, traits: any[], recentSessions: any[]): string {
    const lines: string[] = [];

    lines.push(`Driver: ${profile.display_name || 'Unknown'}`);

    if (aggregate) {
        lines.push(`Total sessions: ${aggregate.total_sessions || 0}`);
        lines.push(`Avg finish: P${aggregate.avg_finish?.toFixed(1) || '?'}`);
        lines.push(`Avg start: P${aggregate.avg_start?.toFixed(1) || '?'}`);
        lines.push(`Wins: ${aggregate.wins || 0}`);
        lines.push(`Podiums: ${aggregate.top3s || aggregate.podiums || 0}`);
        lines.push(`Avg incidents/race: ${((aggregate.total_incidents || 0) / Math.max(aggregate.total_sessions || 1, 1)).toFixed(1)}`);
    }

    if (traits.length > 0) {
        const strengths = traits.filter(t => t.trait_category === 'strength').map(t => t.trait_label);
        const weaknesses = traits.filter(t => t.trait_category === 'weakness').map(t => t.trait_label);
        if (strengths.length) lines.push(`Strengths: ${strengths.join(', ')}`);
        if (weaknesses.length) lines.push(`Weaknesses: ${weaknesses.join(', ')}`);
    }

    if (recentSessions.length > 0) {
        lines.push(`Recent sessions:`);
        recentSessions.slice(0, 5).forEach((s: any) => {
            lines.push(`  - ${s.track_name || 'Unknown'}: P${s.finish_pos || '?'} (started P${s.start_pos || '?'}, ${s.incidents || 0}x)`);
        });
    }

    return lines.join('\n');
}

function buildFallbackCoachingInsight(aggregate: any, traits: any[]): string {
    if (!aggregate || !aggregate.total_sessions) {
        return 'Focus on smooth inputs and patience. Complete more sessions to unlock personalized coaching.';
    }

    const avgIncidents = (aggregate.total_incidents || 0) / aggregate.total_sessions;

    if (avgIncidents > 2) {
        return `Your incident rate is ${avgIncidents.toFixed(1)} per race. Focus on leaving more space in braking zones and being patient in traffic. Clean races build SR and confidence.`;
    }

    const weaknesses = traits.filter(t => t.trait_category === 'weakness');
    if (weaknesses.length > 0) {
        return `Work on ${weaknesses[0].trait_label}. Your recent sessions show this as your biggest area for improvement. Dedicate practice time specifically to this.`;
    }

    return 'Your recent form is solid. Focus on consistency — try to string together 3 clean races in a row with similar lap times.';
}

// Helper functions for development data

function determineDevelopmentPhase(aggregate: any, _traits: any[]): string {
    if (!aggregate) return 'Getting Started';
    
    const sessions = aggregate.total_sessions || 0;
    const avgFinish = aggregate.avg_finish || 20;
    
    if (sessions < 10) return 'Getting Started';
    if (sessions < 50) return 'Building Foundation';
    if (avgFinish > 15) return 'Consistency Building';
    if (avgFinish > 10) return 'Competitive Development';
    if (avgFinish > 5) return 'Race Craft Refinement';
    return 'Elite Performance';
}

function calculatePhaseProgress(aggregate: any): number {
    if (!aggregate) return 0;
    
    const sessions = aggregate.total_sessions || 0;
    const wins = aggregate.wins || 0;
    const top5s = aggregate.top5s || 0;
    
    // Simple progress calculation based on results
    const baseProgress = Math.min(sessions / 50, 1) * 30;
    const winProgress = Math.min(wins / 5, 1) * 35;
    const top5Progress = Math.min(top5s / 20, 1) * 35;
    
    return Math.round(baseProgress + winProgress + top5Progress);
}

function determineWeeklyFocus(traits: any[], metrics: any[]): string {
    if (!traits.length && !metrics.length) return 'Complete your first session';
    
    // Look for weakness traits
    const weaknesses = traits.filter(t => t.trait_category === 'weakness');
    if (weaknesses.length > 0) {
        return `Improve ${weaknesses[0].trait_label}`;
    }
    
    // Default focuses based on recent performance
    if (metrics.length > 0) {
        const recentIncidents = metrics.reduce((sum, m) => sum + (m.incidents || 0), 0);
        if (recentIncidents > metrics.length * 2) {
            return 'Clean Racing & Incident Reduction';
        }
    }
    
    return 'Consistency & Pace Development';
}

function buildFocusAreas(traits: any[], _metrics: any[]): any[] {
    const areas: any[] = [];
    
    // Build focus areas from traits
    traits.slice(0, 3).forEach((trait, i) => {
        areas.push({
            id: `trait-${i}`,
            title: trait.trait_label || 'Skill Development',
            description: trait.evidence_summary || 'Based on your recent performance',
            insight: `Your ${trait.trait_category} in this area shows room for growth`,
            evidence: `Confidence: ${Math.round((trait.confidence || 0) * 100)}%`,
            progress: Math.round((trait.confidence || 0) * 100),
            drills: [],
            recentImprovement: undefined,
        });
    });
    
    return areas;
}

function buildSkillTree(aggregate: any, _traits: any[]): any[] {
    const categories = [
        {
            category: 'Car Control',
            skills: [
                { name: 'Throttle Control', level: 1, maxLevel: 3, progress: 30, status: 'learning' as 'learning' | 'next' | 'mastered', description: 'Smooth throttle application' },
                { name: 'Braking', level: 1, maxLevel: 3, progress: 30, status: 'learning' as 'learning' | 'next' | 'mastered', description: 'Consistent braking points' },
                { name: 'Weight Transfer', level: 1, maxLevel: 3, progress: 0, status: 'next' as 'learning' | 'next' | 'mastered', description: 'Use weight to rotate' },
            ]
        },
        {
            category: 'Race Craft',
            skills: [
                { name: 'Clean Racing', level: 1, maxLevel: 3, progress: 30, status: 'learning' as const, description: 'Avoid incidents' },
                { name: 'Overtaking', level: 1, maxLevel: 3, progress: 0, status: 'next' as const, description: 'Safe, decisive passes' },
                { name: 'Defending', level: 1, maxLevel: 3, progress: 0, status: 'next' as const, description: 'Protect position legally' },
            ]
        },
        {
            category: 'Mental',
            skills: [
                { name: 'Consistency', level: 1, maxLevel: 3, progress: 30, status: 'learning' as const, description: 'Repeatable lap times' },
                { name: 'Pressure Management', level: 1, maxLevel: 3, progress: 0, status: 'next' as const, description: 'Perform when it counts' },
            ]
        },
    ];
    
    // Adjust based on aggregate data
    if (aggregate) {
        const sessions = aggregate.total_sessions || 0;
        const avgIncidents = (aggregate.total_incidents || 0) / Math.max(sessions, 1);
        
        // Update clean racing skill based on incident rate
        if (avgIncidents < 2) {
            categories[1].skills[0].level = 2;
            categories[1].skills[0].progress = 70;
        }
        if (avgIncidents < 1) {
            categories[1].skills[0].level = 3;
            categories[1].skills[0].progress = 100;
            categories[1].skills[0].status = 'mastered';
        }
    }
    
    return categories;
}

function buildLearningMoments(metrics: any[]): any[] {
    if (!metrics.length) return [];
    
    return metrics.slice(0, 3).map((m, i) => ({
        session: m.track_name || 'Recent Session',
        date: i === 0 ? 'Recent' : `${i + 1} sessions ago`,
        insight: m.incidents === 0 ? 'Clean race completed' : `Finished with ${m.incidents}x incidents`,
        improvement: m.finish_pos < m.start_pos 
            ? `Gained ${m.start_pos - m.finish_pos} positions`
            : m.finish_pos === m.start_pos 
                ? 'Held position'
                : `Lost ${m.finish_pos - m.start_pos} positions`,
    }));
}

function buildCoachingNotes(_traits: any[], aggregate: any): string[] {
    const notes: string[] = [];
    
    if (!aggregate || !aggregate.total_sessions) {
        notes.push('Complete more sessions to unlock personalized coaching.');
        notes.push('Focus on finishing races cleanly before chasing pace.');
        return notes;
    }
    
    const avgIncidents = (aggregate.total_incidents || 0) / aggregate.total_sessions;
    
    if (avgIncidents < 2) {
        notes.push('Your clean racing is a strength. Build on it.');
    } else {
        notes.push('Focus on reducing incidents before pushing for pace.');
    }
    
    if (aggregate.wins > 0) {
        notes.push('You know how to win. Stay consistent.');
    }
    
    notes.push('Review your best laps to understand what works.');
    
    return notes;
}

function buildNextSessionPlan(_traits: any[], _metrics: any[]): any {
    return {
        focus: 'Continue building consistency',
        drills: [
            'Focus on hitting your marks consistently',
            'Practice smooth inputs',
            'Stay aware of cars around you',
        ],
        reminder: 'Progress comes from consistent practice, not single heroic laps.',
    };
}

export default router;
