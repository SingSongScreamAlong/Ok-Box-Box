/**
 * IDP Read Contract Layer
 * 
 * CRITICAL: All team reads of IDP data MUST go through this contract.
 * This layer enforces access scope validation before returning data.
 * 
 * Teams NEVER modify IDP data. This is read-only.
 */

import { pool } from '../db/client.js';

// ========================
// Types
// ========================

export type AccessScope = 'team_standard' | 'team_deep' | 'self' | 'public';

export interface DriverSummary {
    driver_profile_id: string;
    display_name: string;
    total_sessions: number;
    total_laps: number;
    avg_pace_percentile: number | null;
    consistency_index: number | null;
    incidents_per_100: number | null;
    last_session_at: string | null;
}

export interface DriverTrait {
    trait_label: string;
    category: string;
    confidence: number;
    evidence_summary: string;
    derived_at: string;
}

export interface SessionSummary {
    session_id: string;
    session_type: string;
    track: string;
    car: string;
    best_lap_ms: number | null;
    median_lap_ms: number | null;
    lap_count: number;
    incidents: number;
    finished_at: string;
}

export interface ReportIndex {
    report_id: string;
    report_type: string;
    headline: string;
    generated_at: string;
    status: string;
}

// ========================
// Scope Validation
// ========================

function canAccessField(scope: AccessScope, fieldCategory: 'basic' | 'detailed' | 'deep'): boolean {
    if (scope === 'self') return true;
    if (scope === 'team_deep') return true;
    if (scope === 'team_standard' && fieldCategory !== 'deep') return true;
    if (scope === 'public' && fieldCategory === 'basic') return true;
    return false;
}

// ========================
// Contract Functions
// ========================

/**
 * Get driver summary (aggregated metrics)
 * Scope enforcement: basic fields for all, detailed for team_standard+, deep for team_deep only
 */
export async function getDriverSummary(
    driverProfileId: string,
    scope: AccessScope
): Promise<DriverSummary | null> {
    // Get profile
    const profileResult = await pool.query(
        `SELECT id, display_name FROM driver_profiles WHERE id = $1`,
        [driverProfileId]
    );
    if (profileResult.rows.length === 0) return null;
    const profile = profileResult.rows[0];

    // Get aggregates
    const aggResult = await pool.query(
        `SELECT * FROM driver_aggregates WHERE driver_profile_id = $1`,
        [driverProfileId]
    );
    const agg = aggResult.rows[0];

    const summary: DriverSummary = {
        driver_profile_id: profile.id,
        display_name: profile.display_name,
        total_sessions: agg?.total_sessions || 0,
        total_laps: agg?.total_laps || 0,
        avg_pace_percentile: null,
        consistency_index: null,
        incidents_per_100: null,
        last_session_at: agg?.last_session_at || null,
    };

    // Add detailed fields if scope allows
    if (canAccessField(scope, 'detailed')) {
        summary.avg_pace_percentile = agg?.avg_pace_percentile || null;
        summary.consistency_index = agg?.consistency_index || null;
        summary.incidents_per_100 = agg?.incidents_per_100 || null;
    }

    return summary;
}

/**
 * Get driver traits
 * Scope: team_standard gets labels + confidence, team_deep gets full evidence
 */
export async function getDriverTraits(
    driverProfileId: string,
    scope: AccessScope
): Promise<DriverTrait[]> {
    const result = await pool.query(
        `SELECT trait_label, category, confidence, evidence_summary, derived_at 
         FROM driver_traits WHERE driver_profile_id = $1 AND is_active = true
         ORDER BY confidence DESC`,
        [driverProfileId]
    );

    return result.rows.map(row => ({
        trait_label: row.trait_label,
        category: row.category,
        confidence: row.confidence,
        evidence_summary: canAccessField(scope, 'deep') ? row.evidence_summary : 'Access restricted',
        derived_at: row.derived_at,
    }));
}

