import NodeCache from 'node-cache';
import { pool } from './db.js';
import { logPerformance, logDatabaseOperation } from './logger.js';

// Cache configuration
export const telemetryCache = new NodeCache({
  stdTTL: 300, // 5 minutes default TTL
  checkperiod: 60, // Check for expired keys every 60 seconds
  useClones: false, // Don't clone objects for better performance
});

export const sessionCache = new NodeCache({
  stdTTL: 600, // 10 minutes for session data
  checkperiod: 120,
  useClones: false,
});

// Cache keys
const CACHE_KEYS = {
  TELEMETRY_PREFIX: 'telemetry:',
  SESSION_PREFIX: 'session:',
  USER_SESSIONS_PREFIX: 'user_sessions:',
  MULTI_DRIVER_PREFIX: 'multi_driver:',
};

// Telemetry caching functions
export const getCachedTelemetry = (sessionId: string, fromTs?: number, toTs?: number, driverId?: string): any[] | null => {
  const cacheKey = `${CACHE_KEYS.TELEMETRY_PREFIX}${sessionId}:${fromTs || 'start'}:${toTs || 'end'}:${driverId || 'all'}`;
  return telemetryCache.get(cacheKey) as any[] | null;
};

export const setCachedTelemetry = (sessionId: string, data: any[], fromTs?: number, toTs?: number, driverId?: string): void => {
  const cacheKey = `${CACHE_KEYS.TELEMETRY_PREFIX}${sessionId}:${fromTs || 'start'}:${toTs || 'end'}:${driverId || 'all'}`;
  telemetryCache.set(cacheKey, data);
};

export const invalidateTelemetryCache = (sessionId: string): void => {
  const keys = telemetryCache.keys();
  const sessionKeys = keys.filter(key => key.startsWith(`${CACHE_KEYS.TELEMETRY_PREFIX}${sessionId}`));
  sessionKeys.forEach(key => telemetryCache.del(key));
};

// Session caching functions
export const getCachedSession = (sessionId: string): any | null => {
  const cacheKey = `${CACHE_KEYS.SESSION_PREFIX}${sessionId}`;
  return sessionCache.get(cacheKey) as any | null;
};

export const setCachedSession = (sessionId: string, sessionData: any): void => {
  const cacheKey = `${CACHE_KEYS.SESSION_PREFIX}${sessionId}`;
  sessionCache.set(cacheKey, sessionData);
};

export const invalidateSessionCache = (sessionId: string): void => {
  const cacheKey = `${CACHE_KEYS.SESSION_PREFIX}${sessionId}`;
  sessionCache.del(cacheKey);
};

// User sessions caching
export const getCachedUserSessions = (userId: string): any[] | null => {
  const cacheKey = `${CACHE_KEYS.USER_SESSIONS_PREFIX}${userId}`;
  return sessionCache.get(cacheKey) as any[] | null;
};

export const setCachedUserSessions = (userId: string, sessions: any[]): void => {
  const cacheKey = `${CACHE_KEYS.USER_SESSIONS_PREFIX}${userId}`;
  sessionCache.set(cacheKey, sessions);
};

export const invalidateUserSessionsCache = (userId: string): void => {
  const cacheKey = `${CACHE_KEYS.USER_SESSIONS_PREFIX}${userId}`;
  sessionCache.del(cacheKey);
};

// Multi-driver caching
export const getCachedMultiDriverSession = (sessionId: string): any | null => {
  const cacheKey = `${CACHE_KEYS.MULTI_DRIVER_PREFIX}${sessionId}`;
  return sessionCache.get(cacheKey) as any | null;
};

export const setCachedMultiDriverSession = (sessionId: string, sessionData: any): void => {
  const cacheKey = `${CACHE_KEYS.MULTI_DRIVER_PREFIX}${sessionId}`;
  sessionCache.set(cacheKey, sessionData);
};

export const invalidateMultiDriverCache = (sessionId: string): void => {
  const cacheKey = `${CACHE_KEYS.MULTI_DRIVER_PREFIX}${sessionId}`;
  sessionCache.del(cacheKey);
};

// Database query optimization
export class QueryOptimizer {
  private static preparedStatements = new Map<string, string>();

