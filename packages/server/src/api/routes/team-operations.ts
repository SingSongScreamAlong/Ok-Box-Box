/**
 * Team Operations API Routes
 * 
 * CRUD operations for team events, race plans, stints, and pit stops.
 * Used by the Team tier pitwall and strategy tools.
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { pool } from '../../db/client.js';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// =====================================================================
// Helper: Check team membership
// =====================================================================
async function checkTeamAccess(userId: string, teamId: string): Promise<boolean> {
    const result = await pool.query(
        `SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2`,
        [teamId, userId]
    );
    return result.rows.length > 0;
}

// =====================================================================
// GET /api/v1/teams/:teamId
// Get team details
// =====================================================================
router.get('/:teamId', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { teamId } = req.params;

        const hasAccess = await checkTeamAccess(userId, teamId);
        if (!hasAccess) {
            res.status(403).json({ error: 'Not a member of this team' });
            return;
        }

        const result = await pool.query(
            `SELECT id, name, short_name, logo_url, primary_color, secondary_color, created_at
             FROM teams WHERE id = $1`,
            [teamId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Team not found' });
            return;
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('[Team API] Error fetching team:', error);
        res.status(500).json({ error: 'Failed to fetch team' });
    }
});

// =====================================================================
// GET /api/v1/teams/:teamId/drivers
// Get team drivers/roster
// =====================================================================
router.get('/:teamId/drivers', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { teamId } = req.params;

        const hasAccess = await checkTeamAccess(userId, teamId);
        if (!hasAccess) {
            res.status(403).json({ error: 'Not a member of this team' });
            return;
        }

        const result = await pool.query(
            `SELECT 
                tm.id as membership_id,
                tm.role,
                tm.joined_at,
                dp.id as driver_id,
                dp.display_name,
                dp.primary_discipline,
                ip.irating_road,
                ip.irating_oval,
                ip.sr_road,
                ip.sr_oval,
                ip.license_road,
                ip.license_oval
             FROM team_members tm
             JOIN driver_profiles dp ON tm.user_id = dp.user_account_id
             LEFT JOIN iracing_profiles ip ON tm.user_id = ip.admin_user_id
             WHERE tm.team_id = $1
             ORDER BY tm.role, dp.display_name`,
            [teamId]
        );

        res.json({
            drivers: result.rows.map(row => ({
                id: row.driver_id,
                membershipId: row.membership_id,
                displayName: row.display_name,
                role: row.role,
                joinedAt: row.joined_at,
                discipline: row.primary_discipline,
                irating: {
                    road: row.irating_road,
                    oval: row.irating_oval
                },
                safetyRating: {
                    road: row.sr_road ? row.sr_road / 100 : null,
                    oval: row.sr_oval ? row.sr_oval / 100 : null
                },
                license: {
                    road: row.license_road,
                    oval: row.license_oval
                }
            }))
        });
    } catch (error) {
        console.error('[Team API] Error fetching drivers:', error);
        res.status(500).json({ error: 'Failed to fetch drivers' });
    }
});

// =====================================================================
// GET /api/v1/teams/:teamId/events
// Get team events
// =====================================================================
router.get('/:teamId/events', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { teamId } = req.params;
        const { status } = req.query;

        const hasAccess = await checkTeamAccess(userId, teamId);
        if (!hasAccess) {
            res.status(403).json({ error: 'Not a member of this team' });
            return;
        }

        let query = `
            SELECT * FROM team_events 
            WHERE team_id = $1
        `;
        const params: any[] = [teamId];

        if (status) {
            query += ` AND status = $2`;
            params.push(status);
        }

        query += ` ORDER BY event_date DESC`;

        const result = await pool.query(query, params);

        res.json({
            events: result.rows.map(row => ({
                id: row.id,
                name: row.name,
                seriesName: row.series_name,
                trackName: row.track_name,
                trackConfig: row.track_config,
                eventDate: row.event_date,
                durationMinutes: row.duration_minutes,
                totalLaps: row.total_laps,
                status: row.status,
                carClass: row.car_class,
                weatherType: row.weather_type,
                finishPosition: row.finish_position,
                classPosition: row.class_position,
                lapsCompleted: row.laps_completed,
                totalIncidents: row.total_incidents
            }))
        });
    } catch (error) {
        console.error('[Team API] Error fetching events:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

// =====================================================================
// POST /api/v1/teams/:teamId/events
// Create a new event
// =====================================================================
router.post('/:teamId/events', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { teamId } = req.params;
        const { name, seriesName, trackName, trackConfig, eventDate, durationMinutes, totalLaps, carClass, weatherType } = req.body;

        const hasAccess = await checkTeamAccess(userId, teamId);
        if (!hasAccess) {
            res.status(403).json({ error: 'Not a member of this team' });
            return;
        }

        if (!name || !trackName || !eventDate) {
            res.status(400).json({ error: 'Missing required fields: name, trackName, eventDate' });
            return;
        }

        const result = await pool.query(
            `INSERT INTO team_events (team_id, name, series_name, track_name, track_config, event_date, duration_minutes, total_laps, car_class, weather_type)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [teamId, name, seriesName, trackName, trackConfig, eventDate, durationMinutes, totalLaps, carClass, weatherType]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('[Team API] Error creating event:', error);
        res.status(500).json({ error: 'Failed to create event' });
    }
});

// =====================================================================
// GET /api/v1/teams/:teamId/race-plans
// Get race plans for team (optionally filtered by event)
// =====================================================================
router.get('/:teamId/race-plans', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { teamId } = req.params;
        const { eventId } = req.query;

        const hasAccess = await checkTeamAccess(userId, teamId);
        if (!hasAccess) {
            res.status(403).json({ error: 'Not a member of this team' });
            return;
        }

        let query = `
            SELECT rp.*, te.name as event_name, te.track_name
            FROM race_plans rp
            LEFT JOIN team_events te ON rp.event_id = te.id
            WHERE rp.team_id = $1
        `;
        const params: any[] = [teamId];

        if (eventId) {
            query += ` AND rp.event_id = $2`;
            params.push(eventId);
        }

        query += ` ORDER BY rp.is_active DESC, rp.created_at DESC`;

        const result = await pool.query(query, params);

        res.json({
            plans: result.rows.map(row => ({
                id: row.id,
                name: row.name,
                description: row.description,
                eventId: row.event_id,
                eventName: row.event_name,
                trackName: row.track_name,
                isActive: row.is_active,
                status: row.status,
                totalPitStops: row.total_pit_stops,
                fuelStrategy: row.fuel_strategy,
                tireStrategy: row.tire_strategy,
                targetLapTimeMs: row.target_lap_time_ms,
                fuelPerLap: row.fuel_per_lap ? parseFloat(row.fuel_per_lap) : null,
                notes: row.notes,
                createdAt: row.created_at
            }))
        });
    } catch (error) {
        console.error('[Team API] Error fetching race plans:', error);
        res.status(500).json({ error: 'Failed to fetch race plans' });
    }
});

// =====================================================================
// POST /api/v1/teams/:teamId/race-plans
// Create a new race plan
// =====================================================================
router.post('/:teamId/race-plans', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { teamId } = req.params;
        const { name, description, eventId, fuelStrategy, tireStrategy, targetLapTimeMs, fuelPerLap, notes } = req.body;

        const hasAccess = await checkTeamAccess(userId, teamId);
        if (!hasAccess) {
            res.status(403).json({ error: 'Not a member of this team' });
            return;
        }

        if (!name) {
            res.status(400).json({ error: 'Missing required field: name' });
            return;
        }

        const result = await pool.query(
            `INSERT INTO race_plans (team_id, event_id, name, description, fuel_strategy, tire_strategy, target_lap_time_ms, fuel_per_lap, notes, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [teamId, eventId || null, name, description, fuelStrategy, tireStrategy, targetLapTimeMs, fuelPerLap, notes, userId]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('[Team API] Error creating race plan:', error);
        res.status(500).json({ error: 'Failed to create race plan' });
    }
});

// =====================================================================
// PATCH /api/v1/teams/:teamId/race-plans/:planId/activate
// Set a plan as active (deactivates others for same event)
// =====================================================================
router.patch('/:teamId/race-plans/:planId/activate', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { teamId, planId } = req.params;

        const hasAccess = await checkTeamAccess(userId, teamId);
        if (!hasAccess) {
            res.status(403).json({ error: 'Not a member of this team' });
            return;
        }

        // Get the plan to find its event
        const planResult = await pool.query(
            `SELECT event_id FROM race_plans WHERE id = $1 AND team_id = $2`,
            [planId, teamId]
        );

        if (planResult.rows.length === 0) {
            res.status(404).json({ error: 'Race plan not found' });
            return;
        }

        const eventId = planResult.rows[0].event_id;

        // Deactivate other plans for same event
        if (eventId) {
            await pool.query(
                `UPDATE race_plans SET is_active = false WHERE team_id = $1 AND event_id = $2`,
                [teamId, eventId]
            );
        }

        // Activate this plan
        await pool.query(
            `UPDATE race_plans SET is_active = true, status = 'active' WHERE id = $1`,
            [planId]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('[Team API] Error activating plan:', error);
        res.status(500).json({ error: 'Failed to activate plan' });
    }
});

// =====================================================================
// GET /api/v1/teams/:teamId/race-plans/:planId/stints
// Get stints for a race plan
// =====================================================================
router.get('/:teamId/race-plans/:planId/stints', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { teamId, planId } = req.params;

        const hasAccess = await checkTeamAccess(userId, teamId);
        if (!hasAccess) {
            res.status(403).json({ error: 'Not a member of this team' });
            return;
        }

        const result = await pool.query(
            `SELECT s.*, dp.display_name as driver_display_name
             FROM stints s
             LEFT JOIN driver_profiles dp ON s.driver_profile_id = dp.id
             WHERE s.race_plan_id = $1
             ORDER BY s.stint_number`,
            [planId]
        );

        res.json({
            stints: result.rows.map(row => ({
                id: row.id,
                stintNumber: row.stint_number,
                driverId: row.driver_profile_id,
                driverName: row.driver_display_name || row.driver_name,
                startLap: row.start_lap,
                endLap: row.end_lap,
                estimatedDurationMinutes: row.estimated_duration_minutes,
                fuelLoad: row.fuel_load ? parseFloat(row.fuel_load) : null,
                fuelTargetLaps: row.fuel_target_laps,
                tireCompound: row.tire_compound,
                tireChange: row.tire_change,
                status: row.status,
                actualLaps: row.actual_laps,
                actualAvgLapMs: row.actual_avg_lap_ms,
                actualBestLapMs: row.actual_best_lap_ms,
                actualIncidents: row.actual_incidents,
                notes: row.notes
            }))
        });
    } catch (error) {
        console.error('[Team API] Error fetching stints:', error);
        res.status(500).json({ error: 'Failed to fetch stints' });
    }
});

// =====================================================================
// POST /api/v1/teams/:teamId/race-plans/:planId/stints
// Add a stint to a race plan
// =====================================================================
router.post('/:teamId/race-plans/:planId/stints', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { teamId, planId } = req.params;
        const { driverId, driverName, stintNumber, startLap, endLap, estimatedDurationMinutes, fuelLoad, fuelTargetLaps, tireCompound, tireChange, notes } = req.body;

        const hasAccess = await checkTeamAccess(userId, teamId);
        if (!hasAccess) {
            res.status(403).json({ error: 'Not a member of this team' });
            return;
        }

        // Verify plan belongs to team
        const planCheck = await pool.query(
            `SELECT 1 FROM race_plans WHERE id = $1 AND team_id = $2`,
            [planId, teamId]
        );

        if (planCheck.rows.length === 0) {
            res.status(404).json({ error: 'Race plan not found' });
            return;
        }

        const result = await pool.query(
            `INSERT INTO stints (race_plan_id, driver_profile_id, driver_name, stint_number, start_lap, end_lap, estimated_duration_minutes, fuel_load, fuel_target_laps, tire_compound, tire_change, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             RETURNING *`,
            [planId, driverId || null, driverName || null, stintNumber || 1, startLap, endLap, estimatedDurationMinutes, fuelLoad, fuelTargetLaps, tireCompound, tireChange ?? true, notes]
        );

        // Update pit stop count on plan
        await pool.query(
            `UPDATE race_plans SET total_pit_stops = (SELECT COUNT(*) - 1 FROM stints WHERE race_plan_id = $1) WHERE id = $1`,
            [planId]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('[Team API] Error creating stint:', error);
        res.status(500).json({ error: 'Failed to create stint' });
    }
});

// =====================================================================
// PATCH /api/v1/teams/:teamId/stints/:stintId
// Update a stint
// =====================================================================
router.patch('/:teamId/stints/:stintId', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { teamId, stintId } = req.params;
        const updates = req.body;

        const hasAccess = await checkTeamAccess(userId, teamId);
        if (!hasAccess) {
            res.status(403).json({ error: 'Not a member of this team' });
            return;
        }

        // Verify stint belongs to team's plan
        const stintCheck = await pool.query(
            `SELECT s.id FROM stints s
             JOIN race_plans rp ON s.race_plan_id = rp.id
             WHERE s.id = $1 AND rp.team_id = $2`,
            [stintId, teamId]
        );

        if (stintCheck.rows.length === 0) {
            res.status(404).json({ error: 'Stint not found' });
            return;
        }

        // Build update query
        const allowedFields = ['driver_profile_id', 'driver_name', 'stint_number', 'start_lap', 'end_lap', 'estimated_duration_minutes', 'fuel_load', 'fuel_target_laps', 'tire_compound', 'tire_change', 'status', 'notes'];
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

        values.push(stintId);
        await pool.query(
            `UPDATE stints SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`,
            values
        );

        res.json({ success: true });
    } catch (error) {
        console.error('[Team API] Error updating stint:', error);
        res.status(500).json({ error: 'Failed to update stint' });
    }
});

// =====================================================================
// DELETE /api/v1/teams/:teamId/stints/:stintId
// Delete a stint
// =====================================================================
router.delete('/:teamId/stints/:stintId', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { teamId, stintId } = req.params;

        const hasAccess = await checkTeamAccess(userId, teamId);
        if (!hasAccess) {
            res.status(403).json({ error: 'Not a member of this team' });
            return;
        }

        // Get plan ID before deleting
        const stintResult = await pool.query(
            `SELECT s.race_plan_id FROM stints s
             JOIN race_plans rp ON s.race_plan_id = rp.id
             WHERE s.id = $1 AND rp.team_id = $2`,
            [stintId, teamId]
        );

        if (stintResult.rows.length === 0) {
            res.status(404).json({ error: 'Stint not found' });
            return;
        }

        const planId = stintResult.rows[0].race_plan_id;

        await pool.query(`DELETE FROM stints WHERE id = $1`, [stintId]);

        // Update pit stop count
        await pool.query(
            `UPDATE race_plans SET total_pit_stops = GREATEST(0, (SELECT COUNT(*) - 1 FROM stints WHERE race_plan_id = $1)) WHERE id = $1`,
            [planId]
        );

        res.status(204).send();
    } catch (error) {
        console.error('[Team API] Error deleting stint:', error);
        res.status(500).json({ error: 'Failed to delete stint' });
    }
});

export default router;
