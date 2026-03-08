import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getLeague, getUserLeagueRole, League,
  fetchLeagueSeries, fetchSeriesSeasons, fetchSeasonStandings,
  type LeagueStanding,
} from '../lib/leagues';
import { VIDEO_PLAYBACK_RATE } from '../lib/config';
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

function buildChampionship(
  series: { id: string; name: string },
  season: { id: string; name: string; startDate: string | null; endDate: string | null; isActive: boolean },
  standings: LeagueStanding[]
): Championship {
  const completedRounds = standings.reduce((m, s) => Math.max(m, s.racesStarted || 0), 0);
  const now = new Date();
  let status: Championship['status'] = 'upcoming';
  if (season.isActive) {
    status = 'active';
  } else if (season.endDate && new Date(season.endDate) < now) {
    status = 'completed';
  }
  return {
    id: season.id,
    name: `${series.name}`,
    season: season.name,
    status,
    totalRounds: completedRounds,
    completedRounds,
    pointsSystem: {},
    dropWorst: 0,
    standings: standings.map(s => ({
      position: s.position,
      previousPosition: s.position,
      driver: { id: s.driverId, name: s.driverName, team: s.teamName, iRating: 0, safetyRating: '' },
      points: s.points,
      wins: s.wins,
      podiums: s.podiums,
      poles: s.poles,
      fastestLaps: 0,
      dnfs: s.dnfs,
      races: s.racesStarted,
      avgFinish: s.position,
      results: [],
    })),
  };
}

// Mock championship data

export function LeagueChampionship() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { user } = useAuth();
  const [league, setLeague] = useState<League | null>(null);
  const [role, setRole] = useState<'owner' | 'admin' | 'steward' | 'member' | null>(null);
  const [championship, setChampionship] = useState<Championship | null>(null);
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
      videoRef.current.playbackRate = VIDEO_PLAYBACK_RATE;
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

    // Load standings: league → first active series → most recent season → standings
    const seriesList = await fetchLeagueSeries(leagueId);
    const activeSeries = seriesList.find(s => s.isActive) ?? seriesList[0];
    if (activeSeries) {
      const seasons = await fetchSeriesSeasons(activeSeries.id);
      const activeSeason = seasons.find(s => s.isActive) ?? seasons[0];
      if (activeSeason) {
        const standings = await fetchSeasonStandings(activeSeason.id);
        setChampionship(buildChampionship(activeSeries, activeSeason, standings));
      }
    }

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
          <source src="/videos/league-bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/70 via-[#0a0a0a]/50 to-[#0a0a0a]/90" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        {/* Back link */}
        <Link to={`/league/${leagueId}`} className="inline-flex items-center gap-2 text-xs text-white/50 hover:text-white mb-6 transition-colors">
          <ArrowLeft size={14} />
          Back to {league?.name || 'League'}
        </Link>

        {!championship ? (
          <div className="text-center py-20 text-white/30">
            <Trophy className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No championship data yet. Create a series and season first.</p>
          </div>
        ) : (<>

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
              <div className="text-xs text-white/30 py-2">
                No upcoming rounds scheduled. Add events via the Events page.
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
        </>)}
      </div>
    </div>
  );
}
