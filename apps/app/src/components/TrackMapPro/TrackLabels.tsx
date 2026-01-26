
import React from 'react';
import { motion } from 'framer-motion';
import { TrackCorner } from '../../data/tracks'; // Assuming this interface is exported

interface TrackLabelsProps {
    corners: TrackCorner[];
    zoom: number;
}

export function TrackLabels({ corners, zoom }: TrackLabelsProps) {
    if (!corners || corners.length === 0) return null;

    // Scale font size inversely to zoom to keep text readable but not huge
    // Base size 12px -> at 2x zoom effectively 6px in track units
    const scale = 1 / Math.max(zoom, 0.5);

    return (
        <g className="pointer-events-none">
            {corners.map((corner, i) => {
                if (!corner.apex) return null;

                return (
                    <motion.g
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 + i * 0.05 }}
                        transform={`translate(${corner.apex.x}, ${corner.apex.y}) scale(${scale}, -${scale})`} // Flip Y for text
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

                        {/* Corner Name (only show if zoomed in or sparse) */}
                        {corner.name && zoom > 1.5 && (
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
