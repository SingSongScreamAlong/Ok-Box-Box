import { useState, useEffect } from 'react';
import { MapPin, Flag, Fuel, Gauge, Wrench, ThermometerSun, Loader2, Settings, Zap, Timer } from 'lucide-react';
import { fetchTrackPerformance, TrackPerformanceData } from '../lib/driverService';

interface EngineerDataPanelProps {
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
  fuelPerLap: number;
  pitLossTime: number;
  setupNotes: string[];
  strategyNotes: string[];
}

const TRACK_METADATA: Record<string, TrackMetadata> = {
  'Watkins Glen': {
    config: 'Boot', country: 'USA', length: '3.4 mi', turns: 11,
    fuelPerLap: 0.62, pitLossTime: 28,
    setupNotes: [
      'Soften rear ARB for better rotation through the Boot',
      'Add rear wing for high-speed stability in the Esses',
      'Lower front ride height for better turn-in response',
    ],
    strategyNotes: [
      'Fuel window opens around lap 22-25 for a 45-lap race',
      'Undercut works well here - pit 1 lap early if possible',
      'Save fuel in Esses section to extend stint if needed',
    ],
  },
  'Spa-Francorchamps': {
    config: 'Grand Prix', country: 'Belgium', length: '4.35 mi', turns: 19,
    fuelPerLap: 0.78, pitLossTime: 32,
    setupNotes: [
      'Max downforce for Eau Rouge confidence',
      'Stiffen front for Pouhon stability',
      'Softer rear springs for traction out of La Source',
    ],
    strategyNotes: [
      'Weather changes quickly - monitor radar',
      'Long pit lane - overcut can work better here',
      'Fuel heavy for first stint, run light at end',
    ],
  },
  'Laguna Seca': {
    config: 'Full Course', country: 'USA', length: '2.24 mi', turns: 11,
    fuelPerLap: 0.48, pitLossTime: 24,
    setupNotes: [
      'Lower rear for Corkscrew stability',
      'Stiffen front ARB for Andretti Hairpin',
      'Soft rear toe for rotation through T6',
    ],
    strategyNotes: [
      'Short track = more lapped traffic',
      'No-stop possible for 25-lap races',
      'Tire deg is high - manage early stint',
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
    config: 'Unknown', country: 'Unknown', length: 'N/A', turns: 0,
    fuelPerLap: 0.6, pitLossTime: 28,
    setupNotes: ['Analyze practice data for setup recommendations'],
    strategyNotes: ['Run practice laps to calculate fuel consumption'],
  };
};

export function EngineerDataPanel({ track }: EngineerDataPanelProps) {
  const [loading, setLoading] = useState(true);
  const [trackData, setTrackData] = useState<TrackPerformanceData | null>(null);
  const metadata = getTrackMetadata(track.track);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchTrackPerformance(track.track).then(data => {
      if (mounted) { setTrackData(data); setLoading(false); }
    });
    return () => { mounted = false; };
  }, [track.track]);

  // Calculate fuel strategy
  const totalFuel = metadata.fuelPerLap * track.laps;
  const tankSize = 20; // Assume 20 gallon tank
  const stopsNeeded = Math.ceil(totalFuel / tankSize) - 1;
  const optimalPitLap = stopsNeeded > 0 ? Math.floor(track.laps / (stopsNeeded + 1)) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#f97316]" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Engineer Header */}
      <div className="bg-[#f97316]/10 border border-[#f97316]/30 p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Wrench className="w-4 h-4 text-[#f97316]" />
              <span className="text-[10px] uppercase tracking-wider text-[#f97316]">Engineer's Briefing</span>
            </div>
            <h2 className="text-lg font-bold uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              {track.track}
            </h2>
            <div className="flex items-center gap-4 mt-1 text-xs text-white/50">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{metadata.country}</span>
              <span>{metadata.length} • {metadata.turns} turns</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-white/40">{track.date}</div>
            <div className="text-sm text-[#f97316]">{track.time}</div>
          </div>
        </div>
      </div>

      {/* Fuel Strategy - Engineer's Focus */}
      <div className="bg-black/40 border border-[#f97316]/20 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
          <Fuel className="w-4 h-4 text-[#f97316]" />
          Fuel Strategy
        </h3>
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center">
            <div className="text-2xl font-mono font-bold text-[#f97316]">{metadata.fuelPerLap.toFixed(2)}</div>
            <div className="text-[10px] text-white/40 uppercase">Gal/Lap</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-mono font-bold">{totalFuel.toFixed(1)}</div>
            <div className="text-[10px] text-white/40 uppercase">Total Fuel</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-mono font-bold text-green-400">{stopsNeeded}</div>
            <div className="text-[10px] text-white/40 uppercase">Pit Stops</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-mono font-bold">{optimalPitLap || 'N/A'}</div>
            <div className="text-[10px] text-white/40 uppercase">Pit Window</div>
          </div>
        </div>
        {stopsNeeded > 0 && (
          <div className="mt-3 p-2 bg-white/5 text-xs text-white/60">
            <strong className="text-[#f97316]">Recommendation:</strong> Pit around lap {optimalPitLap} for optimal strategy. 
            Pit loss is ~{metadata.pitLossTime}s.
          </div>
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Setup Recommendations */}
        <div className="bg-black/40 border border-white/10 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#f97316]" />
            Setup Recommendations
          </h3>
          <ul className="space-y-2">
            {metadata.setupNotes.map((note, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/70">
                <span className="text-[#f97316] mt-0.5">▸</span>
                {note}
              </li>
            ))}
          </ul>
        </div>

        {/* Strategy Notes */}
        <div className="bg-black/40 border border-white/10 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#f97316]" />
            Strategy Notes
          </h3>
          <ul className="space-y-2">
            {metadata.strategyNotes.map((note, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/70">
                <span className="text-[#f97316] mt-0.5">▸</span>
                {note}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Race Info */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-black/40 border border-white/10 p-3 text-center">
          <Flag className="w-4 h-4 text-white/40 mx-auto mb-1" />
          <div className="text-lg font-bold">{track.laps}</div>
          <div className="text-[10px] text-white/40">Laps</div>
        </div>
        <div className="bg-black/40 border border-white/10 p-3 text-center">
          <Timer className="w-4 h-4 text-white/40 mx-auto mb-1" />
          <div className="text-lg font-bold">~{Math.round(track.laps * 1.8)}</div>
          <div className="text-[10px] text-white/40">Minutes</div>
        </div>
        <div className="bg-black/40 border border-white/10 p-3 text-center">
          <Gauge className="w-4 h-4 text-white/40 mx-auto mb-1" />
          <div className="text-lg font-bold">{metadata.pitLossTime}s</div>
          <div className="text-[10px] text-white/40">Pit Loss</div>
        </div>
        <div className="bg-black/40 border border-white/10 p-3 text-center">
          <ThermometerSun className="w-4 h-4 text-white/40 mx-auto mb-1" />
          <div className="text-lg font-bold">{track.weather || 'Clear'}</div>
          <div className="text-[10px] text-white/40">Conditions</div>
        </div>
      </div>

      {/* Your History */}
      {trackData && trackData.sessions > 0 && (
        <div className="bg-black/40 border border-white/10 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-2">Your Track Record</h3>
          <div className="flex items-center gap-6 text-sm">
            <span className="text-white/60">{trackData.sessions} sessions</span>
            <span className="text-white/60">Best: <span className="text-green-400">P{trackData.bestFinish}</span></span>
            <span className="text-white/60">Avg: P{trackData.avgFinish.toFixed(1)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
