-- ProjectBlackBox Database Schema
-- PostgreSQL + TimescaleDB for time-series telemetry

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ============================================================================
-- SESSIONS
-- ============================================================================

CREATE TABLE sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id VARCHAR(255) NOT NULL,
    
    -- Session details
    session_type VARCHAR(50) NOT NULL, -- practice, qualify, race
    track_name VARCHAR(255) NOT NULL,
    track_config VARCHAR(255),
    track_length FLOAT,
    car_name VARCHAR(255),
    car_class VARCHAR(100),
    
    -- Weather
    weather_type VARCHAR(50),
    skies VARCHAR(50),
    track_temp FLOAT,
    air_temp FLOAT,
    
    -- Timing
    session_start TIMESTAMP NOT NULL DEFAULT NOW(),
    session_end TIMESTAMP,
    total_laps INT DEFAULT 0,
    best_lap_time FLOAT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_driver ON sessions(driver_id);
CREATE INDEX idx_sessions_track ON sessions(track_name, car_name);
CREATE INDEX idx_sessions_date ON sessions(session_start);

-- ============================================================================
-- TELEMETRY (Time-series data)
-- ============================================================================

CREATE TABLE telemetry (
    session_id UUID NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
    timestamp BIGINT NOT NULL, -- Unix timestamp in milliseconds
    session_time FLOAT,
    
    -- Lap info
    lap INT,
    lap_dist FLOAT,
    lap_dist_pct FLOAT,
    
    -- Speed and position
    speed FLOAT,
    pos_x FLOAT,
    pos_y FLOAT,
    pos_z FLOAT,
    
    -- Inputs
    throttle FLOAT,
    brake FLOAT,
    clutch FLOAT,
    steering FLOAT,
    gear INT,
    
    -- Engine
    rpm INT,
    fuel_level FLOAT,
    
    -- G-forces
    lat_accel FLOAT,
    long_accel FLOAT,
    vert_accel FLOAT,
    
    -- Tire temps
    tire_temp_lf FLOAT,
    tire_temp_rf FLOAT,
    tire_temp_lr FLOAT,
    tire_temp_rr FLOAT,
    
    -- Tire wear
    tire_wear_lf FLOAT,
    tire_wear_rf FLOAT,
    tire_wear_lr FLOAT,
    tire_wear_rr FLOAT,
    
    -- Brake temps
    brake_temp_lf FLOAT,
    brake_temp_rf FLOAT,
    brake_temp_lr FLOAT,
    brake_temp_rr FLOAT,
    
    -- Track conditions
    track_temp FLOAT,
    air_temp FLOAT,
    
    PRIMARY KEY (session_id, timestamp)
);

-- Convert to hypertable for time-series optimization
SELECT create_hypertable('telemetry', 'timestamp', 
    chunk_time_interval => 3600000, -- 1 hour chunks
    if_not_exists => TRUE
);

CREATE INDEX idx_telemetry_session_lap ON telemetry(session_id, lap);

-- ============================================================================
-- LAPS
-- ============================================================================

CREATE TABLE laps (
    lap_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
    lap_number INT NOT NULL,
    
    -- Timing
    lap_time FLOAT,
    sector_1_time FLOAT,
    sector_2_time FLOAT,
    sector_3_time FLOAT,
    
    -- Validity
    is_valid BOOLEAN DEFAULT TRUE,
    incidents INT DEFAULT 0,
    
    -- Fuel and tires
    fuel_used FLOAT,
    tire_wear JSONB,
    avg_tire_temp FLOAT,
    
    -- Performance
    avg_speed FLOAT,
    max_speed FLOAT,
    avg_throttle FLOAT,
    avg_brake FLOAT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(session_id, lap_number)
);

CREATE INDEX idx_laps_session ON laps(session_id);
CREATE INDEX idx_laps_time ON laps(lap_time) WHERE is_valid = TRUE;

-- ============================================================================
-- CORNER PERFORMANCE
-- ============================================================================

