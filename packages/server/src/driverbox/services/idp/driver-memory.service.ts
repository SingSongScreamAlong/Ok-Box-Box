/**
 * Driver Memory Service
 * Analyzes session data to build and update driver memory, behaviors, opinions, and identity
 */

import {
    getDriverMemory,
    updateDriverMemory,
    incrementMemoryStats,
    createSessionBehavior,
    getRecentBehaviorsForAggregation,
    createEngineerOpinion,
    getActiveOpinions,
    supersededOpinion,
    getDriverIdentity,
    updateDriverIdentity,
    logMemoryEvent,
    DriverMemory,
    DriverSessionBehavior,
    EngineerOpinion,
    DriverIdentity,
} from '../../../db/repositories/driver-memory.repo.js';
import { getMetricsForDriver } from '../../../db/repositories/session-metrics.repo.js';
import { getGlobalAggregate } from '../../../db/repositories/driver-aggregates.repo.js';
import { pool } from '../../../db/client.js';

// ========================
// Types
// ========================

interface SessionAnalysisInput {
    sessionId: string;
    driverProfileId: string;
    sessionType: 'practice' | 'qualifying' | 'race';
    trackName: string;
    carName: string;
    laps: number;
    incidents: number;
    startPosition?: number;
    finishPosition?: number;
    bestLapTime?: number;
    avgLapTime?: number;
    lapTimeVariance?: number;
    positionsGained?: number;
    overtakesAttempted?: number;
    overtakesCompleted?: number;
}

// ========================
// Session Behavior Analysis
// ========================

export async function analyzeSessionBehavior(input: SessionAnalysisInput): Promise<DriverSessionBehavior> {
    const {
        sessionId,
        driverProfileId,
        sessionType,
        trackName,
        carName,
        laps,
        incidents,
        startPosition,
        finishPosition,
        lapTimeVariance,
        positionsGained,
        overtakesAttempted,
        overtakesCompleted,
    } = input;

    // Calculate incidents per lap (normalized safety score)
    const incidentsPerLap = laps > 0 ? incidents / laps : 0;
    
    // Safety/consistency score: 1.0 = perfect, lower = more incidents
    // 0 incidents = 1.0, 1 incident per 10 laps = 0.9, etc.
    const safetyScore = Math.max(0, Math.min(1, 1 - (incidentsPerLap * 10)));
    
    // Use safety score as proxy for brake/throttle consistency (clean driving = good control)
    const brakeConsistencyScore = safetyScore;
    const throttleApplicationScore = safetyScore;

    // Determine race performance trend based on positions gained/lost
    let lapTimeVarianceTrend: 'improving' | 'degrading' | 'stable' | 'erratic' | null = null;
    if (positionsGained !== undefined) {
        if (positionsGained > 3) lapTimeVarianceTrend = 'improving';
        else if (positionsGained > 0) lapTimeVarianceTrend = 'stable';
        else if (positionsGained > -3) lapTimeVarianceTrend = 'stable';
        else lapTimeVarianceTrend = 'degrading';
    } else if (lapTimeVariance !== undefined) {
        if (lapTimeVariance < 0.5) lapTimeVarianceTrend = 'stable';
        else if (lapTimeVariance < 1.5) lapTimeVarianceTrend = 'improving';
        else if (lapTimeVariance < 3) lapTimeVarianceTrend = 'degrading';
        else lapTimeVarianceTrend = 'erratic';
    }

    // Incident clustering: multiple incidents in a single race suggests tilt/frustration
    const incidentClustering = incidents >= 4;

    // Positions lost to mistakes
    const positionsLostToMistakes = incidents > 0 && positionsGained !== undefined && positionsGained < 0
        ? Math.min(Math.abs(positionsGained), incidents * 2) // Cap at 2 positions per incident
        : 0;

    // Confidence estimation based on race performance
    let estimatedConfidence = 0.5;
    
    // Clean racing boosts confidence
    if (incidents === 0) estimatedConfidence += 0.25;
    else if (incidents <= 2) estimatedConfidence += 0.1;
    else if (incidents >= 4) estimatedConfidence -= 0.15;
    
    // Gaining positions boosts confidence
    if (positionsGained !== undefined) {
        if (positionsGained >= 5) estimatedConfidence += 0.2;
        else if (positionsGained > 0) estimatedConfidence += 0.1;
        else if (positionsGained < -5) estimatedConfidence -= 0.15;
    }
    
    // Good finish position boosts confidence
    if (finishPosition !== undefined) {
        if (finishPosition === 1) estimatedConfidence += 0.2;
        else if (finishPosition <= 3) estimatedConfidence += 0.15;
        else if (finishPosition <= 5) estimatedConfidence += 0.1;
        else if (finishPosition <= 10) estimatedConfidence += 0.05;
    }
    
    estimatedConfidence = Math.max(0.1, Math.min(1, estimatedConfidence));

    // Confidence trajectory based on overall session quality
    let confidenceTrajectory: 'rising' | 'falling' | 'stable' = 'stable';
    const sessionQuality = (incidents === 0 ? 1 : 0) + (positionsGained && positionsGained > 0 ? 1 : 0) + (finishPosition && finishPosition <= 5 ? 1 : 0);
    if (sessionQuality >= 2) confidenceTrajectory = 'rising';
    else if (incidents >= 4 || (positionsGained && positionsGained < -5)) confidenceTrajectory = 'falling';

    const behavior = await createSessionBehavior({
        session_id: sessionId,
        driver_profile_id: driverProfileId,
        session_type: sessionType,
        track_name: trackName,
        car_name: carName,
        avg_brake_point_delta_m: null, // Would need telemetry data
        brake_consistency_score: brakeConsistencyScore,
        throttle_application_score: throttleApplicationScore,
        corner_entry_aggression: null, // Would need telemetry data
        corner_exit_quality: null, // Would need telemetry data
        lap_time_variance_trend: lapTimeVarianceTrend,
        incident_clustering: incidentClustering,
        post_incident_pace_delta: null, // Would need lap-by-lap data
        late_session_pace_delta: null, // Would need lap-by-lap data
        overtakes_attempted: overtakesAttempted ?? null,
        overtakes_completed: overtakesCompleted ?? null,
        positions_lost_to_mistakes: positionsLostToMistakes,
        defensive_incidents: null,
        estimated_confidence: estimatedConfidence,
        confidence_trajectory: confidenceTrajectory,
    });

    // Update memory stats (but don't aggregate here - do it in batch at the end)
    await incrementMemoryStats(driverProfileId, 1, laps);

    return behavior;
}

