/**
 * Driver Traits Derivation Service
 * Derives deterministic characteristic indicators from aggregate statistics
 * 
 * ETHOS: Equal Professional Dignity
 * - Traits are neutral technical descriptors, not judgments
 * - No terms implying "good/bad" or "beginner/advanced"
 * - All drivers receive the same professional analysis
 * 
 * All traits are:
 * - Deterministic (same inputs = same outputs)
 * - Explainable (evidence_summary documents the logic)
 * - Recalculated periodically (not cached indefinitely)
 */

import { getGlobalAggregate } from '../../../db/repositories/driver-aggregates.repo.js';
import { upsertDriverTrait, expireAllTraits, CreateDriverTraitDTO } from '../../../db/repositories/driver-traits.repo.js';
import { TRAIT_KEYS } from '../../types/idp.types.js';

// ========================
// Trait Definitions
// ========================

interface TraitRule {
    key: string;
    label: string;
    category: string;
    evaluate: (aggregate: AggregateData) => { applies: boolean; confidence: number; evidence: string } | null;
}

interface AggregateData {
    session_count: number;
    consistency_index: number | null;
    risk_index: number | null;
    avg_std_dev_ms: number | null;
    avg_positions_gained: number | null;
    start_performance_index: number | null;
    endurance_fitness_index: number | null;
    avg_pace_percentile: number | null;
    pace_trend: number | null;
}

const MINIMUM_SESSIONS = 5; // Minimum sessions for trait derivation

const TRAIT_RULES: TraitRule[] = [
    // Consistency characteristics
    {
        key: TRAIT_KEYS.HIGH_VARIANCE,
        label: 'Elevated Lap Time Variance',
        category: 'consistency',
        evaluate: (agg) => {
            if (agg.consistency_index === null || agg.session_count < MINIMUM_SESSIONS) return null;
            if (agg.consistency_index < 60) {
                const confidence = Math.min(0.95, (60 - agg.consistency_index) / 40 + 0.5);
                return {
                    applies: true,
                    confidence,
                    evidence: `Consistency index: ${agg.consistency_index.toFixed(1)} across ${agg.session_count} sessions. Variance above field median.`
                };
            }
            return null;
        }
    },
    {
        key: TRAIT_KEYS.LOW_VARIANCE,
        label: 'Low Lap Time Variance',
        category: 'consistency',
        evaluate: (agg) => {
            if (agg.consistency_index === null || agg.session_count < MINIMUM_SESSIONS) return null;
            if (agg.consistency_index > 90) {
                const confidence = Math.min(0.95, (agg.consistency_index - 90) / 10 + 0.7);
                return {
                    applies: true,
                    confidence,
                    evidence: `Consistency index: ${agg.consistency_index.toFixed(1)}. Lap-to-lap variance below field median.`
                };
            }
            return null;
        }
    },

    // Risk profile characteristics
    {
        key: TRAIT_KEYS.CONSERVATIVE_RISK,
        label: 'Low Incident Rate',
        category: 'risk',
        evaluate: (agg) => {
            if (agg.risk_index === null || agg.session_count < MINIMUM_SESSIONS) return null;
            if (agg.risk_index < 30) {
                const confidence = Math.min(0.9, (30 - agg.risk_index) / 30 + 0.6);
                return {
                    applies: true,
                    confidence,
                    evidence: `Risk index: ${agg.risk_index.toFixed(1)}. Incident rate below field average.`
                };
            }
            return null;
        }
    },
    {
        key: TRAIT_KEYS.AGGRESSIVE_RISK,
        label: 'Elevated Incident Rate',
        category: 'risk',
        evaluate: (agg) => {
            if (agg.risk_index === null || agg.session_count < MINIMUM_SESSIONS) return null;
            if (agg.risk_index > 70) {
                const confidence = Math.min(0.9, (agg.risk_index - 70) / 30 + 0.6);
                return {
                    applies: true,
                    confidence,
                    evidence: `Risk index: ${agg.risk_index.toFixed(1)}. Incident rate above field average.`
                };
            }
            return null;
        }
    },

    // Stint performance characteristics
    {
        key: TRAIT_KEYS.STRONG_LONG_RUN,
        label: 'Minimal Stint Degradation',
        category: 'endurance',
        evaluate: (agg) => {
            if (agg.endurance_fitness_index === null || agg.session_count < MINIMUM_SESSIONS) return null;
            if (agg.endurance_fitness_index > 85) {
                const confidence = Math.min(0.9, (agg.endurance_fitness_index - 85) / 15 + 0.7);
                return {
                    applies: true,
                    confidence,
                    evidence: `Endurance index: ${agg.endurance_fitness_index.toFixed(1)}. Pace delta between early and late stint below threshold.`
                };
            }
            return null;
        }
    },
    {
        key: TRAIT_KEYS.WEAK_LONG_RUN,
        label: 'Elevated Stint Degradation',
        category: 'endurance',
        evaluate: (agg) => {
            if (agg.endurance_fitness_index === null || agg.session_count < MINIMUM_SESSIONS) return null;
            if (agg.endurance_fitness_index < 60) {
                const confidence = Math.min(0.85, (60 - agg.endurance_fitness_index) / 40 + 0.5);
                return {
                    applies: true,
                    confidence,
                    evidence: `Endurance index: ${agg.endurance_fitness_index.toFixed(1)}. Pace delta between early and late stint above threshold.`
                };
            }
            return null;
        }
    },

    // Race start characteristics
    {
        key: TRAIT_KEYS.FAST_STARTER,
        label: 'Positive Opening Lap Delta',
        category: 'racecraft',
        evaluate: (agg) => {
            if (agg.start_performance_index === null || agg.session_count < MINIMUM_SESSIONS) return null;
            if (agg.start_performance_index > 0.5) {
                const confidence = Math.min(0.85, agg.start_performance_index + 0.35);
                return {
                    applies: true,
                    confidence,
                    evidence: `Start performance index: ${agg.start_performance_index.toFixed(2)}. Average position delta Lap 1: +${agg.avg_positions_gained?.toFixed(1)}.`
                };
            }
            return null;
        }
    },
    {
        key: TRAIT_KEYS.SLOW_STARTER,
        label: 'Negative Opening Lap Delta',
        category: 'racecraft',
        evaluate: (agg) => {
            if (agg.start_performance_index === null || agg.session_count < MINIMUM_SESSIONS) return null;
            if (agg.start_performance_index < -0.5) {
                const confidence = Math.min(0.85, Math.abs(agg.start_performance_index) + 0.35);
                return {
                    applies: true,
                    confidence,
                    evidence: `Start performance index: ${agg.start_performance_index.toFixed(2)}. Average position delta Lap 1: ${agg.avg_positions_gained?.toFixed(1)}.`
                };
            }
            return null;
        }
    },
];

