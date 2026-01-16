/**
 * Session Metrics Computation Service
 * Computes per-session driver performance metrics from lap data
 */

import { createSessionMetrics, CreateSessionMetricsDTO } from '../../../db/repositories/session-metrics.repo.js';
import { incrementProfileStats, getDriverProfileByPlatformId } from '../../../db/repositories/driver-profile.repo.js';
import { pool } from '../../../db/client.js';

// ========================
// Types
// ========================

interface LapData {
    lap_number: number;
    lap_time_ms: number;
    is_valid: boolean;
    sector_1_ms?: number;
    sector_2_ms?: number;
    sector_3_ms?: number;
    incident_count?: number;
}

interface SessionResult {
    finish_position?: number;
    start_position?: number;
    sof?: number;
    irating_change?: number;
}

export interface ComputeMetricsInput {
    session_id: string;
    driver_id: string; // iRacing customer ID or relay driver ID
    driver_name?: string;
    laps: LapData[];
    result?: SessionResult;
    field_best_lap_ms?: number;
}

// ========================
// Statistical Helpers
// ========================

function mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
}

function median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stdDev(values: number[]): number {
    if (values.length < 2) return 0;
    const m = mean(values);
    const variance = values.reduce((acc, val) => acc + Math.pow(val - m, 2), 0) / (values.length - 1);
    return Math.sqrt(variance);
}

// ========================
// Metric Computations
// ========================

/**
 * Compute pace dropoff score
 * Measures how much pace degrades in the last 25% of the stint
 * Score: 100 = no dropoff, 0 = severe dropoff
 */
function computePaceDropoff(laps: LapData[]): number | null {
    const validLaps = laps.filter(l => l.is_valid);
    if (validLaps.length < 8) return null; // Need enough laps

    const quartileSize = Math.floor(validLaps.length / 4);
    const firstQuartile = validLaps.slice(0, quartileSize);
    const lastQuartile = validLaps.slice(-quartileSize);

    const firstAvg = mean(firstQuartile.map(l => l.lap_time_ms));
    const lastAvg = mean(lastQuartile.map(l => l.lap_time_ms));

    // Calculate degradation as percentage
    const degradationPct = ((lastAvg - firstAvg) / firstAvg) * 100;

    // Score: 0% degradation = 100, 5%+ degradation = 0
    const score = Math.max(0, Math.min(100, 100 - (degradationPct * 20)));
    return Math.round(score * 100) / 100;
}

/**
 * Estimate time lost in traffic
 * Compares laps with high variance to clean laps
 */
function computeTrafficTimeLoss(laps: LapData[]): number | null {
    const validLaps = laps.filter(l => l.is_valid);
    if (validLaps.length < 5) return null;

    const times = validLaps.map(l => l.lap_time_ms);
    const med = median(times);
    const sd = stdDev(times);

    // Laps more than 1 std dev slower are likely traffic-affected
    const trafficLaps = times.filter(t => t > med + sd);
    const cleanLaps = times.filter(t => t <= med);

    if (cleanLaps.length === 0 || trafficLaps.length === 0) return 0;

    const cleanAvg = mean(cleanLaps);
    const trafficAvg = mean(trafficLaps);

    // Total time lost = (avg traffic lap - avg clean lap) * number of traffic laps
    const timeLost = (trafficAvg - cleanAvg) * trafficLaps.length;
    return Math.round(timeLost);
}

// ========================
// Main Compute Function
// ========================

