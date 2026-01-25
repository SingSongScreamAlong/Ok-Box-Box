import { useState, useEffect } from 'react';
import { MapPin, Flag, Users, Eye, AlertTriangle, Loader2, Car, Zap, Shield, Target } from 'lucide-react';
import { fetchTrackPerformance, TrackPerformanceData } from '../lib/driverService';
import { TrackMapRive } from './TrackMapRive';
import { useRelay } from '../hooks/useRelay';

interface SpotterDataPanelProps {
  track: {
    id: string;
    track: string;
    series: string;
    date: string;
    time: string;
    laps: number;
    weather?: string;
    expectedField?: number;
  };
}

interface TrackMetadata {
  config: string;
  country: string;
  length: string;
  turn1Risk: 'high' | 'medium' | 'low';
  passingZones: string[];
  dangerZones: string[];
  startTips: string[];
  trafficTips: string[];
}

const TRACK_METADATA: Record<string, TrackMetadata> = {
  'Watkins Glen': {
    config: 'Boot', country: 'USA', length: '3.4 mi',
    turn1Risk: 'high',
    passingZones: ['Main straight into T1', 'Back straight into Bus Stop', 'Boot exit onto front straight'],
    dangerZones: ['T1 first lap - heavy braking, cars 3-wide', 'Esses - no passing, hold your line', 'Boot chicane - easy to get squeezed'],
    startTips: [
      'T1 is chaos - protect inside, brake early lap 1',
      'Esses: single file, don\'t be a hero',
      'Settle in by lap 3, then race',
    ],
    trafficTips: [
      'Pass on back straight - they\'ll see you coming',
      'Avoid Esses battles - too risky',
      'Boot section: wait for exit, use run onto straight',
    ],
  },
  'Spa-Francorchamps': {
    config: 'Grand Prix', country: 'Belgium', length: '4.35 mi',
    turn1Risk: 'high',
    passingZones: ['Kemmel straight into Les Combes', 'Main straight into La Source', 'Blanchimont exit'],
    dangerZones: ['La Source lap 1 - everyone brakes late', 'Eau Rouge - never side by side', 'Bus Stop chicane - contact magnet'],
    startTips: [
      'La Source: brake EARLY lap 1, let chaos unfold',
      'Eau Rouge: single file until lap 3',
      'Kemmel: first real passing opportunity',
    ],
    trafficTips: [
      'Kemmel straight is your friend',
      'Never go side-by-side through Eau Rouge',
      'Bus Stop: wait for them to make a mistake',
    ],
  },
  'Laguna Seca': {
    config: 'Full Course', country: 'USA', length: '2.24 mi',
    turn1Risk: 'medium',
    passingZones: ['Main straight into T1', 'T5 exit onto back straight', 'Corkscrew exit'],
    dangerZones: ['Corkscrew - blind entry, no passing', 'T2 - easy to get punted', 'Rainey Curve - tight exit'],
    startTips: [
      'T1: wide entry works, cut back on exit',
      'T2: protect inside, they\'ll dive',
      'Corkscrew: single file lap 1',
    ],
    trafficTips: [
      'Short track = constant traffic',
      'Use T5 exit speed for passes',
      'Corkscrew: never alongside, wait for straight',
    ],
  },
};

