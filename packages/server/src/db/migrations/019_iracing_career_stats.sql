-- =====================================================================
-- iRacing Career Stats Migration
-- Migration: 019_iracing_career_stats.sql
-- =====================================================================
-- Adds a JSONB column to iracing_profiles for storing lifetime career
-- stats fetched from iRacing /data/stats/member_career endpoint.
-- This provides accurate lifetime wins/starts/top5s/poles instead of
-- computing from the limited 90-day race results window.

ALTER TABLE iracing_profiles
    ADD COLUMN IF NOT EXISTS career_stats_json JSONB,
    ADD COLUMN IF NOT EXISTS career_stats_synced_at TIMESTAMPTZ;

COMMENT ON COLUMN iracing_profiles.career_stats_json IS 
    'Lifetime career stats per category from iRacing /data/stats/member_career endpoint';
COMMENT ON COLUMN iracing_profiles.career_stats_synced_at IS 
    'When career stats were last fetched from iRacing';
