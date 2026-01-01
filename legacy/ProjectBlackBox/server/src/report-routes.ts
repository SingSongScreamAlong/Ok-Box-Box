/**
 * Session Report Routes
 * API endpoints for session analysis reports
 */

import express from 'express';
import { authenticateToken } from './auth.js';
import { apiLimiter } from './middleware/rate-limit.js';
import SessionReportService from './services/SessionReportService.js';

const router = express.Router();

/**
 * Get session report
 * GET /api/reports/:sessionId
 */
router.get('/:sessionId', apiLimiter, authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;

        const report = await SessionReportService.generateReport(sessionId);

        if (!report) {
            return res.status(404).json({ error: 'Session not found' });
        }

        return res.json(report);

    } catch (error) {
        console.error('Error generating report:', error);
        return res.status(500).json({ error: 'Failed to generate report' });
    }
});

export default router;
