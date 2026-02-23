/**
 * Post-Session Learner
 *
 * After a session ends, takes the LiveSessionAnalyzer summary and writes
 * learned insights back to driver_memory and driver_session_behaviors.
 *
 * This is the "gets smarter over time" loop:
 *   1. LiveSessionAnalyzer accumulates intelligence during the race
 *   2. On session end, this module extracts behavioral observations
 *   3. Writes a DriverSessionBehavior record (per-session snapshot)
 *   4. Triggers memory aggregation (rolling update of driver tendencies)
 *   5. Updates session/lap counters
 *
 * The next time the driver starts a session, the crew-chat AI will have
 * updated memory fields reflecting what was learned.
 */

import {
    createSessionBehavior,
    incrementMemoryStats,
    updateDriverMemory,
    logMemoryEvent,
    getDriverMemory,
} from '../../db/repositories/driver-memory.repo.js';
import { aggregateMemoryFromBehaviors } from '../../driverbox/services/idp/driver-memory.service.js';
import type { PostSessionSummary } from './live-session-analyzer.js';

// Re-export for consumers that import from this module
export type { PostSessionSummary };

// Local alias for brevity
type SessionSummary = PostSessionSummary;

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

export async function updateDriverMemoryFromSession(
    driverProfileId: string,
    sessionId: string,
    summary: SessionSummary,
): Promise<void> {
    if (summary.totalLaps < 3) {
        console.log(`[PostSessionLearner] Skipping — only ${summary.totalLaps} laps (need 3+)`);
        return;
    }

    console.log(`[PostSessionLearner] Processing session ${sessionId} for driver ${driverProfileId}: ${summary.totalLaps} laps, ${summary.sessionMinutes} min`);

    // 1. Write session behavior record
    await writeSessionBehavior(driverProfileId, sessionId, summary);

    // 2. Update direct memory fields from this session
    await updateDirectMemoryFields(driverProfileId, sessionId, summary);

    // 3. Increment counters
    await incrementMemoryStats(driverProfileId, 1, summary.totalLaps);

    // 4. Re-aggregate memory from all recent behaviors
    try {
        await aggregateMemoryFromBehaviors(driverProfileId);
        console.log(`[PostSessionLearner] Memory aggregation complete for ${driverProfileId}`);
    } catch (err) {
        console.error(`[PostSessionLearner] Memory aggregation failed:`, err);
    }
}

// ============================================================================
// WRITE SESSION BEHAVIOR
// ============================================================================

async function writeSessionBehavior(
    driverProfileId: string,
    sessionId: string,
    summary: SessionSummary,
): Promise<void> {
    // Map pace trend to lap_time_variance_trend
    const varianceTrend = mapPaceTrend(summary.paceTrend);

    // Estimate confidence from consistency + incident rate + positions gained
    const estimatedConfidence = computeConfidence(summary);
    const confidenceTrajectory = mapConfidenceTrajectory(summary);

    // Compute late-session pace delta (we don't have per-lap data here,
    // but we can infer from pace trend)
    const lateSessionDelta = summary.paceTrend === 'degrading' ? 0.5
        : summary.paceTrend === 'improving' ? -0.3
        : 0;

    try {
        await createSessionBehavior({
            session_id: sessionId,
            driver_profile_id: driverProfileId,
            session_type: 'race', // LiveSessionAnalyzer is primarily for races
            track_name: null,     // Not available from summary — could be enriched
            car_name: null,

            // Behavioral observations
            avg_brake_point_delta_m: null, // Would need per-corner telemetry
            brake_consistency_score: summary.consistency / 100, // normalize to 0-1
            throttle_application_score: null, // Would need raw throttle data
            corner_entry_aggression: null,
            corner_exit_quality: null,

            // Mental state indicators
            lap_time_variance_trend: varianceTrend,
            incident_clustering: summary.incidentClustering,
            post_incident_pace_delta: null, // Could be enriched from analyzer
            late_session_pace_delta: lateSessionDelta,

            // Racecraft
            overtakes_attempted: null, // We have success rate but not raw count from summary
            overtakes_completed: null,
            positions_lost_to_mistakes: null,
            defensive_incidents: null,

            // Confidence
            estimated_confidence: estimatedConfidence,
            confidence_trajectory: confidenceTrajectory,
        });

        console.log(`[PostSessionLearner] Session behavior written for ${sessionId}`);
    } catch (err) {
        console.error(`[PostSessionLearner] Failed to write session behavior:`, err);
    }
}

// ============================================================================
// UPDATE DIRECT MEMORY FIELDS
// ============================================================================