  static async executeOptimizedQuery(queryName: string, sql: string, params: any[] = []): Promise<any> {
    const startTime = Date.now();

    try {
      const result = await pool.query(sql, params);
      const duration = Date.now() - startTime;

      logDatabaseOperation('execute', queryName, duration, true);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logDatabaseOperation('execute', queryName, duration, false, { error: (error as Error).message });
      throw error;
    }
  }

  static async getTelemetryOptimized(
    sessionId: string,
    fromTs?: number,
    toTs?: number,
    driverId?: string,
    limit: number = 20000
  ): Promise<any[]> {
    const conditions: string[] = ['session_id = $1'];
    const params: any[] = [sessionId];
    let paramIndex = 2;

    if (fromTs !== undefined) {
      conditions.push(`ts >= to_timestamp($${paramIndex} / 1000.0)`);
      params.push(fromTs);
      paramIndex++;
    }

    if (toTs !== undefined) {
      conditions.push(`ts <= to_timestamp($${paramIndex} / 1000.0)`);
      params.push(toTs);
      paramIndex++;
    }

    if (driverId) {
      conditions.push(`driver_id = $${paramIndex}`);
      params.push(driverId);
      paramIndex++;
    }

    params.push(limit);

    const sql = `
      SELECT
        driver_id,
        extract(epoch from ts) * 1000 as ts_ms,
        pos_x, pos_y, pos_z,
        speed, throttle, brake, gear, rpm,
        lap, sector,
        tire_fl_temp, tire_fl_wear, tire_fl_pressure,
        tire_fr_temp, tire_fr_wear, tire_fr_pressure,
        tire_rl_temp, tire_rl_wear, tire_rl_pressure,
        tire_rr_temp, tire_rr_wear, tire_rr_pressure,
        g_lat, g_long, g_vert,
        track_position, race_position,
        gap_ahead, gap_behind
      FROM telemetry
      WHERE ${conditions.join(' AND ')}
      ORDER BY ts ASC
      LIMIT $${paramIndex}
    `;

    const result = await this.executeOptimizedQuery('get_telemetry_optimized', sql, params);
    return result.rows;
  }

