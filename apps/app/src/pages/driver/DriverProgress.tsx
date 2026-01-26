import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  TrendingUp, TrendingDown, Minus, Trophy, Target, 
  Clock, Flag, Shield, Gauge, Car, ArrowLeft,
  ChevronDown, ChevronRight, Calendar, MapPin, Award,
  BarChart3, Flame, Star
} from 'lucide-react';

interface DriverStats {
  overall: number;
  rank: number;
  totalDrivers: number;
  weekChange: number;
  attributes: {
    name: string;
    value: number;
    trend: 'up' | 'down' | 'stable';
    change: number;
    details?: string;
  }[];
  recentForm: {
    race: string;
    track: string;
    date: string;
    position: number;
    started: number;
    points: number;
    highlight?: string;
    incidents: number;
    bestLap: string;
    avgLap: string;
  }[];
  seasonStats: {
    label: string;
    value: string | number;
    subtext?: string;
    details?: { label: string; value: string | number }[];
  }[];
  badges: {
    name: string;
    icon: string;
    earned: boolean;
    description: string;
    progress?: number;
  }[];
  weeklyProjection: { optimistic: number; expected: number; floor: number };
  streaks: { name: string; current: number; best: number; active: boolean }[];
  milestones: { name: string; current: number; target: number; reward: string }[];
  comparisons: { metric: string; you: number; average: number; top10: number }[];
}

