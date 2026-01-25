import { MapPin, Flag, TrendingUp, TrendingDown, Target, History, Gauge, ThermometerSun } from 'lucide-react';

interface TrackHistory {
  date: string;
  series: string;
  position: number;
  started: number;
  bestLap: string;
  avgLap: string;
  incidents: number;
}

interface TrackData {
  id: string;
  name: string;
  config: string;
  country: string;
  length: string;
  turns: number;
  lapRecord: string;
  yourBest: string;
  sessions: number;
  avgFinish: number;
  bestFinish: number;
  history: TrackHistory[];
  sectors: { name: string; yourBest: string; trackBest: string; delta: number }[];
  notes: string[];
}

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

const getTrackData = (trackName: string): TrackData => {
  const trackDataMap: Record<string, TrackData> = {
    'Watkins Glen': {
      id: 'watkins-glen',
      name: 'Watkins Glen International',
      config: 'Boot',
      country: 'USA',
      length: '3.4 mi',
      turns: 11,
      lapRecord: '1:42.892',
      yourBest: '1:44.231',
      sessions: 12,
      avgFinish: 8.2,
      bestFinish: 2,
      history: [
        { date: 'Jan 20', series: 'IMSA Pilot', position: 5, started: 8, bestLap: '1:44.532', avgLap: '1:45.891', incidents: 2 },
        { date: 'Jan 15', series: 'IMSA Pilot', position: 3, started: 5, bestLap: '1:44.231', avgLap: '1:45.102', incidents: 0 },
        { date: 'Jan 10', series: 'GT3 Sprint', position: 7, started: 12, bestLap: '1:45.001', avgLap: '1:46.234', incidents: 4 },
      ],
      sectors: [
        { name: 'S1 - Esses', yourBest: '28.432', trackBest: '27.891', delta: 0.541 },
        { name: 'S2 - Back Straight', yourBest: '31.102', trackBest: '30.892', delta: 0.210 },
        { name: 'S3 - Boot', yourBest: '44.697', trackBest: '44.109', delta: 0.588 },
      ],
      notes: [
        'Trail brake deeper into T1 - losing 0.2s on entry',
        'Boot section: stay patient, apex late on exit',
        'Watch tire temps in long right-handers',
      ],
    },
    'Spa-Francorchamps': {
      id: 'spa',
      name: 'Circuit de Spa-Francorchamps',
      config: 'Grand Prix',
      country: 'Belgium',
      length: '4.35 mi',
      turns: 19,
      lapRecord: '1:46.286',
      yourBest: '1:48.891',
      sessions: 8,
      avgFinish: 10.5,
      bestFinish: 4,
      history: [
        { date: 'Jan 18', series: 'GT3 Sprint', position: 6, started: 9, bestLap: '1:48.891', avgLap: '1:50.234', incidents: 1 },
        { date: 'Jan 12', series: 'GT3 Sprint', position: 12, started: 15, bestLap: '1:49.432', avgLap: '1:51.102', incidents: 3 },
      ],
      sectors: [
        { name: 'S1 - La Source to Eau Rouge', yourBest: '32.891', trackBest: '31.892', delta: 0.999 },
        { name: 'S2 - Kemmel to Rivage', yourBest: '42.102', trackBest: '41.234', delta: 0.868 },
        { name: 'S3 - Bus Stop', yourBest: '33.898', trackBest: '33.160', delta: 0.738 },
      ],
      notes: [
        'Eau Rouge: flat in qualifying, lift slightly in race with fuel',
        'Pouhon: double apex, patience on exit',
        'Bus Stop: brake later, use all the curb on exit',
      ],
    },
    'Laguna Seca': {
      id: 'laguna-seca',
      name: 'WeatherTech Raceway Laguna Seca',
      config: 'Full Course',
      country: 'USA',
      length: '2.24 mi',
      turns: 11,
      lapRecord: '1:21.680',
      yourBest: '1:23.234',
      sessions: 15,
      avgFinish: 6.8,
      bestFinish: 1,
      history: [
        { date: 'Jan 22', series: 'Porsche Cup', position: 3, started: 6, bestLap: '1:23.234', avgLap: '1:24.102', incidents: 0 },
        { date: 'Jan 17', series: 'Porsche Cup', position: 1, started: 3, bestLap: '1:23.456', avgLap: '1:24.321', incidents: 0 },
        { date: 'Jan 14', series: 'GT3 Sprint', position: 8, started: 10, bestLap: '1:24.102', avgLap: '1:25.432', incidents: 2 },
      ],
      sectors: [
        { name: 'S1 - Andretti Hairpin', yourBest: '24.102', trackBest: '23.680', delta: 0.422 },
        { name: 'S2 - Corkscrew', yourBest: '31.432', trackBest: '30.891', delta: 0.541 },
        { name: 'S3 - Rainey Curve', yourBest: '27.700', trackBest: '27.109', delta: 0.591 },
      ],
      notes: [
        'Corkscrew: look at the tree, brake at 2 marker',
        'T2: can go flat with good exit from T1',
        'Rainey Curve: late apex, use all exit curb',
      ],
    },
  };

  return trackDataMap[trackName] || {
    id: 'unknown',
    name: trackName,
    config: 'Unknown',
    country: 'Unknown',
    length: 'N/A',
    turns: 0,
    lapRecord: '--:--.---',
    yourBest: '--:--.---',
    sessions: 0,
    avgFinish: 0,
    bestFinish: 0,
    history: [],
    sectors: [],
    notes: ['No historical data available for this track yet.'],
  };
};

