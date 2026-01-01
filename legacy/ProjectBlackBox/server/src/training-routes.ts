
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from './db.js';
import { authenticateToken } from './auth.js';

const router = Router();

// --- GOALS ---

// Get active goals for a driver
router.get('/goals', authenticateToken, async (req: any, res) => {
    const driverId = req.user.driverId || req.user.id;

    try {
        const result = await pool.query(
            'SELECT * FROM training_goals WHERE driver_id = $1 ORDER BY created_at DESC',
            [driverId]
        );

        const goals = result.rows.map(row => ({
            id: row.id,
            driverId: row.driver_id,
            title: row.title,
            description: row.description,
            type: row.type,
            difficulty: row.difficulty,
            trackId: row.track_id,
            targetValue: row.target_value,
            currentValue: row.current_value,
            progress: row.progress,
            metrics: row.metrics,
            created: new Date(row.created_at).getTime()
        }));

        res.json({ goals });
    } catch (error) {
        console.error('Error fetching goals:', error);
        res.status(500).json({ error: 'Failed to fetch goals' });
    }
});

// Create a new goal
router.post('/goals', authenticateToken, async (req: any, res) => {
    const driverId = req.user.driverId || req.user.id;
    const { title, description, type, difficulty, trackId, targetValue } = req.body;

    if (!title || !type || !trackId || targetValue === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = uuidv4();

    try {
        await pool.query(
            `INSERT INTO training_goals 
            (id, driver_id, title, description, type, difficulty, track_id, target_value)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [id, driverId, title, description, type, difficulty, trackId, targetValue]
        );

        res.status(201).json({ id, message: 'Goal created' });
    } catch (error) {
        console.error('Error creating goal:', error);
        res.status(500).json({ error: 'Failed to create goal' });
    }
});

// --- PROGRESS ---

// Update goal progress
router.post('/goals/:id/progress', authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    const { currentValue, metrics } = req.body;

    try {
        // Get goal to calc progress
        const goalRes = await pool.query('SELECT target_value FROM training_goals WHERE id = $1', [id]);
        if (goalRes.rowCount === 0) return res.status(404).json({ error: 'Goal not found' });

        const target = goalRes.rows[0].target_value;
        const progress = Math.min(1.0, Math.max(0, currentValue / target));

        await pool.query(
            `UPDATE training_goals 
            SET current_value = $1, progress = $2, metrics = $3, updated_at = now()
            WHERE id = $4`,
            [currentValue, progress, metrics || {}, id]
        );

        res.json({ message: 'Progress updated', progress });
    } catch (error) {
        console.error('Error updating progress:', error);
        res.status(500).json({ error: 'Failed to update progress' });
    }
});

// --- BADGES ---

// Get earned badges
router.get('/badges', authenticateToken, async (req: any, res) => {
    const driverId = req.user.driverId || req.user.id;

    try {
        const result = await pool.query(
            `SELECT b.*, db.earned_at 
             FROM training_badges b 
             JOIN training_driver_badges db ON b.id = db.badge_id 
             WHERE db.driver_id = $1`,
            [driverId]
        );

        res.json({ badges: result.rows });
    } catch (error) {
        console.error('Error fetching badges:', error);
        res.status(500).json({ error: 'Failed to fetch badges' });
    }
});

export default router;