const mockStats: DriverStats = {
  overall: 847,
  rank: 1247,
  totalDrivers: 15420,
  weekChange: 12,
  attributes: [
    { name: 'Pace', value: 78, trend: 'up', change: 3, details: 'Raw speed vs field average' },
    { name: 'Consistency', value: 85, trend: 'up', change: 5, details: 'Lap time variance' },
    { name: 'Race Craft', value: 72, trend: 'stable', change: 0, details: 'Wheel-to-wheel racing' },
    { name: 'Qualifying', value: 68, trend: 'up', change: 2, details: 'Single lap pace' },
    { name: 'Tire Management', value: 81, trend: 'down', change: -1, details: 'Long run degradation' },
    { name: 'Wet Weather', value: 64, trend: 'stable', change: 0, details: 'Rain performance' },
    { name: 'Starts', value: 71, trend: 'up', change: 4, details: 'First lap gains' },
    { name: 'Pressure', value: 66, trend: 'up', change: 1, details: 'Fighting for position' },
  ],
  recentForm: [
    { race: 'Daytona 500', track: 'Daytona International Speedway', date: 'Jan 24', position: 5, started: 8, points: 18, highlight: 'Clean race', incidents: 0, bestLap: '1:42.847', avgLap: '1:43.221' },
    { race: 'Spa 24H', track: 'Circuit de Spa-Francorchamps', date: 'Jan 20', position: 3, started: 6, points: 24, highlight: 'Podium!', incidents: 1, bestLap: '2:18.442', avgLap: '2:19.887' },
    { race: 'Monza GP', track: 'Autodromo Nazionale Monza', date: 'Jan 17', position: 12, started: 4, points: 6, incidents: 4, bestLap: '1:47.223', avgLap: '1:48.102' },
    { race: 'British GP', track: 'Silverstone Circuit', date: 'Jan 14', position: 7, started: 9, points: 12, highlight: '+2 positions', incidents: 0, bestLap: '1:28.991', avgLap: '1:29.445' },
    { race: 'Nürburgring 4H', track: 'Nürburgring GP', date: 'Jan 10', position: 4, started: 5, points: 20, incidents: 2, bestLap: '1:54.112', avgLap: '1:55.334' },
    { race: 'Imola Sprint', track: 'Autodromo Enzo e Dino Ferrari', date: 'Jan 7', position: 2, started: 3, points: 22, highlight: 'P2!', incidents: 0, bestLap: '1:31.887', avgLap: '1:32.445' },
    { race: 'Road America', track: 'Road America', date: 'Jan 3', position: 8, started: 12, points: 14, highlight: '+4 positions', incidents: 1, bestLap: '2:01.223', avgLap: '2:02.112' },
  ],
  seasonStats: [
    { label: 'Races', value: 24, details: [{ label: 'Completed', value: 21 }, { label: 'DNF', value: 3 }] },
    { label: 'Wins', value: 2, details: [{ label: 'Poles', value: 1 }, { label: 'Front Row', value: 4 }] },
    { label: 'Podiums', value: 7, details: [{ label: 'P2', value: 3 }, { label: 'P3', value: 2 }] },
    { label: 'Top 5s', value: 12, details: [{ label: 'Top 10', value: 18 }, { label: 'Points', value: 21 }] },
    { label: 'Avg Finish', value: '8.2', details: [{ label: 'Best', value: '1st' }, { label: 'Worst', value: '24th' }] },
    { label: 'Avg Start', value: '9.4', details: [{ label: 'Best Quali', value: '1st' }, { label: 'Gap', value: '+0.4s' }] },
    { label: 'Gained', value: '+28', subtext: 'positions', details: [{ label: 'Per Race', value: '+1.2' }, { label: 'Best', value: '+8' }] },
    { label: 'Laps Led', value: 47, details: [{ label: 'Races Led', value: 6 }, { label: 'Most', value: 18 }] },
    { label: 'Incidents', value: '1.2x', subtext: 'per race', details: [{ label: 'Total', value: '29x' }, { label: 'At Fault', value: '12x' }] },
    { label: 'Best Lap %', value: '4.2%', details: [{ label: 'Fastest', value: 3 }, { label: 'Top 3', value: 8 }] },
    { label: 'iRating', value: '2,847', subtext: '+124', details: [{ label: 'Peak', value: '2,912' }, { label: 'Start', value: '2,456' }] },
    { label: 'Safety', value: 'A 3.42', details: [{ label: 'Peak', value: 'A 4.12' }, { label: 'Corners/Inc', value: '847' }] },
  ],
  badges: [
    { name: 'Clean Racer', icon: 'shield', earned: true, description: '5 races with 0x', progress: 100 },
    { name: 'Comeback', icon: 'trending-up', earned: true, description: 'Gained 5+ positions', progress: 100 },
    { name: 'Pole Sitter', icon: 'flag', earned: false, description: 'Qualify P1', progress: 0 },
    { name: 'Consistent', icon: 'target', earned: true, description: '10 consistent finishes', progress: 100 },
    { name: 'Rain Master', icon: 'cloud', earned: false, description: 'Win in rain', progress: 60 },
    { name: 'Endurance', icon: 'clock', earned: true, description: '60+ min race', progress: 100 },
    { name: 'Hot Streak', icon: 'flame', earned: false, description: '3 podiums in a row', progress: 66 },
    { name: 'Century', icon: 'star', earned: false, description: '100 races', progress: 24 },
  ],
  weeklyProjection: { optimistic: 32, expected: 24, floor: 14 },
  streaks: [
    { name: 'Top 10 Finishes', current: 4, best: 8, active: true },
    { name: 'Clean Races', current: 2, best: 5, active: true },
    { name: 'Points Finishes', current: 7, best: 12, active: true },
  ],
  milestones: [
    { name: 'First 100 Races', current: 24, target: 100, reward: 'Century Badge' },
    { name: 'Season Wins', current: 2, target: 5, reward: 'Champion Contender' },
    { name: 'Clean Streak', current: 2, target: 10, reward: 'Safety Expert' },
    { name: 'Total Podiums', current: 7, target: 25, reward: 'Podium Regular' },
  ],
  comparisons: [
    { metric: 'Avg Finish', you: 8.2, average: 12.4, top10: 4.8 },
    { metric: 'Incidents/Race', you: 1.2, average: 2.8, top10: 0.6 },
    { metric: 'Positions Gained', you: 1.2, average: -0.3, top10: 2.1 },
    { metric: 'Quali Position', you: 9.4, average: 14.2, top10: 5.2 },
  ],
};

function getTrendIcon(trend: 'up' | 'down' | 'stable') {
  switch (trend) {
    case 'up': return <TrendingUp size={12} className="text-emerald-400" />;
    case 'down': return <TrendingDown size={12} className="text-red-400" />;
    default: return <Minus size={12} className="text-white/30" />;
  }
}

