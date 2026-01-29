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
import { backfillDriverHistory } from '../services/idp/iracing-sync.service.js';
import { getMetricsForDriver } from '../../db/repositories/session-metrics.repo.js';
import { getAllAggregatesForDriver, getGlobalAggregate } from '../../db/repositories/driver-aggregates.repo.js';
import { getCurrentTraits } from '../../db/repositories/driver-traits.repo.js';
import { getReportsForDriver } from '../../db/repositories/driver-reports.repo.js';
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

// Helper functions for development data

function determineDevelopmentPhase(aggregate: any, traits: any[]): string {
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

function buildFocusAreas(traits: any[], metrics: any[]): any[] {
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

function buildSkillTree(aggregate: any, traits: any[]): any[] {
    const categories = [
        {
            category: 'Car Control',
            skills: [
                { name: 'Throttle Control', level: 1, maxLevel: 3, progress: 30, status: 'learning' as const, description: 'Smooth throttle application' },
                { name: 'Braking', level: 1, maxLevel: 3, progress: 30, status: 'learning' as const, description: 'Consistent braking points' },
                { name: 'Weight Transfer', level: 1, maxLevel: 3, progress: 0, status: 'next' as const, description: 'Use weight to rotate' },
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

function buildCoachingNotes(traits: any[], aggregate: any): string[] {
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

function buildNextSessionPlan(traits: any[], metrics: any[]): any {
    return {
        focus: metrics.length > 0 ? 'Continue building consistency' : 'Complete your first session',
        drills: [
            'Focus on hitting your marks consistently',
            'Practice smooth inputs',
            'Stay aware of cars around you',
        ],
        reminder: 'Progress comes from consistent practice, not single heroic laps.',
    };
}

export default router;
