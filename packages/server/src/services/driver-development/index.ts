/**
 * Driver Development Engine
 * 
 * Intelligent system that analyzes driver performance, generates development
 * targets, tracks progress, and detects achievements.
 */

import { PerformanceAnalyzer, PerformanceGaps } from './analyzer';
import { TargetGenerator, SuggestedTarget } from './generator';
import { ProgressTracker } from './tracker';
import { AchievementDetector, AchievementEvent } from './detector';
import { EventEmitter } from 'events';

// Target types
export interface DriverTarget {
    id: string;
    driver_id: string;
    team_id: string;
    label: string;
    category: 'lap_time' | 'consistency' | 'safety' | 'irating' | 'custom';
    target_value: number | string;
    current_value: number | string;
    status: 'suggested' | 'active' | 'achieved' | 'failed' | 'dismissed';
    source: 'auto_generated' | 'team_assigned' | 'self_set';
    track?: string;
    car?: string;
    deadline?: string;
    notes?: string;
    progress_history: { date: string; value: number | string }[];
    created_at: string;
    achieved_at?: string;
    created_by?: string;
}

// Session data for analysis
export interface SessionData {
    session_id: string;
    driver_id: string;
    track_name: string;
    car_name: string;
    lap_times_ms: number[];
    best_lap_ms: number;
    median_lap_ms: number;
    incident_count: number;
    total_laps: number;
    valid_laps: number;
    finish_position?: number;
    start_position?: number;
    irating_before: number;
    irating_after: number;
    safety_rating_before: number;
    safety_rating_after: number;
    session_type: 'practice' | 'qualifying' | 'race';
    timestamp: string;
}

// Team benchmark data
export interface TeamBenchmarks {
    track_name: string;
    car_name: string;
    best_lap_ms: number;
    best_lap_driver_id: string;
    avg_consistency_pct: number;
    avg_incident_rate: number;
}

/**
 * Main Driver Development Engine
 */
export class DriverDevelopmentEngine extends EventEmitter {
    private analyzer: PerformanceAnalyzer;
    private generator: TargetGenerator;
    private tracker: ProgressTracker;
    private detector: AchievementDetector;

    constructor() {
        super();
        this.analyzer = new PerformanceAnalyzer();
        this.generator = new TargetGenerator();
        this.tracker = new ProgressTracker();
        this.detector = new AchievementDetector();

        // Wire up achievement events
        this.detector.on('achievement', (event: AchievementEvent) => {
            this.emit('achievement', event);
        });
    }

    /**
     * Process a new session and update driver development
     */
    async processSession(
        session: SessionData,
        existingTargets: DriverTarget[],
        teamBenchmarks?: TeamBenchmarks
    ): Promise<{
        updatedTargets: DriverTarget[];
        newSuggestions: SuggestedTarget[];
        achievements: AchievementEvent[];
    }> {
        // 1. Analyze performance gaps
        const gaps = this.analyzer.analyze(session, teamBenchmarks);

        // 2. Update progress on existing targets
        const updatedTargets = this.tracker.updateProgress(existingTargets, session);

        // 3. Check for achievements
        const achievements = this.detector.check(updatedTargets, session);

        // 4. Generate new suggestions based on gaps
        const newSuggestions = this.generator.generateSuggestions(
            session.driver_id,
            gaps,
            existingTargets,
            teamBenchmarks
        );

        return {
            updatedTargets,
            newSuggestions,
            achievements
        };
    }

    /**
     * Get suggested targets for a driver based on their history
     */
    async getSuggestions(
        driverId: string,
        recentSessions: SessionData[],
        existingTargets: DriverTarget[],
        teamBenchmarks?: TeamBenchmarks[]
    ): Promise<SuggestedTarget[]> {
        if (recentSessions.length === 0) {
            return [];
        }

        // Analyze aggregate performance
        const aggregateGaps = this.analyzer.analyzeAggregate(recentSessions, teamBenchmarks);

        // Generate suggestions
        return this.generator.generateSuggestions(
            driverId,
            aggregateGaps,
            existingTargets,
            teamBenchmarks?.[0] // Use first benchmark as reference
        );
    }

    /**
     * Accept a suggested target (convert to active)
     */
    acceptSuggestion(suggestion: SuggestedTarget, teamId: string): DriverTarget {
        return {
            id: `target-${Date.now()}`,
            driver_id: suggestion.driver_id,
            team_id: teamId,
            label: suggestion.label,
            category: suggestion.category,
            target_value: suggestion.target_value,
            current_value: suggestion.current_value,
            status: 'active',
            source: 'auto_generated',
            track: suggestion.track,
            car: suggestion.car,
            notes: suggestion.rationale,
            progress_history: [],
            created_at: new Date().toISOString()
        };
    }

    /**
     * Create a manual target
     */
    createTarget(params: {
        driver_id: string;
        team_id: string;
        label: string;
        category: DriverTarget['category'];
        target_value: number | string;
        current_value?: number | string;
        track?: string;
        car?: string;
        deadline?: string;
        notes?: string;
        created_by: string;
    }): DriverTarget {
        return {
            id: `target-${Date.now()}`,
            driver_id: params.driver_id,
            team_id: params.team_id,
            label: params.label,
            category: params.category,
            target_value: params.target_value,
            current_value: params.current_value ?? 0,
            status: 'active',
            source: params.created_by === params.driver_id ? 'self_set' : 'team_assigned',
            track: params.track,
            car: params.car,
            deadline: params.deadline,
            notes: params.notes,
            progress_history: [],
            created_at: new Date().toISOString(),
            created_by: params.created_by
        };
    }
}

// Export singleton
export const driverDevelopmentEngine = new DriverDevelopmentEngine();

// Re-export types
export type { PerformanceGaps, SuggestedTarget, AchievementEvent };
