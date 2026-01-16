/**
 * Achievement Detector
 * 
 * Detects when drivers achieve their targets and emits events for notifications.
 */

import { EventEmitter } from 'events';
import { DriverTarget, SessionData } from './index';

export interface AchievementEvent {
    type: 'target_achieved' | 'milestone_reached' | 'personal_best' | 'streak';
    driver_id: string;
    target_id?: string;
    label: string;
    category: string;
    value: number | string;
    previous_value?: number | string;
    timestamp: string;
    badge?: {
        name: string;
        icon: string;
        tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    };
}

// Badge definitions
const BADGES: Record<string, AchievementEvent['badge']> = {
    first_target: { name: 'Goal Getter', icon: '🎯', tier: 'bronze' },
    five_targets: { name: 'Overachiever', icon: '⭐', tier: 'silver' },
    irating_3000: { name: '3K Club', icon: '🏎️', tier: 'bronze' },
    irating_4000: { name: '4K Elite', icon: '🏎️', tier: 'silver' },
    irating_5000: { name: '5K Legend', icon: '🏎️', tier: 'gold' },
    irating_6000: { name: 'Pro Pace', icon: '🏎️', tier: 'platinum' },
    clean_race: { name: 'Clean Racer', icon: '✨', tier: 'bronze' },
    consistency_master: { name: 'Consistency Master', icon: '🎪', tier: 'silver' },
    safety_a: { name: 'Safe Hands', icon: '🛡️', tier: 'silver' },
    personal_best: { name: 'Personal Best', icon: '🚀', tier: 'bronze' }
};

export class AchievementDetector extends EventEmitter {
    private previousTargetStates: Map<string, DriverTarget['status']> = new Map();

    /**
     * Check for achievements based on updated targets and session data
     */
    check(targets: DriverTarget[], session: SessionData): AchievementEvent[] {
        const achievements: AchievementEvent[] = [];

        // Check each target for newly achieved status
        for (const target of targets) {
            const previousStatus = this.previousTargetStates.get(target.id);

            if (target.status === 'achieved' && previousStatus !== 'achieved') {
                const event = this.createTargetAchievement(target, session);
                achievements.push(event);
                this.emit('achievement', event);
            }

            // Update state tracking
            this.previousTargetStates.set(target.id, target.status);
        }

        // Check for iRating milestones
        if (session.irating_after) {
            const milestones = [3000, 4000, 5000, 6000];
            for (const milestone of milestones) {
                if (session.irating_before < milestone && session.irating_after >= milestone) {
                    const event = this.createMilestoneAchievement(
                        session.driver_id,
                        `Reached ${milestone} iRating`,
                        'irating',
                        session.irating_after,
                        session.irating_before,
                        BADGES[`irating_${milestone}`]
                    );
                    achievements.push(event);
                    this.emit('achievement', event);
                }
            }
        }

        // Check for clean race (zero incidents)
        if (session.session_type === 'race' && session.incident_count === 0) {
            const event = this.createMilestoneAchievement(
                session.driver_id,
                'Clean Race',
                'safety',
                0,
                undefined,
                BADGES.clean_race
            );
            achievements.push(event);
            this.emit('achievement', event);
        }

        // Check for A license achievement
        if (session.safety_rating_after && session.safety_rating_before) {
            if (session.safety_rating_before < 4.0 && session.safety_rating_after >= 4.0) {
                const event = this.createMilestoneAchievement(
                    session.driver_id,
                    'Reached A 4.00 Safety Rating',
                    'safety',
                    session.safety_rating_after,
                    session.safety_rating_before,
                    BADGES.safety_a
                );
                achievements.push(event);
                this.emit('achievement', event);
            }
        }

        return achievements;
    }

    /**
     * Create a target achievement event
     */
    private createTargetAchievement(target: DriverTarget, _session: SessionData): AchievementEvent {
        return {
            type: 'target_achieved',
            driver_id: target.driver_id,
            target_id: target.id,
            label: target.label,
            category: target.category,
            value: target.current_value,
            timestamp: new Date().toISOString(),
            badge: BADGES.first_target
        };
    }

    /**
     * Create a milestone achievement event
     */
    private createMilestoneAchievement(
        driverId: string,
        label: string,
        category: string,
        value: number | string,
        previousValue: number | string | undefined,
        badge?: AchievementEvent['badge']
    ): AchievementEvent {
        return {
            type: 'milestone_reached',
            driver_id: driverId,
            label,
            category,
            value,
            previous_value: previousValue,
            timestamp: new Date().toISOString(),
            badge
        };
    }

    /**
     * Check for personal best (called separately with historical data)
     */
    checkPersonalBest(
        driverId: string,
        track: string,
        newBestMs: number,
        previousBestMs: number
    ): AchievementEvent | null {
        if (newBestMs < previousBestMs) {
            // Calculate improvement for potential future use
            const event: AchievementEvent = {
                type: 'personal_best',
                driver_id: driverId,
                label: `New PB at ${track}`,
                category: 'lap_time',
                value: this.formatLapTime(newBestMs),
                previous_value: this.formatLapTime(previousBestMs),
                timestamp: new Date().toISOString(),
                badge: BADGES.personal_best
            };
            this.emit('achievement', event);
            return event;
        }
        return null;
    }

    /**
     * Format milliseconds as lap time string
     */
    private formatLapTime(ms: number): string {
        const minutes = Math.floor(ms / 60000);
        const seconds = ((ms % 60000) / 1000).toFixed(3);
        return `${minutes}:${seconds.padStart(6, '0')}`;
    }
}
