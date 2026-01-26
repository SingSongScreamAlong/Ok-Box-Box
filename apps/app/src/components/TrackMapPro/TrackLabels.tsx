
import React from 'react';
import { motion } from 'framer-motion';
import { TrackCorner } from '../../data/tracks';
import { TrackShape } from '../../hooks/useTrackData';
import { getPointAtPercentage } from '../../utils/trackMath';

interface TrackLabelsProps {
    shape: TrackShape;
    corners: TrackCorner[];
    zoom: number;
}

export function TrackLabels({ shape, corners, zoom }: TrackLabelsProps) {
    if (!corners || corners.length === 0 || !shape) return null;

    // Scale font size inversely to zoom
    const scale = 1 / Math.max(zoom, 0.5);

    return (
        <g className="pointer-events-none">
            {corners.map((corner, i) => {
                // Use normalized distance to find point on track
                // If corner doesn't have normalizedDistance, fallback? 
                // Currently tracks.ts has normalizedDistance for all.
                const pct = corner.apex.normalizedDistance;
                if (pct === undefined) return null;

                const pos = getPointAtPercentage(shape, pct);
                if (!pos) return null;

                return (
                    <motion.g
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 + i * 0.05 }}
                        transform={`translate(${pos.x}, ${pos.y}) scale(${scale}, -${scale})`}
                    >
                        {/* Label Background/Glow for readability */}
                        <text
                            textAnchor="middle"
                            y="-15"
                            className="fill-black/50 stroke-black stroke-[4px] font-sans font-bold text-[20px]"
                        >
                            {corner.number}
                        </text>

                        {/* Main Label */}
                        <text
                            textAnchor="middle"
                            y="-15"
                            className="fill-white font-sans font-bold text-[20px]"
                            style={{ filter: "drop-shadow(0 0 4px #000)" }}
                        >
                            {corner.number}
                        </text>

                        {/* Corner Name (only show if zoomed in) */}
                        {corner.name && zoom > 0.8 && (
                            <text
                                textAnchor="middle"
                                y="5"
                                className="fill-cyan-400 font-mono text-[12px] uppercase tracking-wider"
                            >
                                {corner.name}
                            </text>
                        )}
                    </motion.g>
                );
            })}
        </g>
    );
}
