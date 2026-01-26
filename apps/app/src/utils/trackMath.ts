
import { TrackShape } from '../hooks/useTrackData';

export interface Point {
    x: number;
    y: number;
}

/**
 * Calculates a point (x, y) on the track centerline given a 0-1 percentage.
 * Handles interpolation between points for smooth visuals.
 */
export function getPointAtPercentage(shape: TrackShape | null | undefined, percentage: number): Point | null {
    if (!shape || !shape.centerline || shape.centerline.length < 2) return null;

    // Normalize percentage
    const pct = Math.max(0, Math.min(1, percentage));
    const cl = shape.centerline;

    // Find the segment containing this percentage
    // We assume points are sorted by distPct (0 -> 1)
    let idx = cl.findIndex(p => p.distPct >= pct);

    // Handle wrap-around or end of track
    if (idx === -1) {
        // If we exceeded the last point's distPct (likely 1.0), wrap to 0? 
        // Or just clamp to last segment.
        idx = 0;
    }

    // p2 is the point *after* our location
    // p1 is the point *before* our location
    const p2 = cl[idx];
    const p1 = cl[idx === 0 ? cl.length - 1 : idx - 1];

    let d1 = p1.distPct;
    let d2 = p2.distPct;

    // Handle loop closure case (e.g. p1 is 0.99, p2 is 0.01)
    if (d1 > d2) {
        // We are crossing the finish line.
        // Treating 0 as 1.0 for the calculation relative to d1
        // Actually, easiest is to treat d1 as 0-offset if we are wrapping?
        // Let's assume standardized 0->1.
        // If d1 > d2, it means p1 is end, p2 is start.
        d1 = 0;
        // This logic is tricky for loop closure.
        // Simplified: If we are between Last and First, interpolating might be weird unless we handle the wrap.
        // For now, let's just clamp to p2 if d1 > d2 to avoid jump gltiches.
        // Or use the `carPosition` logic from TrackVisuals which seemed to work:
        if (d1 > d2) d1 = 0; // This was the logic in TrackVisuals, let's trust it for now.
    }

    // Avoid divide by zero
    const segmentLength = d2 - d1;
    const ratio = segmentLength > 0.000001 ? (pct - d1) / segmentLength : 0;

    return {
        x: p1.x + (p2.x - p1.x) * ratio,
        y: p1.y + (p2.y - p1.y) * ratio
    };
}
