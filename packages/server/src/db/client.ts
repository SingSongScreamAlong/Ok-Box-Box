// =====================================================================
// Database Client
// =====================================================================

import { Pool, PoolConfig } from 'pg';
import { config } from '../config/index.js';

// Configure SSL for production (DigitalOcean managed databases use self-signed certs)
// Also accept when DATABASE_URL is explicitly set (not the localhost default)
const isExternalDb = !!process.env.DATABASE_URL && !config.databaseUrl.includes('localhost');
const poolConfig: PoolConfig = {
    connectionString: config.databaseUrl,
    max: config.databasePoolSize,
    ssl: (process.env.NODE_ENV === 'production' || isExternalDb) ? { rejectUnauthorized: false } : undefined,
};

console.log(`   DB SSL: ${poolConfig.ssl ? 'enabled (rejectUnauthorized: false)' : 'disabled'}, NODE_ENV=${process.env.NODE_ENV}, isExternalDb=${isExternalDb}`);
export const pool = new Pool(poolConfig);

export async function initializeDatabase(): Promise<void> {
    // Test the connection
    const client = await pool.connect();
    try {
        await client.query('SELECT NOW()');
    } finally {
        client.release();
    }
}

export async function query<T = unknown>(
    text: string,
    params?: unknown[]
): Promise<T[]> {
    const result = await pool.query(text, params);
    return result.rows as T[];
}

export async function queryOne<T = unknown>(
    text: string,
    params?: unknown[]
): Promise<T | null> {
    const rows = await query<T>(text, params);
    return rows[0] || null;
}

// Graceful shutdown
process.on('SIGTERM', () => pool.end());
process.on('SIGINT', () => pool.end());