export async function computeSessionMetrics(input: ComputeMetricsInput): Promise<void> {
    const { session_id, driver_id, laps, result, field_best_lap_ms } = input;

    // Try to find driver profile by platform ID
    const profile = await getDriverProfileByPlatformId('iracing', driver_id);
    if (!profile) {
        console.log(`[SessionMetrics] No profile found for driver ${driver_id}, skipping`);
        return;
    }

    // Filter valid laps
    const validLaps = laps.filter(l => l.is_valid);
    const lapTimes = validLaps.map(l => l.lap_time_ms);

    // Basic stats
    const totalLaps = laps.length;
    const validLapCount = validLaps.length;
    const bestLapMs = lapTimes.length > 0 ? Math.min(...lapTimes) : null;
    const medianLapMs = lapTimes.length > 0 ? Math.round(median(lapTimes)) : null;
    const meanLapMs = lapTimes.length > 0 ? Math.round(mean(lapTimes)) : null;
    const stdDevMs = lapTimes.length >= 2 ? Math.round(stdDev(lapTimes)) : null;

    // Incident count (from lap data or default to 0)
    const incidentCount = laps.reduce((acc, l) => acc + (l.incident_count || 0), 0);
    const incidentsPer100 = totalLaps > 0 ? Math.round((incidentCount / totalLaps) * 100 * 100) / 100 : null;

    // Pace percentile (vs field)
    let pacePercentile: number | null = null;
    let gapToLeaderPct: number | null = null;
    if (bestLapMs && field_best_lap_ms && field_best_lap_ms > 0) {
        gapToLeaderPct = Math.round(((bestLapMs - field_best_lap_ms) / field_best_lap_ms) * 100 * 100) / 100;
        // Lower gap = higher percentile (inverse)
        pacePercentile = Math.max(0, Math.min(100, 100 - gapToLeaderPct * 10));
    }

    // Race-specific metrics
    const finishPosition = result?.finish_position ?? null;
    const startPosition = result?.start_position ?? null;
    const positionsGained = (startPosition !== null && finishPosition !== null)
        ? startPosition - finishPosition
        : null;

    // Derived metrics
    const paceDropoff = computePaceDropoff(laps);
    const trafficTimeLoss = computeTrafficTimeLoss(laps);

    // Create metrics record
    const dto: CreateSessionMetricsDTO = {
        session_id,
        driver_profile_id: profile.id,
        total_laps: totalLaps,
        valid_laps: validLapCount,
        best_lap_time_ms: bestLapMs,
        median_lap_time_ms: medianLapMs,
        mean_lap_time_ms: meanLapMs,
        lap_time_std_dev_ms: stdDevMs,
        pace_percentile: pacePercentile,
        gap_to_leader_best_pct: gapToLeaderPct,
        incident_count: incidentCount,
        incidents_per_100_laps: incidentsPer100,
        finish_position: finishPosition,
        start_position: startPosition,
        positions_gained: positionsGained,
        sof: result?.sof ?? null,
        irating_change: result?.irating_change ?? null,
        pace_dropoff_score: paceDropoff,
        traffic_time_loss_ms: trafficTimeLoss,
    };

    await createSessionMetrics(dto);

    // Update profile rollup stats
    await incrementProfileStats(profile.id, 1, totalLaps, incidentCount);

    console.log(`[SessionMetrics] Computed metrics for driver ${profile.display_name} in session ${session_id}`);
}

// ========================
// Batch Computation (for existing sessions)
// ========================

export async function recomputeMetricsForSession(sessionId: string): Promise<void> {
    // Fetch lap data from laps table (if it exists)
    const lapsResult = await pool.query<{
        driver_id: string;
        lap_number: number;
        lap_time_ms: number;
        is_valid: boolean;
        incident_count: number;
    }>(
        `SELECT driver_id, lap_number, lap_time_ms, is_valid, COALESCE(incident_count, 0) as incident_count
     FROM laps
     WHERE session_id = $1
     ORDER BY driver_id, lap_number`,
        [sessionId]
    );

    if (lapsResult.rows.length === 0) {
        console.log(`[SessionMetrics] No lap data found for session ${sessionId}`);
        return;
    }

    // Group laps by driver
    const lapsByDriver = new Map<string, LapData[]>();
    for (const row of lapsResult.rows) {
        if (!lapsByDriver.has(row.driver_id)) {
            lapsByDriver.set(row.driver_id, []);
        }
        lapsByDriver.get(row.driver_id)!.push({
            lap_number: row.lap_number,
            lap_time_ms: row.lap_time_ms,
            is_valid: row.is_valid,
            incident_count: row.incident_count,
        });
    }

    // Compute field best lap
    const allValidTimes = lapsResult.rows.filter(r => r.is_valid).map(r => r.lap_time_ms);
    const fieldBestLap = allValidTimes.length > 0 ? Math.min(...allValidTimes) : undefined;

    // Compute metrics for each driver
    for (const [driverId, laps] of lapsByDriver) {
        await computeSessionMetrics({
            session_id: sessionId,
            driver_id: driverId,
            laps,
            field_best_lap_ms: fieldBestLap,
        });
    }
}
