import { useState, useEffect } from 'react';
import { MapPin, Flag, TrendingUp, TrendingDown, Target, History, Gauge, ThermometerSun, Loader2 } from 'lucide-react';
import { fetchTrackPerformance, TrackPerformanceData } from '../lib/driverService';

interface TrackDataPanelProps {
  track: {
    id: string;
    track: string;
    series: string;
    date: string;
    time: string;
    laps: number;
    weather?: string;
  };
}

interface TrackMetadata {
  config: string;
  country: string;
  length: string;
  turns: number;
  lapRecord: string;
  sectors: { name: string; trackBest: string }[];
  notes: string[];
}

const TRACK_METADATA: Record<string, TrackMetadata> = {
  'Watkins Glen': {
    config: 'Boot', country: 'USA', length: '3.4 mi', turns: 11, lapRecord: '1:42.892',
    sectors: [
      { name: 'S1 - Esses', trackBest: '27.891' },
      { name: 'S2 - Back Straight', trackBest: '30.892' },
      { name: 'S3 - Boot', trackBest: '44.109' },
    ],
    notes: ['Trail brake deeper into T1', 'Boot section: stay patient, apex late on exit', 'Watch tire temps in long right-handers'],
  },
  'Spa-Francorchamps': {
    config: 'Grand Prix', country: 'Belgium', length: '4.35 mi', turns: 19, lapRecord: '1:46.286',
    sectors: [
      { name: 'S1 - La Source to Eau Rouge', trackBest: '31.892' },
      { name: 'S2 - Kemmel to Rivage', trackBest: '41.234' },
      { name: 'S3 - Bus Stop', trackBest: '33.160' },
    ],
    notes: ['Eau Rouge: flat in qualifying, lift slightly in race with fuel', 'Pouhon: double apex, patience on exit', 'Bus Stop: brake later, use all the curb'],
  },
  'Laguna Seca': {
    config: 'Full Course', country: 'USA', length: '2.24 mi', turns: 11, lapRecord: '1:21.680',
    sectors: [
      { name: 'S1 - Andretti Hairpin', trackBest: '23.680' },
      { name: 'S2 - Corkscrew', trackBest: '30.891' },
      { name: 'S3 - Rainey Curve', trackBest: '27.109' },
    ],
    notes: ['Corkscrew: look at the tree, brake at 2 marker', 'T2: can go flat with good exit from T1', 'Rainey Curve: late apex, use all exit curb'],
  },
  'Road Atlanta': {
    config: 'Full Course', country: 'USA', length: '2.54 mi', turns: 12, lapRecord: '1:08.691',
    sectors: [
      { name: 'S1 - Esses', trackBest: '22.100' },
      { name: 'S2 - Back Straight', trackBest: '24.500' },
      { name: 'S3 - Final Corners', trackBest: '22.091' },
    ],
    notes: ['T1: late apex, use all the curb', 'Esses: rhythm is key', 'T10a/b: patience, set up for T12'],
  },
  'Daytona': {
    config: 'Road Course', country: 'USA', length: '3.56 mi', turns: 12, lapRecord: '1:33.875',
    sectors: [
      { name: 'S1 - Infield', trackBest: '48.200' },
      { name: 'S2 - Bus Stop', trackBest: '18.500' },
      { name: 'S3 - Banking', trackBest: '27.175' },
    ],
    notes: ['Bus stop chicane: brake late, use all curbs', 'Banking: flat out, stay high', 'Watch for traffic in infield'],
  },
};

