/**
 * Performance Analyzer
 * 
 * Analyzes driver session data to identify performance gaps and areas for improvement.
 */

import { SessionData, TeamBenchmarks } from './index';

export interface PerformanceGaps {
    driver_id: string;

    // Pace gaps
    lapTimeGap?: {
        track: string;
        car: string;
        driver_best_ms: number;
        benchmark_ms: number;
        gap_ms: number;
        gap_pct: number;
    };

    // Consistency issues
    consistencyGap?: {
        driver_variance_pct: number;
        benchmark_variance_pct: number;
        gap_pct: number;
    };

    // Safety concerns
    safetyGap?: {
        driver_incident_rate: number; // incidents per 100 laps
        benchmark_incident_rate: number;
        gap: number;
    };

    // iRating trajectory
    iratingTrend?: {
        current: number;
        trend: 'rising' | 'stable' | 'falling';
        avg_change_per_race: number;
        projected_30_day: number;
    };

    // Safety Rating trajectory
    srTrend?: {
        current: number;
        trend: 'rising' | 'stable' | 'falling';
        corners_per_incident: number;
    };
}

export class PerformanceAnalyzer {
    /**
     * Analyze a single session against benchmarks
     */
    analyze(session: SessionData, benchmark?: TeamBenchmarks): PerformanceGaps {
        const gaps: PerformanceGaps = {
            driver_id: session.driver_id
        };

        // Lap time gap analysis
        if (benchmark && session.best_lap_ms && benchmark.best_lap_ms) {
            const gap_ms = session.best_lap_ms - benchmark.best_lap_ms;
            gaps.lapTimeGap = {
                track: session.track_name,
                car: session.car_name,
                driver_best_ms: session.best_lap_ms,
                benchmark_ms: benchmark.best_lap_ms,
                gap_ms,
                gap_pct: (gap_ms / benchmark.best_lap_ms) * 100
            };
        }

        // Consistency analysis (lap time variance)
        if (session.lap_times_ms && session.lap_times_ms.length >= 5) {
            const variance = this.calculateVariance(session.lap_times_ms);
            const variance_pct = (variance / (session.median_lap_ms || 1)) * 100;

            gaps.consistencyGap = {
                driver_variance_pct: variance_pct,
                benchmark_variance_pct: benchmark?.avg_consistency_pct ?? 0.5,
                gap_pct: variance_pct - (benchmark?.avg_consistency_pct ?? 0.5)
            };
        }

        // Safety analysis
        if (session.total_laps > 0) {
            const incident_rate = (session.incident_count / session.total_laps) * 100;
            const benchmark_rate = benchmark?.avg_incident_rate ?? 1.5;

            gaps.safetyGap = {
                driver_incident_rate: incident_rate,
                benchmark_incident_rate: benchmark_rate,
                gap: incident_rate - benchmark_rate
            };
        }

        // iRating trend
        if (session.irating_after) {
            const change = session.irating_after - session.irating_before;
            gaps.iratingTrend = {
                current: session.irating_after,
                trend: change > 10 ? 'rising' : change < -10 ? 'falling' : 'stable',
                avg_change_per_race: change,
                projected_30_day: session.irating_after + (change * 10) // ~10 races/month
            };
        }

        // SR trend
        if (session.safety_rating_after) {
            const change = session.safety_rating_after - session.safety_rating_before;
            const lapsPerInc = session.incident_count > 0
                ? session.total_laps / session.incident_count
                : session.total_laps;

            gaps.srTrend = {
                current: session.safety_rating_after,
                trend: change > 0.05 ? 'rising' : change < -0.05 ? 'falling' : 'stable',
                corners_per_incident: lapsPerInc * 10 // Rough estimate: 10 corners per lap
            };
        }

        return gaps;
    }

    /**
     * Analyze aggregate performance across multiple sessions
     */
    analyzeAggregate(sessions: SessionData[], benchmarks?: TeamBenchmarks[]): PerformanceGaps {
        if (sessions.length === 0) {
            return { driver_id: '' };
        }

        const driver_id = sessions[0].driver_id;

        // Group sessions by track/car for best lap analysis
        const trackBests = new Map<string, number>();
        sessions.forEach(s => {
            const key = `${s.track_name}|${s.car_name}`;
            const current = trackBests.get(key) ?? Infinity;
            if (s.best_lap_ms < current) {
                trackBests.set(key, s.best_lap_ms);
            }
        });

        // Find largest gap to a benchmark
        let worstGap: PerformanceGaps['lapTimeGap'] | undefined;
        benchmarks?.forEach(b => {
            const key = `${b.track_name}|${b.car_name}`;
            const driverBest = trackBests.get(key);
            if (driverBest) {
                const gap_ms = driverBest - b.best_lap_ms;
                const gap_pct = (gap_ms / b.best_lap_ms) * 100;
                if (!worstGap || gap_pct > worstGap.gap_pct) {
                    worstGap = {
                        track: b.track_name,
                        car: b.car_name,
                        driver_best_ms: driverBest,
                        benchmark_ms: b.best_lap_ms,
                        gap_ms,
                        gap_pct
                    };
                }
            }
        });

        // Aggregate consistency
        const allLaps = sessions.flatMap(s => s.lap_times_ms || []);
        const avgVariance = allLaps.length > 0 ? this.calculateVariance(allLaps) : 0;
        const medianLap = this.calculateMedian(allLaps);

        // Aggregate incidents
        const totalIncidents = sessions.reduce((sum, s) => sum + s.incident_count, 0);
        const totalLaps = sessions.reduce((sum, s) => sum + s.total_laps, 0);

        // iRating trend from most recent
        const sorted = [...sessions].sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        const latest = sorted[0];
        const earliest = sorted[sorted.length - 1];
        const irChange = (latest?.irating_after ?? 0) - (earliest?.irating_before ?? 0);

        return {
            driver_id,
            lapTimeGap: worstGap,
            consistencyGap: medianLap > 0 ? {
                driver_variance_pct: (avgVariance / medianLap) * 100,
                benchmark_variance_pct: 0.5,
                gap_pct: ((avgVariance / medianLap) * 100) - 0.5
            } : undefined,
            safetyGap: totalLaps > 0 ? {
                driver_incident_rate: (totalIncidents / totalLaps) * 100,
                benchmark_incident_rate: 1.5,
                gap: ((totalIncidents / totalLaps) * 100) - 1.5
            } : undefined,
            iratingTrend: latest?.irating_after ? {
                current: latest.irating_after,
                trend: irChange > 50 ? 'rising' : irChange < -50 ? 'falling' : 'stable',
                avg_change_per_race: irChange / sessions.length,
                projected_30_day: latest.irating_after + ((irChange / sessions.length) * 10)
            } : undefined
        };
    }

    private calculateVariance(values: number[]): number {
        if (values.length === 0) return 0;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
        return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
    }

    private calculateMedian(values: number[]): number {
        if (values.length === 0) return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0
            ? sorted[mid]
            : (sorted[mid - 1] + sorted[mid]) / 2;
    }
}
