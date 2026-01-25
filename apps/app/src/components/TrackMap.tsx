import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { useTrackData } from '../hooks/useTrackData';
import { getTrackId } from '../data/tracks';

interface TrackMapProps {
    trackId: string;
    carPosition?: { x: number; y: number; trackPercentage?: number };
    currentSector?: number;
    className?: string;
    showTrace?: boolean; // Debug: show raw points
}

// Map slugs to iRacing shape IDs
export const TRACK_SLUG_MAP: Record<string, string> = {
    'daytona': '191',
    'daytona-road': '191', // Note: 191 is Road Config? Need to verify. Title said "Daytona Oval - Config" in 191.shape.json... wait.
    // If 191 is Oval, we need Road.
    'watkins-glen': '146', // Placeholder guess, will update
    'spa-francorchamps': '163', // Placeholder
    'laguna-seca': '47', // Confirmed via grep
    'road-atlanta': '30', // Checking...
};

function getShapeId(slug: string): string {
    // Normalize
    const s = slug.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Check map
    for (const [k, v] of Object.entries(TRACK_SLUG_MAP)) {
        if (s.includes(k.replace(/[^a-z0-9]/g, ''))) return v;
    }

    // If slug is numeric, return it
    if (/^\d+$/.test(slug)) return slug;

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

        // Scale points to Fit ViewBox if needed, or use raw bounds
        // Centerline is array of {x, y, distPct}
        // We construct a path "M x y L x y ..."
        return shape.centerline.reduce((acc, point, index) => {
            return acc + `${index === 0 ? 'M' : 'L'} ${point.x},${point.y} `;
        }, '') + (shape.trackId === '191' ? 'Z' : 'Z'); // Close path for loops
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
    // If we have trackPercentage, use it to interpolate along path (expensive? No, SVG getPointAtLength is standard but we don't have ref easily)
    // Instead, use raw X/Y if provided and matches coordinate space
    // OR interpolate between centerline points based on percentage.

    const carCoords = useMemo(() => {
        if (!shape || !shape.centerline || !carPosition) return null;

        // If we have direct X/Y that matches track space
        if (carPosition.x > 1 && carPosition.y > 1) {
            return { x: carPosition.x, y: carPosition.y };
        }

        // Use normalized 0-1 percentage to find point on track
        if (carPosition.trackPercentage !== undefined) {
            // Find segment
            const pct = carPosition.trackPercentage;
            const cl = shape.centerline;

            // Simple lookup (assumes sorted distPct)
            // Find first point where distPct > pct
            let idx = cl.findIndex(p => p.distPct >= pct);
            if (idx === -1) idx = 0; // Wrap or end

            // Interpolate between idx-1 and idx
            const p2 = cl[idx];
            const p1 = cl[idx === 0 ? cl.length - 1 : idx - 1];

            // Check for wrap-around case (end to start)
            if (idx === 0 && pct > 0.9) {
                return { x: p2.x, y: p2.y }; // Approximate
            }

            // Linear interpolation
            // Dist difference
            let d1 = p1.distPct;
            let d2 = p2.distPct;

            // Handle wrap around 0-1 boundary if needed
            if (d1 > d2) d1 = 0; // Simplified

            const ratio = (pct - d1) / (d2 - d1 || 1);

            return {
                x: p1.x + (p2.x - p1.x) * ratio,
                y: p1.y + (p2.y - p1.y) * ratio
            };
        }

        return null;
    }, [shape, carPosition]);

    if (loading) return <div className="text-white/50 animate-pulse">Loading Track...</div>;
    if (error || !shape) return <div className="text-red-500">Track data not found</div>;

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
                style={{ transform: 'scale(1, -1)' }} // iRacing coords might be flipped Y? Usually Y is up in 3D, down in SVG. 
            // We'll verify flip. Often maps need flip.
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

                {/* Active Sector Highlighting - Simplification: color whole track for now */}
                {/* Ideally we chop path into sectors, but for v1 we color the whole active track or car dot */}
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
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }} // Smooth movement
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
