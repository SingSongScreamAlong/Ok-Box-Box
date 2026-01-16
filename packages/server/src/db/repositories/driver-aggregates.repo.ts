/**
 * Driver Aggregates Repository
 * CRUD operations for computed rolling aggregates
 */

import { pool } from '../client.js';
import { DriverAggregate, WindowType } from '../../driverbox/types/idp.types.js';

// ========================
// Aggregate CRUD
// ========================

export interface CreateDriverAggregateDTO {
    driver_profile_id: string;
    car_name: string | null;
    track_name: string | null;
    discipline: string | null;
    window_type: WindowType;
    window_start: Date | null;
    window_end: Date | null;
    session_count: number;
    lap_count: number;
    avg_pace_percentile: number | null;
    best_pace_percentile: number | null;
    pace_trend: number | null;
    consistency_index: number | null;
    avg_std_dev_ms: number | null;
    risk_index: number | null;
    avg_incidents_per_100_laps: number | null;
    avg_positions_gained: number | null;
    start_performance_index: number | null;
    endurance_fitness_index: number | null;
}

export async function upsertDriverAggregate(dto: CreateDriverAggregateDTO): Promise<DriverAggregate> {
    const result = await pool.query<DriverAggregate>(
        `INSERT INTO driver_aggregates (
      driver_profile_id,
      car_name,
      track_name,
      discipline,
      window_type,
      window_start,
      window_end,
      session_count,
      lap_count,
      avg_pace_percentile,
      best_pace_percentile,
      pace_trend,
      consistency_index,
      avg_std_dev_ms,
      risk_index,
      avg_incidents_per_100_laps,
      avg_positions_gained,
      start_performance_index,
      endurance_fitness_index
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    ON CONFLICT (driver_profile_id, car_name, track_name, discipline, window_type)
    DO UPDATE SET
      window_start = EXCLUDED.window_start,
      window_end = EXCLUDED.window_end,
      session_count = EXCLUDED.session_count,
      lap_count = EXCLUDED.lap_count,
      avg_pace_percentile = EXCLUDED.avg_pace_percentile,
      best_pace_percentile = EXCLUDED.best_pace_percentile,
      pace_trend = EXCLUDED.pace_trend,
      consistency_index = EXCLUDED.consistency_index,
      avg_std_dev_ms = EXCLUDED.avg_std_dev_ms,
      risk_index = EXCLUDED.risk_index,
      avg_incidents_per_100_laps = EXCLUDED.avg_incidents_per_100_laps,
      avg_positions_gained = EXCLUDED.avg_positions_gained,
      start_performance_index = EXCLUDED.start_performance_index,
      endurance_fitness_index = EXCLUDED.endurance_fitness_index,
      computed_at = NOW()
    RETURNING *`,
        [
            dto.driver_profile_id,
            dto.car_name,
            dto.track_name,
            dto.discipline,
            dto.window_type,
            dto.window_start,
            dto.window_end,
            dto.session_count,
            dto.lap_count,
            dto.avg_pace_percentile,
            dto.best_pace_percentile,
            dto.pace_trend,
            dto.consistency_index,
            dto.avg_std_dev_ms,
            dto.risk_index,
            dto.avg_incidents_per_100_laps,
            dto.avg_positions_gained,
            dto.start_performance_index,
            dto.endurance_fitness_index,
        ]
    );
    return result.rows[0];
}

export async function getGlobalAggregate(
    driverProfileId: string,
    windowType: WindowType = 'all_time'
): Promise<DriverAggregate | null> {
    const result = await pool.query<DriverAggregate>(
        `SELECT * FROM driver_aggregates 
     WHERE driver_profile_id = $1 
       AND car_name IS NULL 
       AND track_name IS NULL 
       AND discipline IS NULL
       AND window_type = $2`,
        [driverProfileId, windowType]
    );
    return result.rows[0] || null;
}

export async function getAggregatesByContext(
    driverProfileId: string,
    options?: {
        carName?: string;
        trackName?: string;
        discipline?: string;
        windowType?: WindowType;
    }
): Promise<DriverAggregate[]> {
    let query = 'SELECT * FROM driver_aggregates WHERE driver_profile_id = $1';
    const params: unknown[] = [driverProfileId];
    let paramCount = 2;

    if (options?.carName !== undefined) {
        query += ` AND car_name = $${paramCount++}`;
        params.push(options.carName);
    }
    if (options?.trackName !== undefined) {
        query += ` AND track_name = $${paramCount++}`;
        params.push(options.trackName);
    }
    if (options?.discipline !== undefined) {
        query += ` AND discipline = $${paramCount++}`;
        params.push(options.discipline);
    }
    if (options?.windowType !== undefined) {
        query += ` AND window_type = $${paramCount++}`;
        params.push(options.windowType);
    }

    query += ' ORDER BY session_count DESC';

    const result = await pool.query<DriverAggregate>(query, params);
    return result.rows;
}

export async function getAllAggregatesForDriver(driverProfileId: string): Promise<DriverAggregate[]> {
    const result = await pool.query<DriverAggregate>(
        'SELECT * FROM driver_aggregates WHERE driver_profile_id = $1 ORDER BY window_type, session_count DESC',
        [driverProfileId]
    );
    return result.rows;
}
