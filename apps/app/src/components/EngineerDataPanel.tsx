import { useState, useEffect } from 'react';
import { MapPin, Flag, Fuel, Gauge, Wrench, ThermometerSun, Loader2, Settings, Zap, Timer } from 'lucide-react';
import { fetchTrackPerformance, TrackPerformanceData } from '../lib/driverService';
import { TrackMapRive } from './TrackMapRive';
import { useRelay } from '../hooks/useRelay';

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
  'Daytona': {
    config: 'Road Course', country: 'USA', length: '3.56 mi', turns: 12,
    fuelPerLap: 0.62, pitLossTime: 28,
    setupNotes: [
      'Max downforce for banking stability',
      'Soften rear for infield rotation',
      'Lower front ride height for Bus Stop chicane',
    ],
    strategyNotes: [
      'Fuel window opens around lap 22 for a 45-lap race',
      'Pit loss is ~28s - undercut works well',
      'Save fuel on banking sections to extend stint',
    ],
  },
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
  const { telemetry, getCarMapPosition } = useRelay();
  const metadata = getTrackMetadata(track.track);
  
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

  // Calculate fuel strategy
  const totalFuel = metadata.fuelPerLap * track.laps;
  const tankSize = 20; // Assume 20 gallon tank
  const stopsNeeded = Math.ceil(totalFuel / tankSize) - 1;
  const optimalPitLap = stopsNeeded > 0 ? Math.floor(track.laps / (stopsNeeded + 1)) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-white/30" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Engineer Header */}
      <div className="bg-white/[0.03] border border-white/[0.08] rounded p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Wrench className="w-3.5 h-3.5 text-[#f97316]" />
              <span className="text-[10px] uppercase tracking-[0.15em] text-[#f97316]">Engineer's Briefing</span>
            </div>
            <h2 className="text-lg font-bold uppercase tracking-wider text-white/90" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              {track.track}
            </h2>
            <div className="flex items-center gap-4 mt-1 text-xs text-white/40">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{metadata.country}</span>
              <span>{metadata.length} • {metadata.turns} turns</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-white/30 uppercase tracking-wider">Today</div>
            <div className="text-sm text-white/70 font-medium">{track.time}</div>
          </div>
        </div>
      </div>

      {/* Track Map with Pit Lane */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded p-4">
        <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3 flex items-center gap-2">
          <MapPin className="w-3 h-3" />
          Track Layout
        </h3>
        <div className="h-48 relative">
          <TrackMapRive 
            trackId={track.track.toLowerCase().replace(/[^a-z]/g, '-').replace(/-+/g, '-')}
            showPitLane={true}
            carPosition={carPosition}
            currentSector={telemetry.sector || undefined}
            speed={telemetry.speed || undefined}
            throttle={telemetry.throttle || undefined}
            brake={telemetry.brake || undefined}
            className="w-full h-full"
          />
          <div className="absolute bottom-2 right-2 text-[10px] text-white/40">
            Pit Loss: {metadata.pitLossTime}s
          </div>
        </div>
      </div>

      {/* Fuel Strategy - Engineer's Focus */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded p-4">
        <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-4 flex items-center gap-2">
          <Fuel className="w-3 h-3" />
          Fuel Strategy
        </h3>
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center">
            <div className="text-xl font-mono font-bold text-[#f97316]">{metadata.fuelPerLap.toFixed(2)}</div>
            <div className="text-[10px] text-white/30 uppercase">Gal/Lap</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-mono font-bold text-white/80">{totalFuel.toFixed(1)}</div>
            <div className="text-[10px] text-white/30 uppercase">Total Fuel</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-mono font-bold text-emerald-400">{stopsNeeded}</div>
            <div className="text-[10px] text-white/30 uppercase">Pit Stops</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-mono font-bold text-white/80">{optimalPitLap || 'N/A'}</div>
            <div className="text-[10px] text-white/30 uppercase">Pit Window</div>
          </div>
        </div>
        {stopsNeeded > 0 && (
          <div className="mt-3 p-2 bg-white/[0.03] rounded text-xs text-white/50">
            <strong className="text-white/70">Recommendation:</strong> Pit around lap {optimalPitLap} for optimal strategy. 
            Pit loss is ~{metadata.pitLossTime}s.
          </div>
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Setup Recommendations */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded p-4">
          <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3 flex items-center gap-2">
            <Settings className="w-3 h-3" />
            Setup Recommendations
          </h3>
          <ul className="space-y-2">
            {metadata.setupNotes.map((note, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/60">
                <span className="text-white/30 mt-0.5">▸</span>
                {note}
              </li>
            ))}
          </ul>
        </div>

        {/* Strategy Notes */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded p-4">
          <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3 flex items-center gap-2">
            <Zap className="w-3 h-3" />
            Strategy Notes
          </h3>
          <ul className="space-y-2">
            {metadata.strategyNotes.map((note, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/60">
                <span className="text-white/30 mt-0.5">▸</span>
                {note}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Race Info */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white/[0.02] border border-white/[0.06] rounded p-3 text-center">
          <Flag className="w-3.5 h-3.5 text-white/30 mx-auto mb-1" />
          <div className="text-base font-bold text-white/80">{track.laps}</div>
          <div className="text-[10px] text-white/30">Laps</div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded p-3 text-center">
          <Timer className="w-3.5 h-3.5 text-white/30 mx-auto mb-1" />
          <div className="text-base font-bold text-white/80">~{Math.round(track.laps * 1.8)}</div>
          <div className="text-[10px] text-white/30">Minutes</div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded p-3 text-center">
          <Gauge className="w-3.5 h-3.5 text-white/30 mx-auto mb-1" />
          <div className="text-base font-bold text-white/80">{metadata.pitLossTime}s</div>
          <div className="text-[10px] text-white/30">Pit Loss</div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded p-3 text-center">
          <ThermometerSun className="w-3.5 h-3.5 text-white/30 mx-auto mb-1" />
          <div className="text-base font-bold text-white/80">{track.weather || 'Clear'}</div>
          <div className="text-[10px] text-white/30">Conditions</div>
        </div>
      </div>

      {/* Your History */}
      {trackData && trackData.sessions > 0 && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded p-4">
          <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-2">Your Track Record</h3>
          <div className="flex items-center gap-6 text-sm">
            <span className="text-white/50">{trackData.sessions} sessions</span>
            <span className="text-white/50">Best: <span className="text-emerald-400">P{trackData.bestFinish}</span></span>
            <span className="text-white/50">Avg: P{trackData.avgFinish.toFixed(1)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
