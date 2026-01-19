// Re-export services
export * from './driver-aggregates.service.js';
export * from './driver-traits.service.js';
export * from './iracing-sync.service.js';
export * from './session-metrics.service.js';
export * from './report-generation.service.js';
export * from './pipeline.service.js';

import { getGlobalAggregate } from '../../../db/repositories/driver-aggregates.repo.js';
import { getCurrentTraits } from '../../../db/repositories/driver-traits.repo.js';

// Facade for public consumption (e.g. Dashboard/PC Build)
export async function getDriverRacecraftStats(driverId: string) {
    // Parallel fetch from Repositories
    const [stats, traitProfile] = await Promise.all([
        getGlobalAggregate(driverId, 'all_time'),
        getCurrentTraits(driverId)
    ]);

    return {
        driverId,
        // Core Ratings (0-100)
        ratings: {
            // Map consistent naming or fallbacks
            overall: stats?.consistency_index || 50, // Placeholder mapping if 'overall' not computed, using consistency as proxy for now or 50
            // Actually 'overallScore' was in my previous (imagined) service. 
            // The DB Aggregate has: consistency_index, risk_index, endurance_fitness_index, start_performance_index.
            // I'll map them as best as I can.
            safety: stats?.risk_index ? (100 - stats.risk_index) : 50, // Risk is 0-100 (high risk), so invert for safety?
            // "0 incidents = 0 risk, 10+ incidents... = 100 risk" -> So Safety = 100 - Risk.
            pace: stats?.avg_pace_percentile || 50, // This is percentile, so maybe okay as 0-100 score? 
            racecraft: stats?.start_performance_index ? (stats.start_performance_index + 1) * 50 : 50, // -1 to 1 -> 0 to 100
            consistency: stats?.consistency_index || 50
        },
        // Detailed traits
        traits: traitProfile,
        // Progression
        experience: {
            totalRaces: stats?.session_count || 0,
            podiums: 0, // Not in aggregate, need advanced query or separate stats
            wins: 0,
            cleanRaces: 0 // Not in aggregate
        },
        generatedAt: new Date()
    };
}
