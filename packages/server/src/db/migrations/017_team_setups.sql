-- =====================================================================
-- Migration: 017_team_setups.sql
-- Team Setups, Strategy Plans, and Practice Sessions
-- =====================================================================

-- ========================
-- 1. TEAM SETUPS (Car setup file sharing)
-- ========================

CREATE TABLE IF NOT EXISTS team_setups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    
    -- Setup metadata
    name VARCHAR(255) NOT NULL,
    car_name VARCHAR(255) NOT NULL,
    track_name VARCHAR(255) NOT NULL,
    conditions VARCHAR(20) DEFAULT 'dry' CHECK (conditions IN ('dry', 'wet', 'night')),
    
    -- File storage
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    file_url TEXT, -- S3/storage URL or null if stored locally
    file_data BYTEA, -- For local storage of small files
    
    -- Versioning
    version INTEGER DEFAULT 1,
    parent_setup_id UUID REFERENCES team_setups(id) ON DELETE SET NULL,
    
    -- Attribution
    uploaded_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    uploaded_by_name VARCHAR(255),
    
    -- Notes and metadata
    notes TEXT,
    tags JSONB DEFAULT '[]',
    
    -- Stats
    download_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_setups_team ON team_setups(team_id);
CREATE INDEX IF NOT EXISTS idx_team_setups_track ON team_setups(track_name);
CREATE INDEX IF NOT EXISTS idx_team_setups_car ON team_setups(car_name);

-- ========================
-- 2. STRATEGY PLANS (Race strategy planning)
-- ========================

CREATE TABLE IF NOT EXISTS team_strategy_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    event_id UUID REFERENCES team_events(id) ON DELETE SET NULL,
    
    -- Plan metadata
    name VARCHAR(255) NOT NULL,
    event_name VARCHAR(255),
    race_duration VARCHAR(50), -- e.g., '24h', '6h', '45min'
    total_laps INTEGER,
    
    -- Fuel/tire data
    fuel_per_lap DECIMAL(6,3),
    tank_capacity DECIMAL(6,2),
    pit_time_loss INTEGER, -- seconds
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
    
    -- Attribution
    created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_strategy_plans_team ON team_strategy_plans(team_id);
CREATE INDEX IF NOT EXISTS idx_strategy_plans_event ON team_strategy_plans(event_id);

-- ========================
-- 3. STRATEGY STINTS (Individual stint plans)
-- ========================

CREATE TABLE IF NOT EXISTS team_strategy_stints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    strategy_plan_id UUID NOT NULL REFERENCES team_strategy_plans(id) ON DELETE CASCADE,
    
    -- Stint details
    stint_number INTEGER NOT NULL,
    driver_profile_id UUID REFERENCES driver_profiles(id) ON DELETE SET NULL,
    driver_name VARCHAR(255),
    
    -- Lap range
    start_lap INTEGER NOT NULL,
    end_lap INTEGER NOT NULL,
    
    -- Fuel/tire
    fuel_load DECIMAL(6,2),
    tire_compound VARCHAR(20) DEFAULT 'medium' CHECK (tire_compound IN ('soft', 'medium', 'hard', 'wet', 'intermediate')),
    
    -- Notes
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(strategy_plan_id, stint_number)
);

CREATE INDEX IF NOT EXISTS idx_strategy_stints_plan ON team_strategy_stints(strategy_plan_id);

-- ========================
-- 4. PRACTICE SESSIONS (Team practice tracking)
-- ========================

CREATE TABLE IF NOT EXISTS team_practice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    event_id UUID REFERENCES team_events(id) ON DELETE SET NULL,
    
    -- Session info
    name VARCHAR(255) NOT NULL,
    track_name VARCHAR(255),
    car_name VARCHAR(255),
    
    -- Timing
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    
    -- Status
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_practice_sessions_team ON team_practice_sessions(team_id);

-- ========================
-- 5. PRACTICE RUN PLANS (Structured practice objectives)
-- ========================

CREATE TABLE IF NOT EXISTS team_practice_run_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_session_id UUID NOT NULL REFERENCES team_practice_sessions(id) ON DELETE CASCADE,
    
    -- Plan details
    name VARCHAR(255) NOT NULL,
    target_laps INTEGER NOT NULL,
    completed_laps INTEGER DEFAULT 0,
    target_time VARCHAR(20), -- e.g., '1:48.000'
    
    -- Focus areas
    focus_areas JSONB DEFAULT '[]', -- array of strings
    
    -- Status
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_run_plans_session ON team_practice_run_plans(practice_session_id);

-- ========================
-- 6. PRACTICE DRIVER STINTS (Driver performance in practice)
-- ========================

CREATE TABLE IF NOT EXISTS team_practice_driver_stints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_session_id UUID NOT NULL REFERENCES team_practice_sessions(id) ON DELETE CASCADE,
    driver_profile_id UUID REFERENCES driver_profiles(id) ON DELETE SET NULL,
    driver_name VARCHAR(255) NOT NULL,
    
    -- Performance
    laps_completed INTEGER DEFAULT 0,
    best_lap_time_ms INTEGER,
    avg_lap_time_ms INTEGER,
    consistency_score DECIMAL(5,2), -- 0-100
    incidents INTEGER DEFAULT 0,
    
    -- Timestamps
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_practice_stints_session ON team_practice_driver_stints(practice_session_id);
CREATE INDEX IF NOT EXISTS idx_practice_stints_driver ON team_practice_driver_stints(driver_profile_id);
