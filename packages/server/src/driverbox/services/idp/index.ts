/**
 * Individual Driver Profile (IDP) Services
 * Re-exports all IDP-related services for convenient imports
 */

// Session Metrics
export {
    computeSessionMetrics,
    recomputeMetricsForSession,
    type ComputeMetricsInput
} from './session-metrics.service.js';

// Driver Aggregates
export {
    computeDriverAggregates,
    recomputeAllAggregates
} from './driver-aggregates.service.js';

// Driver Traits
export {
    deriveDriverTraits,
    deriveTraitsForAllDrivers
} from './driver-traits.service.js';

// Report Generation
export {
    generateSessionDebrief,
    generateMonthlyNarrative
} from './report-generation.service.js';

// ========================
// Orchestration Functions
// ========================

/**
 * Run complete IDP pipeline for a driver after session completion
 */
export async function runPostSessionPipeline(
    sessionId: string,
    driverProfileId: string
): Promise<void> {
    const { recomputeMetricsForSession } = await import('./session-metrics.service.js');
    const { computeDriverAggregates } = await import('./driver-aggregates.service.js');
    const { deriveDriverTraits } = await import('./driver-traits.service.js');
    const { generateSessionDebrief } = await import('./report-generation.service.js');

    console.log(`[IDP Pipeline] Starting for driver ${driverProfileId}, session ${sessionId}`);

    // 1. Compute session metrics
    await recomputeMetricsForSession(sessionId);

    // 2. Update aggregates
    await computeDriverAggregates(driverProfileId, 'all_time');
    await computeDriverAggregates(driverProfileId, 'rolling_30d');

    // 3. Re-derive traits
    await deriveDriverTraits(driverProfileId);

    // 4. Generate session debrief
    try {
        await generateSessionDebrief(sessionId, driverProfileId);
    } catch (error) {
        console.warn(`[IDP Pipeline] Debrief generation failed:`, error);
    }

    console.log(`[IDP Pipeline] Complete for driver ${driverProfileId}`);
}

/**
 * Run nightly aggregation job for all drivers
 */
export async function runNightlyAggregationJob(): Promise<void> {
    const { pool } = await import('../../../db/client.js');
    const { computeDriverAggregates } = await import('./driver-aggregates.service.js');
    const { deriveDriverTraits } = await import('./driver-traits.service.js');

    console.log('[IDP Nightly] Starting aggregation job');

    // Get all driver profiles with metrics
    const result = await pool.query<{ id: string }>(
        'SELECT DISTINCT driver_profile_id as id FROM session_metrics'
    );

    for (const row of result.rows) {
        try {
            await computeDriverAggregates(row.id, 'all_time');
            await computeDriverAggregates(row.id, 'rolling_30d');
            await computeDriverAggregates(row.id, 'rolling_90d');
            await deriveDriverTraits(row.id);
        } catch (error) {
            console.error(`[IDP Nightly] Failed for driver ${row.id}:`, error);
        }
    }

    console.log(`[IDP Nightly] Processed ${result.rows.length} drivers`);
}