const getTrackMetadata = (trackName: string): TrackMetadata => {
  for (const [key, value] of Object.entries(TRACK_METADATA)) {
    if (trackName.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  return {
    config: 'Unknown', country: 'Unknown', length: 'N/A',
    turn1Risk: 'medium',
    passingZones: ['Main straight'],
    dangerZones: ['Turn 1 lap 1'],
    startTips: ['Stay alert, trust my calls'],
    trafficTips: ['Be patient, wait for the straight'],
  };
};

const getRiskColor = (risk: 'high' | 'medium' | 'low') => {
  switch (risk) {
    case 'high': return 'text-red-400 bg-red-500/20 border-red-500/30';
    case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
    case 'low': return 'text-green-400 bg-green-500/20 border-green-500/30';
  }
};

export function SpotterDataPanel({ track }: SpotterDataPanelProps) {
  const [loading, setLoading] = useState(true);
  const [trackData, setTrackData] = useState<TrackPerformanceData | null>(null);
  const { telemetry, getCarMapPosition } = useRelay();
  const metadata = getTrackMetadata(track.track);
  const expectedField = track.expectedField || 24;
  
  // Get car position for map visualization
  const carPosition = telemetry.trackPosition !== null 
    ? getCarMapPosition(telemetry.trackPosition) 
    : undefined;

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchTrackPerformance(track.track).then(data => {
      if (mounted) { setTrackData(data); setLoading(false); }
    });
    return () => { mounted = false; };
  }, [track.track]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#3b82f6]" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Spotter Header */}
      <div className="bg-[#3b82f6]/10 border border-[#3b82f6]/30 p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Eye className="w-4 h-4 text-[#3b82f6]" />
              <span className="text-[10px] uppercase tracking-wider text-[#3b82f6]">Spotter's Briefing</span>
            </div>
            <h2 className="text-lg font-bold uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              {track.track}
            </h2>
            <div className="flex items-center gap-4 mt-1 text-xs text-white/50">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{metadata.country}</span>
              <span>{metadata.length}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#3b82f6]" />
              <span className="text-lg font-bold">{expectedField}</span>
              <span className="text-xs text-white/40">cars</span>
            </div>
          </div>
        </div>
      </div>

      {/* Track Map with Danger Zones */}
      <div className="bg-black/40 border border-white/10 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
          <Eye className="w-4 h-4 text-[#3b82f6]" />
          Track Overview - Danger Zones
        </h3>
        <div className="h-48 relative">
          <TrackMapRive 
            trackId={track.track.toLowerCase().replace(/[^a-z]/g, '-').replace(/-+/g, '-')}
            highlightDangerZones={true}
            carPosition={carPosition}
            currentSector={telemetry.sector || undefined}
            speed={telemetry.speed || undefined}
            className="w-full h-full"
          />
          <div className="absolute bottom-2 left-2 flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full"></span> Safe passing</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full"></span> Danger zone</span>
          </div>
        </div>
      </div>

      {/* Turn 1 Risk Assessment */}
      <div className={`border p-4 ${getRiskColor(metadata.turn1Risk)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6" />
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider">Turn 1 Risk Level</h3>
              <p className="text-xs opacity-80 mt-1">
                {metadata.turn1Risk === 'high' && 'Expect chaos. Brake early, survive lap 1.'}
                {metadata.turn1Risk === 'medium' && 'Moderate risk. Stay alert, trust my calls.'}
                {metadata.turn1Risk === 'low' && 'Usually clean. Race your race.'}
              </p>
            </div>
          </div>
          <div className="text-2xl font-bold uppercase">{metadata.turn1Risk}</div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Race Start Tips */}
        <div className="bg-black/40 border border-[#3b82f6]/20 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#3b82f6]" />
            Race Start Plan
          </h3>
          <ul className="space-y-2">
            {metadata.startTips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/70">
                <span className="text-[#3b82f6] mt-0.5">▸</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>

        {/* Traffic Management */}
        <div className="bg-black/40 border border-[#3b82f6]/20 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
            <Car className="w-4 h-4 text-[#3b82f6]" />
            Traffic Management
          </h3>
          <ul className="space-y-2">
            {metadata.trafficTips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/70">
                <span className="text-[#3b82f6] mt-0.5">▸</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Passing Zones */}
      <div className="bg-black/40 border border-white/10 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-green-400" />
          Safe Passing Zones
        </h3>
        <div className="flex flex-wrap gap-2">
          {metadata.passingZones.map((zone, i) => (
            <span key={i} className="px-3 py-1 bg-green-500/10 border border-green-500/30 text-xs text-green-400">
              {zone}
            </span>
          ))}
        </div>
      </div>

      {/* Danger Zones */}
      <div className="bg-black/40 border border-white/10 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-red-400" />
          Danger Zones - Avoid Battles Here
        </h3>
        <div className="space-y-2">
          {metadata.dangerZones.map((zone, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-white/70">
              <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
              {zone}
            </div>
          ))}
        </div>
      </div>

      {/* Field Info */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-black/40 border border-white/10 p-3 text-center">
          <Users className="w-4 h-4 text-white/40 mx-auto mb-1" />
          <div className="text-lg font-bold">{expectedField}</div>
          <div className="text-[10px] text-white/40">Field Size</div>
        </div>
        <div className="bg-black/40 border border-white/10 p-3 text-center">
          <Flag className="w-4 h-4 text-white/40 mx-auto mb-1" />
          <div className="text-lg font-bold">{track.laps}</div>
          <div className="text-[10px] text-white/40">Laps</div>
        </div>
        <div className="bg-black/40 border border-white/10 p-3 text-center">
          <Car className="w-4 h-4 text-white/40 mx-auto mb-1" />
          <div className="text-lg font-bold">~{Math.floor(track.laps / 3)}</div>
          <div className="text-[10px] text-white/40">Traffic Laps</div>
        </div>
      </div>

      {/* Your Incident History */}
      {trackData && trackData.history.length > 0 && (
        <div className="bg-black/40 border border-white/10 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-2">Your Incident History Here</h3>
          <div className="flex items-center gap-4 text-sm">
            {trackData.history.slice(0, 3).map((session, i) => (
              <span key={i} className={`${session.incidents > 2 ? 'text-red-400' : 'text-white/60'}`}>
                {session.date}: {session.incidents}x
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
