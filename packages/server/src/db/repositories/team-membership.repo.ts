/**
 * Team Membership Repository
 * Manages driver ↔ team relationships
 * Links to IDP access grants for data access
 */

import { pool } from '../client.js';
import type { TeamMembership, TeamRole, InviteDriverDTO } from '../../driverbox/types/team.types.js';
import { createAccessGrant, revokeGrant } from './driver-profile.repo.js';

// ========================
// Invite / Join
// ========================

export async function inviteDriver(
    teamId: string,
    dto: InviteDriverDTO,
    invitedBy: string
): Promise<TeamMembership> {
    const result = await pool.query<TeamMembership>(
        `INSERT INTO team_memberships (team_id, driver_profile_id, role, status, invited_by)
     VALUES ($1, $2, $3, 'invited', $4)
     RETURNING *`,
        [teamId, dto.driver_profile_id, dto.role || 'driver', invitedBy]
    );
    return result.rows[0];
}

export async function acceptInvitation(
    membershipId: string,
    driverProfileId: string,
    scope: 'team_standard' | 'team_deep'
): Promise<TeamMembership | null> {
    // Get the membership
    const membership = await getMembershipById(membershipId);
    if (!membership || membership.driver_profile_id !== driverProfileId) {
        return null;
    }
    if (membership.status !== 'invited') {
        return null; // Already processed
    }

    // Create access grant for the team
    const grant = await createAccessGrant(driverProfileId, {
        grantee_type: 'team',
        grantee_id: membership.team_id,
        scope,
    }, driverProfileId);

    // Update membership to active
    const result = await pool.query<TeamMembership>(
        `UPDATE team_memberships 
     SET status = 'active', joined_at = NOW(), access_grant_id = $1
     WHERE id = $2
     RETURNING *`,
        [grant.id, membershipId]
    );

    return result.rows[0] || null;
}

export async function declineInvitation(membershipId: string, driverProfileId: string): Promise<boolean> {
    const result = await pool.query(
        `UPDATE team_memberships 
     SET status = 'removed'
     WHERE id = $1 AND driver_profile_id = $2 AND status = 'invited'`,
        [membershipId, driverProfileId]
    );
    return (result.rowCount ?? 0) > 0;
}

// ========================
// Leave / Remove
// ========================

export async function leaveTeam(teamId: string, driverProfileId: string): Promise<boolean> {
    // Get the membership
    const membership = await getActiveMembership(teamId, driverProfileId);
    if (!membership) return false;

    // Revoke access grant if exists
    if (membership.access_grant_id) {
        await revokeGrant(membership.access_grant_id);
    }

    // Update membership status
    const result = await pool.query(
        `UPDATE team_memberships 
     SET status = 'left', left_at = NOW(), access_grant_id = NULL
     WHERE id = $1`,
        [membership.id]
    );

    return (result.rowCount ?? 0) > 0;
}

export async function removeDriver(teamId: string, driverProfileId: string): Promise<boolean> {
    // Get the membership
    const membership = await getActiveMembership(teamId, driverProfileId);
    if (!membership) return false;

    // Revoke access grant if exists
    if (membership.access_grant_id) {
        await revokeGrant(membership.access_grant_id);
    }

    // Update membership status
    const result = await pool.query(
        `UPDATE team_memberships 
     SET status = 'removed', left_at = NOW(), access_grant_id = NULL
     WHERE id = $1`,
        [membership.id]
    );

    return (result.rowCount ?? 0) > 0;
}

// ========================
// Read
// ========================

export async function getMembershipById(membershipId: string): Promise<TeamMembership | null> {
    const result = await pool.query<TeamMembership>(
        'SELECT * FROM team_memberships WHERE id = $1',
        [membershipId]
    );
    return result.rows[0] || null;
}

export async function getActiveMembership(
    teamId: string,
    driverProfileId: string
): Promise<TeamMembership | null> {
    const result = await pool.query<TeamMembership>(
        `SELECT * FROM team_memberships 
     WHERE team_id = $1 AND driver_profile_id = $2 AND status = 'active'`,
        [teamId, driverProfileId]
    );
    return result.rows[0] || null;
}

export async function getPendingInvitation(
    teamId: string,
    driverProfileId: string
): Promise<TeamMembership | null> {
    const result = await pool.query<TeamMembership>(
        `SELECT * FROM team_memberships 
     WHERE team_id = $1 AND driver_profile_id = $2 AND status = 'invited'`,
        [teamId, driverProfileId]
    );
    return result.rows[0] || null;
}

export async function getActiveMembers(teamId: string): Promise<TeamMembership[]> {
    const result = await pool.query<TeamMembership>(
        `SELECT * FROM team_memberships 
     WHERE team_id = $1 AND status = 'active'
     ORDER BY joined_at`,
        [teamId]
    );
    return result.rows;
}

export async function getMembershipsForDriver(driverProfileId: string): Promise<TeamMembership[]> {
    const result = await pool.query<TeamMembership>(
        `SELECT * FROM team_memberships 
     WHERE driver_profile_id = $1 AND status IN ('invited', 'active')
     ORDER BY invited_at DESC`,
        [driverProfileId]
    );
    return result.rows;
}

export async function getPendingInvitations(driverProfileId: string): Promise<TeamMembership[]> {
    const result = await pool.query<TeamMembership>(
        `SELECT * FROM team_memberships 
     WHERE driver_profile_id = $1 AND status = 'invited'
     ORDER BY invited_at DESC`,
        [driverProfileId]
    );
    return result.rows;
}

// ========================
// Role Management
// ========================

export async function updateMemberRole(
    membershipId: string,
    newRole: TeamRole
): Promise<TeamMembership | null> {
    const result = await pool.query<TeamMembership>(
        `UPDATE team_memberships SET role = $1 WHERE id = $2 RETURNING *`,
        [newRole, membershipId]
    );
    return result.rows[0] || null;
}

// ========================
// Helpers
// ========================

export async function isTeamMember(teamId: string, driverProfileId: string): Promise<boolean> {
    const membership = await getActiveMembership(teamId, driverProfileId);
    return membership !== null;
}

export async function getMemberRole(teamId: string, driverProfileId: string): Promise<TeamRole | null> {
    const membership = await getActiveMembership(teamId, driverProfileId);
    return membership?.role || null;
}

export async function hasTeamPermission(
    teamId: string,
    driverProfileId: string,
    requiredRole: TeamRole
): Promise<boolean> {
    const role = await getMemberRole(teamId, driverProfileId);
    if (!role) return false;

    const roleHierarchy: Record<TeamRole, number> = {
        driver: 1,
        engineer: 2,
        manager: 3,
        owner: 4,
    };

    return roleHierarchy[role] >= roleHierarchy[requiredRole];
}
