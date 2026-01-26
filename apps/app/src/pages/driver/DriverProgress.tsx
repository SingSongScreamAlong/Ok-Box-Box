import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  TrendingUp, TrendingDown, Minus, Trophy, Target, Zap,
  Clock, Flag, AlertTriangle, Shield, Gauge, Car, ArrowLeft
} from 'lucide-react';

interface DriverStats {
  overall: number;
  rank: number;
  totalDrivers: number;
  weekChange: number;
  attributes: {
    name: string;
    value: number;
    max: number;
    trend: 'up' | 'down' | 'stable';
    change: number;
  }[];
  recentForm: {
    race: string;
    position: number;
    started: number;
    points: number;
    highlight?: string;
  }[];
  seasonStats: {
    label: string;
    value: string | number;
    subtext?: string;
  }[];
  badges: {
    name: string;
    icon: string;
    earned: boolean;
    description: string;
  }[];
  weeklyProjection: {
    optimistic: number;
    expected: number;
    floor: number;
  };
}

const mockStats: DriverStats = {
  overall: 847,
  rank: 1247,
  totalDrivers: 15420,
  weekChange: 12,
  attributes: [
    { name: 'Pace', value: 78, max: 100, trend: 'up', change: 3 },
    { name: 'Consistency', value: 85, max: 100, trend: 'up', change: 5 },
    { name: 'Race Craft', value: 72, max: 100, trend: 'stable', change: 0 },
    { name: 'Qualifying', value: 68, max: 100, trend: 'up', change: 2 },
    { name: 'Tire Management', value: 81, max: 100, trend: 'down', change: -1 },
    { name: 'Wet Weather', value: 64, max: 100, trend: 'stable', change: 0 },
    { name: 'Starts', value: 71, max: 100, trend: 'up', change: 4 },
    { name: 'Pressure', value: 66, max: 100, trend: 'up', change: 1 },
  ],
  recentForm: [
    { race: 'Daytona', position: 5, started: 8, points: 18, highlight: 'Clean race' },
    { race: 'Spa', position: 3, started: 6, points: 24, highlight: 'Podium!' },
    { race: 'Monza', position: 12, started: 4, points: 6 },
    { race: 'Silverstone', position: 7, started: 9, points: 12, highlight: '+2 positions' },
    { race: 'Nürburgring', position: 4, started: 5, points: 20 },
  ],
  seasonStats: [
    { label: 'Races', value: 24 },
    { label: 'Wins', value: 2 },
    { label: 'Podiums', value: 7 },
    { label: 'Top 5s', value: 12 },
    { label: 'DNFs', value: 3 },
    { label: 'Avg Finish', value: '8.2' },
    { label: 'Avg Start', value: '9.4' },
    { label: 'Positions Gained', value: '+28', subtext: 'total' },
    { label: 'Laps Led', value: 47 },
    { label: 'Incidents', value: '1.2x', subtext: 'per race' },
    { label: 'Best Finish', value: '1st' },
    { label: 'iRating', value: '2,847', subtext: '+124 this month' },
  ],
  badges: [
    { name: 'Clean Racer', icon: 'shield', earned: true, description: '5 races with 0x incidents' },
    { name: 'Comeback King', icon: 'trending-up', earned: true, description: 'Gained 5+ positions in a race' },
    { name: 'Pole Sitter', icon: 'flag', earned: false, description: 'Qualify P1' },
    { name: 'Consistent', icon: 'target', earned: true, description: '10 races finishing within 3 of start' },
    { name: 'Rain Master', icon: 'cloud', earned: false, description: 'Win a wet race' },
    { name: 'Endurance', icon: 'clock', earned: true, description: 'Complete a 60+ minute race' },
  ],
  weeklyProjection: {
    optimistic: 32,
    expected: 24,
    floor: 14
  }
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
    case 'shield': return <Shield size={16} />;
    case 'trending-up': return <TrendingUp size={16} />;
    case 'flag': return <Flag size={16} />;
    case 'target': return <Target size={16} />;
    case 'clock': return <Clock size={16} />;
    default: return <Trophy size={16} />;
  }
}

