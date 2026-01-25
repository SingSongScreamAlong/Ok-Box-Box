import { useAuth } from '../../contexts/AuthContext';
import { useRelay } from '../../hooks/useRelay';
import { Link } from 'react-router-dom';
import { 
  Activity, 
  Monitor, 
  Mic, 
  User, 
  Wifi, 
  WifiOff, 
  Radio,
  Gauge,
  Fuel,
  Clock,
  Flag,
  ChevronRight
} from 'lucide-react';

export function DriverHome() {
  const { user } = useAuth();
  const { status, telemetry, session } = useRelay();

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Driver';

  const getStatusIcon = () => {
    switch (status) {
      case 'in_session': return <Radio className="w-5 h-5 text-green-500" />;
      case 'connected': return <Wifi className="w-5 h-5 text-blue-500" />;
      case 'connecting': return <Wifi className="w-5 h-5 text-yellow-500 animate-pulse" />;
      default: return <WifiOff className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'in_session': return 'In Session';
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      default: return 'Disconnected';
    }
  };

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return '--:--.---';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${mins}:${secs.padStart(6, '0')}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 
            className="text-2xl md:text-3xl font-bold uppercase tracking-wider"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Welcome, {displayName}
          </h1>
          <p className="text-sm text-white/50 mt-1">Your racing command center</p>
        </div>
      </div>

      {/* Status Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Relay Status */}
        <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-white/40">Relay</span>
            {getStatusIcon()}
          </div>
          <div className="text-lg font-semibold uppercase tracking-wide">
            {getStatusLabel()}
          </div>
        </div>

        {/* Session Status */}
        <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-white/40">Session</span>
            <Flag className={`w-5 h-5 ${session.sessionType ? 'text-green-500' : 'text-white/20'}`} />
          </div>
          <div className="text-lg font-semibold uppercase tracking-wide">
            {session.sessionType || 'Offline'}
          </div>
          {session.trackName && (
            <div className="text-xs text-white/50 mt-1 truncate">{session.trackName}</div>
          )}
        </div>

        {/* Position */}
        <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-white/40">Position</span>
            <Gauge className="w-5 h-5 text-white/20" />
          </div>
          <div className="text-lg font-semibold uppercase tracking-wide">
            {telemetry.position !== null ? `P${telemetry.position}` : '--'}
          </div>
          {telemetry.lap !== null && (
            <div className="text-xs text-white/50 mt-1">Lap {telemetry.lap}</div>
          )}
        </div>

        {/* Best Lap */}
        <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-white/40">Best Lap</span>
            <Clock className="w-5 h-5 text-white/20" />
          </div>
          <div className="text-lg font-mono font-semibold">
            {formatTime(telemetry.bestLap)}
          </div>
        </div>
      </div>

      {/* Quick Telemetry (when in session) */}
      {status === 'in_session' && (
        <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 
              className="text-xs uppercase tracking-[0.15em] text-[#f97316]"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              Live Telemetry
            </h2>
            <Link 
              to="/driver/pitwall" 
              className="text-xs text-white/50 hover:text-white flex items-center gap-1"
            >
              Full Pitwall <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Last Lap</div>
              <div className="text-xl font-mono">{formatTime(telemetry.lastLap)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Delta</div>
              <div className={`text-xl font-mono ${
                telemetry.delta !== null 
                  ? telemetry.delta < 0 ? 'text-green-500' : 'text-red-500'
                  : ''
              }`}>
                {telemetry.delta !== null ? `${telemetry.delta > 0 ? '+' : ''}${telemetry.delta.toFixed(3)}` : '--'}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Fuel</div>
              <div className="text-xl font-mono flex items-center gap-2">
                <Fuel className="w-4 h-4 text-white/40" />
                {telemetry.fuel !== null ? `${telemetry.fuel.toFixed(1)}L` : '--'}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Laps Remaining</div>
              <div className="text-xl font-mono">
                {telemetry.lapsRemaining !== null ? telemetry.lapsRemaining : '--'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pitwall */}
        <Link 
          to="/driver/pitwall"
          className="bg-black/40 backdrop-blur-sm border border-white/10 p-6 hover:border-[#f97316]/50 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#f97316]/20 border border-[#f97316]/30 flex items-center justify-center group-hover:bg-[#f97316]/30 transition-colors">
              <Activity className="w-6 h-6 text-[#f97316]" />
            </div>
            <div>
              <h3 
                className="text-sm uppercase tracking-wider font-semibold"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                Driver Pitwall
              </h3>
              <p className="text-xs text-white/50 mt-1">Live telemetry & timing</p>
            </div>
          </div>
        </Link>

        {/* HUD */}
        <Link 
          to="/driver/hud"
          className="bg-black/40 backdrop-blur-sm border border-white/10 p-6 hover:border-[#3b82f6]/50 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#3b82f6]/20 border border-[#3b82f6]/30 flex items-center justify-center group-hover:bg-[#3b82f6]/30 transition-colors">
              <Monitor className="w-6 h-6 text-[#3b82f6]" />
            </div>
            <div>
              <h3 
                className="text-sm uppercase tracking-wider font-semibold"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                HUD Overlay
              </h3>
              <p className="text-xs text-white/50 mt-1">Configure your display</p>
            </div>
          </div>
        </Link>

        {/* Voice */}
        <Link 
          to="/driver/voice"
          className="bg-black/40 backdrop-blur-sm border border-white/10 p-6 hover:border-[#8b5cf6]/50 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 flex items-center justify-center group-hover:bg-[#8b5cf6]/30 transition-colors">
              <Mic className="w-6 h-6 text-[#8b5cf6]" />
            </div>
            <div>
              <h3 
                className="text-sm uppercase tracking-wider font-semibold"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                Voice Systems
              </h3>
              <p className="text-xs text-white/50 mt-1">AI Engineer & Spotter</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Driver Profile Quick View */}
      <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 
            className="text-xs uppercase tracking-[0.15em] text-white/60"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Driver Identity
          </h2>
          <Link 
            to="/driver/profile" 
            className="text-xs text-[#f97316] hover:text-[#fb923c] flex items-center gap-1"
          >
            Edit Profile <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-[#f97316]/20 border border-[#f97316]/30 flex items-center justify-center">
            <User className="w-8 h-8 text-[#f97316]" />
          </div>
          <div>
            <div className="text-lg font-semibold">{displayName}</div>
            <div className="text-xs text-white/50">{user?.email}</div>
          </div>
        </div>
      </div>

      {/* Winter Testing Notice */}
      <div className="bg-[#f97316]/10 border border-[#f97316]/30 p-4 flex items-start gap-3">
        <div className="w-8 h-8 bg-[#f97316]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Flag className="w-4 h-4 text-[#f97316]" />
        </div>
        <div>
          <h3 
            className="text-sm font-semibold text-[#f97316] uppercase tracking-wider"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Winter Testing
          </h3>
          <p className="text-xs text-white/60 mt-1">
            Ok, Box Box is in early access. Features are being validated and refined. 
            Thank you for being part of the development program.
          </p>
        </div>
      </div>
    </div>
  );
}
