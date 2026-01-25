import { useRef, useEffect, useState } from 'react';
import { useRelay } from '../../hooks/useRelay';
import { Link } from 'react-router-dom';
import { 
  Fuel,
  Flag,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Radio,
  Zap,
  MessageSquare,
  ChevronRight
} from 'lucide-react';

// Urgency levels for AI outputs
type Urgency = 'critical' | 'warning' | 'info';

interface AIAlert {
  id: string;
  role: 'engineer' | 'spotter' | 'analyst';
  message: string;
  urgency: Urgency;
  timestamp: number;
}

export function DriverBlackBox() {
  const { status, telemetry, session } = useRelay();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [alerts, setAlerts] = useState<AIAlert[]>([]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.5;
    }
  }, []);

  // Generate AI alerts based on telemetry state
  useEffect(() => {
    if (status !== 'in_session') return;
    
    const newAlerts: AIAlert[] = [];
    const now = Date.now();

    // Engineer: Fuel alerts
    if (telemetry.fuel !== null && telemetry.fuelPerLap !== null) {
      const lapsLeft = telemetry.fuel / telemetry.fuelPerLap;
      if (lapsLeft < 2) {
        newAlerts.push({
          id: 'fuel-critical',
          role: 'engineer',
          message: 'BOX NOW — Fuel critical',
          urgency: 'critical',
          timestamp: now,
        });
      } else if (lapsLeft < 5) {
        newAlerts.push({
          id: 'fuel-warning',
          role: 'engineer',
          message: `Pit window open — ${Math.floor(lapsLeft)} laps fuel`,
          urgency: 'warning',
          timestamp: now,
        });
      }
    }

    // Spotter: Delta-based alerts
    if (telemetry.delta !== null) {
      if (telemetry.delta < -0.5) {
        newAlerts.push({
          id: 'pace-good',
          role: 'spotter',
          message: 'Good pace, clear ahead',
          urgency: 'info',
          timestamp: now,
        });
      }
    }

    // Analyst: Lap improvement
    if (telemetry.bestLap !== null && telemetry.lastLap !== null) {
      if (telemetry.lastLap <= telemetry.bestLap) {
        newAlerts.push({
          id: 'pb-lap',
          role: 'analyst',
          message: 'Personal best lap',
          urgency: 'info',
          timestamp: now,
        });
      }
    }

    setAlerts(newAlerts);
  }, [status, telemetry.fuel, telemetry.fuelPerLap, telemetry.delta, telemetry.bestLap, telemetry.lastLap]);

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return '--:--.---';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${mins}:${secs.padStart(6, '0')}`;
  };

  const getUrgencyStyle = (urgency: Urgency) => {
    switch (urgency) {
      case 'critical': return 'bg-red-500/20 border-red-500 text-red-400';
      case 'warning': return 'bg-yellow-500/20 border-yellow-500 text-yellow-400';
      case 'info': return 'bg-blue-500/20 border-blue-500 text-blue-400';
    }
  };

  const getRoleColor = (role: AIAlert['role']) => {
    switch (role) {
      case 'engineer': return 'text-orange-400';
      case 'spotter': return 'text-blue-400';
      case 'analyst': return 'text-purple-400';
    }
  };

  // Disconnected state
  if (status === 'disconnected') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white p-4">
        <div className="max-w-4xl mx-auto">
          <div className="border border-yellow-500/50 bg-yellow-500/10 p-8 text-center">
            <Radio className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
            <h1 className="text-xl font-bold uppercase tracking-wider mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              Relay Disconnected
            </h1>
            <p className="text-sm text-white/50 mb-6">Connect to iRacing to activate BlackBox</p>
            <div className="flex justify-center gap-4">
              <Link to="/driver/crew/engineer" className="px-4 py-2 border border-white/20 text-xs uppercase tracking-wider hover:bg-white/5">
                Pre-Race Planning →
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Connecting state
  if (status === 'connecting') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm uppercase tracking-wider text-yellow-500">Connecting to Relay...</p>
        </div>
      </div>
    );
  }

  // LIVE BLACKBOX VIEW
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Video Background - very subtle */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover opacity-20"
        style={{ zIndex: 0 }}
      >
        <source src="https://okboxbox.com/video/okbb-bg.mp4" type="video/mp4" />
      </video>
      <div className="fixed inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/80" style={{ zIndex: 1 }} />

      {/* Main Content */}
      <div className="relative z-10 p-2 space-y-2">
        
        {/* SESSION STATE BAR */}
        <div className="flex items-center justify-between bg-black/60 border border-white/10 px-3 py-2">
          <div className="flex items-center gap-4">
            {/* Session Type */}
            <div className="flex items-center gap-2">
              <Flag className="w-4 h-4 text-white/40" />
              <span className="text-xs uppercase tracking-wider font-semibold">
                {session.sessionType || 'Practice'}
              </span>
            </div>
            {/* Track */}
            <span className="text-xs text-white/40">{session.trackName || 'Unknown Track'}</span>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Fuel Risk */}
            {telemetry.lapsRemaining !== null && (
              <div className={`flex items-center gap-1 text-xs ${
                telemetry.lapsRemaining < 3 ? 'text-red-400' : 
                telemetry.lapsRemaining < 6 ? 'text-yellow-400' : 'text-green-400'
              }`}>
                <Fuel className="w-3 h-3" />
                <span>{telemetry.lapsRemaining}L</span>
              </div>
            )}
            {/* Relay Health */}
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] uppercase tracking-wider text-green-400">Live</span>
            </div>
          </div>
        </div>

        {/* CRITICAL ALERTS - Top priority interrupts */}
        {alerts.filter(a => a.urgency === 'critical').map(alert => (
          <div 
            key={alert.id}
            className={`border-l-4 px-3 py-2 flex items-center justify-between ${getUrgencyStyle(alert.urgency)}`}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-bold uppercase tracking-wider">{alert.message}</span>
            </div>
            <span className={`text-xs uppercase ${getRoleColor(alert.role)}`}>{alert.role}</span>
          </div>
        ))}

        {/* MAIN TELEMETRY GRID */}
        <div className="grid grid-cols-12 gap-2">
          
          {/* LEFT: Position & Lap State */}
          <div className="col-span-2 space-y-2">
            {/* Position */}
            <div className="bg-black/60 border border-white/10 p-3 text-center">
              <div className="text-[10px] uppercase tracking-wider text-white/40">Position</div>
              <div className="text-4xl font-bold font-mono">
                P{telemetry.position ?? '--'}
              </div>
            </div>
            {/* Lap */}
            <div className="bg-black/60 border border-white/10 p-3 text-center">
              <div className="text-[10px] uppercase tracking-wider text-white/40">Lap</div>
              <div className="text-2xl font-bold font-mono">
                {telemetry.lap ?? '--'}
              </div>
            </div>
            {/* Sector */}
            <div className="bg-black/60 border border-white/10 p-2">
              <div className="text-[10px] uppercase tracking-wider text-white/40 text-center mb-1">Sector</div>
              <div className="flex gap-1">
                {[1, 2, 3].map(s => (
                  <div 
                    key={s}
                    className={`flex-1 h-2 ${
                      telemetry.sector === s ? 'bg-green-500' : 
                      (telemetry.sector ?? 0) > s ? 'bg-white/30' : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* CENTER: Speed, Delta, Timing */}
          <div className="col-span-6 space-y-2">
            {/* Speed + Gear + RPM */}
            <div className="bg-black/60 border border-white/10 p-3">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-white/40">Speed</div>
                  <div className="text-5xl font-bold font-mono tracking-tight">
                    {telemetry.speed !== null ? Math.round(telemetry.speed) : '--'}
                    <span className="text-lg text-white/40 ml-1">mph</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-white/40">Gear</div>
                  <div className="text-4xl font-bold font-mono">{telemetry.gear ?? 'N'}</div>
                </div>
              </div>
              {/* RPM Bar */}
              <div className="mt-2">
                <div className="h-2 bg-white/10 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-100"
                    style={{ width: `${telemetry.rpm ? Math.min(100, (telemetry.rpm / 8000) * 100) : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Delta */}
            <div className="bg-black/60 border border-white/10 p-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-wider text-white/40">Delta to Best</div>
                <div className={`text-3xl font-bold font-mono flex items-center gap-2 ${
                  telemetry.delta === null ? 'text-white/30' :
                  telemetry.delta < 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {telemetry.delta !== null ? (
                    <>
                      {telemetry.delta < 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                      {telemetry.delta > 0 ? '+' : ''}{telemetry.delta.toFixed(3)}s
                    </>
                  ) : (
                    <>
                      <Minus className="w-6 h-6" />
                      --.---
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Lap Times */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-black/60 border border-white/10 p-3">
                <div className="text-[10px] uppercase tracking-wider text-white/40">Last Lap</div>
                <div className="text-xl font-mono font-bold">{formatTime(telemetry.lastLap)}</div>
              </div>
              <div className="bg-black/60 border border-purple-500/30 p-3">
                <div className="text-[10px] uppercase tracking-wider text-purple-400">Best Lap</div>
                <div className="text-xl font-mono font-bold text-purple-400">{formatTime(telemetry.bestLap)}</div>
              </div>
            </div>
          </div>

          {/* RIGHT: Fuel, Inputs, Gaps */}
          <div className="col-span-4 space-y-2">
            {/* Fuel */}
            <div className="bg-black/60 border border-white/10 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] uppercase tracking-wider text-white/40">Fuel</div>
                <div className={`text-xs ${
                  telemetry.lapsRemaining !== null && telemetry.lapsRemaining < 3 ? 'text-red-400' : 'text-white/60'
                }`}>
                  {telemetry.lapsRemaining ?? '--'} laps
                </div>
              </div>
              <div className="flex items-end gap-3">
                <div className="text-2xl font-mono font-bold">
                  {telemetry.fuel !== null ? telemetry.fuel.toFixed(1) : '--'}
                  <span className="text-sm text-white/40">L</span>
                </div>
                <div className="text-xs text-white/40">
                  {telemetry.fuelPerLap !== null ? `${telemetry.fuelPerLap.toFixed(2)}/lap` : ''}
                </div>
              </div>
              {/* Fuel Bar */}
              <div className="mt-2 h-2 bg-white/10 overflow-hidden">
                <div 
                  className={`h-full transition-all ${
                    telemetry.lapsRemaining !== null && telemetry.lapsRemaining < 3 ? 'bg-red-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${telemetry.fuel ? Math.min(100, (telemetry.fuel / 20) * 100) : 0}%` }}
                />
              </div>
            </div>

            {/* Throttle / Brake */}
            <div className="bg-black/60 border border-white/10 p-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Throttle</div>
                  <div className="h-16 bg-white/10 relative overflow-hidden">
                    <div 
                      className="absolute bottom-0 left-0 right-0 bg-green-500 transition-all duration-75"
                      style={{ height: `${telemetry.throttle ?? 0}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-mono">
                      {telemetry.throttle ?? 0}%
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Brake</div>
                  <div className="h-16 bg-white/10 relative overflow-hidden">
                    <div 
                      className="absolute bottom-0 left-0 right-0 bg-red-500 transition-all duration-75"
                      style={{ height: `${telemetry.brake ?? 0}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-mono">
                      {telemetry.brake ?? 0}%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Gap Info (placeholder) */}
            <div className="bg-black/60 border border-white/10 p-3">
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Gaps</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-white/40">Ahead:</span>
                  <span className="font-mono ml-1">+2.341</span>
                </div>
                <div>
                  <span className="text-white/40">Behind:</span>
                  <span className="font-mono ml-1">-1.892</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI CREW OUTPUT STREAM */}
        <div className="bg-black/60 border border-white/10">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-white/40" />
              <span className="text-[10px] uppercase tracking-wider text-white/40">AI Crew</span>
            </div>
            <Link to="/driver/crew/engineer" className="text-[10px] uppercase tracking-wider text-white/30 hover:text-white/60 flex items-center gap-1">
              Open Chat <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          
          <div className="p-2 space-y-1 max-h-32 overflow-y-auto">
            {alerts.filter(a => a.urgency !== 'critical').length > 0 ? (
              alerts.filter(a => a.urgency !== 'critical').map(alert => (
                <div 
                  key={alert.id}
                  className={`flex items-center gap-2 px-2 py-1 border-l-2 ${getUrgencyStyle(alert.urgency)}`}
                >
                  <span className={`text-[10px] uppercase font-semibold ${getRoleColor(alert.role)}`}>
                    {alert.role}
                  </span>
                  <span className="text-sm text-white/80">{alert.message}</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-white/30 italic px-2 py-1">
                Monitoring... No alerts
              </div>
            )}
          </div>
        </div>

        {/* QUICK ACCESS BAR */}
        <div className="flex items-center justify-between bg-black/40 border border-white/5 px-3 py-2">
          <div className="flex items-center gap-4">
            <Link to="/driver/crew/engineer" className="text-[10px] uppercase tracking-wider text-orange-400/60 hover:text-orange-400 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Engineer
            </Link>
            <Link to="/driver/crew/spotter" className="text-[10px] uppercase tracking-wider text-blue-400/60 hover:text-blue-400 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Spotter
            </Link>
            <Link to="/driver/crew/analyst" className="text-[10px] uppercase tracking-wider text-purple-400/60 hover:text-purple-400 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Analyst
            </Link>
          </div>
          <div className="text-[10px] text-white/20">
            BlackBox v0.1-alpha
          </div>
        </div>
      </div>
    </div>
  );
}