export function DriverProgress() {
  const { user } = useAuth();
  const [stats] = useState<DriverStats>(mockStats);

  const driverName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Driver';

  return (
    <div className="h-[calc(100vh-8rem)] flex relative">
      {/* Background video */}
      <div className="absolute inset-0 overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-70"
        >
          <source src="/videos/driver-bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0e]/80 via-[#0e0e0e]/60 to-[#0e0e0e]/40" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0e0e0e]/80" />
      </div>

      {/* Sidebar - Attributes & Focus */}
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

        {/* Overall Rating Card */}
        <div className="p-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-4">
            <div 
              className="text-4xl font-bold text-white"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              {stats.overall}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-white/40">Overall Rating</div>
              <div className={`text-xs flex items-center gap-1 mt-1 ${stats.weekChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {stats.weekChange >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {stats.weekChange >= 0 ? '+' : ''}{stats.weekChange} this week
              </div>
            </div>
          </div>
          <div className="text-[10px] text-white/40 mt-2">
            Rank #{stats.rank.toLocaleString()} / {stats.totalDrivers.toLocaleString()}
          </div>
        </div>

        {/* Attributes List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3 flex items-center gap-2">
              <Gauge className="w-3 h-3" />Attributes
            </h3>
            <div className="space-y-3">
              {stats.attributes.map((attr, idx) => (
                <div key={idx}>
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
                    <div 
                      className={`h-full rounded-full ${getAttributeColor(attr.value)}`}
                      style={{ width: `${attr.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Focus Area */}
          <div className="p-4 border-t border-white/[0.06]">
            <h3 className="text-[10px] uppercase tracking-[0.15em] text-[#f97316] mb-3 flex items-center gap-2">
              <Target className="w-3 h-3" />Focus Area
            </h3>
            <p className="text-sm text-white/90 mb-1">Corner Exit Patience</p>
            <p className="text-[10px] text-white/50 leading-relaxed">
              You're fast on entry but giving time back on exit.
            </p>
            <div className="flex items-center justify-between text-[10px] mt-2">
              <span className="text-white/40">Progress</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <TrendingUp size={10} />
                Improving
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 
              className="text-xl font-semibold text-white uppercase tracking-wider"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              {driverName}
            </h1>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-xs text-white/40">Weekly Projection</span>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-emerald-400 font-mono">{stats.weeklyProjection.optimistic}</span>
                <span className="text-white/20">/</span>
                <span className="text-white font-mono font-semibold">{stats.weeklyProjection.expected}</span>
                <span className="text-white/20">/</span>
                <span className="text-amber-400 font-mono">{stats.weeklyProjection.floor}</span>
                <span className="text-white/30 text-[10px]">pts</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Recent Form */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
                <Flag size={14} className="text-[#f97316]" />
                <h2 
                  className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/70"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  Recent Form
                </h2>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {stats.recentForm.map((race, idx) => (
                  <div key={idx} className="px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded flex items-center justify-center font-mono font-bold text-sm ${
                        race.position <= 3 ? 'bg-amber-500/20 text-amber-400' :
                        race.position <= 5 ? 'bg-emerald-500/20 text-emerald-400' :
                        race.position <= 10 ? 'bg-blue-500/20 text-blue-400' :
                        'bg-white/[0.06] text-white/50'
                      }`}>
                        P{race.position}
                      </div>
                      <div>
                        <p className="text-sm text-white/90">{race.race}</p>
                        <p className="text-[10px] text-white/40">
                          Started P{race.started}
                          {race.position < race.started && (
                            <span className="text-emerald-400 ml-1">+{race.started - race.position}</span>
                          )}
                          {race.position > race.started && (
                            <span className="text-red-400 ml-1">{race.started - race.position}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono text-white/80">{race.points} pts</p>
                      {race.highlight && (
                        <p className="text-[10px] text-emerald-400">{race.highlight}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Badges */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
                <Zap size={14} className="text-purple-400" />
                <h2 
                  className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/70"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  Badges
                </h2>
              </div>
              <div className="p-4 grid grid-cols-3 gap-3">
                {stats.badges.map((badge, idx) => (
                  <div 
                    key={idx}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center p-2 transition-all ${
                      badge.earned 
                        ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 text-amber-400' 
                        : 'bg-white/[0.02] border border-white/[0.06] text-white/20'
                    }`}
                    title={badge.description}
                  >
                    {getBadgeIcon(badge.icon)}
                    <span className="text-[8px] uppercase tracking-wider mt-1 text-center leading-tight">
                      {badge.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Season Stats */}
            <div className="col-span-2 bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
                <Trophy size={14} className="text-amber-400" />
                <h2 
                  className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/70"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  Season Stats
                </h2>
              </div>
              <div className="grid grid-cols-6 divide-x divide-white/[0.04]">
                {stats.seasonStats.map((stat, idx) => (
                  <div key={idx} className="p-3 text-center hover:bg-white/[0.02] transition-colors">
                    <div className="text-lg font-mono font-semibold text-white">{stat.value}</div>
                    <div className="text-[9px] uppercase tracking-wider text-white/40">{stat.label}</div>
                    {stat.subtext && (
                      <div className="text-[9px] text-emerald-400 mt-0.5">{stat.subtext}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* This Week */}
            <div className="col-span-2 bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={14} className="text-amber-400" />
                <h2 
                  className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/70"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  This Week
                </h2>
              </div>
              <div className="flex gap-6 text-xs text-white/60">
                <div className="flex items-center gap-2">
                  <Car size={12} className="text-white/30" />
                  Daytona 24H practice opens Thursday
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={12} className="text-white/30" />
                  2 races scheduled this week
                </div>
                <div className="flex items-center gap-2">
                  <Target size={12} className="text-white/30" />
                  Top 10 finish = +15 projected pts
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
