/**
 * IDP Pipeline Service
 * Orchestrates the post-session processing flow for Driver Identity Provider.
 */

import { computeDriverAggregates } from './driver-aggregates.service.js';
import { deriveDriverTraits } from './driver-traits.service.js';
import { generateSessionDebrief } from './report-generation.service.js';

export async function runPostSessionPipeline(sessionId: string, driverProfileId: string): Promise<void> {
    console.log(`[IDP Pipeline] Starting post-session processing for driver ${driverProfileId} (Session: ${sessionId})`);

    try {
        // 1. Compute rolling aggregates (fast, mathematical)
        // We recompute 'all_time' and 'rolling_30d' to keep stats fresh
        await computeDriverAggregates(driverProfileId, 'all_time');
        await computeDriverAggregates(driverProfileId, 'rolling_30d');

        // 2. Derive traits (deterministic rules based on new aggregates)
        await deriveDriverTraits(driverProfileId);

        // 3. Generate AI Report (slow, external API call)
        // We do this last so stats/traits are up-to-date for the LLM context
        await generateSessionDebrief(sessionId, driverProfileId);

        console.log(`[IDP Pipeline] Completed successfully for driver ${driverProfileId}`);
    } catch (error) {
        console.error(`[IDP Pipeline] Failed for driver ${driverProfileId}:`, error);
        throw error; // Propagate to caller (SessionHandler logs it)
    }
}
