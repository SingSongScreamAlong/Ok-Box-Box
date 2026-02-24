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
    }> | Record<string, {
        category: string;
        category_id: number;
        license_level: number;
        safety_rating: number;
        irating: number;
        group_name: string;
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

            // Also sync race results (non-blocking - don't fail profile sync if this fails)
            // Pass member_since for intelligent date range
            this.syncRaceResults(userId, accessToken, profile.iracingCustomerId, profile.memberSince).catch(err => {
                console.error(`[iRacing Sync] Race results sync failed for user ${userId}:`, err);
            });

            // Also sync career stats (non-blocking)
            this.syncCareerStats(userId, accessToken, profile.iracingCustomerId).catch(err => {
                console.error(`[iRacing Sync] Career stats sync failed for user ${userId}:`, err);
            });

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

    // -----------------------------------------------------------------
    // iRacing Data API helper
    // -----------------------------------------------------------------

    /**
     * Generic iRacing Data API fetch (handles two-step link pattern)
     */
    private async iracingApiFetch<T>(accessToken: string, endpoint: string): Promise<T> {
        const response = await fetch(`https://members-ng.iracing.com${endpoint}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            throw new Error(`iRacing API error ${endpoint}: ${response.status}`);
        }

        const linkOrData = await response.json() as any;

        // iRacing returns { link: '...' } that points to actual data
        if (linkOrData.link) {
            const dataResponse = await fetch(linkOrData.link);
            if (!dataResponse.ok) {
                throw new Error(`iRacing data fetch error: ${dataResponse.status}`);
            }
            return dataResponse.json() as Promise<T>;
        }

        return linkOrData as T;
    }

    // -----------------------------------------------------------------
    // Race Results Sync
    // -----------------------------------------------------------------

    /**
     * Fetch and store race results from iRacing
     * Uses incremental sync - only fetches races newer than the most recent stored race
     * Falls back to member_since date for first sync
     * Set forceFullSync=true to re-fetch all races from member_since
     */
    async syncRaceResults(userId: string, accessToken: string, custId: string, memberSince?: string | null, forceFullSync: boolean = false): Promise<number> {
        console.log(`[iRacing Sync] Fetching race results for user ${userId} (cust_id ${custId}) forceFullSync=${forceFullSync}`);

        try {
            const now = new Date();
            let startDate: Date;
            
            // Check for most recent stored race (incremental sync) - skip if forcing full sync
            const lastRaceResult = await pool.query(
                `SELECT MAX(session_start_time) as last_race FROM iracing_race_results WHERE admin_user_id = $1`,
                [userId]
            );
            const lastRaceTime = lastRaceResult.rows[0]?.last_race;
            
            if (lastRaceTime && !forceFullSync) {
                // Incremental sync: start from last race + 1 second
                startDate = new Date(new Date(lastRaceTime).getTime() + 1000);
                console.log(`[iRacing Sync] Incremental sync from ${startDate.toISOString()}`);
            } else if (memberSince) {
                // First sync or forced full sync: use member_since date
                startDate = new Date(memberSince);
                console.log(`[iRacing Sync] Full sync from member_since: ${startDate.toISOString()}`);
            } else {
                // Fallback: 2 years back
                startDate = new Date(now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000);
                console.log(`[iRacing Sync] Fallback sync from 2 years ago`);
            }
            
            // iRacing API expects RFC3339 format without milliseconds
            // Format: YYYY-MM-DDTHH:MM:SSZ (no .000Z)
            const formatForIRacing = (date: Date): string => {
                return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
            };
            const finishStart = formatForIRacing(startDate);
            const finishEnd = formatForIRacing(now);
            console.log(`[iRacing Sync] Date range: ${finishStart} to ${finishEnd}`);

            // Helper to extract results from iRacing API response (handles chunked responses)
            const extractResults = async (response: any): Promise<any[]> => {
                let results: any[] = [];
                
                // Check for chunk_info at multiple levels (iRacing API is inconsistent)
                const chunkInfo = response?.data?.chunk_info || response?.chunk_info;
                
                if (chunkInfo) {
                    // Chunked response - download each chunk
                    console.log(`[iRacing Sync] chunk_info contents:`, JSON.stringify(chunkInfo, null, 2));
                    const baseUrl = chunkInfo.base_download_url;
                    const chunkNames = chunkInfo.chunk_file_names || [];
                    
                    console.log(`[iRacing Sync] Processing ${chunkNames.length} chunks from ${baseUrl}`);

                    for (const chunkName of chunkNames) {
                        try {
                            const chunkUrl = `${baseUrl}${chunkName}`;
                            console.log(`[iRacing Sync] Fetching chunk: ${chunkName}`);
                            const chunkResponse = await fetch(chunkUrl);
                            if (chunkResponse.ok) {
                                const chunkData = await chunkResponse.json();
                                if (Array.isArray(chunkData)) {
                                    console.log(`[iRacing Sync] Chunk ${chunkName} returned ${chunkData.length} results`);
                                    results.push(...chunkData);
                                } else {
                                    console.log(`[iRacing Sync] Chunk ${chunkName} not an array:`, typeof chunkData);
                                }
                            } else {
                                console.warn(`[iRacing Sync] Chunk fetch failed: ${chunkResponse.status}`);
                            }
                        } catch (err) {
                            console.warn(`[iRacing Sync] Failed to fetch chunk ${chunkName}:`, err);
                        }
                    }
                } else if (Array.isArray(response)) {
                    results = response;
                } else if (response?.results) {
                    results = response.results;
                } else if (response?.data?.results) {
                    results = response.data.results;
                } else {
                    console.log(`[iRacing Sync] No results found in response structure`);
                }
                
                return results;
            };

            let raceResults: any[] = [];

            // 1. Fetch OFFICIAL series races for ALL categories (1=oval, 2=road, 3=dirt_oval, 4=dirt_road)
            // The API may limit results per category, so we fetch each separately
            const categories = [1, 2, 3, 4]; // oval, road, dirt_oval, dirt_road
            
            for (const categoryId of categories) {
                try {
                    console.log(`[iRacing Sync] Fetching official races category ${categoryId} from ${finishStart} to ${finishEnd}`);
                    const searchResults = await this.iracingApiFetch<any>(accessToken,
                        `/data/results/search_series?cust_id=${custId}&finish_range_begin=${finishStart}&finish_range_end=${finishEnd}&category_ids=${categoryId}`
                    );
                    
                    // Debug: Log the raw response structure
                    console.log(`[iRacing Sync] Category ${categoryId} API response:`, {
                        type: typeof searchResults,
                        isArray: Array.isArray(searchResults),
                        keys: searchResults ? Object.keys(searchResults).slice(0, 10) : 'null',
                        hasData: !!searchResults?.data,
                        hasChunkInfo: !!searchResults?.data?.chunk_info || !!searchResults?.chunk_info,
                        resultCount: searchResults?.data?.result_count || searchResults?.result_count,
                    });
                    
                    const categoryRaces = await extractResults(searchResults);
                    console.log(`[iRacing Sync] Found ${categoryRaces.length} official races in category ${categoryId}`);
                    raceResults.push(...categoryRaces);
                } catch (err) {
                    console.warn(`[iRacing Sync] Failed to fetch official races category ${categoryId}:`, err);
                }
            }
            
            // Also try without category filter as fallback
            try {
                console.log(`[iRacing Sync] Fetching official races (all categories) from ${finishStart} to ${finishEnd}`);
                const searchResults = await this.iracingApiFetch<any>(accessToken,
                    `/data/results/search_series?cust_id=${custId}&finish_range_begin=${finishStart}&finish_range_end=${finishEnd}`
                );
                
                // Debug: Log the raw response structure
                console.log(`[iRacing Sync] Official races API response:`, {
                    type: typeof searchResults,
                    isArray: Array.isArray(searchResults),
                    keys: searchResults ? Object.keys(searchResults).slice(0, 10) : 'null',
                    hasData: !!searchResults?.data,
                    hasChunkInfo: !!searchResults?.data?.chunk_info,
                    hasResults: !!searchResults?.results,
                    dataKeys: searchResults?.data ? Object.keys(searchResults.data).slice(0, 10) : 'no data',
                    resultCount: searchResults?.data?.result_count,
                    chunkFileCount: searchResults?.data?.chunk_info?.chunk_file_names?.length,
                });
                
                const officialRaces = await extractResults(searchResults);
                console.log(`[iRacing Sync] Found ${officialRaces.length} official series races`);
                raceResults.push(...officialRaces);
            } catch (err) {
                console.warn(`[iRacing Sync] Failed to fetch official races:`, err);
            }

            // 2. Fetch HOSTED races (leagues, private sessions, etc.)
            // Note: search_hosted uses participant_custid, not cust_id
            try {
                console.log(`[iRacing Sync] Fetching hosted races from ${finishStart} to ${finishEnd}`);
                const hostedResults = await this.iracingApiFetch<any>(accessToken,
                    `/data/results/search_hosted?participant_custid=${custId}&finish_range_begin=${finishStart}&finish_range_end=${finishEnd}`
                );
                
                // Debug: Log the raw response structure
                console.log(`[iRacing Sync] Hosted races API response:`, {
                    type: typeof hostedResults,
                    isArray: Array.isArray(hostedResults),
                    keys: hostedResults ? Object.keys(hostedResults).slice(0, 10) : 'null',
                    hasData: !!hostedResults?.data,
                    hasChunkInfo: !!hostedResults?.data?.chunk_info || !!hostedResults?.chunk_info,
                    hasResults: !!hostedResults?.results,
                    dataKeys: hostedResults?.data ? Object.keys(hostedResults.data).slice(0, 10) : 'no data',
                    resultCount: hostedResults?.data?.result_count || hostedResults?.result_count,
                    chunkFileCount: hostedResults?.data?.chunk_info?.chunk_file_names?.length || hostedResults?.chunk_info?.chunk_file_names?.length,
                });
                
                const hostedRaces = await extractResults(hostedResults);
                console.log(`[iRacing Sync] Found ${hostedRaces.length} hosted/league races`);
                raceResults.push(...hostedRaces);
            } catch (err) {
                console.warn(`[iRacing Sync] Failed to fetch hosted races:`, err instanceof Error ? err.message : err);
            }

            // Deduplicate by subsession_id (we may have fetched same race from multiple category queries)
            const seenSubsessions = new Set<string>();
            const uniqueResults: any[] = [];
            for (const result of raceResults) {
                const subsessionId = String(result.subsession_id ?? result.subsessionid ?? '');
                if (subsessionId && !seenSubsessions.has(subsessionId)) {
                    seenSubsessions.add(subsessionId);
                    uniqueResults.push(result);
                }
            }
            console.log(`[iRacing Sync] Found ${raceResults.length} total results, ${uniqueResults.length} unique by subsession_id`);
            raceResults = uniqueResults;

            if (raceResults.length === 0) {
                // Try the member_recent_races endpoint as fallback
                try {
                    const recentRaces = await this.iracingApiFetch<any>(accessToken,
                        `/data/stats/member_recent_races?cust_id=${custId}`
                    );
                    const races = recentRaces?.races || recentRaces || [];
                    if (Array.isArray(races) && races.length > 0) {
                        raceResults = races;
                        console.log(`[iRacing Sync] Fallback: found ${raceResults.length} recent races`);
                    }
                } catch (err) {
                    console.warn(`[iRacing Sync] Fallback member_recent_races also failed:`, err);
                }
            }

            // Also try member_summary for aggregate stats
            try {
                const summary = await this.iracingApiFetch<any>(accessToken,
                    `/data/stats/member_summary?cust_id=${custId}`
                );
                if (summary) {
                    console.log(`[iRacing Sync] Member summary keys:`, Object.keys(summary));
                    // Store summary as metadata on the profile
                    await pool.query(
                        `UPDATE iracing_profiles SET raw_stats_summary = $1, updated_at = NOW() WHERE admin_user_id = $2`,
                        [JSON.stringify(summary), userId]
                    ).catch(() => {
                        // Column may not exist yet, that's ok
                    });
                }
            } catch (err) {
                console.warn(`[iRacing Sync] member_summary fetch failed (non-critical):`, err);
            }

            // Store race results
            let stored = 0;
            for (const result of raceResults) {
                try {
                    await this.storeRaceResult(userId, custId, result);
                    stored++;
                } catch (err) {
                    // Duplicate or error - skip
                    if (!(err instanceof Error && err.message.includes('duplicate'))) {
                        console.warn(`[iRacing Sync] Failed to store result:`, err);
                    }
                }
            }

            console.log(`[iRacing Sync] Stored ${stored}/${raceResults.length} race results for user ${userId}`);
            return stored;

        } catch (error) {
            console.error(`[iRacing Sync] Race results sync error for user ${userId}:`, error);
            return 0;
        }
    }

    /**
     * Store a single race result (upsert)
     */
    private async storeRaceResult(userId: string, custId: string, result: any): Promise<void> {
        // Normalize field names - iRacing API uses different names in different endpoints
        const subsessionId = result.subsession_id ?? result.subsessionid;
        if (!subsessionId) {
            console.warn(`[iRacing Sync] Race result missing subsession_id, skipping`);
            return;
        }

        const trackName = result.track?.track_name || result.track_name || result.track || '';
        const trackConfig = result.track?.config_name || result.track_config || '';
        const trackId = result.track?.track_id || result.track_id || null;
        const carName = result.car?.car_name || result.car_name || '';
        const carId = result.car?.car_id || result.car_id || null;
        const seriesName = result.series_name || result.series_short_name || '';
        const seriesId = result.series_id || null;
        const seasonId = result.season_id || null;

        // Map license category
        const categoryId = result.license_category_id || result.category_id || null;
        let licenseCategory = result.license_category || null;
        if (!licenseCategory && categoryId) {
            const catMap: Record<number, string> = { 1: 'oval', 2: 'road', 3: 'dirt_oval', 4: 'dirt_road' };
            licenseCategory = catMap[categoryId] || null;
        }

        const startPos = result.start_position ?? result.starting_position ?? result.newi_rating != null ? result.start_position : null;
        const finishPos = result.finish_position ?? result.finishing_position ?? null;
        const finishPosClass = result.finish_position_in_class ?? null;
        const lapsComplete = result.laps_complete ?? result.laps_comp ?? null;
        const lapsLead = result.laps_lead ?? result.laps_led ?? null;
        const incidents = result.incidents ?? result.incident_count ?? null;
        const oldiRating = result.oldi_rating ?? result.old_irating ?? null;
        const newiRating = result.newi_rating ?? result.new_irating ?? null;
        const iRatingChange = newiRating && oldiRating ? newiRating - oldiRating : (result.irating_change ?? null);
        const oldSubLevel = result.old_sub_level ?? null;
        const newSubLevel = result.new_sub_level ?? null;
        const sof = result.strength_of_field ?? result.sof ?? null;
        const fieldSize = result.field_size ?? result.size ?? null;
        const sessionStartTime = result.session_start_time ?? result.start_time ?? result.race_week_start_time ?? null;
        const eventType = result.event_type_name?.toLowerCase() || result.event_type || 'race';

        await pool.query(
            `INSERT INTO iracing_race_results (
                admin_user_id, iracing_customer_id, subsession_id,
                series_id, series_name, season_id,
                track_id, track_name, track_config,
                car_id, car_name,
                session_start_time, event_type, license_category, license_category_id,
                start_position, finish_position, finish_position_in_class,
                laps_complete, laps_lead, incidents,
                oldi_rating, newi_rating, irating_change,
                old_sub_level, new_sub_level,
                strength_of_field, field_size,
                raw_result
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
            )
            ON CONFLICT (admin_user_id, subsession_id) DO UPDATE SET
                finish_position = EXCLUDED.finish_position,
                incidents = EXCLUDED.incidents,
                newi_rating = EXCLUDED.newi_rating,
                irating_change = EXCLUDED.irating_change,
                new_sub_level = EXCLUDED.new_sub_level,
                raw_result = EXCLUDED.raw_result,
                updated_at = NOW()`,
            [
                userId, custId, subsessionId,
                seriesId, seriesName, seasonId,
                trackId, trackName, trackConfig,
                carId, carName,
                sessionStartTime, eventType, licenseCategory, categoryId,
                startPos, finishPos, finishPosClass,
                lapsComplete, lapsLead, incidents,
                oldiRating, newiRating, iRatingChange,
                oldSubLevel, newSubLevel,
                sof, fieldSize,
                JSON.stringify(result)
            ]
        );
    }

    /**
     * Get stored race results for a user
     */
    async getRaceResults(userId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
        const result = await pool.query(
            `SELECT * FROM iracing_race_results 
             WHERE admin_user_id = $1 
             ORDER BY session_start_time DESC NULLS LAST
             LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );
        return result.rows;
    }

    /**
     * Get race results count for a user
     */
    async getRaceResultsCount(userId: string): Promise<number> {
        const result = await pool.query(
            `SELECT COUNT(*) as count FROM iracing_race_results WHERE admin_user_id = $1`,
            [userId]
        );
        return parseInt(result.rows[0]?.count || '0', 10);
    }

    /**
     * Get stored iRacing profile for a user
     */
    async getStoredProfile(userId: string): Promise<IRacingProfile | null> {
        const result = await pool.query(
            `SELECT * FROM iracing_profiles WHERE admin_user_id = $1`,
            [userId]
        );
        if (result.rows.length === 0) return null;
        
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
            lastSyncedAt: row.last_synced_at,
        };
    }

    // -----------------------------------------------------------------
    // Career Stats (lifetime from iRacing API)
    // -----------------------------------------------------------------

    /**
     * Fetch and store lifetime career stats from iRacing /data/stats/member_career
     * Returns accurate lifetime wins/starts/top5s/poles per category
     */
    async syncCareerStats(userId: string, accessToken: string, custId: string): Promise<any[]> {
        console.log(`[iRacing Sync] Fetching career stats for user ${userId} (cust_id ${custId})`);

        try {
            const careerData = await this.iracingApiFetch<any>(accessToken,
                `/data/stats/member_career?cust_id=${custId}`
            );

            // Response is { stats: [...] } or directly an array
            let stats: any[] = [];
            if (Array.isArray(careerData)) {
                stats = careerData;
            } else if (careerData?.stats) {
                stats = careerData.stats;
            } else if (careerData?.data) {
                stats = Array.isArray(careerData.data) ? careerData.data : [];
            }

            if (stats.length > 0) {
                await pool.query(
                    `UPDATE iracing_profiles 
                     SET career_stats_json = $1, career_stats_synced_at = NOW(), updated_at = NOW() 
                     WHERE admin_user_id = $2`,
                    [JSON.stringify(stats), userId]
                );
                console.log(`[iRacing Sync] Stored career stats for user ${userId}: ${stats.length} categories`);
            } else {
                console.log(`[iRacing Sync] No career stats returned for user ${userId}`);
            }

            return stats;
        } catch (error) {
            console.error(`[iRacing Sync] Career stats sync error for user ${userId}:`, error);
            return [];
        }
    }

    /**
     * Get stored career stats for a user
     */
    async getCareerStats(userId: string): Promise<any[] | null> {
        const result = await pool.query(
            `SELECT career_stats_json FROM iracing_profiles WHERE admin_user_id = $1`,
            [userId]
        );
        const row = result.rows[0];
        if (!row || !row.career_stats_json) return null;
        return row.career_stats_json;
    }

    /**
     * Get aggregate stats from stored race results (fallback when career stats not available)
     */
    async getAggregateStats(userId: string): Promise<any> {
        const result = await pool.query(
            `SELECT 
                COUNT(*) as total_races,
                COUNT(*) FILTER (WHERE finish_position = 1) as wins,
                COUNT(*) FILTER (WHERE finish_position <= 3) as podiums,
                COUNT(*) FILTER (WHERE finish_position <= 5) as top5s,
                COUNT(*) FILTER (WHERE start_position = 1) as poles,
                ROUND(AVG(start_position), 1) as avg_start,
                ROUND(AVG(finish_position), 1) as avg_finish,
                ROUND(AVG(incidents), 1) as avg_incidents,
                SUM(laps_complete) as total_laps,
                SUM(laps_lead) as total_laps_led,
                ROUND(AVG(strength_of_field), 0) as avg_sof,
                MAX(newi_rating) as peak_irating,
                license_category
             FROM iracing_race_results 
             WHERE admin_user_id = $1 AND finish_position IS NOT NULL
             GROUP BY license_category
             ORDER BY COUNT(*) DESC`,
            [userId]
        );
        return result.rows;
    }

    /**
     * Fetch member info from iRacing Data API
     */
    private async fetchMemberInfo(accessToken: string): Promise<IRacingMemberInfoResponse> {
        return this.iracingApiFetch<IRacingMemberInfoResponse>(accessToken, '/data/member/info');
    }

    /**
     * Parse iRacing API response into our profile format
     */
    private parseMemberInfo(info: IRacingMemberInfoResponse): IRacingProfile {
        // iRacing returns licenses as an object keyed by category name (e.g. {oval: {...}, road: {...}})
        // or potentially as an array. Normalize to array either way.
        let licensesArray: any[];
        if (Array.isArray(info.licenses)) {
            licensesArray = info.licenses;
        } else if (info.licenses && typeof info.licenses === 'object') {
            licensesArray = Object.values(info.licenses) as any[];
        } else {
            licensesArray = [];
        }
        console.log(`[iRacing Sync] licensesArray length: ${licensesArray.length}, first item keys:`, licensesArray.length > 0 ? Object.keys(licensesArray[0]) : 'empty');
        if (licensesArray.length > 0) {
            console.log(`[iRacing Sync] First license sample:`, JSON.stringify(licensesArray[0]).substring(0, 300));
        }

        const getLicense = (categoryId: number) =>
            licensesArray.find(l => l.category_id === categoryId);

        const ovalLicense = getLicense(LICENSE_CATEGORIES.OVAL);
        const roadLicense = getLicense(LICENSE_CATEGORIES.ROAD);
        const dirtOvalLicense = getLicense(LICENSE_CATEGORIES.DIRT_OVAL);
        const dirtRoadLicense = getLicense(LICENSE_CATEGORIES.DIRT_ROAD);

        console.log(`[iRacing Sync] Parsed licenses - oval: ${ovalLicense?.irating ?? 'null'}, road: ${roadLicense?.irating ?? 'null'}, dirtOval: ${dirtOvalLicense?.irating ?? 'null'}, dirtRoad: ${dirtRoadLicense?.irating ?? 'null'}`);

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
