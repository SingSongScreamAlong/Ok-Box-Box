/**
 * Target Generator
 * 
 * Automatically generates development target suggestions based on performance gaps.
 */

import { DriverTarget, TeamBenchmarks } from './index';
import { PerformanceGaps } from './analyzer';

export interface SuggestedTarget {
    id: string;
    driver_id: string;
    label: string;
    category: DriverTarget['category'];
    target_value: number | string;
    current_value: number | string;
    track?: string;
    car?: string;
    rationale: string;
    priority: 'high' | 'medium' | 'low';
    estimated_timeline?: string;
}

export class TargetGenerator {
    /**
     * Generate target suggestions based on performance gaps
     */
    generateSuggestions(
        driverId: string,
        gaps: PerformanceGaps,
        existingTargets: DriverTarget[],
        _benchmark?: TeamBenchmarks
    ): SuggestedTarget[] {
        const suggestions: SuggestedTarget[] = [];
        const existingLabels = new Set(existingTargets.map(t => t.label.toLowerCase()));

        // 1. Lap time improvement targets
        if (gaps.lapTimeGap && gaps.lapTimeGap.gap_pct > 0.5) {
            const label = `${gaps.lapTimeGap.track} Lap Time`;
            if (!existingLabels.has(label.toLowerCase())) {
                // Target: get within 0.5% of benchmark
                const targetMs = gaps.lapTimeGap.benchmark_ms * 1.005;
                suggestions.push({
                    id: `suggest-${Date.now()}-laptime`,
                    driver_id: driverId,
                    label,
                    category: 'lap_time',
                    target_value: this.formatLapTime(targetMs),
                    current_value: this.formatLapTime(gaps.lapTimeGap.driver_best_ms),
                    track: gaps.lapTimeGap.track,
                    car: gaps.lapTimeGap.car,
                    rationale: `You're ${gaps.lapTimeGap.gap_pct.toFixed(1)}% off the team benchmark. ` +
                        `Focus on consistent sector times to close this gap.`,
                    priority: gaps.lapTimeGap.gap_pct > 2 ? 'high' : 'medium',
                    estimated_timeline: gaps.lapTimeGap.gap_pct > 3 ? '2-4 weeks' : '1-2 weeks'
                });
            }
        }

        // 2. Consistency targets
        if (gaps.consistencyGap && gaps.consistencyGap.gap_pct > 0.2) {
            const label = 'Lap Time Consistency';
            if (!existingLabels.has(label.toLowerCase())) {
                suggestions.push({
                    id: `suggest-${Date.now()}-consistency`,
                    driver_id: driverId,
                    label,
                    category: 'consistency',
                    target_value: 0.5,
                    current_value: parseFloat(gaps.consistencyGap.driver_variance_pct.toFixed(2)),
                    rationale: `Your lap time variance is ${gaps.consistencyGap.driver_variance_pct.toFixed(2)}%. ` +
                        `Target: below 0.5% for elite-level consistency.`,
                    priority: gaps.consistencyGap.gap_pct > 1 ? 'high' : 'medium'
                });
            }
        }

        // 3. Safety rating targets
        if (gaps.safetyGap && gaps.safetyGap.gap > 0.5) {
            const label = 'Reduce Incident Rate';
            if (!existingLabels.has(label.toLowerCase())) {
                suggestions.push({
                    id: `suggest-${Date.now()}-safety`,
                    driver_id: driverId,
                    label,
                    category: 'safety',
                    target_value: 1.5,
                    current_value: parseFloat(gaps.safetyGap.driver_incident_rate.toFixed(2)),
                    rationale: `Your incident rate is ${gaps.safetyGap.driver_incident_rate.toFixed(1)} per 100 laps. ` +
                        `Aim for under 1.5 to improve SR and race results.`,
                    priority: gaps.safetyGap.gap > 2 ? 'high' : 'medium'
                });
            }
        }

        // 4. iRating milestone targets
        if (gaps.iratingTrend) {
            const currentIR = gaps.iratingTrend.current;
            const milestones = [1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000];
            const nextMilestone = milestones.find(m => m > currentIR);

            if (nextMilestone) {
                const label = `Reach ${nextMilestone} iRating`;
                if (!existingLabels.has(label.toLowerCase())) {
                    const gap = nextMilestone - currentIR;
                    const racesNeeded = gaps.iratingTrend.avg_change_per_race > 0
                        ? Math.ceil(gap / gaps.iratingTrend.avg_change_per_race)
                        : null;

                    suggestions.push({
                        id: `suggest-${Date.now()}-irating`,
                        driver_id: driverId,
                        label,
                        category: 'irating',
                        target_value: nextMilestone,
                        current_value: currentIR,
                        rationale: gaps.iratingTrend.trend === 'rising'
                            ? `You're gaining iR! At current pace, ~${racesNeeded} races to reach ${nextMilestone}.`
                            : `Focus on consistent top-5 finishes to build toward ${nextMilestone} iR.`,
                        priority: gap < 200 ? 'high' : 'medium',
                        estimated_timeline: racesNeeded ? `~${Math.ceil(racesNeeded / 4)} weeks` : undefined
                    });
                }
            }
        }

        // 5. SR milestone targets
        if (gaps.srTrend && gaps.srTrend.current < 4.0) {
            const label = 'Reach A 4.00 Safety Rating';
            if (!existingLabels.has(label.toLowerCase())) {
                suggestions.push({
                    id: `suggest-${Date.now()}-sr`,
                    driver_id: driverId,
                    label,
                    category: 'safety',
                    target_value: 4.0,
                    current_value: gaps.srTrend.current,
                    rationale: gaps.srTrend.trend === 'rising'
                        ? `SR trending up! Keep clean racing.`
                        : `Focus on incident-free laps. Consider lower-split races for SR farming.`,
                    priority: gaps.srTrend.current < 3.0 ? 'high' : 'medium'
                });
            }
        }

        return suggestions;
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
