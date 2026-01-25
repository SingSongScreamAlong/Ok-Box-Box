-- =====================================================================
-- IDP Migration: 014_driver_memory.sql
-- Driver Memory System - Living Memory for Personalized Engineering
-- =====================================================================
-- 
-- This is the foundation for the "engineer that knows you" experience.
-- It tracks behavioral patterns, tendencies, and evolving characteristics
-- that inform how the system communicates with and advises the driver.
--

-- ========================
-- 1. DRIVER MEMORY (Core Living Memory)
-- ========================
-- The central memory store that evolves with every session.
-- This is NOT static profile data - it LEARNS and CHANGES.

CREATE TABLE IF NOT EXISTS driver_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_profile_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
    
    -- ========================
    -- DRIVING TENDENCIES (learned from telemetry patterns)
    -- ========================
    
    -- Braking behavior
    braking_style VARCHAR(20) DEFAULT 'unknown', -- 'early', 'late', 'trail', 'threshold', 'unknown'
    braking_consistency DECIMAL(4,3), -- 0-1 scale
    brake_bias_preference VARCHAR(20), -- 'forward', 'rear', 'neutral'
    
    -- Throttle behavior  
    throttle_style VARCHAR(20) DEFAULT 'unknown', -- 'aggressive', 'smooth', 'hesitant', 'unknown'
    throttle_on_exit_tendency VARCHAR(20), -- 'early', 'late', 'optimal'
    traction_management DECIMAL(4,3), -- 0-1 scale (1 = excellent)
    
    -- Cornering
    corner_entry_style VARCHAR(20), -- 'aggressive', 'conservative', 'variable'
    apex_hit_rate DECIMAL(4,3), -- 0-1 scale
    corner_exit_quality DECIMAL(4,3), -- 0-1 scale
    
    -- Racecraft
    overtaking_style VARCHAR(20), -- 'opportunistic', 'patient', 'aggressive', 'defensive'
    defensive_awareness DECIMAL(4,3), -- 0-1 scale
    traffic_comfort DECIMAL(4,3), -- 0-1 scale (1 = very comfortable)
    incident_proneness DECIMAL(4,3), -- 0-1 scale (1 = very safe)
    
    -- ========================
    -- ERROR PATTERNS (learned from incidents and mistakes)
    -- ========================
    
    -- Post-incident behavior
    post_incident_tilt_risk DECIMAL(4,3), -- 0-1 scale (1 = high risk of tilt)
    recovery_speed VARCHAR(20), -- 'fast', 'moderate', 'slow'
    
    -- Fatigue patterns
    late_race_degradation DECIMAL(4,3), -- 0-1 scale (1 = significant dropoff)
    session_length_sweet_spot INTEGER, -- optimal session length in minutes
    fatigue_onset_lap INTEGER, -- typical lap where fatigue shows
    
    -- Common mistakes
    common_error_types JSONB DEFAULT '[]', -- array of {type, frequency, context}
    high_risk_corners JSONB DEFAULT '[]', -- array of {track, corner, incident_rate}
    
    -- ========================
    -- STRENGTHS & WEAKNESSES
    -- ========================
    
    -- Track type performance
    strength_track_types JSONB DEFAULT '[]', -- ['street', 'high_speed', 'technical']
    weakness_track_types JSONB DEFAULT '[]',
    
    -- Corner type performance
    strength_corner_types JSONB DEFAULT '[]', -- ['hairpin', 'high_speed', 'chicane']
    weakness_corner_types JSONB DEFAULT '[]',
    
    -- Session type performance
    qualifying_vs_race_delta DECIMAL(5,3), -- positive = better in race
    practice_to_race_improvement DECIMAL(4,3), -- how much they improve
    
    -- ========================
    -- COMMUNICATION PREFERENCES (learned from interactions)
    -- ========================
    
    preferred_feedback_style VARCHAR(20) DEFAULT 'balanced', -- 'brief', 'detailed', 'motivational', 'blunt', 'balanced'
    preferred_callout_frequency VARCHAR(20) DEFAULT 'moderate', -- 'minimal', 'moderate', 'frequent'
    responds_well_to_criticism BOOLEAN DEFAULT true,
    needs_confidence_building BOOLEAN DEFAULT false,
    prefers_data_vs_feeling VARCHAR(20) DEFAULT 'balanced', -- 'data', 'feeling', 'balanced'
    
    -- ========================
    -- CONFIDENCE & MENTAL STATE BASELINE
    -- ========================
    
    baseline_confidence DECIMAL(4,3) DEFAULT 0.5, -- 0-1 scale
    confidence_volatility DECIMAL(4,3) DEFAULT 0.5, -- how much it swings
    current_confidence DECIMAL(4,3) DEFAULT 0.5, -- real-time estimate
    confidence_trend VARCHAR(20) DEFAULT 'stable', -- 'rising', 'falling', 'stable', 'volatile'
    
    -- ========================
    -- LEARNING METADATA
    -- ========================
    
    sessions_analyzed INTEGER DEFAULT 0,
    laps_analyzed INTEGER DEFAULT 0,
    last_learning_update TIMESTAMPTZ,
    memory_confidence DECIMAL(4,3) DEFAULT 0, -- how confident we are in this memory (more data = higher)
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(driver_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_driver_memory_profile ON driver_memory(driver_profile_id);

-- ========================
-- 2. DRIVER MEMORY EVENTS (Learning Log)
-- ========================
-- Every time we learn something about the driver, we log it here.
-- This provides transparency and allows the driver to see how the system learned.

CREATE TABLE IF NOT EXISTS driver_memory_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_profile_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
    
    -- What was learned
    event_type VARCHAR(50) NOT NULL, -- 'tendency_update', 'pattern_detected', 'preference_inferred', 'confidence_shift'
    memory_field VARCHAR(100) NOT NULL, -- which field was updated
    previous_value TEXT,
    new_value TEXT,
    
    -- Evidence
    evidence_type VARCHAR(50) NOT NULL, -- 'session_analysis', 'incident_review', 'interaction_pattern', 'explicit_feedback'
    evidence_session_id UUID REFERENCES sessions(id),
    evidence_summary TEXT NOT NULL,
    
    -- Confidence in this learning
    learning_confidence DECIMAL(4,3) NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memory_events_profile ON driver_memory_events(driver_profile_id);
CREATE INDEX IF NOT EXISTS idx_memory_events_type ON driver_memory_events(event_type);
CREATE INDEX IF NOT EXISTS idx_memory_events_time ON driver_memory_events(created_at DESC);

-- ========================
-- 3. DRIVER SESSION BEHAVIORS (Per-Session Behavioral Snapshot)
-- ========================
-- Captures behavioral markers for each session, used to update memory.

CREATE TABLE IF NOT EXISTS driver_session_behaviors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    driver_profile_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
    
    -- Session context
    session_type VARCHAR(20), -- 'practice', 'qualifying', 'race'
    track_name VARCHAR(255),
    car_name VARCHAR(255),
    
    -- Behavioral observations
    avg_brake_point_delta_m DECIMAL(6,2), -- vs optimal (negative = early)
    brake_consistency_score DECIMAL(4,3),
    throttle_application_score DECIMAL(4,3),
    corner_entry_aggression DECIMAL(4,3),
    corner_exit_quality DECIMAL(4,3),
    
    -- Mental state indicators
    lap_time_variance_trend VARCHAR(20), -- 'improving', 'degrading', 'stable', 'erratic'
    incident_clustering BOOLEAN DEFAULT false, -- multiple incidents close together
    post_incident_pace_delta DECIMAL(5,3), -- pace change after incident
    late_session_pace_delta DECIMAL(5,3), -- pace change in final third
    
    -- Racecraft (race sessions only)
    overtakes_attempted INTEGER,
    overtakes_completed INTEGER,
    positions_lost_to_mistakes INTEGER,
    defensive_incidents INTEGER,
    
    -- Confidence estimate for this session
    estimated_confidence DECIMAL(4,3),
    confidence_trajectory VARCHAR(20), -- 'rising', 'falling', 'stable'
    
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(session_id, driver_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_session_behaviors_profile ON driver_session_behaviors(driver_profile_id);
CREATE INDEX IF NOT EXISTS idx_session_behaviors_session ON driver_session_behaviors(session_id);

-- ========================
-- 4. ENGINEER OPINIONS (What the engineer "thinks" about the driver)
-- ========================
-- These are the opinionated assessments that drive communication.

CREATE TABLE IF NOT EXISTS engineer_opinions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_profile_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
    
    -- Opinion context
    opinion_domain VARCHAR(50) NOT NULL, -- 'pace', 'consistency', 'racecraft', 'mental', 'technique', 'development'
    opinion_context VARCHAR(255), -- e.g., 'Spa', 'GT3', 'wet conditions'
    
    -- The opinion itself
    opinion_summary TEXT NOT NULL, -- "You brake too early into La Source"
    opinion_detail TEXT, -- Longer explanation if needed
    opinion_confidence DECIMAL(4,3) NOT NULL,
    opinion_sentiment VARCHAR(20) NOT NULL, -- 'positive', 'neutral', 'concern', 'critical'
    
    -- Actionability
    is_actionable BOOLEAN DEFAULT true,
    suggested_action TEXT,
    priority INTEGER DEFAULT 5, -- 1-10 scale
    
    -- Validity
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ, -- null = still valid
    superseded_by UUID REFERENCES engineer_opinions(id),
    
    -- Evidence
    evidence_sessions JSONB DEFAULT '[]', -- array of session IDs
    evidence_summary TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engineer_opinions_profile ON engineer_opinions(driver_profile_id);
CREATE INDEX IF NOT EXISTS idx_engineer_opinions_domain ON engineer_opinions(opinion_domain);
CREATE INDEX IF NOT EXISTS idx_engineer_opinions_active ON engineer_opinions(driver_profile_id) WHERE valid_until IS NULL;

-- ========================
-- 5. DRIVER IDENTITY (The narrative layer)
-- ========================
-- "What kind of driver are you becoming?"

CREATE TABLE IF NOT EXISTS driver_identity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_profile_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
    
    -- Core identity
    driver_archetype VARCHAR(50), -- 'calculated_racer', 'aggressive_hunter', 'consistent_grinder', 'raw_talent', 'developing'
    archetype_confidence DECIMAL(4,3),
    archetype_evidence TEXT,
    
    -- Skill arc
    skill_trajectory VARCHAR(20) DEFAULT 'developing', -- 'ascending', 'plateaued', 'breaking_through', 'declining', 'developing'
    trajectory_since TIMESTAMPTZ,
    trajectory_evidence TEXT,
    
    -- Readiness signals
    ready_for_longer_races BOOLEAN DEFAULT false,
    ready_for_higher_splits BOOLEAN DEFAULT false,
    ready_for_new_discipline BOOLEAN DEFAULT false,
    readiness_notes TEXT,
    
    -- Development focus
    current_development_focus VARCHAR(100),
    focus_set_at TIMESTAMPTZ,
    focus_progress DECIMAL(4,3) DEFAULT 0,
    
    -- Narrative elements
    defining_moment TEXT, -- "Your first win at Spa"
    current_chapter TEXT, -- "Breaking into top split"
    next_milestone TEXT, -- "Consistent podiums in IMSA"
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(driver_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_driver_identity_profile ON driver_identity(driver_profile_id);

-- ========================
-- 6. FUNCTIONS FOR MEMORY UPDATES
-- ========================

-- Function to ensure driver_memory exists for a profile
CREATE OR REPLACE FUNCTION ensure_driver_memory(p_driver_profile_id UUID)
RETURNS UUID AS $$
DECLARE
    v_memory_id UUID;
BEGIN
    SELECT id INTO v_memory_id FROM driver_memory WHERE driver_profile_id = p_driver_profile_id;
    
    IF v_memory_id IS NULL THEN
        INSERT INTO driver_memory (driver_profile_id)
        VALUES (p_driver_profile_id)
        RETURNING id INTO v_memory_id;
    END IF;
    
    RETURN v_memory_id;
END;
$$ LANGUAGE plpgsql;

-- Function to ensure driver_identity exists for a profile
CREATE OR REPLACE FUNCTION ensure_driver_identity(p_driver_profile_id UUID)
RETURNS UUID AS $$
DECLARE
    v_identity_id UUID;
BEGIN
    SELECT id INTO v_identity_id FROM driver_identity WHERE driver_profile_id = p_driver_profile_id;
    
    IF v_identity_id IS NULL THEN
        INSERT INTO driver_identity (driver_profile_id)
        VALUES (p_driver_profile_id)
        RETURNING id INTO v_identity_id;
    END IF;
    
    RETURN v_identity_id;
END;
$$ LANGUAGE plpgsql;

-- ========================
-- 7. TRIGGER TO AUTO-CREATE MEMORY ON PROFILE CREATION
-- ========================

CREATE OR REPLACE FUNCTION auto_create_driver_memory()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO driver_memory (driver_profile_id) VALUES (NEW.id);
    INSERT INTO driver_identity (driver_profile_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_create_driver_memory ON driver_profiles;
CREATE TRIGGER trg_auto_create_driver_memory
    AFTER INSERT ON driver_profiles
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_driver_memory();
