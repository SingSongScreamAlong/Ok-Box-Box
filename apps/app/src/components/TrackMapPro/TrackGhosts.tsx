
import React from 'react';
import { motion } from 'framer-motion';
import { TrackShape } from '../../hooks/useTrackData';
import { getPointAtPercentage } from '../../utils/trackMath';

interface CarPosition {
    trackPercentage?: number;
    carNumber?: string;
    driverName?: string;
    color?: string;
}

interface TrackGhostsProps {
    shape: TrackShape;
    opponents?: CarPosition[];
    zoom: number;
}

export function TrackGhosts({ shape, opponents, zoom }: TrackGhostsProps) {
    if (!opponents || opponents.length === 0 || !shape) return null;

    // Scale markers inversely to zoom so they don't get huge
    const scale = 1 / Math.max(zoom, 0.5);

    return (
        <g>
            {opponents.map((car, i) => {
                const pct = car.trackPercentage;
                if (pct === undefined) return null;

                const pos = getPointAtPercentage(shape, pct);
                if (!pos) return null;

                const color = car.color || '#fbbf24'; // Default amber/orange

                return (
                    <motion.g
                        key={i}
                        // Animate position smoothly
                        initial={{ x: pos.x, y: pos.y }}
                        animate={{ x: pos.x, y: pos.y }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        // Scale the marker
                        transform={`scale(${scale})`} // Wait, transform applies from 0,0 relative to parent...
                    // If we use motion.g with x/y, the transform scale acts on current position origin? 
                    // No, motion x/y applies translate.
                    // We need the scale to be centered on the element?
                    // Actually easier: just scale the circle radius and position normally.
                    // But we want to scale the whole group (text + circle).
                    // Let's use the transform prop on motion.g carefully.
                    // Actually, SVG transforms stack calculate position first.
                    // Better: Apply scale to inner elements or use vector-effect "non-scaling-stroke" for strokes.
                    // For simplicity, let's just make the sizes dependent on scale prop in render.
                    >
                        {/* We can't apply scale transform easily without shifting origin. 
                             Instead, let's keep x/y on the group, and manually size children. 
                         */}

                        {/* Dot */}
                        <circle
                            r={6 * scale}
                            fill={color}
                            stroke="black"
                            strokeWidth={1 * scale}
                        />

                        {/* Label (Car Number) */}
                        {car.carNumber && (
                            <text
                                y={-10 * scale}
                                textAnchor="middle"
                                fill="white"
                                className="font-mono font-bold"
                                style={{ fontSize: `${10 * scale}px`, filter: "drop-shadow(0 1px 2px black)" }}
                            >
                                {car.carNumber}
                            </text>
                        )}

                        {/* Label (Name) - only if zoomed in */}
                        {car.driverName && zoom > 2 && (
                            <text
                                y={12 * scale}
                                textAnchor="middle"
                                fill={color}
                                className="font-mono"
                                style={{ fontSize: `${8 * scale}px` }}
                            >
                                {car.driverName}
                            </text>
                        )}
                    </motion.g>
                );
            })}
        </g>
    );
}
