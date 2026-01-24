import React from 'react';
import { Link } from 'react-router-dom';

interface Track {
    id: string;
    name: string;
    country: string;
    length: string;
    turns: number;
}

const availableTracks: Track[] = [
    { id: 'daytona', name: 'Daytona International Speedway', country: '🇺🇸', length: '3.56 mi', turns: 12 },
    { id: 'spa', name: 'Circuit de Spa-Francorchamps', country: '🇧🇪', length: '4.35 mi', turns: 19 },
    { id: 'watkins-glen', name: 'Watkins Glen International', country: '🇺🇸', length: '3.45 mi', turns: 11 },
    { id: 'road-america', name: 'Road America', country: '🇺🇸', length: '4.05 mi', turns: 14 },
    { id: 'sebring', name: 'Sebring International Raceway', country: '🇺🇸', length: '3.74 mi', turns: 17 },
];

export const TrackSelectorPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-[#F5F5F5] text-[#0E0E0E] p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-sm font-semibold text-[#0E0E0E] uppercase tracking-wider mb-2">Track Intelligence</h1>
                <p className="text-xs text-[#0E0E0E]/50 mb-8">Select a track to view detailed turn-by-turn analysis, strategy notes, and coaching tips.</p>

                <div className="grid gap-4">
                    {availableTracks.map((track) => (
                        <Link
                            key={track.id}
                            to={`/track-intel/${track.id}`}
                            className="block bg-white hover:bg-[#F5F5F5] border border-[#0E0E0E]/20 hover:border-[#2F5BFF] p-5 transition-all duration-200 group"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-[#0E0E0E]/50 uppercase">{track.country}</span>
                                        <h2 className="text-base font-semibold text-[#0E0E0E] group-hover:text-[#2F5BFF] transition-colors">{track.name}</h2>
                                    </div>
                                    <div className="flex gap-4 mt-2 text-xs text-[#0E0E0E]/50">
                                        <span>Length: {track.length}</span>
                                        <span>Turns: {track.turns}</span>
                                    </div>
                                </div>
                                <span className="text-[#0E0E0E]/30 group-hover:text-[#2F5BFF] text-xl transition-colors">→</span>
                            </div>
                        </Link>
                    ))}
                </div>

                <div className="mt-8 p-4 bg-white border border-[#0E0E0E]/20">
                    <p className="text-xs text-[#0E0E0E]/70">
                        <strong className="text-[#FF7A18]">Note:</strong> Currently only Daytona has full map data. Other tracks are coming soon.
                    </p>
                </div>
            </div>
        </div>
    );
};
