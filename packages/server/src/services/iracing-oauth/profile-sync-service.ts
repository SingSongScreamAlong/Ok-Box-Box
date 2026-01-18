// =====================================================================
// iRacing Profile Sync Service
// Fetches and stores profile data from iRacing Data API
// =====================================================================

import { pool } from '../../db/client.js';
import { getIRacingOAuthService } from './iracing-oauth-service.js';

// =====================================================================
// Types
// =====================================================================

export interface IRacingProfile {
    iracingCustomerId: string;
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;

    // iRating (stored as integers * 100)
    iratingOval: number | null;
    iratingRoad: number | null;
    iratingDirtOval: number | null;
    iratingDirtRoad: number | null;

    // Safety Rating (stored as integers * 100)
    srOval: number | null;
    srRoad: number | null;
    srDirtOval: number | null;
    srDirtRoad: number | null;

    // License
    licenseOval: string | null;
    licenseRoad: string | null;
    licenseDirtOval: string | null;
    licenseDirtRoad: string | null;

    // Account
    memberSince: string | null;
    clubId: number | null;
    clubName: string | null;

    // Helmet
    helmetPattern: number | null;
    helmetColor1: string | null;
    helmetColor2: string | null;
    helmetColor3: string | null;

    lastSyncedAt: Date;
}

interface IRacingMemberInfoResponse {
    cust_id: number;
    display_name: string;
    first_name?: string;
    last_name?: string;
    member_since?: string;
    club_id?: number;
    club_name?: string;
    licenses?: Array<{
        category: string;
        category_id: number;
        license_level: number;
        safety_rating: number;
        irating: number;
        group_name: string;  // "A", "B", "C", "D", "R"
    }>;
    helmet?: {
        pattern: number;
        color1: string;
        color2: string;
        color3: string;
    };
}

// License category IDs from iRacing
const LICENSE_CATEGORIES = {
    OVAL: 1,
    ROAD: 2,
    DIRT_OVAL: 3,
    DIRT_ROAD: 4
};

// =====================================================================
// Profile Sync Service
// =====================================================================

export class IRacingProfileSyncService {

    /**
     * Sync profile for a user
     * Fetches latest data from iRacing API and stores in database
     */
    async syncProfile(userId: string): Promise<IRacingProfile | null> {
        const oauthService = getIRacingOAuthService();

        // Get valid access token (will auto-refresh if needed)
        const accessToken = await oauthService.getValidAccessToken(userId);
        if (!accessToken) {
            console.log(`[iRacing Sync] No valid token for user ${userId}, skipping sync`);
            return null;
        }

        try {
            // Fetch member info from iRacing
            const memberInfo = await this.fetchMemberInfo(accessToken);

            // Parse and store profile
            const profile = this.parseMemberInfo(memberInfo);
            await this.storeProfile(userId, profile);

            console.log(`[iRacing Sync] Synced profile for user ${userId}, iRacing ${memberInfo.cust_id}`);
            return profile;

        } catch (error) {
            console.error(`[iRacing Sync] Failed to sync profile for user ${userId}:`, error);

            // Store sync error
            await pool.query(
                `UPDATE iracing_profiles SET sync_error = $1, updated_at = NOW() WHERE admin_user_id = $2`,
                [error instanceof Error ? error.message : 'Unknown error', userId]
            );

            return null;
        }
    }

    /**
     * Fetch member info from iRacing Data API
     */
    private async fetchMemberInfo(accessToken: string): Promise<IRacingMemberInfoResponse> {
        const response = await fetch('https://members-ng.iracing.com/data/member/info', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`iRacing API error: ${response.status}`);
        }

        // iRacing returns a link to the actual data
        const linkData = await response.json() as { link: string };

        const dataResponse = await fetch(linkData.link);
        if (!dataResponse.ok) {
            throw new Error(`iRacing data fetch error: ${dataResponse.status}`);
        }

