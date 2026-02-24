/**
 * Driver Memory Repository
 * CRUD operations for driver memory, session behaviors, engineer opinions, and identity
 */

import { pool } from '../client.js';

// ========================
// Types
// ========================

export interface DriverMemory {
    id: string;
    driver_profile_id: string;
    
    // Driving tendencies
    braking_style: 'early' | 'late' | 'trail' | 'threshold' | 'unknown';
    braking_consistency: number | null;
    brake_bias_preference: 'forward' | 'rear' | 'neutral' | null;
    throttle_style: 'aggressive' | 'smooth' | 'hesitant' | 'unknown';
    throttle_on_exit_tendency: 'early' | 'late' | 'optimal' | null;
    traction_management: number | null;
    corner_entry_style: 'aggressive' | 'conservative' | 'variable' | null;
    apex_hit_rate: number | null;
    corner_exit_quality: number | null;
    
    // Racecraft
    overtaking_style: 'opportunistic' | 'patient' | 'aggressive' | 'defensive' | null;
    defensive_awareness: number | null;
    traffic_comfort: number | null;
    incident_proneness: number | null;
    
    // Error patterns
    post_incident_tilt_risk: number | null;
    recovery_speed: 'fast' | 'moderate' | 'slow' | null;
    late_race_degradation: number | null;
    session_length_sweet_spot: number | null;
    fatigue_onset_lap: number | null;
    common_error_types: Array<{ type: string; frequency: number; context: string }>;
    high_risk_corners: Array<{ track: string; corner: string; incident_rate: number }>;
    
    // Strengths & weaknesses
    strength_track_types: string[];
    weakness_track_types: string[];
    strength_corner_types: string[];
    weakness_corner_types: string[];
    qualifying_vs_race_delta: number | null;
    practice_to_race_improvement: number | null;
    
    // Communication preferences
    preferred_feedback_style: 'brief' | 'detailed' | 'motivational' | 'blunt' | 'balanced';
    preferred_callout_frequency: 'minimal' | 'moderate' | 'frequent';
    responds_well_to_criticism: boolean;
    needs_confidence_building: boolean;
    prefers_data_vs_feeling: 'data' | 'feeling' | 'balanced';
    
    // Confidence
    baseline_confidence: number;
    confidence_volatility: number;
    current_confidence: number;
    confidence_trend: 'rising' | 'falling' | 'stable' | 'volatile';
    
    // Metadata
    sessions_analyzed: number;
    laps_analyzed: number;
    last_learning_update: Date | null;
    memory_confidence: number;
    created_at: Date;
    updated_at: Date;
}

export interface DriverSessionBehavior {
    id: string;
    session_id: string | null;
    driver_profile_id: string;
    session_type: 'practice' | 'qualifying' | 'race' | null;
    track_name: string | null;
    car_name: string | null;
    
    // Behavioral observations
    avg_brake_point_delta_m: number | null;
    brake_consistency_score: number | null;
    throttle_application_score: number | null;
    corner_entry_aggression: number | null;
    corner_exit_quality: number | null;
    
    // Mental state indicators
    lap_time_variance_trend: 'improving' | 'degrading' | 'stable' | 'erratic' | null;
    incident_clustering: boolean;
    post_incident_pace_delta: number | null;
    late_session_pace_delta: number | null;
    
    // Racecraft
    overtakes_attempted: number | null;
    overtakes_completed: number | null;
    positions_lost_to_mistakes: number | null;
    defensive_incidents: number | null;
    
    // Confidence
    estimated_confidence: number | null;
    confidence_trajectory: 'rising' | 'falling' | 'stable' | null;
    
    computed_at: Date;
}

