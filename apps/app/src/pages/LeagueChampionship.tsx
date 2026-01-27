import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getLeague, getUserLeagueRole, League } from '../lib/leagues';
import { 
  ArrowLeft, Trophy, Calendar, ChevronDown, ChevronUp,
  Medal, TrendingUp, TrendingDown, Minus, Settings, Plus
} from 'lucide-react';

// Types for Championship
interface Driver {
  id: string;
  name: string;
  team?: string;
  iRating: number;
  safetyRating: string;
}

interface RaceResult {
  eventId: string;
  eventName: string;
  date: string;
  position: number;
  points: number;
  fastestLap: boolean;
  polePosition: boolean;
  dnf: boolean;
  incidents: number;
}

interface ChampionshipEntry {
  position: number;
  previousPosition: number;
  driver: Driver;
  points: number;
  wins: number;
  podiums: number;
  poles: number;
  fastestLaps: number;
  dnfs: number;
  races: number;
  avgFinish: number;
  results: RaceResult[];
}

interface Championship {
  id: string;
  name: string;
  season: string;
  status: 'upcoming' | 'active' | 'completed';
  totalRounds: number;
  completedRounds: number;
  pointsSystem: Record<number, number>;
  dropWorst: number;
  standings: ChampionshipEntry[];
}

// Mock points system
const DEFAULT_POINTS: Record<number, number> = {
  1: 25, 2: 18, 3: 15, 4: 12, 5: 10,
  6: 8, 7: 6, 8: 4, 9: 2, 10: 1
};

