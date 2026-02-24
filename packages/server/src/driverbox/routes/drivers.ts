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
import { getTelemetryForVoice } from '../../websocket/telemetry-cache.js';
import { getAnalyzer } from '../../services/ai/live-session-analyzer.js';
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
// Auto-Sync Background Task
// ========================

// Track last sync time per user to avoid excessive API calls (5 minute cooldown)
const lastSyncTime = new Map<string, number>();
const SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Trigger background sync if cooldown has passed
 * Non-blocking - doesn't delay the response
 */
function triggerBackgroundSyncIfNeeded(userId: string, driverProfileId: string): void {
    const lastSync = lastSyncTime.get(userId) || 0;
    const now = Date.now();
    
    if (now - lastSync < SYNC_COOLDOWN_MS) {
        return; // Still in cooldown
    }
    
    lastSyncTime.set(userId, now);
    
    // Run sync in background (don't await)
    (async () => {
        try {
            console.log(`[IDP] Auto-sync triggered for user ${userId}`);
            const syncService = getIRacingProfileSyncService();
            
            // Sync profile and race results from iRacing
            const profile = await syncService.syncProfile(userId);
            if (!profile) {
                console.log(`[IDP] Auto-sync: No iRacing link for user ${userId}`);
                return;
            }
            
            // Process new races into IDP memory
            const { backfillFromIRacingResults } = await import('../services/idp/driver-memory.service.js');
            const processed = await backfillFromIRacingResults(userId, driverProfileId);
            console.log(`[IDP] Auto-sync complete for user ${userId}: processed ${processed} sessions`);
        } catch (error) {
            console.error(`[IDP] Auto-sync error for user ${userId}:`, error);
        }
    })();
}

// ========================
// Profile CRUD
// ========================

/**
 * GET /api/v1/drivers/me
 * Get current user's driver profile (must be before /:id)
 * Automatically triggers background sync if cooldown has passed
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

        // Trigger background sync (non-blocking) - uses function defined below
        triggerBackgroundSyncIfNeeded(req.user!.id, profile.id);

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
/**
 * POST /api/v1/drivers/me/sync-history
 * Comprehensive historical race sync + IDP memory processing
 * Uses the user's OAuth token to fetch race history from iRacing Data API
 */
router.post('/me/sync-history', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const profile = await getDriverProfileByUserId(req.user!.id);
        if (!profile) {
            res.status(404).json({ error: 'Driver profile not found' });
            return;
        }

        // Use the OAuth-based profile sync service (uses user's token, not app credentials)
        const syncService = getIRacingProfileSyncService();
        
        // This will sync profile AND race results using the user's OAuth token
        const syncedProfile = await syncService.syncProfile(req.user!.id);
        
        if (!syncedProfile) {
            res.status(400).json({ 
                error: 'No iRacing account linked or OAuth token expired. Please reconnect your iRacing account in Settings.' 
            });
            return;
        }

        // Get count of stored race results
        const raceCount = await syncService.getRaceResultsCount(req.user!.id);

        // Process through IDP memory system if we have race data
        let sessionsProcessed = 0;
        if (raceCount > 0) {
            const { backfillFromIRacingResults } = await import('../services/idp/driver-memory.service.js');
            sessionsProcessed = await backfillFromIRacingResults(req.user!.id, profile.id);
        }

        res.json({
            success: true,
            races_synced: raceCount,
            sessions_processed: sessionsProcessed,
            message: raceCount > 0 
                ? `Found ${raceCount} races in your history. Processed ${sessionsProcessed} sessions into your driver profile.`
                : 'No race history found. Complete some iRacing races and try again.',
        });
    } catch (error) {
        console.error('[IDP] Error in comprehensive history sync:', error);
        res.status(500).json({ error: 'Failed to sync race history' });
    }
});

/**
 * POST /api/v1/drivers/me/sync-history-full
 * Force a FULL re-sync of all race history (ignores incremental sync)
 * This fetches ALL races from member_since date, not just new ones
 */
router.post('/me/sync-history-full', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const profile = await getDriverProfileByUserId(req.user!.id);
        if (!profile) {
            res.status(404).json({ error: 'Driver profile not found' });
            return;
        }

        const syncService = getIRacingProfileSyncService();
        const oauthService = (await import('../../services/iracing-oauth/iracing-oauth-service.js')).getIRacingOAuthService();
        
        // Get valid access token
        const accessToken = await oauthService.getValidAccessToken(req.user!.id);
        if (!accessToken) {
            res.status(400).json({ 
                error: 'No iRacing account linked or OAuth token expired. Please reconnect your iRacing account in Settings.' 
            });
            return;
        }

        // Get iRacing profile for custId and memberSince
        const iracingProfile = await syncService.getStoredProfile(req.user!.id);
        if (!iracingProfile) {
            res.status(400).json({ error: 'No iRacing profile found. Try regular sync first.' });
            return;
        }

        // Force full sync - pass true for forceFullSync
        console.log(`[IDP] Force full sync requested for user ${req.user!.id}`);
        const racesSynced = await syncService.syncRaceResults(
            req.user!.id, 
            accessToken, 
            iracingProfile.iracingCustomerId,
            iracingProfile.memberSince,
            true // forceFullSync
        );

        // Get total count after sync
        const raceCount = await syncService.getRaceResultsCount(req.user!.id);

        // Process through IDP memory system
        let sessionsProcessed = 0;
        if (raceCount > 0) {
            const { backfillFromIRacingResults } = await import('../services/idp/driver-memory.service.js');
            sessionsProcessed = await backfillFromIRacingResults(req.user!.id, profile.id);
        }

        res.json({
            success: true,
            new_races_synced: racesSynced,
            total_races: raceCount,
            sessions_processed: sessionsProcessed,
            message: `Full sync complete. Found ${racesSynced} new races. Total: ${raceCount} races. Processed ${sessionsProcessed} sessions.`,
        });
    } catch (error) {
        console.error('[IDP] Error in full history sync:', error);
        res.status(500).json({ error: 'Failed to sync race history' });
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
            getMetricsForDriver(profile.id, 30, 0), // Last 30 sessions for gamification
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
            // Gamification & enhanced journey data
            gamification: calculateGamification(globalAggregate, metrics),
            journeyTimeline: buildJourneyTimeline(metrics, globalAggregate),
            growthStats: buildGrowthStats(globalAggregate, metrics),
        };

        res.json(developmentData);
    } catch (error) {
        console.error('[IDP] Error fetching development data:', error);
        res.status(500).json({ error: 'Failed to fetch development data' });
    }
});

/**
 * GET /api/v1/drivers/me/track-analysis?track=TrackName
 * Returns real performance analysis for a specific track using session_metrics data
 */
