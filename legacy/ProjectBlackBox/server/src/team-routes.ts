/**
 * Team Routes
 * API endpoints for team management and multi-driver views
 */

import express from 'express';
import { authenticateToken } from './auth.js';
import { apiLimiter } from './middleware/rate-limit.js';
import { pool } from './db.js';

const router = express.Router();

/**
 * Get teams for current user
 * GET /api/teams
 */
router.get('/', apiLimiter, authenticateToken, async (req, res) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        // For now, return placeholder - teams table would need to exist
        // In v1, we'll just allow comparing any sessions by the same organization
        return res.json({
            teams: [
                {
                    id: 'default',
                    name: 'My Team',
                    members: 1
                }
            ],
            message: 'Full team management coming in v2'
        });

    } catch (error) {
        console.error('Error fetching teams:', error);
        return res.status(500).json({ error: 'Failed to fetch teams' });
    }
});

/**
 * Get all drivers with sessions (for comparison)
 * GET /api/teams/drivers
 */
router.get('/drivers', apiLimiter, authenticateToken, async (req, res) => {
    try {
        // Get distinct drivers from sessions
        const result = await pool.query(`
      SELECT DISTINCT 
        t.driver_id,
        u.name as driver_name,
        COUNT(DISTINCT t.session_id) as session_count,
        MAX(t.ts) as last_active
      FROM telemetry t
      LEFT JOIN users u ON t.driver_id = u.id
      WHERE t.driver_id IS NOT NULL
      GROUP BY t.driver_id, u.name
      ORDER BY last_active DESC
      LIMIT 50
    `);

        const drivers = result.rows.map(row => ({
            id: row.driver_id,
            name: row.driver_name || `Driver ${row.driver_id.slice(0, 8)}`,
            sessionCount: parseInt(row.session_count),
            lastActive: row.last_active
        }));

        return res.json({ drivers });

    } catch (error) {
        console.error('Error fetching drivers:', error);
        return res.status(500).json({ error: 'Failed to fetch drivers' });
    }
});

/**
 * Compare multiple drivers' sessions
 * GET /api/teams/compare?drivers=id1,id2&sessionId=xxx
 */
router.get('/compare', apiLimiter, authenticateToken, async (req, res) => {
    try {
        const driverIds = (req.query.drivers as string)?.split(',') || [];
        const sessionId = req.query.sessionId as string;

        if (driverIds.length < 2) {
            return res.status(400).json({ error: 'At least 2 driver IDs required' });
        }

        // Get best lap data for each driver
        const comparisons = [];

        for (const driverId of driverIds) {
            let query = `
        SELECT 
          driver_id,
          lap,
          AVG(speed) as avg_speed,
          MAX(speed) as max_speed,
          COUNT(*) as samples
        FROM telemetry
        WHERE driver_id = $1
      `;
            const params: any[] = [driverId];

            if (sessionId) {
                query += ' AND session_id = $2';
                params.push(sessionId);
            }

            query += ' GROUP BY driver_id, lap ORDER BY avg_speed DESC LIMIT 1';

            const result = await pool.query(query, params);

            if (result.rowCount > 0) {
                const row = result.rows[0];
                comparisons.push({
                    driverId,
                    bestLap: row.lap,
                    avgSpeed: Math.round((row.avg_speed || 0) * 3.6),
                    maxSpeed: Math.round((row.max_speed || 0) * 3.6),
                    samples: parseInt(row.samples)
                });
            }
        }

        return res.json({ comparisons, sessionId });

    } catch (error) {
        console.error('Error comparing drivers:', error);
        return res.status(500).json({ error: 'Failed to compare drivers' });
    }
});

export default router;
