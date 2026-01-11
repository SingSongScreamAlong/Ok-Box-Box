import { Router } from 'express';
import { logger } from '../logger.js';
import { query } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';

export const sessionRoutes = Router();

/**
 * GET /api/sessions
 * List sessions for the authenticated user
 */
sessionRoutes.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    
    const result = await query(
      `SELECT id, subsession_id, type, state, track_name, track_config,
              total_laps, is_race_session, started_at, ended_at
       FROM sessions
       WHERE user_id = $1
       ORDER BY started_at DESC
       LIMIT 50`,
      [userId]
    );

    const sessions = result.rows.map((row: any) => ({
      sessionId: row.id,
      subsessionId: row.subsession_id,
      type: row.type,
      state: row.state,
      track: {
        name: row.track_name,
        configName: row.track_config,
      },
      totalLaps: row.total_laps,
      isRaceSession: row.is_race_session,
      startedAt: new Date(row.started_at).getTime(),
      endedAt: row.ended_at ? new Date(row.ended_at).getTime() : null,
    }));

    return res.json({ sessions });
  } catch (err) {
    logger.error('Error fetching sessions:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/sessions/:id
 * Get a specific session
 */
sessionRoutes.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;

    const result = await query(
      `SELECT id, subsession_id, type, state, track_id, track_name, track_config,
              total_laps, is_race_session, started_at, ended_at
       FROM sessions
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const row = result.rows[0] as any;
    return res.json({
      sessionId: row.id,
      subsessionId: row.subsession_id,
      type: row.type,
      state: row.state,
      track: {
        id: row.track_id,
        name: row.track_name,
        configName: row.track_config,
      },
      totalLaps: row.total_laps,
      isRaceSession: row.is_race_session,
      startedAt: new Date(row.started_at).getTime(),
      endedAt: row.ended_at ? new Date(row.ended_at).getTime() : null,
    });
  } catch (err) {
    logger.error('Error fetching session:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/sessions/:id/timing
 * Get latest timing data for a session
 */
sessionRoutes.get('/:id/timing', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT entries FROM timing_snapshots
       WHERE session_id = $1
       ORDER BY ts DESC
       LIMIT 1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.json({ entries: [] });
    }

    return res.json({ entries: (result.rows[0] as any).entries });
  } catch (err) {
    logger.error('Error fetching timing:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