async function updateDirectMemoryFields(
    driverProfileId: string,
    sessionId: string,
    summary: SessionSummary,
): Promise<void> {
    const memory = await getDriverMemory(driverProfileId);
    if (!memory) {
        console.log(`[PostSessionLearner] No driver_memory record for ${driverProfileId} — skipping direct updates`);
        return;
    }

    const updates: Record<string, any> = {};

    // Fatigue onset: if pace degraded and session was long, update fatigue lap estimate
    if (summary.mentalFatigue === 'fatigued' || summary.mentalFatigue === 'tilted') {
        // Estimate fatigue onset as ~70% through the session
        const fatigueOnsetLap = Math.round(summary.totalLaps * 0.7);
        if (!memory.fatigue_onset_lap || Math.abs(memory.fatigue_onset_lap - fatigueOnsetLap) > 5) {
            updates.fatigue_onset_lap = fatigueOnsetLap;
            await logMemoryEvent({
                driver_profile_id: driverProfileId,
                event_type: 'pattern_detected',
                memory_field: 'fatigue_onset_lap',
                previous_value: memory.fatigue_onset_lap?.toString() || null,
                new_value: fatigueOnsetLap.toString(),
                evidence_type: 'session_analysis',
                evidence_session_id: sessionId,
                evidence_summary: `Fatigue detected at ~lap ${fatigueOnsetLap} in ${summary.sessionMinutes}min session (${summary.mentalFatigue})`,
                learning_confidence: 0.6,
            });
        }
    }

    // Session length sweet spot: if they performed well, this is a good length
    if (summary.consistency > 70 && summary.incidentRate < 0.3 && summary.positionsGained >= 0) {
        updates.session_length_sweet_spot = summary.sessionMinutes;
    }

    // Late race degradation
    if (summary.paceTrend === 'degrading' && summary.totalLaps > 10) {
        const currentDeg = memory.late_race_degradation || 0;
        // Exponential moving average
        updates.late_race_degradation = Math.round((currentDeg * 0.7 + 0.7 * 0.3) * 1000) / 1000;
    } else if (summary.paceTrend === 'stable' || summary.paceTrend === 'improving') {
        const currentDeg = memory.late_race_degradation || 0;
        updates.late_race_degradation = Math.round((currentDeg * 0.7 + 0.2 * 0.3) * 1000) / 1000;
    }

    // Post-incident tilt risk
    if (summary.incidentClustering) {
        const currentTilt = memory.post_incident_tilt_risk || 0;
        updates.post_incident_tilt_risk = Math.min(1, Math.round((currentTilt * 0.6 + 0.8 * 0.4) * 1000) / 1000);

        if (!memory.post_incident_tilt_risk || updates.post_incident_tilt_risk - memory.post_incident_tilt_risk > 0.1) {
            await logMemoryEvent({
                driver_profile_id: driverProfileId,
                event_type: 'pattern_detected',
                memory_field: 'post_incident_tilt_risk',
                previous_value: memory.post_incident_tilt_risk?.toString() || null,
                new_value: updates.post_incident_tilt_risk.toString(),
                evidence_type: 'session_analysis',
                evidence_session_id: sessionId,
                evidence_summary: `Incident clustering detected — tilt risk increased`,
                learning_confidence: 0.7,
            });
        }
    } else if (summary.incidentRate < 0.2) {
        const currentTilt = memory.post_incident_tilt_risk || 0;
        updates.post_incident_tilt_risk = Math.max(0, Math.round((currentTilt * 0.8 + 0.1 * 0.2) * 1000) / 1000);
    }

    // Recovery speed: infer from pace after incidents
    if (summary.incidentRate > 0 && summary.paceTrend !== 'degrading') {
        updates.recovery_speed = 'fast';
    } else if (summary.incidentRate > 0 && summary.paceTrend === 'degrading') {
        updates.recovery_speed = 'slow';
    }

    // Incident proneness (EMA)
    const currentProneness = memory.incident_proneness || 0.5;
    const sessionSafety = Math.max(0, Math.min(1, 1 - summary.incidentRate));
    updates.incident_proneness = Math.round((currentProneness * 0.7 + sessionSafety * 0.3) * 1000) / 1000;

    // Current confidence
    const confidence = computeConfidence(summary);
    updates.current_confidence = Math.round(confidence * 1000) / 1000;

    // Apply updates
    if (Object.keys(updates).length > 0) {
        try {
            await updateDriverMemory(driverProfileId, updates);
            console.log(`[PostSessionLearner] Updated ${Object.keys(updates).length} memory fields for ${driverProfileId}`);
        } catch (err) {
            console.error(`[PostSessionLearner] Failed to update memory:`, err);
        }
    }
}

// ============================================================================
// HELPERS
// ============================================================================

function mapPaceTrend(trend: string): 'improving' | 'degrading' | 'stable' | 'erratic' {
    switch (trend) {
        case 'improving': return 'improving';
        case 'degrading': return 'degrading';
        case 'erratic': return 'erratic';
        default: return 'stable';
    }
}

function computeConfidence(summary: SessionSummary): number {
    let confidence = 0.5;

    // Good consistency boosts confidence
    if (summary.consistency > 80) confidence += 0.15;
    else if (summary.consistency > 60) confidence += 0.05;
    else confidence -= 0.1;

    // Gaining positions boosts confidence
    if (summary.positionsGained > 3) confidence += 0.15;
    else if (summary.positionsGained > 0) confidence += 0.05;
    else if (summary.positionsGained < -3) confidence -= 0.15;

    // Low incidents boost confidence
    if (summary.incidentRate < 0.1) confidence += 0.1;
    else if (summary.incidentRate > 0.5) confidence -= 0.15;

    // Incident clustering hurts confidence
    if (summary.incidentClustering) confidence -= 0.1;

    // Improving pace boosts confidence
    if (summary.paceTrend === 'improving') confidence += 0.05;
    else if (summary.paceTrend === 'degrading') confidence -= 0.05;

    return Math.max(0, Math.min(1, confidence));
}

function mapConfidenceTrajectory(summary: SessionSummary): 'rising' | 'falling' | 'stable' {
    const confidence = computeConfidence(summary);
    if (confidence > 0.65) return 'rising';
    if (confidence < 0.35) return 'falling';
    return 'stable';
}
