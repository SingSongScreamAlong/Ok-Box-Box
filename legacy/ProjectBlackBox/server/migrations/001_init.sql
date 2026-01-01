-- Enable TimescaleDB if it's installed on the server. If not installed, proceed without it.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'timescaledb') THEN
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS timescaledb';
  ELSE
    RAISE NOTICE 'TimescaleDB extension is not installed; proceeding without hypertables.';
  END IF;
END
$$;

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY,
  name TEXT,
  track TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Drivers (optional for now; driver_id in telemetry can be free-form string)
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name TEXT,
  number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Users for authentication
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- API keys for service authentication
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

-- Multi-driver sessions
CREATE TABLE IF NOT EXISTS multi_driver_sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  track TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Multi-driver participants
CREATE TABLE IF NOT EXISTS multi_driver_participants (
  session_id TEXT NOT NULL REFERENCES multi_driver_sessions(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'co-driver',
  status TEXT NOT NULL DEFAULT 'standby',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity TIMESTAMPTZ,
  PRIMARY KEY (session_id, driver_id)
);

-- Multi-driver switches log
CREATE TABLE IF NOT EXISTS multi_driver_switches (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES multi_driver_sessions(id) ON DELETE CASCADE,
  from_driver_id UUID REFERENCES users(id),
  to_driver_id UUID NOT NULL REFERENCES users(id),
  reason TEXT,
  switched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for multi-driver tables
CREATE INDEX IF NOT EXISTS idx_multi_driver_sessions_created_by ON multi_driver_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_multi_driver_participants_session ON multi_driver_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_multi_driver_switches_session ON multi_driver_switches(session_id);

-- Telemetry
CREATE TABLE IF NOT EXISTS telemetry (
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  driver_id TEXT,
  ts TIMESTAMPTZ NOT NULL,
  pos_x DOUBLE PRECISION,
  pos_y DOUBLE PRECISION,
  pos_z DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  throttle DOUBLE PRECISION,
  brake DOUBLE PRECISION,
  gear INTEGER,
  rpm DOUBLE PRECISION,
  lap INTEGER,
  sector INTEGER,
  tire_fl_temp DOUBLE PRECISION,
  tire_fl_wear DOUBLE PRECISION,
  tire_fl_pressure DOUBLE PRECISION,
  tire_fr_temp DOUBLE PRECISION,
  tire_fr_wear DOUBLE PRECISION,
  tire_fr_pressure DOUBLE PRECISION,
  tire_rl_temp DOUBLE PRECISION,
  tire_rl_wear DOUBLE PRECISION,
  tire_rl_pressure DOUBLE PRECISION,
  tire_rr_temp DOUBLE PRECISION,
  tire_rr_wear DOUBLE PRECISION,
  tire_rr_pressure DOUBLE PRECISION,
  g_lat DOUBLE PRECISION,
  g_long DOUBLE PRECISION,
  g_vert DOUBLE PRECISION,
  track_position DOUBLE PRECISION,
  race_position DOUBLE PRECISION,
  gap_ahead DOUBLE PRECISION,
  gap_behind DOUBLE PRECISION
);

-- Convert telemetry to hypertable if TimescaleDB is enabled; otherwise keep as a regular table.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
    PERFORM create_hypertable('telemetry', 'ts', if_not_exists => TRUE);
  ELSE
    RAISE NOTICE 'TimescaleDB not active; telemetry remains a regular table.';
  END IF;
END
$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_session_ts ON telemetry(session_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_session_driver_ts ON telemetry(session_id, driver_id, ts DESC);
