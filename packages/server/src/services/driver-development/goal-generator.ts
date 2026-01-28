/**
 * Goal Generator Service
 * 
 * Automatically generates personalized development goals based on:
 * - iRacing profile data (iRating, SR, license)
 * - Recent session performance
 * - Driver memory patterns
 * 
 * Called when:
 * 1. Driver first connects iRacing account
 * 2. After significant session milestones
 * 3. Periodically to refresh suggestions
 */

import { pool } from '../../db/client.js';
import { IRacingProfile } from '../iracing-oauth/profile-sync-service.js';

// =====================================================================
// Types
// =====================================================================

export interface GoalSuggestion {
    templateId: string | null;
    title: string;
    description: string;
    category: string;
    metricKey: string;
    targetValue: number;
    currentValue: number;
    unit: string;
    rationale: string;
    aiConfidence: number;
    priority: number;
    discipline?: string;
    estimatedTimelineDays?: number;
}

export interface GeneratedGoal {
    id: string;
    driverProfileId: string;
    title: string;
    description: string;
    category: string;
    metricKey: string;
    targetValue: number;
    currentValue: number;
    startingValue: number;
    unit: string;
    discipline?: string;
    source: 'ai_recommended' | 'system_milestone';
    aiRationale: string;
    aiConfidence: number;
    priority: number;
}

// License level mapping
const LICENSE_LEVELS: Record<string, number> = {
    'R': 1,
    'D': 2,
    'C': 3,
    'B': 4,
    'A': 5,
    'Pro': 6,
    'Pro/WC': 7
};

// =====================================================================
// Goal Generator Service
// =====================================================================

export class GoalGeneratorService {

    /**
     * Generate initial goals when driver connects iRacing account
     * This is the main entry point for new account connections
     */
    async generateInitialGoals(
        driverProfileId: string,
        iracingProfile: IRacingProfile
    ): Promise<GeneratedGoal[]> {
        const suggestions = this.analyzeProfileForGoals(iracingProfile);
        const goals: GeneratedGoal[] = [];

        for (const suggestion of suggestions) {
            const goal = await this.createGoalFromSuggestion(
                driverProfileId,
                suggestion,
                'ai_recommended'
            );
            if (goal) {
                goals.push(goal);
            }
        }

        console.log(`[GoalGenerator] Generated ${goals.length} initial goals for driver ${driverProfileId}`);
        return goals;
    }

    /**
     * Analyze iRacing profile and generate goal suggestions
     */
    analyzeProfileForGoals(profile: IRacingProfile): GoalSuggestion[] {
        const suggestions: GoalSuggestion[] = [];

        // Analyze each discipline the driver participates in
        const disciplines = [
            { key: 'road', irating: profile.iratingRoad, sr: profile.srRoad, license: profile.licenseRoad },
            { key: 'oval', irating: profile.iratingOval, sr: profile.srOval, license: profile.licenseOval },
            { key: 'dirt_road', irating: profile.iratingDirtRoad, sr: profile.srDirtRoad, license: profile.licenseDirtRoad },
            { key: 'dirt_oval', irating: profile.iratingDirtOval, sr: profile.srDirtOval, license: profile.licenseDirtOval },
        ];

        for (const disc of disciplines) {
            if (disc.irating && disc.irating > 0) {
                // This driver has participated in this discipline
                const discSuggestions = this.generateDisciplineGoals(
                    disc.key,
                    disc.irating,
                    disc.sr ? disc.sr / 100 : null, // Convert from stored format
                    disc.license
                );
                suggestions.push(...discSuggestions);
            }
        }

        // Sort by priority and limit to top 5
        return suggestions
            .sort((a, b) => b.priority - a.priority)
            .slice(0, 5);
    }

