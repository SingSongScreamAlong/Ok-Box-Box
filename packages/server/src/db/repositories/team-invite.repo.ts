/**
 * Team Invite Repository
 * Token-based invite management
 */

import { pool } from '../client.js';
import crypto from 'crypto';

export interface TeamInvite {
    id: string;
    team_id: string;
    email: string;
    role: 'driver' | 'engineer' | 'analyst' | 'admin' | 'owner';
    scope: 'team_standard' | 'team_deep';
    token: string;
    expires_at: Date;
    created_by_user_id: string | null;
    created_at: Date;
    accepted_at: Date | null;
    revoked_at: Date | null;
}

export interface CreateInviteDTO {
    team_id: string;
    email: string;
    role?: 'driver' | 'engineer' | 'analyst' | 'admin';
    scope?: 'team_standard' | 'team_deep';
    created_by_user_id: string;
    expires_in_days?: number;
}

export async function createInvite(dto: CreateInviteDTO): Promise<TeamInvite> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (dto.expires_in_days || 7));

    const result = await pool.query<TeamInvite>(
        `INSERT INTO team_invites (team_id, email, role, scope, token, expires_at, created_by_user_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [dto.team_id, dto.email.toLowerCase(), dto.role || 'driver', dto.scope || 'team_standard', token, expiresAt, dto.created_by_user_id]
    );
    return result.rows[0];
}

export async function getInviteByToken(token: string): Promise<TeamInvite | null> {
    const result = await pool.query<TeamInvite>(`SELECT * FROM team_invites WHERE token = $1`, [token]);
    return result.rows[0] || null;
}

export async function getPendingInvitesForTeam(teamId: string): Promise<TeamInvite[]> {
    const result = await pool.query<TeamInvite>(
        `SELECT * FROM team_invites WHERE team_id = $1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > NOW() ORDER BY created_at DESC`,
        [teamId]
    );
    return result.rows;
}

export async function getPendingInviteByEmail(teamId: string, email: string): Promise<TeamInvite | null> {
    const result = await pool.query<TeamInvite>(
        `SELECT * FROM team_invites WHERE team_id = $1 AND email = $2 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > NOW()`,
        [teamId, email.toLowerCase()]
    );
    return result.rows[0] || null;
}

export async function acceptInvite(inviteId: string): Promise<TeamInvite | null> {
    const result = await pool.query<TeamInvite>(
        `UPDATE team_invites SET accepted_at = NOW() WHERE id = $1 AND accepted_at IS NULL AND revoked_at IS NULL RETURNING *`,
        [inviteId]
    );
    return result.rows[0] || null;
}

export async function revokeInvite(inviteId: string): Promise<TeamInvite | null> {
    const result = await pool.query<TeamInvite>(
        `UPDATE team_invites SET revoked_at = NOW() WHERE id = $1 AND accepted_at IS NULL RETURNING *`,
        [inviteId]
    );
    return result.rows[0] || null;
}

export function isInviteValid(invite: TeamInvite): boolean {
    if (invite.accepted_at) return false;
    if (invite.revoked_at) return false;
    if (new Date(invite.expires_at) < new Date()) return false;
    return true;
}
