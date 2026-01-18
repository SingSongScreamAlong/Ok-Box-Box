import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { InteractiveMap } from '../../components/track-intel/InteractiveMap';
import { TurnDetailPanel } from '../../components/track-intel/TurnDetailPanel';

interface TrackData {
    id: string;
    name: string;
    turns: any[];
}

import { TeamPrepPanel } from '../../components/track-intel/TeamPrepPanel';
import { Activity, ClipboardList } from 'lucide-react';

export const TrackMapPage: React.FC = () => {
    const { trackId } = useParams<{ trackId: string }>();
    const [track, setTrack] = useState<TrackData | null>(null);
    const [selectedTurn, setSelectedTurn] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'live' | 'prep'>('live');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTrack = async () => {
            try {
                // TODO: Replace with env var
                const response = await fetch(`http://localhost:3001/api/v1/tracks/${trackId}`);
                if (response.ok) {
                    const data = await response.json();
                    setTrack(data);
                }
            } catch (error) {
                console.error('Failed to fetch track:', error);
            } finally {
                setLoading(false);
            }
        };

        if (trackId) {
            fetchTrack();
        }
    }, [trackId]);

    if (loading) return <div className="text-white">Loading track data...</div>;
    if (!track) return <div className="text-white">Track not found</div>;

    const currentTurnData = track.turns.find(t => t.number === selectedTurn);

    return (
        <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
            <div className="flex-1 relative">
                <div className="absolute top-4 left-4 z-10 flex items-center gap-4">
                    <h1 className="text-3xl font-bold drop-shadow-md">{track.name}</h1>

                    {/* View Mode Toggle */}
                    <div className="flex bg-gray-800/80 backdrop-blur-sm rounded-lg p-1 border border-gray-700">
                        <button
                            onClick={() => setViewMode('live')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'live'
                                    ? 'bg-red-600 text-white shadow-lg'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <Activity className="w-4 h-4" /> Live
                        </button>
                        <button
                            onClick={() => setViewMode('prep')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'prep'
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <ClipboardList className="w-4 h-4" /> Prep
                        </button>
                    </div>
                </div>

                <InteractiveMap
                    trackId={track.id}
                    onTurnSelect={(turnId) => {
                        setSelectedTurn(turnId);
                        // If in prep mode, clicking a turn might just highlight it, or switch back to showing details if desired.
                        // For now, we keep the behavior simple.
                    }}
                    selectedTurn={selectedTurn}
                />
            </div>

            {/* Right Side Panel Area */}
            {(selectedTurn && viewMode === 'live') || viewMode === 'prep' ? (
                <div className="w-96 border-l border-gray-700 bg-gray-800 shadow-2xl relative z-20">
                    {viewMode === 'live' && selectedTurn && currentTurnData && (
                        <TurnDetailPanel turn={currentTurnData} onClose={() => setSelectedTurn(null)} />
                    )}
                    {viewMode === 'prep' && (
                        <TeamPrepPanel trackId={track.id} />
                    )}
                </div>
            ) : null}
        </div>
    );
};
