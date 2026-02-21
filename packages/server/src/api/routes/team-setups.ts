/**
 * Team Setups API Routes
 * CRUD operations for team car setups
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { pool } from '../../db/client.js';

const router = Router();

interface TeamSetup {
    id: string;
    team_id: string;
    name: string;
    car_name: string;
    track_name: string;
    conditions: 'dry' | 'wet' | 'night';
    file_name: string;
    file_size: number;
    version: number;
    uploaded_by: string | null;
    uploaded_by_name: string | null;
    notes: string | null;
    tags: string[];
    download_count: number;
    created_at: Date;
    updated_at: Date;
}

// GET /api/teams/:teamId/setups - List all setups for a team
router.get('/:teamId/setups', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const { teamId } = req.params;
        const { track, car, conditions } = req.query;

        let query = 'SELECT * FROM team_setups WHERE team_id = $1';
        const params: unknown[] = [teamId];
        let paramCount = 2;

        if (track) {
            query += ` AND track_name ILIKE $${paramCount++}`;
            params.push(`%${track}%`);
        }
        if (car) {
            query += ` AND car_name ILIKE $${paramCount++}`;
            params.push(`%${car}%`);
        }
        if (conditions) {
            query += ` AND conditions = $${paramCount++}`;
            params.push(conditions);
        }

        query += ' ORDER BY created_at DESC';

        const result = await pool.query<TeamSetup>(query, params);

        res.json({
            success: true,
            data: {
                setups: result.rows,
                count: result.rows.length,
            },
        });
    } catch (error) {
        console.error('[TeamSetups] Error listing setups:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to list setups' } });
    }
});

// GET /api/teams/:teamId/setups/:setupId - Get a specific setup
router.get('/:teamId/setups/:setupId', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const { teamId, setupId } = req.params;

        const result = await pool.query<TeamSetup>(
            'SELECT * FROM team_setups WHERE id = $1 AND team_id = $2',
            [setupId, teamId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ success: false, error: { message: 'Setup not found' } });
            return;
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('[TeamSetups] Error getting setup:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to get setup' } });
    }
});

// POST /api/teams/:teamId/setups - Create a new setup
router.post('/:teamId/setups', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const { teamId } = req.params;
        const { name, car_name, track_name, conditions, file_name, file_size, notes, tags } = req.body;

        if (!name || !car_name || !track_name || !file_name) {
            res.status(400).json({ 
                success: false, 
                error: { message: 'name, car_name, track_name, and file_name are required' } 
            });
            return;
        }

        const result = await pool.query<TeamSetup>(
            `INSERT INTO team_setups (
                team_id, name, car_name, track_name, conditions, file_name, file_size,
                uploaded_by, uploaded_by_name, notes, tags
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *`,
            [
                teamId,
                name,
                car_name,
                track_name,
                conditions || 'dry',
                file_name,
                file_size || 0,
                req.user?.id || null,
                req.user?.displayName || null,
                notes || null,
                JSON.stringify(tags || []),
            ]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('[TeamSetups] Error creating setup:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to create setup' } });
    }
});

// PATCH /api/teams/:teamId/setups/:setupId - Update a setup
router.patch('/:teamId/setups/:setupId', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const { teamId, setupId } = req.params;
        const { name, notes, tags, conditions } = req.body;

        const updates: string[] = [];
        const values: unknown[] = [];
        let paramCount = 1;

        if (name !== undefined) {
            updates.push(`name = $${paramCount++}`);
            values.push(name);
        }
        if (notes !== undefined) {
            updates.push(`notes = $${paramCount++}`);
            values.push(notes);
        }
        if (tags !== undefined) {
            updates.push(`tags = $${paramCount++}`);
            values.push(JSON.stringify(tags));
        }
        if (conditions !== undefined) {
            updates.push(`conditions = $${paramCount++}`);
            values.push(conditions);
        }

        if (updates.length === 0) {
            res.status(400).json({ success: false, error: { message: 'No updates provided' } });
            return;
        }

        updates.push(`updated_at = NOW()`);
        values.push(setupId, teamId);

        const result = await pool.query<TeamSetup>(
            `UPDATE team_setups SET ${updates.join(', ')} 
             WHERE id = $${paramCount++} AND team_id = $${paramCount}
             RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            res.status(404).json({ success: false, error: { message: 'Setup not found' } });
            return;
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('[TeamSetups] Error updating setup:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to update setup' } });
    }
});

// DELETE /api/teams/:teamId/setups/:setupId - Delete a setup
router.delete('/:teamId/setups/:setupId', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const { teamId, setupId } = req.params;

        const result = await pool.query(
            'DELETE FROM team_setups WHERE id = $1 AND team_id = $2',
            [setupId, teamId]
        );

        if ((result.rowCount ?? 0) === 0) {
            res.status(404).json({ success: false, error: { message: 'Setup not found' } });
            return;
        }

        res.status(204).send();
    } catch (error) {
        console.error('[TeamSetups] Error deleting setup:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to delete setup' } });
    }
});

// POST /api/teams/:teamId/setups/:setupId/download - Increment download count
router.post('/:teamId/setups/:setupId/download', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const { teamId, setupId } = req.params;

        const result = await pool.query<TeamSetup>(
            `UPDATE team_setups SET download_count = download_count + 1, updated_at = NOW()
             WHERE id = $1 AND team_id = $2
             RETURNING *`,
            [setupId, teamId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ success: false, error: { message: 'Setup not found' } });
            return;
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('[TeamSetups] Error incrementing download:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to record download' } });
    }
});

export default router;