// ========================
// Memory Aggregation
// ========================

export async function aggregateMemoryFromBehaviors(driverProfileId: string): Promise<DriverMemory | null> {
    const behaviors = await getRecentBehaviorsForAggregation(driverProfileId, 20);
    
    console.log(`[DriverMemory] Aggregating: found ${behaviors.length} behaviors for driver ${driverProfileId}`);
    
    if (behaviors.length < 3) {
        console.log(`[DriverMemory] Not enough behaviors to aggregate (need 3, have ${behaviors.length})`);
        return getDriverMemory(driverProfileId);
    }

    const memory = await getDriverMemory(driverProfileId);
    if (!memory) {
        console.log(`[DriverMemory] No memory record found for driver ${driverProfileId}`);
        return null;
    }

    // Calculate aggregated values
    const brakeScores = behaviors.filter(b => b.brake_consistency_score !== null).map(b => b.brake_consistency_score!);
    const throttleScores = behaviors.filter(b => b.throttle_application_score !== null).map(b => b.throttle_application_score!);
    
    console.log(`[DriverMemory] Found ${brakeScores.length} brake scores, ${throttleScores.length} throttle scores`);
    const confidenceScores = behaviors.filter(b => b.estimated_confidence !== null).map(b => b.estimated_confidence!);

    const avgBrakeConsistency = brakeScores.length > 0 
        ? brakeScores.reduce((a, b) => a + b, 0) / brakeScores.length 
        : null;
    const avgThrottleScore = throttleScores.length > 0 
        ? throttleScores.reduce((a, b) => a + b, 0) / throttleScores.length 
        : null;
    const avgConfidence = confidenceScores.length > 0 
        ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length 
        : 0.5;

    // Determine braking style from consistency
    let brakingStyle: 'early' | 'late' | 'trail' | 'threshold' | 'unknown' = 'unknown';
    if (avgBrakeConsistency !== null) {
        if (avgBrakeConsistency > 0.8) brakingStyle = 'threshold';
        else if (avgBrakeConsistency > 0.6) brakingStyle = 'trail';
        else brakingStyle = 'unknown';
    }

    // Determine throttle style
    let throttleStyle: 'aggressive' | 'smooth' | 'hesitant' | 'unknown' = 'unknown';
    if (avgThrottleScore !== null) {
        if (avgThrottleScore > 0.8) throttleStyle = 'smooth';
        else if (avgThrottleScore > 0.6) throttleStyle = 'aggressive';
        else if (avgThrottleScore > 0.4) throttleStyle = 'hesitant';
    }

    // Incident proneness
    const incidentClusteringCount = behaviors.filter(b => b.incident_clustering).length;
    const incidentProneness = 1 - (incidentClusteringCount / behaviors.length);

    // Corner entry style - derived from safety vs aggression balance
    let cornerEntryStyle: 'aggressive' | 'conservative' | 'variable' | null = null;
    if (avgBrakeConsistency !== null && avgThrottleScore !== null) {
        const avgScore = (avgBrakeConsistency + avgThrottleScore) / 2;
        if (avgScore > 0.75) cornerEntryStyle = 'conservative'; // Clean = conservative
        else if (avgScore > 0.5) cornerEntryStyle = 'variable';
        else cornerEntryStyle = 'aggressive'; // More incidents = aggressive entry
    }

    // Overtaking style - derived from positions gained patterns
    const positionsLost = behaviors.filter(b => (b.positions_lost_to_mistakes || 0) > 0).length;
    const positionsLostRatio = positionsLost / behaviors.length;
    let overtakingStyle: 'aggressive' | 'patient' | 'opportunistic' | null = null;
    if (incidentProneness > 0.8 && positionsLostRatio < 0.2) {
        overtakingStyle = 'patient'; // Clean racing, few positions lost
    } else if (incidentProneness < 0.5) {
        overtakingStyle = 'aggressive'; // High incidents = aggressive moves
    } else {
        overtakingStyle = 'opportunistic'; // Middle ground
    }

    // Confidence trend
    const recentConfidences = confidenceScores.slice(0, 5);
    const olderConfidences = confidenceScores.slice(5, 10);
    let confidenceTrend: 'rising' | 'falling' | 'stable' | 'volatile' = 'stable';
    if (recentConfidences.length > 0 && olderConfidences.length > 0) {
        const recentAvg = recentConfidences.reduce((a, b) => a + b, 0) / recentConfidences.length;
        const olderAvg = olderConfidences.reduce((a, b) => a + b, 0) / olderConfidences.length;
        const diff = recentAvg - olderAvg;
        if (diff > 0.1) confidenceTrend = 'rising';
        else if (diff < -0.1) confidenceTrend = 'falling';
    }

    // Memory confidence based on data volume
    const memoryConfidence = Math.min(1, behaviors.length / 20);

    const updates: Partial<DriverMemory> = {
        braking_style: brakingStyle,
        braking_consistency: avgBrakeConsistency,
        throttle_style: throttleStyle,
        traction_management: avgThrottleScore,
        corner_entry_style: cornerEntryStyle,
        overtaking_style: overtakingStyle,
        incident_proneness: incidentProneness,
        current_confidence: avgConfidence,
        confidence_trend: confidenceTrend,
        memory_confidence: memoryConfidence,
    };

    // Log memory events for significant changes
    if (memory.braking_style !== brakingStyle && brakingStyle !== 'unknown') {
        await logMemoryEvent({
            driver_profile_id: driverProfileId,
            event_type: 'tendency_update',
            memory_field: 'braking_style',
            previous_value: memory.braking_style,
            new_value: brakingStyle,
            evidence_type: 'session_analysis',
            evidence_session_id: null,
            evidence_summary: `Braking style updated based on ${behaviors.length} recent sessions`,
            learning_confidence: memoryConfidence,
        });
    }

    console.log(`[DriverMemory] Updating memory with:`, {
        braking_style: brakingStyle,
        braking_consistency: avgBrakeConsistency,
        throttle_style: throttleStyle,
        traction_management: avgThrottleScore,
        corner_entry_style: cornerEntryStyle,
        overtaking_style: overtakingStyle,
        incident_proneness: incidentProneness,
        current_confidence: avgConfidence,
    });
    
    const result = await updateDriverMemory(driverProfileId, updates);
    console.log(`[DriverMemory] Memory updated successfully`);
    return result;
}

