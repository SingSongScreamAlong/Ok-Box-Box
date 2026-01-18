-- =====================================================================
-- iRacing Profile Data Migration
-- Migration: 005_iracing_profiles.sql
-- =====================================================================

-- ========================
-- iRacing Profiles Table
-- ========================
-- Stores cached iRacing profile data for linked users
-- Synced automatically on login and via background job

CREATE TABLE IF NOT EXISTS iracing_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    iracing_customer_id VARCHAR(50) NOT NULL,
    
    -- Identity
    display_name VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    
    -- Ratings (stored as integers, divide by 100 for display)
    irating_oval INTEGER,
    irating_road INTEGER,
    irating_dirt_oval INTEGER,
    irating_dirt_road INTEGER,
    
    -- Safety Ratings (stored as integers, divide by 100 for display)
    sr_oval INTEGER,  -- e.g., 399 = A 3.99
    sr_road INTEGER,
    sr_dirt_oval INTEGER,
    sr_dirt_road INTEGER,
    
    -- License Levels
    license_oval VARCHAR(10),       -- e.g., "A", "B", "C", "D", "R"
    license_road VARCHAR(10),
    license_dirt_oval VARCHAR(10),
    license_dirt_road VARCHAR(10),
    
    -- Account Info
    member_since DATE,
    club_id INTEGER,
    club_name VARCHAR(100),
    
    -- Helmet/Avatar (for display)
    helmet_pattern INTEGER,
    helmet_color1 VARCHAR(10),
    helmet_color2 VARCHAR(10),
    helmet_color3 VARCHAR(10),
    
    -- Sync Metadata
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sync_error TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(admin_user_id),
    UNIQUE(iracing_customer_id)
);

-- ========================
-- Indexes
-- ========================

CREATE INDEX IF NOT EXISTS idx_iracing_profiles_user ON iracing_profiles(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_iracing_profiles_customer ON iracing_profiles(iracing_customer_id);
CREATE INDEX IF NOT EXISTS idx_iracing_profiles_sync ON iracing_profiles(last_synced_at);

-- ========================
-- Updated At Trigger
-- ========================

CREATE OR REPLACE FUNCTION update_iracing_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_iracing_profiles_updated_at ON iracing_profiles;
CREATE TRIGGER trigger_iracing_profiles_updated_at
    BEFORE UPDATE ON iracing_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_iracing_profiles_updated_at();

-- ========================
-- Comments
-- ========================

COMMENT ON TABLE iracing_profiles IS 'Cached iRacing profile data, auto-synced on login and via background job';
COMMENT ON COLUMN iracing_profiles.irating_road IS 'Road iRating as integer (divide by 100 for display, e.g., 250000 = 2500.00)';
COMMENT ON COLUMN iracing_profiles.sr_road IS 'Road Safety Rating as integer (e.g., 399 = A 3.99)';
