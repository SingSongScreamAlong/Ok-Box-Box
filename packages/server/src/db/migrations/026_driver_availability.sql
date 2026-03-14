-- 026: Driver Availability Planner
-- Tracks driver availability for team endurance events
-- Phase 4b: Driver Availability Planner

CREATE TABLE IF NOT EXISTS driver_availability (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id           UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  driver_profile_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  event_date        DATE NOT NULL,
  event_name        TEXT,                        -- optional label
  available         BOOLEAN DEFAULT true,
  availability_type TEXT DEFAULT 'full',         -- 'full', 'partial', 'unavailable'
  start_time        TIME,                        -- for partial availability
  end_time          TIME,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, driver_profile_id, event_date)
);

CREATE INDEX IF NOT EXISTS idx_availability_team ON driver_availability(team_id, event_date);
CREATE INDEX IF NOT EXISTS idx_availability_driver ON driver_availability(driver_profile_id);
