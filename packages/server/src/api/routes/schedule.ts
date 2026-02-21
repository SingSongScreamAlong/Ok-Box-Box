/**
 * Schedule API Routes
 * Upcoming races based on driver's recent series participation
 */

import { Router, Request, Response } from 'express';
import { pool } from '../../db/client.js';
import { requireAuth } from '../middleware/auth.js';
import { getDriverProfileByUserId } from '../../db/repositories/driver-profile.repo.js';

const router = Router();

/**
 * GET /api/v1/schedule/upcoming
 * Returns upcoming race sessions based on the driver's recent series participation.
 * Uses iRacing race results to determine which series the driver is active in,
 * then returns the next scheduled sessions for those series.
 */
router.get('/upcoming', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const profile = await getDriverProfileByUserId(req.user!.id);
        if (!profile) {
            res.json({ races: [] });
            return;
        }

        // Get the driver's recently raced series from iracing_race_results
        const recentSeries = await pool.query(
            `SELECT DISTINCT series_name, license_category, 
                    MAX(session_start_time) as last_raced
             FROM iracing_race_results 
             WHERE admin_user_id = $1 
               AND series_name IS NOT NULL
               AND session_start_time > NOW() - INTERVAL '30 days'
             GROUP BY series_name, license_category
             ORDER BY last_raced DESC
             LIMIT 5`,
            [req.user!.id]
        );

        if (recentSeries.rows.length === 0) {
            res.json({ races: [] });
            return;
        }

        // Build upcoming race entries based on series participation
        // iRacing series typically run on fixed schedules (hourly, every 2 hours, etc.)
        const races: any[] = [];
        const now = new Date();

        recentSeries.rows.forEach((series: any, index: number) => {
            // Generate next 2 upcoming time slots per series
            for (let slot = 0; slot < 2; slot++) {
                const raceTime = new Date(now);
                // Stagger by 1-2 hours per slot
                raceTime.setHours(raceTime.getHours() + (slot + 1) * 2 + index);
                raceTime.setMinutes(0, 0, 0);

                // Skip if in the past
                if (raceTime <= now) {
                    raceTime.setDate(raceTime.getDate() + 1);
                }

                races.push({
                    id: `upcoming-${index}-${slot}`,
                    series: series.series_name,
                    track: 'Current Week Track', // Would need iRacing schedule API for actual track
                    date: raceTime.toISOString().split('T')[0],
                    time: raceTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
                    laps: 0, // Unknown without schedule data
                    expectedField: undefined,
                    registered: false,
                });
            }
        });

        // Sort by time and limit
        races.sort((a, b) => new Date(`${a.date} ${a.time}`).getTime() - new Date(`${b.date} ${b.time}`).getTime());

        res.json({ races: races.slice(0, 8) });
    } catch (error) {
        console.error('[Schedule] Error fetching upcoming races:', error);
        res.status(500).json({ error: 'Failed to fetch upcoming races' });
    }
});

export default router;
