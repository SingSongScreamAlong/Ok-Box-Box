
import React, { useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTrackData } from '../../hooks/useTrackData';
import { TrackVisuals } from './TrackVisuals';
import { TrackControls } from './TrackControls';
import { TrackLabels } from './TrackLabels';
import { getTrackId, getTrackData, TRACK_SLUG_MAP } from '../../data/tracks';

/* 
  TrackMapPro: The Ultimate Race Control Surface
  - Handles 300+ iRacing tracks via `useTrackData`
  - Supports "Neon Glass" F1 Aesthetics
  - Manages Zoom/Pan and Data Overlays
*/

interface TrackMapProProps {
    trackId: string;
    carPosition?: { x: number; y: number; trackPercentage?: number };
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
    telemetry,
    className = "w-full h-full bg-slate-950"
}: TrackMapProProps) {
    const shapeId = getShapeId(trackId);
    const { shape, loading, error } = useTrackData(shapeId);
    const trackMetadata = getTrackData(trackId);

    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
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

    // Telemetry Normalization
    const speedTelemetry = useMemo(() => {
        if (!telemetry) return undefined;
        return telemetry.map(t => (t.speed || 0) / 300);
    }, [telemetry]);

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
            <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5 pointer-events-none" />

            {/* Main SVG Surface - rendering optimized */}
            <motion.svg
                viewBox={viewBox}
                className="w-full h-full pointer-events-auto cursor-grab active:cursor-grabbing"
                style={{ transform: 'scale(1, -1)' }}
                shapeRendering="geometricPrecision" // Critical for anti-aliasing
            >
                <defs>
                    {/* 
                      LED ROPE FILTERS 
                      1. glow-soft: The colored atmosphere around the rope.
                      2. glow-intense: The bright core bloom.
                    */}
                    <filter id="glow-soft" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="8" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    <filter id="glow-intense" x="-50%" y="-50%" width="200%" height="200%">
                        {/* Double blur for smooth falloff */}
                        <feGaussianBlur stdDeviation="2" result="blur1" />
                        <feGaussianBlur stdDeviation="5" result="blur2" />
                        <feMerge>
                            <feMergeNode in="blur2" />
                            <feMergeNode in="blur1" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                <TrackVisuals
                    shape={shape}
                    carPosition={carPosition}
                    telemetry={speedTelemetry}
                />

                {trackMetadata && trackMetadata.corners && (
                    <TrackLabels
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

            <div className="absolute bottom-4 left-4 font-mono text-[10px] text-cyan-500/50 pointer-events-none">
                {shape.trackId} // {zoom.toFixed(1)}x
            </div>
        </div>
    );
}
