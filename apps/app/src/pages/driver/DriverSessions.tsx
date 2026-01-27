import { useState, useEffect, useRef } from 'react';
import { fetchDriverSessions, DriverSessionSummary, getDisciplineLabel } from '../../lib/driverService';
import { Calendar, MapPin, Flag, Trophy, AlertTriangle, Loader2 } from 'lucide-react';

export function DriverSessions() {
  const [sessions, setSessions] = useState<DriverSessionSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    fetchDriverSessions().then((data) => {
      setSessions(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.6;
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-8rem)]">
      {/* Background video */}
      <div className="fixed inset-0 z-0">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover opacity-70"
        >
          <source src="/videos/bg-1.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0e]/80 via-[#0e0e0e]/60 to-[#0e0e0e]/40" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0e0e0e]/80" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto space-y-6 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 
            className="text-3xl font-bold uppercase tracking-wider"
            style={{ fontFamily: 'Orbitron, sans-serif', textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
          >
            Session History
          </h1>
          <p className="text-sm text-white/60 mt-2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>Your recent racing sessions</p>
        </div>

      {/* Sessions Table */}
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded overflow-hidden shadow-lg shadow-black/20">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-white/40">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    Date
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-white/40">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-3 h-3" />
                    Series
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-white/40">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3" />
                    Track
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-white/40">
                  <div className="flex items-center gap-2">
                    <Flag className="w-3 h-3" />
                    Discipline
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-[10px] uppercase tracking-wider text-white/40">Start</th>
                <th className="px-4 py-3 text-center text-[10px] uppercase tracking-wider text-white/40">Finish</th>
                <th className="px-4 py-3 text-center text-[10px] uppercase tracking-wider text-white/40">
                  <div className="flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Inc
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sessions?.map((session) => {
                const posChange = (session.startPos ?? 0) - (session.finishPos ?? 0);
                return (
                  <tr 
                    key={session.sessionId} 
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3 text-xs font-mono text-white/60">
                      {new Date(session.startedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{session.seriesName}</td>
                    <td className="px-4 py-3 text-sm text-white/80">{session.trackName}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs uppercase tracking-wider px-2 py-1 bg-white/5 border border-white/10">
                        {getDisciplineLabel(session.discipline)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-sm">
                      {session.startPos ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-sm">
                      <span className={
                        posChange > 0 ? 'text-green-500' : 
                        posChange < 0 ? 'text-red-500' : ''
                      }>
                        {session.finishPos ?? '—'}
                      </span>
                      {posChange !== 0 && (
                        <span className={`text-xs ml-1 ${posChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          ({posChange > 0 ? '+' : ''}{posChange})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-sm">
                      <span className={session.incidents && session.incidents > 4 ? 'text-red-400' : 'text-white/60'}>
                        {session.incidents ?? '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      {sessions && sessions.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-5 shadow-lg shadow-black/20 hover:bg-white/[0.05] transition-all duration-200">
            <div className="text-[10px] uppercase tracking-[0.15em] text-white/50 mb-2">Total Sessions</div>
            <div className="text-3xl font-mono font-bold">{sessions.length}</div>
          </div>
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-5 shadow-lg shadow-black/20 hover:bg-white/[0.05] transition-all duration-200">
            <div className="text-[10px] uppercase tracking-[0.15em] text-white/50 mb-2">Avg Finish</div>
            <div className="text-3xl font-mono font-bold">
              {(sessions.reduce((acc, s) => acc + (s.finishPos ?? 0), 0) / sessions.length).toFixed(1)}
            </div>
          </div>
          <div className="bg-white/[0.03] backdrop-blur-xl border border-[#f97316]/30 rounded p-5 shadow-lg shadow-[#f97316]/10 hover:bg-white/[0.05] transition-all duration-200">
            <div className="text-[10px] uppercase tracking-[0.15em] text-[#f97316] mb-2">Best Finish</div>
            <div className="text-3xl font-mono font-bold text-[#f97316]">
              P{Math.min(...sessions.map(s => s.finishPos ?? 99))}
            </div>
          </div>
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-5 shadow-lg shadow-black/20 hover:bg-white/[0.05] transition-all duration-200">
            <div className="text-[10px] uppercase tracking-[0.15em] text-white/50 mb-2">Total Incidents</div>
            <div className="text-3xl font-mono font-bold">
              {sessions.reduce((acc, s) => acc + (s.incidents ?? 0), 0)}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