export interface EngineerOpinion {
    id: string;
    driver_profile_id: string;
    opinion_domain: 'pace' | 'consistency' | 'racecraft' | 'mental' | 'technique' | 'development';
    opinion_context: string | null;
    opinion_summary: string;
    opinion_detail: string | null;
    opinion_confidence: number;
    opinion_sentiment: 'positive' | 'neutral' | 'concern' | 'critical';
    is_actionable: boolean;
    suggested_action: string | null;
    priority: number;
    valid_from: Date;
    valid_until: Date | null;
    superseded_by: string | null;
    evidence_sessions: string[];
    evidence_summary: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface DriverIdentity {
    id: string;
    driver_profile_id: string;
    driver_archetype: 'calculated_racer' | 'aggressive_hunter' | 'consistent_grinder' | 'raw_talent' | 'developing' | null;
    archetype_confidence: number | null;
    archetype_evidence: string | null;
    skill_trajectory: 'ascending' | 'plateaued' | 'breaking_through' | 'declining' | 'developing';
    trajectory_since: Date | null;
    trajectory_evidence: string | null;
    ready_for_longer_races: boolean;
    ready_for_higher_splits: boolean;
    ready_for_new_discipline: boolean;
    readiness_notes: string | null;
    current_development_focus: string | null;
    focus_set_at: Date | null;
    focus_progress: number;
    defining_moment: string | null;
    current_chapter: string | null;
    next_milestone: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface DriverMemoryEvent {
    id: string;
    driver_profile_id: string;
    event_type: 'tendency_update' | 'pattern_detected' | 'preference_inferred' | 'confidence_shift';
    memory_field: string;
    previous_value: string | null;
    new_value: string | null;
    evidence_type: 'session_analysis' | 'incident_review' | 'interaction_pattern' | 'explicit_feedback';
    evidence_session_id: string | null;
    evidence_summary: string;
    learning_confidence: number;
    created_at: Date;
}

// ========================
// Driver Memory Operations
// ========================

export async function getDriverMemory(driverProfileId: string): Promise<DriverMemory | null> {
    const result = await pool.query<DriverMemory>(
        'SELECT * FROM driver_memory WHERE driver_profile_id = $1',
        [driverProfileId]
    );
    return result.rows[0] || null;
}

export async function updateDriverMemory(
    driverProfileId: string,
    updates: Partial<Omit<DriverMemory, 'id' | 'driver_profile_id' | 'created_at' | 'updated_at'>>
): Promise<DriverMemory | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
            fields.push(`${key} = $${paramCount++}`);
            values.push(typeof value === 'object' && value !== null ? JSON.stringify(value) : value);
        }
    }

    if (fields.length === 0) {
        return getDriverMemory(driverProfileId);
    }

    fields.push(`updated_at = NOW()`);
    values.push(driverProfileId);

    const result = await pool.query<DriverMemory>(
        `UPDATE driver_memory SET ${fields.join(', ')} WHERE driver_profile_id = $${paramCount} RETURNING *`,
        values
    );
    return result.rows[0] || null;
}

export async function incrementMemoryStats(
    driverProfileId: string,
    sessions: number = 0,
    laps: number = 0
): Promise<void> {
    await pool.query(
        `UPDATE driver_memory SET
            sessions_analyzed = sessions_analyzed + $2,
            laps_analyzed = laps_analyzed + $3,
            last_learning_update = NOW(),
            updated_at = NOW()
         WHERE driver_profile_id = $1`,
        [driverProfileId, sessions, laps]
    );
}

// ========================
// Session Behavior Operations
// ========================

