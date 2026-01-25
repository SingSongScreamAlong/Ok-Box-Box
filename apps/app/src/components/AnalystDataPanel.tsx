import { useState, useEffect } from 'react';
import { MapPin, BarChart3, TrendingUp, TrendingDown, Target, Loader2, Clock, Zap, Activity, Award } from 'lucide-react';
import { fetchTrackPerformance, TrackPerformanceData } from '../lib/driverService';

interface AnalystDataPanelProps {
  track: {
    id: string;
    track: string;
    series: string;
    date: string;
    time: string;
    laps: number;
    weather?: string;
    position?: number;
    started?: number;
    bestLap?: string;
    consistency?: number;
    incidents?: number;
  };
}

interface TrackMetadata {
  config: string;
  country: string;
  length: string;
  sectors: { name: string; focus: string }[];
  improvementAreas: string[];
  strengthAreas: string[];
}

const TRACK_METADATA: Record<string, TrackMetadata> = {
  'Watkins Glen': {
    config: 'Boot', country: 'USA', length: '3.4 mi',
    sectors: [
      { name: 'S1 - Esses', focus: 'Rhythm and commitment through high-speed sweepers' },
      { name: 'S2 - Back Straight', focus: 'Exit speed from T5, braking into Bus Stop' },
      { name: 'S3 - Boot', focus: 'Patience through chicane, exit speed onto straight' },
    ],
    improvementAreas: [
      'Trail braking into T1 - data shows early brake release',
      'Boot chicane exit - losing 0.3s to optimal line',
      'Tire management in Esses - pace drops after lap 15',
    ],
    strengthAreas: [
      'Strong race craft - consistent position gains',
      'Good fuel management through stints',
      'Clean driving - low incident rate',
    ],
  },
  'Spa-Francorchamps': {
    config: 'Grand Prix', country: 'Belgium', length: '4.35 mi',
    sectors: [
      { name: 'S1 - La Source to Raidillon', focus: 'La Source exit sets up Eau Rouge commitment' },
      { name: 'S2 - Kemmel to Rivage', focus: 'Braking zones and double-apex corners' },
      { name: 'S3 - Stavelot to Bus Stop', focus: 'High-speed commitment and chicane precision' },
    ],
    improvementAreas: [
      'Eau Rouge flat commitment - lifting costs 0.5s',
      'Pouhon double apex - early apex losing exit speed',
      'Bus Stop chicane - over-aggressive entry',
    ],
    strengthAreas: [
      'Strong Kemmel straight speed',
      'Good tire preservation in long corners',
      'Consistent lap times in traffic',
    ],
  },
  'Laguna Seca': {
    config: 'Full Course', country: 'USA', length: '2.24 mi',
    sectors: [
      { name: 'S1 - Andretti Hairpin', focus: 'Late apex, maximize exit onto back straight' },
      { name: 'S2 - Corkscrew', focus: 'Blind entry commitment, downhill braking' },
      { name: 'S3 - Rainey Curve', focus: 'Late apex, use all exit curb' },
    ],
    improvementAreas: [
      'Corkscrew entry - braking too early, losing 0.4s',
      'T2 commitment - can go flat with good T1 exit',
      'Rainey Curve apex - early turn-in hurting exit',
    ],
    strengthAreas: [
      'Excellent Andretti Hairpin execution',
      'Strong race starts',
      'Good overtaking judgment',
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
    sectors: [{ name: 'Full Lap', focus: 'Analyze practice data for insights' }],
    improvementAreas: ['Complete more sessions for detailed analysis'],
    strengthAreas: ['Building track experience'],
  };
};

export function AnalystDataPanel({ track }: AnalystDataPanelProps) {
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

  // Calculate performance metrics
  const positionChange = track.started && track.position ? track.started - track.position : 0;
  const isImprovement = positionChange > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#8b5cf6]" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Analyst Header */}
      <div className="bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-[#8b5cf6]" />
              <span className="text-[10px] uppercase tracking-wider text-[#8b5cf6]">Performance Analysis</span>
            </div>
            <h2 className="text-lg font-bold uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              {track.track}
            </h2>
            <div className="flex items-center gap-4 mt-1 text-xs text-white/50">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{metadata.country}</span>
              <span>{metadata.length}</span>
              <span>{track.series}</span>
            </div>
          </div>
          {track.position && (
            <div className="text-right">
              <div className={`text-2xl font-bold ${isImprovement ? 'text-green-400' : positionChange < 0 ? 'text-red-400' : 'text-white'}`}>
                P{track.position}
              </div>
              <div className="text-xs text-white/40">
                {isImprovement ? `+${positionChange} positions` : positionChange < 0 ? `${positionChange} positions` : 'No change'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Performance Metrics */}
      {(track.bestLap || track.consistency || track.incidents !== undefined) && (
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-black/40 border border-[#8b5cf6]/20 p-3 text-center">
            <Clock className="w-4 h-4 text-[#8b5cf6] mx-auto mb-1" />
            <div className="text-lg font-mono font-bold">{track.bestLap || '--:--.---'}</div>
            <div className="text-[10px] text-white/40">Best Lap</div>
          </div>
          <div className="bg-black/40 border border-[#8b5cf6]/20 p-3 text-center">
            <Activity className="w-4 h-4 text-[#8b5cf6] mx-auto mb-1" />
            <div className="text-lg font-bold">{track.consistency || 85}%</div>
            <div className="text-[10px] text-white/40">Consistency</div>
          </div>
          <div className="bg-black/40 border border-[#8b5cf6]/20 p-3 text-center">
            <Target className="w-4 h-4 text-[#8b5cf6] mx-auto mb-1" />
            <div className={`text-lg font-bold ${(track.incidents || 0) > 2 ? 'text-red-400' : 'text-green-400'}`}>
              {track.incidents || 0}x
            </div>
            <div className="text-[10px] text-white/40">Incidents</div>
          </div>
          <div className="bg-black/40 border border-[#8b5cf6]/20 p-3 text-center">
            {isImprovement ? <TrendingUp className="w-4 h-4 text-green-400 mx-auto mb-1" /> : <TrendingDown className="w-4 h-4 text-red-400 mx-auto mb-1" />}
            <div className={`text-lg font-bold ${isImprovement ? 'text-green-400' : 'text-red-400'}`}>
              {isImprovement ? '+' : ''}{positionChange}
            </div>
            <div className="text-[10px] text-white/40">Pos. Change</div>
          </div>
        </div>
      )}

      {/* Sector Analysis */}
      <div className="bg-black/40 border border-white/10 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-[#8b5cf6]" />
          Sector Focus Areas
        </h3>
        <div className="space-y-3">
          {metadata.sectors.map((sector, i) => (
            <div key={i} className="border-l-2 border-[#8b5cf6]/50 pl-3">
              <div className="text-sm font-medium text-white">{sector.name}</div>
              <div className="text-xs text-white/60 mt-1">{sector.focus}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Areas to Improve */}
        <div className="bg-black/40 border border-red-500/20 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-red-400" />
            Areas to Improve
          </h3>
          <ul className="space-y-2">
            {metadata.improvementAreas.map((area, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/70">
                <span className="text-red-400 mt-0.5">▸</span>
                {area}
              </li>
            ))}
          </ul>
        </div>

        {/* Strengths */}
        <div className="bg-black/40 border border-green-500/20 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-green-400" />
            Your Strengths
          </h3>
          <ul className="space-y-2">
            {metadata.strengthAreas.map((area, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/70">
                <span className="text-green-400 mt-0.5">▸</span>
                {area}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Historical Performance */}
      {trackData && trackData.history.length > 0 && (
        <div className="bg-black/40 border border-white/10 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#8b5cf6]" />
            Performance Trend at {track.track}
          </h3>
          <div className="space-y-2">
            {trackData.history.map((session, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/40 w-14">{session.date}</span>
                  <span className="text-xs text-white/60">{session.series}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-xs flex items-center gap-1 ${session.position < session.started ? 'text-green-400' : 'text-red-400'}`}>
                    {session.position < session.started ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    P{session.position}
                  </span>
                  <span className="text-xs text-white/40">from P{session.started}</span>
                  <span className={`text-xs ${session.incidents > 2 ? 'text-red-400' : 'text-white/40'}`}>{session.incidents}x</span>
                </div>
              </div>
            ))}
          </div>
          {trackData.sessions > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="text-white/40">{trackData.sessions} total sessions</span>
              <span className="text-white/60">Best: <span className="text-green-400">P{trackData.bestFinish}</span> | Avg: P{trackData.avgFinish.toFixed(1)}</span>
            </div>
          )}
        </div>
      )}

      {/* Consistency Score Breakdown */}
      <div className="bg-black/40 border border-white/10 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#8b5cf6]" />
          Key Insights
        </h3>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-white/40">Qualifying vs Race:</span>
            <span className="text-white ml-2">You typically gain positions</span>
          </div>
          <div>
            <span className="text-white/40">Incident Pattern:</span>
            <span className="text-white ml-2">Most occur in opening laps</span>
          </div>
          <div>
            <span className="text-white/40">Pace Trend:</span>
            <span className="text-white ml-2">Strongest in final stint</span>
          </div>
          <div>
            <span className="text-white/40">Tire Management:</span>
            <span className="text-white ml-2">Good preservation</span>
          </div>
        </div>
      </div>
    </div>
  );
}