// ========================
// Main Derivation Function
// ========================

export async function deriveDriverTraits(driverProfileId: string): Promise<void> {
    console.log(`[Traits] Deriving traits for driver ${driverProfileId}`);

    // Get global all-time aggregate
    const aggregate = await getGlobalAggregate(driverProfileId, 'all_time');
    if (!aggregate) {
        console.log(`[Traits] No aggregates found for driver ${driverProfileId}`);
        return;
    }

    if (aggregate.session_count < MINIMUM_SESSIONS) {
        console.log(`[Traits] Insufficient sessions (${aggregate.session_count}) for trait derivation`);
        return;
    }

    // Expire all current traits before recalculating
    await expireAllTraits(driverProfileId);

    const aggData: AggregateData = {
        session_count: aggregate.session_count,
        consistency_index: aggregate.consistency_index,
        risk_index: aggregate.risk_index,
        avg_std_dev_ms: aggregate.avg_std_dev_ms,
        avg_positions_gained: aggregate.avg_positions_gained,
        start_performance_index: aggregate.start_performance_index,
        endurance_fitness_index: aggregate.endurance_fitness_index,
        avg_pace_percentile: aggregate.avg_pace_percentile,
        pace_trend: aggregate.pace_trend,
    };

    // Evaluate each rule
    const derivedTraits: CreateDriverTraitDTO[] = [];

    for (const rule of TRAIT_RULES) {
        const result = rule.evaluate(aggData);
        if (result && result.applies) {
            derivedTraits.push({
                driver_profile_id: driverProfileId,
                trait_key: rule.key,
                trait_label: rule.label,
                trait_category: rule.category,
                confidence: result.confidence,
                evidence_summary: result.evidence,
            });
        }
    }

    // Persist derived traits
    for (const trait of derivedTraits) {
        await upsertDriverTrait(trait);
        console.log(`[Traits] Derived: ${trait.trait_label} (${(trait.confidence * 100).toFixed(0)}%)`);
    }

    console.log(`[Traits] Derived ${derivedTraits.length} traits for driver ${driverProfileId}`);
}

// ========================
// Batch Processing
// ========================

export async function deriveTraitsForAllDrivers(): Promise<void> {
    // Get all driver profiles with sufficient data
    const { pool: dbPool } = await import('../../../db/client.js');
    const result = await dbPool.query<{ id: string }>(
        `SELECT DISTINCT driver_profile_id as id FROM session_metrics 
     GROUP BY driver_profile_id 
     HAVING COUNT(*) >= $1`,
        [MINIMUM_SESSIONS]
    );

    console.log(`[Traits] Processing ${result.rows.length} drivers for trait derivation`);

    for (const row of result.rows) {
        try {
            await deriveDriverTraits(row.id);
        } catch (error) {
            console.error(`[Traits] Failed to derive traits for ${row.id}:`, error);
        }
    }
}
