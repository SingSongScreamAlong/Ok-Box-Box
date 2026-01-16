/**
 * Team Event Repository
 * CRUD operations for team_events and team_event_debriefs tables
 */

import { pool } from '../../db/client.js';

// ========================
// Types
// ========================

export interface TeamEvent {
    id: string;
    team_id: string;
    session_id: string;
    event_name: string | null;
    event_type: 'race' | 'practice' | 'qualifying' | 'other';
    scheduled_at: Date | null;
    participating_driver_ids: string[];
    created_at: Date;
}

export interface TeamEventDebrief {
    id: string;
    team_event_id: string;
    generated_by: string | null;
    team_summary: Record<string, unknown> | null;
    driver_summaries: Record<string, unknown>[];
    ai_model: string | null;
    ai_prompt_version: string | null;
    status: 'draft' | 'published';
    created_at: Date;
    updated_at: Date;
}

export interface CreateTeamEventDTO {
    team_id: string;
    session_id: string;
    event_name?: string;
    event_type?: 'race' | 'practice' | 'qualifying' | 'other';
    scheduled_at?: Date;
    participating_driver_ids?: string[];
}

// ========================
// Create
// ========================

export async function createTeamEvent(dto: CreateTeamEventDTO): Promise<TeamEvent> {
    const result = await pool.query<TeamEvent>(
        `INSERT INTO team_events (
            team_id, session_id, event_name, event_type, scheduled_at, participating_driver_ids
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [
            dto.team_id,
            dto.session_id,
            dto.event_name || null,
            dto.event_type || 'other',
            dto.scheduled_at || null,
            dto.participating_driver_ids || []
        ]
    );
    return result.rows[0];
}

// ========================
// Read
// ========================

export async function getTeamEventById(eventId: string): Promise<TeamEvent | null> {
    const result = await pool.query<TeamEvent>(
        `SELECT * FROM team_events WHERE id = $1`,
        [eventId]
    );
    return result.rows[0] || null;
}

export async function getTeamEvents(
    teamId: string,
    limit = 50,
    offset = 0
): Promise<TeamEvent[]> {
    const result = await pool.query<TeamEvent>(
        `SELECT * FROM team_events 
         WHERE team_id = $1 
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [teamId, limit, offset]
    );
    return result.rows;
}

export async function getEventBySessionId(
    teamId: string,
    sessionId: string
): Promise<TeamEvent | null> {
    const result = await pool.query<TeamEvent>(
        `SELECT * FROM team_events 
         WHERE team_id = $1 AND session_id = $2`,
        [teamId, sessionId]
    );
    return result.rows[0] || null;
}

// ========================
// Update
// ========================

export async function updateTeamEvent(
    eventId: string,
    updates: Partial<Pick<TeamEvent, 'event_name' | 'event_type' | 'participating_driver_ids'>>
): Promise<TeamEvent | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.event_name !== undefined) {
        fields.push(`event_name = $${paramIndex++}`);
        values.push(updates.event_name);
    }
    if (updates.event_type !== undefined) {
        fields.push(`event_type = $${paramIndex++}`);
        values.push(updates.event_type);
    }
    if (updates.participating_driver_ids !== undefined) {
        fields.push(`participating_driver_ids = $${paramIndex++}`);
        values.push(updates.participating_driver_ids);
    }

    if (fields.length === 0) return getTeamEventById(eventId);

    values.push(eventId);

    const result = await pool.query<TeamEvent>(
        `UPDATE team_events SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
    );
    return result.rows[0] || null;
}

// ========================
// Debriefs
// ========================

export async function createEventDebrief(
    teamEventId: string,
    driverSummaries: Record<string, unknown>[],
    teamSummary: Record<string, unknown> | null,
    aiModel: string | null,
    aiPromptVersion: string | null
): Promise<TeamEventDebrief> {
    const result = await pool.query<TeamEventDebrief>(
        `INSERT INTO team_event_debriefs (
            team_event_id, driver_summaries, team_summary, ai_model, ai_prompt_version, status
        ) VALUES ($1, $2, $3, $4, $5, 'draft')
        RETURNING *`,
        [teamEventId, JSON.stringify(driverSummaries), teamSummary ? JSON.stringify(teamSummary) : null, aiModel, aiPromptVersion]
    );
    return result.rows[0];
}

export async function getEventDebrief(teamEventId: string): Promise<TeamEventDebrief | null> {
    const result = await pool.query<TeamEventDebrief>(
        `SELECT * FROM team_event_debriefs WHERE team_event_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [teamEventId]
    );
    return result.rows[0] || null;
}

export async function publishDebrief(debriefId: string): Promise<TeamEventDebrief | null> {
    const result = await pool.query<TeamEventDebrief>(
        `UPDATE team_event_debriefs SET status = 'published', updated_at = NOW() WHERE id = $1 RETURNING *`,
        [debriefId]
    );
    return result.rows[0] || null;
}
