/**
 * Relay Version API
 * 
 * Provides version information for auto-update checks.
 */

import { Router, Request, Response } from 'express';

const router = Router();

// Current relay version
const RELAY_VERSION = '1.0.0-alpha';
const DOWNLOAD_URL = process.env.RELAY_DOWNLOAD_URL || 'https://github.com/SingSongScreamAlong/Ok-Box-Box/releases/latest/download/okboxbox-relay-1.0.0-alpha.exe';

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
        release_notes: 'Standalone embedded-runtime relay installer with protocol launch handoff and desktop auto-update checks.',
        min_supported_version: '1.0.0-alpha'
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
