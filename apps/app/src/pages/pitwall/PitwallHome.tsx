import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { useParams, Link } from 'react-router-dom';
import { Radio, Target, BarChart3, Users, Clock, Zap, TrendingUp } from 'lucide-react';
import { getTeam, Team } from '../../lib/teams';
import { PitwallWelcome, useFirstTimeExperience } from '../../components/PitwallWelcome';

export function PitwallHome() {
  const { teamId } = useParams<{ teamId: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionState, setSessionState] = useState<'practice' | 'qual' | 'race' | 'offline'>('offline');
  const [lastUpdateAt, setLastUpdateAt] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { hasSeenWelcome, markAsSeen } = useFirstTimeExperience('pitwall');
  const { isDark } = useTheme();
  const breatheRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (teamId) {
      getTeam(teamId).then(setTeam);
    }
  }, [teamId]);

  // TODO: Wire to Relay socket
  useEffect(() => {
    // Placeholder for socket connection
    const interval = setInterval(() => {
      setLastUpdateAt(Date.now());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

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

  const lastUpdateLabel = lastUpdateAt ? new Date(lastUpdateAt).toLocaleTimeString() : '—';

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

      <div className={`min-h-screen p-6 relative overflow-hidden ${isDark ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
        {/* Ambient background layer - ultra-slow gradient drift for subtle life (3 min loop) */}
        <div 
          className={`absolute inset-0 pointer-events-none ${isDark ? 'opacity-[0.03]' : 'opacity-[0.02]'}`}
          style={{
            background: isDark 
              ? 'radial-gradient(ellipse 80% 60% at 20% 30%, rgba(255,255,255,0.05) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 80% 70%, rgba(255,255,255,0.03) 0%, transparent 60%)'
              : 'radial-gradient(ellipse 80% 60% at 20% 30%, rgba(0,0,0,0.15) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 80% 70%, rgba(0,0,0,0.1) 0%, transparent 60%)',
            animation: 'ambientDrift 180s ease-in-out infinite alternate',
          }}
        />
        
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
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#0a0a0a] flex items-center justify-center">
                <Radio size={24} className="text-white/80" />
              </div>
              <div>
                <h1 
                  className={`text-2xl font-semibold tracking-[0.1em] uppercase ${isDark ? 'text-white' : 'text-[#0a0a0a]'}`}
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  {team?.name || 'Pit Wall'}
                </h1>
                <p className={`text-sm mt-1 ${isDark ? 'text-white/50' : 'text-black/50'}`}>Real-time telemetry & race operations</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Live system clock - temporal presence */}
            <span className="text-[10px] font-mono text-black/40 tracking-wider">
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
              className="bg-[#0a0a0a] p-5 hover:bg-[#111] transition-colors group"
            >
              <div className="flex flex-col gap-3">
                <dept.icon size={20} className="text-white/50 group-hover:text-white/70 transition-colors" />
                <div>
                  <div className="text-sm font-semibold text-white tracking-wide" style={{ fontFamily: 'Orbitron, sans-serif' }}>{dept.label}</div>
                  <div className="text-[10px] text-white/60 uppercase tracking-wider mt-0.5">{dept.sublabel}</div>
                  <div className="text-[10px] text-white/40 mt-2 leading-relaxed">{dept.desc}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Connection Status - calm, reassuring, not an alert */}
        {!isConnected && (
          <div 
            className="bg-[#0a0a0a] p-4 mb-6 flex items-center gap-4 relative"
            style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}
          >
            {/* Subtle breathing glow behind the panel */}
            <div 
              ref={breatheRef}
              className="absolute inset-0 pointer-events-none"
              style={{ 
                background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.03) 0%, transparent 70%)',
                animation: 'breathe 8s ease-in-out infinite'
              }}
            />
            <div className="w-10 h-10 border border-white/20 flex items-center justify-center relative z-10">
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
          <div 
            className="lg:col-span-2 bg-[#0a0a0a] relative"
            style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}
          >
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-white/40" />
                <span className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">Active Driver</span>
              </div>
              <span className="text-[10px] text-white/30">Live Telemetry</span>
            </div>
            <div className="p-6">
              <div className="flex items-baseline justify-between mb-4">
                <div className="text-xl font-bold tracking-wide text-white/40">Awaiting Driver...</div>
                <div className="text-xs font-mono text-white/30">#—</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#111] border border-white/10 p-4">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-white/50">Position</div>
                  <div className="mt-1 text-2xl font-bold text-white/30">—</div>
                </div>
                <div className="bg-[#111] border border-white/10 p-4">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-white/50">Lap</div>
                  <div className="mt-1 text-2xl font-bold text-white/30">—</div>
                </div>
                <div className="bg-[#111] border border-white/10 p-4">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-white/50">Last Lap</div>
                  <div className="mt-1 text-lg font-mono text-white/30">—:—.———</div>
                </div>
                <div className="bg-[#111] border border-white/10 p-4">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-white/50">Best Lap</div>
                  <div className="mt-1 text-lg font-mono text-white/30">—:—.———</div>
                </div>
              </div>
            </div>
          </div>

          {/* Status Panel - with subtle depth */}
          <div 
            className="bg-[#0a0a0a] relative"
            style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}
          >
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
              <TrendingUp size={14} className="text-white/40" />
              <span className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">System Status</span>
            </div>
            <div className="p-4 space-y-3">
              <div className="bg-[#111] border border-white/10 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.12em] text-white/50">Relay Connection</div>
                    <div className="mt-1 text-sm font-semibold text-white">{isConnected ? 'Connected' : 'Waiting'}</div>
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 font-semibold ${statusBadgeClass}`}>
                    {isConnected ? 'Active' : 'Standby'}
                  </span>
                </div>
              </div>
              <div className="bg-[#111] border border-white/10 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.12em] text-white/50">Session Type</div>
                    <div className="mt-1 text-sm font-semibold text-white">{sessionState === 'offline' ? 'No Session' : sessionState.toUpperCase()}</div>
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 font-semibold ${sessionBadgeClass}`}>
                    {sessionState === 'offline' ? 'Idle' : 'Live'}
                  </span>
                </div>
              </div>
              <div className="bg-[#111] border border-white/10 p-4">
                <div className="text-[10px] uppercase tracking-[0.12em] text-white/50">Last Heartbeat</div>
                <div className="mt-1 font-mono text-sm text-white flex items-center gap-2">
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
          <div className={`p-4 ${isDark ? 'bg-[#2a2a2a] border border-white/10' : 'bg-[#0a0a0a]'}`} style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}>
            <div className="text-[10px] uppercase tracking-[0.12em] text-white/50">Fuel Level</div>
            <div className="mt-2 text-2xl font-bold text-white/30">—%</div>
            <div className="mt-1 text-xs text-white/40">— laps remaining</div>
          </div>
          <div className={`p-4 ${isDark ? 'bg-[#2a2a2a] border border-white/10' : 'bg-[#0a0a0a]'}`} style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}>
            <div className="text-[10px] uppercase tracking-[0.12em] text-white/50">Tire Wear</div>
            <div className="mt-2 grid grid-cols-2 gap-1 text-xs font-mono">
              <div className={`p-1 text-center text-white/40 ${isDark ? 'bg-[#1e1e1e] border border-white/10' : 'bg-[#111] border border-white/10'}`}>FL —%</div>
              <div className={`p-1 text-center text-white/40 ${isDark ? 'bg-[#1e1e1e] border border-white/10' : 'bg-[#111] border border-white/10'}`}>FR —%</div>
              <div className={`p-1 text-center text-white/40 ${isDark ? 'bg-[#1e1e1e] border border-white/10' : 'bg-[#111] border border-white/10'}`}>RL —%</div>
              <div className={`p-1 text-center text-white/40 ${isDark ? 'bg-[#1e1e1e] border border-white/10' : 'bg-[#111] border border-white/10'}`}>RR —%</div>
            </div>
          </div>
          <div className={`p-4 ${isDark ? 'bg-[#2a2a2a] border border-white/10' : 'bg-[#0a0a0a]'}`} style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}>
            <div className="text-[10px] uppercase tracking-[0.12em] text-white/50">Gap Ahead</div>
            <div className="mt-2 text-2xl font-mono text-white/30">—.—</div>
          </div>
          <div className={`p-4 ${isDark ? 'bg-[#2a2a2a] border border-white/10' : 'bg-[#0a0a0a]'}`} style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}>
            <div className="text-[10px] uppercase tracking-[0.12em] text-white/50">Gap Behind</div>
            <div className="mt-2 text-2xl font-mono text-white/30">—.—</div>
          </div>
        </div>

        {/* Contextual hint - Tier 3, subtle */}
        <div className={`mt-6 border-l-2 pl-4 py-2 flex items-center gap-4 ${isDark ? 'border-white/20' : 'border-[#0a0a0a]'}`}>
          <div className={`text-[10px] font-medium uppercase tracking-wider whitespace-nowrap ${isDark ? 'text-white/50' : 'text-black/50'}`}>Tip</div>
          <div className={`text-xs flex-1 ${isDark ? 'text-white/50' : 'text-black/50'}`}>
            While waiting for a session, explore Strategy to pre-plan your race or Practice to review recent sessions.
          </div>
          <Link to="strategy" className={`text-[10px] uppercase tracking-wider whitespace-nowrap transition-colors ${isDark ? 'text-white/60 hover:text-white/80' : 'text-black/60 hover:text-black/80'}`}>
            Open Strategy →
          </Link>
        </div>
      </div>
    </>
  );
}
