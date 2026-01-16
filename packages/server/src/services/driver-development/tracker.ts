/**
 * Progress Tracker
 * 
 * Tracks driver progress toward their targets after each session.
 */

import { DriverTarget, SessionData } from './index';

export class ProgressTracker {
    /**
     * Update target progress based on new session data
     */
    updateProgress(targets: DriverTarget[], session: SessionData): DriverTarget[] {
        return targets.map(target => {
            const updated = { ...target };
            let newValue: number | string | null = null;

            switch (target.category) {
                case 'lap_time':
                    // Check if session matches target track/car
                    if (this.matchesTrack(target, session)) {
                        const bestLap = this.formatLapTime(session.best_lap_ms);
                        // Only update if improved
                        if (this.compareLapTimes(bestLap, target.current_value as string) < 0) {
                            newValue = bestLap;
                        }
                    }
                    break;

                case 'consistency':
                    // Calculate consistency from session
                    if (session.lap_times_ms && session.lap_times_ms.length >= 5) {
                        const variance = this.calculateVariance(session.lap_times_ms);
                        const median = session.median_lap_ms || this.calculateMedian(session.lap_times_ms);
                        const consistencyPct = (variance / median) * 100;

                        // Update if better (lower is better)
                        if (consistencyPct < (target.current_value as number)) {
                            newValue = parseFloat(consistencyPct.toFixed(2));
                        }
                    }
                    break;

                case 'safety':
                    // Update incident rate
                    if (session.session_type === 'race') {
                        const incidentRate = (session.incident_count / session.total_laps) * 100;
                        // For "x incidents in race" targets, check race incidents
                        if (typeof target.target_value === 'number' && target.target_value <= 10) {
                            newValue = session.incident_count;
                        } else {
                            // For incident rate targets
                            if (incidentRate < (target.current_value as number) || target.current_value === 0) {
                                newValue = parseFloat(incidentRate.toFixed(2));
                            }
                        }
                    }
                    break;

                case 'irating':
                    // Update iRating from session
                    if (session.irating_after) {
                        newValue = session.irating_after;
                    }
                    break;

                case 'custom':
                    // Custom targets updated manually
                    break;
            }

            // If we have a new value, update the target
            if (newValue !== null && newValue !== target.current_value) {
                updated.current_value = newValue;
                updated.progress_history = [
                    ...target.progress_history,
                    { date: session.timestamp.split('T')[0], value: newValue }
                ];

                // Check if target achieved
                if (this.isAchieved(updated)) {
                    updated.status = 'achieved';
                    updated.achieved_at = new Date().toISOString();
                }
            }

            return updated;
        });
    }

    /**
     * Check if target matches the session track/car
     */
    private matchesTrack(target: DriverTarget, session: SessionData): boolean {
        if (target.track && target.track !== session.track_name) return false;
        if (target.car && target.car !== session.car_name) return false;
        return true;
    }

    /**
     * Check if a target has been achieved
     */
    private isAchieved(target: DriverTarget): boolean {
        const current = target.current_value;
        const goal = target.target_value;

        switch (target.category) {
            case 'lap_time':
                // Achieved if current is <= target (faster)
                return this.compareLapTimes(current as string, goal as string) <= 0;

            case 'consistency':
                // Achieved if current is <= target (lower variance is better)
                return (current as number) <= (goal as number);

            case 'safety':
                // Achieved if current is <= target (fewer incidents is better)
                return (current as number) <= (goal as number);

            case 'irating':
                // Achieved if current >= target
                return (current as number) >= (goal as number);

            case 'custom':
                // Custom targets need manual verification
                return false;

            default:
                return false;
        }
    }

    /**
     * Compare two lap time strings (e.g., "1:32.456")
     * Returns negative if a < b, positive if a > b, 0 if equal
     */
    private compareLapTimes(a: string, b: string): number {
        const parseTime = (t: string): number => {
            const match = t.match(/(\d+):(\d+\.?\d*)/);
            if (!match) return Infinity;
            return parseInt(match[1]) * 60000 + parseFloat(match[2]) * 1000;
        };
        return parseTime(a) - parseTime(b);
    }

    /**
     * Format milliseconds as lap time string
     */
    private formatLapTime(ms: number): string {
        const minutes = Math.floor(ms / 60000);
        const seconds = ((ms % 60000) / 1000).toFixed(3);
        return `${minutes}:${seconds.padStart(6, '0')}`;
    }

    /**
     * Calculate standard deviation
     */
    private calculateVariance(values: number[]): number {
        if (values.length === 0) return 0;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
        return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
    }

    /**
     * Calculate median
     */
    private calculateMedian(values: number[]): number {
        if (values.length === 0) return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0
            ? sorted[mid]
            : (sorted[mid - 1] + sorted[mid]) / 2;
    }
}
