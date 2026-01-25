import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { useTrackData } from '../hooks/useTrackData';
import { getTrackId, TRACK_SLUG_MAP } from '../data/tracks';

interface TrackMapProps {
    trackId: string;
    carPosition?: { x: number; y: number; trackPercentage?: number };
    currentSector?: number;
    className?: string;
    showTrace?: boolean; // Debug: show raw points
}

// Logic to resolve slug -> shape ID
function getShapeId(slug: string): string {
    // Normalize
    const s = slug.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Check numeric first (optimization)
    if (/^\d+$/.test(slug)) return slug;

    // Check map
    for (const [k, v] of Object.entries(TRACK_SLUG_MAP)) {
        if (s.includes(k.replace(/[^a-z0-9]/g, ''))) return v;
    }

    return slug;
}

export function TrackMap({
    trackId,
    carPosition,
    currentSector,
    className
}: TrackMapProps) {
    const shapeId = getShapeId(trackId);
    const { shape, loading, error } = useTrackData(shapeId);

    // Generate SVG Path from Centerline
    const pathData = useMemo(() => {
        if (!shape || !shape.centerline) return '';
        return shape.centerline.reduce((acc, point, index) => {
            return acc + `${index === 0 ? 'M' : 'L'} ${point.x},${point.y} `;
        }, '') + 'Z';
    }, [shape]);

    // ViewBox
    const viewBox = useMemo(() => {
        if (!shape || !shape.bounds) return '0 0 1000 1000';
        const { xMin, xMax, yMin, yMax } = shape.bounds;
        const padding = Math.max(xMax - xMin, yMax - yMin) * 0.1;
        return `${xMin - padding} ${yMin - padding} ${xMax - xMin + padding * 2} ${yMax - yMin + padding * 2}`;
    }, [shape]);

    // Sector Colors (F1 Style)
    const getSectorColor = (sector?: number) => {
        switch (sector) {
            case 1: return '#fbbf24'; // Yellow
            case 2: return '#4ade80'; // Green
            case 3: return '#c084fc'; // Purple
            default: return '#f59e0b'; // Default Orange/Yellow
        }
    };

    const activeColor = getSectorColor(currentSector);

    // Car Position Calculation
    const carCoords = useMemo(() => {
        if (!shape || !shape.centerline || !carPosition) return null;

        // If we have direct X/Y that matches track space
        if (carPosition.x > 1 && carPosition.y > 1) {
            return { x: carPosition.x, y: carPosition.y };
        }

        // Use normalized 0-1 percentage to find point on track
        if (carPosition.trackPercentage !== undefined) {
            const pct = carPosition.trackPercentage;
            const cl = shape.centerline;

            let idx = cl.findIndex(p => p.distPct >= pct);
            if (idx === -1) idx = 0;

            const p2 = cl[idx];
            const p1 = cl[idx === 0 ? cl.length - 1 : idx - 1];

            // Interpolate
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

    if (loading) return <div className="text-white/50 animate-pulse text-xs">Loading Track...</div>;
    if (error || !shape) return <div className="text-red-500 text-xs text-center borderBorder border-red-900/30 p-2 rounded bg-black/50">Track shape not found ({shapeId})</div>;

    return (
        <div className={`relative w-full h-full ${className}`}>
            {/* Glow Filters */}
            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                <defs>
                    <filter id="track-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
            </svg>

            <svg
                viewBox={viewBox}
                className="w-full h-full overflow-visible"
                style={{ transform: 'scale(-1, -1)' }} // Flip both axes to match standard track map orientation
            >
                {/* Track Outline (Shadow) */}
                <path
                    d={pathData}
                    stroke="black"
                    strokeWidth="20"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.5"
                />

                {/* Track Base Line */}
                <path
                    d={pathData}
                    stroke="#333"
                    strokeWidth="12"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Active Sector/Track Line */}
                <path
                    d={pathData}
                    stroke={activeColor}
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#track-glow)"
                    opacity="1"
                />

                {/* Car Marker */}
                {carCoords && (
                    <motion.g
                        initial={{ x: carCoords.x, y: carCoords.y }}
                        animate={{ x: carCoords.x, y: carCoords.y }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    >
                        {/* Pulsing Dot */}
                        <circle r="20" fill={activeColor} opacity="0.4">
                            <animate attributeName="r" values="20;30;20" dur="1.5s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.4;0;0.4" dur="1.5s" repeatCount="indefinite" />
                        </circle>
                        <circle r="12" fill={activeColor} stroke="white" strokeWidth="2" />
                    </motion.g>
                )}
            </svg>
        </div>
    );
}
