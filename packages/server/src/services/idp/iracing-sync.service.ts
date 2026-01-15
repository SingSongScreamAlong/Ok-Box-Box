/**
 * iRacing Data API Sync Service
 * 
 * Fetches historical race data from iRacing Data API for backfilling IDP metrics.
 * 
 * PREREQUISITES:
 * 1. Contact iRacing Member Services (support@iracing.com) to obtain:
 *    - Client ID
 *    - Client Secret
 * 2. Add credentials to environment:
 *    - IRACING_CLIENT_ID
 *    - IRACING_CLIENT_SECRET
 * 
 * API Documentation: https://members-ng.iracing.com/data/doc
 */

import { pool } from '../../db/client.js';
import { computeSessionMetrics, ComputeMetricsInput } from './session-metrics.service.js';

// ========================
// Types
// ========================

interface IRacingCredentials {
    clientId: string;
    clientSecret: string;
}

interface IRacingAuthToken {
    access_token: string;
    token_type: string;
    expires_in: number;
    obtained_at: number;
}

interface IRacingMemberProfile {
    cust_id: number;
    display_name: string;
    irating: number;
    license_class: string;
    license_level: number;
    portrait: string;
}

interface IRacingRaceResult {
    subsession_id: number;
    series_id: number;
    session_id: number;
    start_position: number;
    finish_position: number;
    incidents: number;
    laps_complete: number;
    laps_lead: number;
    irating_change: number;
    newi_rating: number;
    strength_of_field: number;
    session_start_time: string;
    track: { track_id: number; track_name: string };
    car: { car_id: number; car_name: string };
}

interface IRacingLapData {
    lap_number: number;
    lap_time: number; // centiseconds
    lap_flags: number;
    incident: boolean;
    session_time: number;
}

// ========================
// Auth Service
// ========================

let cachedToken: IRacingAuthToken | null = null;

function getCredentials(): IRacingCredentials | null {
    const clientId = process.env.IRACING_CLIENT_ID;
    const clientSecret = process.env.IRACING_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.warn('[iRacing Sync] Missing IRACING_CLIENT_ID or IRACING_CLIENT_SECRET');
        return null;
    }

    return { clientId, clientSecret };
}

async function getAccessToken(): Promise<string | null> {
    const credentials = getCredentials();
    if (!credentials) return null;

    // Check if cached token is still valid (with 5 min buffer)
    if (cachedToken && (cachedToken.obtained_at + (cachedToken.expires_in - 300) * 1000) > Date.now()) {
        return cachedToken.access_token;
    }

    // Request new token using OAuth2 Password Limited Flow
    try {
        const response = await fetch('https://members-ng.iracing.com/auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64')}`,
            },
            body: 'grant_type=client_credentials',
        });

        if (!response.ok) {
            console.error('[iRacing Sync] Auth failed:', response.status, await response.text());
            return null;
        }

        const data = await response.json() as Omit<IRacingAuthToken, 'obtained_at'>;
        cachedToken = {
            ...data,
            obtained_at: Date.now(),
        };

        console.log('[iRacing Sync] Obtained new access token');
        return cachedToken.access_token;
    } catch (error) {
        console.error('[iRacing Sync] Auth error:', error);
        return null;
    }
}

// ========================
// API Calls
// ========================

async function iracingFetch<T>(endpoint: string): Promise<T | null> {
    const token = await getAccessToken();
    if (!token) {
        console.error('[iRacing Sync] No auth token available');
        return null;
    }

    try {
        const response = await fetch(`https://members-ng.iracing.com${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            console.error(`[iRacing Sync] API error: ${endpoint}`, response.status);
            return null;
        }

        // iRacing returns a link to the actual data
        const linkData = await response.json() as { link: string };

        // Fetch the actual data from the link
        const dataResponse = await fetch(linkData.link);
        if (!dataResponse.ok) {
            console.error(`[iRacing Sync] Data fetch error: ${linkData.link}`, dataResponse.status);
            return null;
        }

        return await dataResponse.json() as T;
    } catch (error) {
        console.error(`[iRacing Sync] Fetch error: ${endpoint}`, error);
        return null;
    }
}

// ========================
// Member Profile Sync
// ========================

export async function syncMemberProfile(iracingCustId: number): Promise<IRacingMemberProfile | null> {
    console.log(`[iRacing Sync] Fetching profile for cust_id ${iracingCustId}`);

    const profile = await iracingFetch<IRacingMemberProfile>(`/data/member/get?cust_ids=${iracingCustId}`);

    if (profile) {
        console.log(`[iRacing Sync] Found: ${profile.display_name} (iR: ${profile.irating})`);
    }

    return profile;
}

