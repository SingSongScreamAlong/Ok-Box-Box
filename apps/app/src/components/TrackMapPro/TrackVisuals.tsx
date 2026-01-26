
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrackShape } from '../../hooks/useTrackData';

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
}

interface TrackVisualsProps {
    shape: TrackShape;
    carPosition?: CarPosition;
    otherCars?: CarPosition[];
}

export function TrackVisuals({ shape, carPosition, otherCars }: TrackVisualsProps) {

    const getCarCoords = (pos: CarPosition) => {
        if (!shape.centerline) return null;
        if (pos.x > 1 && pos.y > 1) return { x: pos.x, y: pos.y };
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

    const fullPathData = useMemo(() => {
        if (!shape.centerline) return '';
        return shape.centerline.reduce((acc, point, index) => {
            return acc + `${index === 0 ? 'M' : 'L'} ${point.x},${point.y} `;
        }, '') + 'Z';
    }, [shape]);

    const carCoords = useMemo(() => {
        if (!shape.centerline || !carPosition) return null;
        if (carPosition.x > 1 && carPosition.y > 1) return { x: carPosition.x, y: carPosition.y };
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

            {/* Other Cars */}
            {otherCars && otherCars.map((car, idx) => {
                const coords = getCarCoords(car);
                if (!coords) return null;
                const color = car.color || '#64748b';
                return (
                    <motion.g
                        key={car.carNumber || idx}
                        initial={{ x: coords.x, y: coords.y }}
                        animate={{ x: coords.x, y: coords.y }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    >
                        {/* Outer ring */}
                        <circle r="12" fill="none" stroke={color} strokeWidth="1.5" opacity="0.4" />
                        {/* Inner dot */}
                        <circle r="5" fill={color} opacity="0.9" />
                    </motion.g>
                );
            })}

            {/* Player Car Marker - cyan/teal accent for visibility */}
            {carCoords && (
                <motion.g
                    initial={{ x: carCoords.x, y: carCoords.y }}
                    animate={{ x: carCoords.x, y: carCoords.y }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                >
                    {/* Outer glow ring */}
                    <circle r="24" fill="#06b6d4" fillOpacity="0.15" />
                    {/* Middle ring */}
                    <circle r="16" fill="none" stroke="#06b6d4" strokeWidth="2" opacity="0.6" />
                    {/* Inner bright dot */}
                    <circle r="8" fill="#06b6d4" filter="url(#carGlow)" />
                    {/* Center highlight */}
                    <circle r="3" fill="white" opacity="0.9" />
                </motion.g>
            )}
        </>
    );
}
