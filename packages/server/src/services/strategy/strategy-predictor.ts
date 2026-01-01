/**
 * Strategy Predictor
 * Race simulation and strategic intelligence engine.
 * 
 * Capabilities:
 * 1. Undercut/Overcut analysis
 * 2. Threat ETA calculation
 * 3. Pit window optimization
 * 4. Strategic recommendations
 */

import { EventEmitter } from 'events';
import type { OpponentModel } from './opponent-modeler.js';

// ============================================================================
// TYPES
// ============================================================================

export interface RaceState {
    currentLap: number;
    totalLaps: number;
    sessionTimeRemaining: number; // seconds
    pitDelta: number; // seconds lost in pit
    players: PlayerState[];
    opponents: OpponentModel[];
}

export interface PlayerState {
    driverId: string;
    position: number;
    gap: number; // Gap to leader
    gapAhead: number; // Gap to car ahead
    gapBehind: number; // Gap to car behind
    currentStintLaps: number;
    fuelRemaining: number;
    fuelPerLap: number;
    degradationSlope: number;
    tireAge: number;
}

export interface UndercutAnalysis {
    target: string; // Driver ID of target
    targetName: string;
    currentGap: number;
    pitLap: number;
    projectedGapAfterPit: number;
    success: boolean;
    confidence: number;
    explanation: string;
}

export interface ThreatAssessment {
    driver: string;
    driverName: string;
    currentGap: number;
    closingRate: number; // seconds per lap
    lapsUntilCatch: number;
    threatLevel: 'none' | 'low' | 'medium' | 'high' | 'imminent';
    recommendation: string;
}

export interface StrategicRecommendation {
    action: 'stay_out' | 'box_now' | 'box_next_lap' | 'box_in_N_laps' | 'defend' | 'attack';
    laps?: number; // For 'box_in_N_laps'
    reason: string;
    confidence: number;
    alternativeActions: string[];
}

// ============================================================================
// STRATEGY PREDICTOR
// ============================================================================

export class StrategyPredictor extends EventEmitter {
    private pitDelta: number = 22; // Default pit loss in seconds

    /**
     * Set pit delta for this track/session
     */
    setPitDelta(seconds: number): void {
        this.pitDelta = seconds;
    }

    /**
     * Analyze undercut opportunity against a specific opponent
     */
    analyzeUndercut(
        player: PlayerState,
        opponent: OpponentModel,
        raceState: RaceState
    ): UndercutAnalysis {
        const currentGap = this.calculateGap(player, opponent, raceState);

        // Find optimal pit lap
        const optimalPitLap = this.findOptimalUndercutLap(player, opponent, raceState);

        // Simulate race with undercut
        const projectedGap = this.simulateUndercut(
            player,
            opponent,
            optimalPitLap,
            raceState
        );

        const success = projectedGap < 0; // Negative gap = we're ahead

        // Calculate confidence based on data quality
        const confidence = this.calculateUndercutConfidence(player, opponent);

        let explanation: string;
        if (success) {
            explanation = `Pit on lap ${optimalPitLap}. Fresh tires + ${Math.abs(projectedGap).toFixed(1)}s advantage.`;
        } else {
            explanation = `Undercut not viable. Would emerge ${projectedGap.toFixed(1)}s behind.`;
        }

        return {
            target: opponent.driverId,
            targetName: opponent.driverName,
            currentGap,
            pitLap: optimalPitLap,
            projectedGapAfterPit: projectedGap,
            success,
            confidence,
            explanation
        };
    }

    /**
     * Assess threat from car behind
     */
    assessThreat(
        player: PlayerState,
        chaser: OpponentModel,
        _raceState: RaceState
    ): ThreatAssessment {
        const currentGap = Math.abs(player.gapBehind);

        // Calculate closing rate from recent lap times
        const closingRate = this.calculateClosingRate(player, chaser);

        // Calculate laps until catch
        const lapsUntilCatch = closingRate > 0
            ? Math.ceil(currentGap / closingRate)
            : Infinity;

        // Determine threat level
        let threatLevel: ThreatAssessment['threatLevel'];
        let recommendation: string;

        if (lapsUntilCatch <= 1) {
            threatLevel = 'imminent';
            recommendation = 'Defend immediately. Consider pit stop to break DRS train.';
        } else if (lapsUntilCatch <= 3) {
            threatLevel = 'high';
            recommendation = `Will catch in ${lapsUntilCatch} laps. Consider strategic pit or push for gap.`;
        } else if (lapsUntilCatch <= 8) {
            threatLevel = 'medium';
            recommendation = 'Monitor situation. Maintain current pace.';
        } else if (closingRate > 0) {
            threatLevel = 'low';
            recommendation = 'Closing slowly. No immediate action required.';
        } else {
            threatLevel = 'none';
            recommendation = 'Gap stable or extending. Focus on car ahead.';
        }

        return {
            driver: chaser.driverId,
            driverName: chaser.driverName,
            currentGap,
            closingRate,
            lapsUntilCatch,
            threatLevel,
            recommendation
        };
    }

