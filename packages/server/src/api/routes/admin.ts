// =====================================================================
// Admin Routes
// Internal admin functionality for users and licenses
// =====================================================================

import { Router, Request, Response } from 'express';
import type {
    CreateAdminUserRequest,
    CreateLicenseRequest,
    UpdateLicenseRequest,
    AssignRoleRequest,
    AdminRole
} from '@controlbox/common';
import { requireAuth, requireSuperAdmin } from '../middleware/auth.js';
import { getAuthService } from '../../services/auth/auth-service.js';
import { getLicenseService } from '../../services/licensing/license-service.js';
import { pool } from '../../db/client.js';
import { getActiveRuns, getStreamDiagnostics } from '../../services/telemetry/telemetry-streams.js';
import { getRunState } from '../../services/telemetry/behavioral-worker.js';

const router = Router();

// All admin routes require authentication
router.use(requireAuth);

// ========================
// User Management
// ========================

/**
 * List all users (super admin only)
 * GET /api/admin/users
 */
router.get('/users', requireSuperAdmin, async (_req: Request, res: Response): Promise<void> => {
    try {
        const result = await pool.query(
            `SELECT id, email, display_name, is_super_admin, is_active, email_verified, last_login_at, created_at
             FROM admin_users
             ORDER BY created_at DESC`
        );

        res.json({
            success: true,
            data: result.rows.map(row => ({
                id: row.id,
                email: row.email,
                displayName: row.display_name,
                isSuperAdmin: row.is_super_admin,
                isActive: row.is_active,
                emailVerified: row.email_verified,
                lastLoginAt: row.last_login_at,
                createdAt: row.created_at
            })),
            meta: { totalCount: result.rows.length }
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            error: { code: 'FETCH_ERROR', message: 'Failed to fetch users' }
        });
    }
});

/**
 * Create a new user (super admin only)
 * POST /api/admin/users
 */
router.post('/users', requireSuperAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
        const request = req.body as CreateAdminUserRequest;

        if (!request.email || !request.password || !request.displayName) {
            res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Email, password, and displayName are required' }
            });
            return;
        }

        if (request.password.length < 8) {
            res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters' }
            });
            return;
        }

        const authService = getAuthService();

        // Check if email already exists
        const existing = await authService.getUserByEmail(request.email);
        if (existing) {
            res.status(409).json({
                success: false,
                error: { code: 'DUPLICATE_EMAIL', message: 'A user with this email already exists' }
            });
            return;
        }

        const user = await authService.createUser(
            request.email,
            request.password,
            request.displayName,
            request.isSuperAdmin ?? false
        );

        res.status(201).json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({
            success: false,
            error: { code: 'CREATE_ERROR', message: 'Failed to create user' }
        });
    }
});

/**
 * Deactivate a user (super admin only)
 * DELETE /api/admin/users/:id
 */
router.delete('/users/:id', requireSuperAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
        const authService = getAuthService();
        await authService.deactivateUser(req.params.id);

        res.json({
            success: true,
            data: { deactivated: true }
        });
    } catch (error) {
        console.error('Error deactivating user:', error);
        res.status(500).json({
            success: false,
            error: { code: 'DELETE_ERROR', message: 'Failed to deactivate user' }
        });
    }
});

// ========================
// Role Management
// ========================

/**
 * Assign a role to a user
 * POST /api/admin/roles
 */
router.post('/roles', requireSuperAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
        const request = req.body as AssignRoleRequest;

        if (!request.adminUserId || !request.leagueId || !request.role) {
            res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'adminUserId, leagueId, and role are required' }
            });
            return;
        }

        const validRoles: AdminRole[] = ['Owner', 'RaceControl', 'Steward', 'Broadcaster', 'ReadOnly'];
        if (!validRoles.includes(request.role)) {
            res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: `Role must be one of: ${validRoles.join(', ')}` }
            });
            return;
        }

        const result = await pool.query(
            `INSERT INTO admin_user_league_roles (admin_user_id, league_id, series_id, season_id, role, granted_by)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (admin_user_id, league_id, series_id, season_id, role) DO UPDATE SET updated_at = NOW()
             RETURNING *`,
            [
                request.adminUserId,
                request.leagueId,
                request.seriesId ?? null,
                request.seasonId ?? null,
                request.role,
                req.user!.id
            ]
        );

        res.status(201).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error assigning role:', error);
        res.status(500).json({
            success: false,
            error: { code: 'CREATE_ERROR', message: 'Failed to assign role' }
        });
    }
});

/**
 * Remove a role from a user
 * DELETE /api/admin/roles/:id
 */
