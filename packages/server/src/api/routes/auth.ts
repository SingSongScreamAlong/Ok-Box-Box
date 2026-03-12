// =====================================================================
// Auth Routes
// Login, logout, token refresh, current user
// =====================================================================

import { Router, Request, Response } from 'express';
import type { LoginRequest, RefreshTokenRequest } from '@controlbox/common';
import { getAuthService } from '../../services/auth/auth-service.js';
import { requireAuth } from '../middleware/auth.js';
import { pool } from '../../db/client.js';
import { config } from '../../config/index.js';
import { getEntitlementRepository, deriveCapabilitiesFromEntitlements } from '../../services/billing/entitlement-service.js';

const router = Router();

/**
 * Login
 * POST /api/auth/login
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
    try {
        const loginRequest = req.body as LoginRequest;

        if (!loginRequest.email || !loginRequest.password) {
            res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Email and password are required' }
            });
            return;
        }

        const authService = getAuthService();
        const result = await authService.login(
            loginRequest,
            req.headers['user-agent'],
            req.ip
        );

        if (!result) {
            res.status(401).json({
                success: false,
                error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
            });
            return;
        }

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'LOGIN_ERROR', message: 'Login failed' }
        });
    }
});

/**
 * Register (create free account)
 * POST /api/auth/register
 * 
 * Creates a FREE Ok, Box Box account.
 * No payment required. All users must have an account.
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, displayName } = req.body as {
            email?: string;
            password?: string;
            displayName?: string;
        };

        // Validate required fields
        if (!email || !password) {
            res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Email and password are required' }
            });
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Invalid email format' }
            });
            return;
        }

        // Validate password length
        if (password.length < 8) {
            res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters' }
            });
            return;
        }

        const authService = getAuthService();

        // Check if user already exists
        const existingUser = await authService.getUserByEmail(email.toLowerCase());
        if (existingUser) {
            res.status(409).json({
                success: false,
                error: { code: 'EMAIL_EXISTS', message: 'An account with this email already exists' }
            });
            return;
        }

        // Create the user (NOT super admin)
        const user = await authService.createUser(
            email.toLowerCase(),
            password,
            displayName || email.split('@')[0],
            false // Not super admin
        );

        console.log(`[Auth] New account created: ${user.email}`);

        // Auto-login the new user
        const loginResult = await authService.login(
            { email: email.toLowerCase(), password },
            req.headers['user-agent'],
            req.ip
        );

        res.status(201).json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    displayName: user.displayName
                },
                ...loginResult
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'REGISTRATION_ERROR', message: 'Registration failed' }
        });
    }
});

/**
 * Logout (revoke refresh token)
 * POST /api/auth/logout
 */
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
    try {
        const { refreshToken } = req.body as { refreshToken?: string };

        if (refreshToken) {
            const authService = getAuthService();
            await authService.revokeRefreshToken(refreshToken);
        }

        res.json({
            success: true,
            data: { message: 'Logged out successfully' }
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'LOGOUT_ERROR', message: 'Logout failed' }
        });
    }
});

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
    try {
        const { refreshToken } = req.body as RefreshTokenRequest;

        if (!refreshToken) {
            res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Refresh token is required' }
            });
            return;
        }

        const authService = getAuthService();
        const result = await authService.refreshAccessToken(
            refreshToken,
            req.headers['user-agent'],
            req.ip
        );

        if (!result) {
            res.status(401).json({
                success: false,
                error: { code: 'TOKEN_INVALID', message: 'Invalid or expired refresh token' }
            });
            return;
        }

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'REFRESH_ERROR', message: 'Token refresh failed' }
        });
    }
});

/**
 * Get current user
 * GET /api/auth/me
 */
router.get('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        res.json({
            success: true,
            data: {
                user: req.user
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'FETCH_ERROR', message: 'Failed to get user info' }
        });
    }
});

/**
 * Get user entitlements (for Relay + Web clients)
 * GET /api/auth/entitlements
 * 
 * Returns products, roles, and defaults for unified auth.
 */
