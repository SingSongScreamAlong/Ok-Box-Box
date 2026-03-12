import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTrackData } from '../hooks/useTrackData';
import { getTrackId } from '../data/tracks';
import { getPointAtPercentage } from '../utils/trackMath';
import type { CarMapPosition } from '../hooks/useRelay';

/**
 * TrackMinimap — Compact track map for embedding in driver pages.
 * Shows player position + nearby cars + incident markers on the actual track shape.
 * Designed for sidebar or card placement (120-200px).
 */

interface IncidentMarker {
    id: string;
    trackPosition: number; // 0–1 track percentage
    severity: 'low' | 'medium' | 'high';
}

interface TrackMinimapProps {
    trackName: string | null;
    trackPosition: number | null;
    otherCars?: CarMapPosition[];
    incidents?: IncidentMarker[];
    className?: string;
}

const INCIDENT_COLORS: Record<IncidentMarker['severity'], string> = {
    high: '#ef4444',
    medium: '#f97316',
    low: '#eab308',
};

export function TrackMinimap({ trackName, trackPosition, otherCars, incidents, className = '' }: TrackMinimapProps) {
    const shapeId = trackName ? getTrackId(trackName) : undefined;
    const { shape, loading } = useTrackData(shapeId);

    const pathData = useMemo(() => {
        if (!shape?.centerline) return '';
        return shape.centerline.reduce((acc, point, i) =>
            acc + `${i === 0 ? 'M' : 'L'} ${point.x},${point.y} `, ''
        ) + 'Z';
    }, [shape]);

    const viewBox = useMemo(() => {
        if (!shape?.bounds) return '0 0 1000 1000';
        const { xMin, xMax, yMin, yMax } = shape.bounds;
        const pad = Math.max(xMax - xMin, yMax - yMin) * 0.12;
        return `${xMin - pad} ${yMin - pad} ${xMax - xMin + pad * 2} ${yMax - yMin + pad * 2}`;
    }, [shape]);

    const playerCoords = trackPosition != null ? getPointAtPercentage(shape, trackPosition) : null;

    if (!trackName || loading || !shape) {
        return (
            <div className={`flex items-center justify-center text-white/20 text-[10px] font-mono ${className}`}>
                {loading ? 'Loading...' : 'No track'}
            </div>
        );
    }

    if (shape.isFallback) {
        return (
            <div className={`flex flex-col items-center justify-center text-center text-white/30 text-[10px] font-mono px-3 ${className}`}>
                <div>TRACK SHAPE UNAVAILABLE</div>
                <div className="text-white/20 mt-1">{trackName}</div>
            </div>
        );
    }

    return (
        <div className={`relative ${className}`}>
            <svg viewBox={viewBox} className="w-full h-full">
                {/* Track shadow */}
                <path d={pathData} stroke="#0a0a0a" strokeWidth="14" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
                {/* Track base */}
                <path d={pathData} stroke="#1e293b" strokeWidth="10" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                {/* Track surface */}
                <path d={pathData} stroke="rgba(255,255,255,0.15)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />

                {/* Incident markers — rendered below cars so cars stay readable */}
                {incidents?.map((inc) => {
                    const c = getPointAtPercentage(shape, inc.trackPosition);
                    if (!c) return null;
                    const color = INCIDENT_COLORS[inc.severity];
                    return (
                        <g key={inc.id}>
                            {/* Outer glow */}
                            <circle cx={c.x} cy={c.y} r="9" fill={color} opacity="0.25" />
                            {/* Inner dot */}
                            <circle cx={c.x} cy={c.y} r="4.5" fill={color} opacity="0.85" />
                        </g>
                    );
                })}

                {/* Other cars — small dots */}
                {otherCars?.map((car, i) => {
                    if (car.isPlayer || car.trackPercentage == null) return null;
                    const c = getPointAtPercentage(shape, car.trackPercentage);
                    if (!c) return null;
                    return (
                        <motion.circle
                            key={car.carNumber || i}
                            r="4"
                            fill={car.color || '#64748b'}
                            opacity="0.7"
                            initial={{ cx: c.x, cy: c.y }}
                            animate={{ cx: c.x, cy: c.y }}
                            transition={{ duration: 0.28, ease: 'linear' }}
                        />
                    );
                })}

                {/* Player car */}
                {playerCoords && (
                    <motion.g
                        initial={{ x: playerCoords.x, y: playerCoords.y }}
                        animate={{ x: playerCoords.x, y: playerCoords.y }}
                        transition={{ duration: 0.24, ease: 'linear' }}
                    >
                        <circle r="10" fill="#06b6d4" fillOpacity="0.2" />
                        <circle r="6" fill="#06b6d4" />
                        <circle r="2.5" fill="white" opacity="0.9" />
                    </motion.g>
                )}
            </svg>
        </div>
    );
}