router.get('/me/track-analysis', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const profile = await getDriverProfileByUserId(req.user!.id);
        if (!profile) { res.status(404).json({ error: 'No driver profile found' }); return; }

        const trackName = req.query.track as string;
        if (!trackName) { res.status(400).json({ error: 'track query parameter required' }); return; }

        const { getMetricsForContext } = await import('../../db/repositories/session-metrics.repo.js');
        const metrics = await getMetricsForContext(profile.id, undefined, trackName, 20);

        if (metrics.length === 0) {
            res.json({ trackName, sessions: 0, analysis: null, message: 'No sessions found for this track' });
            return;
        }

        // Compute real track-specific stats
        const finishes = metrics.map((m: any) => parseFloat(m.finish_position) || 0).filter((p: number) => p > 0);
        const starts = metrics.map((m: any) => parseFloat(m.start_position) || 0).filter((p: number) => p > 0);
        const incidents = metrics.map((m: any) => parseFloat(m.incident_count) || 0);
        const paces = metrics.map((m: any) => parseFloat(m.pace_percentile) || 0);
        const stdDevs = metrics.map((m: any) => parseFloat(m.lap_time_std_dev_ms) || 0);
        const iRChanges = metrics.map((m: any) => parseFloat(m.irating_change) || 0);
        const posGained = metrics.map((m: any) => parseFloat(m.positions_gained) || 0);

        const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
        const best = (arr: number[]) => arr.length ? Math.min(...arr) : 0;

        const avgFinish = avg(finishes);
        const bestFinish = best(finishes);
        const avgStart = avg(starts);
        const avgIncidents = avg(incidents);
        const avgPace = avg(paces);
        const avgStdDev = avg(stdDevs);
        const totalIRChange = iRChanges.reduce((a, b) => a + b, 0);
        const avgPosGained = avg(posGained);
        const cleanRaces = incidents.filter(i => i === 0).length;

        // Trend: compare first half vs second half of sessions (newest first)
        const half = Math.floor(metrics.length / 2);
        const recentHalf = metrics.slice(0, half);
        const olderHalf = metrics.slice(half);
        const recentAvgPace = avg(recentHalf.map((m: any) => parseFloat(m.pace_percentile) || 0));
        const olderAvgPace = avg(olderHalf.map((m: any) => parseFloat(m.pace_percentile) || 0));
        const recentAvgInc = avg(recentHalf.map((m: any) => parseFloat(m.incident_count) || 0));
        const olderAvgInc = avg(olderHalf.map((m: any) => parseFloat(m.incident_count) || 0));
        const recentAvgStdDev = avg(recentHalf.map((m: any) => parseFloat(m.lap_time_std_dev_ms) || 0));
        const olderAvgStdDev = avg(olderHalf.map((m: any) => parseFloat(m.lap_time_std_dev_ms) || 0));

        // Generate real insights based on data
        const insights: string[] = [];
        if (avgPosGained > 0.5) insights.push(`You gain ${avgPosGained.toFixed(1)} positions on average here — strong racecraft at this track`);
        else if (avgPosGained < -0.5) insights.push(`You lose ${Math.abs(avgPosGained).toFixed(1)} positions on average — focus on race starts and early-lap survival`);

        if (avgIncidents > 3) insights.push(`High incident rate (${avgIncidents.toFixed(1)}/race) — leave extra margin in braking zones`);
        else if (cleanRaces > metrics.length * 0.5) insights.push(`${cleanRaces}/${metrics.length} clean races — excellent discipline at this track`);

        if (recentAvgPace > olderAvgPace + 3) insights.push(`Pace improving: recent P${Math.round(recentAvgPace)}% vs earlier P${Math.round(olderAvgPace)}%`);
        else if (recentAvgPace < olderAvgPace - 3) insights.push(`Pace declining: recent P${Math.round(recentAvgPace)}% vs earlier P${Math.round(olderAvgPace)}%`);

        if (recentAvgInc < olderAvgInc - 0.5) insights.push(`Incidents trending down: ${recentAvgInc.toFixed(1)} recent vs ${olderAvgInc.toFixed(1)} earlier`);

        if (avgStdDev > 2000) insights.push(`Lap consistency needs work — ${(avgStdDev / 1000).toFixed(2)}s average variation`);
        else if (avgStdDev < 800) insights.push(`Excellent consistency — ${(avgStdDev / 1000).toFixed(2)}s average variation`);

        // Generate improvement areas from data
        const improvements: string[] = [];
        if (avgIncidents > 2) improvements.push(`Reduce incidents from ${avgIncidents.toFixed(1)}/race — brake 5m earlier into heavy braking zones`);
        if (avgStdDev > 1500) improvements.push(`Improve consistency — ${(avgStdDev / 1000).toFixed(2)}s std dev suggests inconsistent corner execution`);
        if (avgPace < 40) improvements.push(`Pace at P${Math.round(avgPace)}% — study faster drivers' replays for braking and line differences`);
        if (avgPosGained < -1) improvements.push(`Losing ${Math.abs(avgPosGained).toFixed(1)} positions/race — work on race starts and first-lap positioning`);
        if (improvements.length === 0) improvements.push('Solid performance — focus on marginal gains in your weakest corners');

        // Generate strengths from data
        const strengthsList: string[] = [];
        if (avgPace > 60) strengthsList.push(`Strong pace — P${Math.round(avgPace)}% average at this track`);
        if (avgStdDev < 1200) strengthsList.push(`Consistent laps — ${(avgStdDev / 1000).toFixed(2)}s average variation`);
        if (cleanRaces > 2) strengthsList.push(`${cleanRaces} clean races out of ${metrics.length} — good discipline`);
        if (avgPosGained > 1) strengthsList.push(`Gaining ${avgPosGained.toFixed(1)} positions/race — strong racecraft`);
        if (totalIRChange > 0) strengthsList.push(`Net iRating gain of +${Math.round(totalIRChange)} at this track`);
        if (strengthsList.length === 0) strengthsList.push('Building experience — each session adds to your track knowledge');

        // Strategy recommendations based on data
        const strategy: string[] = [];
        if (avgIncidents > 3) {
            strategy.push('Priority: survival. Run 90% pace for first 3 laps, then build rhythm');
            strategy.push('Leave extra space in braking zones — a clean race gains more iRating than a risky overtake');
        } else if (avgPace < 35) {
            strategy.push('Focus practice on the corners where you lose the most time');
            strategy.push('Study the fastest replay and note 3 braking/line differences');
        } else if (avgPosGained < -1) {
            strategy.push('Practice race starts — focus on clean getaways and first-corner survival');
            strategy.push('In traffic, prioritize exit speed over entry speed');
        } else {
            strategy.push('Your form is solid here — focus on converting pace into consistent results');
            strategy.push('Set a mini-goal: improve your average finish by 1 position');
        }

        // Session history for the panel
        const history = metrics.slice(0, 8).map((m: any) => ({
            date: m.computed_at ? new Date(m.computed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent',
            finish: Math.round(parseFloat(m.finish_position) || 0),
            started: Math.round(parseFloat(m.start_position) || 0),
            incidents: Math.round(parseFloat(m.incident_count) || 0),
            pacePercentile: Math.round(parseFloat(m.pace_percentile) || 0),
            stdDevMs: Math.round(parseFloat(m.lap_time_std_dev_ms) || 0),
            iRatingChange: Math.round(parseFloat(m.irating_change) || 0),
            laps: Math.round(parseFloat(m.total_laps) || 0),
            positionsGained: Math.round(parseFloat(m.positions_gained) || 0),
        }));

        res.json({
            trackName,
            sessions: metrics.length,
            stats: {
                avgFinish: Math.round(avgFinish * 10) / 10,
                bestFinish: Math.round(bestFinish),
                avgStart: Math.round(avgStart * 10) / 10,
                avgIncidents: Math.round(avgIncidents * 10) / 10,
                avgPacePercentile: Math.round(avgPace),
                avgStdDevMs: Math.round(avgStdDev),
                totalIRatingChange: Math.round(totalIRChange),
                avgPositionsGained: Math.round(avgPosGained * 10) / 10,
                cleanRaces,
            },
            trends: {
                paceImproving: recentAvgPace > olderAvgPace + 2,
                incidentsDecreasing: recentAvgInc < olderAvgInc - 0.3,
                consistencyImproving: recentAvgStdDev < olderAvgStdDev - 100,
                recentPace: Math.round(recentAvgPace),
                olderPace: Math.round(olderAvgPace),
                recentIncidents: Math.round(recentAvgInc * 10) / 10,
                olderIncidents: Math.round(olderAvgInc * 10) / 10,
            },
            insights,
            improvements,
            strengths: strengthsList,
            strategy,
            history,
        });
    } catch (error) {
        console.error('[IDP] Error in track analysis:', error);
        res.status(500).json({ error: 'Failed to analyze track performance' });
    }
});

// ========================
// Driver Memory & Development Endpoints
// ========================

/**
 * GET /api/v1/drivers/me/idp
 * Get full Intelligent Driver Profile data (memory, opinions, identity)
 * Used by the Driver Profile UI to show archetype, tendencies, and AI assessments
 * Automatically triggers background sync if cooldown has passed
 */
router.get('/me/idp', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const profile = await getDriverProfileByUserId(req.user!.id);
        if (!profile) {
            res.status(404).json({ error: 'No driver profile found' });
            return;
        }

        // Trigger background sync (non-blocking)
        triggerBackgroundSyncIfNeeded(req.user!.id, profile.id);

        // Fetch memory, opinions, and identity in parallel
        const [memoryResult, opinionsResult, identityResult] = await Promise.all([
            pool.query(`SELECT * FROM driver_memory WHERE driver_profile_id = $1`, [profile.id]),
            pool.query(
                `SELECT * FROM engineer_opinions 
                 WHERE driver_profile_id = $1 AND superseded_by IS NULL 
                 ORDER BY priority DESC`,
                [profile.id]
            ),
            pool.query(`SELECT * FROM driver_identity WHERE driver_profile_id = $1`, [profile.id]),
        ]);

        const memoryRow = memoryResult.rows[0];
        const identityRow = identityResult.rows[0];

        // Transform memory to camelCase for frontend
        const memory = memoryRow ? {
            brakingStyle: memoryRow.braking_style,
            brakingConsistency: memoryRow.braking_consistency,
            throttleStyle: memoryRow.throttle_style,
            tractionManagement: memoryRow.traction_management,
            cornerEntryStyle: memoryRow.corner_entry_style,
            overtakingStyle: memoryRow.overtaking_style,
            currentConfidence: memoryRow.current_confidence,
            confidenceTrend: memoryRow.confidence_trend,
            postIncidentTiltRisk: memoryRow.post_incident_tilt_risk,
            fatigueOnsetLap: memoryRow.fatigue_onset_lap,
            lateRaceDegradation: memoryRow.late_race_degradation,
            sessionLengthSweetSpot: memoryRow.session_length_sweet_spot,
            incidentProneness: memoryRow.incident_proneness,
            recoverySpeed: memoryRow.recovery_speed,
            sessionsAnalyzed: memoryRow.sessions_analyzed || 0,
            lapsAnalyzed: memoryRow.laps_analyzed || 0,
            memoryConfidence: memoryRow.memory_confidence || 0,
        } : null;

        // Transform opinions to camelCase
        const opinions = opinionsResult.rows.map((o: any) => ({
            id: o.id,
            domain: o.opinion_domain,
            summary: o.opinion_summary,
            detail: o.opinion_detail,
            sentiment: o.opinion_sentiment,
            suggestedAction: o.suggested_action,
            priority: o.priority,
            confidence: o.opinion_confidence,
            evidenceSummary: o.evidence_summary,
            createdAt: o.created_at,
        }));

        // Transform identity to camelCase
        const identity = identityRow ? {
            archetype: identityRow.driver_archetype,
            archetypeConfidence: identityRow.archetype_confidence,
            archetypeEvidence: identityRow.archetype_evidence,
            skillTrajectory: identityRow.skill_trajectory,
            trajectoryEvidence: identityRow.trajectory_evidence,
            readyForLongerRaces: identityRow.ready_for_longer_races,
            readyForHigherSplits: identityRow.ready_for_higher_splits,
            readyForNewDiscipline: identityRow.ready_for_new_discipline,
            currentChapter: identityRow.current_chapter,
            nextMilestone: identityRow.next_milestone,
        } : null;

        res.json({ memory, opinions, identity });
    } catch (error) {
        console.error('[IDP] Error fetching IDP data:', error);
        res.status(500).json({ error: 'Failed to fetch IDP data' });
    }
});

