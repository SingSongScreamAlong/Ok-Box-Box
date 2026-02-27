/**
 * Behavioral Metrics Repository
 * CRUD operations for telemetry-derived behavioral indices
 */

import { pool } from '../client.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SessionBehavioralMetrics {
    id: string;
    session_id: string;
    driver_profile_id: string;
    
    // Braking
    brake_timing_score: number | null;
    brake_pressure_smoothness: number | null;
    trail_braking_stability: number | null;
    entry_overshoot_score: number | null;
    braking_sample_corners: number;
    
    // Throttle
    throttle_modulation_score: number | null;
    exit_traction_stability: number | null;
    slip_throttle_control: number | null;
    throttle_sample_corners: number;
    
    // Steering
    turn_in_consistency: number | null;
    mid_corner_stability: number | null;
    rotation_balance: number | null;
    steering_sample_corners: number;
    
    // Rhythm
    lap_time_consistency: number | null;
    sector_consistency: number | null;
    input_repeatability: number | null;
    baseline_adherence: number | null;
    rhythm_sample_laps: number;
    
    // Computed Indices
    bsi: number | null;
    tci: number | null;
    cpi2: number | null;
    rci: number | null;
    behavioral_stability: number | null;
    
    // Metadata
    telemetry_confidence: number;
    data_source: 'live' | 'post_session' | 'historical';
    computed_at: string;
}

export interface DriverBehavioralAggregate {
    id: string;
    driver_profile_id: string;
    time_window: 'last_10' | 'last_30' | 'all_time';
    car_name: string | null;
    track_name: string | null;
    
    avg_bsi: number | null;
    avg_tci: number | null;
    avg_cpi2: number | null;
    avg_rci: number | null;
    avg_behavioral_stability: number | null;
    
    bsi_trend: number | null;
    tci_trend: number | null;
    cpi2_trend: number | null;
    rci_trend: number | null;
    
    session_count: number;
    total_laps_analyzed: number;
    total_corners_analyzed: number;
    avg_telemetry_confidence: number;
    
    computed_at: string;
}

export interface CreateSessionBehavioralDTO {
    session_id: string;
    driver_profile_id: string;
    
    brake_timing_score?: number;
    brake_pressure_smoothness?: number;
    trail_braking_stability?: number;
    entry_overshoot_score?: number;
    braking_sample_corners?: number;
    
    throttle_modulation_score?: number;
    exit_traction_stability?: number;
    slip_throttle_control?: number;
    throttle_sample_corners?: number;
    
    turn_in_consistency?: number;
    mid_corner_stability?: number;
    rotation_balance?: number;
    steering_sample_corners?: number;
    
    lap_time_consistency?: number;
    sector_consistency?: number;
    input_repeatability?: number;
    baseline_adherence?: number;
    rhythm_sample_laps?: number;
    
    bsi?: number;
    tci?: number;
    cpi2?: number;
    rci?: number;
    behavioral_stability?: number;
    
    telemetry_confidence?: number;
    data_source?: 'live' | 'post_session' | 'historical';
}

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION BEHAVIORAL METRICS CRUD
// ═══════════════════════════════════════════════════════════════════════════════