// ========================
// Engineer Opinion Generation
// ========================

export async function generateEngineerOpinions(driverProfileId: string): Promise<EngineerOpinion[]> {
    const memory = await getDriverMemory(driverProfileId);
    const behaviors = await getRecentBehaviorsForAggregation(driverProfileId, 10);

    if (!memory || behaviors.length < 3) {
        return [];
    }

    const existingOpinions = await getActiveOpinions(driverProfileId);
    const newOpinions: EngineerOpinion[] = [];

    // Generate opinions based on patterns

    // 1. Consistency opinion
    if (memory.braking_consistency !== null) {
        const consistencyOpinion = existingOpinions.find(o => o.opinion_domain === 'consistency');
        
        let sentiment: 'positive' | 'neutral' | 'concern' | 'critical' = 'neutral';
        let summary = '';
        let action = '';
        
        if (memory.braking_consistency > 0.8) {
            sentiment = 'positive';
            summary = 'Your consistency is excellent. Lap times are predictable and reliable.';
            action = 'Maintain this consistency while gradually pushing for pace.';
        } else if (memory.braking_consistency > 0.6) {
            sentiment = 'neutral';
            summary = 'Your consistency is good but has room for improvement.';
            action = 'Focus on hitting the same braking points every lap.';
        } else {
            sentiment = 'concern';
            summary = 'Lap time consistency needs work. Large variations between laps.';
            action = 'Slow down slightly and focus on repeatable inputs before pushing.';
        }

        if (consistencyOpinion) {
            await supersededOpinion(consistencyOpinion.id, '');
        }

        const opinion = await createEngineerOpinion({
            driver_profile_id: driverProfileId,
            opinion_domain: 'consistency',
            opinion_context: null,
            opinion_summary: summary,
            opinion_detail: null,
            opinion_confidence: memory.memory_confidence,
            opinion_sentiment: sentiment,
            is_actionable: true,
            suggested_action: action,
            priority: sentiment === 'concern' ? 8 : sentiment === 'positive' ? 4 : 6,
            valid_until: null,
            superseded_by: null,
            evidence_sessions: behaviors.slice(0, 5).map(b => b.session_id).filter(Boolean) as string[],
            evidence_summary: `Based on ${behaviors.length} recent sessions`,
        });
        newOpinions.push(opinion);
    }

    // 2. Incident/Safety opinion
    if (memory.incident_proneness !== null) {
        const safetyOpinion = existingOpinions.find(o => o.opinion_domain === 'racecraft');
        
        let sentiment: 'positive' | 'neutral' | 'concern' | 'critical' = 'neutral';
        let summary = '';
        let action = '';
        
        if (memory.incident_proneness > 0.9) {
            sentiment = 'positive';
            summary = 'Excellent racecraft. You race clean and avoid incidents consistently.';
            action = 'Keep racing smart. Your clean driving is a major strength.';
        } else if (memory.incident_proneness > 0.7) {
            sentiment = 'neutral';
            summary = 'Generally clean racing with occasional incidents.';
            action = 'Stay aware of cars around you, especially in traffic.';
        } else if (memory.incident_proneness > 0.5) {
            sentiment = 'concern';
            summary = 'Incident rate is higher than ideal. Pattern of contact in races.';
            action = 'Give more space when racing side-by-side. Patience pays off.';
        } else {
            sentiment = 'critical';
            summary = 'High incident rate is hurting your results and iRating.';
            action = 'Focus on finishing races cleanly before worrying about position.';
        }

        if (safetyOpinion) {
            await supersededOpinion(safetyOpinion.id, '');
        }

        const opinion = await createEngineerOpinion({
            driver_profile_id: driverProfileId,
            opinion_domain: 'racecraft',
            opinion_context: null,
            opinion_summary: summary,
            opinion_detail: null,
            opinion_confidence: memory.memory_confidence,
            opinion_sentiment: sentiment,
            is_actionable: true,
            suggested_action: action,
            priority: sentiment === 'critical' ? 10 : sentiment === 'concern' ? 8 : 5,
            valid_until: null,
            superseded_by: null,
            evidence_sessions: behaviors.slice(0, 5).map(b => b.session_id).filter(Boolean) as string[],
            evidence_summary: `Based on ${behaviors.length} recent sessions`,
        });
        newOpinions.push(opinion);
    }

    // 3. Mental/Confidence opinion
    if (memory.current_confidence !== null) {
        const mentalOpinion = existingOpinions.find(o => o.opinion_domain === 'mental');
        
        let sentiment: 'positive' | 'neutral' | 'concern' | 'critical' = 'neutral';
        let summary = '';
        let action = '';
        
        if (memory.confidence_trend === 'rising') {
            sentiment = 'positive';
            summary = 'Your confidence is building. Recent sessions show improvement.';
            action = 'Keep the momentum going. Trust your instincts.';
        } else if (memory.confidence_trend === 'falling') {
            sentiment = 'concern';
            summary = 'Confidence appears to be dropping based on recent results.';
            action = 'Take a step back if needed. Run some practice sessions to rebuild.';
        } else if (memory.current_confidence > 0.7) {
            sentiment = 'positive';
            summary = 'You are racing with confidence. Results reflect your preparation.';
            action = 'Stay focused and trust your abilities.';
        } else if (memory.current_confidence < 0.4) {
            sentiment = 'concern';
            summary = 'You may be second-guessing yourself out there.';
            action = 'Focus on process, not results. Small wins build confidence.';
        }

        if (mentalOpinion) {
            await supersededOpinion(mentalOpinion.id, '');
        }

        if (summary) {
            const opinion = await createEngineerOpinion({
                driver_profile_id: driverProfileId,
                opinion_domain: 'mental',
                opinion_context: null,
                opinion_summary: summary,
                opinion_detail: null,
                opinion_confidence: memory.memory_confidence,
                opinion_sentiment: sentiment,
                is_actionable: true,
                suggested_action: action,
                priority: sentiment === 'concern' ? 7 : 4,
                valid_until: null,
                superseded_by: null,
                evidence_sessions: behaviors.slice(0, 5).map(b => b.session_id).filter(Boolean) as string[],
                evidence_summary: `Based on ${behaviors.length} recent sessions`,
            });
            newOpinions.push(opinion);
        }
    }

    return newOpinions;
}