/**
 * Get recent sessions for driver
 * Scope: basic session info for all, detailed metrics for team_standard+
 */
export async function getDriverRecentSessions(
    driverProfileId: string,
    scope: AccessScope,
    limit = 20
): Promise<SessionSummary[]> {
    const result = await pool.query(
        `SELECT 
            sm.session_id,
            s.session_type,
            s.track_name as track,
            s.car_name as car,
            sm.best_lap_time_ms as best_lap_ms,
            sm.median_lap_time_ms as median_lap_ms,
            sm.lap_count,
            sm.total_incidents as incidents,
            s.session_end_time as finished_at
         FROM driver_session_metrics sm
         JOIN sessions s ON sm.session_id = s.id
         WHERE sm.driver_profile_id = $1
         ORDER BY s.session_end_time DESC
         LIMIT $2`,
        [driverProfileId, limit]
    );

    return result.rows.map(row => ({
        session_id: row.session_id,
        session_type: row.session_type || 'unknown',
        track: row.track || 'Unknown Track',
        car: row.car || 'Unknown Car',
        best_lap_ms: canAccessField(scope, 'detailed') ? row.best_lap_ms : null,
        median_lap_ms: canAccessField(scope, 'detailed') ? row.median_lap_ms : null,
        lap_count: row.lap_count || 0,
        incidents: canAccessField(scope, 'detailed') ? row.incidents : 0,
        finished_at: row.finished_at,
    }));
}

/**
 * Get driver reports index
 * Scope: headlines for all, full access requires team_deep
 */
export async function getDriverReportsIndex(
    driverProfileId: string,
    _scope: AccessScope,
    limit = 10
): Promise<ReportIndex[]> {
    const result = await pool.query(
        `SELECT id, report_type, 
                content_json->>'headline' as headline,
                generated_at, status
         FROM driver_reports 
         WHERE driver_profile_id = $1 AND status = 'published'
         ORDER BY generated_at DESC
         LIMIT $2`,
        [driverProfileId, limit]
    );

    return result.rows.map(row => ({
        report_id: row.id,
        report_type: row.report_type,
        headline: row.headline || 'Report available',
        generated_at: row.generated_at,
        status: row.status,
    }));
}

/**
 * Get snapshot data for team event (frozen metrics)
 * Used when driver leaves team - team retains this snapshot only
 */
export async function captureDriverSnapshotForEvent(
    driverProfileId: string,
    sessionId: string
): Promise<Record<string, unknown>> {
    // Get session metrics
    const metricsResult = await pool.query(
        `SELECT best_lap_time_ms, median_lap_time_ms, lap_time_variance_ms,
                total_incidents, lap_count
         FROM driver_session_metrics 
         WHERE driver_profile_id = $1 AND session_id = $2`,
        [driverProfileId, sessionId]
    );
    const metrics = metricsResult.rows[0];

    // Get latest debrief headline
    const reportResult = await pool.query(
        `SELECT content_json->>'headline' as headline,
                content_json->>'primary_limiter' as primary_limiter
         FROM driver_reports 
         WHERE driver_profile_id = $1 AND report_type = 'session_debrief'
         ORDER BY generated_at DESC LIMIT 1`,
        [driverProfileId]
    );
    const report = reportResult.rows[0];

    // Calculate incidents per 100 laps
    const incidentsPer100 = metrics?.lap_count > 0
        ? (metrics.total_incidents / metrics.lap_count) * 100
        : null;

    return {
        best_lap_ms: metrics?.best_lap_time_ms || null,
        median_lap_ms: metrics?.median_lap_time_ms || null,
        variance_ms: metrics?.lap_time_variance_ms || null,
        incidents_per_100: incidentsPer100,
        debrief_headline: report?.headline || null,
        primary_limiter: report?.primary_limiter || null,
        captured_at: new Date().toISOString(),
    };
}