  static async insertTelemetryBatch(sessionId: string, telemetryData: any[]): Promise<void> {
    if (telemetryData.length === 0) return;

    const startTime = Date.now();

    const values: any[] = [];
    const placeholders: string[] = [];
    let paramIndex = 1;

    for (const data of telemetryData) {
      placeholders.push(`($${paramIndex++}, $${paramIndex++}, to_timestamp($${paramIndex++} / 1000.0), $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);

      values.push(
        sessionId,
        data.driverId || null,
        data.timestamp,
        data.position?.x || null,
        data.position?.y || null,
        data.position?.z || null,
        data.speed || null,
        data.throttle || null,
        data.brake || null,
        data.gear || null,
        data.rpm || null,
        data.lap || null,
        data.sector || null,
        data.tires?.frontLeft?.temp || null,
        data.tires?.frontLeft?.wear || null,
        data.tires?.frontLeft?.pressure || null,
        data.tires?.frontRight?.temp || null,
        data.tires?.frontRight?.wear || null,
        data.tires?.frontRight?.pressure || null,
        data.tires?.rearLeft?.temp || null,
        data.tires?.rearLeft?.wear || null,
        data.tires?.rearLeft?.pressure || null,
        data.tires?.rearRight?.temp || null,
        data.tires?.rearRight?.wear || null,
        data.tires?.rearRight?.pressure || null,
        data.gForce?.lateral || null,
        data.gForce?.longitudinal || null,
        data.gForce?.vertical || null,
        data.trackPosition || null,
        data.racePosition || null,
        data.gapAhead || null,
        data.gapBehind || null
      );
    }

    const sql = `
      INSERT INTO telemetry (
        session_id, driver_id, ts, pos_x, pos_y, pos_z, speed, throttle, brake,
        gear, rpm, lap, sector, tire_fl_temp, tire_fl_wear, tire_fl_pressure,
        tire_fr_temp, tire_fr_wear, tire_fr_pressure, tire_rl_temp, tire_rl_wear,
        tire_rl_pressure, tire_rr_temp, tire_rr_wear, tire_rr_pressure,
        g_lat, g_long, g_vert, track_position, race_position, gap_ahead, gap_behind
      ) VALUES ${placeholders.join(', ')}
    `;

    await this.executeOptimizedQuery('insert_telemetry_batch', sql, values);

    const duration = Date.now() - startTime;
    logPerformance('telemetry_batch_insert', startTime, {
      recordCount: telemetryData.length,
      recordsPerSecond: Math.round(telemetryData.length / (duration / 1000))
    });
  }
}

// Connection pool monitoring
export class ConnectionPoolMonitor {
  private static monitoringActive = false;

  static startMonitoring(intervalMs: number = 30000): void {
    if (this.monitoringActive) return;

    this.monitoringActive = true;

    setInterval(async () => {
      try {
        const poolStats = {
          totalCount: pool.totalCount,
          idleCount: pool.idleCount,
          waitingCount: pool.waitingCount,
        };

        // Log pool statistics
        logDatabaseOperation('pool_stats', 'connection_pool', 0, true, poolStats);

        // Alert if pool is under stress
        if (poolStats.waitingCount > 5) {
          logDatabaseOperation('pool_warning', 'connection_pool', 0, false, {
            message: 'High connection pool wait count',
            ...poolStats
          });
        }
      } catch (error) {
        logDatabaseOperation('pool_error', 'connection_pool', 0, false, {
          error: (error as Error).message
        });
      }
    }, intervalMs);
  }

  static stopMonitoring(): void {
    this.monitoringActive = false;
  }
}

// Index optimization suggestions
export class IndexOptimizer {
  static async analyzeQueryPerformance(): Promise<void> {
    // Analyze slow queries and suggest indexes
    const slowQueries = await pool.query(`
      SELECT query, mean_time, calls
      FROM pg_stat_statements
      WHERE mean_time > 1000  -- Queries taking more than 1 second on average
      ORDER BY mean_time DESC
      LIMIT 10
    `);

    if (slowQueries.rows.length > 0) {
      logDatabaseOperation('slow_queries_analysis', 'pg_stat_statements', 0, true, {
        slowQueryCount: slowQueries.rows.length,
        slowestQueries: slowQueries.rows
      });
    }
  }

  static async suggestIndexes(): Promise<string[]> {
    const suggestions: string[] = [];

    // Check for missing indexes on frequently queried columns
    const telemetryQueries = await pool.query(`
      SELECT attname, n_distinct, correlation
      FROM pg_stats
      WHERE tablename = 'telemetry'
      AND attname IN ('session_id', 'driver_id', 'ts', 'lap')
      ORDER BY n_distinct DESC
    `);

    for (const stat of telemetryQueries.rows) {
      if (stat.n_distinct > 1000) { // High cardinality column
        suggestions.push(`CREATE INDEX IF NOT EXISTS idx_telemetry_${stat.attname} ON telemetry(${stat.attname});`);
      }
    }

    return suggestions;
  }
}

// Memory usage monitoring
export class MemoryMonitor {
  private static monitoringActive = false;

  static startMonitoring(intervalMs: number = 60000): void {
    if (this.monitoringActive) return;

    this.monitoringActive = true;

    setInterval(() => {
      const memUsage = process.memoryUsage();

      logPerformance('memory_usage', Date.now(), {
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024), // MB
      });

      // Alert if memory usage is high
      const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      if (heapUsagePercent > 85) {
        logDatabaseOperation('memory_warning', 'process_memory', 0, false, {
          message: 'High memory usage detected',
          heapUsagePercent: Math.round(heapUsagePercent),
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024)
        });
      }
    }, intervalMs);
  }

  static stopMonitoring(): void {
    this.monitoringActive = false;
  }
}

// Graceful cache cleanup
export const cleanupCaches = (): void => {
  telemetryCache.flushAll();
  sessionCache.flushAll();
  logPerformance('cache_cleanup', Date.now(), { message: 'All caches cleared' });
};

// Export cache statistics
export const getCacheStats = () => ({
  telemetry: {
    keys: telemetryCache.keys().length,
    hits: telemetryCache.getStats().hits,
    misses: telemetryCache.getStats().misses,
  },
  session: {
    keys: sessionCache.keys().length,
    hits: sessionCache.getStats().hits,
    misses: sessionCache.getStats().misses,
  },
});
