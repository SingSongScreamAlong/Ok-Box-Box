-- =====================================================================
-- Team System v1.1 Migration: 013_team_invites_snapshots.sql
-- Adds: team_invites, team_event_participants, session_links, snapshots
-- =====================================================================

-- ========================
-- 1. ADD SLUG TO TEAMS
-- ========================
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teams' AND column_name='slug') THEN
        ALTER TABLE teams ADD COLUMN slug VARCHAR(100);
        CREATE UNIQUE INDEX idx_teams_slug ON teams(slug) WHERE slug IS NOT NULL;
    END IF;
END $$;

-- ========================
-- 2. TEAM INVITES (Token-based)
-- ========================
CREATE TABLE IF NOT EXISTS team_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    
    -- Permissions
    role VARCHAR(50) DEFAULT 'driver' CHECK (role IN ('driver', 'engineer', 'analyst', 'admin', 'owner')),
    scope VARCHAR(50) DEFAULT 'team_standard' CHECK (scope IN ('team_standard', 'team_deep')),
    
    -- Token
    token VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Audit
    created_by_user_id UUID REFERENCES admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_team_invites_team ON team_invites(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_email ON team_invites(email);
CREATE INDEX IF NOT EXISTS idx_team_invites_token ON team_invites(token);
CREATE INDEX IF NOT EXISTS idx_team_invites_pending ON team_invites(team_id, email) 
    WHERE accepted_at IS NULL AND revoked_at IS NULL AND expires_at > NOW();

-- ========================
-- 3. TEAM EVENT PARTICIPANTS (Snapshot Anchor)
-- ========================
CREATE TABLE IF NOT EXISTS team_event_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    team_event_id UUID NOT NULL REFERENCES team_events(id) ON DELETE CASCADE,
    driver_profile_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
    
    participation_type VARCHAR(20) DEFAULT 'scheduled' CHECK (participation_type IN ('scheduled', 'raced', 'dnf', 'dns')),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_participants_event ON team_event_participants(team_event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_driver ON team_event_participants(driver_profile_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_participants_unique ON team_event_participants(team_event_id, driver_profile_id);

-- ========================
-- 4. TEAM EVENT SESSION LINKS
-- ========================
CREATE TABLE IF NOT EXISTS team_event_session_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    team_event_id UUID NOT NULL REFERENCES team_events(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_session_links_event ON team_event_session_links(team_event_id);
CREATE INDEX IF NOT EXISTS idx_event_session_links_session ON team_event_session_links(session_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_session_links_unique ON team_event_session_links(team_event_id, session_id);

-- ========================
-- 5. TEAM EVENT DRIVER SNAPSHOTS (Frozen for historical retention)
-- ========================
CREATE TABLE IF NOT EXISTS team_event_driver_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    team_event_id UUID NOT NULL REFERENCES team_events(id) ON DELETE CASCADE,
    driver_profile_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
    
    -- Frozen metrics (minimal set per spec)
    snapshot_json JSONB NOT NULL,
    -- Expected keys: best_lap_ms, median_lap_ms, variance_ms, incidents_per_100, 
    -- pace_dropoff_score, traffic_time_loss_ms, debrief_headline, primary_limiter
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_snapshots_event ON team_event_driver_snapshots(team_event_id);
CREATE INDEX IF NOT EXISTS idx_event_snapshots_driver ON team_event_driver_snapshots(driver_profile_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_snapshots_unique ON team_event_driver_snapshots(team_event_id, driver_profile_id);

-- ========================
-- 6. UPDATE team_event_debriefs to include driver_summaries + team_summary
-- ========================
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='team_event_debriefs' AND column_name='driver_summaries') THEN
        ALTER TABLE team_event_debriefs ADD COLUMN driver_summaries JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='team_event_debriefs' AND column_name='team_summary') THEN
        ALTER TABLE team_event_debriefs ADD COLUMN team_summary JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='team_event_debriefs' AND column_name='generated_by') THEN
        ALTER TABLE team_event_debriefs ADD COLUMN generated_by UUID REFERENCES admin_users(id);
    END IF;
END $$;
