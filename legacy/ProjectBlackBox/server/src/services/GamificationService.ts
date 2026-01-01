import { pool } from '../db.js';
import { TelemetryData } from '../server.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service to process telemetry and update training progress/badges
 */
class GamificationService {

    // Cache badge definitions to avoid DB hits on every request
    private badgeCache: Map<string, any> | null = null;
    private lastProcessedTime: number = 0;

    async processBatch(sessionId: string, data: TelemetryData[]) {
        // Debounce or sample? Telemetry comes at 60Hz.
        // We can process every Nth sample or checking every batch is fine if logic is simple.

        // Ensure we have badge definitions
        if (!this.badgeCache) {
            await this.loadBadges();
        }

        for (const point of data) {
            if (!point.driverId) continue;

            await this.checkBadges(point);
            await this.updateGoals(point);
        }
    }

    private async loadBadges() {
        try {
            const res = await pool.query('SELECT * FROM training_badges');
            this.badgeCache = new Map();
            res.rows.forEach(b => this.badgeCache!.set(b.name, b));
        } catch (e) {
            console.error('[Gamification] Failed to load badges', e);
        }
    }

    private async checkBadges(point: TelemetryData) {
        // 1. Speed Demon (> 320 km/h)
        // In iRacing speed might be m/s. 320 km/h = 88.8 m/s.
        // Let's assume point.speed is m/s (standard SI).
        const speedKmph = (point.speed || 0) * 3.6;

        if (speedKmph > 320) {
            await this.awardBadge(point.driverId!, 'Speed Demon', { topSpeed: speedKmph });
        }

        // 2. Clean Racing (Need session context, hard to do on single point without session state)
        // 3. Consistency (Need lap history)
    }

    private async awardBadge(driverId: string, badgeName: string, metadata: any) {
        const badge = this.badgeCache?.get(badgeName);
        if (!badge) return;

        try {
            // Check if already earned
            // Optimize: Cache earned badges per driver? For now, DB check ON CONFLICT DO NOTHING is safe but maybe slow/noisy if hitting constantly.
            // Better: check once per session?
            // Actually `ON CONFLICT` only works if we have a unique constraint on (driver_id, badge_id).
            // We didn't define a unique constraint in the migration explicitly, just Primary Key.
            // Let's check if we earned it.

            const check = await pool.query(
                'SELECT 1 FROM training_driver_badges WHERE driver_id = $1 AND badge_id = $2',
                [driverId, badge.id]
            );

            if (check.rowCount === 0) {
                console.log(`[Gamification] Awarding badge ${badgeName} to ${driverId}`);
                await pool.query(
                    `INSERT INTO training_driver_badges (id, driver_id, badge_id, earned_at, metadata)
           VALUES ($1, $2, $3, now(), $4)`,
                    [uuidv4(), driverId, badge.id, metadata]
                );
            }
        } catch (e) {
            console.error('[Gamification] Error awarding badge', e);
        }
    }

    private async updateGoals(point: TelemetryData) {
        // Example: Update "Lap Time Mastery" if completed a lap?
        // This requires knowing if a lap was just finished.
        // TelemetryData has 'lap' number. If it increments, we finished a lap.
        // We need state to track previous lap number.
        // This stateless service approach is limited.

        // For MVP: Just check "Max Speed" type goals?
    }
}

export default new GamificationService();
