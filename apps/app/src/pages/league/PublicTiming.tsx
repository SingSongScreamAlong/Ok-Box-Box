import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getLeague, League } from '../../lib/leagues';
import { 
  Flag, Clock, Zap, TrendingUp, TrendingDown, Minus,
  ChevronUp, ChevronDown, Timer, Fuel
} from 'lucide-react';

interface TimingEntry {
  position: number;
  carNumber: string;
  driverName: string;
  team?: string;
  class?: string;
  classColor?: string;
  gap: string;
  interval: string;
  lastLap: string;
  bestLap: string;
  sector1: string;
  sector2: string;
  sector3: string;
  pits: number;
  status: 'running' | 'pit' | 'out' | 'finished';
  positionChange: number;
}

interface SessionInfo {
  name: string;
  type: 'practice' | 'qualifying' | 'race';
  status: 'not_started' | 'green' | 'yellow' | 'red' | 'checkered';
  currentLap: number;
  totalLaps: number;
  timeRemaining: string;
  timeElapsed: string;
  trackTemp: number;
  airTemp: number;
}

const mockSession: SessionInfo = {
  name: 'Round 5 - Daytona 24h',
  type: 'race',
  status: 'green',
  currentLap: 42,
  totalLaps: 100,
  timeRemaining: '1:23:45',
  timeElapsed: '2:36:15',
  trackTemp: 32,
  airTemp: 28
};

const mockTiming: TimingEntry[] = [
  { position: 1, carNumber: '7', driverName: 'Alex Rivera', team: 'Velocity Racing', class: 'GTP', classColor: '#f97316', gap: 'LEADER', interval: '-', lastLap: '1:33.456', bestLap: '1:33.123', sector1: '28.123', sector2: '35.456', sector3: '29.877', pits: 2, status: 'running', positionChange: 0 },
  { position: 2, carNumber: '23', driverName: 'Marcus Chen', team: 'Thunder Motorsport', class: 'GTP', classColor: '#f97316', gap: '+2.345', interval: '+2.345', lastLap: '1:33.678', bestLap: '1:33.234', sector1: '28.234', sector2: '35.567', sector3: '29.877', pits: 2, status: 'running', positionChange: 1 },
  { position: 3, carNumber: '42', driverName: 'Jordan Kim', team: 'Apex Dynamics', class: 'GTP', classColor: '#f97316', gap: '+4.567', interval: '+2.222', lastLap: '1:33.890', bestLap: '1:33.345', sector1: '28.345', sector2: '35.678', sector3: '29.867', pits: 2, status: 'running', positionChange: -1 },
  { position: 4, carNumber: '15', driverName: 'Sarah Williams', team: 'Precision Racing', class: 'GTP', classColor: '#f97316', gap: '+8.901', interval: '+4.334', lastLap: '1:34.012', bestLap: '1:33.456', sector1: '28.456', sector2: '35.789', sector3: '29.767', pits: 3, status: 'running', positionChange: 2 },
  { position: 5, carNumber: '88', driverName: 'David Park', team: 'Storm Racing', class: 'GTP', classColor: '#f97316', gap: '+12.345', interval: '+3.444', lastLap: '1:34.234', bestLap: '1:33.567', sector1: '28.567', sector2: '35.890', sector3: '29.777', pits: 2, status: 'running', positionChange: 0 },
  { position: 6, carNumber: '31', driverName: 'Emma Thompson', team: 'Blaze Motorsport', class: 'LMP2', classColor: '#3b82f6', gap: '+1 LAP', interval: '+1 LAP', lastLap: '1:35.456', bestLap: '1:35.123', sector1: '29.123', sector2: '36.456', sector3: '29.877', pits: 2, status: 'running', positionChange: 0 },
  { position: 7, carNumber: '55', driverName: 'Lucas Martin', team: 'Horizon Racing', class: 'LMP2', classColor: '#3b82f6', gap: '+1 LAP', interval: '+3.456', lastLap: '1:35.678', bestLap: '1:35.234', sector1: '29.234', sector2: '36.567', sector3: '29.877', pits: 2, status: 'running', positionChange: 1 },
  { position: 8, carNumber: '99', driverName: 'Nina Patel', team: 'Eclipse Racing', class: 'LMP2', classColor: '#3b82f6', gap: '+1 LAP', interval: '+5.678', lastLap: '1:35.890', bestLap: '1:35.345', sector1: '29.345', sector2: '36.678', sector3: '29.867', pits: 3, status: 'pit', positionChange: -2 },
  { position: 9, carNumber: '12', driverName: 'Tom Anderson', team: 'Vortex Racing', class: 'GT3', classColor: '#22c55e', gap: '+2 LAPS', interval: '+1 LAP', lastLap: '1:38.456', bestLap: '1:38.123', sector1: '30.123', sector2: '37.456', sector3: '30.877', pits: 2, status: 'running', positionChange: 0 },
  { position: 10, carNumber: '77', driverName: 'Lisa Chang', team: 'Phoenix Racing', class: 'GT3', classColor: '#22c55e', gap: '+2 LAPS', interval: '+4.567', lastLap: '1:38.678', bestLap: '1:38.234', sector1: '30.234', sector2: '37.567', sector3: '30.877', pits: 2, status: 'running', positionChange: 0 },
];

