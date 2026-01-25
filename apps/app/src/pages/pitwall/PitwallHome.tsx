import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Radio, Target, BarChart3, Users, Clock, Zap, TrendingUp } from 'lucide-react';
import { getTeam, Team } from '../../lib/teams';
import { PitwallWelcome, useFirstTimeExperience } from '../../components/PitwallWelcome';
import { useRelay } from '../../hooks/useRelay';

export function PitwallHome() {
  const { teamId } = useParams<{ teamId: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { hasSeenWelcome, markAsSeen } = useFirstTimeExperience('pitwall');
  const { status, telemetry, session, connect } = useRelay();
  const videoRef = useRef<HTMLVideoElement>(null);
  const breatheRef = useRef<HTMLDivElement>(null);

  // Derive connection state from relay status
  const isConnected = status === 'connected' || status === 'in_session';
  const sessionState = status === 'in_session' 
    ? (session.sessionType === 'qualifying' ? 'qual' : session.sessionType || 'practice')
    : 'offline';

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.6;
    }
  }, []);

  useEffect(() => {
    if (teamId) {
      getTeam(teamId).then(setTeam);
    }
  }, [teamId]);

  // Auto-connect on mount
  useEffect(() => {
    if (status === 'disconnected') {
      connect();
    }
  }, [status, connect]);

  // Live clock for temporal presence
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  const statusBadgeClass = isConnected 
    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
    : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
  
  const sessionBadgeClass = sessionState === 'race'
    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
    : sessionState === 'qual'
      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
      : sessionState === 'practice'
        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
        : 'bg-white/10 text-white/40 border border-white/20';

  const lastUpdateLabel = telemetry.lapTime !== null ? new Date().toLocaleTimeString() : '—';

  // Format lap time helper
  const formatLapTime = (seconds: number | null): string => {
    if (seconds === null) return '—:—.———';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toFixed(3).padStart(6, '0')}`;
  };

  // Department tiles - these are rooms, not buttons
  const departments = [
    { icon: Target, label: 'Strategy', sublabel: 'Race Engineering', desc: 'Fuel calc, pit windows, tire strategy', path: 'strategy' },
    { icon: BarChart3, label: 'Practice', sublabel: 'Session Analysis', desc: 'Lap times, telemetry, driver comparison', path: 'practice' },
    { icon: Users, label: 'Roster', sublabel: 'Driver Profiles', desc: 'Team members, stats, development', path: 'roster' },
    { icon: Clock, label: 'Planning', sublabel: 'Event Schedule', desc: 'Upcoming races, availability, prep', path: 'planning' },
  ];

  return (
    <>
      {/* First-time welcome experience */}
      {!hasSeenWelcome && (
        <PitwallWelcome teamName={team?.name || 'Your Team'} onComplete={markAsSeen} />
      )}

      <div className="min-h-screen relative overflow-hidden">
        {/* Background video - more visible */}
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
            <source src="/videos/team-bg.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0e]/80 via-[#0e0e0e]/60 to-[#0e0e0e]/40" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0e0e0e]/80" />
        </div>
        
        {/* CSS Keyframes for animations */}
        <style>{`
          @keyframes ambientDrift {
            0% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(1.5%, 0.5%) scale(1.01); }
            100% { transform: translate(-0.5%, 1%) scale(1.005); }
          }
          @keyframes gentlePulse {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.5; }
          }
          @keyframes breathe {
            0%, 100% { opacity: 0.03; }
            50% { opacity: 0.06; }
          }
          @keyframes statusGlow {
            0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
            50% { box-shadow: 0 0 8px 0 rgba(255,255,255,0.03); }
          }
        `}</style>

        <div className="relative z-10 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/[0.04] border border-white/[0.08] rounded flex items-center justify-center">
                <Radio size={24} className="text-white/70" />
              </div>
              <div>
                <h1 
                  className="text-2xl font-semibold tracking-[0.1em] uppercase text-white/90"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  {team?.name || 'Pit Wall'}
                </h1>
                <p className="text-sm mt-1 text-white/50">Real-time telemetry & race operations</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Live system clock - temporal presence */}
            <span className="text-[10px] font-mono text-white/40 tracking-wider">
              {currentTime.toLocaleTimeString()}
            </span>
            <span 
              className={`text-[10px] uppercase tracking-wider px-3 py-1.5 font-semibold ${statusBadgeClass}`}
              style={{ animation: !isConnected ? 'statusGlow 4s ease-in-out infinite' : 'none' }}
            >
              {isConnected ? 'Connected' : 'Awaiting Connection'}
            </span>
            <span className={`text-[10px] uppercase tracking-wider px-2 py-1 font-semibold ${sessionBadgeClass}`}>
              {sessionState.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Department Tiles - rooms to enter, not buttons to click */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {departments.map((dept) => (
            <Link
              key={dept.path}
              to={dept.path}
              className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-5 hover:border-white/20 hover:bg-white/[0.05] transition-all shadow-lg shadow-black/20 group"
            >
              <div className="flex flex-col gap-3">
                <dept.icon size={20} className="text-white/50 group-hover:text-white/70 transition-colors" />
                <div>
                  <div className="text-sm font-semibold text-white/90 tracking-wide" style={{ fontFamily: 'Orbitron, sans-serif' }}>{dept.label}</div>
                  <div className="text-[10px] text-white/50 uppercase tracking-wider mt-0.5">{dept.sublabel}</div>
                  <div className="text-[10px] text-white/40 mt-2 leading-relaxed">{dept.desc}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Connection Status - calm, reassuring, not an alert */}
        {!isConnected && (
          <div 
            className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-4 mb-6 flex items-center gap-4 relative shadow-lg shadow-black/20"
          >
            {/* Subtle breathing glow behind the panel */}
            <div 
              ref={breatheRef}
              className="absolute inset-0 pointer-events-none rounded"
              style={{ 
                background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.03) 0%, transparent 70%)',
                animation: 'breathe 8s ease-in-out infinite'
              }}
            />
            <div className="w-10 h-10 border border-white/[0.10] rounded flex items-center justify-center relative z-10">
              <Radio size={18} className="text-white/60" />
            </div>
            <div className="flex-1 relative z-10">
              <div className="text-sm font-medium text-white/90">Awaiting iRacing Connection</div>
              <div className="text-xs text-white/50 mt-0.5">Start iRacing and join a session. Your pit wall is standing by.</div>
            </div>
            <div className="flex items-center gap-2 relative z-10">
              <div 
                className="w-2 h-2 bg-white/50 rounded-full"
                style={{ animation: 'gentlePulse 3s ease-in-out infinite' }}
              />
              <span className="text-[10px] text-white/40 uppercase tracking-wider">Listening</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Driver Panel - primary panel with subtle depth */}
          <div className="lg:col-span-2 bg-white/[0.03] backdrop-blur-xl border border-white/[0.12] rounded shadow-lg shadow-black/20">
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-white/40" />
                <span className="text-[10px] uppercase tracking-[0.15em] text-white/40 font-semibold">Active Driver</span>
              </div>
              <span className="text-[10px] text-white/30">Live Telemetry</span>
            </div>
            <div className="p-6">
              <div className="flex items-baseline justify-between mb-4">
                <div className={`text-xl font-bold tracking-wide ${status === 'in_session' ? 'text-white' : 'text-white/40'}`}>
                  {status === 'in_session' ? (session.trackName || 'In Session') : 'Awaiting Driver...'}
                </div>
                <div className="text-xs font-mono text-white/50">
                  {telemetry.position !== null ? `P${telemetry.position}` : '#—'}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/[0.02] border border-white/[0.08] rounded p-4">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-white/40">Position</div>
                  <div className={`mt-1 text-2xl font-bold ${telemetry.position !== null ? 'text-white' : 'text-white/30'}`}>
                    {telemetry.position !== null ? `P${telemetry.position}` : '—'}
                  </div>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.08] rounded p-4">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-white/40">Lap</div>
                  <div className={`mt-1 text-2xl font-bold ${telemetry.lap !== null ? 'text-white' : 'text-white/30'}`}>
                    {telemetry.lap !== null ? telemetry.lap : '—'}
                  </div>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.08] rounded p-4">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-white/40">Last Lap</div>
                  <div className={`mt-1 text-lg font-mono ${telemetry.lastLap !== null ? 'text-white' : 'text-white/30'}`}>
                    {formatLapTime(telemetry.lastLap)}
                  </div>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.08] rounded p-4">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-white/40">Best Lap</div>
                  <div className={`mt-1 text-lg font-mono ${telemetry.bestLap !== null ? 'text-purple-400' : 'text-white/30'}`}>
                    {formatLapTime(telemetry.bestLap)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status Panel - with subtle depth */}
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded shadow-lg shadow-black/20">
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
              <TrendingUp size={14} className="text-white/40" />
              <span className="text-[10px] uppercase tracking-[0.15em] text-white/40 font-semibold">System Status</span>
            </div>
            <div className="p-4 space-y-3">
              <div className="bg-white/[0.02] border border-white/[0.08] rounded p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.12em] text-white/40">Relay Connection</div>
                    <div className="mt-1 text-sm font-semibold text-white/80">{isConnected ? 'Connected' : 'Waiting'}</div>
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-semibold ${statusBadgeClass}`}>
                    {isConnected ? 'Active' : 'Standby'}
                  </span>
                </div>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.08] rounded p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.12em] text-white/40">Session Type</div>
                    <div className="mt-1 text-sm font-semibold text-white/80">{sessionState === 'offline' ? 'No Session' : sessionState.toUpperCase()}</div>
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-semibold ${sessionBadgeClass}`}>
                    {sessionState === 'offline' ? 'Idle' : 'Live'}
                  </span>
                </div>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.08] rounded p-4">
                <div className="text-[10px] uppercase tracking-[0.12em] text-white/40">Last Heartbeat</div>
                <div className="mt-1 font-mono text-sm text-white/80 flex items-center gap-2">
                  {lastUpdateLabel}
                  <span 
                    className="w-1.5 h-1.5 bg-white/30 rounded-full"
                    style={{ animation: 'gentlePulse 2s ease-in-out infinite' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fuel & Strategy Quick View */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-4 shadow-lg shadow-black/20">
            <div className="text-[10px] uppercase tracking-[0.12em] text-white/40">Fuel Level</div>
            <div className={`mt-2 text-2xl font-bold ${telemetry.fuel !== null ? (telemetry.fuel < 5 ? 'text-red-400' : 'text-white') : 'text-white/30'}`}>
              {telemetry.fuel !== null ? `${telemetry.fuel.toFixed(1)}L` : '—%'}
            </div>
            <div className="mt-1 text-xs text-white/30">
              {telemetry.lapsRemaining !== null ? `${telemetry.lapsRemaining} laps remaining` : '— laps remaining'}
            </div>
          </div>
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-4 shadow-lg shadow-black/20">
            <div className="text-[10px] uppercase tracking-[0.12em] text-white/40">Tire Wear</div>
            <div className="mt-2 grid grid-cols-2 gap-1 text-xs font-mono">
              <div className="p-1 text-center text-white/30 bg-white/[0.02] border border-white/[0.06] rounded">FL —%</div>
              <div className="p-1 text-center text-white/30 bg-white/[0.02] border border-white/[0.06] rounded">FR —%</div>
              <div className="p-1 text-center text-white/30 bg-white/[0.02] border border-white/[0.06] rounded">RL —%</div>
              <div className="p-1 text-center text-white/30 bg-white/[0.02] border border-white/[0.06] rounded">RR —%</div>
            </div>
          </div>
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-4 shadow-lg shadow-black/20">
            <div className="text-[10px] uppercase tracking-[0.12em] text-white/40">Speed</div>
            <div className={`mt-2 text-2xl font-mono ${telemetry.speed !== null ? 'text-white' : 'text-white/30'}`}>
              {telemetry.speed !== null ? `${Math.round(telemetry.speed)} mph` : '— mph'}
            </div>
          </div>
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-4 shadow-lg shadow-black/20">
            <div className="text-[10px] uppercase tracking-[0.12em] text-white/40">Delta</div>
            <div className={`mt-2 text-2xl font-mono ${telemetry.delta !== null ? (telemetry.delta < 0 ? 'text-green-400' : 'text-red-400') : 'text-white/30'}`}>
              {telemetry.delta !== null ? `${telemetry.delta >= 0 ? '+' : ''}${telemetry.delta.toFixed(2)}s` : '—.—'}
            </div>
          </div>
        </div>

        {/* Contextual hint - Tier 3, subtle */}
        <div className="mt-6 border-l-2 border-white/20 pl-4 py-2 flex items-center gap-4">
          <div className="text-[10px] font-medium uppercase tracking-wider whitespace-nowrap text-white/50">Tip</div>
          <div className="text-xs flex-1 text-white/50">
            While waiting for a session, explore Strategy to pre-plan your race or Practice to review recent sessions.
          </div>
          <Link to="strategy" className="text-[10px] uppercase tracking-wider whitespace-nowrap transition-colors text-white/60 hover:text-white/80">
            Open Strategy →
          </Link>
        </div>
        </div>
      </div>
    </>
  );
}
