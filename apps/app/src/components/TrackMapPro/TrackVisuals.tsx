
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

    // 1. Pre-calculate path data for reusable layers
    const fullPathData = useMemo(() => {
        if (!shape.centerline) return '';
        return shape.centerline.reduce((acc, point, index) => {
            return acc + `${index === 0 ? 'M' : 'L'} ${point.x},${point.y} `;
        }, '') + 'Z';
    }, [shape]);

    // 2. Generate path segments for Heatmap (The "Core" of the rope)
    const segments = useMemo(() => {
        if (!shape.centerline) return [];

        const pts = shape.centerline;
        const segs = [];

        for (let i = 0; i < pts.length - 1; i++) {
            const p1 = pts[i];
            const p2 = pts[i + 1];

            let color = '#38bdf8'; // Default Cyan

            if (telemetry && telemetry.length > 0) {
                const tIdx = Math.floor((i / pts.length) * telemetry.length);
                const val = telemetry[tIdx] ?? 0; // 0 to 1
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
                    strokeWidth="8" // Thicker core
                    strokeLinecap="round" // Critical for smoothing
                    strokeLinejoin="round"
                    opacity="1"
                />
            );
        }
        // Loop closure
        if (shape.trackId !== 'dragstrip_or_point_to_point') {
            const p1 = pts[pts.length - 1];
            const p2 = pts[0];
            let color = '#38bdf8';
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
                    strokeWidth="8"
                    strokeLinecap="round"
                    opacity="1"
                />
            );
        }
        return segs;
    }, [shape, telemetry]);

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
            {/* Layer 1: Mounting / Backdrop (Simulates the physical rail) */}
            <path
                d={fullPathData}
                stroke="#020617" // Very dark slate/black background
                strokeWidth="28"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Layer 2: The "Atmosphere" (Wide Soft Glow) - Uses filter 1 */}
            <g filter="url(#glow-soft)" opacity="0.6">
                {/* Re-using segments here is expensive relative to a single path, 
                     but necessary for the glow to match the heat color. 
                     Optimization: Use a wider stroke width for this layer. */}
                {segments.map((s: any) => React.cloneElement(s, { strokeWidth: "16", key: s.key + '-glow' }))}
            </g>

            {/* Layer 3: The "Tube" (Solid Color) - Uses filter 2 for slight bloom */}
            <g filter="url(#glow-intense)">
                {segments}
            </g>

            {/* Layer 4: The "Filament" (White Core) - Adds the "Solid" look */}
            <path
                d={fullPathData}
                stroke="white"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.9"
            />

            {/* Car Marker */}
            {carCoords && (
                <motion.g
                    initial={{ x: carCoords.x, y: carCoords.y }}
                    animate={{ x: carCoords.x, y: carCoords.y }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                >
                    {/* Simplified marker to not distract from the rope */}
                    <circle r="25" fill="#38bdf8" fillOpacity="0.2" stroke="#38bdf8" strokeWidth="1" />
                    <circle r="6" fill="white" filter="url(#glow-intense)" />
                </motion.g>
            )}
        </>
    );
}
