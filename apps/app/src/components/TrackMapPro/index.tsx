
import React, { useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTrackData } from '../../hooks/useTrackData';
import { TrackVisuals } from './TrackVisuals';
import { TrackControls } from './TrackControls';
import { TrackLabels } from './TrackLabels'; // New Smart Labels
import { getTrackId, getTrackData, TRACK_SLUG_MAP } from '../../data/tracks';

/* 
  TrackMapPro: The Ultimate Race Control Surface
  - Handles 300+ iRacing tracks via `useTrackData`
  - Supports "Neon Glass" F1 Aesthetics
  - Manages Zoom/Pan and Data Overlays
*/

interface TrackMapProProps {
    trackId: string; // Slug (e.g. 'daytona') or ID (e.g. '381')
    carPosition?: { x: number; y: number; trackPercentage?: number };

    // Data Layers
    telemetry?: {
        speed?: number; // For heatmap coloring
        throttle?: number;
        brake?: number;
        gear?: number;
    }[];

    className?: string;
}

// Helper to resolve the Shape ID (physical file) from the Slug
function getShapeId(slug: string): string {
    const s = slug.toLowerCase().replace(/[^a-z0-9]/g, '');
    // 1. Check direct map
    for (const [k, v] of Object.entries(TRACK_SLUG_MAP)) {
        if (s.includes(k.replace(/[^a-z0-9]/g, ''))) return v;
    }
    // 2. Check if already numeric (shape ID)
    if (/^\d+$/.test(slug)) return slug;
    return slug;
}

export function TrackMapPro({
    trackId,
    carPosition,
    telemetry,
    className = "w-full h-full bg-slate-950"
}: TrackMapProProps) {
    // 1. Resolve IDs
    // shapeId -> for loading the SVG geometry (e.g. "381")
    // metaId -> for loading the turn names/metadata (e.g. "daytona")
    const shapeId = getShapeId(trackId);

    // 2. Load Data
    const { shape, loading, error } = useTrackData(shapeId);
    const trackMetadata = getTrackData(trackId); // Get manually curated metadata (Turns)

    // 3. Viewport State (Zoom/Pan)
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    // 4. Derived ViewBox (The Camera)
    const viewBox = useMemo(() => {
        if (!shape || !shape.bounds) return '0 0 1000 1000';

        const { xMin, xMax, yMin, yMax } = shape.bounds;
        const width = xMax - xMin;
        const height = yMax - yMin;

        // Center of the track
        const cx = xMin + width / 2;
        const cy = yMin + height / 2;

        // Apply Zoom (smaller viewbox = higher zoom)
        // Zoom 1 = Fit to bounds with 10% padding
        // Zoom 2 = Half size viewbox
        const pad = 0.1;
        const baseW = width * (1 + pad * 2);
        const baseH = height * (1 + pad * 2);

        const currentW = baseW / zoom;
        const currentH = baseH / zoom;

        // Apply Pan
        // Pan X/Y are in SVG units relative to center
        const viewX = cx - (currentW / 2) + pan.x;
        const viewY = cy - (currentH / 2) + pan.y;

        return `${viewX} ${viewY} ${currentW} ${currentH}`;
    }, [shape, zoom, pan]);

    // 5. Telemetry
    const speedTelemetry = useMemo(() => {
        if (!telemetry) return undefined;
        return telemetry.map(t => (t.speed || 0) / 300);
    }, [telemetry]);

    // Handlers
    const handleWheel = (e: React.WheelEvent) => {
        // Simple zoom on wheel
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
            {/* Background Grid Layer */}
            <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5 pointer-events-none" />

            {/* Main SVG Surface */}
            <motion.svg
                viewBox={viewBox}
                className="w-full h-full pointer-events-auto cursor-grab active:cursor-grabbing"
                style={{ transform: 'scale(1, -1)' }} // iRacing Y-UP

                // Drag Logic (Pan)
                onPointerDown={(e) => {
                    // We can implement drag-pan here or use framer-motion drag on a group
                    // Using framer-motion drag on SVG is tricky with viewBox.
                    // We'll trust the Zoom controls for precision and implement native drag later if needed.
                }}
            >
                <defs>
                    <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* VISUALS LAYER */}
                <TrackVisuals
                    shape={shape}
                    carPosition={carPosition}
                    telemetry={speedTelemetry}
                />

                {/* LABELS LAYER (Non-scaled text) */}
                {/* We map the turn metadata from `tracks.ts` if available */}
                {trackMetadata && trackMetadata.corners && (
                    <TrackLabels
                        corners={trackMetadata.corners}
                        zoom={zoom}
                    />
                )}

            </motion.svg>

            {/* CONTROLS OVERLAY */}
            <TrackControls
                onZoomIn={() => setZoom(z => Math.min(z * 1.2, 10))}
                onZoomOut={() => setZoom(z => Math.max(z / 1.2, 0.2))}
                currentZoom={zoom}
            />

            {/* INFO OVERLAY */}
            <div className="absolute bottom-4 left-4 font-mono text-[10px] text-cyan-500/50 pointer-events-none">
                TRK: {shape.trackId} <br />
                PTS: {shape.centerline?.length} <br />
                Z: {zoom.toFixed(2)}x
            </div>
        </div>
    );
}