    /**
     * Generate goals for a specific discipline
     */
    private generateDisciplineGoals(
        discipline: string,
        irating: number,
        sr: number | null,
        license: string | null
    ): GoalSuggestion[] {
        const suggestions: GoalSuggestion[] = [];
        const disciplineLabel = discipline.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

        // 1. iRating milestone goal
        const nextIRMilestone = this.getNextIRatingMilestone(irating);
        if (nextIRMilestone) {
            const gap = nextIRMilestone - irating;
            suggestions.push({
                templateId: null,
                title: `Reach ${nextIRMilestone} iRating (${disciplineLabel})`,
                description: `Push your ${disciplineLabel} iRating to the next milestone`,
                category: 'irating',
                metricKey: `irating_${discipline}`,
                targetValue: nextIRMilestone,
                currentValue: irating,
                unit: 'iR',
                rationale: this.getIRatingRationale(irating, nextIRMilestone, gap),
                aiConfidence: 0.9,
                priority: this.getIRatingPriority(irating, gap),
                discipline,
                estimatedTimelineDays: this.estimateIRatingTimeline(gap)
            });
        }

        // 2. Safety Rating goal (if below 4.0)
        if (sr !== null && sr < 4.0) {
            const targetSR = sr < 3.0 ? 3.0 : 4.0;
            suggestions.push({
                templateId: null,
                title: `Reach ${targetSR.toFixed(2)} Safety Rating (${disciplineLabel})`,
                description: `Improve your ${disciplineLabel} safety rating through clean racing`,
                category: 'safety_rating',
                metricKey: `sr_${discipline}`,
                targetValue: targetSR,
                currentValue: sr,
                unit: 'SR',
                rationale: this.getSRRationale(sr, targetSR),
                aiConfidence: 0.85,
                priority: sr < 2.5 ? 9 : sr < 3.0 ? 8 : 6,
                discipline,
                estimatedTimelineDays: sr < 3.0 ? 14 : 21
            });
        }

        // 3. License upgrade goal
        if (license) {
            const currentLevel = LICENSE_LEVELS[license] || 1;
            if (currentLevel < 5) { // Not yet A license
                const nextLicense = Object.entries(LICENSE_LEVELS).find(([_, v]) => v === currentLevel + 1);
                if (nextLicense) {
                    suggestions.push({
                        templateId: null,
                        title: `Earn ${nextLicense[0]} License (${disciplineLabel})`,
                        description: `Advance to ${nextLicense[0]} class license in ${disciplineLabel}`,
                        category: 'license',
                        metricKey: `license_${discipline}`,
                        targetValue: currentLevel + 1,
                        currentValue: currentLevel,
                        unit: 'class',
                        rationale: `You're currently ${license} class. Reaching ${nextLicense[0]} class will unlock more competitive series and higher-split races.`,
                        aiConfidence: 0.8,
                        priority: currentLevel < 3 ? 7 : 5,
                        discipline,
                        estimatedTimelineDays: 30
                    });
                }
            }
        }

        // 4. Consistency goal for newer drivers
        if (irating < 1500) {
            suggestions.push({
                templateId: null,
                title: `Complete 5 Clean Races (${disciplineLabel})`,
                description: `Finish 5 races with 0x incidents to build consistency`,
                category: 'clean_races',
                metricKey: `clean_race_streak_${discipline}`,
                targetValue: 5,
                currentValue: 0,
                unit: 'races',
                rationale: `At ${irating} iRating, focusing on clean racing will help you learn tracks, build SR, and naturally improve your pace without the pressure of chasing positions.`,
                aiConfidence: 0.85,
                priority: 7,
                discipline,
                estimatedTimelineDays: 14
            });
        }

        return suggestions;
    }

    /**
     * Get the next iRating milestone
     */
    private getNextIRatingMilestone(current: number): number | null {
        const milestones = [1000, 1250, 1500, 1750, 2000, 2250, 2500, 2750, 3000, 3500, 4000, 4500, 5000, 5500, 6000];
        return milestones.find(m => m > current) || null;
    }

