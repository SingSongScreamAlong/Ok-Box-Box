/**
 * Driver Goals Repository
 * Database operations for driver development targets/goals
 */

import { pool } from '../client.js';

export interface DriverGoal {
    id: string;
    driver_profile_id: string;
    title: string;
    description: string | null;
    category: string;
    metric_key: string | null;
    target_value: number;
    current_value: number;
    starting_value: number | null;
    unit: string | null;
    track_name: string | null;
    car_name: string | null;
    discipline: string | null;
    series_name: string | null;
    status: 'suggested' | 'active' | 'achieved' | 'failed' | 'dismissed' | 'paused';
    priority: number;
    deadline: string | null;
    source: 'self_set' | 'ai_recommended' | 'team_assigned' | 'system_milestone';
    ai_rationale: string | null;
    ai_confidence: number | null;
    progress_pct: number;
    last_progress_update: string | null;
    created_at: string;
    updated_at: string;
    achieved_at: string | null;
    dismissed_at: string | null;
}

export interface CreateGoalDTO {
    driver_profile_id: string;
    title: string;
    description?: string;
    category: string;
    metric_key?: string;
    target_value: number;
    current_value?: number;
    starting_value?: number;
    unit?: string;
    track_name?: string;
    car_name?: string;
    discipline?: string;
    series_name?: string;
    priority?: number;
    deadline?: string;
    source: 'self_set' | 'ai_recommended' | 'team_assigned' | 'system_milestone';
    ai_rationale?: string;
    ai_confidence?: number;
}

export interface UpdateGoalDTO {
    title?: string;
    description?: string;
    target_value?: number;
    current_value?: number;
    status?: DriverGoal['status'];
    priority?: number;
    deadline?: string;
}

/**
 * Get all goals for a driver
 */
export async function getGoalsForDriver(
    driverProfileId: string,
    status?: string
): Promise<DriverGoal[]> {
    let query = `
        SELECT * FROM driver_goals 
        WHERE driver_profile_id = $1
    `;
    const params: unknown[] = [driverProfileId];

    if (status) {
        query += ` AND status = $2`;
        params.push(status);
    }

    query += ` ORDER BY priority DESC, created_at DESC`;

    const result = await pool.query(query, params);
    return result.rows;
}

/**
 * Get a single goal by ID
 */
export async function getGoalById(goalId: string): Promise<DriverGoal | null> {
    const result = await pool.query(
        `SELECT * FROM driver_goals WHERE id = $1`,
        [goalId]
    );
    return result.rows[0] || null;
}

/**
 * Create a new goal
 */
export async function createGoal(dto: CreateGoalDTO): Promise<DriverGoal> {
    const result = await pool.query(
        `INSERT INTO driver_goals (
            driver_profile_id, title, description, category, metric_key,
            target_value, current_value, starting_value, unit,
            track_name, car_name, discipline, series_name,
            priority, deadline, source, ai_rationale, ai_confidence,
            status, progress_pct
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *`,
        [
            dto.driver_profile_id,
            dto.title,
            dto.description || null,
            dto.category,
            dto.metric_key || null,
            dto.target_value,
            dto.current_value ?? 0,
            dto.starting_value ?? dto.current_value ?? 0,
            dto.unit || null,
            dto.track_name || null,
            dto.car_name || null,
            dto.discipline || null,
            dto.series_name || null,
            dto.priority ?? 5,
            dto.deadline || null,
            dto.source,
            dto.ai_rationale || null,
            dto.ai_confidence || null,
            dto.source === 'ai_recommended' ? 'suggested' : 'active',
            0
        ]
    );
    return result.rows[0];
}

/**
 * Update a goal
 */