// ========================
// Driver Identity Updates
// ========================

export async function updateDriverIdentityFromData(driverProfileId: string): Promise<DriverIdentity | null> {
    const memory = await getDriverMemory(driverProfileId);
    const aggregate = await getGlobalAggregate(driverProfileId, 'all_time') as any;
    const behaviors = await getRecentBehaviorsForAggregation(driverProfileId, 20);

    if (!memory || behaviors.length < 5) {
        return getDriverIdentity(driverProfileId);
    }

    // Determine archetype
    let archetype: 'calculated_racer' | 'aggressive_hunter' | 'consistent_grinder' | 'raw_talent' | 'developing' = 'developing';
    let archetypeConfidence = 0.3;
    let archetypeEvidence = 'Not enough data to determine archetype';

    if (memory.memory_confidence > 0.5) {
        if (memory.incident_proneness && memory.incident_proneness > 0.85 && memory.braking_consistency && memory.braking_consistency > 0.7) {
            archetype = 'calculated_racer';
            archetypeConfidence = memory.memory_confidence;
            archetypeEvidence = 'High consistency and clean racing indicate a calculated approach';
        } else if (memory.overtaking_style === 'aggressive' || memory.corner_entry_style === 'aggressive') {
            archetype = 'aggressive_hunter';
            archetypeConfidence = memory.memory_confidence * 0.8;
            archetypeEvidence = 'Aggressive overtaking and corner entry patterns';
        } else if (memory.braking_consistency && memory.braking_consistency > 0.75) {
            archetype = 'consistent_grinder';
            archetypeConfidence = memory.memory_confidence;
            archetypeEvidence = 'Highly consistent lap times and steady improvement';
        } else if (aggregate && aggregate.session_count > 0 && memory.sessions_analyzed < 30) {
            archetype = 'raw_talent';
            archetypeConfidence = 0.6;
            archetypeEvidence = 'Early results suggest natural ability';
        }
    }

    // Determine skill trajectory
    let skillTrajectory: 'ascending' | 'plateaued' | 'breaking_through' | 'declining' | 'developing' = 'developing';
    let trajectoryEvidence = '';

    if (memory.confidence_trend === 'rising' && memory.memory_confidence > 0.5) {
        skillTrajectory = 'ascending';
        trajectoryEvidence = 'Confidence and results trending upward';
    } else if (memory.confidence_trend === 'falling') {
        skillTrajectory = 'declining';
        trajectoryEvidence = 'Recent results show a downward trend';
    } else if (memory.sessions_analyzed > 50 && memory.braking_consistency && memory.braking_consistency > 0.7) {
        skillTrajectory = 'plateaued';
        trajectoryEvidence = 'Consistent performance over many sessions';
    }

    // Readiness signals
    const readyForLongerRaces = memory.sessions_analyzed > 20 && 
        (memory.late_race_degradation === null || memory.late_race_degradation < 0.3);
    const readyForHigherSplits = aggregate && aggregate.avg_positions_gained && aggregate.avg_positions_gained > 0 &&
        memory.incident_proneness !== null && memory.incident_proneness > 0.7;
    const readyForNewDiscipline = memory.sessions_analyzed > 30;

    // Narrative elements
    let currentChapter = 'Building your foundation';
    let nextMilestone = 'Complete 10 clean races';

    if (memory.sessions_analyzed > 50) {
        currentChapter = 'Refining your craft';
        nextMilestone = 'Consistent top-5 finishes';
    }
    if (aggregate && aggregate.session_count > 30 && aggregate.avg_positions_gained && aggregate.avg_positions_gained > 2) {
        currentChapter = 'Competing for wins';
        nextMilestone = 'Championship contention';
    }

    return updateDriverIdentity(driverProfileId, {
        driver_archetype: archetype,
        archetype_confidence: archetypeConfidence,
        archetype_evidence: archetypeEvidence,
        skill_trajectory: skillTrajectory,
        trajectory_since: new Date(),
        trajectory_evidence: trajectoryEvidence,
        ready_for_longer_races: readyForLongerRaces,
        ready_for_higher_splits: readyForHigherSplits,
        ready_for_new_discipline: readyForNewDiscipline,
        current_chapter: currentChapter,
        next_milestone: nextMilestone,
    });
}

