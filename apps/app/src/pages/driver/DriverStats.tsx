import { useState, useEffect } from 'react';
import { fetchDriverStats, DriverStatsSnapshot, getDisciplineLabel } from '../../lib/driverService';
import { BarChart3, Trophy, Medal, Flag, TrendingUp, Loader2 } from 'lucide-react';

export function DriverStats() {
  const [stats, setStats] = useState<DriverStatsSnapshot[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDriverStats().then((data) => {
      setStats(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-white/40" />
      </div>
    );
  }

  const totalStarts = stats?.reduce((acc, s) => acc + s.starts, 0) ?? 0;
  const totalWins = stats?.reduce((acc, s) => acc + s.wins, 0) ?? 0;
  const totalTop5s = stats?.reduce((acc, s) => acc + s.top5s, 0) ?? 0;
  const totalPoles = stats?.reduce((acc, s) => acc + s.poles, 0) ?? 0;

  return (
    <div className="relative min-h-[calc(100vh-8rem)]">
      {/* Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
        style={{ backgroundImage: 'url(/images/winter-testing-bg.jpg)' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black" />

      <div className="relative z-10 max-w-6xl mx-auto space-y-6 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 
            className="text-3xl font-bold uppercase tracking-wider"
            style={{ fontFamily: 'Orbitron, sans-serif', textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
          >
            Career Statistics
          </h1>
          <p className="text-sm text-white/60 mt-2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>Your racing performance by discipline</p>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-sm p-6 shadow-lg hover:bg-black/50 transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-[0.15em] text-white/50">Total Starts</span>
              <Flag className="w-4 h-4 text-white/30" />
            </div>
            <div className="text-3xl font-mono font-bold" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>{totalStarts}</div>
          </div>
          <div className="bg-black/40 backdrop-blur-md border border-[#f97316]/40 rounded-sm p-6 shadow-lg shadow-[#f97316]/10 hover:bg-black/50 transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-[0.15em] text-[#f97316]">Wins</span>
              <Trophy className="w-4 h-4 text-[#f97316]" />
            </div>
            <div className="text-3xl font-mono font-bold text-[#f97316]" style={{ textShadow: '0 2px 10px rgba(249,115,22,0.3)' }}>{totalWins}</div>
          </div>
          <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-sm p-6 shadow-lg hover:bg-black/50 transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-[0.15em] text-white/50">Top 5s</span>
              <Medal className="w-4 h-4 text-white/30" />
            </div>
            <div className="text-3xl font-mono font-bold" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>{totalTop5s}</div>
          </div>
          <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-sm p-6 shadow-lg hover:bg-black/50 transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-[0.15em] text-white/50">Poles</span>
              <TrendingUp className="w-4 h-4 text-white/30" />
            </div>
            <div className="text-3xl font-mono font-bold" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>{totalPoles}</div>
          </div>
        </div>

        {/* Stats by Discipline */}
        <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-sm p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-white/60" />
            <span 
              className="text-xs uppercase tracking-[0.15em] text-white/60"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              By Discipline
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats?.map((stat) => (
              <div 
                key={stat.discipline} 
                className="bg-black/30 border border-white/10 rounded-sm p-5 hover:bg-black/40 hover:border-white/20 transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <span 
                    className="text-sm uppercase tracking-wider font-semibold"
                    style={{ fontFamily: 'Orbitron, sans-serif', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
                  >
                    {getDisciplineLabel(stat.discipline)}
                  </span>
                  <span className="text-xs text-white/50 font-mono bg-black/30 px-2 py-1 rounded-sm">{stat.starts} starts</span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center">
                    <div className="text-[10px] uppercase tracking-wider text-white/50 mb-1">Wins</div>
                    <div className="text-xl font-mono font-bold text-[#f97316]">{stat.wins}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] uppercase tracking-wider text-white/50 mb-1">Top 5</div>
                    <div className="text-xl font-mono font-bold">{stat.top5s}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] uppercase tracking-wider text-white/50 mb-1">Poles</div>
                    <div className="text-xl font-mono font-bold">{stat.poles}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/50 mb-1">Avg Start</div>
                    <div className="text-lg font-mono">{stat.avgStart.toFixed(1)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/50 mb-1">Avg Finish</div>
                    <div className="text-lg font-mono">{stat.avgFinish.toFixed(1)}</div>
                  </div>
                </div>

                {/* Win Rate Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-[10px] uppercase tracking-wider text-white/50 mb-1">
                    <span>Win Rate</span>
                    <span>{((stat.wins / stat.starts) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#f97316] to-[#fb923c] rounded-full"
                      style={{ width: `${(stat.wins / stat.starts) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