export async function updateGoal(
    goalId: string,
    dto: UpdateGoalDTO
): Promise<DriverGoal | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (dto.title !== undefined) {
        updates.push(`title = $${paramIndex++}`);
        values.push(dto.title);
    }
    if (dto.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(dto.description);
    }
    if (dto.target_value !== undefined) {
        updates.push(`target_value = $${paramIndex++}`);
        values.push(dto.target_value);
    }
    if (dto.current_value !== undefined) {
        updates.push(`current_value = $${paramIndex++}`);
        values.push(dto.current_value);
        updates.push(`last_progress_update = NOW()`);
    }
    if (dto.status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        values.push(dto.status);
        if (dto.status === 'achieved') {
            updates.push(`achieved_at = NOW()`);
        } else if (dto.status === 'dismissed') {
            updates.push(`dismissed_at = NOW()`);
        }
    }
    if (dto.priority !== undefined) {
        updates.push(`priority = $${paramIndex++}`);
        values.push(dto.priority);
    }
    if (dto.deadline !== undefined) {
        updates.push(`deadline = $${paramIndex++}`);
        values.push(dto.deadline);
    }

    if (updates.length === 0) {
        return getGoalById(goalId);
    }

    values.push(goalId);
    const result = await pool.query(
        `UPDATE driver_goals SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id = $${paramIndex}
         RETURNING *`,
        values
    );
    return result.rows[0] || null;
}

/**
 * Delete a goal
 */
export async function deleteGoal(goalId: string): Promise<boolean> {
    const result = await pool.query(
        `DELETE FROM driver_goals WHERE id = $1`,
        [goalId]
    );
    return (result.rowCount ?? 0) > 0;
}

/**
 * Update goal progress and recalculate progress percentage
 */
export async function updateGoalProgress(
    goalId: string,
    newValue: number,
    triggerType: string = 'manual_update',
    triggerSessionId?: string,
    triggerNotes?: string
): Promise<DriverGoal | null> {
    // Use the database function to update progress
    const result = await pool.query(
        `SELECT * FROM update_goal_progress($1, $2, $3, $4, $5)`,
        [goalId, newValue, triggerType, triggerSessionId || null, triggerNotes || null]
    );
    return result.rows[0] || null;
}

/**
 * Get goal progress history
 */
export async function getGoalProgressHistory(
    goalId: string,
    limit: number = 50
): Promise<Array<{
    value: number;
    progress_pct: number;
    trigger_type: string;
    recorded_at: string;
}>> {
    const result = await pool.query(
        `SELECT value, progress_pct, trigger_type, recorded_at
         FROM goal_progress_history
         WHERE goal_id = $1
         ORDER BY recorded_at DESC
         LIMIT $2`,
        [goalId, limit]
    );
    return result.rows;
}

/**
 * Get goal achievements for a driver
 */
export async function getDriverAchievements(
    driverProfileId: string,
    limit: number = 20
): Promise<Array<{
    id: string;
    goal_id: string;
    achieved_value: number;
    celebration_message: string | null;
    achieved_at: string;
}>> {
    const result = await pool.query(
        `SELECT ga.id, ga.goal_id, ga.achieved_value, ga.celebration_message, ga.achieved_at
         FROM goal_achievements ga
         WHERE ga.driver_profile_id = $1
         ORDER BY ga.achieved_at DESC
         LIMIT $2`,
        [driverProfileId, limit]
    );
    return result.rows;
}

/**
 * Get goal suggestions using the database function
 */
export async function getGoalSuggestions(
    driverProfileId: string,
    currentIrating?: number,
    currentSr?: number,
    currentLicense?: number,
    incidentRate?: number,
    raceCount?: number
): Promise<Array<{
    template_id: string;
    template_name: string;
    category: string;
    suggested_target: number;
    rationale: string;
    priority: number;
}>> {
    const result = await pool.query(
        `SELECT * FROM generate_goal_suggestions($1, $2, $3, $4, $5, $6)`,
        [
            driverProfileId,
            currentIrating || null,
            currentSr || null,
            currentLicense || null,
            incidentRate || null,
            raceCount || null
        ]
    );
    return result.rows;
}
