-- =====================================================================
-- Team System v1 Migration: 012_team_system.sql
-- =====================================================================

-- ========================
-- 1. TEAMS (Update Existing Table)
-- ========================
DO $$ 
BEGIN 
    -- 1. Add owner_user_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teams' AND column_name='owner_user_id') THEN
        ALTER TABLE teams ADD COLUMN owner_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL;
        CREATE INDEX idx_teams_owner ON teams(owner_user_id);
    END IF;

    -- 2. Add status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teams' AND column_name='status') THEN
        ALTER TABLE teams ADD COLUMN status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'suspended'));
        
        -- Backfill status based on is_active if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teams' AND column_name='is_active') THEN
            UPDATE teams SET status = CASE WHEN is_active THEN 'active' ELSE 'archived' END;
        END IF;
        
        CREATE INDEX idx_teams_status ON teams(status);
    END IF;

    -- 3. Add primary_color
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teams' AND column_name='primary_color') THEN
        ALTER TABLE teams ADD COLUMN primary_color VARCHAR(7);
        
        -- Backfill from legacy color column if exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teams' AND column_name='color') THEN
            UPDATE teams SET primary_color = color;
        END IF;
    END IF;

    -- 4. Make league_id nullable (IDP teams are not strictly league-bound)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teams' AND column_name='league_id') THEN
        ALTER TABLE teams ALTER COLUMN league_id DROP NOT NULL;
    END IF;
END $$;

-- ========================
-- 2. TEAM MEMBERSHIPS (Driver ↔ Team Link)
-- ========================
CREATE TABLE IF NOT EXISTS team_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- References
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    driver_profile_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
    
    -- Role within team
    role VARCHAR(50) DEFAULT 'driver' CHECK (role IN ('driver', 'engineer', 'manager', 'owner')),
    
    -- Status
    status VARCHAR(20) DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'left', 'removed')),
    
    -- Timestamps
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    invited_by UUID REFERENCES admin_users(id),
    joined_at TIMESTAMPTZ,
    left_at TIMESTAMPTZ,
    
    -- Access grant reference
    access_grant_id UUID REFERENCES driver_access_grants(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_memberships_team ON team_memberships(team_id);
CREATE INDEX IF NOT EXISTS idx_memberships_driver ON team_memberships(driver_profile_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON team_memberships(status);
CREATE INDEX IF NOT EXISTS idx_memberships_team_active ON team_memberships(team_id, status) WHERE status = 'active';

-- Unique active membership constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_memberships_unique_active 
    ON team_memberships(team_id, driver_profile_id) 
    WHERE status IN ('invited', 'active');

-- ========================
-- 3. TEAM EVENTS (Sessions associated with team)
-- ========================
CREATE TABLE IF NOT EXISTS team_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- References
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    
    -- Event metadata
    event_name VARCHAR(255),
    event_type VARCHAR(50) CHECK (event_type IN ('practice', 'qualifying', 'race', 'endurance', 'other')),
    
    -- Participating drivers (snapshot)
    participating_driver_ids UUID[] NOT NULL,
    
    -- Optional notes
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES admin_users(id)
);

CREATE INDEX IF NOT EXISTS idx_team_events_team ON team_events(team_id);
CREATE INDEX IF NOT EXISTS idx_team_events_session ON team_events(session_id);

-- Unique session per team
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_events_unique 
    ON team_events(team_id, session_id);

-- ========================
-- 4. TEAM EVENT DEBRIEFS
-- ========================
CREATE TABLE IF NOT EXISTS team_event_debriefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    team_event_id UUID NOT NULL REFERENCES team_events(id) ON DELETE CASCADE,
    content_json JSONB NOT NULL,
    ai_model VARCHAR(100),
    ai_prompt_version VARCHAR(20),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_debriefs_event ON team_event_debriefs(team_event_id);
