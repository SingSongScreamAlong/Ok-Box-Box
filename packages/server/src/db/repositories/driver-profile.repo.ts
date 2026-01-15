/**
 * Driver Profile Repository
 * CRUD operations for driver profiles and related entities
 */

import { pool } from '../client.js';
import {
    DriverProfile,
    LinkedRacingIdentity,
    DriverAccessGrant,
    CreateDriverProfileDTO,
    UpdateDriverProfileDTO,
    LinkIdentityDTO,
    CreateAccessGrantDTO,
    AccessScope,
    ResolvedScope,
} from '../../types/idp.types.js';

// ========================
// Driver Profile Operations
// ========================

export async function createDriverProfile(
    dto: CreateDriverProfileDTO,
    userAccountId?: string
): Promise<DriverProfile> {
    const result = await pool.query<DriverProfile>(
        `INSERT INTO driver_profiles (
      user_account_id,
      display_name,
      avatar_url,
      bio,
      primary_discipline,
      timezone,
      privacy_level
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
        [
            userAccountId || null,
            dto.display_name,
            dto.avatar_url || null,
            dto.bio || null,
            dto.primary_discipline || 'road',
            dto.timezone || 'UTC',
            dto.privacy_level || 'public',
        ]
    );
    return result.rows[0];
}

export async function getDriverProfileById(id: string): Promise<DriverProfile | null> {
    const result = await pool.query<DriverProfile>(
        'SELECT * FROM driver_profiles WHERE id = $1',
        [id]
    );
    return result.rows[0] || null;
}

export async function getDriverProfileByUserId(userId: string): Promise<DriverProfile | null> {
    const result = await pool.query<DriverProfile>(
        'SELECT * FROM driver_profiles WHERE user_account_id = $1',
        [userId]
    );
    return result.rows[0] || null;
}

export async function getDriverProfileByPlatformId(
    platform: string,
    platformUserId: string
): Promise<DriverProfile | null> {
    const result = await pool.query<DriverProfile>(
        `SELECT dp.* FROM driver_profiles dp
     JOIN linked_racing_identities lri ON lri.driver_profile_id = dp.id
     WHERE lri.platform = $1 AND lri.platform_user_id = $2`,
        [platform, platformUserId]
    );
    return result.rows[0] || null;
}

export async function updateDriverProfile(
    id: string,
    dto: UpdateDriverProfileDTO
): Promise<DriverProfile | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (dto.display_name !== undefined) {
        updates.push(`display_name = $${paramCount++}`);
        values.push(dto.display_name);
    }
    if (dto.avatar_url !== undefined) {
        updates.push(`avatar_url = $${paramCount++}`);
        values.push(dto.avatar_url);
    }
    if (dto.bio !== undefined) {
        updates.push(`bio = $${paramCount++}`);
        values.push(dto.bio);
    }
    if (dto.primary_discipline !== undefined) {
        updates.push(`primary_discipline = $${paramCount++}`);
        values.push(dto.primary_discipline);
    }
    if (dto.timezone !== undefined) {
        updates.push(`timezone = $${paramCount++}`);
        values.push(dto.timezone);
    }
    if (dto.privacy_level !== undefined) {
        updates.push(`privacy_level = $${paramCount++}`);
        values.push(dto.privacy_level);
    }

    if (updates.length === 0) {
        return getDriverProfileById(id);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query<DriverProfile>(
        `UPDATE driver_profiles SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
    );
    return result.rows[0] || null;
}

export async function incrementProfileStats(
    id: string,
    sessions: number = 0,
    laps: number = 0,
    incidents: number = 0
): Promise<void> {
    await pool.query(
        `UPDATE driver_profiles SET
      total_sessions = total_sessions + $2,
      total_laps = total_laps + $3,
      total_incidents = total_incidents + $4,
      updated_at = NOW()
     WHERE id = $1`,
        [id, sessions, laps, incidents]
    );
}

// ========================
// Linked Identity Operations
// ========================

export async function linkRacingIdentity(
    driverProfileId: string,
    dto: LinkIdentityDTO
): Promise<LinkedRacingIdentity> {
    const result = await pool.query<LinkedRacingIdentity>(
        `INSERT INTO linked_racing_identities (
      driver_profile_id,
      platform,
      platform_user_id,
      platform_display_name,
      verification_method,
      sync_status
    ) VALUES ($1, $2, $3, $4, $5, 'pending')
    ON CONFLICT (platform, platform_user_id) 
    DO UPDATE SET
      driver_profile_id = $1,
      platform_display_name = COALESCE($4, linked_racing_identities.platform_display_name),
      updated_at = NOW()
    RETURNING *`,
        [
            driverProfileId,
            dto.platform,
            dto.platform_user_id,
            dto.platform_display_name || null,
            dto.verification_method,
        ]
    );
    return result.rows[0];
}