// ========================
// Full Pipeline
// ========================

export async function runMemoryPipeline(
    driverProfileId: string,
    sessionInput?: SessionAnalysisInput
): Promise<{
    behavior: DriverSessionBehavior | null;
    memory: DriverMemory | null;
    opinions: EngineerOpinion[];
    identity: DriverIdentity | null;
}> {
    let behavior: DriverSessionBehavior | null = null;

    // 1. Analyze session if provided
    if (sessionInput) {
        behavior = await analyzeSessionBehavior(sessionInput);
    }

    // 2. Aggregate memory from behaviors
    const memory = await aggregateMemoryFromBehaviors(driverProfileId);

    // 3. Generate engineer opinions
    const opinions = await generateEngineerOpinions(driverProfileId);

    // 4. Update driver identity
    const identity = await updateDriverIdentityFromData(driverProfileId);

    return { behavior, memory, opinions, identity };
}

// ========================
// Backfill from iRacing Race Results
// ========================

export async function backfillFromIRacingResults(userId: string, driverProfileId: string): Promise<number> {
    // Fetch ALL race results from iracing_race_results table (no limit)
    const result = await pool.query(
        `SELECT * FROM iracing_race_results 
         WHERE admin_user_id = $1 
         ORDER BY session_start_time ASC NULLS LAST`,
        [userId]
    );
    
    const races = result.rows;
    console.log(`[DriverMemory] Processing ${races.length} iRacing race results for driver ${driverProfileId}`);
    
    // Debug: log first race to see actual field values
    if (races.length > 0) {
        const sample = races[0];
        console.log(`[DriverMemory] Sample race data: subsession_id=${sample.subsession_id}, finish_position=${sample.finish_position}, laps_complete=${sample.laps_complete}, track=${sample.track_name}`);
    }
    
    let processed = 0;
    let skipped = 0;
    for (const race of races) {
        try {
            // Process all races - even if some fields are null, we can still learn from them
            const laps = race.laps_complete || race.laps_lead || 0;
            const incidents = race.incidents ?? 0;
            const startPos = race.start_position;
            const finishPos = race.finish_position;
            
            // Only skip if we have literally no useful data
            if (!race.subsession_id) {
                skipped++;
                continue;
            }
            
            // Generate a deterministic UUID from subsession_id for deduplication
            // Using a simple hash-based approach: pad subsession_id to create valid UUID format
            const subsessionStr = String(race.subsession_id).padStart(12, '0');
            const sessionUuid = `00000000-0000-4000-8000-${subsessionStr}`;
            
            await analyzeSessionBehavior({
                sessionId: sessionUuid,
                driverProfileId,
                sessionType: (race.event_type === 'practice' || race.event_type === 'qualifying') ? race.event_type : 'race',
                trackName: race.track_name || 'Unknown',
                carName: race.car_name || 'Unknown',
                laps,
                incidents,
                startPosition: startPos ?? undefined,
                finishPosition: finishPos ?? undefined,
                positionsGained: startPos != null && finishPos != null 
                    ? startPos - finishPos 
                    : undefined,
            });
            processed++;
        } catch (error) {
            console.error(`[DriverMemory] Error processing race ${race.subsession_id}:`, error);
        }
    }
    
    console.log(`[DriverMemory] Skipped ${skipped} races with no subsession_id`);
    
    // Aggregate memory, generate opinions, and update identity after ALL races are processed
    if (processed > 0) {
        try {
            console.log(`[DriverMemory] Aggregating memory from ${processed} sessions...`);
            await aggregateMemoryFromBehaviors(driverProfileId);
        } catch (aggregateError) {
            console.error(`[DriverMemory] Error aggregating memory:`, aggregateError);
        }
        
        try {
            await generateEngineerOpinions(driverProfileId);
        } catch (opinionError) {
            console.error(`[DriverMemory] Error generating opinions:`, opinionError);
        }
        
        try {
            await updateDriverIdentityFromData(driverProfileId);
        } catch (identityError) {
            console.error(`[DriverMemory] Error updating identity:`, identityError);
        }
    }
    
    console.log(`[DriverMemory] Processed ${processed}/${races.length} iRacing races into IDP memory`);
    return processed;
}

