import { useRelay } from '../../hooks/useRelay';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Wifi, WifiOff, Radio, Headphones, Wrench, Eye, BarChart3, ChevronRight, CheckCircle2, Circle, AlertCircle, Play, MessageSquare } from 'lucide-react';

type CrewMemberStatus = 'ready' | 'active' | 'standby' | 'offline';

interface CrewMember {
  id: string;
  name: string;
  role: string;
  icon: React.ReactNode;
  status: CrewMemberStatus;
  statusMessage: string;
  color: string;
}

export function DriverHome() {
  const { user } = useAuth();
  const { status, session } = useRelay();
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Driver';

  const isLive = status === 'in_session';
  const isConnected = status === 'connected' || status === 'in_session';

  const crewMembers: CrewMember[] = [
    { id: 'engineer', name: 'Race Engineer', role: 'Strategy & Setup', icon: <Wrench className="w-6 h-6" />, status: isLive ? 'active' : isConnected ? 'ready' : 'standby', statusMessage: isLive ? 'Monitoring fuel, pace, and strategy' : isConnected ? 'Standing by for session start' : 'Waiting for relay connection', color: '#f97316' },
    { id: 'spotter', name: 'Spotter', role: 'Traffic & Awareness', icon: <Eye className="w-6 h-6" />, status: isLive ? 'active' : isConnected ? 'ready' : 'standby', statusMessage: isLive ? 'Watching traffic and track conditions' : isConnected ? 'Ready to call positions' : 'Waiting for relay connection', color: '#3b82f6' },
    { id: 'analyst', name: 'Performance Analyst', role: 'Data & Insights', icon: <BarChart3 className="w-6 h-6" />, status: isLive ? 'active' : 'standby', statusMessage: isLive ? 'Recording lap data for debrief' : 'Will analyze session after finish', color: '#8b5cf6' },
  ];

  const getStatusIcon = (s: CrewMemberStatus) => {
    if (s === 'active') return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (s === 'ready') return <Circle className="w-4 h-4 text-blue-500 fill-blue-500" />;
    if (s === 'standby') return <Circle className="w-4 h-4 text-yellow-500" />;
    return <AlertCircle className="w-4 h-4 text-red-500" />;
  };

  const relayIcon = status === 'in_session' ? <Radio className="w-6 h-6 text-green-500" /> : status === 'connected' ? <Wifi className="w-6 h-6 text-blue-500" /> : status === 'connecting' ? <Wifi className="w-6 h-6 text-yellow-500 animate-pulse" /> : <WifiOff className="w-6 h-6 text-white/40" />;
  const relayTitle = status === 'in_session' ? 'Session Active' : status === 'connected' ? 'Relay Connected' : status === 'connecting' ? 'Connecting...' : 'Relay Disconnected';
  const relayColor = status === 'in_session' ? 'border-green-500/50 bg-green-500/10' : status === 'connected' ? 'border-blue-500/50 bg-blue-500/10' : status === 'connecting' ? 'border-yellow-500/50 bg-yellow-500/10' : 'border-white/20 bg-white/5';

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>Race Operations</h1>
        <p className="text-white/50 mt-2">Welcome back, {displayName}. Your crew is ready when you are.</p>
      </div>
      <div className={`border p-6 ${relayColor}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 border border-white/20 flex items-center justify-center bg-black/40">{relayIcon}</div>
            <div>
              <h2 className="text-lg font-semibold uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>{relayTitle}</h2>
              <p className="text-sm text-white/60 mt-1">{status === 'in_session' ? `${session.sessionType?.toUpperCase() || 'LIVE'} at ${session.trackName || 'Track'}` : status === 'connected' ? 'Waiting for session' : 'Start iRacing and Relay to connect'}</p>
            </div>
          </div>
          {status === 'disconnected' && <Link to="/download" className="px-4 py-2 bg-[#f97316] text-black font-semibold text-sm uppercase tracking-wider hover:bg-[#fb923c]">Download Relay</Link>}
          {status === 'in_session' && <Link to="/driver/pitwall" className="px-4 py-2 bg-green-500 text-black font-semibold text-sm uppercase tracking-wider hover:bg-green-400 flex items-center gap-2"><Play className="w-4 h-4" />Open Pitwall</Link>}
        </div>
      </div>
      <div>
        <div className="flex items-center gap-3 mb-4"><Headphones className="w-5 h-5 text-[#f97316]" /><h2 className="text-sm uppercase tracking-[0.15em] text-white/60" style={{ fontFamily: 'Orbitron, sans-serif' }}>Your Virtual Crew</h2></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {crewMembers.map((m) => (
            <div key={m.id} className="bg-black/40 backdrop-blur-sm border border-white/10 p-5 hover:border-white/20">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 flex items-center justify-center border" style={{ backgroundColor: `${m.color}20`, borderColor: `${m.color}40`, color: m.color }}>{m.icon}</div>
                <div className="flex items-center gap-2">{getStatusIcon(m.status)}<span className="text-[10px] uppercase tracking-wider text-white/40">{m.status}</span></div>
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>{m.name}</h3>
              <p className="text-[10px] uppercase tracking-wider text-white/40 mt-1">{m.role}</p>
              <div className="mt-4 pt-4 border-t border-white/10"><p className="text-xs text-white/60 italic">"{m.statusMessage}"</p></div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/driver/pitwall" className="bg-black/40 backdrop-blur-sm border border-white/10 p-6 hover:border-[#f97316]/50 group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#f97316]/20 border border-[#f97316]/30 flex items-center justify-center group-hover:bg-[#f97316]/30"><Radio className="w-6 h-6 text-[#f97316]" /></div>
            <div className="flex-1"><h3 className="text-sm uppercase tracking-wider font-semibold" style={{ fontFamily: 'Orbitron, sans-serif' }}>Live Pitwall</h3><p className="text-xs text-white/50 mt-1">Your engineer is waiting for live data</p></div>
            <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/60" />
          </div>
        </Link>
        <Link to="/driver/voice" className="bg-black/40 backdrop-blur-sm border border-white/10 p-6 hover:border-[#8b5cf6]/50 group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 flex items-center justify-center group-hover:bg-[#8b5cf6]/30"><MessageSquare className="w-6 h-6 text-[#8b5cf6]" /></div>
            <div className="flex-1"><h3 className="text-sm uppercase tracking-wider font-semibold" style={{ fontFamily: 'Orbitron, sans-serif' }}>Crew Communication</h3><p className="text-xs text-white/50 mt-1">Configure what your crew calls out</p></div>
            <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/60" />
          </div>
        </Link>
      </div>
      {status === 'disconnected' && (
        <div className="bg-[#f97316]/10 border border-[#f97316]/30 p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-[#f97316]/20 flex items-center justify-center flex-shrink-0"><AlertCircle className="w-5 h-5 text-[#f97316]" /></div>
            <div>
              <h3 className="text-sm font-semibold text-[#f97316] uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>You are Not Racing Alone</h3>
              <p className="text-sm text-white/60 mt-2">Connect the Ok, Box Box Relay to activate your virtual crew.</p>
              <Link to="/download" className="inline-flex items-center gap-2 mt-4 text-sm text-[#f97316] hover:text-[#fb923c]">Get started with the Relay<ChevronRight className="w-4 h-4" /></Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