const getTrackMetadata = (trackName: string): TrackMetadata => {
  for (const [key, value] of Object.entries(TRACK_METADATA)) {
    if (trackName.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  return { config: 'Unknown', country: 'Unknown', length: 'N/A', turns: 0, lapRecord: '--:--.---', sectors: [], notes: ['No track data available yet.'] };
};

export function TrackDataPanel({ track }: TrackDataPanelProps) {
  const [loading, setLoading] = useState(true);
  const [trackData, setTrackData] = useState<TrackPerformanceData | null>(null);
  const metadata = getTrackMetadata(track.track);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    
    fetchTrackPerformance(track.track).then(data => {
      if (mounted) {
        setTrackData(data);
        setLoading(false);
      }
    });

    return () => { mounted = false; };
  }, [track.track]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Track Header */}
      <div className="bg-[#f97316]/10 border border-[#f97316]/30 p-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              {track.track}
            </h2>
            <div className="flex items-center gap-4 mt-1 text-xs text-white/50">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{metadata.country}</span>
              <span>{metadata.config}</span>
              <span>{metadata.length}  {metadata.turns} turns</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-white/40">Upcoming</div>
            <div className="text-sm text-[#f97316]">{track.date} at {track.time}</div>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs">
          <span className="flex items-center gap-1 text-white/60"><Flag className="w-3 h-3" />{track.laps} laps</span>
          {track.weather && <span className="flex items-center gap-1 text-white/60"><ThermometerSun className="w-3 h-3" />{track.weather}</span>}
          <span className="text-white/40">{track.series}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-black/40 border border-white/10 p-3">
          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Your Best</div>
          <div className="text-base font-mono font-bold text-[#f97316]">{trackData?.yourBest || '--:--.---'}</div>
        </div>
        <div className="bg-black/40 border border-white/10 p-3">
          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Track Record</div>
          <div className="text-base font-mono font-bold text-white/60">{metadata.lapRecord}</div>
        </div>
        <div className="bg-black/40 border border-white/10 p-3">
          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Best Finish</div>
          <div className="text-base font-bold text-green-400">{trackData?.bestFinish ? `P${trackData.bestFinish}` : 'N/A'}</div>
        </div>
        <div className="bg-black/40 border border-white/10 p-3">
          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Sessions</div>
          <div className="text-base font-bold">{trackData?.sessions || 0}</div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sector Analysis */}
        {metadata.sectors.length > 0 && (
          <div className="bg-black/40 border border-white/10 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-[#f97316]" />
              Key Sectors
            </h3>
            <div className="space-y-2">
              {metadata.sectors.map((sector, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-white/60">{sector.name}</span>
                  <span className="font-mono text-white/40">Target: {sector.trackBest}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Engineer Notes */}
        {metadata.notes.length > 0 && (
          <div className="bg-black/40 border border-white/10 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-[#8b5cf6]" />
              Engineer Notes
            </h3>
            <ul className="space-y-1">
              {metadata.notes.map((note, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-white/70">
                  <span className="text-[#8b5cf6]"></span>
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Recent History from API */}
      {trackData && trackData.history.length > 0 && (
        <div className="bg-black/40 border border-white/10 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
            <History className="w-4 h-4 text-[#3b82f6]" />
            Your Recent Sessions at {track.track}
          </h3>
          <div className="space-y-1">
            {trackData.history.map((session, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0 text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-white/40 w-14">{session.date}</span>
                  <span className="text-white/60">{session.series}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`flex items-center gap-1 ${session.position < session.started ? 'text-green-400' : session.position > session.started ? 'text-red-400' : 'text-white/60'}`}>
                    {session.position < session.started ? <TrendingUp className="w-3 h-3" /> : session.position > session.started ? <TrendingDown className="w-3 h-3" /> : null}
                    P{session.position}
                  </span>
                  <span className="font-mono text-white/50">{session.bestLap}</span>
                  <span className={`${session.incidents > 2 ? 'text-red-400' : 'text-white/40'}`}>{session.incidents}x</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No history message */}
      {(!trackData || trackData.history.length === 0) && (
        <div className="bg-black/40 border border-white/10 p-4 text-center">
          <History className="w-6 h-6 text-white/20 mx-auto mb-2" />
          <p className="text-xs text-white/40">No session history at this track yet</p>
          <p className="text-[10px] text-white/30 mt-1">Complete a session to see your data here</p>
        </div>
      )}
    </div>
  );
}
