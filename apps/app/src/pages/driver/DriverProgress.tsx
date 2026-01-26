import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  TrendingUp, TrendingDown, Minus, Trophy, Target, Zap,
  Clock, Flag, AlertTriangle, Shield, Gauge, Car
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
  const videoRef = useRef<HTMLVideoElement>(null);

  const driverName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Driver';

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.5;
    }
  }, []);

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
          className="w-full h-full object-cover opacity-40"
        >
          <source src="/videos/driver-bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/80 via-[#0a0a0a]/60 to-[#0a0a0a]/95" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        {/* Header Card - Overall Rating */}
        <div className="bg-gradient-to-r from-[#1a1a2e] to-[#16213e] border border-white/[0.10] rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Big Overall Number */}
              <div className="text-center">
                <div 
                  className="text-5xl font-bold text-white"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  {stats.overall}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-white/40 mt-1">Overall</div>
              </div>
              
              <div className="h-16 w-px bg-white/10" />
              
              {/* Driver Info */}
              <div>
                <h1 
                  className="text-xl font-semibold text-white uppercase tracking-wider"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  {driverName}
                </h1>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span className="text-white/50">
                    Rank <span className="text-white font-mono">#{stats.rank.toLocaleString()}</span>
                    <span className="text-white/30"> / {stats.totalDrivers.toLocaleString()}</span>
                  </span>
                  <span className={`flex items-center gap-1 ${stats.weekChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {stats.weekChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {stats.weekChange >= 0 ? '+' : ''}{stats.weekChange} this week
                  </span>
                </div>
              </div>
            </div>

            {/* Weekly Projection */}
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Weekly Projection</div>
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <div className="text-lg font-mono text-emerald-400">{stats.weeklyProjection.optimistic}</div>
                  <div className="text-[9px] text-white/30">High</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-mono text-white font-bold">{stats.weeklyProjection.expected}</div>
                  <div className="text-[9px] text-white/30">Expected</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-mono text-amber-400">{stats.weeklyProjection.floor}</div>
                  <div className="text-[9px] text-white/30">Floor</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Attributes */}
          <div className="col-span-4">
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
                <Gauge size={14} className="text-[#3b82f6]" />
                <h2 
                  className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/70"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  Attributes
                </h2>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {stats.attributes.map((attr, idx) => (
                  <div key={idx} className="px-4 py-3 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white/80">{attr.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-semibold text-white">{attr.value}</span>
                        <div className="flex items-center gap-1">
                          {getTrendIcon(attr.trend)}
                          {attr.change !== 0 && (
                            <span className={`text-[10px] font-mono ${attr.change > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {attr.change > 0 ? '+' : ''}{attr.change}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${getAttributeColor(attr.value)}`}
                        style={{ width: `${attr.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Middle Column - Recent Form & Season Stats */}
          <div className="col-span-5 space-y-6">
            {/* Recent Form */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded-lg overflow-hidden">
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

            {/* Season Stats Grid */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
                <Trophy size={14} className="text-amber-400" />
                <h2 
                  className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/70"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  Season Stats
                </h2>
              </div>
              <div className="grid grid-cols-4 divide-x divide-white/[0.04]">
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
          </div>

          {/* Right Column - Badges & Focus */}
          <div className="col-span-3 space-y-6">
            {/* Badges */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
                <Zap size={14} className="text-purple-400" />
                <h2 
                  className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/70"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  Badges
                </h2>
              </div>
              <div className="p-3 grid grid-cols-3 gap-2">
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

            {/* Current Focus */}
            <div className="bg-gradient-to-br from-[#f97316]/10 to-transparent border border-[#f97316]/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target size={14} className="text-[#f97316]" />
                <h2 
                  className="text-[10px] uppercase tracking-[0.15em] font-semibold text-[#f97316]"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  Focus Area
                </h2>
              </div>
              <p className="text-sm text-white/90 mb-2">Corner Exit Patience</p>
              <p className="text-xs text-white/50 leading-relaxed">
                You're fast on entry but giving time back on exit. Work on waiting for the car to settle.
              </p>
              <div className="mt-3 pt-3 border-t border-white/[0.06]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40">Progress</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <TrendingUp size={12} />
                    Improving
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={14} className="text-amber-400" />
                <h2 
                  className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/70"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  This Week
                </h2>
              </div>
              <ul className="space-y-2 text-xs text-white/60">
                <li className="flex items-start gap-2">
                  <Car size={12} className="text-white/30 mt-0.5 flex-shrink-0" />
                  Daytona 24H practice opens Thursday
                </li>
                <li className="flex items-start gap-2">
                  <Clock size={12} className="text-white/30 mt-0.5 flex-shrink-0" />
                  2 races scheduled this week
                </li>
                <li className="flex items-start gap-2">
                  <Target size={12} className="text-white/30 mt-0.5 flex-shrink-0" />
                  Top 10 finish = +15 projected pts
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
