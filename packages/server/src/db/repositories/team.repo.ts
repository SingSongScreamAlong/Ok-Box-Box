/**
 * Team Repository
 * CRUD operations for Team entities
 */

import { pool } from '../client.js';
import type { Team, CreateTeamDTO, UpdateTeamDTO } from '../../driverbox/types/team.types.js';

// ========================
// Create
// ========================

export async function createTeam(dto: CreateTeamDTO, ownerUserId: string): Promise<Team> {
    const result = await pool.query<Team>(
        `INSERT INTO teams (name, short_name, logo_url, primary_color, owner_user_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
        [dto.name, dto.short_name || null, dto.logo_url || null, dto.primary_color || null, ownerUserId]
    );
    return result.rows[0];
}

// ========================
// Read
// ========================

export async function getTeamById(teamId: string): Promise<Team | null> {
    const result = await pool.query<Team>(
        'SELECT * FROM teams WHERE id = $1',
        [teamId]
    );
    return result.rows[0] || null;
}

export async function getTeamsByOwner(userId: string): Promise<Team[]> {
    const result = await pool.query<Team>(
        `SELECT * FROM teams 
     WHERE owner_user_id = $1 AND status = 'active'
     ORDER BY name`,
        [userId]
    );
    return result.rows;
}

export async function getTeamsForUser(userId: string): Promise<Team[]> {
    // Get teams user owns OR is a member of
    const result = await pool.query<Team>(
        `SELECT DISTINCT t.* FROM teams t
     LEFT JOIN team_memberships tm ON tm.team_id = t.id
     LEFT JOIN driver_profiles dp ON dp.id = tm.driver_profile_id
     WHERE t.status = 'active'
       AND (
         t.owner_user_id = $1
         OR (dp.user_account_id = $1 AND tm.status = 'active')
       )
     ORDER BY t.name`,
        [userId]
    );
    return result.rows;
}

export async function searchTeams(query: string, limit: number = 20): Promise<Team[]> {
    const result = await pool.query<Team>(
        `SELECT * FROM teams 
     WHERE status = 'active' 
       AND (name ILIKE $1 OR short_name ILIKE $1)
     ORDER BY name
     LIMIT $2`,
        [`%${query}%`, limit]
    );
    return result.rows;
}

// ========================
// Update
// ========================

export async function updateTeam(teamId: string, dto: UpdateTeamDTO): Promise<Team | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (dto.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(dto.name);
    }
    if (dto.short_name !== undefined) {
        updates.push(`short_name = $${paramIndex++}`);
        values.push(dto.short_name);
    }
    if (dto.logo_url !== undefined) {
        updates.push(`logo_url = $${paramIndex++}`);
        values.push(dto.logo_url);
    }
    if (dto.primary_color !== undefined) {
        updates.push(`primary_color = $${paramIndex++}`);
        values.push(dto.primary_color);
    }
    if (dto.status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        values.push(dto.status);
    }

    if (updates.length === 0) {
        return getTeamById(teamId);
    }

    updates.push(`updated_at = NOW()`);
    values.push(teamId);

    const result = await pool.query<Team>(
        `UPDATE teams SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
    );
    return result.rows[0] || null;
}

// ========================
// Delete (Archive)
// ========================

export async function archiveTeam(teamId: string): Promise<boolean> {
    const result = await pool.query(
        `UPDATE teams SET status = 'archived', updated_at = NOW() WHERE id = $1`,
        [teamId]
    );
    return (result.rowCount ?? 0) > 0;
}

// ========================
// Helpers
// ========================

export async function isTeamOwner(teamId: string, userId: string): Promise<boolean> {
    const result = await pool.query<{ owner_user_id: string }>(
        'SELECT owner_user_id FROM teams WHERE id = $1',
        [teamId]
    );
    return result.rows[0]?.owner_user_id === userId;
}

export async function getTeamMemberCount(teamId: string): Promise<number> {
    const result = await pool.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM team_memberships 
     WHERE team_id = $1 AND status = 'active'`,
        [teamId]
    );
    return parseInt(result.rows[0]?.count || '0', 10);
}
