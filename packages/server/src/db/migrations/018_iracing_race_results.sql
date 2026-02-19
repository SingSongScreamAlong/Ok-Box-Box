-- =====================================================================
-- iRacing Race Results Migration
-- Stores race results fetched from iRacing Data API via user OAuth
-- =====================================================================

CREATE TABLE IF NOT EXISTS iracing_race_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    iracing_customer_id VARCHAR(50) NOT NULL,

    -- iRacing identifiers
    subsession_id BIGINT NOT NULL,
    series_id INTEGER,
    series_name VARCHAR(255),
    season_id INTEGER,

    -- Track info
    track_id INTEGER,
    track_name VARCHAR(255),
    track_config VARCHAR(255),

    -- Car info
    car_id INTEGER,
    car_name VARCHAR(255),
    car_class_name VARCHAR(255),

    -- Session info
    session_start_time TIMESTAMPTZ,
    event_type VARCHAR(50),          -- 'race', 'practice', 'qualifying', 'time_trial'
    license_category VARCHAR(50),    -- 'oval', 'road', 'dirt_oval', 'dirt_road'
    license_category_id INTEGER,

    -- Results
    start_position INTEGER,
    finish_position INTEGER,
    finish_position_in_class INTEGER,
    laps_complete INTEGER,
    laps_lead INTEGER,
    incidents INTEGER,
    
    -- Rating changes
    oldi_rating INTEGER,
    newi_rating INTEGER,
    irating_change INTEGER,
    old_sub_level INTEGER,           -- SR * 100
    new_sub_level INTEGER,
    
    -- Field info
    strength_of_field INTEGER,
    field_size INTEGER,
    
    -- Raw data for future use
    raw_result JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate imports
    UNIQUE(admin_user_id, subsession_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_iracing_results_user 
    ON iracing_race_results(admin_user_id);

CREATE INDEX IF NOT EXISTS idx_iracing_results_time 
    ON iracing_race_results(session_start_time DESC);

CREATE INDEX IF NOT EXISTS idx_iracing_results_user_time 
    ON iracing_race_results(admin_user_id, session_start_time DESC);

CREATE INDEX IF NOT EXISTS idx_iracing_results_subsession 
    ON iracing_race_results(subsession_id);

CREATE INDEX IF NOT EXISTS idx_iracing_results_category 
    ON iracing_race_results(admin_user_id, license_category);
