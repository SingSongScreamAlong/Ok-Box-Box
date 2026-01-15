/**
 * Driver Aggregates Computation Service
 * Computes rolling statistics across sessions for a driver
 */

import { pool } from '../../db/client.js';
import { upsertDriverAggregate, CreateDriverAggregateDTO } from '../../db/repositories/driver-aggregates.repo.js';
import { SessionMetrics, WindowType } from '../../types/idp.types.js';

// ========================
// Statistical Helpers
// ========================

function mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
}

// ========================
// Aggregate Computation
// ========================

interface AggregateContext {
    car_name: string | null;
    track_name: string | null;
    discipline: string | null;
}

export async function computeDriverAggregates(
    driverProfileId: string,
    windowType: WindowType = 'all_time'
): Promise<void> {
    console.log(`[Aggregates] Computing ${windowType} aggregates for driver ${driverProfileId}`);

    // Determine date range
    let dateFilter = '';
    let windowStart: Date | null = null;
    let windowEnd: Date | null = new Date();

    switch (windowType) {
        case 'rolling_30d':
            windowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            dateFilter = `AND s.started_at >= '${windowStart.toISOString()}'`;
            break;
        case 'rolling_90d':
            windowStart = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
            dateFilter = `AND s.started_at >= '${windowStart.toISOString()}'`;
            break;
        case 'all_time':
        default:
            windowStart = null;
            windowEnd = null;
            break;
    }

    // Fetch all metrics for this driver within the window
    const metricsResult = await pool.query<SessionMetrics & { car_name: string; track_name: string }>(
        `SELECT sm.*, 
            s.metadata->>'car_name' as car_name,
            s.track_name
     FROM session_metrics sm
     JOIN sessions s ON s.id = sm.session_id
     WHERE sm.driver_profile_id = $1 ${dateFilter}
     ORDER BY s.started_at DESC`,
        [driverProfileId]
    );

    const metrics = metricsResult.rows;
    if (metrics.length === 0) {
        console.log(`[Aggregates] No metrics found for driver ${driverProfileId}`);
        return;
    }

    // Compute global aggregate (no context filtering)
    await computeAggregateForContext(
        driverProfileId,
        metrics,
        { car_name: null, track_name: null, discipline: null },
        windowType,
        windowStart,
        windowEnd
    );

    // Compute per-car aggregates
    const cars = [...new Set(metrics.map(m => m.car_name).filter(Boolean))];
    for (const car of cars) {
        const carMetrics = metrics.filter(m => m.car_name === car);
        if (carMetrics.length >= 3) { // Minimum 3 sessions for aggregate
            await computeAggregateForContext(
                driverProfileId,
                carMetrics,
                { car_name: car, track_name: null, discipline: null },
                windowType,
                windowStart,
                windowEnd
            );
        }
    }

    // Compute per-track aggregates
    const tracks = [...new Set(metrics.map(m => m.track_name).filter(Boolean))];
    for (const track of tracks) {
        const trackMetrics = metrics.filter(m => m.track_name === track);
        if (trackMetrics.length >= 3) {
            await computeAggregateForContext(
                driverProfileId,
                trackMetrics,
                { car_name: null, track_name: track, discipline: null },
                windowType,
                windowStart,
                windowEnd
            );
        }
    }

    // Compute car+track combos with enough data
    for (const car of cars) {
        for (const track of tracks) {
            const comboMetrics = metrics.filter(m => m.car_name === car && m.track_name === track);
            if (comboMetrics.length >= 5) { // Higher bar for combos
                await computeAggregateForContext(
                    driverProfileId,
                    comboMetrics,
                    { car_name: car, track_name: track, discipline: null },
                    windowType,
                    windowStart,
                    windowEnd
                );
            }
        }
    }

    console.log(`[Aggregates] Computed ${windowType} aggregates for driver ${driverProfileId}`);
}

