import { useRef, useEffect, useState } from 'react';
import { useRelay } from '../../../hooks/useRelay';
import { Link } from 'react-router-dom';
import { 
  Fuel,
  Flag,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  MessageSquare,
  ChevronRight
} from 'lucide-react';

type Urgency = 'critical' | 'warning' | 'info';

interface AIAlert {
  id: string;
  role: 'engineer' | 'spotter' | 'analyst';
  message: string;
  urgency: Urgency;
}

/**
 * LiveCockpit - IN_CAR state
 * 
 * Minimal, dense, interrupt-driven. Voice-first philosophy.
 * Only shows what matters RIGHT NOW.
 */
export function LiveCockpit() {
  const { status, telemetry, session } = useRelay();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [alerts, setAlerts] = useState<AIAlert[]>([]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.5;
    }
  }, []);

  // Generate AI alerts based on telemetry
  useEffect(() => {
    const newAlerts: AIAlert[] = [];

    if (telemetry.fuel !== null && telemetry.fuelPerLap !== null) {
      const lapsLeft = telemetry.fuel / telemetry.fuelPerLap;
      if (lapsLeft < 2) {
        newAlerts.push({
          id: 'fuel-critical',
          role: 'engineer',
          message: 'BOX NOW — Fuel critical',
          urgency: 'critical',
        });
      } else if (lapsLeft < 5) {
        newAlerts.push({
          id: 'fuel-warning',
          role: 'engineer',
          message: `Pit window open — ${Math.floor(lapsLeft)} laps fuel`,
          urgency: 'warning',
        });
      }
    }

    if (telemetry.delta !== null && telemetry.delta < -0.5) {
      newAlerts.push({
        id: 'pace-good',
        role: 'spotter',
        message: 'Good pace, clear ahead',
        urgency: 'info',
      });
    }

    setAlerts(newAlerts);
  }, [telemetry.fuel, telemetry.fuelPerLap, telemetry.delta]);

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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Video Background */}
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

      <div className="relative z-10 p-2 space-y-2">
        {/* Session Bar */}
        <div className="flex items-center justify-between bg-black/60 border border-white/10 px-3 py-2">
          <div className="flex items-center gap-4">
            <Flag className="w-4 h-4 text-white/40" />
            <span className="text-xs uppercase tracking-wider font-semibold">
              {session.sessionType || 'Practice'}
            </span>
            <span className="text-xs text-white/40">{session.trackName || 'Unknown'}</span>
          </div>
          <div className="flex items-center gap-4">
            {telemetry.lapsRemaining !== null && (
              <div className={`flex items-center gap-1 text-xs ${
                telemetry.lapsRemaining < 3 ? 'text-red-400' : 
                telemetry.lapsRemaining < 6 ? 'text-yellow-400' : 'text-green-400'
              }`}>
                <Fuel className="w-3 h-3" />
                <span>{telemetry.lapsRemaining}L</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] uppercase tracking-wider text-green-400">
                {status === 'in_session' ? 'Live' : 'Connected'}
              </span>
            </div>
          </div>
        </div>

        {/* Critical Alerts */}
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

        {/* Core Telemetry Grid */}
        <div className="grid grid-cols-12 gap-2">
          {/* Position & Lap */}
          <div className="col-span-2 space-y-2">
            <div className="bg-black/60 border border-white/10 p-3 text-center">
              <div className="text-[10px] uppercase tracking-wider text-white/40">Position</div>
              <div className="text-4xl font-bold font-mono">P{telemetry.position ?? '--'}</div>
            </div>
            <div className="bg-black/60 border border-white/10 p-3 text-center">
              <div className="text-[10px] uppercase tracking-wider text-white/40">Lap</div>
              <div className="text-2xl font-bold font-mono">{telemetry.lap ?? '--'}</div>
            </div>
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

          {/* Speed & Delta */}
          <div className="col-span-6 space-y-2">
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
              <div className="mt-2 h-2 bg-white/10 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-100"
                  style={{ width: `${telemetry.rpm ? Math.min(100, (telemetry.rpm / 8000) * 100) : 0}%` }}
                />
              </div>
            </div>

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
                    <><Minus className="w-6 h-6" />--.---</>
                  )}
                </div>
              </div>
            </div>

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

          {/* Fuel & Inputs */}
          <div className="col-span-4 space-y-2">
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
              <div className="mt-2 h-2 bg-white/10 overflow-hidden">
                <div 
                  className={`h-full transition-all ${
                    telemetry.lapsRemaining !== null && telemetry.lapsRemaining < 3 ? 'bg-red-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${telemetry.fuel ? Math.min(100, (telemetry.fuel / 20) * 100) : 0}%` }}
                />
              </div>
            </div>

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

        {/* AI Crew Stream */}
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
          <div className="p-2 space-y-1 max-h-24 overflow-y-auto">
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
              <div className="text-xs text-white/30 italic px-2 py-1">Monitoring...</div>
            )}
          </div>
        </div>

        {/* Quick Access */}
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
          <div className="text-[10px] text-white/20">Live Cockpit</div>
        </div>
      </div>
    </div>
  );
}
