import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';

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
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <MapPin size={18} className="text-orange-400" />
          <h1 className="text-sm font-bold uppercase tracking-widest text-white/60">Track Intelligence</h1>
        </div>
        <p className="text-xs text-white/30 mb-8 ml-7">
          Select a track to view turn-by-turn analysis, strategy notes, and coaching tips.
        </p>

        <div className="grid gap-3">
          {availableTracks.map(track => (
            <Link
              key={track.id}
              to={`/track-intel/${track.id}`}
              className="flex items-center justify-between border border-white/10 hover:border-orange-500/50 bg-white/[0.02] hover:bg-orange-500/5 p-5 transition-all group"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-white/30">{track.country}</span>
                  <h2 className="text-sm font-semibold text-white group-hover:text-orange-400 transition-colors">
                    {track.name}
                  </h2>
                </div>
                <div className="flex gap-4 text-xs text-white/30">
                  <span>Length: {track.length}</span>
                  <span>Turns: {track.turns}</span>
                </div>
              </div>
              <span className="text-white/20 group-hover:text-orange-400 transition-colors text-lg">→</span>
            </Link>
          ))}
        </div>

        <div className="mt-6 p-4 border border-white/5 bg-white/[0.01]">
          <p className="text-xs text-white/30">
            <strong className="text-orange-400">Note:</strong> Currently only Daytona has full map data. More tracks coming soon.
          </p>
        </div>
      </div>
    </div>
  );
};