export async function createSessionBehavioralMetrics(
    dto: CreateSessionBehavioralDTO
): Promise<SessionBehavioralMetrics> {
    const result = await pool.query<SessionBehavioralMetrics>(
        `INSERT INTO session_behavioral_metrics (
            session_id, driver_profile_id,
            brake_timing_score, brake_pressure_smoothness, trail_braking_stability, entry_overshoot_score, braking_sample_corners,
            throttle_modulation_score, exit_traction_stability, slip_throttle_control, throttle_sample_corners,
            turn_in_consistency, mid_corner_stability, rotation_balance, steering_sample_corners,
            lap_time_consistency, sector_consistency, input_repeatability, baseline_adherence, rhythm_sample_laps,
            bsi, tci, cpi2, rci, behavioral_stability,
            telemetry_confidence, data_source
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
        ON CONFLICT (session_id, driver_profile_id) DO UPDATE SET
            brake_timing_score = EXCLUDED.brake_timing_score,
            brake_pressure_smoothness = EXCLUDED.brake_pressure_smoothness,
            trail_braking_stability = EXCLUDED.trail_braking_stability,
            entry_overshoot_score = EXCLUDED.entry_overshoot_score,
            braking_sample_corners = EXCLUDED.braking_sample_corners,
            throttle_modulation_score = EXCLUDED.throttle_modulation_score,
            exit_traction_stability = EXCLUDED.exit_traction_stability,
            slip_throttle_control = EXCLUDED.slip_throttle_control,
            throttle_sample_corners = EXCLUDED.throttle_sample_corners,
            turn_in_consistency = EXCLUDED.turn_in_consistency,
            mid_corner_stability = EXCLUDED.mid_corner_stability,
            rotation_balance = EXCLUDED.rotation_balance,
            steering_sample_corners = EXCLUDED.steering_sample_corners,
            lap_time_consistency = EXCLUDED.lap_time_consistency,
            sector_consistency = EXCLUDED.sector_consistency,
            input_repeatability = EXCLUDED.input_repeatability,
            baseline_adherence = EXCLUDED.baseline_adherence,
            rhythm_sample_laps = EXCLUDED.rhythm_sample_laps,
            bsi = EXCLUDED.bsi,
            tci = EXCLUDED.tci,
            cpi2 = EXCLUDED.cpi2,
            rci = EXCLUDED.rci,
            behavioral_stability = EXCLUDED.behavioral_stability,
            telemetry_confidence = EXCLUDED.telemetry_confidence,
            data_source = EXCLUDED.data_source,
            computed_at = NOW()
        RETURNING *`,
        [
            dto.session_id,
            dto.driver_profile_id,
            dto.brake_timing_score ?? null,
            dto.brake_pressure_smoothness ?? null,
            dto.trail_braking_stability ?? null,
            dto.entry_overshoot_score ?? null,
            dto.braking_sample_corners ?? 0,
            dto.throttle_modulation_score ?? null,
            dto.exit_traction_stability ?? null,
            dto.slip_throttle_control ?? null,
            dto.throttle_sample_corners ?? 0,
            dto.turn_in_consistency ?? null,
            dto.mid_corner_stability ?? null,
            dto.rotation_balance ?? null,
            dto.steering_sample_corners ?? 0,
            dto.lap_time_consistency ?? null,
            dto.sector_consistency ?? null,
            dto.input_repeatability ?? null,
            dto.baseline_adherence ?? null,
            dto.rhythm_sample_laps ?? 0,
            dto.bsi ?? null,
            dto.tci ?? null,
            dto.cpi2 ?? null,
            dto.rci ?? null,
            dto.behavioral_stability ?? null,
            dto.telemetry_confidence ?? 0,
            dto.data_source ?? 'post_session',
        ]
    );
    return result.rows[0];
}

export async function getSessionBehavioralMetrics(
    sessionId: string,
    driverProfileId: string
): Promise<SessionBehavioralMetrics | null> {
    const result = await pool.query<SessionBehavioralMetrics>(
        'SELECT * FROM session_behavioral_metrics WHERE session_id = $1 AND driver_profile_id = $2',
        [sessionId, driverProfileId]
    );
    return result.rows[0] || null;
}

