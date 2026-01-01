// =====================================================================
// Auth Routes
// Login, logout, token refresh, current user
// =====================================================================

import { Router, Request, Response } from 'express';
import type { LoginRequest, RefreshTokenRequest } from '@controlbox/common';
import { getAuthService } from '../../services/auth/auth-service.js';
import { requireAuth } from '../middleware/auth.js';

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
        const result = await authService.refreshAccessToken(refreshToken);

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

        // Build entitlements payload (v2 schema)
        // TODO: Read from database when product subscriptions are implemented
        const entitlements = {
            userId: user.id,
            orgId: undefined, // TODO: Get from org membership
            roles: user.isSuperAdmin
                ? ['DRIVER', 'TEAM', 'RACE_CONTROL', 'ADMIN']
                : ['DRIVER', 'TEAM'],
            products: {
                blackbox: {
                    enabled: true,
                    tier: 'TEAM' as const  // TODO: Read from license
                },
                controlbox: {
                    enabled: user.isSuperAdmin  // TODO: Read from license
                }
            },
            defaults: {
                preferredMode: 'DRIVER' as const  // TODO: Store per-user preference
            }
        };

        res.json({
            success: true,
            data: entitlements
        });
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
        const { getEntitlementRepository, deriveCapabilitiesFromEntitlements } =
            await import('../../services/billing/entitlement-service.js');
        const entitlementRepo = getEntitlementRepository();
        const entitlements = await entitlementRepo.getForUser(user.id);

        // =====================================================
        // MEMBERSHIPS (TODO: Read from team_members and league_members tables)
        // =====================================================
        const memberships = {
            teams: [] as { id: string; name: string; role: string }[],
            leagues: [] as { id: string; name: string; role: string }[]
        };

        // =====================================================
        // LICENSES (derived from active entitlements)
        // =====================================================
        const activeEntitlements = entitlements.filter(e =>
            e.status === 'active' || e.status === 'trial'
        );
        const licenses = {
            blackbox: activeEntitlements.some(e =>
                e.product === 'blackbox' || e.product === 'bundle'
            ),
            controlbox: activeEntitlements.some(e =>
                e.product === 'controlbox' || e.product === 'bundle'
            )
        };

        // Super admin always has all access (dev/support override)
        if (user.isSuperAdmin) {
            licenses.blackbox = true;
            licenses.controlbox = true;
        }

        // =====================================================
        // ROLES (derived from licenses + membership roles)
        // =====================================================
        const roles: ('driver' | 'team' | 'racecontrol' | 'admin')[] = [];
        if (licenses.blackbox) {
            roles.push('driver', 'team');
        }
        if (licenses.controlbox) {
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

export default router;

