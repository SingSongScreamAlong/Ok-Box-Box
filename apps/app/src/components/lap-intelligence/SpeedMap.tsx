/**
 * SpeedMap
 * SVG overlay that renders speed-colored segments on the track centerline.
 * Blue = slow, Green = medium, Red = fastest
 */

import { useMemo } from 'react';
import type { TrackShape } from '../../hooks/useTrackData';
import type { LapData } from './types';
import { speedAtDistance } from '../../hooks/useLapTelemetry';

interface SpeedMapProps {
  shape: TrackShape;
  lap: LapData | null;
}

/** Map speed (0–maxSpeed) to a color: blue → green → red */
function speedToColor(speed: number, minSpeed: number, maxSpeed: number): string {
  if (maxSpeed <= minSpeed) return 'rgba(59,130,246,0.8)'; // blue fallback
  const t = Math.max(0, Math.min(1, (speed - minSpeed) / (maxSpeed - minSpeed)));

  // Blue (0) → Green (0.5) → Red (1.0)
  let r: number, g: number, b: number;
  if (t < 0.5) {
    const s = t * 2; // 0→1 within first half
    r = Math.round(59 * (1 - s));
    g = Math.round(130 + (125 * s));
    b = Math.round(246 * (1 - s));
  } else {
    const s = (t - 0.5) * 2; // 0→1 within second half
    r = Math.round(34 + (221 * s));
    g = Math.round(255 * (1 - s * 0.6));
    b = Math.round(0);
  }
  return `rgb(${r},${g},${b})`;
}

const SEGMENT_COUNT = 120;

export function SpeedMap({ shape, lap }: SpeedMapProps) {
  const segments = useMemo(() => {
    if (!shape.centerline || shape.centerline.length < 2 || !lap || lap.samples.length < 5) {
      return null;
    }

    const cl = shape.centerline;

    // Compute speed at each segment point
    const speeds: number[] = [];
    const points: { x: number; y: number }[] = [];

    for (let i = 0; i <= SEGMENT_COUNT; i++) {
      const dist = i / SEGMENT_COUNT;
      const speed = speedAtDistance(lap.samples, dist);
      speeds.push(speed);

      // Find x,y on centerline
      let idx = cl.findIndex(p => p.distPct >= dist);
      if (idx <= 0) idx = 1;
      const prev = cl[idx - 1];
      const curr = cl[idx];
      const range = curr.distPct - prev.distPct || 0.001;
      const t = (dist - prev.distPct) / range;
      points.push({
        x: prev.x + (curr.x - prev.x) * t,
        y: prev.y + (curr.y - prev.y) * t,
      });
    }

    const minSpeed = Math.min(...speeds);
    const maxSpeed = Math.max(...speeds);

    // Build colored line segments
    const segs: { x1: number; y1: number; x2: number; y2: number; color: string }[] = [];
    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const avgSpeed = (speeds[i] + speeds[i + 1]) / 2;
      segs.push({
        x1: points[i].x,
        y1: points[i].y,
        x2: points[i + 1].x,
        y2: points[i + 1].y,
        color: speedToColor(avgSpeed, minSpeed, maxSpeed),
      });
    }

    return segs;
  }, [shape, lap]);

  if (!segments) return null;

  return (
    <g opacity="0.85">
      {segments.map((seg, i) => (
        <line
          key={i}
          x1={seg.x1}
          y1={seg.y1}
          x2={seg.x2}
          y2={seg.y2}
          stroke={seg.color}
          strokeWidth="6"
          strokeLinecap="round"
        />
      ))}
    </g>
  );
}
