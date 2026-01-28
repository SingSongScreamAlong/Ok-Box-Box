-- =====================================================================
-- IDP Migration: 016_team_events.sql
-- Team Events, Race Plans, and Stint Management
-- =====================================================================

-- ========================
-- 1. TEAM EVENTS (Races the team is participating in)
-- ========================
CREATE TABLE IF NOT EXISTS team_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    
    -- Event details
    name VARCHAR(255) NOT NULL,
    series_name VARCHAR(255),
    track_name VARCHAR(255) NOT NULL,
    track_config VARCHAR(100),
    
    -- Timing
    event_date TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER, -- For timed races
    total_laps INTEGER, -- For lap races
    
    -- Status
    status VARCHAR(20) DEFAULT 'upcoming', -- 'upcoming', 'in_progress', 'completed', 'cancelled'
    
    -- iRacing integration
    iracing_subsession_id BIGINT,
    iracing_series_id INTEGER,
    
    -- Settings
    car_class VARCHAR(100),
    weather_type VARCHAR(50),
    time_of_day VARCHAR(50),
    
    -- Results (filled after race)
    finish_position INTEGER,
    class_position INTEGER,
    laps_completed INTEGER,
    total_incidents INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_events_team ON team_events(team_id);
CREATE INDEX IF NOT EXISTS idx_team_events_date ON team_events(event_date);
CREATE INDEX IF NOT EXISTS idx_team_events_status ON team_events(status);

-- ========================
-- 2. RACE PLANS (Strategy plans for events)
-- ========================
CREATE TABLE IF NOT EXISTS race_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    event_id UUID REFERENCES team_events(id) ON DELETE CASCADE,
    
    -- Plan details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'active', 'archived'
    
    -- Strategy summary
    total_pit_stops INTEGER DEFAULT 0,
    fuel_strategy VARCHAR(50), -- 'conservative', 'aggressive', 'adaptive'
    tire_strategy VARCHAR(50), -- 'single_stint', 'multi_stint'
    
    -- Timing targets
    target_lap_time_ms INTEGER,
    fuel_per_lap DECIMAL(6,3),
    
    -- Notes
    notes TEXT,
    
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_race_plans_team ON race_plans(team_id);
CREATE INDEX IF NOT EXISTS idx_race_plans_event ON race_plans(event_id);
CREATE INDEX IF NOT EXISTS idx_race_plans_active ON race_plans(team_id, is_active) WHERE is_active = true;

-- ========================
-- 3. STINTS (Driver assignments within a race plan)
-- ========================
CREATE TABLE IF NOT EXISTS stints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    race_plan_id UUID NOT NULL REFERENCES race_plans(id) ON DELETE CASCADE,
    
    -- Driver assignment
    driver_profile_id UUID REFERENCES driver_profiles(id),
    driver_name VARCHAR(255), -- Fallback if no profile linked
    
    -- Stint position
    stint_number INTEGER NOT NULL,
    
    -- Timing
    start_lap INTEGER,
    end_lap INTEGER,
    estimated_duration_minutes INTEGER,
    
    -- Fuel
    fuel_load DECIMAL(6,2),
    fuel_target_laps INTEGER,
    
    -- Tires
    tire_compound VARCHAR(50),
    tire_change BOOLEAN DEFAULT true,
    
    -- Status
    status VARCHAR(20) DEFAULT 'planned', -- 'planned', 'in_progress', 'completed', 'skipped'
    
    -- Actual data (filled during/after race)
    actual_start_lap INTEGER,
    actual_end_lap INTEGER,
    actual_laps INTEGER,
    actual_avg_lap_ms INTEGER,
    actual_best_lap_ms INTEGER,
    actual_incidents INTEGER,
    
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stints_plan ON stints(race_plan_id);
CREATE INDEX IF NOT EXISTS idx_stints_driver ON stints(driver_profile_id);
CREATE INDEX IF NOT EXISTS idx_stints_order ON stints(race_plan_id, stint_number);

