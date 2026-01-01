-- Lap Data Table
-- Stores historical lap data for analysis

CREATE TABLE IF NOT EXISTS lap_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) NOT NULL,
    driver_id VARCHAR(255) NOT NULL,
    lap_number INTEGER NOT NULL,
    lap_time_ms INTEGER NOT NULL,
    fuel_used DECIMAL(10, 4),
    fuel_remaining DECIMAL(10, 4),
    tire_wear_fl DECIMAL(5, 4),
    tire_wear_fr DECIMAL(5, 4),
    tire_wear_rl DECIMAL(5, 4),
    tire_wear_rr DECIMAL(5, 4),
    is_clean BOOLEAN DEFAULT true,
    is_in_lap BOOLEAN DEFAULT false,
    is_out_lap BOOLEAN DEFAULT false,
    had_traffic BOOLEAN DEFAULT false,
    had_yellow BOOLEAN DEFAULT false,
    is_personal_best BOOLEAN DEFAULT false,
    timestamp_ms BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for common queries
    CONSTRAINT lap_data_session_driver_lap UNIQUE (session_id, driver_id, lap_number)
);

-- Index for session queries
CREATE INDEX IF NOT EXISTS idx_lap_data_session ON lap_data(session_id);

-- Index for driver queries
CREATE INDEX IF NOT EXISTS idx_lap_data_driver ON lap_data(driver_id);

-- Index for finding best laps
CREATE INDEX IF NOT EXISTS idx_lap_data_clean_time ON lap_data(session_id, lap_time_ms) 
    WHERE is_clean = true AND is_in_lap = false AND is_out_lap = false;
