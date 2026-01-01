/**
 * Lap Repository
 * 
 * Persists lap data to the database for historical analysis.
 * Enables post-session review and cross-session performance tracking.
 */

import { pool } from '../../db/client.js';
import type { LapData } from './types.js';

export interface StoredLap extends LapData {
    id: string;
    sessionId: string;
    driverId: string;
    createdAt: Date;
}

export interface LapQueryOptions {
    sessionId?: string;
    driverId?: string;
    cleanOnly?: boolean;
    limit?: number;
    offset?: number;
}

export class LapRepository {
    /**
     * Save a completed lap to the database
     */
    async saveLap(sessionId: string, driverId: string, lap: LapData): Promise<StoredLap | null> {
        try {
            const result = await pool.query<any>(
                `INSERT INTO lap_data (
                    session_id, driver_id, lap_number, lap_time_ms,
                    fuel_used, fuel_remaining,
                    tire_wear_fl, tire_wear_fr, tire_wear_rl, tire_wear_rr,
                    is_clean, is_in_lap, is_out_lap, had_traffic, had_yellow, is_personal_best,
                    timestamp_ms
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                RETURNING *`,
                [
                    sessionId,
                    driverId,
                    lap.lapNumber,
                    lap.lapTimeMs,
                    lap.fuelUsed,
                    lap.fuelRemaining,
                    lap.tireWear.fl,
                    lap.tireWear.fr,
                    lap.tireWear.rl,
                    lap.tireWear.rr,
                    lap.flags.isClean,
                    lap.flags.isInLap,
                    lap.flags.isOutLap,
                    lap.flags.hadTraffic,
                    lap.flags.hadYellow,
                    lap.flags.isPersonalBest,
                    lap.timestamp
                ]
            );

            if (result.rows.length === 0) {
                return null;
            }

            return this.mapRowToStoredLap(result.rows[0]);
        } catch (error) {
            console.error('Failed to save lap:', error);
            return null;
        }
    }

    /**
     * Query laps with filters
     */
    async queryLaps(options: LapQueryOptions = {}): Promise<StoredLap[]> {
        const conditions: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        if (options.sessionId) {
            conditions.push(`session_id = $${paramIndex++}`);
            params.push(options.sessionId);
        }

        if (options.driverId) {
            conditions.push(`driver_id = $${paramIndex++}`);
            params.push(options.driverId);
        }

        if (options.cleanOnly) {
            conditions.push(`is_clean = true AND is_in_lap = false AND is_out_lap = false`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const limitClause = options.limit ? `LIMIT $${paramIndex++}` : '';
        if (options.limit) params.push(options.limit);

        const offsetClause = options.offset ? `OFFSET $${paramIndex++}` : '';
        if (options.offset) params.push(options.offset);

        const query = `
            SELECT * FROM lap_data
            ${whereClause}
            ORDER BY timestamp_ms DESC
            ${limitClause}
            ${offsetClause}
        `;

        try {
            const result = await pool.query<any>(query, params);
            return result.rows.map(row => this.mapRowToStoredLap(row));
        } catch (error) {
            console.error('Failed to query laps:', error);
            return [];
        }
    }

    /**
     * Get driver's best lap time for a session
     */
    async getDriverBestLap(sessionId: string, driverId: string): Promise<StoredLap | null> {
        try {
            const result = await pool.query<any>(
                `SELECT * FROM lap_data
                WHERE session_id = $1 AND driver_id = $2
                    AND is_clean = true AND is_in_lap = false AND is_out_lap = false
                ORDER BY lap_time_ms ASC
                LIMIT 1`,
                [sessionId, driverId]
            );

            if (result.rows.length === 0) {
                return null;
            }

            return this.mapRowToStoredLap(result.rows[0]);
        } catch (error) {
            console.error('Failed to get best lap:', error);
            return null;
        }
    }

    /**
     * Get session statistics
     */
    async getSessionStats(sessionId: string): Promise<{
        totalLaps: number;
        drivers: number;
        bestLapTime: number | null;
        bestLapDriver: string | null;
    }> {
        try {
            const result = await pool.query<any>(
                `SELECT 
                    COUNT(*) as total_laps,
                    COUNT(DISTINCT driver_id) as drivers,
                    MIN(CASE WHEN is_clean AND NOT is_in_lap AND NOT is_out_lap THEN lap_time_ms END) as best_lap_time
                FROM lap_data
                WHERE session_id = $1`,
                [sessionId]
            );

            const stats = result.rows[0];

            // Get best lap driver
            let bestLapDriver: string | null = null;
            if (stats.best_lap_time) {
                const bestResult = await pool.query<any>(
                    `SELECT driver_id FROM lap_data
                    WHERE session_id = $1 AND lap_time_ms = $2
                    LIMIT 1`,
                    [sessionId, stats.best_lap_time]
                );
                if (bestResult.rows.length > 0) {
                    bestLapDriver = bestResult.rows[0].driver_id;
                }
            }

            return {
                totalLaps: parseInt(stats.total_laps) || 0,
                drivers: parseInt(stats.drivers) || 0,
                bestLapTime: stats.best_lap_time ? parseInt(stats.best_lap_time) : null,
                bestLapDriver
            };
        } catch (error) {
            console.error('Failed to get session stats:', error);
            return { totalLaps: 0, drivers: 0, bestLapTime: null, bestLapDriver: null };
        }
    }

    /**
     * Map database row to StoredLap object
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private mapRowToStoredLap(row: any): StoredLap {
        return {
            id: row.id,
            sessionId: row.session_id,
            driverId: row.driver_id,
            lapNumber: row.lap_number,
            lapTimeMs: row.lap_time_ms,
            fuelUsed: row.fuel_used,
            fuelRemaining: row.fuel_remaining,
            tireWear: {
                fl: row.tire_wear_fl,
                fr: row.tire_wear_fr,
                rl: row.tire_wear_rl,
                rr: row.tire_wear_rr
            },
            flags: {
                isClean: row.is_clean,
                isInLap: row.is_in_lap,
                isOutLap: row.is_out_lap,
                hadTraffic: row.had_traffic,
                hadYellow: row.had_yellow,
                isPersonalBest: row.is_personal_best
            },
            timestamp: row.timestamp_ms,
            createdAt: row.created_at
        };
    }
}

// Singleton instance
let lapRepository: LapRepository | null = null;

export function getLapRepository(): LapRepository {
    if (!lapRepository) {
        lapRepository = new LapRepository();
    }
    return lapRepository;
}
