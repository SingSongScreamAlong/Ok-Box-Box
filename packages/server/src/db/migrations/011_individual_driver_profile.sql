-- =====================================================================
-- IDP Migration: 011_individual_driver_profile.sql
-- Individual Driver Profile System - Core Schema
-- =====================================================================

-- ========================
-- 1. DRIVER PROFILE (Root Entity)
-- ========================
CREATE TABLE IF NOT EXISTS driver_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Link to auth account (nullable for claimed-but-unlinked profiles)
    user_account_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    
    -- Display
    display_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    
    -- Preferences
    primary_discipline VARCHAR(50) DEFAULT 'road', -- road, oval, dirt_road, dirt_oval
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Privacy
    privacy_level VARCHAR(20) DEFAULT 'public', -- public, team_only, private
    
    -- Stat Rollups (denormalized for fast reads)
    total_sessions INTEGER DEFAULT 0,
    total_laps INTEGER DEFAULT 0,
    total_incidents INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_profiles_user ON driver_profiles(user_account_id);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_name ON driver_profiles(display_name);

-- ========================
-- 2. LINKED RACING IDENTITIES
-- ========================
CREATE TABLE IF NOT EXISTS linked_racing_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_profile_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
    
    -- Platform identity
    platform VARCHAR(50) NOT NULL, -- 'iracing', 'acc', 'rf2'
    platform_user_id VARCHAR(255) NOT NULL, -- iRacing customer ID, etc.
    platform_display_name VARCHAR(255),
    
    -- Verification
    verified_at TIMESTAMPTZ,
    verification_method VARCHAR(50), -- 'oauth', 'relay_handshake', 'manual'
    verification_token VARCHAR(255), -- For pending verifications
    
    -- Sync state
    last_synced_at TIMESTAMPTZ,
    sync_status VARCHAR(20) DEFAULT 'pending', -- pending, active, failed, stale
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(platform, platform_user_id)
);

CREATE INDEX IF NOT EXISTS idx_linked_identities_driver ON linked_racing_identities(driver_profile_id);
CREATE INDEX IF NOT EXISTS idx_linked_identities_platform ON linked_racing_identities(platform, platform_user_id);

-- ========================
-- 3. EXTEND SESSIONS TABLE FOR IDP
-- ========================
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS driver_profile_id UUID REFERENCES driver_profiles(id);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'relay'; -- relay, iracing_api, manual
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS iracing_subsession_id BIGINT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS iracing_series_id INTEGER;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS official_result JSONB;

CREATE INDEX IF NOT EXISTS idx_sessions_driver_profile ON sessions(driver_profile_id);
CREATE INDEX IF NOT EXISTS idx_sessions_iracing_subsession ON sessions(iracing_subsession_id);

