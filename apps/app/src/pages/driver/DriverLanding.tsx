import { useRelay } from '../../hooks/useRelay';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { 
  Wifi, WifiOff, Radio, Wrench, Eye, BarChart3, ChevronRight, 
  CheckCircle2, Circle, Play, Download, Clock,
  TrendingUp, Calendar, MapPin, Gauge
} from 'lucide-react';

type CrewStatus = 'active' | 'ready' | 'standby';

interface RecentSession {
  id: string;
  track: string;
  date: string;
  position: number;
  totalDrivers: number;
  sessionType: string;
}

export function DriverLanding() {
  const { user } = useAuth();
  const { status, session } = useRelay();
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Driver';

  const isLive = status === 'in_session';
  const isConnected = status === 'connected' || status === 'in_session';

  const getCrewStatus = (): CrewStatus => {
    if (isLive) return 'active';
    if (isConnected) return 'ready';
    return 'standby';
  };

  const crewStatus = getCrewStatus();

  // Mock recent sessions - would come from API
  const recentSessions: RecentSession[] = [
    { id: '1', track: 'Mount Panorama Circuit', date: '2 hours ago', position: 3, totalDrivers: 18, sessionType: 'Practice' },
    { id: '2', track: 'Spa-Francorchamps', date: 'Yesterday', position: 5, totalDrivers: 24, sessionType: 'Race' },
    { id: '3', track: 'Nürburgring GP', date: '3 days ago', position: 1, totalDrivers: 20, sessionType: 'Race' },
  ];

  // Mock stats - would come from API
  const stats = {
    totalRaces: 47,
    wins: 8,
    podiums: 19,
    incidentFreeStreak: 5,
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-8">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/40 text-sm uppercase tracking-wider">Welcome back</p>
          <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-wider mt-1" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            {displayName}
          </h1>
        </div>
        {isLive && (
          <Link 
            to="/driver/cockpit" 
            className="px-6 py-3 bg-green-500 text-black font-bold text-sm uppercase tracking-wider hover:bg-green-400 flex items-center gap-2 animate-pulse"
          >
            <Play className="w-5 h-5" />
            Enter Cockpit
          </Link>
        )}
      </div>

      {/* Session Status - Prominent when live */}
      <div className={`border p-6 transition-all ${
        isLive 
          ? 'border-green-500/50 bg-green-500/10' 
          : isConnected 
            ? 'border-blue-500/30 bg-blue-500/5' 
            : 'border-white/10 bg-white/[0.02]'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 border flex items-center justify-center ${
              isLive 
                ? 'border-green-500/50 bg-green-500/20' 
                : isConnected 
                  ? 'border-blue-500/30 bg-blue-500/10' 
                  : 'border-white/20 bg-white/5'
            }`}>
              {isLive ? (
                <Radio className="w-7 h-7 text-green-500 animate-pulse" />
              ) : isConnected ? (
                <Wifi className="w-7 h-7 text-blue-500" />
              ) : status === 'connecting' ? (
                <Wifi className="w-7 h-7 text-yellow-500 animate-pulse" />
              ) : (
                <WifiOff className="w-7 h-7 text-white/40" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                {isLive ? 'Session Active' : isConnected ? 'Relay Connected' : status === 'connecting' ? 'Connecting...' : 'Relay Offline'}
              </h2>
              <p className="text-sm text-white/60 mt-1">
                {isLive ? (
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-green-400" />
                    {session.trackName || 'Track'} — {session.sessionType?.toUpperCase() || 'LIVE'}
                  </span>
                ) : isConnected ? (
                  'Waiting for iRacing session to start'
                ) : (
                  'Download and run the relay to connect'
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isLive && (
              <Link 
                to="/driver/cockpit" 
                className="px-4 py-2 bg-green-500/20 border border-green-500/30 text-green-400 font-semibold text-sm uppercase tracking-wider hover:bg-green-500/30 flex items-center gap-2"
              >
                <Gauge className="w-4 h-4" />
                Cockpit
              </Link>
            )}
            {status === 'disconnected' && (
              <Link 
                to="/download" 
                className="px-4 py-2 border border-white/20 text-white/60 font-semibold text-sm uppercase tracking-wider hover:bg-white/5 hover:text-white flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Get Relay
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Crew & Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Your Crew */}
          <div className="border border-white/10 bg-white/[0.02]">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm uppercase tracking-[0.15em] text-white/60" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Your Crew
              </h3>
              <div className="flex items-center gap-2">
                {crewStatus === 'active' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                {crewStatus === 'ready' && <Circle className="w-4 h-4 text-blue-500 fill-blue-500" />}
                {crewStatus === 'standby' && <Circle className="w-4 h-4 text-yellow-500" />}
                <span className="text-xs uppercase tracking-wider text-white/40">{crewStatus}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/10">
              {/* Engineer */}
              <Link to="/driver/crew/engineer" className="p-5 hover:bg-white/[0.02] transition-colors group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                    <Wrench className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold uppercase tracking-wider group-hover:text-orange-400 transition-colors" style={{ fontFamily: 'Orbitron, sans-serif' }}>Engineer</h4>
                    <p className="text-[10px] text-white/40 uppercase tracking-wider">Strategy & Setup</p>
                  </div>
                </div>
                <p className="text-xs text-white/50 italic">
                  {isLive ? '"Fuel looks good, maintain pace"' : '"Ready for strategy planning"'}
                </p>
              </Link>
              
              {/* Spotter */}
              <Link to="/driver/crew/spotter" className="p-5 hover:bg-white/[0.02] transition-colors group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold uppercase tracking-wider group-hover:text-blue-400 transition-colors" style={{ fontFamily: 'Orbitron, sans-serif' }}>Spotter</h4>
                    <p className="text-[10px] text-white/40 uppercase tracking-wider">Traffic & Awareness</p>
                  </div>
                </div>
                <p className="text-xs text-white/50 italic">
                  {isLive ? '"Clear all around"' : '"Standing by for session"'}
                </p>
              </Link>
              
              {/* Analyst */}
              <Link to="/driver/crew/analyst" className="p-5 hover:bg-white/[0.02] transition-colors group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold uppercase tracking-wider group-hover:text-purple-400 transition-colors" style={{ fontFamily: 'Orbitron, sans-serif' }}>Analyst</h4>
                    <p className="text-[10px] text-white/40 uppercase tracking-wider">Data & Insights</p>
                  </div>
                </div>
                <p className="text-xs text-white/50 italic">
                  {isLive ? '"Recording session data"' : '"Ready to review sessions"'}
                </p>
              </Link>
            </div>
          </div>

          {/* Recent Sessions */}
          <div className="border border-white/10 bg-white/[0.02]">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm uppercase tracking-[0.15em] text-white/60" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Recent Sessions
              </h3>
              <Link to="/driver/history" className="text-xs text-white/40 hover:text-white/60 uppercase tracking-wider flex items-center gap-1">
                View All <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-white/10">
              {recentSessions.map((s) => (
                <div key={s.id} className="px-5 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 flex items-center justify-center font-bold text-lg ${
                      s.position === 1 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' :
                      s.position <= 3 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                      'bg-white/5 text-white/60 border border-white/10'
                    }`} style={{ fontFamily: 'Orbitron, sans-serif' }}>
                      P{s.position}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{s.track}</p>
                      <p className="text-xs text-white/40">{s.sessionType} • {s.totalDrivers} drivers</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/40">{s.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Stats & Quick Links */}
        <div className="space-y-6">
          
          {/* Quick Stats */}
          <div className="border border-white/10 bg-white/[0.02]">
            <div className="px-5 py-4 border-b border-white/10">
              <h3 className="text-sm uppercase tracking-[0.15em] text-white/60" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Your Stats
              </h3>
            </div>
            <div className="grid grid-cols-2 divide-x divide-y divide-white/10">
              <div className="p-4 text-center">
                <p className="text-2xl font-bold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>{stats.totalRaces}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Races</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-2xl font-bold text-yellow-500" style={{ fontFamily: 'Orbitron, sans-serif' }}>{stats.wins}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Wins</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-2xl font-bold text-orange-400" style={{ fontFamily: 'Orbitron, sans-serif' }}>{stats.podiums}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Podiums</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-2xl font-bold text-green-400" style={{ fontFamily: 'Orbitron, sans-serif' }}>{stats.incidentFreeStreak}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Clean Streak</p>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="border border-white/10 bg-white/[0.02]">
            <div className="px-5 py-4 border-b border-white/10">
              <h3 className="text-sm uppercase tracking-[0.15em] text-white/60" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Quick Access
              </h3>
            </div>
            <div className="divide-y divide-white/10">
              <Link to="/driver/cockpit" className="px-5 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors group">
                <div className="flex items-center gap-3">
                  <Gauge className="w-5 h-5 text-green-400" />
                  <span className="text-sm">Cockpit View</span>
                </div>
                <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40" />
              </Link>
              <Link to="/driver/progress" className="px-5 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors group">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                  <span className="text-sm">Progress</span>
                </div>
                <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40" />
              </Link>
              <Link to="/driver/history" className="px-5 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors group">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-purple-400" />
                  <span className="text-sm">Session History</span>
                </div>
                <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40" />
              </Link>
            </div>
          </div>

          {/* Upcoming - Placeholder */}
          <div className="border border-white/10 bg-white/[0.02]">
            <div className="px-5 py-4 border-b border-white/10">
              <h3 className="text-sm uppercase tracking-[0.15em] text-white/60" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Upcoming
              </h3>
            </div>
            <div className="p-5 text-center">
              <Calendar className="w-8 h-8 text-white/20 mx-auto mb-3" />
              <p className="text-xs text-white/40">No scheduled events</p>
              <p className="text-[10px] text-white/30 mt-1">Join a league to see upcoming races</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