/**
 * GET /api/v1/drivers/me/report
 * Get detailed driver improvement report with specific data and actionable insights
 */
router.get('/me/report', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const profile = await getDriverProfileByUserId(req.user!.id);
        if (!profile) {
            res.status(404).json({ error: 'Driver profile not found' });
            return;
        }

        const { generateDriverReport } = await import('../services/idp/driver-memory.service.js');
        const report = await generateDriverReport(req.user!.id, profile.id);
        
        res.json(report);
    } catch (error) {
        console.error('[IDP] Error generating driver report:', error);
        res.status(500).json({ error: 'Failed to generate driver report' });
    }
});

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

        // Gather driver context (historical stats + live telemetry)
        let driverContext = '';
        if (profile) {
            const [aggregate, traits, recentSessions] = await Promise.all([
                getGlobalAggregate(profile.id, 'all_time'),
                getCurrentTraits(profile.id),
                getMetricsForDriver(profile.id, 10, 0),
            ]);
            driverContext = buildDriverContextForAI(profile, aggregate, traits, recentSessions);
        }

        // Inject live telemetry if driver is in a session
        const liveContext = buildLiveTelemetryContext();
        const isLive = liveContext.length > 0;

        const liveInstructions = isLive
            ? `\nThe driver is CURRENTLY IN A LIVE SESSION. You have real-time telemetry data below.
When they ask about fuel, tires, gaps, position, damage, weather, or anything about the current session — answer from the LIVE data.
Be conversational and direct. They're driving. Keep it short unless they ask for detail.
If they ask "how's the car?" or "what's my fuel?" — answer with the live numbers.
If they ask strategy questions, use both their historical data AND the live session data to give the best answer.`
            : '';

        const noLiveNote = !isLive ? '\nThe driver is NOT currently in a live session. Answer from historical data and general knowledge.' : '';

        const allContext = [
            driverContext || 'No driver data available yet — encourage them to complete sessions.',
            liveContext,
        ].filter(Boolean).join('\n');

        const systemPrompts: Record<string, string> = {
            engineer: `You are a professional motorsport race engineer working with a sim racer on iRacing.
You are technical, precise, and data-driven. You ALWAYS reference the driver's actual performance numbers when available.
You help with: car setup philosophy, race strategy, fuel/tire management, track-specific preparation, and pre-race briefings.
When discussing strategy, reference their actual pace percentile, consistency, and incident patterns.
When discussing setup, relate it to their driving style (e.g., if they have high incidents, suggest more stable setups).
Keep responses concise (2-4 sentences) unless the driver asks for detail. Use racing terminology naturally.

DURING A LIVE SESSION you have access to ACCUMULATED RACE INTELLIGENCE — not just a snapshot, but the full story:
- Use PACE ANALYSIS to answer questions about lap time trends, consistency, and whether they're improving or degrading.
- Use FUEL ANALYSIS for precise fuel strategy: actual burn rate, projected laps, whether they can make it without stopping.
- Use TIRE ANALYSIS for tire strategy: degradation rate per lap, estimated laps left, tire cliff warnings.
- Use POSITION & GAPS for gap trends (closing/opening), overtake opportunities, and defensive needs.
- Use STRATEGY RECOMMENDATION as your primary advice — it synthesizes all the data into one actionable call.
- If they ask "how's the car?" give them fuel, tires, damage, and the strategy recommendation in one breath.
- If they ask about pit strategy, use the optimal pit window calculation and fuel/tire projections together.

IMPORTANT: Never make up data. Only reference numbers from the data below. If data is missing, say so.${liveInstructions}${noLiveNote}
\n${allContext}`,

            spotter: `You are a professional motorsport spotter working with a sim racer on iRacing.
You are alert, direct, and focused on situational awareness. You speak in short, clear radio-style callouts.
You help with: race starts, traffic management, competitor tendencies, track awareness, and race-day mental preparation.
Reference their actual race data — if they lose positions on average, focus on starts. If incidents are high, focus on awareness.
When not in a live session, help them prepare mentally: review their recent results, discuss approach for upcoming races.
Keep responses brief and punchy (1-3 sentences). Use spotter radio language naturally ("Clear high", "Car inside", etc).

DURING A LIVE SESSION you have access to ACCUMULATED RACE INTELLIGENCE with real gap and position data:
- Use POSITION & GAPS to tell them about closing/opening gaps. "Car behind closing, 1.2 seconds" or "You're reeling him in, gap down to 0.8."
- Use gap TRENDS (closing/stable/opening) — don't just report the number, tell them the direction.
- If OVERTAKE OPPORTUNITY is flagged, call it: "Gap under a second, he's struggling. Set up the move."
- If UNDER THREAT is flagged, warn them: "Car behind is faster. Cover the inside."
- Use INCIDENTS & MENTAL STATE to adjust your tone — if they're tilted or fatigued, be calming. If they're fresh, be energizing.
- Use RACECRAFT data to reference their overtake success rate if relevant.
- Reference STANDINGS data to tell them about specific competitors by name and iRating.

IMPORTANT: Never make up data. Only reference numbers from the data below.${liveInstructions}${noLiveNote}
\n${allContext}`,

            analyst: `You are a professional motorsport performance analyst working with a sim racer on iRacing.
You are analytical, thorough, and obsessed with finding patterns in data. You speak with precision and cite specific numbers.
You help with: session debrief, performance trends, consistency analysis, identifying improvement areas, and tracking progress.
ALWAYS cite specific numbers: pace percentiles, incident counts, std dev, positions gained, iRating changes.
Compare recent performance to overall averages. Identify trends (improving/declining). Prioritize actionable insights.
When debriefing a session, analyze: pace vs field, consistency, incidents, positions gained/lost, and what to work on next.
Keep responses focused (3-5 sentences) with specific data references. Use tables or bullet points for clarity.

DURING A LIVE SESSION you have access to ACCUMULATED RACE INTELLIGENCE with deep analysis:
- Use PACE ANALYSIS for lap time trends, std dev, consistency rating, and whether pace is improving/degrading/erratic.
- Use STINT HISTORY to compare performance across stints — avg pace, fuel efficiency, tire degradation, positions gained.
- Use FUEL ANALYSIS to validate their fuel strategy with actual burn rates vs projected.
- Use TIRE ANALYSIS for degradation curves and tire cliff warnings.
- Use INCIDENTS & MENTAL STATE to identify patterns — incident clustering, pace after incidents, mental fatigue level.
- Use RACECRAFT data for overtake efficiency and positions lost to mistakes.
- Cross-reference live data with their HISTORICAL performance to identify if this session is above/below their norm.

IMPORTANT: Never make up data. Only reference numbers from the data below. If you see patterns, explain them.${liveInstructions}${noLiveNote}
\n${allContext}`,
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
        const sessions = parseFloat(aggregate.session_count) || 0;
        const pace = parseFloat(aggregate.avg_pace_percentile) || 0;
        const consistency = parseFloat(aggregate.consistency_index) || 0;
        const risk = parseFloat(aggregate.risk_index) || 0;
        const safety = Math.max(0, 100 - risk);
        const posGained = parseFloat(aggregate.avg_positions_gained) || 0;
        const startPerf = parseFloat(aggregate.start_performance_index) || 0;
        const endurance = parseFloat(aggregate.endurance_fitness_index) || 0;
        const paceTrend = parseFloat(aggregate.pace_trend) || 0;
        const avgStdDev = parseFloat(aggregate.avg_std_dev_ms) || 0;
        const avgIncPer100 = parseFloat(aggregate.avg_incidents_per_100_laps) || 0;

        lines.push(`\n--- Overall Stats (${Math.round(sessions)} sessions) ---`);
        lines.push(`Pace percentile: ${Math.round(pace)}% (100 = fastest in field)`);
        lines.push(`Consistency index: ${Math.round(consistency)}/100 (lap time variation: ${(avgStdDev / 1000).toFixed(2)}s std dev)`);
        lines.push(`Safety score: ${Math.round(safety)}/100 (risk index: ${Math.round(risk)}, incidents per 100 laps: ${avgIncPer100.toFixed(1)})`);
        lines.push(`Avg positions gained per race: ${posGained > 0 ? '+' : ''}${posGained.toFixed(1)}`);
        lines.push(`Start performance: ${Math.round(startPerf)}/100`);
        lines.push(`Endurance fitness: ${Math.round(endurance)}/100`);
        lines.push(`Pace trend: ${paceTrend > 0 ? 'improving' : paceTrend < 0 ? 'declining' : 'stable'} (${paceTrend.toFixed(3)})`);
    }

    if (traits.length > 0) {
        lines.push(`\n--- Driver Traits ---`);
        const strengths = traits.filter(t => t.trait_category === 'strength');
        const weaknesses = traits.filter(t => t.trait_category === 'weakness');
        const tendencies = traits.filter(t => t.trait_category !== 'strength' && t.trait_category !== 'weakness');
        if (strengths.length) lines.push(`Strengths: ${strengths.map(t => `${t.trait_label} (${Math.round((parseFloat(t.confidence) || 0) * 100)}% confidence)`).join(', ')}`);
        if (weaknesses.length) lines.push(`Weaknesses: ${weaknesses.map(t => `${t.trait_label} (${Math.round((parseFloat(t.confidence) || 0) * 100)}% confidence)`).join(', ')}`);
        if (tendencies.length) lines.push(`Tendencies: ${tendencies.map(t => `${t.trait_label} [${t.trait_category}]`).join(', ')}`);
    }

    if (recentSessions.length > 0) {
        lines.push(`\n--- Recent Sessions (newest first) ---`);
        recentSessions.slice(0, 8).forEach((s: any) => {
            const track = s.track_name || 'Unknown Track';
            const finish = s.finish_position ? `P${Math.round(parseFloat(s.finish_position))}` : 'DNF';
            const start = s.start_position ? `P${Math.round(parseFloat(s.start_position))}` : '?';
            const inc = parseFloat(s.incident_count) || 0;
            const paceP = parseFloat(s.pace_percentile) || 0;
            const stdDev = parseFloat(s.lap_time_std_dev_ms) || 0;
            const iRChange = parseFloat(s.irating_change) || 0;
            const laps = parseFloat(s.total_laps) || 0;
            const posGained = parseFloat(s.positions_gained) || 0;

            lines.push(`  ${track}: ${finish} (started ${start}, ${posGained > 0 ? '+' : ''}${posGained} pos) | ` +
                `${laps} laps, ${inc}x incidents, pace P${Math.round(paceP)}%, ` +
                `std dev ${(stdDev / 1000).toFixed(2)}s, iR ${iRChange > 0 ? '+' : ''}${Math.round(iRChange)}`);
        });

        // Compute trends from recent sessions
        const recent3 = recentSessions.slice(0, 3);
        const avgRecentInc = recent3.reduce((s: number, m: any) => s + (parseFloat(m.incident_count) || 0), 0) / recent3.length;
        const avgRecentPace = recent3.reduce((s: number, m: any) => s + (parseFloat(m.pace_percentile) || 0), 0) / recent3.length;
        const avgRecentStdDev = recent3.reduce((s: number, m: any) => s + (parseFloat(m.lap_time_std_dev_ms) || 0), 0) / recent3.length;
        lines.push(`\n--- Recent Trends (last 3) ---`);
        lines.push(`Avg incidents: ${avgRecentInc.toFixed(1)} | Avg pace: P${Math.round(avgRecentPace)}% | Avg consistency: ${(avgRecentStdDev / 1000).toFixed(2)}s std dev`);
    }

    return lines.join('\n');
}