-- ========================
-- 4. PIT STOPS (Planned and actual pit stops)
-- ========================
CREATE TABLE IF NOT EXISTS pit_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    race_plan_id UUID NOT NULL REFERENCES race_plans(id) ON DELETE CASCADE,
    stint_id UUID REFERENCES stints(id) ON DELETE SET NULL,
    
    -- Pit stop position
    pit_number INTEGER NOT NULL,
    planned_lap INTEGER,
    
    -- Services
    fuel_amount DECIMAL(6,2),
    tire_change BOOLEAN DEFAULT true,
    tire_compound VARCHAR(50),
    repairs BOOLEAN DEFAULT false,
    driver_change BOOLEAN DEFAULT false,
    
    -- Timing targets
    target_duration_seconds DECIMAL(5,2),
    
    -- Actual data
    actual_lap INTEGER,
    actual_duration_seconds DECIMAL(5,2),
    actual_fuel_added DECIMAL(6,2),
    
    -- Status
    status VARCHAR(20) DEFAULT 'planned', -- 'planned', 'completed', 'skipped'
    
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pit_stops_plan ON pit_stops(race_plan_id);
CREATE INDEX IF NOT EXISTS idx_pit_stops_stint ON pit_stops(stint_id);

-- ========================
-- 5. PLAN CHANGES (Audit trail for strategy changes)
-- ========================
CREATE TABLE IF NOT EXISTS plan_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    race_plan_id UUID NOT NULL REFERENCES race_plans(id) ON DELETE CASCADE,
    
    -- Change details
    change_type VARCHAR(50) NOT NULL, -- 'stint_update', 'pit_update', 'driver_swap', 'plan_switch'
    description TEXT NOT NULL,
    
    -- Who made the change
    changed_by UUID REFERENCES admin_users(id),
    changed_by_name VARCHAR(255),
    
    -- Driver confirmation
    sent_to_drivers BOOLEAN DEFAULT false,
    confirmed_by JSONB DEFAULT '[]', -- Array of driver IDs who confirmed
    pending_confirmation JSONB DEFAULT '[]', -- Array of driver IDs pending
    
    -- Timing
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plan_changes_plan ON plan_changes(race_plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_changes_time ON plan_changes(created_at DESC);

-- ========================
-- 6. TEAM ROSTER ASSIGNMENTS (For specific events)
-- ========================
CREATE TABLE IF NOT EXISTS event_roster (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES team_events(id) ON DELETE CASCADE,
    driver_profile_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
    
    -- Role
    role VARCHAR(50) NOT NULL, -- 'driver', 'reserve', 'spotter', 'engineer', 'strategist'
    
    -- Availability
    confirmed BOOLEAN DEFAULT false,
    available BOOLEAN DEFAULT true,
    
    -- Notes
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(event_id, driver_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_event_roster_event ON event_roster(event_id);
CREATE INDEX IF NOT EXISTS idx_event_roster_driver ON event_roster(driver_profile_id);

-- ========================
-- 7. TRIGGER FOR TIMESTAMPS
-- ========================
CREATE OR REPLACE FUNCTION update_team_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_team_events_timestamp ON team_events;
CREATE TRIGGER trg_team_events_timestamp
    BEFORE UPDATE ON team_events
    FOR EACH ROW EXECUTE FUNCTION update_team_timestamp();

DROP TRIGGER IF EXISTS trg_race_plans_timestamp ON race_plans;
CREATE TRIGGER trg_race_plans_timestamp
    BEFORE UPDATE ON race_plans
    FOR EACH ROW EXECUTE FUNCTION update_team_timestamp();

DROP TRIGGER IF EXISTS trg_stints_timestamp ON stints;
CREATE TRIGGER trg_stints_timestamp
    BEFORE UPDATE ON stints
    FOR EACH ROW EXECUTE FUNCTION update_team_timestamp();