export async function createSessionBehavior(
    behavior: Omit<DriverSessionBehavior, 'id' | 'computed_at'>
): Promise<DriverSessionBehavior> {
    try {
        const result = await pool.query<DriverSessionBehavior>(
        `INSERT INTO driver_session_behaviors (
            session_id, driver_profile_id, session_type, track_name, car_name,
            avg_brake_point_delta_m, brake_consistency_score, throttle_application_score,
            corner_entry_aggression, corner_exit_quality, lap_time_variance_trend,
            incident_clustering, post_incident_pace_delta, late_session_pace_delta,
            overtakes_attempted, overtakes_completed, positions_lost_to_mistakes,
            defensive_incidents, estimated_confidence, confidence_trajectory
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        ON CONFLICT (session_id, driver_profile_id) DO UPDATE SET
            session_type = EXCLUDED.session_type,
            track_name = EXCLUDED.track_name,
            car_name = EXCLUDED.car_name,
            avg_brake_point_delta_m = EXCLUDED.avg_brake_point_delta_m,
            brake_consistency_score = EXCLUDED.brake_consistency_score,
            throttle_application_score = EXCLUDED.throttle_application_score,
            corner_entry_aggression = EXCLUDED.corner_entry_aggression,
            corner_exit_quality = EXCLUDED.corner_exit_quality,
            lap_time_variance_trend = EXCLUDED.lap_time_variance_trend,
            incident_clustering = EXCLUDED.incident_clustering,
            post_incident_pace_delta = EXCLUDED.post_incident_pace_delta,
            late_session_pace_delta = EXCLUDED.late_session_pace_delta,
            overtakes_attempted = EXCLUDED.overtakes_attempted,
            overtakes_completed = EXCLUDED.overtakes_completed,
            positions_lost_to_mistakes = EXCLUDED.positions_lost_to_mistakes,
            defensive_incidents = EXCLUDED.defensive_incidents,
            estimated_confidence = EXCLUDED.estimated_confidence,
            confidence_trajectory = EXCLUDED.confidence_trajectory,
            computed_at = NOW()
        RETURNING *`,
        [
            behavior.session_id,
            behavior.driver_profile_id,
            behavior.session_type,
            behavior.track_name,
            behavior.car_name,
            behavior.avg_brake_point_delta_m,
            behavior.brake_consistency_score,
            behavior.throttle_application_score,
            behavior.corner_entry_aggression,
            behavior.corner_exit_quality,
            behavior.lap_time_variance_trend,
            behavior.incident_clustering,
            behavior.post_incident_pace_delta,
            behavior.late_session_pace_delta,
            behavior.overtakes_attempted,
            behavior.overtakes_completed,
            behavior.positions_lost_to_mistakes,
            behavior.defensive_incidents,
            behavior.estimated_confidence,
            behavior.confidence_trajectory,
        ]
        );
        return result.rows[0];
    } catch (error) {
        console.error(`[DriverMemory] Failed to create session behavior:`, error instanceof Error ? error.message : error);
        throw error;
    }
}

export async function getSessionBehaviors(
    driverProfileId: string,
    limit: number = 50
): Promise<DriverSessionBehavior[]> {
    const result = await pool.query<DriverSessionBehavior>(
        `SELECT * FROM driver_session_behaviors 
         WHERE driver_profile_id = $1 
         ORDER BY computed_at DESC 
         LIMIT $2`,
        [driverProfileId, limit]
    );
    return result.rows;
}

export async function getRecentBehaviorsForAggregation(
    driverProfileId: string,
    limit: number = 20
): Promise<DriverSessionBehavior[]> {
    const result = await pool.query<DriverSessionBehavior>(
        `SELECT * FROM driver_session_behaviors 
         WHERE driver_profile_id = $1 
         ORDER BY computed_at DESC 
         LIMIT $2`,
        [driverProfileId, limit]
    );
    return result.rows;
}

// ========================
// Engineer Opinion Operations
// ========================

