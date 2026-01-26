
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTrackData, TrackShape } from '../../hooks/useTrackData';
import { TrackVisuals } from './TrackVisuals';
import { TrackControls } from './TrackControls';
import { getTrackId } from '../../data/tracks';

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
    }[]; // Array of telemetry points for specific segments? Or just current car state?

    // View State
    onSectorSelect?: (sector: number) => void;
    className?: string;
    theme?: 'f1-dark' | 'hologram' | 'print';
}

export function TrackMapPro({
    trackId,
    carPosition,
    telemetry,
    className = "w-full h-full bg-slate-950"
}: TrackMapProProps) {
    // 1. Data Loading (Scalable 300+ System) [UNCHANGED DATA SOURCE]
    // We use the exact same hook that reads the 489 shape files.
    const { shape, loading, error } = useTrackData(getTrackId(trackId));

    // 2. Viewport Management (Zoom/Pan interaction)
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });

    // 3. Derived Geometry
    const viewBox = useMemo(() => {
        if (!shape || !shape.bounds) return '0 0 1000 1000';
        const { xMin, xMax, yMin, yMax } = shape.bounds;
        const width = xMax - xMin;
        const height = yMax - yMin;

        // Add 10% padding
        const p = Math.max(width, height) * 0.1;
        return `${xMin - p} ${yMin - p} ${width + p * 2} ${height + p * 2}`;
    }, [shape]);

    // 4. Derived Telemetry Arrays for Visuals
    // Extract simple arrays for the heatmap components
    const speedTelemetry = useMemo(() => {
        if (!telemetry) return undefined;
        return telemetry.map(t => (t.speed || 0) / 300); // Normalize 0-300kmh to 0-1
    }, [telemetry]);

    if (loading) return (
        <div className="flex items-center justify-center w-full h-full text-cyan-500 font-mono text-xs animate-pulse">
            LOADING_TRACK_GEOMETRY_SYSTEM...
        </div>
    );

    if (error || !shape) return (
        <div className="flex items-center justify-center w-full h-full text-red-500 font-mono text-xs">
            TRACK_DATA_MISSING_OR_CORRUPT
        </div>
    );

    return (
        <div className={`relative overflow-hidden selection:bg-none ${className}`}>
            {/* Background Grid Layer (context) */}
            <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5 pointer-events-none" />

            {/* Main SVG Surface */}
            <motion.svg
                viewBox={viewBox}
                className="w-full h-full pointer-events-auto cursor-grab active:cursor-grabbing"
                style={{ transform: 'scale(1, -1)' }} // iRacing coords are Y-up
                drag
                dragConstraints={{ left: -1000, right: 1000, top: -1000, bottom: 1000 }} // Refine this later
            >
                {/* Filters Definition (Neon Glows) */}
                <defs>
                    <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <linearGradient id="speed-gradient" gradientUnits="userSpaceOnUse">
                        {/* Dynamic gradient stops will be injected here based on telemetry */}
                        <stop offset="0%" stopColor="#ef4444" /> {/* Slow (Red) */}
                        <stop offset="100%" stopColor="#22c55e" /> {/* Fast (Green) */}
                    </linearGradient>
                </defs>

                {/* The Track Visuals (The "Meat" of the display) */}
                <TrackVisuals
                    shape={shape}
                    carPosition={carPosition}
                    telemetry={speedTelemetry}
                />

            </motion.svg>

            {/* Overlay UI Controls */}
            <TrackControls
                onZoomIn={() => setZoom(z => Math.min(z * 1.2, 5))}
                onZoomOut={() => setZoom(z => Math.max(z / 1.2, 0.5))}
                currentZoom={zoom}
            />

            {/* Floating Info Label */}
            <div className="absolute bottom-4 left-4 font-mono text-[10px] text-cyan-500/50">
                TRK_ID: {shape.trackId} // PTS: {shape.centerline.length} // DATA: {telemetry ? 'LIVE' : 'OFF'}
            </div>
        </div>
    );
}