// Mock championship data
const mockChampionship: Championship = {
  id: 'champ1',
  name: 'Season 1 Championship',
  season: '2026 Season 1',
  status: 'active',
  totalRounds: 12,
  completedRounds: 6,
  pointsSystem: DEFAULT_POINTS,
  dropWorst: 1,
  standings: [
    {
      position: 1, previousPosition: 1,
      driver: { id: 'd1', name: 'Alex Rivera', team: 'Apex Racing', iRating: 4500, safetyRating: 'A 3.2' },
      points: 138, wins: 3, podiums: 5, poles: 2, fastestLaps: 2, dnfs: 0, races: 6, avgFinish: 2.3,
      results: [
        { eventId: 'e1', eventName: 'Round 1 - Daytona', date: '2026-01-05', position: 1, points: 25, fastestLap: true, polePosition: true, dnf: false, incidents: 0 },
        { eventId: 'e2', eventName: 'Round 2 - Sebring', date: '2026-01-12', position: 2, points: 18, fastestLap: false, polePosition: false, dnf: false, incidents: 1 },
        { eventId: 'e3', eventName: 'Round 3 - Road America', date: '2026-01-19', position: 1, points: 25, fastestLap: false, polePosition: true, dnf: false, incidents: 0 },
        { eventId: 'e4', eventName: 'Round 4 - Watkins Glen', date: '2026-01-26', position: 3, points: 15, fastestLap: false, polePosition: false, dnf: false, incidents: 2 },
        { eventId: 'e5', eventName: 'Round 5 - Spa', date: '2026-02-02', position: 1, points: 25, fastestLap: true, polePosition: false, dnf: false, incidents: 0 },
        { eventId: 'e6', eventName: 'Round 6 - Monza', date: '2026-02-09', position: 2, points: 18, fastestLap: false, polePosition: false, dnf: false, incidents: 0 },
      ]
    },
    {
      position: 2, previousPosition: 3,
      driver: { id: 'd2', name: 'Jordan Chen', team: 'Velocity Motorsport', iRating: 4200, safetyRating: 'A 2.8' },
      points: 121, wins: 2, podiums: 4, poles: 1, fastestLaps: 1, dnfs: 0, races: 6, avgFinish: 3.2,
      results: [
        { eventId: 'e1', eventName: 'Round 1 - Daytona', date: '2026-01-05', position: 3, points: 15, fastestLap: false, polePosition: false, dnf: false, incidents: 1 },
        { eventId: 'e2', eventName: 'Round 2 - Sebring', date: '2026-01-12', position: 1, points: 25, fastestLap: true, polePosition: true, dnf: false, incidents: 0 },
        { eventId: 'e3', eventName: 'Round 3 - Road America', date: '2026-01-19', position: 4, points: 12, fastestLap: false, polePosition: false, dnf: false, incidents: 0 },
        { eventId: 'e4', eventName: 'Round 4 - Watkins Glen', date: '2026-01-26', position: 1, points: 25, fastestLap: false, polePosition: false, dnf: false, incidents: 0 },
        { eventId: 'e5', eventName: 'Round 5 - Spa', date: '2026-02-02', position: 2, points: 18, fastestLap: false, polePosition: false, dnf: false, incidents: 1 },
        { eventId: 'e6', eventName: 'Round 6 - Monza', date: '2026-02-09', position: 3, points: 15, fastestLap: false, polePosition: false, dnf: false, incidents: 0 },
      ]
    },
    {
      position: 3, previousPosition: 2,
      driver: { id: 'd3', name: 'Sam Williams', team: 'Thunder Racing', iRating: 3800, safetyRating: 'B 4.1' },
      points: 108, wins: 1, podiums: 3, poles: 2, fastestLaps: 2, dnfs: 1, races: 6, avgFinish: 4.5,
      results: [
        { eventId: 'e1', eventName: 'Round 1 - Daytona', date: '2026-01-05', position: 2, points: 18, fastestLap: false, polePosition: false, dnf: false, incidents: 0 },
        { eventId: 'e2', eventName: 'Round 2 - Sebring', date: '2026-01-12', position: 3, points: 15, fastestLap: false, polePosition: false, dnf: false, incidents: 2 },
        { eventId: 'e3', eventName: 'Round 3 - Road America', date: '2026-01-19', position: 2, points: 18, fastestLap: true, polePosition: false, dnf: false, incidents: 0 },
        { eventId: 'e4', eventName: 'Round 4 - Watkins Glen', date: '2026-01-26', position: 2, points: 18, fastestLap: false, polePosition: true, dnf: false, incidents: 0 },
        { eventId: 'e5', eventName: 'Round 5 - Spa', date: '2026-02-02', position: 15, points: 0, fastestLap: false, polePosition: true, dnf: true, incidents: 4 },
        { eventId: 'e6', eventName: 'Round 6 - Monza', date: '2026-02-09', position: 1, points: 25, fastestLap: true, polePosition: false, dnf: false, incidents: 0 },
      ]
    },
    {
      position: 4, previousPosition: 4,
      driver: { id: 'd4', name: 'Casey Morgan', team: 'Apex Racing', iRating: 4100, safetyRating: 'A 1.9' },
      points: 89, wins: 0, podiums: 2, poles: 0, fastestLaps: 0, dnfs: 0, races: 6, avgFinish: 5.2,
      results: [
        { eventId: 'e1', eventName: 'Round 1 - Daytona', date: '2026-01-05', position: 5, points: 10, fastestLap: false, polePosition: false, dnf: false, incidents: 1 },
        { eventId: 'e2', eventName: 'Round 2 - Sebring', date: '2026-01-12', position: 4, points: 12, fastestLap: false, polePosition: false, dnf: false, incidents: 0 },
        { eventId: 'e3', eventName: 'Round 3 - Road America', date: '2026-01-19', position: 3, points: 15, fastestLap: false, polePosition: false, dnf: false, incidents: 1 },
        { eventId: 'e4', eventName: 'Round 4 - Watkins Glen', date: '2026-01-26', position: 4, points: 12, fastestLap: false, polePosition: false, dnf: false, incidents: 0 },
        { eventId: 'e5', eventName: 'Round 5 - Spa', date: '2026-02-02', position: 3, points: 15, fastestLap: false, polePosition: false, dnf: false, incidents: 0 },
        { eventId: 'e6', eventName: 'Round 6 - Monza', date: '2026-02-09', position: 4, points: 12, fastestLap: false, polePosition: false, dnf: false, incidents: 1 },
      ]
    },
    {
      position: 5, previousPosition: 6,
      driver: { id: 'd5', name: 'Taylor Brooks', team: 'Velocity Motorsport', iRating: 3600, safetyRating: 'B 3.5' },
      points: 72, wins: 0, podiums: 1, poles: 0, fastestLaps: 1, dnfs: 1, races: 6, avgFinish: 6.8,
      results: [
        { eventId: 'e1', eventName: 'Round 1 - Daytona', date: '2026-01-05', position: 4, points: 12, fastestLap: false, polePosition: false, dnf: false, incidents: 0 },
        { eventId: 'e2', eventName: 'Round 2 - Sebring', date: '2026-01-12', position: 6, points: 8, fastestLap: false, polePosition: false, dnf: false, incidents: 2 },
        { eventId: 'e3', eventName: 'Round 3 - Road America', date: '2026-01-19', position: 5, points: 10, fastestLap: false, polePosition: false, dnf: false, incidents: 0 },
        { eventId: 'e4', eventName: 'Round 4 - Watkins Glen', date: '2026-01-26', position: 12, points: 0, fastestLap: false, polePosition: false, dnf: true, incidents: 4 },
        { eventId: 'e5', eventName: 'Round 5 - Spa', date: '2026-02-02', position: 4, points: 12, fastestLap: true, polePosition: false, dnf: false, incidents: 0 },
        { eventId: 'e6', eventName: 'Round 6 - Monza', date: '2026-02-09', position: 5, points: 10, fastestLap: false, polePosition: false, dnf: false, incidents: 1 },
      ]
    },
  ]
};

