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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 
          className="text-2xl font-bold uppercase tracking-wider"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          Career Statistics
        </h1>
        <p className="text-sm text-white/50 mt-1">Your racing performance by discipline</p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-white/40">Total Starts</span>
            <Flag className="w-4 h-4 text-white/20" />
          </div>
          <div className="text-3xl font-mono font-bold">{totalStarts}</div>
        </div>
        <div className="bg-black/40 backdrop-blur-sm border border-[#f97316]/30 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-[#f97316]">Wins</span>
            <Trophy className="w-4 h-4 text-[#f97316]" />
          </div>
          <div className="text-3xl font-mono font-bold text-[#f97316]">{totalWins}</div>
        </div>
        <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-white/40">Top 5s</span>
            <Medal className="w-4 h-4 text-white/20" />
          </div>
          <div className="text-3xl font-mono font-bold">{totalTop5s}</div>
        </div>
        <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-white/40">Poles</span>
            <TrendingUp className="w-4 h-4 text-white/20" />
          </div>
          <div className="text-3xl font-mono font-bold">{totalPoles}</div>
        </div>
      </div>

      {/* Stats by Discipline */}
      <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-6">
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
              className="bg-black/40 border border-white/10 p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <span 
                  className="text-sm uppercase tracking-wider font-semibold"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  {getDisciplineLabel(stat.discipline)}
                </span>
                <span className="text-xs text-white/40 font-mono">{stat.starts} starts</span>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Wins</div>
                  <div className="text-xl font-mono font-bold text-[#f97316]">{stat.wins}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Top 5</div>
                  <div className="text-xl font-mono font-bold">{stat.top5s}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Poles</div>
                  <div className="text-xl font-mono font-bold">{stat.poles}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Avg Start</div>
                  <div className="text-lg font-mono">{stat.avgStart.toFixed(1)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Avg Finish</div>
                  <div className="text-lg font-mono">{stat.avgFinish.toFixed(1)}</div>
                </div>
              </div>

              {/* Win Rate Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-[10px] uppercase tracking-wider text-white/40 mb-1">
                  <span>Win Rate</span>
                  <span>{((stat.wins / stat.starts) * 100).toFixed(1)}%</span>
                </div>
                <div className="h-1.5 bg-white/10 overflow-hidden">
                  <div 
                    className="h-full bg-[#f97316]"
                    style={{ width: `${(stat.wins / stat.starts) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