    /**
     * Generate rationale for iRating goal
     */
    private getIRatingRationale(current: number, target: number, gap: number): string {
        if (current < 1000) {
            return `You're building your foundation at ${current} iR. Reaching ${target} will get you into more competitive splits where you can learn from faster drivers.`;
        } else if (current < 1500) {
            return `At ${current} iR, you're in the learning phase. Pushing to ${target} will require consistent top-half finishes. Focus on incident-free races.`;
        } else if (current < 2000) {
            return `${current} iR puts you in mid-pack splits. Reaching ${target} will require both pace and racecraft improvements. Work on qualifying and first-lap survival.`;
        } else if (current < 3000) {
            return `At ${current} iR, you're competitive. The ${gap} iR gap to ${target} will require fine-tuning your technique and race strategy.`;
        } else {
            return `You're in the upper echelon at ${current} iR. Reaching ${target} means competing with some of the best. Every tenth matters.`;
        }
    }

    /**
     * Get priority for iRating goal based on current rating and gap
     */
    private getIRatingPriority(current: number, gap: number): number {
        if (current < 1000) return 8; // New drivers need encouragement
        if (gap <= 250) return 8; // Close to milestone
        if (gap <= 500) return 6;
        return 5;
    }

    /**
     * Estimate timeline for iRating goal
     */
    private estimateIRatingTimeline(gap: number): number {
        // Rough estimate: ~20 iR gain per race average for improving drivers
        const racesNeeded = Math.ceil(gap / 20);
        // Assume 3 races per week
        return Math.ceil(racesNeeded / 3) * 7;
    }

    /**
     * Generate rationale for SR goal
     */
    private getSRRationale(current: number, target: number): string {
        if (current < 2.0) {
            return `Your SR of ${current.toFixed(2)} is limiting your racing options. Focus on survival over speed - finishing races cleanly will naturally improve your pace too.`;
        } else if (current < 3.0) {
            return `At ${current.toFixed(2)} SR, you're close to unlocking more series. Aim for 4+ corners per incident to steadily climb to ${target.toFixed(2)}.`;
        } else {
            return `You're at ${current.toFixed(2)} SR - solid, but ${target.toFixed(2)} is the mark of a truly safe driver. This will also help you qualify for special events.`;
        }
    }

    /**
     * Create a goal in the database from a suggestion
     */
    async createGoalFromSuggestion(
        driverProfileId: string,
        suggestion: GoalSuggestion,
        source: 'ai_recommended' | 'system_milestone'
    ): Promise<GeneratedGoal | null> {
        try {
            const result = await pool.query(
                `INSERT INTO driver_goals (
                    driver_profile_id, title, description, category, metric_key,
                    target_value, current_value, starting_value, unit, discipline,
                    source, ai_rationale, ai_confidence, priority, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'suggested')
                RETURNING *`,
                [
                    driverProfileId,
                    suggestion.title,
                    suggestion.description,
                    suggestion.category,
                    suggestion.metricKey,
                    suggestion.targetValue,
                    suggestion.currentValue,
                    suggestion.currentValue, // starting_value = current at creation
                    suggestion.unit,
                    suggestion.discipline || null,
                    source,
                    suggestion.rationale,
                    suggestion.aiConfidence,
                    suggestion.priority
                ]
            );

            const row = result.rows[0];
            return {
                id: row.id,
                driverProfileId: row.driver_profile_id,
                title: row.title,
                description: row.description,
                category: row.category,
                metricKey: row.metric_key,
                targetValue: parseFloat(row.target_value),
                currentValue: parseFloat(row.current_value),
                startingValue: parseFloat(row.starting_value),
                unit: row.unit,
                discipline: row.discipline,
                source: row.source,
                aiRationale: row.ai_rationale,
                aiConfidence: parseFloat(row.ai_confidence),
                priority: row.priority
            };
        } catch (error) {
            console.error('[GoalGenerator] Failed to create goal:', error);
            return null;
        }
    }

