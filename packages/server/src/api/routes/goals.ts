/**
 * Driver Goals API Routes
 * 
 * CRUD operations for driver development goals.
 * Supports both self-set goals and AI-recommended goals.
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { pool } from '../../db/client.js';
import { getGoalGeneratorService } from '../../services/driver-development/goal-generator.js';
import { getIRacingProfileSyncService } from '../../services/iracing-oauth/index.js';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// =====================================================================
// Helper: Get driver profile ID for authenticated user
// =====================================================================
async function getDriverProfileId(userId: string): Promise<string | null> {
    const result = await pool.query(
        `SELECT id FROM driver_profiles WHERE user_account_id = $1`,
        [userId]
    );
    return result.rows[0]?.id || null;
}

// =====================================================================
// GET /api/v1/goals
// Get all goals for the authenticated driver
// =====================================================================
router.get('/', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { status, category } = req.query;

        const driverProfileId = await getDriverProfileId(userId);
        if (!driverProfileId) {
            res.status(404).json({ error: 'Driver profile not found' });
            return;
        }

        let query = `
            SELECT 
                id, title, description, category, metric_key,
                target_value, current_value, starting_value, unit,
                track_name, car_name, discipline, series_name,
                status, priority, deadline,
                source, ai_rationale, ai_confidence,
                progress_pct, last_progress_update,
                created_at, updated_at, achieved_at
            FROM driver_goals 
            WHERE driver_profile_id = $1
        `;
        const params: any[] = [driverProfileId];

        if (status) {
            query += ` AND status = $${params.length + 1}`;
            params.push(status);
        }

        if (category) {
            query += ` AND category = $${params.length + 1}`;
            params.push(category);
        }

        query += ` ORDER BY 
            CASE status 
                WHEN 'suggested' THEN 1 
                WHEN 'active' THEN 2 
                WHEN 'achieved' THEN 3 
                ELSE 4 
            END,
            priority DESC, 
            created_at DESC`;

        const result = await pool.query(query, params);

        res.json({
            goals: result.rows.map(row => ({
                id: row.id,
                title: row.title,
                description: row.description,
                category: row.category,
                metricKey: row.metric_key,
                targetValue: parseFloat(row.target_value),
                currentValue: parseFloat(row.current_value),
                startingValue: parseFloat(row.starting_value),
                unit: row.unit,
                trackName: row.track_name,
                carName: row.car_name,
                discipline: row.discipline,
                seriesName: row.series_name,
                status: row.status,
                priority: row.priority,
                deadline: row.deadline,
                source: row.source,
                aiRationale: row.ai_rationale,
                aiConfidence: row.ai_confidence ? parseFloat(row.ai_confidence) : null,
                progressPct: parseFloat(row.progress_pct || '0'),
                lastProgressUpdate: row.last_progress_update,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                achievedAt: row.achieved_at
            })),
            total: result.rows.length
        });

    } catch (error) {
        console.error('[Goals API] Error fetching goals:', error);
        res.status(500).json({ error: 'Failed to fetch goals' });
    }
});

// =====================================================================
// GET /api/v1/goals/suggestions
// Get AI-generated goal suggestions (refreshes based on current profile)
// =====================================================================
router.get('/suggestions', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;

        const driverProfileId = await getDriverProfileId(userId);
        if (!driverProfileId) {
            res.status(404).json({ error: 'Driver profile not found' });
            return;
        }

        // Get current iRacing profile
        const syncService = getIRacingProfileSyncService();
        const profile = await syncService.getProfile(userId);

        if (!profile) {
            res.json({
                suggestions: [],
                message: 'Connect your iRacing account to get personalized goal suggestions'
            });
            return;
        }

        // Generate fresh suggestions
        const goalGenerator = getGoalGeneratorService();
        const suggestions = goalGenerator.analyzeProfileForGoals(profile);

        res.json({
            suggestions: suggestions.map(s => ({
                title: s.title,
                description: s.description,
                category: s.category,
                metricKey: s.metricKey,
                targetValue: s.targetValue,
                currentValue: s.currentValue,
                unit: s.unit,
                rationale: s.rationale,
                aiConfidence: s.aiConfidence,
                priority: s.priority,
                discipline: s.discipline,
                estimatedTimelineDays: s.estimatedTimelineDays
            })),
            basedOn: {
                iratingRoad: profile.iratingRoad,
                srRoad: profile.srRoad ? profile.srRoad / 100 : null,
                licenseRoad: profile.licenseRoad,
                lastSyncedAt: profile.lastSyncedAt
            }
        });

    } catch (error) {
        console.error('[Goals API] Error getting suggestions:', error);
        res.status(500).json({ error: 'Failed to generate suggestions' });
    }
});

// =====================================================================
// POST /api/v1/goals
// Create a new goal (self-set)
// =====================================================================
router.post('/', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const {
            title, description, category, metricKey,
            targetValue, currentValue, unit,
            trackName, carName, discipline, seriesName,
            deadline, priority
        } = req.body;

        if (!title || !category || targetValue === undefined) {
            res.status(400).json({ error: 'Missing required fields: title, category, targetValue' });
            return;
        }

        const driverProfileId = await getDriverProfileId(userId);
        if (!driverProfileId) {
            res.status(404).json({ error: 'Driver profile not found' });
            return;
        }

        const result = await pool.query(
            `INSERT INTO driver_goals (
                driver_profile_id, title, description, category, metric_key,
                target_value, current_value, starting_value, unit,
                track_name, car_name, discipline, series_name,
                deadline, priority, source, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'self_set', 'active')
            RETURNING *`,
            [
                driverProfileId, title, description || null, category, metricKey || null,
                targetValue, currentValue || 0, currentValue || 0, unit || null,
                trackName || null, carName || null, discipline || null, seriesName || null,
                deadline || null, priority || 5
            ]
        );

        const row = result.rows[0];
        res.status(201).json({
            id: row.id,
            title: row.title,
            description: row.description,
            category: row.category,
            targetValue: parseFloat(row.target_value),
            currentValue: parseFloat(row.current_value),
            status: row.status,
            source: row.source,
            createdAt: row.created_at
        });

    } catch (error) {
        console.error('[Goals API] Error creating goal:', error);
        res.status(500).json({ error: 'Failed to create goal' });
    }
});

// =====================================================================
// POST /api/v1/goals/accept-suggestion
// Accept an AI suggestion and create it as an active goal
// =====================================================================
router.post('/accept-suggestion', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const suggestion = req.body;

        if (!suggestion.title || !suggestion.category) {
            res.status(400).json({ error: 'Invalid suggestion data' });
            return;
        }

        const driverProfileId = await getDriverProfileId(userId);
        if (!driverProfileId) {
            res.status(404).json({ error: 'Driver profile not found' });
            return;
        }

        const result = await pool.query(
            `INSERT INTO driver_goals (
                driver_profile_id, title, description, category, metric_key,
                target_value, current_value, starting_value, unit, discipline,
                source, ai_rationale, ai_confidence, priority, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ai_recommended', $11, $12, $13, 'active')
            RETURNING *`,
            [
                driverProfileId,
                suggestion.title,
                suggestion.description || null,
                suggestion.category,
                suggestion.metricKey || null,
                suggestion.targetValue,
                suggestion.currentValue || 0,
                suggestion.currentValue || 0,
                suggestion.unit || null,
                suggestion.discipline || null,
                suggestion.rationale || null,
                suggestion.aiConfidence || null,
                suggestion.priority || 5
            ]
        );

        const row = result.rows[0];
        res.status(201).json({
            id: row.id,
            title: row.title,
            status: row.status,
            source: row.source,
            createdAt: row.created_at
        });

    } catch (error) {
        console.error('[Goals API] Error accepting suggestion:', error);
        res.status(500).json({ error: 'Failed to accept suggestion' });
    }
});

// =====================================================================
// PATCH /api/v1/goals/:goalId
// Update a goal (progress, status, etc.)
// =====================================================================
router.patch('/:goalId', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { goalId } = req.params;
        const updates = req.body;

        const driverProfileId = await getDriverProfileId(userId);
        if (!driverProfileId) {
            res.status(404).json({ error: 'Driver profile not found' });
            return;
        }

        // Verify ownership
        const existing = await pool.query(
            `SELECT id FROM driver_goals WHERE id = $1 AND driver_profile_id = $2`,
            [goalId, driverProfileId]
        );

        if (existing.rows.length === 0) {
            res.status(404).json({ error: 'Goal not found' });
            return;
        }

        // Build update query dynamically
        const allowedFields = ['title', 'description', 'target_value', 'current_value', 'status', 'priority', 'deadline'];
        const setClauses: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(updates)) {
            const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            if (allowedFields.includes(snakeKey)) {
                setClauses.push(`${snakeKey} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        }

        if (setClauses.length === 0) {
            res.status(400).json({ error: 'No valid fields to update' });
            return;
        }

        setClauses.push('updated_at = NOW()');

        // Handle status changes
        if (updates.status === 'achieved') {
            setClauses.push('achieved_at = NOW()');
        } else if (updates.status === 'dismissed') {
            setClauses.push('dismissed_at = NOW()');
        }

        values.push(goalId);

        const result = await pool.query(
            `UPDATE driver_goals SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );

        res.json({
            id: result.rows[0].id,
            status: result.rows[0].status,
            updatedAt: result.rows[0].updated_at
        });

    } catch (error) {
        console.error('[Goals API] Error updating goal:', error);
        res.status(500).json({ error: 'Failed to update goal' });
    }
});

// =====================================================================
// DELETE /api/v1/goals/:goalId
// Delete a goal
// =====================================================================
router.delete('/:goalId', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { goalId } = req.params;

        const driverProfileId = await getDriverProfileId(userId);
        if (!driverProfileId) {
            res.status(404).json({ error: 'Driver profile not found' });
            return;
        }

        const result = await pool.query(
            `DELETE FROM driver_goals WHERE id = $1 AND driver_profile_id = $2 RETURNING id`,
            [goalId, driverProfileId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Goal not found' });
            return;
        }

        res.status(204).send();

    } catch (error) {
        console.error('[Goals API] Error deleting goal:', error);
        res.status(500).json({ error: 'Failed to delete goal' });
    }
});

// =====================================================================
// GET /api/v1/goals/:goalId/history
// Get progress history for a goal
// =====================================================================
router.get('/:goalId/history', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { goalId } = req.params;

        const driverProfileId = await getDriverProfileId(userId);
        if (!driverProfileId) {
            res.status(404).json({ error: 'Driver profile not found' });
            return;
        }

        // Verify ownership
        const existing = await pool.query(
            `SELECT id FROM driver_goals WHERE id = $1 AND driver_profile_id = $2`,
            [goalId, driverProfileId]
        );

        if (existing.rows.length === 0) {
            res.status(404).json({ error: 'Goal not found' });
            return;
        }

        const result = await pool.query(
            `SELECT value, progress_pct, trigger_type, trigger_notes, recorded_at
             FROM goal_progress_history
             WHERE goal_id = $1
             ORDER BY recorded_at DESC
             LIMIT 50`,
            [goalId]
        );

        res.json({
            history: result.rows.map(row => ({
                value: parseFloat(row.value),
                progressPct: parseFloat(row.progress_pct || '0'),
                triggerType: row.trigger_type,
                triggerNotes: row.trigger_notes,
                recordedAt: row.recorded_at
            }))
        });

    } catch (error) {
        console.error('[Goals API] Error fetching history:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// =====================================================================
// GET /api/v1/goals/achievements
// Get recent achievements
// =====================================================================
router.get('/achievements', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;

        const driverProfileId = await getDriverProfileId(userId);
        if (!driverProfileId) {
            res.status(404).json({ error: 'Driver profile not found' });
            return;
        }

        const result = await pool.query(
            `SELECT 
                ga.id, ga.achieved_value, ga.celebration_message, ga.achieved_at,
                dg.title, dg.category, dg.target_value
             FROM goal_achievements ga
             JOIN driver_goals dg ON ga.goal_id = dg.id
             WHERE ga.driver_profile_id = $1
             ORDER BY ga.achieved_at DESC
             LIMIT 20`,
            [driverProfileId]
        );

        res.json({
            achievements: result.rows.map(row => ({
                id: row.id,
                goalTitle: row.title,
                category: row.category,
                targetValue: parseFloat(row.target_value),
                achievedValue: parseFloat(row.achieved_value),
                celebrationMessage: row.celebration_message,
                achievedAt: row.achieved_at
            }))
        });

    } catch (error) {
        console.error('[Goals API] Error fetching achievements:', error);
        res.status(500).json({ error: 'Failed to fetch achievements' });
    }
});

export default router;
