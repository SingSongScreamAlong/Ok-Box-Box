-- Migration 021: Behavioral Telemetry Metrics
-- Adds tables for storing telemetry-derived behavioral indices (BSI, TCI, CPI-2, RCI)
-- These feed into the Home page intelligence engine

-- ═══════════════════════════════════════════════════════════════════════════════
-- SESSION BEHAVIORAL METRICS
-- Per-session telemetry-derived behavioral indices
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS session_behavioral_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    driver_profile_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
    
    -- Braking Behavior Metrics (0-100 normalized)
    brake_timing_score NUMERIC(5,2),
    brake_pressure_smoothness NUMERIC(5,2),
    trail_braking_stability NUMERIC(5,2),
    entry_overshoot_score NUMERIC(5,2),
    braking_sample_corners INTEGER DEFAULT 0,
    
    -- Throttle Behavior Metrics (0-100 normalized)
    throttle_modulation_score NUMERIC(5,2),
    exit_traction_stability NUMERIC(5,2),
    slip_throttle_control NUMERIC(5,2),
    throttle_sample_corners INTEGER DEFAULT 0,
    
    -- Steering & Turn-In Metrics (0-100 normalized)
    turn_in_consistency NUMERIC(5,2),
    mid_corner_stability NUMERIC(5,2),
    rotation_balance NUMERIC(5,2),  -- 50 = balanced, <50 = under, >50 = over
    steering_sample_corners INTEGER DEFAULT 0,
    
    -- Consistency & Rhythm Metrics (0-100 normalized)
    lap_time_consistency NUMERIC(5,2),
    sector_consistency NUMERIC(5,2),
    input_repeatability NUMERIC(5,2),
    baseline_adherence NUMERIC(5,2),
    rhythm_sample_laps INTEGER DEFAULT 0,
    
    -- Computed Behavioral Indices (0-100)
    bsi NUMERIC(5,2),  -- Braking Stability Index
    tci NUMERIC(5,2),  -- Throttle Control Index
    cpi2 NUMERIC(5,2), -- Cornering Precision Index
    rci NUMERIC(5,2),  -- Rhythm & Consistency Index
    behavioral_stability NUMERIC(5,2),  -- Overall composite
    
    -- Confidence & Source
    telemetry_confidence NUMERIC(5,2) DEFAULT 0,
    data_source VARCHAR(20) DEFAULT 'post_session',  -- 'live', 'post_session', 'historical'
    
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(session_id, driver_profile_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_session_behavioral_driver 
    ON session_behavioral_metrics(driver_profile_id, computed_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- DRIVER BEHAVIORAL AGGREGATES
-- Rolling aggregates of behavioral indices (similar to driver_aggregates)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS driver_behavioral_aggregates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_profile_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
    
    -- Scope (like driver_aggregates)
    time_window VARCHAR(20) NOT NULL DEFAULT 'all_time',  -- 'last_10', 'last_30', 'all_time'
    car_name VARCHAR(100),
    track_name VARCHAR(100),
    
    -- Aggregated Behavioral Indices (0-100)
    avg_bsi NUMERIC(5,2),
    avg_tci NUMERIC(5,2),
    avg_cpi2 NUMERIC(5,2),
    avg_rci NUMERIC(5,2),
    avg_behavioral_stability NUMERIC(5,2),
    
    -- Trends (positive = improving)
    bsi_trend NUMERIC(6,4),
    tci_trend NUMERIC(6,4),
    cpi2_trend NUMERIC(6,4),
    rci_trend NUMERIC(6,4),
    
    -- Sample info
    session_count INTEGER DEFAULT 0,
    total_laps_analyzed INTEGER DEFAULT 0,
    total_corners_analyzed INTEGER DEFAULT 0,
    
    -- Confidence
    avg_telemetry_confidence NUMERIC(5,2) DEFAULT 0,
    
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(driver_profile_id, time_window, car_name, track_name)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_driver_behavioral_agg_driver 
    ON driver_behavioral_aggregates(driver_profile_id, time_window);

-- ═══════════════════════════════════════════════════════════════════════════════
-- ADD BEHAVIORAL COLUMNS TO EXISTING TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add behavioral stability to session_metrics for CPI calculation
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'session_metrics' AND column_name = 'behavioral_stability'
    ) THEN
        ALTER TABLE session_metrics ADD COLUMN behavioral_stability NUMERIC(5,2);
    END IF;
END $$;

-- Add behavioral stability to driver_aggregates for enhanced CPI
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'driver_aggregates' AND column_name = 'avg_behavioral_stability'
    ) THEN
        ALTER TABLE driver_aggregates ADD COLUMN avg_behavioral_stability NUMERIC(5,2);
    END IF;
END $$;
