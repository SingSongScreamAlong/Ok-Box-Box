
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrackShape } from '../../hooks/useTrackData';
import { getPointAtPercentage } from '../../utils/trackMath';

/*
  TrackVisuals: Clean, minimal track rendering matching Crew page aesthetic.
  Uses subtle gradients and clean lines instead of neon effects.
*/

interface CarPosition {
    x: number;
    y: number;
    trackPercentage?: number;
    carNumber?: string;
    driverName?: string;
    isPlayer?: boolean;
    color?: string;
    position?: number;
    inPit?: boolean;
}

interface TrackVisualsProps {
    shape: TrackShape;
    carPosition?: CarPosition;
    otherCars?: CarPosition[];
    showSectors?: boolean;
    onCarClick?: (car: CarPosition) => void;
}

// Position-based colors for podium + nearby cars
function getPositionColor(pos: number | undefined, fallback: string): string {
    if (!pos) return fallback;
    if (pos === 1) return '#fbbf24'; // Gold
    if (pos === 2) return '#94a3b8'; // Silver
    if (pos === 3) return '#d97706'; // Bronze
    return fallback;
}

export function TrackVisuals({ shape, carPosition, otherCars, showSectors = true, onCarClick }: TrackVisualsProps) {

    const fullPathData = useMemo(() => {
        if (!shape.centerline) return '';
        return shape.centerline.reduce((acc, point, index) => {
            return acc + `${index === 0 ? 'M' : 'L'} ${point.x},${point.y} `;
        }, '') + 'Z';
    }, [shape]);

    const carCoords = useMemo(() => {
        if (!carPosition) return null;
        if (carPosition.x > 1 && carPosition.y > 1) return { x: carPosition.x, y: carPosition.y };
        if (carPosition.trackPercentage !== undefined) return getPointAtPercentage(shape, carPosition.trackPercentage);
        return null;
    }, [carPosition, shape]);

    // Sector boundary points at 33% and 66%
    const sectorMarkers = useMemo(() => {
        if (!shape.centerline || !showSectors) return [];
        const markers: { x: number; y: number; nx: number; ny: number; label: string }[] = [];
        const sectorPcts = [0.333, 0.666];
        const labels = ['S2', 'S3'];
        const cl = shape.centerline;
        for (let s = 0; s < sectorPcts.length; s++) {
            const pct = sectorPcts[s];
            let idx = cl.findIndex(p => p.distPct >= pct);
            if (idx <= 0) continue;
            const p = cl[idx];
            const prev = cl[idx - 1];
            const dx = p.x - prev.x;
            const dy = p.y - prev.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            markers.push({
                x: p.x, y: p.y,
                nx: -dy / len * 18, ny: dx / len * 18,
                label: labels[s],
            });
        }
        return markers;
    }, [shape, showSectors]);

    return (
        <>
            {/* Definitions for gradients and effects */}
            <defs>
                <linearGradient id="trackGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1e293b" />
                    <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
                <filter id="trackGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
                <filter id="carGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Layer 1: Track shadow/depth */}
            <path
                d={fullPathData}
                stroke="#0a0a0a"
                strokeWidth="20"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.8"
            />

            {/* Layer 2: Track base - dark slate */}
            <path
                d={fullPathData}
                stroke="#1e293b"
                strokeWidth="14"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Layer 3: Track surface - subtle border */}
            <path
                d={fullPathData}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Layer 4: Racing line - neutral white glow */}
            <path
                d={fullPathData}
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.6"
                filter="url(#trackGlow)"
            />

            {/* Layer 5: Center line - subtle white highlight */}
            <path
                d={fullPathData}
                stroke="rgba(255,255,255,0.25)"
                strokeWidth="1"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Start/Finish Line */}
            {shape.centerline && shape.centerline.length > 1 && (() => {
                const sf = shape.centerline[0];
                const next = shape.centerline[1];
                const dx = next.x - sf.x;
                const dy = next.y - sf.y;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const nx = -dy / len * 20;
                const ny = dx / len * 20;
                return (
                    <line
                        x1={sf.x - nx} y1={sf.y - ny}
                        x2={sf.x + nx} y2={sf.y + ny}
                        stroke="white" strokeWidth="3" opacity="0.5"
                        strokeDasharray="4 4"
                    />
                );
            })()}

            {/* Pit Lane */}
            {shape.pitlane && shape.pitlane.length > 1 && (
                <path
                    d={shape.pitlane.reduce((acc, point, index) =>
                        acc + `${index === 0 ? 'M' : 'L'} ${point.x},${point.y} `, ''
                    )}
                    stroke="#f97316"
                    strokeWidth="4"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.3"
                    strokeDasharray="8 6"
                />
            )}

            {/* Sector Boundary Markers */}
            {sectorMarkers.map((m, i) => (
                <g key={`sector-${i}`}>
                    <line
                        x1={m.x - m.nx} y1={m.y - m.ny}
                        x2={m.x + m.nx} y2={m.y + m.ny}
                        stroke="#f97316" strokeWidth="2" opacity="0.4"
                        strokeDasharray="3 3"
                    />
                    <text
                        x={m.x + m.nx * 1.8} y={m.y + m.ny * 1.8}
                        textAnchor="middle"
                        fill="#f97316"
                        fontSize="10"
                        fontFamily="monospace"
                        fontWeight="bold"
                        opacity="0.5"
                    >
                        {m.label}
                    </text>
                </g>
            ))}

            {/* Other Cars */}
            {otherCars && otherCars.map((car, idx) => {
                const coords = car.x > 1 && car.y > 1
                    ? { x: car.x, y: car.y }
                    : car.trackPercentage !== undefined
                        ? getPointAtPercentage(shape, car.trackPercentage)
                        : null;
                if (!coords) return null;
                if (car.isPlayer) return null;
                const color = getPositionColor(car.position, car.color || '#64748b');
                const isPodium = car.position != null && car.position <= 3;
                return (
                    <motion.g
                        key={car.carNumber || idx}
                        initial={{ x: coords.x, y: coords.y }}
                        animate={{ x: coords.x, y: coords.y }}
                        transition={{ duration: 0.28, ease: 'linear' }}
                        style={{ cursor: onCarClick ? 'pointer' : undefined }}
                        onClick={() => onCarClick?.(car)}
                    >
                        {/* In-pit indicator */}
                        {car.inPit && (
                            <circle r="16" fill="none" stroke="#f97316" strokeWidth="2" opacity="0.6" strokeDasharray="4 3" />
                        )}
                        {/* Outer ring - larger for podium */}
                        <circle r={isPodium ? 14 : 10} fill="none" stroke={color} strokeWidth={isPodium ? 2 : 1.5} opacity={isPodium ? 0.6 : 0.3} />
                        {/* Inner dot */}
                        <circle r={isPodium ? 7 : 5} fill={color} opacity="0.9" />
                        {/* Car number label */}
                        {car.carNumber && (
                            <text
                                y="-16"
                                textAnchor="middle"
                                fill={isPodium ? color : 'white'}
                                fontSize={isPodium ? '11' : '9'}
                                fontFamily="monospace"
                                fontWeight="bold"
                                opacity={isPodium ? 0.9 : 0.6}
                                style={{ filter: 'drop-shadow(0 1px 2px black)' }}
                            >
                                {car.carNumber}
                            </text>
                        )}
                    </motion.g>
                );
            })}

            {/* Player Car Marker - cyan/teal accent for visibility */}
            {carCoords && (
                <motion.g
                    initial={{ x: carCoords.x, y: carCoords.y }}
                    animate={{ x: carCoords.x, y: carCoords.y }}
                    transition={{ duration: 0.24, ease: 'linear' }}
                >
                    {/* Outer glow ring */}
                    <circle r="24" fill="#06b6d4" fillOpacity="0.15" />
                    {/* Middle ring */}
                    <circle r="16" fill="none" stroke="#06b6d4" strokeWidth="2" opacity="0.6" />
                    {/* Inner bright dot */}
                    <circle r="8" fill="#06b6d4" filter="url(#carGlow)" />
                    {/* Center highlight */}
                    <circle r="3" fill="white" opacity="0.9" />
                    {/* Player label */}
                    <text
                        y="-22"
                        textAnchor="middle"
                        fill="#06b6d4"
                        fontSize="12"
                        fontFamily="monospace"
                        fontWeight="bold"
                        style={{ filter: 'drop-shadow(0 1px 3px black)' }}
                    >
                        YOU
                    </text>
                </motion.g>
            )}
        </>
    );
}