    /**
     * Generate strategic recommendation based on full race state
     */
    generateRecommendation(raceState: RaceState): StrategicRecommendation {
        const player = raceState.players[0]; // Assume single player
        if (!player) {
            return {
                action: 'stay_out',
                reason: 'No player data available.',
                confidence: 0,
                alternativeActions: []
            };
        }

        const lapsRemaining = raceState.totalLaps - raceState.currentLap;

        // Check fuel constraint
        const fuelLapsRemaining = player.fuelRemaining / player.fuelPerLap;
        if (fuelLapsRemaining < lapsRemaining + 1) {
            const criticalLap = Math.floor(fuelLapsRemaining);
            if (criticalLap <= 1) {
                return {
                    action: 'box_now',
                    reason: `FUEL CRITICAL: Only ${fuelLapsRemaining.toFixed(1)} laps of fuel remaining.`,
                    confidence: 0.95,
                    alternativeActions: ['Risk running out on track']
                };
            }
            return {
                action: 'box_in_N_laps',
                laps: Math.max(1, criticalLap - 2),
                reason: `Must pit for fuel. Window closes in ${criticalLap} laps.`,
                confidence: 0.9,
                alternativeActions: ['Push window to limit']
            };
        }

        // Check tire degradation
        if (player.degradationSlope > 0.2) {
            // Rapid degradation - consider pitting
            return {
                action: 'box_next_lap',
                reason: `Tire degradation critical (+${player.degradationSlope.toFixed(2)}s/lap). Pace will collapse.`,
                confidence: 0.8,
                alternativeActions: ['Nurse tires to end', 'Attack before degradation']
            };
        }

        // Check threats
        const threats = raceState.opponents
            .map(opp => this.assessThreat(player, opp, raceState))
            .filter(t => t.threatLevel === 'imminent' || t.threatLevel === 'high');

        if (threats.length > 0 && threats[0].threatLevel === 'imminent') {
            return {
                action: 'defend',
                reason: `${threats[0].driverName} will catch in ${threats[0].lapsUntilCatch} laps. Closing at ${threats[0].closingRate.toFixed(2)}s/lap.`,
                confidence: 0.85,
                alternativeActions: ['Pit to break threat', 'Let pass and reattack']
            };
        }

        // Check undercut opportunities
        // ... (simplified for now)

        // Default: Stay out
        return {
            action: 'stay_out',
            reason: 'No immediate strategic action required. Maintain pace.',
            confidence: 0.7,
            alternativeActions: ['Pit for track position', 'Push for gap']
        };
    }

    // ========================================================================
    // PRIVATE HELPERS
    // ========================================================================

    private calculateGap(_player: PlayerState, _opponent: OpponentModel, _raceState: RaceState): number {
        // In a real implementation, this would use precise timing data
        // For now, use gapAhead as placeholder
        return 0; // TODO: Calculate from timing data
    }

    private findOptimalUndercutLap(
        _player: PlayerState,
        opponent: OpponentModel,
        raceState: RaceState
    ): number {
        // Optimal undercut is typically 1-2 laps before opponent's expected pit
        if (opponent.predictedPitWindow) {
            return Math.max(
                raceState.currentLap + 1,
                opponent.predictedPitWindow.earliest - 1
            );
        }
        // Default: pit in 2 laps if no prediction
        return raceState.currentLap + 2;
    }

    private simulateUndercut(
        player: PlayerState,
        opponent: OpponentModel,
        pitLap: number,
        _raceState: RaceState
    ): number {
        const currentGap = player.gapAhead;

        // Tire advantage per lap (fresh vs worn)
        const tireAdvantagePerLap = 0.3; // Assume 0.3s/lap for fresh vs worn

        // Laps between our pit and their expected pit
        const lapDifference = opponent.predictedPitWindow
            ? opponent.predictedPitWindow.earliest - pitLap
            : 3;

        // Projected gap = current gap - pit delta + tire advantage * laps
        const projectedGap = currentGap - this.pitDelta + (tireAdvantagePerLap * lapDifference);

        return projectedGap;
    }

    private calculateUndercutConfidence(player: PlayerState, opponent: OpponentModel): number {
        let confidence = 0.5; // Base confidence

        // Better data = higher confidence
        if (opponent.confidenceScore > 0.7) confidence += 0.2;
        if (opponent.inferredDegradation) confidence += 0.1;
        if (opponent.predictedPitWindow) confidence += 0.1;
        if (player.fuelPerLap > 0) confidence += 0.1;

        return Math.min(1, confidence);
    }

    private calculateClosingRate(player: PlayerState, chaser: OpponentModel): number {
        // Use degradation slopes to estimate pace difference
        const playerDeg = player.degradationSlope || 0;
        const chaserDeg = chaser.inferredDegradation?.slope || 0;

        // If chaser has lower degradation, they're faster
        // Positive = closing, Negative = extending
        return playerDeg - chaserDeg;
    }
}

// Singleton
let strategyPredictorInstance: StrategyPredictor | null = null;

export function getStrategyPredictor(): StrategyPredictor {
    if (!strategyPredictorInstance) {
        strategyPredictorInstance = new StrategyPredictor();
    }
    return strategyPredictorInstance;
}
