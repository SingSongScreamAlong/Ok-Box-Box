import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { InteractiveMap } from '../../components/track-intel/InteractiveMap';
import { TurnDetailPanel } from '../../components/track-intel/TurnDetailPanel';
import { TeamPrepPanel } from '../../components/track-intel/TeamPrepPanel';
import { Activity, ClipboardList } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://octopus-app-qsi3i.ondigitalocean.app';

interface TrackData {
  id: string;
  name: string;
  turns: any[];
}

export const TrackMapPage: React.FC = () => {
  const { trackId } = useParams<{ trackId: string }>();
  const [track, setTrack] = useState<TrackData | null>(null);
  const [selectedTurn, setSelectedTurn] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'live' | 'prep'>('live');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrack = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/v1/tracks/${trackId}`);
        if (response.ok) {
          const data = await response.json();
          setTrack(data);
        }
      } catch {
        // Track not found — show empty state
      } finally {
        setLoading(false);
      }
    };

    if (trackId) fetchTrack();
  }, [trackId]);

  if (loading) return <div className="text-white/30 p-8">Loading track data...</div>;
  if (!track) return <div className="text-white/30 p-8">Track not found</div>;

  const currentTurnData = track.turns.find(t => t.number === selectedTurn);

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden">
      <div className="flex-1 relative">
        <div className="absolute top-4 left-4 z-10 flex items-center gap-4">
          <h1 className="text-xs font-bold uppercase tracking-widest text-white/60 bg-black/80 px-3 py-2 border border-white/10">
            {track.name}
          </h1>

          <div className="flex bg-black/80 border border-white/10">
            <button
              onClick={() => setViewMode('live')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-all ${
                viewMode === 'live' ? 'bg-orange-500 text-black' : 'text-white/40 hover:text-white'
              }`}
            >
              <Activity className="w-3 h-3" /> Live
            </button>
            <button
              onClick={() => setViewMode('prep')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-all ${
                viewMode === 'prep' ? 'bg-blue-500 text-white' : 'text-white/40 hover:text-white'
              }`}
            >
              <ClipboardList className="w-3 h-3" /> Prep
            </button>
          </div>
        </div>

        <InteractiveMap
          trackId={track.id}
          onTurnSelect={turnId => setSelectedTurn(turnId)}
          selectedTurn={selectedTurn}
        />
      </div>

      {((selectedTurn && viewMode === 'live') || viewMode === 'prep') && (
        <div className="w-96 border-l border-white/10 bg-[#0a0a0a] relative z-20 overflow-y-auto">
          {viewMode === 'live' && selectedTurn && currentTurnData && (
            <TurnDetailPanel turn={currentTurnData} onClose={() => setSelectedTurn(null)} />
          )}
          {viewMode === 'prep' && <TeamPrepPanel trackId={track.id} />}
        </div>
      )}
    </div>
  );
};