export async function getBehavioralMetricsForDriver(
    driverProfileId: string,
    limit: number = 10
): Promise<SessionBehavioralMetrics[]> {
    const result = await pool.query<SessionBehavioralMetrics>(
        `SELECT sbm.* FROM session_behavioral_metrics sbm
         JOIN sessions s ON s.id = sbm.session_id
         WHERE sbm.driver_profile_id = $1
         ORDER BY s.started_at DESC
         LIMIT $2`,
        [driverProfileId, limit]
    );
    return result.rows;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DRIVER BEHAVIORAL AGGREGATES
// ═══════════════════════════════════════════════════════════════════════════════

export async function getDriverBehavioralAggregate(
    driverProfileId: string,
    timeWindow: 'last_10' | 'last_30' | 'all_time' = 'last_10',
    carName?: string,
    trackName?: string
): Promise<DriverBehavioralAggregate | null> {
    const result = await pool.query<DriverBehavioralAggregate>(
        `SELECT * FROM driver_behavioral_aggregates 
         WHERE driver_profile_id = $1 
         AND time_window = $2
         AND (car_name IS NOT DISTINCT FROM $3)
         AND (track_name IS NOT DISTINCT FROM $4)`,
        [driverProfileId, timeWindow, carName ?? null, trackName ?? null]
    );
    return result.rows[0] || null;
}

export async function computeAndStoreDriverBehavioralAggregate(
    driverProfileId: string,
    timeWindow: 'last_10' | 'last_30' | 'all_time' = 'last_10'
): Promise<DriverBehavioralAggregate | null> {
    // Determine limit based on time window
    const limit = timeWindow === 'last_10' ? 10 : timeWindow === 'last_30' ? 30 : 1000;
    
    // Get recent behavioral metrics
    const metrics = await getBehavioralMetricsForDriver(driverProfileId, limit);
    
    if (metrics.length === 0) {
        return null;
    }
    
    // Compute averages
    const validMetrics = metrics.filter(m => m.telemetry_confidence > 0);
    if (validMetrics.length === 0) {
        return null;
    }
    
    const avg = (arr: (number | null)[]): number | null => {
        const valid = arr.filter((v): v is number => v !== null);
        return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
    };
    
    const avgBsi = avg(validMetrics.map(m => m.bsi));
    const avgTci = avg(validMetrics.map(m => m.tci));
    const avgCpi2 = avg(validMetrics.map(m => m.cpi2));
    const avgRci = avg(validMetrics.map(m => m.rci));
    const avgBehavioral = avg(validMetrics.map(m => m.behavioral_stability));
    const avgConfidence = avg(validMetrics.map(m => m.telemetry_confidence));
    
    // Compute trends (simple linear regression slope)
    const computeTrend = (values: (number | null)[]): number | null => {
        const valid = values.filter((v): v is number => v !== null);
        if (valid.length < 3) return null;
        
        const n = valid.length;
        const sumX = (n * (n - 1)) / 2;
        const sumY = valid.reduce((a, b) => a + b, 0);
        const sumXY = valid.reduce((sum, y, i) => sum + i * y, 0);
        const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        return slope;
    };
    
    const bsiTrend = computeTrend(validMetrics.map(m => m.bsi).reverse());
    const tciTrend = computeTrend(validMetrics.map(m => m.tci).reverse());
    const cpi2Trend = computeTrend(validMetrics.map(m => m.cpi2).reverse());
    const rciTrend = computeTrend(validMetrics.map(m => m.rci).reverse());
    
    const totalLaps = validMetrics.reduce((sum, m) => sum + (m.rhythm_sample_laps || 0), 0);
    const totalCorners = validMetrics.reduce((sum, m) => 
        sum + (m.braking_sample_corners || 0) + (m.throttle_sample_corners || 0) + (m.steering_sample_corners || 0), 0
    );
    
    // Upsert aggregate
    const result = await pool.query<DriverBehavioralAggregate>(
        `INSERT INTO driver_behavioral_aggregates (
            driver_profile_id, time_window, car_name, track_name,
            avg_bsi, avg_tci, avg_cpi2, avg_rci, avg_behavioral_stability,
            bsi_trend, tci_trend, cpi2_trend, rci_trend,
            session_count, total_laps_analyzed, total_corners_analyzed, avg_telemetry_confidence
        ) VALUES ($1, $2, NULL, NULL, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (driver_profile_id, time_window, car_name, track_name) DO UPDATE SET
            avg_bsi = EXCLUDED.avg_bsi,
            avg_tci = EXCLUDED.avg_tci,
            avg_cpi2 = EXCLUDED.avg_cpi2,
            avg_rci = EXCLUDED.avg_rci,
            avg_behavioral_stability = EXCLUDED.avg_behavioral_stability,
            bsi_trend = EXCLUDED.bsi_trend,
            tci_trend = EXCLUDED.tci_trend,
            cpi2_trend = EXCLUDED.cpi2_trend,
            rci_trend = EXCLUDED.rci_trend,
            session_count = EXCLUDED.session_count,
            total_laps_analyzed = EXCLUDED.total_laps_analyzed,
            total_corners_analyzed = EXCLUDED.total_corners_analyzed,
            avg_telemetry_confidence = EXCLUDED.avg_telemetry_confidence,
            computed_at = NOW()
        RETURNING *`,
        [
            driverProfileId,
            timeWindow,
            avgBsi,
            avgTci,
            avgCpi2,
            avgRci,
            avgBehavioral,
            bsiTrend,
            tciTrend,
            cpi2Trend,
            rciTrend,
            validMetrics.length,
            totalLaps,
            totalCorners,
            avgConfidence,
        ]
    );
    
    return result.rows[0];
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Convert DB row to frontend format
// ═══════════════════════════════════════════════════════════════════════════════

export interface TelemetryMetricsResponse {
    bsi: number;
    tci: number;
    cpi2: number;
    rci: number;
    behavioralStability: number;
    confidence: number;
    modelType: 'telemetry_informed' | 'results_based';
    sessionCount: number;
    braking: {
        brakeTimingScore: number;
        brakePressureSmoothness: number;
        trailBrakingStability: number;
        entryOvershootScore: number;
        sampleCorners: number;
    } | null;
    throttle: {
        throttleModulationScore: number;
        exitTractionStability: number;
        slipThrottleControl: number;
        sampleCorners: number;
    } | null;
    steering: {
        turnInConsistency: number;
        midCornerStability: number;
        rotationBalance: number;
        sampleCorners: number;
    } | null;
    rhythm: {
        lapTimeConsistency: number;
        sectorConsistency: number;
        inputRepeatability: number;
        baselineAdherence: number;
        sampleLaps: number;
    } | null;
}

export function aggregateToResponse(agg: DriverBehavioralAggregate | null): TelemetryMetricsResponse | null {
    if (!agg || agg.avg_telemetry_confidence < 25) {
        return null;
    }
    
    return {
        bsi: parseFloat(String(agg.avg_bsi)) || 0,
        tci: parseFloat(String(agg.avg_tci)) || 0,
        cpi2: parseFloat(String(agg.avg_cpi2)) || 0,
        rci: parseFloat(String(agg.avg_rci)) || 0,
        behavioralStability: parseFloat(String(agg.avg_behavioral_stability)) || 0,
        confidence: parseFloat(String(agg.avg_telemetry_confidence)) || 0,
        modelType: agg.avg_telemetry_confidence >= 50 ? 'telemetry_informed' : 'results_based',
        sessionCount: agg.session_count,
        braking: null,  // Detailed metrics not stored in aggregate
        throttle: null,
        steering: null,
        rhythm: null,
    };
}