router.delete('/roles/:id', requireSuperAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
        await pool.query(
            `DELETE FROM admin_user_league_roles WHERE id = $1`,
            [req.params.id]
        );

        res.json({
            success: true,
            data: { deleted: true }
        });
    } catch (error) {
        console.error('Error removing role:', error);
        res.status(500).json({
            success: false,
            error: { code: 'DELETE_ERROR', message: 'Failed to remove role' }
        });
    }
});

// ========================
// License Management
// ========================

/**
 * List all licenses
 * GET /api/admin/licenses
 */
router.get('/licenses', requireSuperAdmin, async (_req: Request, res: Response): Promise<void> => {
    try {
        const licenseService = getLicenseService();
        const licenses = await licenseService.getAll();

        res.json({
            success: true,
            data: licenses,
            meta: { totalCount: licenses.length }
        });
    } catch (error) {
        console.error('Error fetching licenses:', error);
        res.status(500).json({
            success: false,
            error: { code: 'FETCH_ERROR', message: 'Failed to fetch licenses' }
        });
    }
});

/**
 * Create a license
 * POST /api/admin/licenses
 */
router.post('/licenses', requireSuperAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
        const request = req.body as CreateLicenseRequest;

        if (!request.leagueId || !request.seriesId || !request.seasonId ||
            !request.startDate || !request.endDate) {
            res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'leagueId, seriesId, seasonId, startDate, endDate are required' }
            });
            return;
        }

        const licenseService = getLicenseService();
        const license = await licenseService.create(request);

        res.status(201).json({
            success: true,
            data: license
        });
    } catch (error) {
        console.error('Error creating license:', error);
        res.status(500).json({
            success: false,
            error: { code: 'CREATE_ERROR', message: 'Failed to create license' }
        });
    }
});

/**
 * Update a license
 * PATCH /api/admin/licenses/:id
 */
router.patch('/licenses/:id', requireSuperAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
        const updates = req.body as UpdateLicenseRequest;

        const licenseService = getLicenseService();
        const license = await licenseService.update(req.params.id, updates);

        if (!license) {
            res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'License not found' }
            });
            return;
        }

        res.json({
            success: true,
            data: license
        });
    } catch (error) {
        console.error('Error updating license:', error);
        res.status(500).json({
            success: false,
            error: { code: 'UPDATE_ERROR', message: 'Failed to update license' }
        });
    }
});

/**
 * Activate a license
 * POST /api/admin/licenses/:id/activate
 */
router.post('/licenses/:id/activate', requireSuperAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
        const licenseService = getLicenseService();
        const license = await licenseService.activateLicense(req.params.id);

        if (!license) {
            res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'License not found' }
            });
            return;
        }

        res.json({
            success: true,
            data: license
        });
    } catch (error) {
        console.error('Error activating license:', error);
        res.status(500).json({
            success: false,
            error: { code: 'UPDATE_ERROR', message: 'Failed to activate license' }
        });
    }
});

/**
 * Suspend a license
 * POST /api/admin/licenses/:id/suspend
 */
router.post('/licenses/:id/suspend', requireSuperAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
        const licenseService = getLicenseService();
        const license = await licenseService.suspendLicense(req.params.id);

        if (!license) {
            res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'License not found' }
            });
            return;
        }

        res.json({
            success: true,
            data: license
        });
    } catch (error) {
        console.error('Error suspending license:', error);
        res.status(500).json({
            success: false,
            error: { code: 'UPDATE_ERROR', message: 'Failed to suspend license' }
        });
    }
});

// ========================
// Telemetry Diagnostics
// ========================

/**
 * Get telemetry stream health for all active runs
 * GET /api/admin/telemetry/streams
 */
