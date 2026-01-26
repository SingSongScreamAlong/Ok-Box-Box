
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrackShape } from '../../hooks/useTrackData';

/*
  TrackVisuals: The rendering engine for the "Neon Glass" look.
  This component renders the track path, using segmented strokes for telemetry heatmaps.
*/

interface TrackVisualsProps {
    shape: TrackShape;
    carPosition?: { x: number; y: number; trackPercentage?: number };
    telemetry?: number[]; // Data points (0-1) matching the centerline resolution roughly
}

export function TrackVisuals({ shape, carPosition, telemetry }: TrackVisualsProps) {

    // 1. Generate path segments for Heatmap (Performance Heavy: Memoize carefully)
    // We chop the line into segments. If telemetry is provided, we color each segment.
    const segments = useMemo(() => {
        if (!shape.centerline) return [];

        const pts = shape.centerline;
        const segs = [];

        for (let i = 0; i < pts.length - 1; i++) {
            const p1 = pts[i];
            const p2 = pts[i + 1];

            // Determine color from telemetry
            // If telemetry is shorter/longer, map index
            let color = '#ff0000'; // DEMO: RED

            if (telemetry && telemetry.length > 0) {
                // Map current point index 'i' to telemetry index
                // This assumes telemetry covers the lap evenly or 1:1
                const tIdx = Math.floor((i / pts.length) * telemetry.length);
                const val = telemetry[tIdx] ?? 0; // 0 to 1

                // Gradient Logic: Red(0) -> Yellow(0.5) -> Green(1)
                // Simple HSL impl
                const hue = val * 120; // 0=Red, 120=Green
                color = `hsl(${hue}, 100%, 50%)`;
            }

            segs.push(
                <line
                    key={i}
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={color}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#neon-glow)"
                    opacity="1"
                />
            );
        }
        // Handle Loop Closure (last to first)
        if (shape.trackId !== 'dragstrip_or_point_to_point') { // Heuristic
            const p1 = pts[pts.length - 1];
            const p2 = pts[0];
            // Color from last telemetry point
            // DEMO: Keep consistent red default if no telemetry
            let color = '#ff0000'; // Default Red for Demo

            if (telemetry && telemetry.length > 0) {
                const val = telemetry[telemetry.length - 1] ?? 0;
                const hue = val * 120;
                color = `hsl(${hue}, 100%, 50%)`;
            }
            segs.push(
                <line
                    key="close"
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={color}
                    strokeWidth="6"
                    strokeLinecap="round"
                    filter="url(#neon-glow)"
                    opacity="1"
                />
            );
        }

        return segs;
    }, [shape, telemetry]);

    // 2. Full Path String (for the background/ghost layer)
    const fullPathData = useMemo(() => {
        if (!shape.centerline) return '';
        return shape.centerline.reduce((acc, point, index) => {
            return acc + `${index === 0 ? 'M' : 'L'} ${point.x},${point.y} `;
        }, '') + 'Z';
    }, [shape]);

    // 3. Car Calculation
    const carCoords = useMemo(() => {
        if (!shape.centerline || !carPosition) return null;

        if (carPosition.x > 1 && carPosition.y > 1) {
            return { x: carPosition.x, y: carPosition.y };
        }

        if (carPosition.trackPercentage !== undefined) {
            const pct = carPosition.trackPercentage;
            const cl = shape.centerline;
            let idx = cl.findIndex(p => p.distPct >= pct);
            if (idx === -1) idx = 0;

            const p2 = cl[idx];
            const p1 = cl[idx === 0 ? cl.length - 1 : idx - 1];

            let d1 = p1.distPct;
            let d2 = p2.distPct;
            if (d1 > d2) d1 = 0;

            const ratio = (pct - d1) / (d2 - d1 || 1);

            return {
                x: p1.x + (p2.x - p1.x) * ratio,
                y: p1.y + (p2.y - p1.y) * ratio
            };
        }
        return null;
    }, [shape, carPosition]);

    return (
        <>
            {/* Layer 1: Glass Track Base (Dark outline) - Always Draw Full Path */}
            <path
                d={fullPathData}
                stroke="#0f172a" // Slate-900
                strokeWidth="24"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Layer 2: The "Neon Core" Heatmap segments */}
            {segments}

            {/* Layer 3: Car Marker */}
            {carCoords && (
                <motion.g
                    initial={{ x: carCoords.x, y: carCoords.y }}
                    animate={{ x: carCoords.x, y: carCoords.y }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                >
                    {/* Outer Ring Pulse */}
                    <circle r="30" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.5">
                        <animate attributeName="r" values="30;50;30" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
                    </circle>

                    {/* Inner Glow Dot */}
                    <circle r="8" fill="#ffffff" filter="url(#neon-glow)" />
                </motion.g>
            )}
        </>
    );
}
