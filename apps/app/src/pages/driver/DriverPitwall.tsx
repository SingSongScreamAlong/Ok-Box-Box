import { useRelay } from '../../hooks/useRelay';
import { 
  Clock, 
  Fuel, 
  Gauge, 
  Flag, 
  TrendingUp, 
  TrendingDown,
  Minus,
  ThermometerSun,
  Wind
} from 'lucide-react';

export function DriverPitwall() {
  const { status, telemetry, session } = useRelay();

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return '--:--.---';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${mins}:${secs.padStart(6, '0')}`;
  };

  const getDeltaIcon = () => {
    if (telemetry.delta === null) return <Minus className="w-4 h-4 text-white/40" />;
    if (telemetry.delta < 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    return <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  const getDeltaColor = () => {
    if (telemetry.delta === null) return 'text-white/40';
    return telemetry.delta < 0 ? 'text-green-500' : 'text-red-500';
  };

  if (status === 'disconnected') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-red-500/20 border border-red-500/30 flex items-center justify-center">
            <Gauge className="w-8 h-8 text-red-500" />
          </div>
          <h2 
            className="text-xl uppercase tracking-wider font-bold mb-2"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Relay Not Connected
          </h2>
          <p className="text-sm text-white/50 max-w-md mx-auto">
            Connect the Ok, Box Box Relay application on your racing PC to view live telemetry data.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'connecting') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center animate-pulse">
            <Gauge className="w-8 h-8 text-yellow-500" />
          </div>
          <h2 
            className="text-xl uppercase tracking-wider font-bold mb-2"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Connecting to Relay...
          </h2>
          <p className="text-sm text-white/50">Establishing connection</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 
            className="text-2xl font-bold uppercase tracking-wider"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Driver Pitwall
          </h1>
          <p className="text-sm text-white/50 mt-1">Live telemetry & timing data</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/30">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs uppercase tracking-wider text-green-400">
            {status === 'in_session' ? 'In Session' : 'Connected'}
          </span>
        </div>
      </div>

      {/* Session Info */}
      {session.trackName && (
        <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Flag className="w-5 h-5 text-[#f97316]" />
              <div>
                <div className="text-sm font-semibold">{session.trackName}</div>
                <div className="text-xs text-white/50 uppercase">{session.sessionType}</div>
              </div>
            </div>
            {session.timeRemaining !== null && (
              <div className="text-right">
                <div className="text-xs text-white/40 uppercase">Time Remaining</div>
                <div className="text-lg font-mono">{Math.floor(session.timeRemaining / 60)}:{(session.timeRemaining % 60).toString().padStart(2, '0')}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Telemetry Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Current Lap */}
        <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-white/40">Current Lap</span>
            <Clock className="w-4 h-4 text-white/20" />
          </div>
          <div className="text-3xl font-mono font-bold">
            {formatTime(telemetry.lapTime)}
          </div>
        </div>

        {/* Last Lap */}
        <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-white/40">Last Lap</span>
            <Clock className="w-4 h-4 text-white/20" />
          </div>
          <div className="text-3xl font-mono font-bold">
            {formatTime(telemetry.lastLap)}
          </div>
        </div>

        {/* Best Lap */}
        <div className="bg-black/40 backdrop-blur-sm border border-[#8b5cf6]/30 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-[#8b5cf6]">Best Lap</span>
            <Clock className="w-4 h-4 text-[#8b5cf6]" />
          </div>
          <div className="text-3xl font-mono font-bold text-[#8b5cf6]">
            {formatTime(telemetry.bestLap)}
          </div>
        </div>

        {/* Delta */}
        <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-white/40">Delta</span>
            {getDeltaIcon()}
          </div>
          <div className={`text-3xl font-mono font-bold ${getDeltaColor()}`}>
            {telemetry.delta !== null 
              ? `${telemetry.delta > 0 ? '+' : ''}${telemetry.delta.toFixed(3)}`
              : '--'
            }
          </div>
        </div>
      </div>

      {/* Fuel & Position Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Fuel Panel */}
        <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-6 md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Fuel className="w-5 h-5 text-[#f97316]" />
            <span 
              className="text-xs uppercase tracking-[0.15em] text-[#f97316]"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              Fuel
            </span>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Remaining</div>
              <div className="text-2xl font-mono font-bold">
                {telemetry.fuel !== null ? `${telemetry.fuel.toFixed(1)}L` : '--'}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Per Lap</div>
              <div className="text-2xl font-mono font-bold">
                {telemetry.fuelPerLap !== null ? `${telemetry.fuelPerLap.toFixed(2)}L` : '--'}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Laps Left</div>
              <div className="text-2xl font-mono font-bold">
                {telemetry.lapsRemaining !== null ? telemetry.lapsRemaining : '--'}
              </div>
            </div>
          </div>
        </div>

        {/* Position Panel */}
        <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Gauge className="w-5 h-5 text-[#3b82f6]" />
            <span 
              className="text-xs uppercase tracking-[0.15em] text-[#3b82f6]"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              Position
            </span>
          </div>
          <div className="text-center">
            <div className="text-5xl font-mono font-bold">
              {telemetry.position !== null ? `P${telemetry.position}` : '--'}
            </div>
            <div className="text-sm text-white/50 mt-2">
              Lap {telemetry.lap !== null ? telemetry.lap : '--'}
            </div>
          </div>
        </div>
      </div>

      {/* Live Data Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-4">
          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Speed</div>
          <div className="text-xl font-mono">
            {telemetry.speed !== null ? `${Math.round(telemetry.speed)} mph` : '--'}
          </div>
        </div>
        <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-4">
          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Gear</div>
          <div className="text-xl font-mono">
            {telemetry.gear !== null ? telemetry.gear : '--'}
          </div>
        </div>
        <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-4">
          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">RPM</div>
          <div className="text-xl font-mono">
            {telemetry.rpm !== null ? Math.round(telemetry.rpm) : '--'}
          </div>
        </div>
        <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-4">
          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Throttle</div>
          <div className="text-xl font-mono">
            {telemetry.throttle !== null ? `${Math.round(telemetry.throttle)}%` : '--'}
          </div>
        </div>
        <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-4">
          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Brake</div>
          <div className="text-xl font-mono">
            {telemetry.brake !== null ? `${Math.round(telemetry.brake)}%` : '--'}
          </div>
        </div>
      </div>

      {/* Placeholder Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-6">
          <div className="flex items-center gap-2 mb-4">
            <ThermometerSun className="w-5 h-5 text-white/40" />
            <span className="text-xs uppercase tracking-[0.15em] text-white/40">Tire Temps</span>
          </div>
          <div className="text-center py-8 text-white/30 text-sm">
            Coming Soon
          </div>
        </div>
        <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Wind className="w-5 h-5 text-white/40" />
            <span className="text-xs uppercase tracking-[0.15em] text-white/40">Weather</span>
          </div>
          <div className="text-center py-8 text-white/30 text-sm">
            Coming Soon
          </div>
        </div>
      </div>
    </div>
  );
}
