/**
 * Session Metrics Repository
 * CRUD operations for computed session metrics
 */

import { pool } from '../client.js';
import { SessionMetrics } from '../../driverbox/types/idp.types.js';

// ========================
// Session Metrics CRUD
// ========================

export interface CreateSessionMetricsDTO {
    session_id: string;
    driver_profile_id: string;
    total_laps: number;
    valid_laps: number;
    best_lap_time_ms: number | null;
    median_lap_time_ms: number | null;
    mean_lap_time_ms: number | null;
    lap_time_std_dev_ms: number | null;
    pace_percentile: number | null;
    gap_to_leader_best_pct: number | null;
    incident_count: number;
    incidents_per_100_laps: number | null;
    finish_position: number | null;
    start_position: number | null;
    positions_gained: number | null;
    sof: number | null;
    irating_change: number | null;
    pace_dropoff_score: number | null;
    traffic_time_loss_ms: number | null;
}

export async function createSessionMetrics(dto: CreateSessionMetricsDTO): Promise<SessionMetrics> {
    const result = await pool.query<SessionMetrics>(
        `INSERT INTO session_metrics (
      session_id,
      driver_profile_id,
      total_laps,
      valid_laps,
      best_lap_time_ms,
      median_lap_time_ms,
      mean_lap_time_ms,
      lap_time_std_dev_ms,
      pace_percentile,
      gap_to_leader_best_pct,
      incident_count,
      incidents_per_100_laps,
      finish_position,
      start_position,
      positions_gained,
      sof,
      irating_change,
      pace_dropoff_score,
      traffic_time_loss_ms
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    ON CONFLICT (session_id, driver_profile_id) DO UPDATE SET
      total_laps = EXCLUDED.total_laps,
      valid_laps = EXCLUDED.valid_laps,
      best_lap_time_ms = EXCLUDED.best_lap_time_ms,
      median_lap_time_ms = EXCLUDED.median_lap_time_ms,
      mean_lap_time_ms = EXCLUDED.mean_lap_time_ms,
      lap_time_std_dev_ms = EXCLUDED.lap_time_std_dev_ms,
      pace_percentile = EXCLUDED.pace_percentile,
      gap_to_leader_best_pct = EXCLUDED.gap_to_leader_best_pct,
      incident_count = EXCLUDED.incident_count,
      incidents_per_100_laps = EXCLUDED.incidents_per_100_laps,
      finish_position = EXCLUDED.finish_position,
      start_position = EXCLUDED.start_position,
      positions_gained = EXCLUDED.positions_gained,
      sof = EXCLUDED.sof,
      irating_change = EXCLUDED.irating_change,
      pace_dropoff_score = EXCLUDED.pace_dropoff_score,
      traffic_time_loss_ms = EXCLUDED.traffic_time_loss_ms,
      computed_at = NOW()
    RETURNING *`,
        [
            dto.session_id,
            dto.driver_profile_id,
            dto.total_laps,
            dto.valid_laps,
            dto.best_lap_time_ms,
            dto.median_lap_time_ms,
            dto.mean_lap_time_ms,
            dto.lap_time_std_dev_ms,
            dto.pace_percentile,
            dto.gap_to_leader_best_pct,
            dto.incident_count,
            dto.incidents_per_100_laps,
            dto.finish_position,
            dto.start_position,
            dto.positions_gained,
            dto.sof,
            dto.irating_change,
            dto.pace_dropoff_score,
            dto.traffic_time_loss_ms,
        ]
    );
    return result.rows[0];
}

export async function getSessionMetrics(sessionId: string, driverProfileId: string): Promise<SessionMetrics | null> {
    const result = await pool.query<SessionMetrics>(
        'SELECT * FROM session_metrics WHERE session_id = $1 AND driver_profile_id = $2',
        [sessionId, driverProfileId]
    );
    return result.rows[0] || null;
}

export async function getMetricsForDriver(
    driverProfileId: string,
    limit: number = 50,
    offset: number = 0
): Promise<SessionMetrics[]> {
    const result = await pool.query<SessionMetrics>(
        `SELECT sm.* FROM session_metrics sm
     JOIN sessions s ON s.id = sm.session_id
     WHERE sm.driver_profile_id = $1
     ORDER BY s.started_at DESC
     LIMIT $2 OFFSET $3`,
        [driverProfileId, limit, offset]
    );
    return result.rows;
}

export async function getMetricsForContext(
    driverProfileId: string,
    carName?: string,
    trackName?: string,
    limit: number = 50
): Promise<SessionMetrics[]> {
    let query = `
    SELECT sm.* FROM session_metrics sm
    JOIN sessions s ON s.id = sm.session_id
    WHERE sm.driver_profile_id = $1
  `;
    const params: unknown[] = [driverProfileId];
    let paramCount = 2;

    if (carName) {
        query += ` AND s.metadata->>'car_name' = $${paramCount++}`;
        params.push(carName);
    }
    if (trackName) {
        query += ` AND s.track_name = $${paramCount++}`;
        params.push(trackName);
    }

    query += ` ORDER BY s.started_at DESC LIMIT $${paramCount}`;
    params.push(limit);

    const result = await pool.query<SessionMetrics>(query, params);
    return result.rows;
}
