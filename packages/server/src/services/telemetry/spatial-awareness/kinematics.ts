/**
 * Kinematics & Spatial Math
 * Pure functions for calculating gaps, closing rates, and relative positions.
 */

export interface Position2D {
    x: number;
    y: number;
}

export interface Vector2D {
    x: number;
    y: number;
}

export interface CarState {
    id: string;
    lapDistPct: number; // 0.0 - 1.0
    trackLengthMeters: number;
    velocity: Vector2D; // m/s
    trackWidth: number; // m (normalized)
    laneOffset: number; // -1.0 (left) to 1.0 (right)
    lateralG?: number;  // G-force lateral (+ = right)
    longitudinalG?: number; // G-force longitudinal (+ = accel, - = brake)
}

export class Kinematics {

    /**
     * Calculate longitudinal gap in meters given track percentage
     * Handles lap wrap-around (e.g. 0.99 vs 0.01)
     */
    static getLongitudinalGap(
        pctA: number,
        pctB: number,
        trackLength: number
    ): number {
        let diff = pctB - pctA;

        // Handle wrap-around
        if (diff > 0.5) diff -= 1.0;
        if (diff < -0.5) diff += 1.0;

        return diff * trackLength;
    }

    /**
     * Calculate closing rate (positive = closing, negative = separating)
     * A closing on B
     */
    static getClosingRate(velA: Vector2D, velB: Vector2D): number {
        // Project relative velocity onto relative position vector
        const relVelX = velA.x - velB.x;
        const relVelY = velA.y - velB.y;

        // Simple approximation magnitude for now, assuming track direction alignment
        // Ideally we project this onto the track tangent
        return Math.sqrt(relVelX * relVelX + relVelY * relVelY);
    }

    /**
     * Determine overlap percentage [0.0 - 1.0]
     * 1.0 = Fully alongside (bumper to bumper match)
     * 0.0 = Nose to tail
     * 0.5 = Half car overlap
     */
    static calculateOverlap(gapMeters: number, carLength: number = 4.5): number {
        const absGap = Math.abs(gapMeters);
        if (absGap >= carLength) return 0;
        return (carLength - absGap) / carLength;
    }

    /**
     * Detect if car B is in the 'blind spot' or alongside car A
     * Returns side: 'LEFT', 'RIGHT', or null
     */
    static getRelativeSide(carA: CarState, carB: CarState): 'LEFT' | 'RIGHT' | null {
        // Simple lane logic: 
        // A laneOffset = 0.5 (Right)
        // B laneOffset = -0.5 (Left)
        // B is to the LEFT of A

        const lateralDiff = carB.laneOffset - carA.laneOffset;

        // Threshold for lateral separation to be considered "alongside" in a lane
        // If they are in the same lane (diff ~ 0), it's a rear-end risk, not side-by-side
        if (Math.abs(lateralDiff) < 0.2) return null;

        return lateralDiff < 0 ? 'LEFT' : 'RIGHT';
    }
}