export async function getLinkedIdentities(driverProfileId: string): Promise<LinkedRacingIdentity[]> {
    const result = await pool.query<LinkedRacingIdentity>(
        'SELECT * FROM linked_racing_identities WHERE driver_profile_id = $1 ORDER BY created_at',
        [driverProfileId]
    );
    return result.rows;
}

export async function verifyIdentity(identityId: string): Promise<LinkedRacingIdentity | null> {
    const result = await pool.query<LinkedRacingIdentity>(
        `UPDATE linked_racing_identities SET
      verified_at = NOW(),
      sync_status = 'active',
      updated_at = NOW()
     WHERE id = $1 RETURNING *`,
        [identityId]
    );
    return result.rows[0] || null;
}

export async function unlinkIdentity(identityId: string): Promise<boolean> {
    const result = await pool.query(
        'DELETE FROM linked_racing_identities WHERE id = $1',
        [identityId]
    );
    return (result.rowCount ?? 0) > 0;
}

// ========================
// Access Grant Operations
// ========================

export async function createAccessGrant(
    driverProfileId: string,
    dto: CreateAccessGrantDTO,
    grantedBy?: string
): Promise<DriverAccessGrant> {
    const result = await pool.query<DriverAccessGrant>(
        `INSERT INTO driver_access_grants (
      driver_profile_id,
      grantee_type,
      grantee_id,
      scope,
      granted_by,
      expires_at,
      notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
        [
            driverProfileId,
            dto.grantee_type,
            dto.grantee_id,
            dto.scope,
            grantedBy || null,
            dto.expires_at || null,
            dto.notes || null,
        ]
    );
    return result.rows[0];
}

export async function getActiveGrants(driverProfileId: string): Promise<DriverAccessGrant[]> {
    const result = await pool.query<DriverAccessGrant>(
        `SELECT * FROM driver_access_grants 
     WHERE driver_profile_id = $1 
       AND revoked_at IS NULL
       AND (expires_at IS NULL OR expires_at > NOW())
     ORDER BY granted_at DESC`,
        [driverProfileId]
    );
    return result.rows;
}

export async function getGrantsForGrantee(
    granteeType: string,
    granteeId: string
): Promise<DriverAccessGrant[]> {
    const result = await pool.query<DriverAccessGrant>(
        `SELECT * FROM driver_access_grants 
     WHERE grantee_type = $1 
       AND grantee_id = $2
       AND revoked_at IS NULL
       AND (expires_at IS NULL OR expires_at > NOW())
     ORDER BY granted_at DESC`,
        [granteeType, granteeId]
    );
    return result.rows;
}

export async function revokeGrant(grantId: string): Promise<boolean> {
    const result = await pool.query(
        `UPDATE driver_access_grants SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL`,
        [grantId]
    );
    return (result.rowCount ?? 0) > 0;
}

// ========================
// Access Resolution
// ========================

export async function resolveAccessScope(
    driverProfileId: string,
    requesterId: string | null,
    requesterLeagues: string[] = []
): Promise<ResolvedScope> {
    const profile = await getDriverProfileById(driverProfileId);
    if (!profile) return null;

    // Owner check
    if (requesterId && profile.user_account_id === requesterId) {
        return 'owner';
    }

    // Check grants
    const grantResult = await pool.query<{ scope: AccessScope }>(
        `SELECT scope FROM driver_access_grants
     WHERE driver_profile_id = $1
       AND revoked_at IS NULL
       AND (expires_at IS NULL OR expires_at > NOW())
       AND (
         (grantee_type = 'user' AND grantee_id = $2)
         OR (grantee_type = 'league' AND grantee_id = ANY($3))
       )
     ORDER BY 
       CASE scope
         WHEN 'team_deep' THEN 1
         WHEN 'team_standard' THEN 2
         WHEN 'public' THEN 3
       END
     LIMIT 1`,
        [driverProfileId, requesterId || '', requesterLeagues]
    );

    if (grantResult.rows[0]) {
        return grantResult.rows[0].scope;
    }

    // Default based on privacy
    if (profile.privacy_level === 'private') {
        return null;
    }
    if (profile.privacy_level === 'team_only') {
        return null; // Would need an active grant
    }

    return 'public';
}