const statusColors: Record<string, string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  checkered: 'bg-white',
  not_started: 'bg-gray-500'
};

export function PublicTiming() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [league, setLeague] = useState<League | null>(null);
  const [session, setSession] = useState<SessionInfo>(mockSession);
  const [timing, setTiming] = useState<TimingEntry[]>(mockTiming);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string>('all');

  useEffect(() => {
    if (leagueId) {
      getLeague(leagueId).then(data => {
        setLeague(data);
        setLoading(false);
      });
    }
  }, [leagueId]);

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setSession(prev => ({
        ...prev,
        timeElapsed: incrementTime(prev.timeElapsed),
        timeRemaining: decrementTime(prev.timeRemaining)
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const incrementTime = (time: string): string => {
    const [h, m, s] = time.split(':').map(Number);
    let totalSeconds = h * 3600 + m * 60 + s + 1;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const decrementTime = (time: string): string => {
    const [h, m, s] = time.split(':').map(Number);
    let totalSeconds = h * 3600 + m * 60 + s - 1;
    if (totalSeconds < 0) totalSeconds = 0;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const classes = ['all', ...new Set(timing.map(t => t.class).filter(Boolean))];
  const filteredTiming = selectedClass === 'all' 
    ? timing 
    : timing.filter(t => t.class === selectedClass);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-white/50">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0a0a0a] via-[#111] to-[#0a0a0a] border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-4 h-4 rounded ${statusColors[session.status]}`} />
              <div>
                <h1 
                  className="text-lg font-bold text-white uppercase tracking-wider"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  {session.name}
                </h1>
                <p className="text-xs text-white/50">{league?.name} • Live Timing</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-white font-mono">{session.currentLap}/{session.totalLaps}</p>
                <p className="text-[10px] text-white/40 uppercase">Lap</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white font-mono">{session.timeRemaining}</p>
                <p className="text-[10px] text-white/40 uppercase">Remaining</p>
              </div>
              <div className="text-center hidden md:block">
                <p className="text-lg text-white/60">{session.trackTemp}°C / {session.airTemp}°C</p>
                <p className="text-[10px] text-white/40 uppercase">Track / Air</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Class Filter */}
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center gap-2">
          {classes.map(cls => (
            <button
              key={cls}
              onClick={() => setSelectedClass(cls || 'all')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                selectedClass === cls
                  ? 'bg-white/10 text-white'
                  : 'bg-white/[0.03] text-white/50 hover:text-white/70'
              }`}
            >
              {cls === 'all' ? 'All Classes' : cls}
            </button>
          ))}
        </div>
      </div>

      {/* Timing Table */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06] text-[10px] text-white/40 uppercase tracking-wider">
                <th className="px-3 py-3 text-left w-12">Pos</th>
                <th className="px-3 py-3 text-left w-16">No.</th>
                <th className="px-3 py-3 text-left">Driver</th>
                <th className="px-3 py-3 text-left hidden lg:table-cell">Team</th>
                <th className="px-3 py-3 text-center w-16">Class</th>
                <th className="px-3 py-3 text-right w-24">Gap</th>
                <th className="px-3 py-3 text-right w-24">Int</th>
                <th className="px-3 py-3 text-right w-24">Last</th>
                <th className="px-3 py-3 text-right w-24">Best</th>
                <th className="px-3 py-3 text-center w-12 hidden md:table-cell">Pits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredTiming.map((entry, index) => (
                <tr 
                  key={entry.carNumber}
                  className={`transition-colors ${
                    entry.status === 'pit' ? 'bg-yellow-500/5' : 
                    entry.status === 'out' ? 'bg-red-500/5 opacity-50' : 
                    'hover:bg-white/[0.02]'
                  }`}
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <span className="text-lg font-bold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                        {entry.position}
                      </span>
                      {entry.positionChange !== 0 && (
                        <span className={`text-xs ${entry.positionChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {entry.positionChange > 0 ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span 
                      className="text-lg font-bold"
                      style={{ color: entry.classColor || '#fff', fontFamily: 'Orbitron, sans-serif' }}
                    >
                      {entry.carNumber}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-sm font-medium text-white">{entry.driverName}</p>
                  </td>
                  <td className="px-3 py-3 hidden lg:table-cell">
                    <p className="text-sm text-white/60">{entry.team}</p>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span 
                      className="px-2 py-0.5 text-[10px] font-bold rounded"
                      style={{ backgroundColor: `${entry.classColor}20`, color: entry.classColor }}
                    >
                      {entry.class}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="text-sm font-mono text-white/80">{entry.gap}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="text-sm font-mono text-white/60">{entry.interval}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="text-sm font-mono text-white">{entry.lastLap}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="text-sm font-mono text-purple-400">{entry.bestLap}</span>
                  </td>
                  <td className="px-3 py-3 text-center hidden md:table-cell">
                    <span className="text-sm text-white/50">{entry.pits}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between text-xs text-white/30">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              In Pit
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              Out
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span>Powered by</span>
            <span className="font-bold text-white/50" style={{ fontFamily: 'Orbitron, sans-serif' }}>OK, BOX BOX</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PublicTiming;
