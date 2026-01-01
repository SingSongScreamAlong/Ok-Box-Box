import 'dotenv/config';
import { Pool } from 'pg';

const connectionString = process.env.PG_CONNECTION_STRING || process.env.DATABASE_URL || 'postgres://localhost:5432/pitbox_telemetry';

// Debug: Log connection string (mask password)
console.log('[DB] Connection string:', connectionString.replace(/:[^:@]+@/, ':***@'));

export const pool = new Pool({
  connectionString,
  // Fail fast if DB is unreachable instead of hanging
  connectionTimeoutMillis: Number(process.env.PG_CONN_TIMEOUT_MS ?? 5000),
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS ?? 30000),
  max: Number(process.env.PG_POOL_MAX ?? 10),
});

// Handle pool errors to prevent silent hangs
pool.on('error', (err) => {
  console.error('[DB] Pool error:', err.message);
});

pool.on('connect', () => {
  console.log('[DB] New client connected to pool');
});

export async function ping(): Promise<boolean> {
  try {
    const res = await pool.query('SELECT 1 as ok');
    return res.rows?.[0]?.ok === 1;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[DB] ping failed', e);
    return false;
  }
}

export async function withTx<T>(fn: (client: import('pg').PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function setStatementTimeout(ms: number): Promise<void> {
  // SET commands don't support parameters, but input is sanitized number
  const timeoutMs = Math.max(0, Math.floor(ms));
  await pool.query(`SET statement_timeout = ${timeoutMs}`);
}
