
import { useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTrackData } from '../../hooks/useTrackData';
import { TrackVisuals } from './TrackVisuals';
import { TrackControls } from './TrackControls';
import { TrackLabels } from './TrackLabels';
import { getTrackData, TRACK_SLUG_MAP } from '../../data/tracks';

/* 
  TrackMapPro: The Ultimate Race Control Surface
  - Handles 300+ iRacing tracks via `useTrackData`
  - Supports "Neon Glass" F1 Aesthetics
  - Manages Zoom/Pan and Data Overlays
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

interface TrackMapProProps {
    trackId: string;
    carPosition?: CarPosition;
    otherCars?: CarPosition[];
    telemetry?: {
        speed?: number;
        throttle?: number;
        brake?: number;
        gear?: number;
    }[];
    className?: string;
}

function getShapeId(slug: string): string {
    const s = slug.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const [k, v] of Object.entries(TRACK_SLUG_MAP)) {
        if (s.includes(k.replace(/[^a-z0-9]/g, ''))) return v;
    }
    if (/^\d+$/.test(slug)) return slug;
    return slug;
}

export function TrackMapPro({
    trackId,
    carPosition,
    otherCars,
    telemetry,
    className = "w-full h-full bg-slate-950"
}: TrackMapProProps) {
    const shapeId = getShapeId(trackId);
    const { shape, loading, error } = useTrackData(shapeId);
    const trackMetadata = getTrackData(trackId);

    const [zoom, setZoom] = useState(1);
    const [pan] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    const viewBox = useMemo(() => {
        if (!shape || !shape.bounds) return '0 0 1000 1000';
        const { xMin, xMax, yMin, yMax } = shape.bounds;
        const width = xMax - xMin;
        const height = yMax - yMin;

        const cx = xMin + width / 2;
        const cy = yMin + height / 2;

        const pad = 0.1;
        const baseW = width * (1 + pad * 2);
        const baseH = height * (1 + pad * 2);

        const currentW = baseW / zoom;
        const currentH = baseH / zoom;

        const viewX = cx - (currentW / 2) + pan.x;
        const viewY = cy - (currentH / 2) + pan.y;

        return `${viewX} ${viewY} ${currentW} ${currentH}`;
    }, [shape, zoom, pan]);

    
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = -e.deltaY * 0.001;
        setZoom(z => Math.max(0.2, Math.min(10, z + delta)));
    };

    if (loading) return (
        <div className="flex items-center justify-center w-full h-full text-cyan-500 font-mono text-xs animate-pulse">
            LOADING_TRACK_GEOMETRY_SYSTEM...
        </div>
    );

    if (error || !shape) return (
        <div className="flex flex-col items-center justify-center w-full h-full text-red-500 font-mono text-xs p-4 text-center">
            <div>TRACK_DATA_MISSING_OR_CORRUPT</div>
            <div className="text-white/30 mt-2">ID: {shapeId}</div>
        </div>
    );

    return (
        <div
            ref={containerRef}
            className={`relative overflow-hidden selection:bg-none ${className}`}
            onWheel={handleWheel}
        >
            {/* Main SVG Surface */}
            <motion.svg
                viewBox={viewBox}
                className="w-full h-full pointer-events-auto cursor-grab active:cursor-grabbing"
                shapeRendering="geometricPrecision"
            >
                <TrackVisuals
                    shape={shape}
                    carPosition={carPosition}
                    otherCars={otherCars}
                />

                {trackMetadata && trackMetadata.corners && (
                    <TrackLabels
                        shape={shape}
                        corners={trackMetadata.corners}
                        zoom={zoom}
                    />
                )}

            </motion.svg>

            <TrackControls
                onZoomIn={() => setZoom(z => Math.min(z * 1.2, 10))}
                onZoomOut={() => setZoom(z => Math.max(z / 1.2, 0.2))}
                currentZoom={zoom}
            />

            <div className="absolute bottom-4 left-4 font-mono text-[10px] text-white/30 pointer-events-none">
                {shape.trackId}
            </div>
        </div>
    );
}