export function TrackDataPanel({ track }: TrackDataPanelProps) {
  const trackData = getTrackData(track.track);

  return (
    <div className="space-y-4 p-4">
      {/* Track Header */}
      <div className="bg-[#f97316]/10 border border-[#f97316]/30 p-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              {trackData.name}
            </h2>
            <div className="flex items-center gap-4 mt-1 text-xs text-white/50">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{trackData.country}</span>
              <span>{trackData.config}</span>
              <span>{trackData.length} • {trackData.turns} turns</span>
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
          <div className="text-base font-mono font-bold text-[#f97316]">{trackData.yourBest}</div>
        </div>
        <div className="bg-black/40 border border-white/10 p-3">
          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Track Record</div>
          <div className="text-base font-mono font-bold text-white/60">{trackData.lapRecord}</div>
        </div>
        <div className="bg-black/40 border border-white/10 p-3">
          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Best Finish</div>
          <div className="text-base font-bold text-green-400">P{trackData.bestFinish}</div>
        </div>
        <div className="bg-black/40 border border-white/10 p-3">
          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Sessions</div>
          <div className="text-base font-bold">{trackData.sessions}</div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sector Analysis */}
        {trackData.sectors.length > 0 && (
          <div className="bg-black/40 border border-white/10 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-[#f97316]" />
              Sector Analysis
            </h3>
            <div className="space-y-2">
              {trackData.sectors.map((sector, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-white/60">{sector.name}</span>
                  <span className={`font-mono ${sector.delta > 0.5 ? 'text-red-400' : sector.delta > 0.2 ? 'text-yellow-400' : 'text-green-400'}`}>
                    +{sector.delta.toFixed(3)}s
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Engineer Notes */}
        {trackData.notes.length > 0 && (
          <div className="bg-black/40 border border-white/10 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-[#8b5cf6]" />
              Engineer Notes
            </h3>
            <ul className="space-y-1">
              {trackData.notes.map((note, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-white/70">
                  <span className="text-[#8b5cf6]">•</span>
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Recent History */}
      {trackData.history.length > 0 && (
        <div className="bg-black/40 border border-white/10 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
            <History className="w-4 h-4 text-[#3b82f6]" />
            Recent Sessions at {track.track}
          </h3>
          <div className="space-y-1">
            {trackData.history.slice(0, 3).map((session, i) => (
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
    </div>
  );
}