CREATE TABLE corner_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
    lap_number INT NOT NULL,
    
    -- Corner identification
    corner_number INT NOT NULL,
    corner_name VARCHAR(100),
    corner_type VARCHAR(50), -- slow, medium, fast
    
    -- Speed analysis
    entry_speed FLOAT,
    apex_speed FLOAT,
    exit_speed FLOAT,
    
    -- Deltas vs reference
    entry_speed_delta FLOAT,
    apex_speed_delta FLOAT,
    exit_speed_delta FLOAT,
    
    -- Braking
    brake_point_distance FLOAT,
    brake_point_delta FLOAT,
    max_brake_pressure FLOAT,
    
    -- Throttle
    throttle_application_point FLOAT,
    throttle_delta FLOAT,
    
    -- Time
    time_in_corner FLOAT,
    time_delta FLOAT,
    
    -- Rating
    rating VARCHAR(20), -- excellent, good, average, poor
    category VARCHAR(50), -- brake_point, entry_speed, etc.
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_corner_session ON corner_performance(session_id);
CREATE INDEX idx_corner_lap ON corner_performance(session_id, lap_number);
CREATE INDEX idx_corner_number ON corner_performance(corner_number);

-- ============================================================================
-- INCIDENTS
-- ============================================================================

CREATE TABLE incidents (
    incident_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
    lap_number INT NOT NULL,
    timestamp BIGINT NOT NULL,
    
    -- Incident details
    incident_type VARCHAR(50) NOT NULL, -- spin, lockup, off_track, contact
    severity VARCHAR(20), -- minor, moderate, major
    location VARCHAR(100), -- Corner name or track location
    
    -- Impact
    speed_before FLOAT,
    speed_after FLOAT,
    speed_loss FLOAT,
    time_lost FLOAT,
    positions_lost INT DEFAULT 0,
    incident_points INT DEFAULT 0,
    
    -- Analysis
    root_cause TEXT,
    contributing_factors JSONB,
    prevention_advice TEXT,
    technique_fix TEXT,
    
    -- Avoidability
    was_avoidable BOOLEAN,
    driver_error_pct FLOAT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_incidents_session ON incidents(session_id);
CREATE INDEX idx_incidents_type ON incidents(incident_type);
CREATE INDEX idx_incidents_date ON incidents(created_at);

-- ============================================================================
-- SETUP CHANGES
-- ============================================================================

CREATE TABLE setup_changes (
    change_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
    timestamp BIGINT NOT NULL,
    
    -- Change details
    component VARCHAR(100) NOT NULL, -- front_wing, rear_wing, etc.
    parameter VARCHAR(100) NOT NULL, -- angle, stiffness, pressure
    old_value FLOAT,
    new_value FLOAT,
    delta FLOAT,
    unit VARCHAR(20), -- clicks, psi, degrees
    
    -- Impact analysis
    laps_before INT DEFAULT 3,
    laps_after INT DEFAULT 3,
    lap_time_before FLOAT,
    lap_time_after FLOAT,
    lap_time_delta FLOAT,
    
    -- Handling impact
    understeer_delta FLOAT,
    oversteer_delta FLOAT,
    consistency_delta FLOAT,
    
    -- Tire impact
    tire_temp_delta JSONB,
    
    -- Assessment
    was_improvement BOOLEAN,
    confidence FLOAT,
    recommendation TEXT,
    keep_or_revert VARCHAR(20), -- keep, revert, uncertain
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_setup_session ON setup_changes(session_id);
CREATE INDEX idx_setup_component ON setup_changes(component, parameter);

-- ============================================================================
-- COMPETITORS
-- ============================================================================

CREATE TABLE competitors (
    driver_id VARCHAR(255) PRIMARY KEY,
    driver_name VARCHAR(255) NOT NULL,
    
    -- iRacing stats
    irating INT,
    safety_rating FLOAT,
    license_level VARCHAR(20),
    
    -- Performance characteristics
    qualifying_pace FLOAT,
    race_pace FLOAT,
    consistency FLOAT,
    tire_management FLOAT,
    overtaking_ability FLOAT,
    defending_ability FLOAT,
    
    -- Behavioral patterns
    aggressive_rating FLOAT,
    incident_rate FLOAT,
    typical_strategies JSONB,
    pit_timing_pattern VARCHAR(20), -- early, standard, late
    
    -- Complete profile (JSON)
    profile_data JSONB,
    
    -- Metadata
    last_updated TIMESTAMP DEFAULT NOW(),
    races_analyzed INT DEFAULT 0
);

CREATE INDEX idx_competitors_irating ON competitors(irating);
CREATE INDEX idx_competitors_name ON competitors(driver_name);

-- ============================================================================
-- COMPETITOR PERFORMANCE (Track-specific)
-- ============================================================================

CREATE TABLE competitor_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id VARCHAR(255) NOT NULL REFERENCES competitors(driver_id),
    track_name VARCHAR(255) NOT NULL,
    car_name VARCHAR(255),
    
    -- Performance
    avg_lap_time FLOAT,
    best_lap_time FLOAT,
    avg_position FLOAT,
    
    -- Strengths and weaknesses
    strong_corners JSONB, -- Array of corner numbers
    weak_corners JSONB,
    
    -- Strategy
    typical_pit_lap INT,
    preferred_tire_compound VARCHAR(50),
    
    -- Metadata
    races_at_track INT DEFAULT 1,
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(driver_id, track_name, car_name)
);

CREATE INDEX idx_comp_perf_driver ON competitor_performance(driver_id);
CREATE INDEX idx_comp_perf_track ON competitor_performance(track_name, car_name);

-- ============================================================================
-- HEAD-TO-HEAD
-- ============================================================================

CREATE TABLE head_to_head (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    your_driver_id VARCHAR(255) NOT NULL,
    opponent_driver_id VARCHAR(255) NOT NULL REFERENCES competitors(driver_id),
    session_id UUID REFERENCES sessions(session_id) ON DELETE CASCADE,
    
    -- Results
    your_position INT,
    their_position INT,
    position_delta INT, -- positive = you finished ahead
    
    -- Performance
    your_best_lap FLOAT,
    their_best_lap FLOAT,
    lap_time_delta FLOAT,
    
    -- Race details
    track_name VARCHAR(255),
    car_name VARCHAR(255),
    race_date TIMESTAMP DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_h2h_your_driver ON head_to_head(your_driver_id);
CREATE INDEX idx_h2h_opponent ON head_to_head(opponent_driver_id);
CREATE INDEX idx_h2h_session ON head_to_head(session_id);

-- ============================================================================
-- DRIVER SKILLS
-- ============================================================================

CREATE TABLE driver_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id VARCHAR(255) NOT NULL,
    
    -- Skill assessment
    skill_area VARCHAR(100) NOT NULL, -- braking, corner_entry, etc.
    rating FLOAT NOT NULL, -- 0-10
    percentile FLOAT, -- 0-100
    
    -- Evidence
    data_points INT DEFAULT 0,
    confidence FLOAT,
    
    -- Analysis
    strengths JSONB,
    weaknesses JSONB,
    specific_issues JSONB,
    
    -- Improvement plan
    priority VARCHAR(20), -- critical, high, medium, low
    target_rating FLOAT,
    estimated_lap_time_gain FLOAT,
    training_exercises JSONB,
    
    -- Metadata
    assessment_date TIMESTAMP DEFAULT NOW(),
    notes TEXT
);

CREATE INDEX idx_skills_driver ON driver_skills(driver_id);
CREATE INDEX idx_skills_area ON driver_skills(skill_area);
CREATE INDEX idx_skills_date ON driver_skills(assessment_date);

-- ============================================================================
-- TRAINING SESSIONS
-- ============================================================================

CREATE TABLE training_sessions (
    training_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id VARCHAR(255) NOT NULL,
    session_id UUID REFERENCES sessions(session_id),
    
    -- Training details
    skill_focus VARCHAR(100) NOT NULL,
    drill_type VARCHAR(100),
    drill_description TEXT,
    
    -- Session info
    duration_minutes INT,
    laps_completed INT,
    
    -- Performance
    initial_rating FLOAT,
    final_rating FLOAT,
    improvement_measured FLOAT,
    
    -- Feedback
    coach_notes TEXT,
    driver_feedback TEXT,
    
    -- Metadata
    session_date TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_training_driver ON training_sessions(driver_id);
CREATE INDEX idx_training_skill ON training_sessions(skill_focus);
CREATE INDEX idx_training_date ON training_sessions(session_date);

-- ============================================================================
-- COMMUNITY SETUPS
-- ============================================================================

CREATE TABLE community_setups (
    setup_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id VARCHAR(255) NOT NULL,
    
    -- Setup details
    track_name VARCHAR(255) NOT NULL,
    car_name VARCHAR(255) NOT NULL,
    setup_name VARCHAR(255),
    description TEXT,
    setup_data JSONB NOT NULL,
    
    -- Performance
    best_lap_time FLOAT,
    avg_lap_time FLOAT,
    
    -- Community
    downloads INT DEFAULT 0,
    rating FLOAT DEFAULT 0,
    num_ratings INT DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_setups_track_car ON community_setups(track_name, car_name);
CREATE INDEX idx_setups_rating ON community_setups(rating DESC);
CREATE INDEX idx_setups_downloads ON community_setups(downloads DESC);

-- ============================================================================
-- LEADERBOARDS
-- ============================================================================

CREATE TABLE leaderboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id VARCHAR(255) NOT NULL,
    driver_name VARCHAR(255),
    
    -- Track/car combo
    track_name VARCHAR(255) NOT NULL,
    car_name VARCHAR(255) NOT NULL,
    
    -- Performance
    lap_time FLOAT NOT NULL,
    session_id UUID REFERENCES sessions(session_id),
    
    -- Verification
    telemetry_verified BOOLEAN DEFAULT FALSE,
    video_url VARCHAR(500),
    
    -- Metadata
    submitted_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(driver_id, track_name, car_name)
);

CREATE INDEX idx_leaderboard_track_car ON leaderboards(track_name, car_name, lap_time);
CREATE INDEX idx_leaderboard_driver ON leaderboards(driver_id);

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Driver performance summary
CREATE VIEW driver_performance_summary AS
SELECT 
    s.driver_id,
    COUNT(DISTINCT s.session_id) as total_sessions,
    COUNT(DISTINCT l.lap_id) as total_laps,
    AVG(l.lap_time) as avg_lap_time,
    MIN(l.lap_time) as best_lap_time,
    STDDEV(l.lap_time) as lap_time_consistency,
    COUNT(i.incident_id) as total_incidents,
    AVG(i.incident_points) as avg_incident_points
FROM sessions s
LEFT JOIN laps l ON s.session_id = l.session_id AND l.is_valid = TRUE
LEFT JOIN incidents i ON s.session_id = i.session_id
GROUP BY s.driver_id;

-- Track-specific performance
CREATE VIEW track_performance AS
SELECT 
    s.driver_id,
    s.track_name,
    s.car_name,
    COUNT(DISTINCT s.session_id) as sessions_at_track,
    MIN(l.lap_time) as best_lap,
    AVG(l.lap_time) as avg_lap,
    STDDEV(l.lap_time) as consistency
FROM sessions s
LEFT JOIN laps l ON s.session_id = l.session_id AND l.is_valid = TRUE
-- ============================================================================
-- RACE REPORTS (Automated Debriefs)
-- ============================================================================

CREATE TABLE race_reports (
    report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
    report_data JSONB NOT NULL, -- The full JSON report
    pdf_path VARCHAR(500), -- Path to generated PDF
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reports_session ON race_reports(session_id);