function getAttributeColor(value: number): string {
  if (value >= 80) return 'bg-emerald-500';
  if (value >= 70) return 'bg-blue-500';
  if (value >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

function getBadgeIcon(icon: string) {
  switch (icon) {
    case 'shield': return <Shield size={12} />;
    case 'trending-up': return <TrendingUp size={12} />;
    case 'flag': return <Flag size={12} />;
    case 'target': return <Target size={12} />;
    case 'clock': return <Clock size={12} />;
    case 'flame': return <Flame size={12} />;
    case 'star': return <Star size={12} />;
    default: return <Trophy size={12} />;
  }
}

export function DriverProgress() {
  const { user } = useAuth();
  const [stats] = useState<DriverStats>(mockStats);
  const [expandedRace, setExpandedRace] = useState<number | null>(null);
  const [expandedStat, setExpandedStat] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'form' | 'stats' | 'compare'>('form');

  const driverName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Driver';

  return (
    <div className="h-[calc(100vh-8rem)] flex relative">
      <div className="absolute inset-0 overflow-hidden">
        <video autoPlay loop muted playsInline className="w-full h-full object-cover opacity-70">
          <source src="/videos/driver-bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0e]/80 via-[#0e0e0e]/60 to-[#0e0e0e]/40" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0e0e0e]/80" />
      </div>

      {/* Sidebar */}
      <div className="relative z-10 w-72 border-r border-white/[0.06] bg-[#0e0e0e]/80 backdrop-blur-xl flex flex-col">
        <div className="p-4 border-b border-white/[0.06]">
          <Link to="/driver/home" className="flex items-center gap-2 text-white/50 hover:text-white text-xs mb-4 transition-colors">
            <ArrowLeft className="w-3 h-3" />Back to Operations
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/[0.04] border border-white/[0.08] rounded flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white/70" />
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white/90" style={{ fontFamily: 'Orbitron, sans-serif' }}>Progress</h2>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Driver Development</p>
            </div>
          </div>
        </div>

        <div className="p-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>{stats.overall}</div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-white/40">Overall Rating</div>
              <div className={`text-xs flex items-center gap-1 mt-1 ${stats.weekChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {stats.weekChange >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {stats.weekChange >= 0 ? '+' : ''}{stats.weekChange} this week
              </div>
            </div>
          </div>
          <div className="text-[10px] text-white/40 mt-2">Rank #{stats.rank.toLocaleString()} / {stats.totalDrivers.toLocaleString()}</div>
          <div className="mt-3 pt-3 border-t border-white/[0.06]">
            <div className="text-[9px] uppercase tracking-wider text-white/30 mb-1">Weekly Projection</div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-emerald-400 font-mono">{stats.weeklyProjection.optimistic}</span>
              <span className="text-white/20">/</span>
              <span className="text-white font-mono font-semibold">{stats.weeklyProjection.expected}</span>
              <span className="text-white/20">/</span>
              <span className="text-amber-400 font-mono">{stats.weeklyProjection.floor}</span>
              <span className="text-white/20 text-[9px]">pts</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3 flex items-center gap-2">
              <Gauge className="w-3 h-3" />Attributes
            </h3>
            <div className="space-y-3">
              {stats.attributes.map((attr, idx) => (
                <div key={idx} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white/70">{attr.name}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-semibold text-white">{attr.value}</span>
                      {getTrendIcon(attr.trend)}
                      {attr.change !== 0 && (
                        <span className={`text-[9px] font-mono ${attr.change > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {attr.change > 0 ? '+' : ''}{attr.change}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${getAttributeColor(attr.value)}`} style={{ width: `${attr.value}%` }} />
                  </div>
                  {attr.details && <p className="text-[9px] text-white/30 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">{attr.details}</p>}
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-white/[0.06]">
            <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3 flex items-center gap-2">
              <Flame className="w-3 h-3" />Active Streaks
            </h3>
            <div className="space-y-2">
              {stats.streaks.filter(s => s.active).map((streak, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-[10px] text-white/60">{streak.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[#f97316]">{streak.current}</span>
                    <span className="text-[9px] text-white/30">best: {streak.best}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-white/[0.06]">
            <h3 className="text-[10px] uppercase tracking-[0.15em] text-[#f97316] mb-3 flex items-center gap-2">
              <Target className="w-3 h-3" />Focus Area
            </h3>
            <p className="text-sm text-white/90 mb-1">Corner Exit Patience</p>
            <p className="text-[10px] text-white/50 leading-relaxed">You're fast on entry but giving time back on exit.</p>
            <div className="flex items-center justify-between text-[10px] mt-2">
              <span className="text-white/40">Progress</span>
              <span className="text-emerald-400 flex items-center gap-1"><TrendingUp size={10} />Improving</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold text-white uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>{driverName}</h1>
              <p className="text-xs text-white/40 mt-1">Season 2026 • Week 4</p>
            </div>
            <div className="flex gap-1 bg-white/[0.03] rounded-lg p-1">
              {(['form', 'stats', 'compare'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded text-[10px] uppercase tracking-wider font-medium transition-all ${
                    activeTab === tab ? 'bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/30' : 'text-white/50 hover:text-white/70'
                  }`}
                >{tab === 'form' ? 'Recent Form' : tab === 'stats' ? 'Season Stats' : 'Compare'}</button>
              ))}
            </div>
          </div>

          {activeTab === 'form' && (
            <div className="space-y-4">
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flag size={14} className="text-[#f97316]" />
                    <h2 className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/70" style={{ fontFamily: 'Orbitron, sans-serif' }}>Recent Races</h2>
                  </div>
                  <span className="text-[10px] text-white/40">Last 7 races</span>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {stats.recentForm.map((race, idx) => (
                    <div key={idx}>
                      <button onClick={() => setExpandedRace(expandedRace === idx ? null : idx)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded flex items-center justify-center font-mono font-bold text-sm ${
                            race.position <= 3 ? 'bg-amber-500/20 text-amber-400' : race.position <= 5 ? 'bg-emerald-500/20 text-emerald-400' : race.position <= 10 ? 'bg-blue-500/20 text-blue-400' : 'bg-white/[0.06] text-white/50'
                          }`}>P{race.position}</div>
                          <div className="text-left">
                            <p className="text-sm text-white/90">{race.race}</p>
                            <p className="text-[10px] text-white/40 flex items-center gap-2">
                              <span>Started P{race.started}</span>
                              {race.position < race.started && <span className="text-emerald-400">+{race.started - race.position}</span>}
                              {race.position > race.started && <span className="text-red-400">{race.started - race.position}</span>}
                              <span className="text-white/20">•</span>
                              <span>{race.date}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-mono text-white/80">{race.points} pts</p>
                            {race.highlight && <p className="text-[10px] text-emerald-400">{race.highlight}</p>}
                          </div>
                          {expandedRace === idx ? <ChevronDown size={14} className="text-white/30" /> : <ChevronRight size={14} className="text-white/30" />}
                        </div>
                      </button>
                      {expandedRace === idx && (
                        <div className="px-4 pb-4 pt-1 bg-white/[0.01]">
                          <div className="flex items-center gap-2 text-[10px] text-white/40 mb-3"><MapPin size={10} />{race.track}</div>
                          <div className="grid grid-cols-4 gap-3">
                            <div className="bg-white/[0.03] rounded p-2 text-center">
                              <div className="text-xs font-mono text-white">{race.bestLap}</div>
                              <div className="text-[9px] text-white/40">Best Lap</div>
                            </div>
                            <div className="bg-white/[0.03] rounded p-2 text-center">
                              <div className="text-xs font-mono text-white">{race.avgLap}</div>
                              <div className="text-[9px] text-white/40">Avg Lap</div>
                            </div>
                            <div className="bg-white/[0.03] rounded p-2 text-center">
                              <div className={`text-xs font-mono ${race.incidents === 0 ? 'text-emerald-400' : race.incidents <= 2 ? 'text-amber-400' : 'text-red-400'}`}>{race.incidents}x</div>
                              <div className="text-[9px] text-white/40">Incidents</div>
                            </div>
                            <div className="bg-white/[0.03] rounded p-2 text-center">
                              <div className="text-xs font-mono text-white">{race.points}</div>
                              <div className="text-[9px] text-white/40">Points</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-2"><Award size={14} className="text-purple-400" /><h2 className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/70" style={{ fontFamily: 'Orbitron, sans-serif' }}>Badges</h2></div>
                  <span className="text-[10px] text-white/40">{stats.badges.filter(b => b.earned).length}/{stats.badges.length} earned</span>
                </div>
                <div className="p-3 flex gap-2 overflow-x-auto">
                  {stats.badges.map((badge, idx) => (
                    <div key={idx} className={`flex-shrink-0 w-16 rounded-lg p-2 transition-all ${badge.earned ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30' : 'bg-white/[0.02] border border-white/[0.06]'}`} title={badge.description}>
                      <div className={`flex items-center justify-center mb-1 ${badge.earned ? 'text-amber-400' : 'text-white/20'}`}>{getBadgeIcon(badge.icon)}</div>
                      <p className={`text-[7px] uppercase tracking-wider text-center leading-tight ${badge.earned ? 'text-amber-400' : 'text-white/30'}`}>{badge.name}</p>
                      {!badge.earned && badge.progress !== undefined && badge.progress > 0 && (
                        <div className="mt-1 h-0.5 bg-white/[0.06] rounded-full overflow-hidden"><div className="h-full bg-amber-500/50 rounded-full" style={{ width: `${badge.progress}%` }} /></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2"><Target size={14} className="text-emerald-400" /><h2 className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/70" style={{ fontFamily: 'Orbitron, sans-serif' }}>Milestones</h2></div>
                <div className="p-4 grid grid-cols-2 gap-3">
                  {stats.milestones.map((m, idx) => (
                    <div key={idx} className="bg-white/[0.02] rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-white/80">{m.name}</span>
                        <span className="text-[10px] font-mono text-white/50">{m.current}/{m.target}</span>
                      </div>
                      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden mb-2"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(m.current / m.target) * 100}%` }} /></div>
                      <p className="text-[9px] text-white/40 flex items-center gap-1"><Trophy size={9} />{m.reward}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-4">
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2"><Trophy size={14} className="text-amber-400" /><h2 className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/70" style={{ fontFamily: 'Orbitron, sans-serif' }}>Season Statistics</h2></div>
                <div className="grid grid-cols-4 gap-px bg-white/[0.04]">
                  {stats.seasonStats.map((stat, idx) => (
                    <button key={idx} onClick={() => setExpandedStat(expandedStat === idx ? null : idx)} className={`p-4 text-center transition-colors ${expandedStat === idx ? 'bg-white/[0.06]' : 'bg-[#0e0e0e]/60 hover:bg-white/[0.03]'}`}>
                      <div className="text-xl font-mono font-semibold text-white">{stat.value}</div>
                      <div className="text-[9px] uppercase tracking-wider text-white/40">{stat.label}</div>
                      {stat.subtext && <div className="text-[9px] text-emerald-400 mt-0.5">{stat.subtext}</div>}
                      {stat.details && <div className="text-[8px] text-white/20 mt-1">Click for details</div>}
                    </button>
                  ))}
                </div>
                {expandedStat !== null && stats.seasonStats[expandedStat].details && (
                  <div className="px-4 py-3 bg-white/[0.02] border-t border-white/[0.06]">
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-white/60">{stats.seasonStats[expandedStat].label} Details:</span>
                      {stats.seasonStats[expandedStat].details!.map((d, i) => (
                        <div key={i} className="flex items-center gap-2"><span className="text-[10px] text-white/40">{d.label}:</span><span className="text-xs font-mono text-white">{d.value}</span></div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4"><Calendar size={14} className="text-amber-400" /><h2 className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/70" style={{ fontFamily: 'Orbitron, sans-serif' }}>This Week</h2></div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-start gap-3 p-3 bg-white/[0.02] rounded-lg"><Car size={16} className="text-white/30 mt-0.5" /><div><p className="text-xs text-white/80">Daytona 24H</p><p className="text-[10px] text-white/40">Practice Thursday</p></div></div>
                  <div className="flex items-start gap-3 p-3 bg-white/[0.02] rounded-lg"><Clock size={16} className="text-white/30 mt-0.5" /><div><p className="text-xs text-white/80">2 Races</p><p className="text-[10px] text-white/40">Sat 8pm, Sun 3pm</p></div></div>
                  <div className="flex items-start gap-3 p-3 bg-white/[0.02] rounded-lg"><Target size={16} className="text-white/30 mt-0.5" /><div><p className="text-xs text-white/80">Weekly Goal</p><p className="text-[10px] text-white/40">Top 10 = +15 pts</p></div></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'compare' && (
            <div className="space-y-4">
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2"><BarChart3 size={14} className="text-blue-400" /><h2 className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/70" style={{ fontFamily: 'Orbitron, sans-serif' }}>How You Compare</h2></div>
                <div className="p-4 space-y-4">
                  {stats.comparisons.map((c, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-white/70">{c.metric}</span>
                        <div className="flex items-center gap-4 text-[10px]">
                          <span className="text-white/40">Avg: <span className="font-mono text-white/60">{c.average}</span></span>
                          <span className="text-white/40">Top 10%: <span className="font-mono text-emerald-400">{c.top10}</span></span>
                        </div>
                      </div>
                      <div className="relative h-2 bg-white/[0.06] rounded-full">
                        <div className="absolute h-full w-0.5 bg-white/20 rounded" style={{ left: `${Math.min((c.average / 20) * 100, 100)}%` }} title="Average" />
                        <div className="absolute h-full w-0.5 bg-emerald-500/50 rounded" style={{ left: `${Math.min((c.top10 / 20) * 100, 100)}%` }} title="Top 10%" />
                        <div className="absolute h-full w-2 bg-[#f97316] rounded-full -translate-x-1/2" style={{ left: `${Math.min((c.you / 20) * 100, 100)}%` }} title="You" />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-[#f97316] font-mono">You: {c.you}</span>
                        <span className={`text-[10px] ${c.you <= c.average ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {c.you <= c.average ? 'Above Average' : 'Below Average'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-lg p-4">
                <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3">Performance Summary</h3>
                <p className="text-sm text-white/70 leading-relaxed">
                  You're performing <span className="text-emerald-400 font-medium">above average</span> in most metrics. 
                  Your strongest area is <span className="text-[#f97316] font-medium">consistency</span> with incidents well below average. 
                  Focus on <span className="text-amber-400 font-medium">qualifying</span> to unlock more potential.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