router.get('/entitlements', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user!;

        const entitlementRepo = getEntitlementRepository();
        const dbEntitlements = await entitlementRepo.getForUser(user.id);

        const active = dbEntitlements.filter(e => e.status === 'active' || e.status === 'trial');
        const hasDriver = user.isSuperAdmin || active.some(e => e.product === 'driver' || e.product === 'bundle');
        const hasTeam   = user.isSuperAdmin || active.some(e => e.product === 'team'   || e.product === 'bundle');
        const hasLeague = user.isSuperAdmin || active.some(e => e.product === 'league' || e.product === 'bundle');

        // Highest active tier for legacy blackbox.tier field
        const tier = hasLeague ? 'LEAGUE' : hasTeam ? 'TEAM' : hasDriver ? 'DRIVER' : 'FREE';

        const roles: string[] = [];
        if (hasDriver) roles.push('DRIVER');
        if (hasTeam)   roles.push('TEAM');
        if (hasLeague) roles.push('RACE_CONTROL');
        if (user.isSuperAdmin) roles.push('ADMIN');

        const entitlements = {
            userId: user.id,
            orgId: undefined,
            roles,
            products: {
                blackbox: { enabled: hasDriver, tier },
                controlbox: { enabled: hasLeague || user.isSuperAdmin }
            },
            defaults: { preferredMode: 'DRIVER' as const }
        };

        res.json({ success: true, data: entitlements });
    } catch (error) {
        console.error('Get entitlements error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'FETCH_ERROR', message: 'Failed to get entitlements' }
        });
    }
});

/**
 * Bootstrap endpoint - SINGLE SOURCE OF TRUTH
 * GET /api/auth/me/bootstrap
 * 
 * Returns everything needed to initialize any client (web or relay):
 * - User info
 * - Memberships (teams/leagues)
 * - Licenses (derived from active entitlements)
 * - Capabilities (runtime truth that gates routes/surfaces)
 * - UI defaults (landing + available surfaces)
 * 
 * RULE: App should NEVER branch on license name — only capabilities.
 * RULE: Capabilities are derived ONLY from entitlements table.
 */
router.get('/me/bootstrap', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user!;

        // =====================================================
        // LOAD ENTITLEMENTS FROM DATABASE
        // =====================================================
        const entitlementRepo = getEntitlementRepository();
        const entitlements = await entitlementRepo.getForUser(user.id);

        // =====================================================
        // MEMBERSHIPS — read from team_memberships and admin_user_league_roles
        // =====================================================
        const [teamRows, leagueRows] = await Promise.all([
            pool.query<{ id: string; name: string; role: string }>(
                `SELECT t.id, t.name, tm.role
                 FROM team_memberships tm
                 JOIN driver_profiles dp ON dp.id = tm.driver_profile_id
                 JOIN teams t ON t.id = tm.team_id
                 WHERE dp.user_account_id = $1
                   AND tm.status = 'active'`,
                [user.id]
            ),
            pool.query<{ id: string; name: string; role: string }>(
                `SELECT DISTINCT ON (l.id) l.id, l.name, aulr.role::text AS role
                 FROM admin_user_league_roles aulr
                 JOIN leagues l ON l.id = aulr.league_id
                 WHERE aulr.admin_user_id = $1
                 ORDER BY l.id, aulr.granted_at DESC`,
                [user.id]
            ),
        ]);
        const memberships = {
            teams:   teamRows.rows.map(r => ({ id: r.id, name: r.name, role: r.role })),
            leagues: leagueRows.rows.map(r => ({ id: r.id, name: r.name, role: r.role })),
        };

        // =====================================================
        // LICENSES (derived from active entitlements)
        // =====================================================
        const activeEntitlements = entitlements.filter(e =>
            e.status === 'active' || e.status === 'trial'
        );
        const licenses = {
            driver: activeEntitlements.some(e =>
                e.product === 'driver' || e.product === 'bundle'
            ),
            team: activeEntitlements.some(e =>
                e.product === 'team' || e.product === 'bundle'
            ),
            league: activeEntitlements.some(e =>
                e.product === 'league' || e.product === 'bundle'
            )
        };

        // Super admin always has all access (dev/support override)
        if (user.isSuperAdmin) {
            licenses.driver = true;
            licenses.team = true;
            licenses.league = true;
        }

        // =====================================================
        // ROLES (derived from licenses + membership roles)
        // =====================================================
        const roles: ('driver' | 'team' | 'racecontrol' | 'admin')[] = [];
        if (licenses.driver) {
            roles.push('driver');
        }
        if (licenses.team) {
            roles.push('team');
        }
        if (licenses.league) {
            roles.push('racecontrol');
        }
        if (user.isSuperAdmin) {
            roles.push('admin');
        }

        // =====================================================
        // CAPABILITIES (runtime truth — gates routes and surfaces)
        // Derived from entitlements + roles
        // =====================================================
        const capabilities = deriveCapabilitiesFromEntitlements(entitlements, roles);

        // Super admin override: all capabilities
        if (user.isSuperAdmin) {
            Object.keys(capabilities).forEach(key => {
                (capabilities as any)[key] = true;
            });
        }

        // =====================================================
        // UI CONFIG (derived from capabilities)
        // =====================================================
        const availableSurfaces: ('driver' | 'team' | 'racecontrol')[] = [];
        if (capabilities.driver_hud) availableSurfaces.push('driver');
        if (capabilities.pitwall_view) availableSurfaces.push('team');
        if (capabilities.incident_review) availableSurfaces.push('racecontrol');

        // Default landing based on primary role
        let defaultLanding = '/home';
        if (roles.includes('racecontrol')) {
            defaultLanding = '/incidents';
        } else if (roles.includes('team')) {
            defaultLanding = '/team';
        }

        const ui = {
            defaultLanding,
            availableSurfaces
        };

        // =====================================================
        // FINAL RESPONSE
        // =====================================================
        const bootstrap = {
            user: {
                id: user.id,
                email: user.email,
                displayName: user.displayName
            },
            memberships,
            licenses,
            roles,
            capabilities,
            ui
        };

        res.json({
            success: true,
            data: bootstrap
        });
    } catch (error) {
        console.error('Bootstrap error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'BOOTSTRAP_ERROR', message: 'Failed to load bootstrap data' }
        });
    }
});