// ========================
// Race Results Sync
// ========================

export async function syncRecentRaces(
    iracingCustId: number,
    limit: number = 25
): Promise<IRacingRaceResult[]> {
    console.log(`[iRacing Sync] Fetching last ${limit} races for cust_id ${iracingCustId}`);

    const results = await iracingFetch<{ results: IRacingRaceResult[] }>(
        `/data/results/search_hosted?cust_id=${iracingCustId}&finish_range_begin=1&finish_range_end=100`
    );

    if (!results?.results) {
        return [];
    }

    console.log(`[iRacing Sync] Found ${results.results.length} race results`);
    return results.results.slice(0, limit);
}

// ========================
// Lap Data Sync
// ========================

export async function syncLapData(
    subsessionId: number,
    iracingCustId: number
): Promise<IRacingLapData[]> {
    console.log(`[iRacing Sync] Fetching lap data for subsession ${subsessionId}`);

    const data = await iracingFetch<{ lap_data: IRacingLapData[] }>(
        `/data/results/lap_data?subsession_id=${subsessionId}&cust_id=${iracingCustId}`
    );

    return data?.lap_data || [];
}

// ========================
// Backfill Orchestration
// ========================

export async function backfillDriverHistory(
    driverProfileId: string,
    iracingCustId: number,
    maxRaces: number = 50
): Promise<{ synced: number; errors: number }> {
    console.log(`[iRacing Sync] Starting backfill for driver ${driverProfileId} (iRacing: ${iracingCustId})`);

    const credentials = getCredentials();
    if (!credentials) {
        console.error('[iRacing Sync] Cannot backfill: iRacing credentials not configured');
        return { synced: 0, errors: 0 };
    }

    let synced = 0;
    let errors = 0;

    // Fetch recent race results
    const races = await syncRecentRaces(iracingCustId, maxRaces);

    for (const race of races) {
        try {
            // Check if we already have this session
            const existing = await pool.query<{ id: string }>(
                'SELECT id FROM sessions WHERE iracing_subsession_id = $1',
                [race.subsession_id]
            );

            if (existing.rows[0]) {
                console.log(`[iRacing Sync] Session ${race.subsession_id} already exists, skipping`);
                continue;
            }

            // Fetch lap data
            const laps = await syncLapData(race.subsession_id, iracingCustId);

            // Create session record (simplified - would need full session metadata)
            const sessionResult = await pool.query<{ id: string }>(
                `INSERT INTO sessions (
          track_name, session_type, source, iracing_subsession_id, iracing_series_id, 
          official_result, started_at
        ) VALUES ($1, $2, 'iracing_official', $3, $4, $5, $6)
        RETURNING id`,
                [
                    race.track.track_name,
                    'race',
                    race.subsession_id,
                    race.series_id,
                    JSON.stringify({
                        finish_position: race.finish_position,
                        start_position: race.start_position,
                        incidents: race.incidents,
                        irating_change: race.irating_change,
                        sof: race.strength_of_field,
                    }),
                    race.session_start_time,
                ]
            );

            const sessionId = sessionResult.rows[0].id;

            // Compute metrics from lap data
            const metricsInput: ComputeMetricsInput = {
                session_id: sessionId,
                driver_id: String(iracingCustId),
                laps: laps.map(l => ({
                    lap_number: l.lap_number,
                    lap_time_ms: l.lap_time * 10, // centiseconds to ms
                    is_valid: (l.lap_flags & 0x01) === 0, // Bit 0 = invalid
                    incident_count: l.incident ? 1 : 0,
                })),
                result: {
                    finish_position: race.finish_position,
                    start_position: race.start_position,
                    sof: race.strength_of_field,
                    irating_change: race.irating_change,
                },
            };

            await computeSessionMetrics(metricsInput);
            synced++;

            console.log(`[iRacing Sync] Synced: ${race.track.track_name} (P${race.finish_position})`);

        } catch (error) {
            console.error(`[iRacing Sync] Error syncing race ${race.subsession_id}:`, error);
            errors++;
        }

        // Rate limiting - be nice to iRacing API
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`[iRacing Sync] Backfill complete: ${synced} synced, ${errors} errors`);
    return { synced, errors };
}

// ========================
// Status Check
// ========================

export function isSyncAvailable(): boolean {
    return getCredentials() !== null;
}

export async function testConnection(): Promise<boolean> {
    const token = await getAccessToken();
    return token !== null;
}
