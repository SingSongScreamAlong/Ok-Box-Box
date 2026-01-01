// =====================================================================
// Launch Token Routes
// Generate short-lived tokens for launching the relay
// =====================================================================

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { generateLaunchToken, LaunchSurface } from '../../services/auth/launch-token.js';

const router = Router();

/**
 * Generate Launch Token
 * POST /api/launch-token
 * 
 * Body: { surface: "driver" | "team" | "racecontrol" }
 * 
 * Returns:
 * - token: short-lived JWT (60 seconds)
 * - protocolUrl: okboxbox://launch?token=...
 * - fallbackUrl: HTTPS fallback if protocol not registered
 * - expiresAt: Unix timestamp
 * 
 * Security:
 * - Token binds to userId + surface + issuedAt + nonce
 * - Only issues if user has capability for requested surface
 */
router.post('/launch-token', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user!;
        const { surface } = req.body as { surface?: string };

        // Validate surface
        const validSurfaces: LaunchSurface[] = ['driver', 'team', 'racecontrol'];
        if (!surface || !validSurfaces.includes(surface as LaunchSurface)) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_SURFACE',
                    message: 'Surface must be one of: driver, team, racecontrol'
                }
            });
            return;
        }

        // Get user capabilities (simplified - in production, fetch from DB)
        // For now, derive from isSuperAdmin flag similar to bootstrap endpoint
        const capabilities = {
            driver_hud: true,       // Everyone gets BlackBox
            pitwall_view: true,     // Everyone gets BlackBox
            incident_review: user.isSuperAdmin  // ControlBox requires admin
        };

        // Generate launch token
        const result = generateLaunchToken(
            user.id,
            surface as LaunchSurface,
            capabilities
        );

        if (!result) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'CAPABILITY_DENIED',
                    message: `You don't have access to the ${surface} surface. Subscribe to unlock.`
                }
            });
            return;
        }

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Launch token error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'TOKEN_ERROR', message: 'Failed to generate launch token' }
        });
    }
});

/**
 * Validate Launch Token (for debugging/relay pre-check)
 * GET /api/launch-token/validate?token=...
 */
router.get('/launch-token/validate', async (req: Request, res: Response): Promise<void> => {
    const { token } = req.query as { token?: string };

    if (!token) {
        res.status(400).json({
            success: false,
            error: { code: 'MISSING_TOKEN', message: 'Token is required' }
        });
        return;
    }

    // Import validation function
    const { validateLaunchToken } = await import('../../services/auth/launch-token.js');
    const payload = validateLaunchToken(token);

    if (!payload) {
        res.status(401).json({
            success: false,
            error: { code: 'INVALID_TOKEN', message: 'Token is expired or invalid' }
        });
        return;
    }

    res.json({
        success: true,
        data: {
            userId: payload.userId,
            surface: payload.surface,
            expiresAt: payload.exp
        }
    });
});

export default router;