        return dataResponse.json() as Promise<IRacingMemberInfoResponse>;
    }

    /**
     * Parse iRacing API response into our profile format
     */
    private parseMemberInfo(info: IRacingMemberInfoResponse): IRacingProfile {
        const getLicense = (categoryId: number) =>
            info.licenses?.find(l => l.category_id === categoryId);

        const ovalLicense = getLicense(LICENSE_CATEGORIES.OVAL);
        const roadLicense = getLicense(LICENSE_CATEGORIES.ROAD);
        const dirtOvalLicense = getLicense(LICENSE_CATEGORIES.DIRT_OVAL);
        const dirtRoadLicense = getLicense(LICENSE_CATEGORIES.DIRT_ROAD);

        return {
            iracingCustomerId: String(info.cust_id),
            displayName: info.display_name || null,
            firstName: info.first_name || null,
            lastName: info.last_name || null,

            iratingOval: ovalLicense?.irating ?? null,
            iratingRoad: roadLicense?.irating ?? null,
            iratingDirtOval: dirtOvalLicense?.irating ?? null,
            iratingDirtRoad: dirtRoadLicense?.irating ?? null,

            srOval: ovalLicense ? Math.round(ovalLicense.safety_rating * 100) : null,
            srRoad: roadLicense ? Math.round(roadLicense.safety_rating * 100) : null,
            srDirtOval: dirtOvalLicense ? Math.round(dirtOvalLicense.safety_rating * 100) : null,
            srDirtRoad: dirtRoadLicense ? Math.round(dirtRoadLicense.safety_rating * 100) : null,

            licenseOval: ovalLicense?.group_name ?? null,
            licenseRoad: roadLicense?.group_name ?? null,
            licenseDirtOval: dirtOvalLicense?.group_name ?? null,
            licenseDirtRoad: dirtRoadLicense?.group_name ?? null,

            memberSince: info.member_since || null,
            clubId: info.club_id ?? null,
            clubName: info.club_name || null,

            helmetPattern: info.helmet?.pattern ?? null,
            helmetColor1: info.helmet?.color1 ?? null,
            helmetColor2: info.helmet?.color2 ?? null,
            helmetColor3: info.helmet?.color3 ?? null,

            lastSyncedAt: new Date()
        };
    }

    /**
     * Store profile in database (upsert)
     */
    private async storeProfile(userId: string, profile: IRacingProfile): Promise<void> {
        await pool.query(
            `INSERT INTO iracing_profiles (
                admin_user_id, iracing_customer_id, display_name, first_name, last_name,
                irating_oval, irating_road, irating_dirt_oval, irating_dirt_road,
                sr_oval, sr_road, sr_dirt_oval, sr_dirt_road,
                license_oval, license_road, license_dirt_oval, license_dirt_road,
                member_since, club_id, club_name,
                helmet_pattern, helmet_color1, helmet_color2, helmet_color3,
                last_synced_at, sync_error
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, NOW(), NULL)
            ON CONFLICT (admin_user_id) DO UPDATE SET
                iracing_customer_id = EXCLUDED.iracing_customer_id,
                display_name = EXCLUDED.display_name,
                first_name = EXCLUDED.first_name,
                last_name = EXCLUDED.last_name,
                irating_oval = EXCLUDED.irating_oval,
                irating_road = EXCLUDED.irating_road,
                irating_dirt_oval = EXCLUDED.irating_dirt_oval,
                irating_dirt_road = EXCLUDED.irating_dirt_road,
                sr_oval = EXCLUDED.sr_oval,
                sr_road = EXCLUDED.sr_road,
                sr_dirt_oval = EXCLUDED.sr_dirt_oval,
                sr_dirt_road = EXCLUDED.sr_dirt_road,
                license_oval = EXCLUDED.license_oval,
                license_road = EXCLUDED.license_road,
                license_dirt_oval = EXCLUDED.license_dirt_oval,
                license_dirt_road = EXCLUDED.license_dirt_road,
                member_since = EXCLUDED.member_since,
                club_id = EXCLUDED.club_id,
                club_name = EXCLUDED.club_name,
                helmet_pattern = EXCLUDED.helmet_pattern,
                helmet_color1 = EXCLUDED.helmet_color1,
                helmet_color2 = EXCLUDED.helmet_color2,
                helmet_color3 = EXCLUDED.helmet_color3,
                last_synced_at = NOW(),
                sync_error = NULL,
                updated_at = NOW()`,
            [
                userId, profile.iracingCustomerId, profile.displayName, profile.firstName, profile.lastName,
                profile.iratingOval, profile.iratingRoad, profile.iratingDirtOval, profile.iratingDirtRoad,
                profile.srOval, profile.srRoad, profile.srDirtOval, profile.srDirtRoad,
                profile.licenseOval, profile.licenseRoad, profile.licenseDirtOval, profile.licenseDirtRoad,
                profile.memberSince, profile.clubId, profile.clubName,
                profile.helmetPattern, profile.helmetColor1, profile.helmetColor2, profile.helmetColor3
            ]
        );
    }

    /**
     * Get cached profile for a user
     */
    async getProfile(userId: string): Promise<IRacingProfile | null> {
        const result = await pool.query(
            `SELECT * FROM iracing_profiles WHERE admin_user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];
        return {
            iracingCustomerId: row.iracing_customer_id,
            displayName: row.display_name,
            firstName: row.first_name,
            lastName: row.last_name,
            iratingOval: row.irating_oval,
            iratingRoad: row.irating_road,
            iratingDirtOval: row.irating_dirt_oval,
            iratingDirtRoad: row.irating_dirt_road,
            srOval: row.sr_oval,
            srRoad: row.sr_road,
            srDirtOval: row.sr_dirt_oval,
            srDirtRoad: row.sr_dirt_road,
            licenseOval: row.license_oval,
            licenseRoad: row.license_road,
            licenseDirtOval: row.license_dirt_oval,
            licenseDirtRoad: row.license_dirt_road,
            memberSince: row.member_since,
            clubId: row.club_id,
            clubName: row.club_name,
            helmetPattern: row.helmet_pattern,
            helmetColor1: row.helmet_color1,
            helmetColor2: row.helmet_color2,
            helmetColor3: row.helmet_color3,
            lastSyncedAt: row.last_synced_at
        };
    }

    /**
     * Sync all linked users (for background job)
     */
    async syncAllUsers(): Promise<{ synced: number; failed: number }> {
        const result = await pool.query(
            `SELECT admin_user_id FROM iracing_oauth_tokens WHERE is_valid = true`
        );

        let synced = 0;
        let failed = 0;

        for (const row of result.rows) {
            const profile = await this.syncProfile(row.admin_user_id);
            if (profile) {
                synced++;
            } else {
                failed++;
            }

            // Rate limit: wait 1 second between syncs to avoid iRacing rate limits
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log(`[iRacing Sync] Batch sync complete: ${synced} synced, ${failed} failed`);
        return { synced, failed };
    }
}

// =====================================================================
// Singleton
// =====================================================================

let syncServiceInstance: IRacingProfileSyncService | null = null;

export function getIRacingProfileSyncService(): IRacingProfileSyncService {
    if (!syncServiceInstance) {
        syncServiceInstance = new IRacingProfileSyncService();
    }
    return syncServiceInstance;
}