    /**
     * Get existing goals for a driver
     */
    async getDriverGoals(driverProfileId: string, status?: string): Promise<GeneratedGoal[]> {
        let query = `SELECT * FROM driver_goals WHERE driver_profile_id = $1`;
        const params: any[] = [driverProfileId];

        if (status) {
            query += ` AND status = $2`;
            params.push(status);
        }

        query += ` ORDER BY priority DESC, created_at DESC`;

        const result = await pool.query(query, params);
        return result.rows.map(row => ({
            id: row.id,
            driverProfileId: row.driver_profile_id,
            title: row.title,
            description: row.description,
            category: row.category,
            metricKey: row.metric_key,
            targetValue: parseFloat(row.target_value),
            currentValue: parseFloat(row.current_value),
            startingValue: parseFloat(row.starting_value),
            unit: row.unit,
            discipline: row.discipline,
            source: row.source,
            aiRationale: row.ai_rationale,
            aiConfidence: parseFloat(row.ai_confidence || '0'),
            priority: row.priority
        }));
    }

    /**
     * Accept a suggested goal (change status to active)
     */
    async acceptGoal(goalId: string): Promise<boolean> {
        const result = await pool.query(
            `UPDATE driver_goals SET status = 'active', updated_at = NOW() WHERE id = $1 AND status = 'suggested'`,
            [goalId]
        );
        return (result.rowCount ?? 0) > 0;
    }

    /**
     * Dismiss a suggested goal
     */
    async dismissGoal(goalId: string): Promise<boolean> {
        const result = await pool.query(
            `UPDATE driver_goals SET status = 'dismissed', dismissed_at = NOW(), updated_at = NOW() WHERE id = $1`,
            [goalId]
        );
        return (result.rowCount ?? 0) > 0;
    }

    /**
     * Update goal progress from new iRacing profile data
     */
    async updateGoalsFromProfile(
        driverProfileId: string,
        profile: IRacingProfile
    ): Promise<number> {
        // Get active goals
        const goals = await this.getDriverGoals(driverProfileId, 'active');
        let updated = 0;

        for (const goal of goals) {
            let newValue: number | null = null;

            // Map metric keys to profile values
            switch (goal.metricKey) {
                case 'irating_road':
                    newValue = profile.iratingRoad;
                    break;
                case 'irating_oval':
                    newValue = profile.iratingOval;
                    break;
                case 'irating_dirt_road':
                    newValue = profile.iratingDirtRoad;
                    break;
                case 'irating_dirt_oval':
                    newValue = profile.iratingDirtOval;
                    break;
                case 'sr_road':
                    newValue = profile.srRoad ? profile.srRoad / 100 : null;
                    break;
                case 'sr_oval':
                    newValue = profile.srOval ? profile.srOval / 100 : null;
                    break;
                case 'sr_dirt_road':
                    newValue = profile.srDirtRoad ? profile.srDirtRoad / 100 : null;
                    break;
                case 'sr_dirt_oval':
                    newValue = profile.srDirtOval ? profile.srDirtOval / 100 : null;
                    break;
                case 'license_road':
                    newValue = LICENSE_LEVELS[profile.licenseRoad || 'R'] || 1;
                    break;
                case 'license_oval':
                    newValue = LICENSE_LEVELS[profile.licenseOval || 'R'] || 1;
                    break;
                case 'license_dirt_road':
                    newValue = LICENSE_LEVELS[profile.licenseDirtRoad || 'R'] || 1;
                    break;
                case 'license_dirt_oval':
                    newValue = LICENSE_LEVELS[profile.licenseDirtOval || 'R'] || 1;
                    break;
            }

            if (newValue !== null && newValue !== goal.currentValue) {
                await pool.query(
                    `SELECT update_goal_progress($1, $2, 'api_sync')`,
                    [goal.id, newValue]
                );
                updated++;
            }
        }

        return updated;
    }
}

// =====================================================================
// Singleton
// =====================================================================

let goalGeneratorInstance: GoalGeneratorService | null = null;

export function getGoalGeneratorService(): GoalGeneratorService {
    if (!goalGeneratorInstance) {
        goalGeneratorInstance = new GoalGeneratorService();
    }
    return goalGeneratorInstance;
}
