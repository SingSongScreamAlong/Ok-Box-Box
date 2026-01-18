import React from 'react';

interface InteractiveMapProps {
    trackId: string;
    turns: any[];
    onTurnSelect: (turn: any) => void;
    selectedTurnId?: string;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({ turns, onTurnSelect, selectedTurnId }) => {
    // In a real implementation, this would load a specific SVG path for the track
    // For now, we'll render a simplified visual representation (mock map)

    // Schematic positions for demo purposes - creating a loop
    // This is a placeholder until we have real SVG paths
    const getCoordinates = (index: number, total: number) => {
        const angle = (index / total) * 2 * Math.PI;
        const radiusX = 300;
        const radiusY = 150;
        return {
            x: 400 + radiusX * Math.cos(angle),
            y: 300 + radiusY * Math.sin(angle)
        };
    };

    return (
        <div className="w-full h-full flex items-center justify-center relative">
            <svg viewBox="0 0 800 600" className="w-full h-full max-w-4xl max-h-[80vh]">
                {/* Track Line - Simplified Loop */}
                <path
                    d="M 400 150 A 300 150 0 1 0 400 450 A 300 150 0 1 0 400 150"
                    fill="none"
                    stroke="#3f3f46"
                    strokeWidth="20"
                    strokeLinecap="round"
                    className="drop-shadow-lg"
                />
                <path
                    d="M 400 150 A 300 150 0 1 0 400 450 A 300 150 0 1 0 400 150"
                    fill="none"
                    stroke="#27272a"
                    strokeWidth="16"
                    strokeLinecap="round"
                />

                {/* Turn Markers */}
                {turns.map((turn, index) => {
                    const { x, y } = getCoordinates(index, turns.length);
                    const isSelected = selectedTurnId === turn.id;

                    return (
                        <g
                            key={turn.id}
                            onClick={(e) => { e.stopPropagation(); onTurnSelect(turn); }}
                            className="cursor-pointer transition-all duration-300 hover:scale-110"
                            style={{ transformOrigin: `${x}px ${y}px` }}
                        >
                            {/* Marker Circle */}
                            <circle
                                cx={x}
                                cy={y}
                                r={isSelected ? 18 : 12}
                                fill={isSelected ? '#00E676' : '#27272a'}
                                stroke={isSelected ? '#ffffff' : '#52525b'}
                                strokeWidth="2"
                                className="transition-all duration-300"
                            />

                            {/* Turn Number */}
                            <text
                                x={x}
                                y={y}
                                dy=".35em"
                                textAnchor="middle"
                                className={`text-[10px] font-bold ${isSelected ? 'fill-black' : 'fill-white'} pointer-events-none`}
                            >
                                {turn.number}
                            </text>

                            {/* Label on Hover/Select - simplified */}
                            {isSelected && (
                                <text
                                    x={x}
                                    y={y - 25}
                                    textAnchor="middle"
                                    className="fill-white text-xs font-medium bg-black/50"
                                    style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
                                >
                                    {turn.name}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>

            <div className="absolute bottom-8 right-8 bg-black/40 backdrop-blur px-4 py-2 rounded-lg text-xs text-zinc-500 border border-white/5">
                Interactive Track Map v1.0 • Click turns to view data
            </div>
        </div>
    );
};
