
import { TrackShape } from '../hooks/useTrackData';

export interface Point {
    x: number;
    y: number;
}

/**
 * Calculates a point (x, y) on the track centerline given a 0-1 percentage.
 * Handles interpolation between points and wrap-around at the finish line.
 */
export function getPointAtPercentage(shape: TrackShape | null | undefined, percentage: number): Point | null {
    if (!shape || !shape.centerline || shape.centerline.length < 2) return null;

    const pct = Math.max(0, Math.min(1, percentage));
    const cl = shape.centerline;

    let idx = cl.findIndex(p => p.distPct >= pct);
    // If pct exceeds the last point's distPct (e.g. exactly 1.0), wrap to segment [last, first]
    if (idx === -1) idx = 0;

    // p2 is the point at or just after our position; p1 is the point just before
    const p2 = cl[idx];
    const p1 = cl[idx === 0 ? cl.length - 1 : idx - 1];

    const d1 = p1.distPct;
    const d2 = p2.distPct;

    let ratio: number;
    if (d1 > d2) {
        // Wrap-around: p1 is near the finish (e.g. 0.998), p2 is near the start (e.g. 0.002).
        // "Unwrap" by treating d2 as d2 + 1.0 and pct as pct + 1.0 when pct < d1.
        const unwrappedD2 = d2 + 1.0;
        const unwrappedPct = pct < d1 ? pct + 1.0 : pct;
        const segLen = unwrappedD2 - d1;
        ratio = segLen > 0.000001 ? (unwrappedPct - d1) / segLen : 0;
    } else {
        const segLen = d2 - d1;
        ratio = segLen > 0.000001 ? (pct - d1) / segLen : 0;
    }

    return {
        x: p1.x + (p2.x - p1.x) * ratio,
        y: p1.y + (p2.y - p1.y) * ratio
    };
}
