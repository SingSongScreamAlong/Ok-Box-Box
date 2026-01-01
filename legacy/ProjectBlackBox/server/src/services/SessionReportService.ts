/**
 * Session Report Service
 * Generates comprehensive post-session analysis reports
 */

import { pool } from '../db.js';

export interface SessionReport {
    sessionId: string;
    sessionName: string;
    track: string;
    createdAt: number;

    // Summary Stats
    totalLaps: number;
    bestLapTime: number;
    averageLapTime: number;
    consistency: number; // Standard deviation as %

    // Performance
    topSpeed: number;
    averageSpeed: number;
    totalDistance: number;

    // Incidents
    incidentCount: number;

    // Lap Times
    lapTimes: { lap: number; time: number; delta: number }[];

    // Recommendations (simple rule-based for now)
    recommendations: string[];
}

class SessionReportService {

    async generateReport(sessionId: string): Promise<SessionReport | null> {
        // Get session info
        const sessionRes = await pool.query(
            'SELECT id, name, track, extract(epoch from created_at)*1000 as created_at FROM sessions WHERE id = $1',
            [sessionId]
        );

        if (sessionRes.rowCount === 0) return null;
        const session = sessionRes.rows[0];

        // Get telemetry aggregates
        const statsRes = await pool.query(`
      SELECT 
        MAX(lap) as total_laps,
        MAX(speed) as top_speed,
        AVG(speed) as avg_speed,
        COUNT(*) as sample_count
      FROM telemetry 
      WHERE session_id = $1
    `, [sessionId]);

        const stats = statsRes.rows[0];

        // Get lap times (simplified - time between lap number changes)
        const lapTimesRes = await pool.query(`
      WITH lap_boundaries AS (
        SELECT lap, MIN(ts) as lap_start, MAX(ts) as lap_end
        FROM telemetry
        WHERE session_id = $1 AND lap > 0
        GROUP BY lap
      )
      SELECT lap, EXTRACT(EPOCH FROM (lap_end - lap_start)) as lap_time
      FROM lap_boundaries
      ORDER BY lap
    `, [sessionId]);

        const lapTimes = lapTimesRes.rows
            .filter(r => r.lap_time > 10 && r.lap_time < 600) // Filter invalid laps
            .map(r => ({
                lap: parseInt(r.lap),
                time: parseFloat(r.lap_time),
                delta: 0
            }));

        // Calculate best lap and deltas
        const times = lapTimes.map(l => l.time);
        const bestLapTime = times.length > 0 ? Math.min(...times) : 0;
        const averageLapTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;

        lapTimes.forEach(l => {
            l.delta = l.time - bestLapTime;
        });

        // Calculate consistency (lower = more consistent)
        const consistency = times.length > 1
            ? (this.standardDeviation(times) / averageLapTime) * 100
            : 0;

        // Generate recommendations
        const recommendations = this.generateRecommendations({
            consistency,
            lapTimes,
            topSpeed: stats.top_speed || 0
        });

        return {
            sessionId,
            sessionName: session.name || 'Unnamed Session',
            track: session.track || 'Unknown Track',
            createdAt: Math.round(session.created_at),
            totalLaps: parseInt(stats.total_laps) || 0,
            bestLapTime,
            averageLapTime,
            consistency: Math.round(consistency * 100) / 100,
            topSpeed: Math.round(stats.top_speed * 3.6) || 0, // m/s to km/h
            averageSpeed: Math.round(stats.avg_speed * 3.6) || 0,
            totalDistance: 0, // Would need track length
            incidentCount: 0, // Would need incident tracking
            lapTimes,
            recommendations
        };
    }

    private standardDeviation(values: number[]): number {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const squareDiffs = values.map(v => Math.pow(v - avg, 2));
        return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / values.length);
    }

    private generateRecommendations(data: { consistency: number; lapTimes: any[]; topSpeed: number }): string[] {
        const recs: string[] = [];

        if (data.consistency > 3) {
            recs.push('Focus on consistency - lap times vary significantly. Try to hit the same braking points each lap.');
        }

        if (data.lapTimes.length >= 3) {
            const lastThree = data.lapTimes.slice(-3);
            const improving = lastThree[2]?.time < lastThree[0]?.time;
            if (improving) {
                recs.push('Good progress! Your recent laps are faster than earlier ones.');
            }
        }

        if (data.lapTimes.length < 5) {
            recs.push('Complete more laps to build a better data set for analysis.');
        }

        if (recs.length === 0) {
            recs.push('Solid session! Continue practicing to improve consistency.');
        }

        return recs;
    }
}

export default new SessionReportService();