-- ========================
-- 4. SESSION METRICS (per-session computed stats)
-- ========================
CREATE TABLE IF NOT EXISTS session_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    driver_profile_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
    
    -- Lap-based metrics
    total_laps INTEGER NOT NULL DEFAULT 0,
    valid_laps INTEGER NOT NULL DEFAULT 0,
    best_lap_time_ms BIGINT,
    median_lap_time_ms BIGINT,
    mean_lap_time_ms BIGINT,
    lap_time_std_dev_ms BIGINT,
    
    -- Pace metrics
    pace_percentile DECIMAL(5,2),
    gap_to_leader_best_pct DECIMAL(5,2),
    
    -- Incident metrics
    incident_count INTEGER DEFAULT 0,
    incidents_per_100_laps DECIMAL(5,2),
    
    -- Race-specific (null for practice/quali)
    finish_position INTEGER,
    start_position INTEGER,
    positions_gained INTEGER,
    sof INTEGER,
    irating_change INTEGER,
    
    -- Derived proxies
    pace_dropoff_score DECIMAL(5,2),
    traffic_time_loss_ms BIGINT,
    
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(session_id, driver_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_session_metrics_driver ON session_metrics(driver_profile_id);
CREATE INDEX IF NOT EXISTS idx_session_metrics_session ON session_metrics(session_id);

-- ========================
-- 5. DRIVER AGGREGATES (rolling stats by context)
-- ========================
CREATE TABLE IF NOT EXISTS driver_aggregates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_profile_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
    
    -- Context (nullable = global aggregate)
    car_name VARCHAR(255),
    track_name VARCHAR(255),
    discipline VARCHAR(50),
    
    -- Rolling window
    window_type VARCHAR(20) NOT NULL, -- 'all_time', 'rolling_30d', 'rolling_90d', 'season'
    window_start DATE,
    window_end DATE,
    
    -- Aggregate metrics
    session_count INTEGER DEFAULT 0,
    lap_count INTEGER DEFAULT 0,
    
    -- Pace
    avg_pace_percentile DECIMAL(5,2),
    best_pace_percentile DECIMAL(5,2),
    pace_trend DECIMAL(5,2),
    
    -- Consistency
    consistency_index DECIMAL(5,2),
    avg_std_dev_ms BIGINT,
    
    -- Risk
    risk_index DECIMAL(5,2),
    avg_incidents_per_100_laps DECIMAL(5,2),
    
    -- Race craft
    avg_positions_gained DECIMAL(5,2),
    start_performance_index DECIMAL(5,2),
    
    -- Endurance
    endurance_fitness_index DECIMAL(5,2),
    
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(driver_profile_id, car_name, track_name, discipline, window_type)
);

CREATE INDEX IF NOT EXISTS idx_driver_aggregates_driver ON driver_aggregates(driver_profile_id);
CREATE INDEX IF NOT EXISTS idx_driver_aggregates_context ON driver_aggregates(car_name, track_name);

-- ========================
-- 6. DRIVER TRAITS (derived labels)
-- ========================
CREATE TABLE IF NOT EXISTS driver_traits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_profile_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
    
    trait_key VARCHAR(100) NOT NULL,
    trait_label VARCHAR(255) NOT NULL,
    trait_category VARCHAR(50) NOT NULL,
    
    confidence DECIMAL(4,3) NOT NULL,
    evidence_summary TEXT NOT NULL,
    
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    
    computed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_traits_driver ON driver_traits(driver_profile_id);
CREATE INDEX IF NOT EXISTS idx_driver_traits_current ON driver_traits(driver_profile_id) WHERE valid_until IS NULL;

-- ========================
-- 7. DRIVER REPORTS (AI-generated artifacts)
-- ========================
DO $$ BEGIN
    CREATE TYPE report_type AS ENUM (
        'session_debrief',
        'weekly_summary',
        'monthly_narrative',
        'development_focus',
        'custom'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS driver_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_profile_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
    
    report_type report_type NOT NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    
    title VARCHAR(255) NOT NULL,
    content_json JSONB NOT NULL,
    content_html TEXT,
    content_markdown TEXT,
    
    ai_model VARCHAR(100),
    ai_prompt_version VARCHAR(20),
    generation_context JSONB,
    
    status VARCHAR(20) DEFAULT 'draft',
    published_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_reports_driver ON driver_reports(driver_profile_id);
CREATE INDEX IF NOT EXISTS idx_driver_reports_type ON driver_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_driver_reports_session ON driver_reports(session_id);

-- ========================
-- 8. ACCESS GRANTS (for team scoped access)
-- ========================
DO $$ BEGIN
    CREATE TYPE access_scope AS ENUM ('public', 'team_standard', 'team_deep');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS driver_access_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_profile_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
    
    grantee_type VARCHAR(20) NOT NULL,
    grantee_id UUID NOT NULL,
    
    scope access_scope NOT NULL,
    
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    granted_by UUID REFERENCES driver_profiles(id),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_access_grants_driver ON driver_access_grants(driver_profile_id);
CREATE INDEX IF NOT EXISTS idx_access_grants_grantee ON driver_access_grants(grantee_type, grantee_id);
CREATE INDEX IF NOT EXISTS idx_access_grants_active ON driver_access_grants(driver_profile_id) WHERE revoked_at IS NULL;
