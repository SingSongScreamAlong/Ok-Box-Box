/**
 * Team Strategy API Routes
 * CRUD operations for team race strategy plans
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { pool } from '../../db/client.js';

const router = Router();

interface StrategyPlan {
    id: string;
    team_id: string;
    event_id: string | null;
    name: string;
    event_name: string | null;
    race_duration: string | null;
    total_laps: number | null;
    fuel_per_lap: number | null;
    tank_capacity: number | null;
    pit_time_loss: number | null;
    status: 'draft' | 'active' | 'completed' | 'archived';
    created_by: string | null;
    created_at: Date;
    updated_at: Date;
}

interface StrategyStint {
    id: string;
    strategy_plan_id: string;
    stint_number: number;
    driver_profile_id: string | null;
    driver_name: string | null;
    start_lap: number;
    end_lap: number;
    fuel_load: number | null;
    tire_compound: 'soft' | 'medium' | 'hard' | 'wet' | 'intermediate';
    notes: string | null;
    created_at: Date;
    updated_at: Date;
}

// GET /api/teams/:teamId/strategy - List all strategy plans
router.get('/:teamId/strategy', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const { teamId } = req.params;
        const { status, eventId } = req.query;

        let query = 'SELECT * FROM team_strategy_plans WHERE team_id = $1';
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

        const result = await pool.query<StrategyPlan>(query, params);

        res.json({
            success: true,
            data: {
                plans: result.rows,
                count: result.rows.length,
            },
        });
    } catch (error) {
        console.error('[TeamStrategy] Error listing plans:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to list strategy plans' } });
    }
});

// GET /api/teams/:teamId/strategy/:planId - Get a strategy plan with stints
router.get('/:teamId/strategy/:planId', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const { teamId, planId } = req.params;

        const planResult = await pool.query<StrategyPlan>(
            'SELECT * FROM team_strategy_plans WHERE id = $1 AND team_id = $2',
            [planId, teamId]
        );

        if (planResult.rows.length === 0) {
            res.status(404).json({ success: false, error: { message: 'Strategy plan not found' } });
            return;
        }

        const stintsResult = await pool.query<StrategyStint>(
            'SELECT * FROM team_strategy_stints WHERE strategy_plan_id = $1 ORDER BY stint_number',
            [planId]
        );

        res.json({
            success: true,
            data: {
                ...planResult.rows[0],
                stints: stintsResult.rows,
            },
        });
    } catch (error) {
        console.error('[TeamStrategy] Error getting plan:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to get strategy plan' } });
    }
});

// POST /api/teams/:teamId/strategy - Create a new strategy plan
router.post('/:teamId/strategy', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const { teamId } = req.params;
        const { 
            name, event_id, event_name, race_duration, total_laps,
            fuel_per_lap, tank_capacity, pit_time_loss, stints 
        } = req.body;

        if (!name) {
            res.status(400).json({ success: false, error: { message: 'name is required' } });
            return;
        }

        // Create plan
        const planResult = await pool.query<StrategyPlan>(
            `INSERT INTO team_strategy_plans (
                team_id, name, event_id, event_name, race_duration, total_laps,
                fuel_per_lap, tank_capacity, pit_time_loss, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *`,
            [
                teamId,
                name,
                event_id || null,
                event_name || null,
                race_duration || null,
                total_laps || null,
                fuel_per_lap || null,
                tank_capacity || null,
                pit_time_loss || null,
                req.user?.id || null,
            ]
        );

        const plan = planResult.rows[0];

        // Create stints if provided
        if (stints && Array.isArray(stints) && stints.length > 0) {
            for (const stint of stints) {
                await pool.query(
                    `INSERT INTO team_strategy_stints (
                        strategy_plan_id, stint_number, driver_profile_id, driver_name,
                        start_lap, end_lap, fuel_load, tire_compound, notes
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                    [
                        plan.id,
                        stint.stint_number,
                        stint.driver_profile_id || null,
                        stint.driver_name || null,
                        stint.start_lap,
                        stint.end_lap,
                        stint.fuel_load || null,
                        stint.tire_compound || 'medium',
                        stint.notes || null,
                    ]
                );
            }
        }

        // Fetch complete plan with stints
        const stintsResult = await pool.query<StrategyStint>(
            'SELECT * FROM team_strategy_stints WHERE strategy_plan_id = $1 ORDER BY stint_number',
            [plan.id]
        );

        res.status(201).json({
            success: true,
            data: {
                ...plan,
                stints: stintsResult.rows,
            },
        });
    } catch (error) {
        console.error('[TeamStrategy] Error creating plan:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to create strategy plan' } });
    }
});

// PATCH /api/teams/:teamId/strategy/:planId - Update a strategy plan
router.patch('/:teamId/strategy/:planId', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const { teamId, planId } = req.params;
        const { name, event_name, race_duration, total_laps, fuel_per_lap, tank_capacity, pit_time_loss, status } = req.body;

        const updates: string[] = [];
        const values: unknown[] = [];
        let paramCount = 1;

        if (name !== undefined) { updates.push(`name = $${paramCount++}`); values.push(name); }
        if (event_name !== undefined) { updates.push(`event_name = $${paramCount++}`); values.push(event_name); }
        if (race_duration !== undefined) { updates.push(`race_duration = $${paramCount++}`); values.push(race_duration); }
        if (total_laps !== undefined) { updates.push(`total_laps = $${paramCount++}`); values.push(total_laps); }
        if (fuel_per_lap !== undefined) { updates.push(`fuel_per_lap = $${paramCount++}`); values.push(fuel_per_lap); }
        if (tank_capacity !== undefined) { updates.push(`tank_capacity = $${paramCount++}`); values.push(tank_capacity); }
        if (pit_time_loss !== undefined) { updates.push(`pit_time_loss = $${paramCount++}`); values.push(pit_time_loss); }
        if (status !== undefined) { updates.push(`status = $${paramCount++}`); values.push(status); }

        if (updates.length === 0) {
            res.status(400).json({ success: false, error: { message: 'No updates provided' } });
            return;
        }

        updates.push(`updated_at = NOW()`);
        values.push(planId, teamId);

        const result = await pool.query<StrategyPlan>(
            `UPDATE team_strategy_plans SET ${updates.join(', ')} 
             WHERE id = $${paramCount++} AND team_id = $${paramCount}
             RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            res.status(404).json({ success: false, error: { message: 'Strategy plan not found' } });
            return;
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('[TeamStrategy] Error updating plan:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to update strategy plan' } });
    }
});

// DELETE /api/teams/:teamId/strategy/:planId - Delete a strategy plan
router.delete('/:teamId/strategy/:planId', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const { teamId, planId } = req.params;

        const result = await pool.query(
            'DELETE FROM team_strategy_plans WHERE id = $1 AND team_id = $2',
            [planId, teamId]
        );

        if ((result.rowCount ?? 0) === 0) {
            res.status(404).json({ success: false, error: { message: 'Strategy plan not found' } });
            return;
        }

        res.status(204).send();
    } catch (error) {
        console.error('[TeamStrategy] Error deleting plan:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to delete strategy plan' } });
    }
});

// POST /api/teams/:teamId/strategy/:planId/stints - Add a stint to a plan
router.post('/:teamId/strategy/:planId/stints', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const { planId } = req.params;
        const { stint_number, driver_profile_id, driver_name, start_lap, end_lap, fuel_load, tire_compound, notes } = req.body;

        if (stint_number === undefined || start_lap === undefined || end_lap === undefined) {
            res.status(400).json({ 
                success: false, 
                error: { message: 'stint_number, start_lap, and end_lap are required' } 
            });
            return;
        }

        const result = await pool.query<StrategyStint>(
            `INSERT INTO team_strategy_stints (
                strategy_plan_id, stint_number, driver_profile_id, driver_name,
                start_lap, end_lap, fuel_load, tire_compound, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *`,
            [
                planId,
                stint_number,
                driver_profile_id || null,
                driver_name || null,
                start_lap,
                end_lap,
                fuel_load || null,
                tire_compound || 'medium',
                notes || null,
            ]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('[TeamStrategy] Error adding stint:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to add stint' } });
    }
});

// DELETE /api/teams/:teamId/strategy/:planId/stints/:stintId - Remove a stint
router.delete('/:teamId/strategy/:planId/stints/:stintId', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const { planId, stintId } = req.params;

        const result = await pool.query(
            'DELETE FROM team_strategy_stints WHERE id = $1 AND strategy_plan_id = $2',
            [stintId, planId]
        );

        if ((result.rowCount ?? 0) === 0) {
            res.status(404).json({ success: false, error: { message: 'Stint not found' } });
            return;
        }

        res.status(204).send();
    } catch (error) {
        console.error('[TeamStrategy] Error deleting stint:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to delete stint' } });
    }
});

export default router;
