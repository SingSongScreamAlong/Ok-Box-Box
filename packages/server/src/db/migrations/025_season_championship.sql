-- 025: Season & Championship Awareness
-- Tracks iRacing series seasons, schedules, and driver participation
-- Phase 4a: Championship / Season Awareness

-- Seasons table: represents an iRacing season (e.g., "2026 S1 GT3 Fixed")
CREATE TABLE IF NOT EXISTS iracing_seasons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id       INTEGER NOT NULL,          -- iRacing series ID
  series_name     TEXT NOT NULL,
  season_year     INTEGER NOT NULL,
  season_quarter  INTEGER NOT NULL CHECK (season_quarter BETWEEN 1 AND 4),
  week_count      INTEGER NOT NULL DEFAULT 12,
  drop_weeks      INTEGER NOT NULL DEFAULT 0,
  license_group   TEXT,                       -- 'road', 'oval', 'dirt_road', 'dirt_oval'
  car_class       TEXT,                       -- 'GT3', 'GTE', 'LMP2', etc.
  is_fixed        BOOLEAN DEFAULT false,
  is_official     BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(series_id, season_year, season_quarter)
);

-- Schedule table: per-week track assignments within a season
CREATE TABLE IF NOT EXISTS iracing_schedule (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id       UUID NOT NULL REFERENCES iracing_seasons(id) ON DELETE CASCADE,
  week_number     INTEGER NOT NULL CHECK (week_number >= 0),
  track_name      TEXT NOT NULL,
  track_config    TEXT,                       -- layout variant
  race_length     TEXT,                       -- e.g., '40 min', '45 laps'
  is_current_week BOOLEAN DEFAULT false,
  start_date      DATE,
  end_date        DATE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(season_id, week_number)
);

-- Driver season enrollment: tracks which seasons a driver is participating in
CREATE TABLE IF NOT EXISTS driver_season_enrollment (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_profile_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  season_id         UUID NOT NULL REFERENCES iracing_seasons(id) ON DELETE CASCADE,
  enrolled_at       TIMESTAMPTZ DEFAULT now(),
  priority          INTEGER DEFAULT 1,        -- 1 = primary series, 2+ = secondary
  target_position   INTEGER,                  -- championship goal position
  notes             TEXT,
  UNIQUE(driver_profile_id, season_id)
);

-- Driver season standings: rolling championship position
CREATE TABLE IF NOT EXISTS driver_season_standings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_profile_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  season_id         UUID NOT NULL REFERENCES iracing_seasons(id) ON DELETE CASCADE,
  week_number       INTEGER NOT NULL,
  championship_points INTEGER DEFAULT 0,
  position          INTEGER,
  races_counted     INTEGER DEFAULT 0,
  races_dropped     INTEGER DEFAULT 0,
  best_finish       INTEGER,
  avg_finish        NUMERIC(5,2),
  incidents_total   INTEGER DEFAULT 0,
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(driver_profile_id, season_id, week_number)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_schedule_season ON iracing_schedule(season_id);
CREATE INDEX IF NOT EXISTS idx_schedule_current ON iracing_schedule(is_current_week) WHERE is_current_week = true;
CREATE INDEX IF NOT EXISTS idx_enrollment_driver ON driver_season_enrollment(driver_profile_id);
CREATE INDEX IF NOT EXISTS idx_standings_driver ON driver_season_standings(driver_profile_id);
CREATE INDEX IF NOT EXISTS idx_standings_season ON driver_season_standings(season_id, week_number);
