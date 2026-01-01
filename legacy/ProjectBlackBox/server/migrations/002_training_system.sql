-- Training System Tables

CREATE TABLE IF NOT EXISTS training_goals (
  id TEXT PRIMARY KEY,
  driver_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- TrainingGoalType
  difficulty TEXT NOT NULL, -- TrainingDifficulty
  track_id TEXT NOT NULL,
  car_id TEXT,
  target_value DOUBLE PRECISION NOT NULL,
  current_value DOUBLE PRECISION NOT NULL DEFAULT 0,
  progress DOUBLE PRECISION NOT NULL DEFAULT 0, -- 0.0 to 1.0
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  metrics JSONB DEFAULT '{}'::jsonb, -- baseline, best, recent, etc.
  recommendations TEXT[]
);

CREATE TABLE IF NOT EXISTS badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL, -- BadgeType
  rarity TEXT NOT NULL, -- BadgeRarity
  icon TEXT NOT NULL,
  requirements JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS driver_badges (
  badge_id TEXT REFERENCES badges(id),
  driver_id TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (badge_id, driver_id)
);

CREATE TABLE IF NOT EXISTS skill_progression (
  driver_id TEXT PRIMARY KEY,
  skills JSONB NOT NULL DEFAULT '{}'::jsonb, -- Map of goal type to level/xp
  overall JSONB NOT NULL DEFAULT '{"level": 1, "experience": 0}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_sessions (
  id TEXT PRIMARY KEY,
  driver_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  goals TEXT[], -- Array of TrainingGoal IDs
  track_id TEXT NOT NULL,
  car_id TEXT NOT NULL,
  duration INTEGER NOT NULL, -- minutes
  completed BOOLEAN NOT NULL DEFAULT false,
  scheduled_for TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  results JSONB -- goalProgress, lapTimes, etc.
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_training_goals_driver ON training_goals(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_badges_driver ON driver_badges(driver_id);
