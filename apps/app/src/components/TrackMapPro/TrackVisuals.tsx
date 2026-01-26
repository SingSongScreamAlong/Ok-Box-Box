
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrackShape } from '../../hooks/useTrackData';

/*
  TrackVisuals: The rendering engine for the "Neon Glass" look.
  This component renders the track path, using segmented strokes for telemetry heatmaps.
*/

interface CarPosition {
    x: number;
    y: number;
    trackPercentage?: number;
    carNumber?: string;
    driverName?: string;
    isPlayer?: boolean;
    color?: string;
}

interface TrackVisualsProps {
    shape: TrackShape;
    carPosition?: CarPosition;
    otherCars?: CarPosition[];
    telemetry?: number[]; // Data points (0-1) matching the centerline resolution roughly
}

export function TrackVisuals({ shape, carPosition, otherCars, telemetry }: TrackVisualsProps) {

    // Calculate coordinates for any car position
    const getCarCoords = (pos: CarPosition) => {
        if (!shape.centerline) return null;

        if (pos.x > 1 && pos.y > 1) {
            return { x: pos.x, y: pos.y };
        }

        if (pos.trackPercentage !== undefined) {
            const pct = pos.trackPercentage;
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
    };

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

            {/* Layer 2: The "Zone" (Wider stroke for heat) */}
            <g opacity="0.4">
                {segments.map((s: any) => React.cloneElement(s, { strokeWidth: "12", key: s.key + '-base' }))}
            </g>

            {/* Layer 3: The "Line" (Sharp Core) */}
            <g>
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

            {/* Other Cars - rendered first so player is on top */}
            {otherCars && otherCars.map((car, idx) => {
                const coords = getCarCoords(car);
                if (!coords) return null;
                const color = car.color || '#94a3b8'; // Default slate
                return (
                    <motion.g
                        key={car.carNumber || idx}
                        initial={{ x: coords.x, y: coords.y }}
                        animate={{ x: coords.x, y: coords.y }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    >
                        <circle r="18" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1" />
                        <circle r="4" fill={color} />
                        {car.carNumber && (
                            <text
                                y="-22"
                                textAnchor="middle"
                                fill={color}
                                fontSize="12"
                                fontFamily="monospace"
                                fontWeight="bold"
                            >
                                {car.carNumber}
                            </text>
                        )}
                    </motion.g>
                );
            })}

            {/* Player Car Marker - on top */}
            {carCoords && (
                <motion.g
                    initial={{ x: carCoords.x, y: carCoords.y }}
                    animate={{ x: carCoords.x, y: carCoords.y }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                >
                    {/* Player marker - larger and brighter */}
                    <circle r="25" fill="#38bdf8" fillOpacity="0.2" stroke="#38bdf8" strokeWidth="2" />
                    <circle r="8" fill="white" filter="url(#glow-intense)" />
                </motion.g>
            )}
        </>
    );
}
