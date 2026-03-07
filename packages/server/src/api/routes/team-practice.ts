/**
 * Team Practice API Routes
 * CRUD operations for team practice sessions and run plans
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireTeamMember } from '../middleware/team-guards.js';
import { pool } from '../../db/client.js';

const router = Router();

interface PracticeSession {
    id: string;
    team_id: string;
    event_id: string | null;
    name: string;
    track_name: string | null;
    car_name: string | null;
    started_at: Date | null;
    ended_at: Date | null;
    status: 'planned' | 'active' | 'completed';
    created_at: Date;
    updated_at: Date;
}

interface RunPlan {
    id: string;
    practice_session_id: string;
    name: string;
    target_laps: number;
    completed_laps: number;
    target_time: string | null;
    focus_areas: string[];
    status: 'planned' | 'in_progress' | 'completed';
    created_at: Date;
    updated_at: Date;
}

interface DriverStint {
    id: string;
    practice_session_id: string;
    driver_profile_id: string | null;
    driver_name: string;
    laps_completed: number;
    best_lap_time_ms: number | null;
    avg_lap_time_ms: number | null;
    consistency_score: number | null;
    incidents: number;
    started_at: Date | null;
    ended_at: Date | null;
    created_at: Date;
    updated_at: Date;
}

// GET /api/teams/:teamId/practice - List all practice sessions
router.get('/:teamId/practice', requireAuth, requireTeamMember('teamId'), async (req: Request, res: Response): Promise<void> => {
    try {
        const { teamId } = req.params;
        const { status, eventId } = req.query;

        let query = 'SELECT * FROM team_practice_sessions WHERE team_id = $1';
        const params: unknown[] = [teamId];
        let paramCount = 2;

        if (status) {
            query += ` AND status = $${paramCount++}`;
            params.push(status);
        }
        if (eventId) {
            query += ` AND event_id = $${paramCount++}`;
            params.push(eventId);
        }

        query += ' ORDER BY created_at DESC';

        const result = await pool.query<PracticeSession>(query, params);

        res.json({
            success: true,
            data: {
                sessions: result.rows,
                count: result.rows.length,
            },
        });
    } catch (error) {
        console.error('[TeamPractice] Error listing sessions:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to list practice sessions' } });
    }
});

// GET /api/teams/:teamId/practice/:sessionId - Get a practice session with details
router.get('/:teamId/practice/:sessionId', requireAuth, requireTeamMember('teamId'), async (req: Request, res: Response): Promise<void> => {
    try {
        const { teamId, sessionId } = req.params;

        const sessionResult = await pool.query<PracticeSession>(
            'SELECT * FROM team_practice_sessions WHERE id = $1 AND team_id = $2',
            [sessionId, teamId]
        );

        if (sessionResult.rows.length === 0) {
            res.status(404).json({ success: false, error: { message: 'Practice session not found' } });
            return;
        }

        const [runPlansResult, stintsResult] = await Promise.all([
            pool.query<RunPlan>(
                'SELECT * FROM team_practice_run_plans WHERE practice_session_id = $1 ORDER BY created_at',
                [sessionId]
            ),
            pool.query<DriverStint>(
                'SELECT * FROM team_practice_driver_stints WHERE practice_session_id = $1 ORDER BY laps_completed DESC',
                [sessionId]
            ),
        ]);

        res.json({
            success: true,
            data: {
                ...sessionResult.rows[0],
                run_plans: runPlansResult.rows,
                driver_stints: stintsResult.rows,
            },
        });
    } catch (error) {
        console.error('[TeamPractice] Error getting session:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to get practice session' } });
    }
});

// POST /api/teams/:teamId/practice - Create a new practice session
router.post('/:teamId/practice', requireAuth, requireTeamMember('teamId'), async (req: Request, res: Response): Promise<void> => {
    try {
        const { teamId } = req.params;
        const { name, event_id, track_name, car_name } = req.body;

        if (!name) {
            res.status(400).json({ success: false, error: { message: 'name is required' } });
            return;
        }

        const result = await pool.query<PracticeSession>(
            `INSERT INTO team_practice_sessions (team_id, name, event_id, track_name, car_name)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [teamId, name, event_id || null, track_name || null, car_name || null]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('[TeamPractice] Error creating session:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to create practice session' } });
    }
});

// PATCH /api/teams/:teamId/practice/:sessionId - Update a practice session
router.patch('/:teamId/practice/:sessionId', requireAuth, requireTeamMember('teamId'), async (req: Request, res: Response): Promise<void> => {
    try {
        const { teamId, sessionId } = req.params;
        const { name, track_name, car_name, status, started_at, ended_at } = req.body;

        const updates: string[] = [];
        const values: unknown[] = [];
        let paramCount = 1;

        if (name !== undefined) { updates.push(`name = $${paramCount++}`); values.push(name); }
        if (track_name !== undefined) { updates.push(`track_name = $${paramCount++}`); values.push(track_name); }
        if (car_name !== undefined) { updates.push(`car_name = $${paramCount++}`); values.push(car_name); }
        if (status !== undefined) { updates.push(`status = $${paramCount++}`); values.push(status); }
        if (started_at !== undefined) { updates.push(`started_at = $${paramCount++}`); values.push(started_at); }
        if (ended_at !== undefined) { updates.push(`ended_at = $${paramCount++}`); values.push(ended_at); }

        if (updates.length === 0) {
            res.status(400).json({ success: false, error: { message: 'No updates provided' } });
            return;
        }

        updates.push(`updated_at = NOW()`);
        values.push(sessionId, teamId);

        const result = await pool.query<PracticeSession>(
            `UPDATE team_practice_sessions SET ${updates.join(', ')} 
             WHERE id = $${paramCount++} AND team_id = $${paramCount}
             RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            res.status(404).json({ success: false, error: { message: 'Practice session not found' } });
            return;
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('[TeamPractice] Error updating session:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to update practice session' } });
    }
});

// DELETE /api/teams/:teamId/practice/:sessionId - Delete a practice session
router.delete('/:teamId/practice/:sessionId', requireAuth, requireTeamMember('teamId'), async (req: Request, res: Response): Promise<void> => {
    try {
        const { teamId, sessionId } = req.params;

        const result = await pool.query(
            'DELETE FROM team_practice_sessions WHERE id = $1 AND team_id = $2',
            [sessionId, teamId]
        );

        if ((result.rowCount ?? 0) === 0) {
            res.status(404).json({ success: false, error: { message: 'Practice session not found' } });
            return;
        }

        res.status(204).send();
    } catch (error) {
        console.error('[TeamPractice] Error deleting session:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to delete practice session' } });
    }
});

// POST /api/teams/:teamId/practice/:sessionId/run-plans - Add a run plan
router.post('/:teamId/practice/:sessionId/run-plans', requireAuth, requireTeamMember('teamId'), async (req: Request, res: Response): Promise<void> => {
    try {
        const { sessionId } = req.params;

        const { name, target_laps, target_time, focus_areas } = req.body;

        if (!name || target_laps === undefined) {
            res.status(400).json({ success: false, error: { message: 'name and target_laps are required' } });
            return;
        }

        const result = await pool.query<RunPlan>(
            `INSERT INTO team_practice_run_plans (practice_session_id, name, target_laps, target_time, focus_areas)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [sessionId, name, target_laps, target_time || null, JSON.stringify(focus_areas || [])]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('[TeamPractice] Error adding run plan:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to add run plan' } });
    }
});

// PATCH /api/teams/:teamId/practice/:sessionId/run-plans/:planId - Update a run plan
router.patch('/:teamId/practice/:sessionId/run-plans/:planId', requireAuth, requireTeamMember('teamId'), async (req: Request, res: Response): Promise<void> => {
    try {
        const { sessionId, planId } = req.params;

        const { name, target_laps, completed_laps, target_time, focus_areas, status } = req.body;

        const updates: string[] = [];
        const values: unknown[] = [];
        let paramCount = 1;

        if (name !== undefined) { updates.push(`name = $${paramCount++}`); values.push(name); }
        if (target_laps !== undefined) { updates.push(`target_laps = $${paramCount++}`); values.push(target_laps); }
        if (completed_laps !== undefined) { updates.push(`completed_laps = $${paramCount++}`); values.push(completed_laps); }
        if (target_time !== undefined) { updates.push(`target_time = $${paramCount++}`); values.push(target_time); }
        if (focus_areas !== undefined) { updates.push(`focus_areas = $${paramCount++}`); values.push(JSON.stringify(focus_areas)); }
        if (status !== undefined) { updates.push(`status = $${paramCount++}`); values.push(status); }

        if (updates.length === 0) {
            res.status(400).json({ success: false, error: { message: 'No updates provided' } });
            return;
        }

        updates.push(`updated_at = NOW()`);
        values.push(planId, sessionId);

        const result = await pool.query<RunPlan>(
            `UPDATE team_practice_run_plans SET ${updates.join(', ')} 
             WHERE id = $${paramCount++} AND practice_session_id = $${paramCount}
             RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            res.status(404).json({ success: false, error: { message: 'Run plan not found' } });
            return;
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('[TeamPractice] Error updating run plan:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to update run plan' } });
    }
});

// POST /api/teams/:teamId/practice/:sessionId/stints - Add a driver stint
router.post('/:teamId/practice/:sessionId/stints', requireAuth, requireTeamMember('teamId'), async (req: Request, res: Response): Promise<void> => {
    try {
        const { sessionId } = req.params;

        const { driver_profile_id, driver_name, laps_completed, best_lap_time_ms, avg_lap_time_ms, consistency_score, incidents } = req.body;

        if (!driver_name) {
            res.status(400).json({ success: false, error: { message: 'driver_name is required' } });
            return;
        }

        const result = await pool.query<DriverStint>(
            `INSERT INTO team_practice_driver_stints (
                practice_session_id, driver_profile_id, driver_name, laps_completed,
                best_lap_time_ms, avg_lap_time_ms, consistency_score, incidents
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *`,
            [
                sessionId,
                driver_profile_id || null,
                driver_name,
                laps_completed || 0,
                best_lap_time_ms || null,
                avg_lap_time_ms || null,
                consistency_score || null,
                incidents || 0,
            ]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('[TeamPractice] Error adding stint:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to add driver stint' } });
    }
});

// PATCH /api/teams/:teamId/practice/:sessionId/stints/:stintId - Update a driver stint
router.patch('/:teamId/practice/:sessionId/stints/:stintId', requireAuth, requireTeamMember('teamId'), async (req: Request, res: Response): Promise<void> => {
    try {
        const { sessionId, stintId } = req.params;

        const { laps_completed, best_lap_time_ms, avg_lap_time_ms, consistency_score, incidents } = req.body;

        const updates: string[] = [];
        const values: unknown[] = [];
        let paramCount = 1;

        if (laps_completed !== undefined) { updates.push(`laps_completed = $${paramCount++}`); values.push(laps_completed); }
        if (best_lap_time_ms !== undefined) { updates.push(`best_lap_time_ms = $${paramCount++}`); values.push(best_lap_time_ms); }
        if (avg_lap_time_ms !== undefined) { updates.push(`avg_lap_time_ms = $${paramCount++}`); values.push(avg_lap_time_ms); }
        if (consistency_score !== undefined) { updates.push(`consistency_score = $${paramCount++}`); values.push(consistency_score); }
        if (incidents !== undefined) { updates.push(`incidents = $${paramCount++}`); values.push(incidents); }

        if (updates.length === 0) {
            res.status(400).json({ success: false, error: { message: 'No updates provided' } });
            return;
        }

        updates.push(`updated_at = NOW()`);
        values.push(stintId, sessionId);

        const result = await pool.query<DriverStint>(
            `UPDATE team_practice_driver_stints SET ${updates.join(', ')} 
             WHERE id = $${paramCount++} AND practice_session_id = $${paramCount}
             RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            res.status(404).json({ success: false, error: { message: 'Driver stint not found' } });
            return;
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('[TeamPractice] Error updating stint:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to update driver stint' } });
    }
});

export default router;