export async function createEngineerOpinion(
    opinion: Omit<EngineerOpinion, 'id' | 'created_at' | 'updated_at' | 'valid_from'>
): Promise<EngineerOpinion> {
    const result = await pool.query<EngineerOpinion>(
        `INSERT INTO engineer_opinions (
            driver_profile_id, opinion_domain, opinion_context, opinion_summary,
            opinion_detail, opinion_confidence, opinion_sentiment, is_actionable,
            suggested_action, priority, valid_until, superseded_by, evidence_sessions,
            evidence_summary
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
            opinion.driver_profile_id,
            opinion.opinion_domain,
            opinion.opinion_context,
            opinion.opinion_summary,
            opinion.opinion_detail,
            opinion.opinion_confidence,
            opinion.opinion_sentiment,
            opinion.is_actionable,
            opinion.suggested_action,
            opinion.priority,
            opinion.valid_until,
            opinion.superseded_by,
            JSON.stringify(opinion.evidence_sessions),
            opinion.evidence_summary,
        ]
    );
    return result.rows[0];
}

export async function getActiveOpinions(driverProfileId: string): Promise<EngineerOpinion[]> {
    const result = await pool.query<EngineerOpinion>(
        `SELECT * FROM engineer_opinions 
         WHERE driver_profile_id = $1 
           AND valid_until IS NULL
         ORDER BY priority DESC, created_at DESC`,
        [driverProfileId]
    );
    return result.rows;
}

export async function getOpinionsByDomain(
    driverProfileId: string,
    domain: string
): Promise<EngineerOpinion[]> {
    const result = await pool.query<EngineerOpinion>(
        `SELECT * FROM engineer_opinions 
         WHERE driver_profile_id = $1 
           AND opinion_domain = $2
           AND valid_until IS NULL
         ORDER BY priority DESC, created_at DESC`,
        [driverProfileId, domain]
    );
    return result.rows;
}

export async function supersededOpinion(
    opinionId: string,
    newOpinionId?: string | null
): Promise<void> {
    await pool.query(
        `UPDATE engineer_opinions SET 
            valid_until = NOW(),
            superseded_by = $2,
            updated_at = NOW()
         WHERE id = $1`,
        [opinionId, newOpinionId || null]
    );
}

// ========================
// Driver Identity Operations
// ========================

export async function getDriverIdentity(driverProfileId: string): Promise<DriverIdentity | null> {
    const result = await pool.query<DriverIdentity>(
        'SELECT * FROM driver_identity WHERE driver_profile_id = $1',
        [driverProfileId]
    );
    return result.rows[0] || null;
}

export async function updateDriverIdentity(
    driverProfileId: string,
    updates: Partial<Omit<DriverIdentity, 'id' | 'driver_profile_id' | 'created_at' | 'updated_at'>>
): Promise<DriverIdentity | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
            fields.push(`${key} = $${paramCount++}`);
            values.push(value);
        }
    }

    if (fields.length === 0) {
        return getDriverIdentity(driverProfileId);
    }

    fields.push(`updated_at = NOW()`);
    values.push(driverProfileId);

    const result = await pool.query<DriverIdentity>(
        `UPDATE driver_identity SET ${fields.join(', ')} WHERE driver_profile_id = $${paramCount} RETURNING *`,
        values
    );
    return result.rows[0] || null;
}

// ========================
// Memory Event Operations
// ========================

export async function logMemoryEvent(
    event: Omit<DriverMemoryEvent, 'id' | 'created_at'>
): Promise<DriverMemoryEvent> {
    const result = await pool.query<DriverMemoryEvent>(
        `INSERT INTO driver_memory_events (
            driver_profile_id, event_type, memory_field, previous_value, new_value,
            evidence_type, evidence_session_id, evidence_summary, learning_confidence
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
            event.driver_profile_id,
            event.event_type,
            event.memory_field,
            event.previous_value,
            event.new_value,
            event.evidence_type,
            event.evidence_session_id,
            event.evidence_summary,
            event.learning_confidence,
        ]
    );
    return result.rows[0];
}

export async function getMemoryEvents(
    driverProfileId: string,
    limit: number = 50
): Promise<DriverMemoryEvent[]> {
    const result = await pool.query<DriverMemoryEvent>(
        `SELECT * FROM driver_memory_events 
         WHERE driver_profile_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
        [driverProfileId, limit]
    );
    return result.rows;
}