// ========================
// Backfill Existing Sessions
// ========================

export async function backfillMemoryFromHistory(driverProfileId: string): Promise<number> {
    const metrics = await getMetricsForDriver(driverProfileId, 100, 0);
    
    let processed = 0;
    for (const metric of metrics) {
        try {
            await analyzeSessionBehavior({
                sessionId: metric.session_id,
                driverProfileId,
                sessionType: 'race',
                trackName: 'Unknown',
                carName: 'Unknown',
                laps: metric.total_laps || 0,
                incidents: metric.incident_count || 0,
                startPosition: metric.start_position ?? undefined,
                finishPosition: metric.finish_position ?? undefined,
                bestLapTime: metric.best_lap_time_ms ? metric.best_lap_time_ms / 1000 : undefined,
                avgLapTime: metric.mean_lap_time_ms ? metric.mean_lap_time_ms / 1000 : undefined,
                lapTimeVariance: metric.lap_time_std_dev_ms ? metric.lap_time_std_dev_ms / 1000 : undefined,
                positionsGained: metric.positions_gained ?? undefined,
            });
            processed++;
        } catch (error) {
            console.error(`[DriverMemory] Error processing session ${metric.session_id}:`, error);
        }
    }

    // Generate opinions and update identity after backfill
    await generateEngineerOpinions(driverProfileId);
    await updateDriverIdentityFromData(driverProfileId);

    return processed;
}
