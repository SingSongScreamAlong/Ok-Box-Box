/**
 * Analysis Routes
 * API endpoints for telemetry analysis (corners, laps, comparison)
 */

import express from 'express';
import { authenticateToken } from './auth.js';
import { apiLimiter } from './middleware/rate-limit.js';
import CornerDetectorService from './services/CornerDetectorService.js';
import { pool } from './db.js';

const router = express.Router();

/**
 * Get corner analysis for a session
 * GET /api/analysis/corners/:sessionId
 */
router.get('/corners/:sessionId', apiLimiter, authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const lap = req.query.lap ? parseInt(req.query.lap as string) : undefined;

        const result = await CornerDetectorService.analyzeCorners(sessionId, lap);

        if (!result) {
            return res.status(404).json({ error: 'Session not found or insufficient data' });
        }

        return res.json(result);

    } catch (error) {
        console.error('Error analyzing corners:', error);
        return res.status(500).json({ error: 'Failed to analyze corners' });
    }
});

/**
 * Get lap-by-lap telemetry for comparison
 * GET /api/analysis/laps/:sessionId
 */
router.get('/laps/:sessionId', apiLimiter, authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;

        // Get distinct laps with their times
        const lapsResult = await pool.query(`
      WITH lap_data AS (
        SELECT 
          lap,
          MIN(ts) as start_time,
          MAX(ts) as end_time,
          AVG(speed) as avg_speed,
          MAX(speed) as max_speed
        FROM telemetry
        WHERE session_id = $1 AND lap > 0
        GROUP BY lap
      )
      SELECT 
        lap,
        EXTRACT(EPOCH FROM (end_time - start_time)) as lap_time,
        avg_speed,
        max_speed
      FROM lap_data
      ORDER BY lap
    `, [sessionId]);

        if (lapsResult.rowCount === 0) {
            return res.status(404).json({ error: 'No lap data found' });
        }

        const laps = lapsResult.rows
            .filter((l: any) => l.lap_time > 10 && l.lap_time < 600)
            .map((l: any) => ({
                lap: parseInt(l.lap),
                lapTime: parseFloat(l.lap_time),
                avgSpeed: Math.round((l.avg_speed || 0) * 3.6), // m/s to km/h
                maxSpeed: Math.round((l.max_speed || 0) * 3.6)
            }));

        const bestLapTime = Math.min(...laps.map(l => l.lapTime));

        return res.json({
            sessionId,
            laps: laps.map(l => ({
                ...l,
                delta: Math.round((l.lapTime - bestLapTime) * 1000) / 1000
            })),
            bestLap: laps.find(l => l.lapTime === bestLapTime)?.lap || 1
        });

    } catch (error) {
        console.error('Error getting laps:', error);
        return res.status(500).json({ error: 'Failed to get lap data' });
    }
});

/**
 * Compare two laps (telemetry overlay data)
 * GET /api/analysis/compare/:sessionId?lap1=X&lap2=Y
 */
router.get('/compare/:sessionId', apiLimiter, authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const lap1 = parseInt(req.query.lap1 as string);
        const lap2 = parseInt(req.query.lap2 as string);

        if (!lap1 || !lap2) {
            return res.status(400).json({ error: 'lap1 and lap2 query params required' });
        }

        // Get telemetry for both laps
        const result = await pool.query(`
      SELECT 
        lap,
        track_position,
        speed,
        throttle,
        brake,
        gear,
        g_lat
      FROM telemetry
      WHERE session_id = $1 AND lap IN ($2, $3)
      ORDER BY lap, ts
    `, [sessionId, lap1, lap2]);

        const lap1Data = result.rows.filter((r: any) => r.lap === lap1);
        const lap2Data = result.rows.filter((r: any) => r.lap === lap2);

        // Sample data to reduce payload (every Nth point)
        const sampleRate = Math.max(1, Math.floor(lap1Data.length / 200));

        const formatLap = (data: any[]) => {
            const sampled = data.filter((_: any, i: number) => i % sampleRate === 0);
            return sampled.map((d: any) => ({
                pos: d.track_position,
                speed: Math.round((d.speed || 0) * 3.6),
                throttle: d.throttle,
                brake: d.brake,
                gear: d.gear
            }));
        };

        return res.json({
            sessionId,
            lap1: { lap: lap1, data: formatLap(lap1Data) },
            lap2: { lap: lap2, data: formatLap(lap2Data) }
        });

    } catch (error) {
        console.error('Error comparing laps:', error);
        return res.status(500).json({ error: 'Failed to compare laps' });
    }
});

export default router;