// Upcoming rounds
const mockUpcomingRounds = [
  { round: 7, name: 'Round 7 - Nürburgring', date: '2026-02-16', track: 'Nürburgring GP' },
  { round: 8, name: 'Round 8 - Suzuka', date: '2026-02-23', track: 'Suzuka Circuit' },
  { round: 9, name: 'Round 9 - Bathurst', date: '2026-03-02', track: 'Mount Panorama' },
  { round: 10, name: 'Round 10 - Laguna Seca', date: '2026-03-09', track: 'WeatherTech Raceway' },
  { round: 11, name: 'Round 11 - Interlagos', date: '2026-03-16', track: 'Autódromo José Carlos Pace' },
  { round: 12, name: 'Round 12 - Le Mans', date: '2026-03-23', track: 'Circuit de la Sarthe' },
];

export function LeagueChampionship() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { user } = useAuth();
  const [league, setLeague] = useState<League | null>(null);
  const [role, setRole] = useState<'owner' | 'admin' | 'steward' | 'member' | null>(null);
  const [championship] = useState<Championship>(mockChampionship);
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (leagueId && user) {
      loadData();
    }
  }, [leagueId, user]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.6;
    }
  }, []);

  const loadData = async () => {
    if (!leagueId || !user) return;
    const [leagueData, userRole] = await Promise.all([
      getLeague(leagueId),
      getUserLeagueRole(leagueId, user.id)
    ]);
    setLeague(leagueData);
    setRole(userRole);
    setLoading(false);
  };

  const getPositionChange = (current: number, previous: number) => {
    if (current < previous) return { icon: <TrendingUp className="w-3 h-3" />, color: 'text-green-400', change: previous - current };
    if (current > previous) return { icon: <TrendingDown className="w-3 h-3" />, color: 'text-red-400', change: current - previous };
    return { icon: <Minus className="w-3 h-3" />, color: 'text-white/30', change: 0 };
  };

  const getPositionBadge = (position: number) => {
    if (position === 1) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    if (position === 2) return 'bg-gray-400/20 text-gray-300 border-gray-400/30';
    if (position === 3) return 'bg-orange-600/20 text-orange-400 border-orange-600/30';
    return 'bg-white/5 text-white/70 border-white/10';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/50">Loading championship...</div>
      </div>
    );
  }

  const isAdmin = role === 'owner' || role === 'admin';

  return (
    <div className="min-h-screen relative">
      {/* Background video */}
      <div className="fixed inset-0 z-0">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover opacity-50"
        >
          <source src="/videos/bg-1.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/70 via-[#0a0a0a]/50 to-[#0a0a0a]/90" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        {/* Back link */}
        <Link to={`/league/${leagueId}`} className="inline-flex items-center gap-2 text-xs text-white/50 hover:text-white mb-6 transition-colors">
          <ArrowLeft size={14} />
          Back to {league?.name || 'League'}
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-6 h-6 text-yellow-400" />
              <h1 
                className="text-2xl uppercase tracking-[0.15em] font-semibold text-white"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                {championship.name}
              </h1>
            </div>
            <div className="flex items-center gap-4 text-sm text-white/50">
              <span>{championship.season}</span>
              <span>•</span>
              <span>{championship.completedRounds} of {championship.totalRounds} rounds complete</span>
              <span className={`px-2 py-0.5 text-[10px] uppercase font-semibold ${
                championship.status === 'active' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                championship.status === 'completed' ? 'bg-white/10 text-white/50 border border-white/20' :
                'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              }`}>
                {championship.status}
              </span>
            </div>
          </div>
          {isAdmin && (
            <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white/70 text-xs uppercase tracking-wider hover:bg-white/10 transition-colors">
              <Settings size={14} />
              Manage
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs text-white/40 mb-2">
            <span>Season Progress</span>
            <span>{Math.round((championship.completedRounds / championship.totalRounds) * 100)}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 transition-all"
              style={{ width: `${(championship.completedRounds / championship.totalRounds) * 100}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Main Standings */}
          <div className="col-span-8">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-white/5 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/40">
                <div className="col-span-1 text-center">Pos</div>
                <div className="col-span-4">Driver</div>
                <div className="col-span-1 text-center">Pts</div>
                <div className="col-span-1 text-center">W</div>
                <div className="col-span-1 text-center">Pod</div>
                <div className="col-span-1 text-center">Pole</div>
                <div className="col-span-1 text-center">FL</div>
                <div className="col-span-1 text-center">Avg</div>
                <div className="col-span-1"></div>
              </div>

              {/* Standings Rows */}
              {championship.standings.map((entry) => {
                const posChange = getPositionChange(entry.position, entry.previousPosition);
                const isExpanded = expandedDriver === entry.driver.id;

                return (
                  <div key={entry.driver.id}>
                    <div 
                      className={`grid grid-cols-12 gap-2 px-4 py-3 items-center border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors ${
                        entry.position <= 3 ? 'bg-white/[0.02]' : ''
                      }`}
                      onClick={() => setExpandedDriver(isExpanded ? null : entry.driver.id)}
                    >
                      {/* Position */}
                      <div className="col-span-1 flex items-center justify-center gap-1">
                        <span className={`w-7 h-7 flex items-center justify-center text-sm font-bold border ${getPositionBadge(entry.position)}`}>
                          {entry.position}
                        </span>
                      </div>

                      {/* Driver */}
                      <div className="col-span-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center gap-1 ${posChange.color}`}>
                            {posChange.icon}
                            {posChange.change > 0 && <span className="text-[10px]">{posChange.change}</span>}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{entry.driver.name}</div>
                            <div className="text-[10px] text-white/40">{entry.driver.team}</div>
                          </div>
                        </div>
                      </div>

                      {/* Points */}
                      <div className="col-span-1 text-center">
                        <span className="text-lg font-bold text-white">{entry.points}</span>
                      </div>

                      {/* Wins */}
                      <div className="col-span-1 text-center text-sm text-white/70">{entry.wins}</div>

                      {/* Podiums */}
                      <div className="col-span-1 text-center text-sm text-white/70">{entry.podiums}</div>

                      {/* Poles */}
                      <div className="col-span-1 text-center text-sm text-white/70">{entry.poles}</div>

                      {/* Fastest Laps */}
                      <div className="col-span-1 text-center text-sm text-white/70">{entry.fastestLaps}</div>

                      {/* Avg Finish */}
                      <div className="col-span-1 text-center text-sm text-white/50">{entry.avgFinish.toFixed(1)}</div>

                      {/* Expand */}
                      <div className="col-span-1 text-center">
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
                      </div>
                    </div>

                    {/* Expanded Results */}
                    {isExpanded && (
                      <div className="bg-white/[0.02] border-b border-white/10 px-4 py-4">
                        <div className="text-[10px] uppercase tracking-wider text-white/40 mb-3">Race Results</div>
                        <div className="grid grid-cols-6 gap-2">
                          {entry.results.map((result) => (
                            <div 
                              key={result.eventId}
                              className={`p-2 border text-center ${
                                result.dnf ? 'bg-red-500/10 border-red-500/30' :
                                result.position === 1 ? 'bg-yellow-500/10 border-yellow-500/30' :
                                result.position <= 3 ? 'bg-white/5 border-white/20' :
                                'bg-white/[0.02] border-white/10'
                              }`}
                            >
                              <div className="text-[10px] text-white/40 mb-1 truncate">{result.eventName.replace('Round ', 'R')}</div>
                              <div className={`text-lg font-bold ${result.dnf ? 'text-red-400' : result.position === 1 ? 'text-yellow-400' : 'text-white'}`}>
                                {result.dnf ? 'DNF' : `P${result.position}`}
                              </div>
                              <div className="text-[10px] text-white/50">{result.points} pts</div>
                              <div className="flex items-center justify-center gap-1 mt-1">
                                {result.polePosition && <span className="w-3 h-3 bg-purple-500/30 text-purple-400 text-[8px] flex items-center justify-center">P</span>}
                                {result.fastestLap && <span className="w-3 h-3 bg-purple-500/30 text-purple-400 text-[8px] flex items-center justify-center">F</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Points System */}
            <div className="mt-6 bg-white/5 backdrop-blur-xl border border-white/10 p-4">
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-3">Points System</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(championship.pointsSystem).map(([pos, pts]) => (
                  <div key={pos} className="flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 text-xs">
                    <span className="text-white/50">P{pos}:</span>
                    <span className="text-white font-medium">{pts}</span>
                  </div>
                ))}
                {championship.dropWorst > 0 && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/10 border border-orange-500/30 text-xs text-orange-400">
                    Drop worst {championship.dropWorst}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="col-span-4 space-y-6">
            {/* Leader Card */}
            <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border border-yellow-500/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Medal className="w-5 h-5 text-yellow-400" />
                <span className="text-[10px] uppercase tracking-wider text-yellow-400">Championship Leader</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
                  <span className="text-2xl font-bold text-yellow-400">1</span>
                </div>
                <div>
                  <div className="text-lg font-bold text-white">{championship.standings[0].driver.name}</div>
                  <div className="text-xs text-white/50">{championship.standings[0].driver.team}</div>
                  <div className="text-2xl font-bold text-yellow-400 mt-1">{championship.standings[0].points} pts</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-yellow-500/20">
                <div className="text-center">
                  <div className="text-lg font-bold text-white">{championship.standings[0].wins}</div>
                  <div className="text-[10px] text-white/40 uppercase">Wins</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-white">{championship.standings[0].podiums}</div>
                  <div className="text-[10px] text-white/40 uppercase">Podiums</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-white">{championship.standings[0].poles}</div>
                  <div className="text-[10px] text-white/40 uppercase">Poles</div>
                </div>
              </div>
            </div>

            {/* Gap to Leader */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4">
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-3">Gap to Leader</div>
              <div className="space-y-2">
                {championship.standings.slice(1, 5).map((entry) => (
                  <div key={entry.driver.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 flex items-center justify-center text-[10px] font-bold bg-white/10 text-white/70">
                        {entry.position}
                      </span>
                      <span className="text-sm text-white/70">{entry.driver.name}</span>
                    </div>
                    <span className="text-sm font-mono text-red-400">
                      -{championship.standings[0].points - entry.points}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Rounds */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-white/40" />
                  <span className="text-[10px] uppercase tracking-wider text-white/40">Upcoming Rounds</span>
                </div>
                {isAdmin && (
                  <Link 
                    to={`/league/${leagueId}/create-event`}
                    className="text-[10px] text-orange-400 hover:text-orange-300 flex items-center gap-1"
                  >
                    <Plus size={12} />
                    Add
                  </Link>
                )}
              </div>
              <div className="space-y-2">
                {mockUpcomingRounds.slice(0, 4).map((round) => (
                  <div key={round.round} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div>
                      <div className="text-xs text-white">{round.name}</div>
                      <div className="text-[10px] text-white/40">{round.track}</div>
                    </div>
                    <div className="text-[10px] text-white/50">{round.date}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4">
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-3">Season Stats</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 bg-white/5">
                  <div className="text-lg font-bold text-white">{championship.standings.length}</div>
                  <div className="text-[10px] text-white/40">Drivers</div>
                </div>
                <div className="text-center p-2 bg-white/5">
                  <div className="text-lg font-bold text-white">{championship.completedRounds}</div>
                  <div className="text-[10px] text-white/40">Races</div>
                </div>
                <div className="text-center p-2 bg-white/5">
                  <div className="text-lg font-bold text-white">
                    {new Set(championship.standings.filter(s => s.wins > 0).map(s => s.driver.id)).size}
                  </div>
                  <div className="text-[10px] text-white/40">Winners</div>
                </div>
                <div className="text-center p-2 bg-white/5">
                  <div className="text-lg font-bold text-white">
                    {championship.standings.reduce((sum, s) => sum + s.dnfs, 0)}
                  </div>
                  <div className="text-[10px] text-white/40">DNFs</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