function buildLiveTelemetryContext(): string {
    // Try both 'live' key and any active session
    const snapshot = getTelemetryForVoice('live');
    if (!snapshot || !snapshot.updatedAt) return '';

    // Stale check — if data is older than 30 seconds, session is probably over
    const age = Date.now() - snapshot.updatedAt;
    if (age > 30000) return '';

    const lines: string[] = [];
    lines.push('\n--- LIVE SESSION DATA (REAL-TIME) ---');

    // Session
    if (snapshot.trackName) lines.push(`Track: ${snapshot.trackName}`);
    if (snapshot.sessionType) lines.push(`Session: ${snapshot.sessionType}`);
    if (snapshot.sessionLaps) lines.push(`Session laps: ${snapshot.sessionLaps}`);
    if (snapshot.sessionTimeRemain != null) lines.push(`Time remaining: ${Math.floor(snapshot.sessionTimeRemain / 60)}m ${Math.round(snapshot.sessionTimeRemain % 60)}s`);
    if (snapshot.flagStatus) lines.push(`Flag: ${snapshot.flagStatus}`);
    if (snapshot.totalCars) lines.push(`Cars in session: ${snapshot.totalCars}`);

    // Weather
    if (snapshot.trackTemp != null || snapshot.airTemp != null) {
        const parts: string[] = [];
        if (snapshot.trackTemp != null) parts.push(`Track: ${snapshot.trackTemp}°F`);
        if (snapshot.airTemp != null) parts.push(`Air: ${snapshot.airTemp}°F`);
        if (snapshot.humidity != null) parts.push(`Humidity: ${snapshot.humidity}%`);
        if (snapshot.windSpeed != null) parts.push(`Wind: ${snapshot.windSpeed} mph`);
        if (snapshot.skyCondition) parts.push(snapshot.skyCondition);
        lines.push(`Weather: ${parts.join(', ')}`);
    }

    // Position
    lines.push('');
    if (snapshot.position != null) lines.push(`Position: P${snapshot.position}${snapshot.classPosition ? ` (class P${snapshot.classPosition})` : ''}`);
    if (snapshot.lap != null) lines.push(`Current lap: ${snapshot.lap}`);

    // Speed
    if (snapshot.speed != null) lines.push(`Speed: ${snapshot.speed} mph`);
    if (snapshot.gear != null) lines.push(`Gear: ${snapshot.gear}`);

    // Lap times
    if (snapshot.lastLapTime != null && snapshot.lastLapTime > 0) {
        const mins = Math.floor(snapshot.lastLapTime / 60);
        const secs = (snapshot.lastLapTime % 60).toFixed(3);
        lines.push(`Last lap: ${mins}:${secs.padStart(6, '0')}`);
    }
    if (snapshot.bestLapTime != null && snapshot.bestLapTime > 0) {
        const mins = Math.floor(snapshot.bestLapTime / 60);
        const secs = (snapshot.bestLapTime % 60).toFixed(3);
        lines.push(`Best lap: ${mins}:${secs.padStart(6, '0')}`);
    }
    if (snapshot.deltaToSessionBest != null) {
        lines.push(`Delta to session best: ${snapshot.deltaToSessionBest > 0 ? '+' : ''}${snapshot.deltaToSessionBest.toFixed(3)}s`);
    }

    // Fuel
    lines.push('');
    if (snapshot.fuelLevel != null) lines.push(`Fuel level: ${snapshot.fuelLevel.toFixed(2)} L`);
    if (snapshot.fuelPct != null) lines.push(`Fuel %: ${snapshot.fuelPct}%`);
    if (snapshot.fuelPerLap != null) lines.push(`Fuel per lap: ${snapshot.fuelPerLap.toFixed(3)} L`);
    if (snapshot.fuelLevel != null && snapshot.fuelPerLap != null && snapshot.fuelPerLap > 0) {
        const lapsRemaining = Math.floor(snapshot.fuelLevel / snapshot.fuelPerLap);
        lines.push(`Fuel laps remaining: ${lapsRemaining}`);
    }

    // Gaps
    if (snapshot.gapToLeader != null && snapshot.gapToLeader > 0) lines.push(`Gap to leader: +${snapshot.gapToLeader.toFixed(1)}s`);
    if (snapshot.gapToCarAhead != null && snapshot.gapToCarAhead > 0) lines.push(`Gap to car ahead: +${snapshot.gapToCarAhead.toFixed(1)}s`);

    // Tires
    if (snapshot.tireWear) {
        lines.push('');
        lines.push(`Tire wear — FL: ${Math.round(snapshot.tireWear.fl * 100)}%, FR: ${Math.round(snapshot.tireWear.fr * 100)}%, RL: ${Math.round(snapshot.tireWear.rl * 100)}%, RR: ${Math.round(snapshot.tireWear.rr * 100)}%`);
    }
    if (snapshot.tireStintLaps != null) lines.push(`Tire stint laps: ${snapshot.tireStintLaps}`);
    if (snapshot.tireTemps) {
        const avgTemp = (corner: { l: number; m: number; r: number }) => Math.round((corner.l + corner.m + corner.r) / 3);
        lines.push(`Tire temps (avg °C) — FL: ${avgTemp(snapshot.tireTemps.fl)}, FR: ${avgTemp(snapshot.tireTemps.fr)}, RL: ${avgTemp(snapshot.tireTemps.rl)}, RR: ${avgTemp(snapshot.tireTemps.rr)}`);
    }

    // Damage
    if (snapshot.damageAero != null && snapshot.damageAero > 0.01) lines.push(`Aero damage: ${Math.round(snapshot.damageAero * 100)}%`);
    if (snapshot.damageEngine != null && snapshot.damageEngine > 0.01) lines.push(`Engine damage: ${Math.round(snapshot.damageEngine * 100)}%`);

    // Engine
    if (snapshot.oilTemp != null || snapshot.waterTemp != null) {
        const parts: string[] = [];
        if (snapshot.oilTemp != null) parts.push(`Oil: ${snapshot.oilTemp}°F`);
        if (snapshot.waterTemp != null) parts.push(`Water: ${snapshot.waterTemp}°F`);
        if (snapshot.oilPressure != null) parts.push(`Oil pressure: ${snapshot.oilPressure.toFixed(1)}`);
        if (snapshot.voltage != null) parts.push(`Voltage: ${snapshot.voltage.toFixed(1)}V`);
        lines.push(`Engine: ${parts.join(', ')}`);
    }

    // Pit stops & status
    if (snapshot.pitStops != null) lines.push(`Pit stops: ${snapshot.pitStops}`);
    if (snapshot.onPitRoad) lines.push('STATUS: Currently on pit road');
    if (snapshot.incidentCount != null) lines.push(`Incidents this session: ${snapshot.incidentCount}x`);

    // Standings (top 10 + nearby)
    if (snapshot.standings && snapshot.standings.length > 0) {
        lines.push('');
        lines.push('--- LIVE STANDINGS ---');
        const sorted = [...snapshot.standings].sort((a, b) => a.position - b.position);
        const playerIdx = sorted.findIndex(s => s.isPlayer);
        
        // Show top 5
        sorted.slice(0, 5).forEach(s => {
            const marker = s.isPlayer ? ' ← YOU' : '';
            const lapTime = s.bestLapTime > 0 ? ` | best ${Math.floor(s.bestLapTime / 60)}:${(s.bestLapTime % 60).toFixed(3).padStart(6, '0')}` : '';
            lines.push(`  P${s.position} ${s.driverName} (${s.carName}, iR ${s.iRating})${lapTime}${s.onPitRoad ? ' [PIT]' : ''}${marker}`);
        });

        // If player is outside top 5, show nearby cars
        if (playerIdx >= 5) {
            lines.push('  ...');
            const start = Math.max(playerIdx - 1, 5);
            const end = Math.min(playerIdx + 2, sorted.length);
            sorted.slice(start, end).forEach(s => {
                const marker = s.isPlayer ? ' ← YOU' : '';
                const lapTime = s.bestLapTime > 0 ? ` | best ${Math.floor(s.bestLapTime / 60)}:${(s.bestLapTime % 60).toFixed(3).padStart(6, '0')}` : '';
                lines.push(`  P${s.position} ${s.driverName} (${s.carName}, iR ${s.iRating})${lapTime}${s.onPitRoad ? ' [PIT]' : ''}${marker}`);
            });
        }
    }

    // ACCUMULATED RACE INTELLIGENCE from LiveSessionAnalyzer
    // This gives the AI the full story of the race so far — not just a snapshot
    const analyzer = getAnalyzer('live');
    if (analyzer && snapshot.tireWear && snapshot.fuelLevel != null) {
        const analysisContext = analyzer.buildContextForAI({
            fuelLevel: snapshot.fuelLevel,
            fuelPerLap: snapshot.fuelPerLap ?? null,
            tireWear: snapshot.tireWear,
            position: snapshot.position ?? 1,
            gapToCarAhead: snapshot.gapToCarAhead ?? 0,
            gapFromCarBehind: 0,
            gapToLeader: snapshot.gapToLeader ?? 0,
            totalLaps: snapshot.sessionLaps,
        });
        if (analysisContext) {
            lines.push(analysisContext);
        }
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

// ========================
// Helper functions for development data
// ========================

// Skill status type used across helpers
type SkillStatus = 'mastered' | 'learning' | 'next' | 'locked';

function skillFromValue(value: number, thresholds: [number, number, number]): { level: number; progress: number; status: SkillStatus } {
    // thresholds = [learning, advanced, mastered] (0-100 scale)
    if (value >= thresholds[2]) return { level: 3, progress: 100, status: 'mastered' };
    if (value >= thresholds[1]) return { level: 2, progress: Math.round(((value - thresholds[1]) / (thresholds[2] - thresholds[1])) * 100), status: 'learning' };
    if (value >= thresholds[0]) return { level: 1, progress: Math.round(((value - thresholds[0]) / (thresholds[1] - thresholds[0])) * 100), status: 'learning' };
    if (value > 0) return { level: 1, progress: Math.round((value / thresholds[0]) * 100), status: 'learning' };
    return { level: 0, progress: 0, status: 'next' };
}

function determineDevelopmentPhase(aggregate: any, traits: any[]): string {
    if (!aggregate) return 'Getting Started';
    const sessions = aggregate.session_count || 0;
    const pace = parseFloat(aggregate.avg_pace_percentile) || 0;
    const consistency = parseFloat(aggregate.consistency_index) || 0;
    const risk = parseFloat(aggregate.risk_index) || 100;
    const hasStrengths = traits.some((t: any) => t.trait_category === 'strength');

    if (sessions < 5) return 'Getting Started';
    if (sessions < 15) return 'Building Foundation';
    if (risk > 60) return 'Safety First';
    if (consistency < 40) return 'Consistency Building';
    if (pace < 40) return 'Pace Development';
    if (pace < 65) return 'Competitive Development';
    if (pace < 80 || !hasStrengths) return 'Race Craft Refinement';
    return 'Elite Performance';
}

function calculatePhaseProgress(aggregate: any): number {
    if (!aggregate) return 0;
    const sessions = Math.min(parseFloat(aggregate.session_count) || 0, 100);
    const pace = parseFloat(aggregate.avg_pace_percentile) || 0;
    const consistency = parseFloat(aggregate.consistency_index) || 0;
    const safety = Math.max(0, 100 - (parseFloat(aggregate.risk_index) || 50));

    // Weighted composite: sessions contribute early, then performance takes over
    const sessionWeight = sessions < 20 ? 0.4 : 0.15;
    const perfWeight = 1 - sessionWeight;
    const sessionScore = Math.min(sessions / 50, 1) * 100;
    const perfScore = (pace * 0.35 + consistency * 0.35 + safety * 0.30);

    return Math.round(sessionScore * sessionWeight + perfScore * perfWeight);
}

function determineWeeklyFocus(traits: any[], metrics: any[]): string {
    if (!traits.length && !metrics.length) return 'Complete your first session';

    // Prioritize: high-incident rate → consistency → pace → racecraft
    if (metrics.length >= 2) {
        const recentIncidents = metrics.slice(0, 3).reduce((s: number, m: any) => s + (parseFloat(m.incident_count) || 0), 0);
        const avgInc = recentIncidents / Math.min(metrics.length, 3);
        if (avgInc > 4) return 'Incident Reduction — Focus on Clean Laps';

        const recentStdDev = metrics.slice(0, 3).reduce((s: number, m: any) => s + (parseFloat(m.lap_time_std_dev_ms) || 0), 0) / Math.min(metrics.length, 3);
        if (recentStdDev > 2000) return 'Lap Consistency — Reduce Variation';

        const recentPace = metrics.slice(0, 3).reduce((s: number, m: any) => s + (parseFloat(m.pace_percentile) || 0), 0) / Math.min(metrics.length, 3);
        if (recentPace < 40) return 'Raw Pace — Find Time in Key Corners';

        const posGained = metrics.slice(0, 3).reduce((s: number, m: any) => s + (parseFloat(m.positions_gained) || 0), 0) / Math.min(metrics.length, 3);
        if (posGained < -1) return 'Race Starts & Position Defense';
    }

    const weaknesses = traits.filter((t: any) => t.trait_category === 'weakness');
    if (weaknesses.length > 0) return `Improve ${weaknesses[0].trait_label}`;

    return 'Consistency & Pace Development';
}

function buildFocusAreas(traits: any[], metrics: any[]): any[] {
    const areas: any[] = [];

    // Drill templates keyed by trait_key patterns
    const drillBank: Record<string, { name: string; completed: boolean }[]> = {
        incident: [
            { name: 'Complete 3 races with 0 incidents', completed: false },
            { name: 'Practice 10 laps leaving extra space in braking zones', completed: false },
            { name: 'Run a full race focusing only on survival, not position', completed: false },
        ],
        consistency: [
            { name: 'Run 10 consecutive laps within 0.5s of each other', completed: false },
            { name: 'Complete a race without a single off-track', completed: false },
            { name: 'Match your best lap time 3 times in a single session', completed: false },
        ],
        pace: [
            { name: 'Study the fastest replay and note 3 braking differences', completed: false },
            { name: 'Run 20 practice laps focusing on one corner at a time', completed: false },
            { name: 'Beat your personal best by 0.3s in practice', completed: false },
        ],
        racecraft: [
            { name: 'Complete a race gaining 3+ positions without contact', completed: false },
            { name: 'Practice side-by-side racing in an open practice session', completed: false },
            { name: 'Successfully defend position for 5+ laps', completed: false },
        ],
        endurance: [
            { name: 'Maintain pace within 1% over a full stint', completed: false },
            { name: 'Complete a race with less than 0.5s pace drop-off last→first stint', completed: false },
            { name: 'Run a 30-minute practice session without losing concentration', completed: false },
        ],
    };

    function getDrills(traitKey: string): { name: string; completed: boolean }[] {
        for (const [key, drills] of Object.entries(drillBank)) {
            if (traitKey.toLowerCase().includes(key)) return drills.map(d => ({ ...d }));
        }
        return drillBank.consistency.map(d => ({ ...d }));
    }

    // Derive recent improvement from metrics
    function getRecentImprovement(metricKey: string): string | undefined {
        if (metrics.length < 3) return undefined;
        const recent = metrics.slice(0, 3);
        const older = metrics.slice(3, 6);
        if (!older.length) return undefined;

        const recentAvg = recent.reduce((s: number, m: any) => s + (parseFloat(m[metricKey]) || 0), 0) / recent.length;
        const olderAvg = older.reduce((s: number, m: any) => s + (parseFloat(m[metricKey]) || 0), 0) / older.length;

        if (metricKey === 'incident_count' && recentAvg < olderAvg) {
            return `Incidents down ${((olderAvg - recentAvg)).toFixed(1)} per race`;
        }
        if (metricKey === 'lap_time_std_dev_ms' && recentAvg < olderAvg) {
            return `Consistency improved ${((olderAvg - recentAvg) / 1000).toFixed(2)}s std dev`;
        }
        if (metricKey === 'pace_percentile' && recentAvg > olderAvg) {
            return `Pace up ${(recentAvg - olderAvg).toFixed(0)} percentile points`;
        }
        return undefined;
    }

    // Build from traits
    traits.slice(0, 4).forEach((trait: any, i: number) => {
        const traitKey = trait.trait_key || '';
        areas.push({
            id: `trait-${i}`,
            title: trait.trait_label || 'Skill Development',
            description: trait.evidence_summary || 'Based on your recent performance',
            insight: trait.trait_category === 'weakness'
                ? `This is your biggest area for improvement right now`
                : trait.trait_category === 'strength'
                    ? `This is one of your strengths — maintain and build on it`
                    : `Your ${trait.trait_category} here shows room for growth`,
            evidence: trait.evidence_summary || `Confidence: ${Math.round((parseFloat(trait.confidence) || 0) * 100)}%`,
            progress: Math.round((parseFloat(trait.confidence) || 0) * 100),
            drills: getDrills(traitKey),
            recentImprovement: traitKey.includes('incident') ? getRecentImprovement('incident_count')
                : traitKey.includes('consistency') ? getRecentImprovement('lap_time_std_dev_ms')
                    : traitKey.includes('pace') ? getRecentImprovement('pace_percentile')
                        : undefined,
        });
    });

    // If no traits, build from metrics analysis
    if (areas.length === 0 && metrics.length > 0) {
        const avgInc = metrics.reduce((s: number, m: any) => s + (parseFloat(m.incident_count) || 0), 0) / metrics.length;
        const avgStdDev = metrics.reduce((s: number, m: any) => s + (parseFloat(m.lap_time_std_dev_ms) || 0), 0) / metrics.length;

        if (avgInc > 2) {
            areas.push({
                id: 'auto-incidents', title: 'Incident Reduction', description: `Averaging ${avgInc.toFixed(1)} incidents per race`,
                insight: 'Reducing incidents is the fastest path to higher SR and iRating',
                evidence: `${avgInc.toFixed(1)} avg incidents across ${metrics.length} recent sessions`,
                progress: Math.round(Math.max(0, (1 - avgInc / 8) * 100)),
                drills: getDrills('incident'), recentImprovement: getRecentImprovement('incident_count'),
            });
        }
        if (avgStdDev > 1500) {
            areas.push({
                id: 'auto-consistency', title: 'Lap Consistency', description: `Lap time std dev: ${(avgStdDev / 1000).toFixed(2)}s`,
                insight: 'Consistent laps compound into better race results',
                evidence: `${(avgStdDev / 1000).toFixed(2)}s average lap time variation`,
                progress: Math.round(Math.max(0, (1 - avgStdDev / 5000) * 100)),
                drills: getDrills('consistency'), recentImprovement: getRecentImprovement('lap_time_std_dev_ms'),
            });
        }

        // Always provide at least one focus area when we have metrics
        if (areas.length === 0) {
            const avgPace = metrics.reduce((s: number, m: any) => s + (parseFloat(m.pace_percentile) || 0), 0) / metrics.length;
            areas.push({
                id: 'auto-pace', title: 'Pace Development', description: `Current pace: P${Math.round(avgPace)}%`,
                insight: 'Finding more speed while maintaining consistency is the key to climbing',
                evidence: `P${Math.round(avgPace)}% average pace across ${metrics.length} sessions`,
                progress: Math.round(avgPace),
                drills: getDrills('pace'), recentImprovement: getRecentImprovement('pace_percentile'),
            });
        }
    }

    return areas;
}

function buildSkillTree(aggregate: any, traits: any[]): any[] {
    // Extract real values from aggregate
    const pace = parseFloat(aggregate?.avg_pace_percentile) || 0;
    const consistency = parseFloat(aggregate?.consistency_index) || 0;
    const risk = parseFloat(aggregate?.risk_index) || 100;
    const safety = Math.max(0, 100 - risk);
    const posGained = parseFloat(aggregate?.avg_positions_gained) || 0;
    const startPerf = parseFloat(aggregate?.start_performance_index) || 0;
    const endurance = parseFloat(aggregate?.endurance_fitness_index) || 0;
    const paceTrend = parseFloat(aggregate?.pace_trend) || 0;
    const sessions = parseFloat(aggregate?.session_count) || 0;

    // Derive racecraft from positions gained + safety
    const racecraft = Math.min(100, Math.max(0, (posGained + 3) * 15 + safety * 0.3));
    // Derive pressure management from start performance + endurance
    const pressure = Math.min(100, (startPerf + endurance) / 2);

    const categories = [
        {
            category: 'Car Control',
            skills: [
                { name: 'Raw Pace', maxLevel: 5, description: 'Outright speed relative to the field', ...skillFromValue(pace, [20, 50, 85]) },
                { name: 'Consistency', maxLevel: 5, description: 'Repeatable, low-variance lap times', ...skillFromValue(consistency, [25, 55, 85]) },
                { name: 'Endurance', maxLevel: 5, description: 'Maintain pace over long stints', ...skillFromValue(endurance, [20, 50, 80]) },
                { name: 'Pace Trend', maxLevel: 5, description: 'Improving speed over time', ...skillFromValue(Math.max(0, paceTrend * 50 + 50), [20, 50, 80]) },
            ]
        },
        {
            category: 'Race Craft',
            skills: [
                { name: 'Clean Racing', maxLevel: 5, description: 'Low incident rate per race', ...skillFromValue(safety, [30, 60, 90]) },
                { name: 'Overtaking', maxLevel: 5, description: 'Gaining positions safely', ...skillFromValue(racecraft, [20, 50, 80]) },
                { name: 'Race Starts', maxLevel: 5, description: 'Lap 1 position management', ...skillFromValue(startPerf, [20, 50, 80]) },
            ]
        },
        {
            category: 'Mental',
            skills: [
                { name: 'Pressure Management', maxLevel: 5, description: 'Perform when it counts', ...skillFromValue(pressure, [20, 50, 80]) },
                { name: 'Experience', maxLevel: 5, description: 'Race wisdom from time on track', ...skillFromValue(Math.min(100, sessions * 2), [10, 30, 80]) },
            ]
        },
    ];

    // Apply trait-based overrides (traits can boost or penalize)
    traits.forEach((trait: any) => {
        const key = (trait.trait_key || '').toLowerCase();
        const conf = parseFloat(trait.confidence) || 0;
        const isMastered = trait.trait_category === 'strength' && conf > 0.8;

        if (key.includes('consistency') && isMastered) {
            categories[0].skills[1].status = 'mastered';
            categories[0].skills[1].level = Math.max(categories[0].skills[1].level, 4);
        }
        if (key.includes('clean') && isMastered) {
            categories[1].skills[0].status = 'mastered';
            categories[1].skills[0].level = Math.max(categories[1].skills[0].level, 4);
        }
    });

    return categories;
}

function buildLearningMoments(metrics: any[]): any[] {
    if (!metrics.length) return [];

    return metrics.slice(0, 5).map((m: any) => {
        const incidents = parseFloat(m.incident_count) || 0;
        const posGained = parseFloat(m.positions_gained) || 0;
        const pacePercentile = parseFloat(m.pace_percentile) || 0;
        const iRatingChange = parseFloat(m.irating_change) || 0;
        const stdDev = parseFloat(m.lap_time_std_dev_ms) || 0;
        const finishPos = parseFloat(m.finish_position) || 0;
        const startPos = parseFloat(m.start_position) || 0;
        const computedAt = m.computed_at ? new Date(m.computed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent';

        // Pick the most notable insight for this session
        let insight = '';
        let improvement = '';

        if (incidents === 0 && posGained > 0) {
            insight = `Clean race — zero incidents with ${posGained} positions gained`;
            improvement = iRatingChange > 0 ? `iRating +${Math.round(iRatingChange)}` : 'Solid execution';
        } else if (incidents === 0) {
            insight = 'Clean race completed with zero incidents';
            improvement = 'Building safety rating momentum';
        } else if (pacePercentile > 70) {
            insight = `Strong pace — top ${Math.round(100 - pacePercentile)}% of the field`;
            improvement = posGained > 0 ? `Gained ${posGained} positions` : 'Pace is there, results will follow';
        } else if (posGained >= 3) {
            insight = `Great racecraft — gained ${posGained} positions from P${Math.round(startPos)}`;
            improvement = `Finished P${Math.round(finishPos)}`;
        } else if (stdDev < 800) {
            insight = `Excellent consistency — ${(stdDev / 1000).toFixed(2)}s lap time variation`;
            improvement = 'Machine-like consistency';
        } else {
            insight = incidents > 3 ? `Tough race with ${incidents}x incidents` : `Finished P${Math.round(finishPos)} from P${Math.round(startPos)}`;
            improvement = posGained > 0 ? `Gained ${posGained} positions` : posGained < 0 ? `Lost ${Math.abs(posGained)} positions` : 'Held position';
        }

        return {
            session: m.track_name || 'Recent Session',
            date: computedAt,
            insight,
            improvement,
            metric: iRatingChange !== 0 ? {
                label: 'iRating',
                before: String(Math.round((m.sof || 1500) - iRatingChange)),
                after: String(Math.round(m.sof || 1500)),
            } : stdDev > 0 ? {
                label: 'Lap Std Dev',
                before: `${(stdDev / 1000).toFixed(2)}s`,
                after: pacePercentile > 0 ? `P${Math.round(pacePercentile)}%` : '--',
            } : undefined,
        };
    });
}

function buildCoachingNotes(traits: any[], aggregate: any): string[] {
    const notes: string[] = [];
    if (!aggregate || !aggregate.session_count) {
        notes.push('Complete more sessions to unlock personalized coaching.');
        notes.push('Focus on finishing races cleanly before chasing pace.');
        return notes;
    }

    const sessions = parseFloat(aggregate.session_count) || 0;
    const risk = parseFloat(aggregate.risk_index) || 50;
    const consistency = parseFloat(aggregate.consistency_index) || 0;
    const pace = parseFloat(aggregate.avg_pace_percentile) || 0;
    const posGained = parseFloat(aggregate.avg_positions_gained) || 0;
    const endurance = parseFloat(aggregate.endurance_fitness_index) || 0;

    // Safety-first coaching
    if (risk > 60) {
        notes.push(`Your risk index is ${Math.round(risk)} — reducing incidents should be priority #1. Clean races build SR, confidence, and iRating faster than raw speed.`);
    } else if (risk < 25) {
        notes.push('Your clean racing is excellent. You have the discipline to push harder without losing control.');
    }

    // Consistency coaching
    if (consistency < 40) {
        notes.push('Focus on hitting the same marks every lap. Consistency compounds — a reliable 1:32.5 beats an occasional 1:31.0 with 1:34s mixed in.');
    } else if (consistency > 70) {
        notes.push('Your consistency is a real strength. Now look for small pace gains in specific corners.');
    }

    // Pace coaching
    if (pace < 30 && sessions > 10) {
        notes.push('Study faster drivers\' replays. Focus on one corner per session — brake point, turn-in, and throttle application.');
    } else if (pace > 60) {
        notes.push('Your raw pace is competitive. Focus on converting speed into results through smart racecraft.');
    }

    // Racecraft
    if (posGained < -1) {
        notes.push('You\'re losing positions on average. Work on race starts and first-lap survival — protect what you qualify.');
    } else if (posGained > 2) {
        notes.push('Great racecraft — you consistently gain positions. Keep making clean, decisive moves.');
    }

    // Endurance
    if (endurance < 30 && sessions > 5) {
        notes.push('Your pace drops off in longer stints. Practice maintaining focus and smooth inputs for 20+ consecutive laps.');
    }

    // Trait-specific
    const strengths = traits.filter((t: any) => t.trait_category === 'strength');
    if (strengths.length > 0) {
        notes.push(`Your biggest strength: ${strengths[0].trait_label}. Build your race strategy around it.`);
    }

    return notes.slice(0, 4); // Cap at 4 notes
}

function buildNextSessionPlan(traits: any[], metrics: any[]): any {
    if (!metrics.length) {
        return {
            focus: 'Complete your first session to get a personalized plan',
            drills: ['Run 10 clean practice laps', 'Focus on learning the track layout', 'Don\'t worry about lap times yet'],
            reminder: 'Every expert was once a beginner. Just get laps in.',
        };
    }

    const recentInc = metrics.slice(0, 3).reduce((s: number, m: any) => s + (parseFloat(m.incident_count) || 0), 0) / Math.min(metrics.length, 3);
    const recentStdDev = metrics.slice(0, 3).reduce((s: number, m: any) => s + (parseFloat(m.lap_time_std_dev_ms) || 0), 0) / Math.min(metrics.length, 3);
    const recentPace = metrics.slice(0, 3).reduce((s: number, m: any) => s + (parseFloat(m.pace_percentile) || 0), 0) / Math.min(metrics.length, 3);
    const recentPosGained = metrics.slice(0, 3).reduce((s: number, m: any) => s + (parseFloat(m.positions_gained) || 0), 0) / Math.min(metrics.length, 3);

    // Priority: incidents → consistency → pace → racecraft
    if (recentInc > 4) {
        return {
            focus: 'Incident Reduction Session',
            drills: [
                'Run 10 practice laps at 90% pace, focusing on clean lines',
                'In the race, leave extra space in braking zones — brake 5m earlier',
                'If someone is faster behind you, let them by cleanly',
            ],
            reminder: 'A clean P15 gains more iRating than a DNF from P5. Survive first, compete second.',
        };
    }

    if (recentStdDev > 2000) {
        return {
            focus: 'Consistency Training',
            drills: [
                'Run 15 practice laps trying to hit the exact same time every lap',
                'Pick 3 reference points per corner and hit them every lap',
                'In the race, ignore the cars around you — focus on your rhythm',
            ],
            reminder: 'Consistency is the foundation of speed. Nail the basics before chasing tenths.',
        };
    }

    if (recentPace < 35) {
        return {
            focus: 'Pace Development',
            drills: [
                'Watch the fastest replay and note 3 differences in braking/turn-in',
                'Focus on one corner per run — try different lines and brake points',
                'Run 5 qualifying-style laps: full push, then analyze',
            ],
            reminder: 'Speed comes from precision, not aggression. Smooth is fast.',
        };
    }

    if (recentPosGained < -1) {
        return {
            focus: 'Race Start & Position Defense',
            drills: [
                'Practice race starts in test sessions — focus on clean getaways',
                'In traffic, focus on exit speed over entry speed',
                'Defend the inside line into braking zones, but yield if alongside',
            ],
            reminder: 'The first lap sets the tone. Stay calm, stay clean, stay in it.',
        };
    }

    // Default: balanced improvement
    const weaknesses = traits.filter((t: any) => t.trait_category === 'weakness');
    const focusArea = weaknesses.length > 0 ? weaknesses[0].trait_label : 'overall performance';

    return {
        focus: `Continue developing ${focusArea}`,
        drills: [
            'Warm up with 5 smooth laps before pushing',
            `Focus on ${focusArea.toLowerCase()} during practice`,
            'Set a mini-goal for the race: one specific thing to improve',
        ],
        reminder: 'You\'re making progress. Trust the process and stay patient.',
    };
}

// ========================
// Gamification: XP, Levels, Streaks, Achievements
// ========================

interface GamificationData {
    xp: number;
    level: number;
    levelName: string;
    xpToNextLevel: number;
    xpInCurrentLevel: number;
    cleanStreak: number;
    bestCleanStreak: number;
    totalAchievements: number;
    recentAchievements: { id: string; title: string; description: string; earnedAt: string; icon: string }[];
}

const LEVEL_THRESHOLDS = [
    { xp: 0, name: 'Rookie' },
    { xp: 100, name: 'Novice' },
    { xp: 300, name: 'Clubman' },
    { xp: 600, name: 'Amateur' },
    { xp: 1000, name: 'Semi-Pro' },
    { xp: 1500, name: 'Professional' },
    { xp: 2200, name: 'Expert' },
    { xp: 3000, name: 'Master' },
    { xp: 4000, name: 'Grand Master' },
    { xp: 5500, name: 'Legend' },
];

function calculateGamification(aggregate: any, metrics: any[]): GamificationData {
    // XP sources:
    //   - 10 XP per session completed
    //   - 5 bonus XP for clean race (0 incidents)
    //   - 3 bonus XP per position gained
    //   - 5 bonus XP for top-5 finish
    //   - 10 bonus XP for a win (P1)
    //   - 2 bonus XP for pace percentile > 50
    //   - 3 bonus XP for consistency index > 60 (from aggregate)

    const sessions = parseFloat(aggregate?.session_count) || 0;
    let xp = sessions * 10; // Base XP

    // Bonus from aggregate stats
    const consistency = parseFloat(aggregate?.consistency_index) || 0;
    if (consistency > 60) xp += sessions * 3;
    if (consistency > 80) xp += sessions * 2;

    const pace = parseFloat(aggregate?.avg_pace_percentile) || 0;
    if (pace > 50) xp += sessions * 2;
    if (pace > 75) xp += sessions * 2;

    // Per-session bonuses from recent metrics
    let cleanStreak = 0;
    let bestCleanStreak = 0;
    let currentStreak = 0;

    metrics.forEach((m: any) => {
        const inc = parseFloat(m.incident_count) || 0;
        const pos = parseFloat(m.finish_position) || 99;
        const posGained = parseFloat(m.positions_gained) || 0;

        if (inc === 0) {
            xp += 5;
            currentStreak++;
            bestCleanStreak = Math.max(bestCleanStreak, currentStreak);
        } else {
            currentStreak = 0;
        }
        if (pos <= 5) xp += 5;
        if (pos === 1) xp += 10;
        if (posGained > 0) xp += Math.min(posGained * 3, 15);
    });

    // The clean streak is from the most recent sessions (metrics are ordered newest first)
    cleanStreak = 0;
    for (const m of metrics) {
        if ((parseFloat(m.incident_count) || 0) === 0) cleanStreak++;
        else break;
    }

    // Determine level
    let level = 0;
    let levelName = 'Rookie';
    let xpToNextLevel = LEVEL_THRESHOLDS[1]?.xp || 100;
    let xpInCurrentLevel = xp;

    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
        if (xp >= LEVEL_THRESHOLDS[i].xp) {
            level = i;
            levelName = LEVEL_THRESHOLDS[i].name;
            xpInCurrentLevel = xp - LEVEL_THRESHOLDS[i].xp;
            xpToNextLevel = (LEVEL_THRESHOLDS[i + 1]?.xp || LEVEL_THRESHOLDS[i].xp + 1000) - LEVEL_THRESHOLDS[i].xp;
            break;
        }
    }

    // Achievements
    const achievements: GamificationData['recentAchievements'] = [];

    if (sessions >= 1) achievements.push({ id: 'first-race', title: 'First Race', description: 'Completed your first session', earnedAt: '', icon: 'flag' });
    if (sessions >= 10) achievements.push({ id: '10-races', title: 'Getting Serious', description: 'Completed 10 sessions', earnedAt: '', icon: 'trophy' });
    if (sessions >= 50) achievements.push({ id: '50-races', title: 'Veteran', description: 'Completed 50 sessions', earnedAt: '', icon: 'medal' });
    if (sessions >= 100) achievements.push({ id: '100-races', title: 'Centurion', description: 'Completed 100 sessions', earnedAt: '', icon: 'star' });
    if (bestCleanStreak >= 3) achievements.push({ id: 'clean-3', title: 'Clean Sweep', description: '3 consecutive clean races', earnedAt: '', icon: 'shield' });
    if (bestCleanStreak >= 5) achievements.push({ id: 'clean-5', title: 'Spotless', description: '5 consecutive clean races', earnedAt: '', icon: 'shield' });
    if (bestCleanStreak >= 10) achievements.push({ id: 'clean-10', title: 'Untouchable', description: '10 consecutive clean races', earnedAt: '', icon: 'shield' });
    if (pace > 70) achievements.push({ id: 'pace-70', title: 'Quick', description: 'Top 30% pace in the field', earnedAt: '', icon: 'zap' });
    if (pace > 90) achievements.push({ id: 'pace-90', title: 'Alien Pace', description: 'Top 10% pace in the field', earnedAt: '', icon: 'zap' });
    if (consistency > 70) achievements.push({ id: 'consistent-70', title: 'Metronome', description: 'Consistency index above 70', earnedAt: '', icon: 'target' });
    if (consistency > 90) achievements.push({ id: 'consistent-90', title: 'Machine', description: 'Consistency index above 90', earnedAt: '', icon: 'target' });

    return {
        xp: Math.round(xp),
        level,
        levelName,
        xpToNextLevel,
        xpInCurrentLevel: Math.round(xpInCurrentLevel),
        cleanStreak,
        bestCleanStreak,
        totalAchievements: achievements.length,
        recentAchievements: achievements.slice(-5),
    };
}

function buildJourneyTimeline(metrics: any[], aggregate: any): any[] {
    const timeline: any[] = [];

    if (!metrics.length) return timeline;

    // This week's sessions
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Summarize recent sessions into timeline entries
    const thisWeek = metrics.filter((m: any) => m.computed_at && new Date(m.computed_at) > weekAgo);
    const lastWeek = metrics.filter((m: any) => m.computed_at && new Date(m.computed_at) > twoWeeksAgo && new Date(m.computed_at) <= weekAgo);

    if (thisWeek.length > 0) {
        const avgInc = thisWeek.reduce((s: number, m: any) => s + (parseFloat(m.incident_count) || 0), 0) / thisWeek.length;
        const avgPace = thisWeek.reduce((s: number, m: any) => s + (parseFloat(m.pace_percentile) || 0), 0) / thisWeek.length;
        const iRChange = thisWeek.reduce((s: number, m: any) => s + (parseFloat(m.irating_change) || 0), 0);
        timeline.push({
            period: 'This Week',
            sessions: thisWeek.length,
            summary: `${thisWeek.length} session${thisWeek.length > 1 ? 's' : ''} — ${avgInc < 1 ? 'clean racing' : `${avgInc.toFixed(1)} avg incidents`}, pace P${Math.round(avgPace)}%`,
            iRatingChange: Math.round(iRChange),
            highlight: avgInc === 0 ? 'perfect-week' : iRChange > 0 ? 'positive' : 'neutral',
        });
    }

    if (lastWeek.length > 0) {
        const avgInc = lastWeek.reduce((s: number, m: any) => s + (parseFloat(m.incident_count) || 0), 0) / lastWeek.length;
        const iRChange = lastWeek.reduce((s: number, m: any) => s + (parseFloat(m.irating_change) || 0), 0);
        timeline.push({
            period: 'Last Week',
            sessions: lastWeek.length,
            summary: `${lastWeek.length} session${lastWeek.length > 1 ? 's' : ''} — ${avgInc.toFixed(1)} avg incidents`,
            iRatingChange: Math.round(iRChange),
            highlight: iRChange > 0 ? 'positive' : 'neutral',
        });
    }

    // Overall summary
    if (aggregate) {
        const sessions = parseFloat(aggregate.session_count) || 0;
        const pace = parseFloat(aggregate.avg_pace_percentile) || 0;
        timeline.push({
            period: 'All Time',
            sessions: Math.round(sessions),
            summary: `${Math.round(sessions)} total sessions — pace P${Math.round(pace)}%`,
            iRatingChange: null,
            highlight: 'milestone',
        });
    }

    return timeline;
}

function buildGrowthStats(aggregate: any, metrics: any[]): any {
    const sessions = parseFloat(aggregate?.session_count) || 0;
    const pace = parseFloat(aggregate?.avg_pace_percentile) || 0;
    const consistency = parseFloat(aggregate?.consistency_index) || 0;
    const safety = Math.max(0, 100 - (parseFloat(aggregate?.risk_index) || 50));

    // Count clean races from metrics
    const cleanRaces = metrics.filter((m: any) => (parseFloat(m.incident_count) || 0) === 0).length;
    const totalIRChange = metrics.reduce((s: number, m: any) => s + (parseFloat(m.irating_change) || 0), 0);

    // Count skills at various levels (from skill tree)
    const skillTree = buildSkillTree(aggregate, []);
    let skillsImproved = 0;
    skillTree.forEach((cat: any) => cat.skills.forEach((s: any) => { if (s.level >= 2) skillsImproved++; }));

    return {
        sessionsCompleted: Math.round(sessions),
        cleanRaces,
        skillsImproved,
        iRatingChange: Math.round(totalIRChange),
        pacePercentile: Math.round(pace),
        consistencyIndex: Math.round(consistency),
        safetyScore: Math.round(safety),
    };
}

export default router;
