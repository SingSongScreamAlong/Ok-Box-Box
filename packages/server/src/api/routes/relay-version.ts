/**
 * Relay Version API
 * 
 * Provides version information for auto-update checks.
 */

import { Router, Request, Response } from 'express';

const router = Router();

// Current relay version
const RELAY_VERSION = '1.0.0';
const DOWNLOAD_URL = 'https://okboxbox.com/download-relay';

interface VersionResponse {
    version: string;
    download_url: string;
    release_notes: string;
    min_supported_version: string;
}

/**
 * GET /api/relay/version
 * Returns current relay version info for auto-update checks
 */
router.get('/version', (_req: Request, res: Response) => {
    const response: VersionResponse = {
        version: RELAY_VERSION,
        download_url: DOWNLOAD_URL,
        release_notes: 'v1.0.0 - Initial release with Ok, Box Box branding',
        min_supported_version: '0.9.0'
    };
    res.json(response);
});

/**
 * GET /api/relay/download
 * Redirects to download page
 */
router.get('/download', (_req: Request, res: Response) => {
    res.redirect(DOWNLOAD_URL);
});

export default router;