router.get('/telemetry/streams', requireSuperAdmin, async (_req: Request, res: Response): Promise<void> => {
    try {
        const activeRuns = await getActiveRuns();
        
        const streams = await Promise.all(
            activeRuns.map(async (runId) => {
                const diagnostics = await getStreamDiagnostics(runId);
                const workerState = getRunState(runId);
                
                return {
                    runId,
                    stream: diagnostics,
                    worker: workerState ? {
                        totalTicks: workerState.totalTicks,
                        currentLap: workerState.currentLap,
                        lastTs: workerState.lastTs,
                        ageMs: Date.now() - workerState.lastTs,
                        behavioral: workerState.smoothedBehavioral,
                        reliability: workerState.pillars.reliability,
                        rotationSamples: workerState.rotationSampleCount,
                        overRotationEvents: workerState.overRotationEvents,
                        underRotationEvents: workerState.underRotationEvents,
                    } : null
                };
            })
        );

        res.json({
            success: true,
            data: {
                activeRunCount: activeRuns.length,
                streams,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error fetching telemetry diagnostics:', error);
        res.status(500).json({
            success: false,
            error: { code: 'FETCH_ERROR', message: 'Failed to fetch telemetry diagnostics' }
        });
    }
});

/**
 * Get detailed diagnostics for a specific run
 * GET /api/admin/telemetry/streams/:runId
 */
router.get('/telemetry/streams/:runId', requireSuperAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
        const { runId } = req.params;
        const diagnostics = await getStreamDiagnostics(runId);
        const workerState = getRunState(runId);

        if (!diagnostics && !workerState) {
            res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Run not found' }
            });
            return;
        }

        res.json({
            success: true,
            data: {
                runId,
                stream: diagnostics,
                worker: workerState ? {
                    runId: workerState.runId,
                    userId: workerState.userId,
                    sessionId: workerState.sessionId,
                    totalTicks: workerState.totalTicks,
                    currentLap: workerState.currentLap,
                    lapTimes: workerState.lapTimes,
                    lastTs: workerState.lastTs,
                    startTs: workerState.startTs,
                    ageMs: Date.now() - workerState.lastTs,
                    durationMs: Date.now() - workerState.startTs,
                    pillars: workerState.pillars,
                    behavioral: workerState.behavioral,
                    smoothedBehavioral: workerState.smoothedBehavioral,
                    // Rotation control details
                    rotationSampleCount: workerState.rotationSampleCount,
                    overRotationEvents: workerState.overRotationEvents,
                    underRotationEvents: workerState.underRotationEvents,
                    yawRateAvg: workerState.yawRateCount > 0 
                        ? workerState.yawRateSum / workerState.yawRateCount 
                        : null,
                    // Braking details
                    brakeOnsetCount: workerState.brakeOnsetCount,
                    brakeSmoothCount: workerState.brakeSmoothCount,
                    absTicks: workerState.absTicks,
                    trailBrakeTicks: workerState.trailBrakeTicks,
                    // Throttle details
                    throttleOnsetCount: workerState.throttleOnsetCount,
                    throttleSmoothCount: workerState.throttleSmoothCount,
                    throttleModulationTicks: workerState.throttleModulationTicks,
                    // Steering details
                    steerCorrectionCount: workerState.steerCorrectionCount,
                    turnInCount: workerState.turnInCount,
                    midCornerSteerChanges: workerState.midCornerSteerChanges,
                    // Quality
                    avgFps: workerState.fpsCount > 0 
                        ? workerState.fpsSum / workerState.fpsCount 
                        : null,
                    avgLatency: workerState.latencyCount > 0 
                        ? workerState.latencySum / workerState.latencyCount 
                        : null,
                    coaching: workerState.coaching,
                    warnings: workerState.warnings,
                } : null,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error fetching run diagnostics:', error);
        res.status(500).json({
            success: false,
            error: { code: 'FETCH_ERROR', message: 'Failed to fetch run diagnostics' }
        });
    }
});

// ========================
// View As User (Admin Impersonation - Read Only)
// ========================

/**
 * Get comprehensive user snapshot for admin review
 * GET /api/admin/users/:userId/view
 * 
 * Returns: account info, driver profile, entitlements, linked accounts,
 * behavioral metrics, recent sessions, teams, and goals.
 */
router.get('/users/:userId/view', requireSuperAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;

        // 1. Account info
        const userResult = await pool.query(
            `SELECT id, email, display_name, is_super_admin, is_active, email_verified, last_login_at, created_at, updated_at
             FROM admin_users WHERE id = $1`, [userId]
        );
        if (userResult.rows.length === 0) {
            res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
            return;
        }
        const account = userResult.rows[0];

        // 2. Driver profile
        const profileResult = await pool.query(
            `SELECT * FROM driver_profiles WHERE user_account_id = $1`, [userId]
        );
        const driverProfile = profileResult.rows[0] || null;

        // 3. Entitlements
        const entitlementResult = await pool.query(
            `SELECT id, product, status, source, starts_at, expires_at, created_at
             FROM entitlements WHERE user_id = $1 ORDER BY created_at DESC`, [userId]
        );

        // 4. Linked iRacing account
        const iracingResult = await pool.query(
            `SELECT iracing_customer_id, iracing_display_name, is_valid, last_used_at, created_at
             FROM iracing_oauth_tokens WHERE admin_user_id = $1`, [userId]
        );

        // 5. Linked racing identities (from driver profile)
        let linkedIdentities: any[] = [];
        if (driverProfile) {
            const identResult = await pool.query(
                `SELECT platform, platform_user_id, platform_display_name, verified_at, sync_status, created_at
                 FROM linked_racing_identities WHERE driver_profile_id = $1`, [driverProfile.id]
            );
            linkedIdentities = identResult.rows;
        }

        // 6. Behavioral aggregates
        let behavioralAggregates: any[] = [];
        if (driverProfile) {
            const behavResult = await pool.query(
                `SELECT time_window, avg_bsi, avg_tci, avg_cpi2, avg_rci, avg_behavioral_stability,
                        bsi_trend, tci_trend, cpi2_trend, rci_trend,
                        session_count, total_laps_analyzed, avg_telemetry_confidence, computed_at
                 FROM driver_behavioral_aggregates
                 WHERE driver_profile_id = $1 AND car_name IS NULL AND track_name IS NULL
                 ORDER BY time_window`, [driverProfile.id]
            );
            behavioralAggregates = behavResult.rows;
        }

        // 7. Recent sessions
        let recentSessions: any[] = [];
        if (driverProfile) {
            const sessResult = await pool.query(
                `SELECT s.id, s.track_name, s.car_name, s.session_type, s.created_at,
                        sm.finish_position, sm.best_lap_time_ms, sm.incident_count, sm.irating_change
                 FROM sessions s
                 LEFT JOIN session_metrics sm ON sm.session_id = s.id AND sm.driver_profile_id = $1
                 WHERE s.id IN (
                     SELECT DISTINCT session_id FROM session_metrics WHERE driver_profile_id = $1
                 )
                 ORDER BY s.created_at DESC LIMIT 10`, [driverProfile.id]
            );
            recentSessions = sessResult.rows;
        }

        // 8. Teams
        let teams: any[] = [];
        if (driverProfile) {
            const teamResult = await pool.query(
                `SELECT t.id as team_id, t.name as team_name, tm.role, tm.status, tm.joined_at
                 FROM team_members tm
                 JOIN teams t ON tm.team_id = t.id
                 WHERE tm.driver_profile_id = $1
                 ORDER BY tm.joined_at DESC`, [driverProfile.id]
            );
            teams = teamResult.rows;
        }

        // 9. Development goals
        let goals: any[] = [];
        if (driverProfile) {
            const goalsResult = await pool.query(
                `SELECT id, title, category, status, priority, target_value, current_value, created_at
                 FROM development_goals
                 WHERE driver_profile_id = $1
                 ORDER BY status ASC, priority ASC, created_at DESC LIMIT 10`, [driverProfile.id]
            );
            goals = goalsResult.rows;
        }

        // 10. Traits
        let traits: any[] = [];
        if (driverProfile) {
            const traitsResult = await pool.query(
                `SELECT trait_key, trait_label, trait_category, confidence, evidence_summary
                 FROM driver_traits
                 WHERE driver_profile_id = $1 AND (valid_until IS NULL OR valid_until > NOW())
                 ORDER BY confidence DESC LIMIT 10`, [driverProfile.id]
            );
            traits = traitsResult.rows;
        }

        // 11. League roles
        const rolesResult = await pool.query(
            `SELECT r.role, r.league_id, l.name as league_name, r.created_at
             FROM admin_user_league_roles r
             LEFT JOIN leagues l ON r.league_id = l.id
             WHERE r.admin_user_id = $1
             ORDER BY r.created_at DESC`, [userId]
        );

        // 12. Audit log (last 20 actions by this user)
        const auditResult = await pool.query(
            `SELECT action, entity_type, entity_id, description, created_at
             FROM audit_log WHERE actor_id = $1
             ORDER BY created_at DESC LIMIT 20`, [userId]
        );

        res.json({
            success: true,
            data: {
                account: {
                    id: account.id,
                    email: account.email,
                    displayName: account.display_name,
                    isSuperAdmin: account.is_super_admin,
                    isActive: account.is_active,
                    emailVerified: account.email_verified,
                    lastLoginAt: account.last_login_at,
                    createdAt: account.created_at,
                    updatedAt: account.updated_at,
                },
                driverProfile: driverProfile ? {
                    id: driverProfile.id,
                    displayName: driverProfile.display_name,
                    bio: driverProfile.bio,
                    primaryDiscipline: driverProfile.primary_discipline,
                    privacyLevel: driverProfile.privacy_level,
                    totalSessions: driverProfile.total_sessions,
                    totalLaps: driverProfile.total_laps,
                    totalIncidents: driverProfile.total_incidents,
                    createdAt: driverProfile.created_at,
                } : null,
                entitlements: entitlementResult.rows,
                iracingAccount: iracingResult.rows[0] || null,
                linkedIdentities,
                behavioralAggregates,
                recentSessions,
                teams,
                goals,
                traits,
                leagueRoles: rolesResult.rows,
                recentAuditLog: auditResult.rows,
            }
        });
    } catch (error) {
        console.error('Error fetching user view:', error);
        res.status(500).json({
            success: false,
            error: { code: 'FETCH_ERROR', message: 'Failed to fetch user data' }
        });
    }
});

export default router;
