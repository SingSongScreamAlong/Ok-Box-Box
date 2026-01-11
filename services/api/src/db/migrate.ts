import { pool } from './index.js';
import { logger } from '../logger.js';

const migrations = [
  {
    name: '001_initial_schema',
    sql: `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE,
        machine_id VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Licenses table
      CREATE TABLE IF NOT EXISTS licenses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        tier VARCHAR(50) NOT NULL DEFAULT 'FREE',
        modules TEXT[] NOT NULL DEFAULT ARRAY['RACEBOX'],
        expires_at TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT TRUE,
        max_concurrent_sessions INT DEFAULT 1,
        max_stored_sessions INT DEFAULT 10,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Sessions table (race sessions)
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        subsession_id BIGINT,
        type VARCHAR(50),
        state VARCHAR(50),
        track_id INT,
        track_name VARCHAR(255),
        track_config VARCHAR(255),
        total_laps INT,
        is_race_session BOOLEAN DEFAULT FALSE,
        started_at TIMESTAMPTZ DEFAULT NOW(),
        ended_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Telemetry table (time-series)
      CREATE TABLE IF NOT EXISTS telemetry (
        id BIGSERIAL PRIMARY KEY,
        session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
        driver_id VARCHAR(255),
        ts TIMESTAMPTZ NOT NULL,
        lap INT,
        sector INT,
        position INT,
        speed REAL,
        throttle REAL,
        brake REAL,
        gear INT,
        rpm INT,
        fuel_level REAL,
        track_position REAL,
        gap_ahead REAL,
        gap_behind REAL,
        on_pit_road BOOLEAN,
        raw_data JSONB
      );

      -- Index for telemetry queries
      CREATE INDEX IF NOT EXISTS idx_telemetry_session_ts ON telemetry(session_id, ts);
      CREATE INDEX IF NOT EXISTS idx_telemetry_session_driver ON telemetry(session_id, driver_id);

      -- Timing snapshots table
      CREATE TABLE IF NOT EXISTS timing_snapshots (
        id BIGSERIAL PRIMARY KEY,
        session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
        ts TIMESTAMPTZ NOT NULL,
        entries JSONB NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_timing_session_ts ON timing_snapshots(session_id, ts);
    `,
  },
];

async function migrate() {
  logger.info('Running database migrations...');
  
  // Create migrations tracking table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      name VARCHAR(255) PRIMARY KEY,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  for (const migration of migrations) {
    const exists = await pool.query(
      'SELECT 1 FROM migrations WHERE name = $1',
      [migration.name]
    );

    if (exists.rowCount === 0) {
      logger.info(`Running migration: ${migration.name}`);
      await pool.query(migration.sql);
      await pool.query(
        'INSERT INTO migrations (name) VALUES ($1)',
        [migration.name]
      );
      logger.info(`Migration ${migration.name} completed`);
    } else {
      logger.debug(`Migration ${migration.name} already applied`);
    }
  }

  logger.info('All migrations completed');
  await pool.end();
}

migrate().catch((err) => {
  logger.error('Migration failed:', err);
  process.exit(1);
});
