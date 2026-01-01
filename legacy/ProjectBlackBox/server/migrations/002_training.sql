-- Training Goals (Likely new, but use IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS training_goals (
  id UUID PRIMARY KEY,
  driver_id UUID NOT NULL, 
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, 
  difficulty TEXT DEFAULT 'medium',
  track_id TEXT,
  target_value DOUBLE PRECISION NOT NULL,
  current_value DOUBLE PRECISION DEFAULT 0,
  progress DOUBLE PRECISION DEFAULT 0, 
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Training Badges (Renamed from badges to avoid conflict)
CREATE TABLE IF NOT EXISTS training_badges (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  tier TEXT DEFAULT 'bronze',
  requirements JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Earned Badges
CREATE TABLE IF NOT EXISTS training_driver_badges (
  id UUID PRIMARY KEY,
  driver_id UUID NOT NULL,
  badge_id UUID NOT NULL REFERENCES training_badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- Seed Badges (Upsert)
INSERT INTO training_badges (id, name, description, icon, tier) VALUES
('b1000000-0000-0000-0000-000000000001', 'Speed Demon', 'Reach a top speed of 320 km/h', '🚀', 'gold'),
('b1000000-0000-0000-0000-000000000002', 'Consistency King', 'Complete 10 laps within 0.1s', '🎯', 'gold'),
('b1000000-0000-0000-0000-000000000003', 'Marathon', 'Complete a full race distance', '🏃', 'silver'),
('b1000000-0000-0000-0000-000000000004', 'Clean Racing', 'Finish a race with 0 incidents', '✨', 'silver'),
('b1000000-0000-0000-0000-000000000005', 'First Win', 'Win your first race', '🏆', 'platinum')
ON CONFLICT (id) DO UPDATE 
SET tier = EXCLUDED.tier, icon = EXCLUDED.icon;


