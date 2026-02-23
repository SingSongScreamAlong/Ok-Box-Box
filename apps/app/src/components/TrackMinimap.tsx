import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTrackData } from '../hooks/useTrackData';
import { getTrackId } from '../data/tracks';
import type { CarMapPosition } from '../hooks/useRelay';

/**
 * TrackMinimap — Compact track map for embedding in driver pages.
 * Shows player position + nearby cars on the actual track shape.
 * Designed for sidebar or card placement (120-200px).
 */

interface TrackMinimapProps {
    trackName: string | null;
    trackPosition: number | null;
    otherCars?: CarMapPosition[];
    className?: string;
}

export function TrackMinimap({ trackName, trackPosition, otherCars, className = '' }: TrackMinimapProps) {
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

    const getCoords = (pct: number) => {
        if (!shape?.centerline) return null;
        const cl = shape.centerline;
        let idx = cl.findIndex(p => p.distPct >= pct);
        if (idx === -1) idx = 0;
        const p2 = cl[idx];
        const p1 = cl[idx === 0 ? cl.length - 1 : idx - 1];
        let d1 = p1.distPct;
        const d2 = p2.distPct;
        if (d1 > d2) d1 = 0;
        const ratio = (pct - d1) / (d2 - d1 || 1);
        return {
            x: p1.x + (p2.x - p1.x) * ratio,
            y: p1.y + (p2.y - p1.y) * ratio
        };
    };

    const playerCoords = trackPosition != null ? getCoords(trackPosition) : null;

    if (!trackName || loading || !shape) {
        return (
            <div className={`flex items-center justify-center text-white/20 text-[10px] font-mono ${className}`}>
                {loading ? 'Loading...' : 'No track'}
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

                {/* Other cars — small dots */}
                {otherCars?.map((car, i) => {
                    if (car.isPlayer || !car.trackPercentage) return null;
                    const c = getCoords(car.trackPercentage);
                    if (!c) return null;
                    return (
                        <motion.circle
                            key={car.carNumber || i}
                            r="4"
                            fill={car.color || '#64748b'}
                            opacity="0.7"
                            initial={{ cx: c.x, cy: c.y }}
                            animate={{ cx: c.x, cy: c.y }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        />
                    );
                })}

                {/* Player car */}
                {playerCoords && (
                    <motion.g
                        initial={{ x: playerCoords.x, y: playerCoords.y }}
                        animate={{ x: playerCoords.x, y: playerCoords.y }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
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