/**
 * Delete current user account
 * DELETE /api/auth/me
 *
 * - Deactivates admin_users row (blocks future logins)
 * - Deletes active entitlements (removes access immediately)
 * - Revokes all refresh tokens
 * - Deletes the Supabase auth user (requires SUPABASE_SERVICE_ROLE_KEY)
 *
 * Note: Stripe subscriptions continue billing until they naturally expire or
 * the user contacts support. Add Stripe cancellation when a cancel-subscription
 * API is added to the billing service.
 */
router.delete('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user!;
        const authService = getAuthService();

        // 1. Revoke all refresh tokens immediately
        await authService.revokeAllUserTokens(user.id);

        // 2. Deactivate the admin_users row (blocks future internal JWT logins)
        await authService.deactivateUser(user.id);

        // 3. Remove all entitlements (kills active access gates)
        await pool.query(
            `DELETE FROM user_entitlements WHERE user_id = $1`,
            [user.id]
        );

        // 4. Delete Supabase auth user so they cannot log in via Supabase either
        if (config.supabaseUrl && config.supabaseServiceRoleKey) {
            try {
                const supabaseAdminUrl = `${config.supabaseUrl}/auth/v1/admin/users/${user.id}`;
                const response = await fetch(supabaseAdminUrl, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${config.supabaseServiceRoleKey}`,
                        'apikey': config.supabaseServiceRoleKey,
                    },
                });
                if (!response.ok) {
                    const body = await response.text();
                    console.error(`[AccountDeletion] Supabase user delete failed (${response.status}): ${body}`);
                    // Non-fatal — user is already deactivated locally
                }
            } catch (supabaseErr) {
                console.error('[AccountDeletion] Failed to delete Supabase user:', supabaseErr);
                // Non-fatal
            }
        }

        res.json({
            success: true,
            data: { message: 'Account deleted successfully' }
        });
    } catch (error) {
        console.error('Account deletion error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'DELETION_ERROR', message: 'Failed to delete account' }
        });
    }
});

export default router;

