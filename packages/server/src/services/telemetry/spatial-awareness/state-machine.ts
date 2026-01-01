/**
 * Spatial State Machine
 * Tracks pairwise relationships between cars (Clear/Overlap) with hysteresis
 */

export type OverlapState = 'CLEAR' | 'OVERLAP';

export interface PairwiseState {
    state: OverlapState;
    lastTransitionTime: number; // For hysteresis
    maxOverlapDetected: number;
}

export class SpatialStateMachine {
    private states: Map<string, PairwiseState> = new Map();
    private readonly HYSTERESIS_MS = 200; // ms to hold state to prevent flickering

    private getKey(idA: string, idB: string): string {
        return [idA, idB].sort().join(':');
    }

    /**
     * Update state based on current instantaneous overlap
     * Returns true if state CHANGED
     */
    update(idA: string, idB: string, currentOverlap: number, now: number): boolean {
        const key = this.getKey(idA, idB);
        let pair = this.states.get(key);

        if (!pair) {
            pair = { state: 'CLEAR', lastTransitionTime: now, maxOverlapDetected: 0 };
            this.states.set(key, pair);
        }

        const OVERLAP_THRESHOLD = 0.15; // 15% overlap triggers state
        const CLEAR_THRESHOLD = 0.05;   // Must drop below 5% to clear (hysteresis)

        let newState = pair.state;

        if (pair.state === 'CLEAR') {
            if (currentOverlap > OVERLAP_THRESHOLD) {
                newState = 'OVERLAP';
            }
        } else {
            // In OVERLAP
            if (currentOverlap < CLEAR_THRESHOLD) {
                // Check time hysteresis
                if (now - pair.lastTransitionTime > this.HYSTERESIS_MS) {
                    newState = 'CLEAR';
                }
            }
        }

        if (newState !== pair.state) {
            pair.state = newState;
            pair.lastTransitionTime = now;
            pair.maxOverlapDetected = currentOverlap;
            return true;
        }

        // Update stats
        pair.maxOverlapDetected = Math.max(pair.maxOverlapDetected, currentOverlap);
        return false;
    }

    getState(idA: string, idB: string): OverlapState {
        return this.states.get(this.getKey(idA, idB))?.state || 'CLEAR';
    }
}
