// =====================================================================
// iRacing OAuth Callback Route
// Handles the redirect from iRacing after authorization
// =====================================================================

import { Router, Request, Response } from 'express';
import { getIRacingOAuthService } from '../../../services/iracing-oauth/index.js';

const router = Router();

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