async function computeAggregateForContext(
    driverProfileId: string,
    metrics: SessionMetrics[],
    context: AggregateContext,
    windowType: WindowType,
    windowStart: Date | null,
    windowEnd: Date | null
): Promise<void> {
    const sessionCount = metrics.length;
    const lapCount = metrics.reduce((acc, m) => acc + m.total_laps, 0);

    // Pace metrics
    const pacePercentiles = metrics.map(m => m.pace_percentile).filter((v): v is number => v !== null);
    const avgPacePercentile = pacePercentiles.length > 0 ? Math.round(mean(pacePercentiles) * 100) / 100 : null;
    const bestPacePercentile = pacePercentiles.length > 0 ? Math.max(...pacePercentiles) : null;

    // Pace trend (compare first half to second half)
    let paceTrend: number | null = null;
    if (pacePercentiles.length >= 6) {
        const firstHalf = pacePercentiles.slice(Math.floor(pacePercentiles.length / 2));
        const secondHalf = pacePercentiles.slice(0, Math.floor(pacePercentiles.length / 2));
        paceTrend = Math.round((mean(secondHalf) - mean(firstHalf)) * 100) / 100;
    }

    // Consistency (inverse of std dev normalized)
    const stdDevs = metrics.map(m => m.lap_time_std_dev_ms).filter((v): v is number => v !== null);
    const avgStdDev = stdDevs.length > 0 ? Math.round(mean(stdDevs)) : null;
    // Lower std dev = higher consistency. Normalize to 0-100 scale
    // Using 2000ms as "bad" baseline and 200ms as "excellent"
    const consistencyIndex = avgStdDev !== null
        ? Math.max(0, Math.min(100, 100 - ((avgStdDev - 200) / 18)))
        : null;

    // Risk index (based on incidents per 100 laps)
    const incidentRates = metrics.map(m => m.incidents_per_100_laps).filter((v): v is number => v !== null);
    const avgIncidents = incidentRates.length > 0 ? Math.round(mean(incidentRates) * 100) / 100 : null;
    // 0 incidents = 0 risk, 10+ incidents/100 laps = 100 risk
    const riskIndex = avgIncidents !== null
        ? Math.min(100, avgIncidents * 10)
        : null;

    // Race craft (positions gained)
    const posGained = metrics.map(m => m.positions_gained).filter((v): v is number => v !== null);
    const avgPosGained = posGained.length > 0 ? Math.round(mean(posGained) * 100) / 100 : null;
    // Normalize to -1 to +1 scale for start performance
    const startPerfIndex = avgPosGained !== null ? Math.max(-1, Math.min(1, avgPosGained / 5)) : null;

    // Endurance fitness (from pace dropoff scores)
    const dropoffs = metrics.map(m => m.pace_dropoff_score).filter((v): v is number => v !== null);
    const enduranceFitness = dropoffs.length > 0 ? Math.round(mean(dropoffs) * 100) / 100 : null;

    const dto: CreateDriverAggregateDTO = {
        driver_profile_id: driverProfileId,
        car_name: context.car_name,
        track_name: context.track_name,
        discipline: context.discipline,
        window_type: windowType,
        window_start: windowStart,
        window_end: windowEnd,
        session_count: sessionCount,
        lap_count: lapCount,
        avg_pace_percentile: avgPacePercentile,
        best_pace_percentile: bestPacePercentile,
        pace_trend: paceTrend,
        consistency_index: consistencyIndex,
        avg_std_dev_ms: avgStdDev,
        risk_index: riskIndex,
        avg_incidents_per_100_laps: avgIncidents,
        avg_positions_gained: avgPosGained,
        start_performance_index: startPerfIndex,
        endurance_fitness_index: enduranceFitness,
    };

    await upsertDriverAggregate(dto);
}

// ========================
// Batch Recomputation
// ========================

export async function recomputeAllAggregates(driverProfileId: string): Promise<void> {
    await computeDriverAggregates(driverProfileId, 'all_time');
    await computeDriverAggregates(driverProfileId, 'rolling_30d');
    await computeDriverAggregates(driverProfileId, 'rolling_90d');
}
