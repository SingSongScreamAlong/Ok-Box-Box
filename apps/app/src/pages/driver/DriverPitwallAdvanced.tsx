import { useRelay } from '../../hooks/useRelay';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft,
  Radio,
  Fuel,
  Clock,
  Gauge,
  Thermometer,
  Flag,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Activity,
  Zap
} from 'lucide-react';

export function DriverPitwallAdvanced() {
  const { status, telemetry, session } = useRelay();

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return '--:--.---';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${mins}:${secs.padStart(6, '0')}`;
  };

  // Mock tire data (would come from telemetry in production)
  const tireData = {
    fl: { temp: 185, wear: 92 },
    fr: { temp: 188, wear: 89 },
    rl: { temp: 178, wear: 94 },
    rr: { temp: 182, wear: 91 },
  };

  // Mock weather data
  const weatherData = {
    trackTemp: 42,
    airTemp: 24,
    humidity: 65,
    windSpeed: 12,
    windDir: 'NE',
  };

  // Mock gap data
  const gapData = {
    ahead: 2.341,
    behind: 1.892,
    toLeader: 15.234,
  };

  if (status === 'disconnected' || status === 'connecting') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link to="/driver/pitwall" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Pitwall
          </Link>
        </div>
        <div className="bg-black/40 backdrop-blur-sm border border-yellow-500/30 p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
            <Radio className="w-10 h-10 text-yellow-500" />
          </div>
          <h2 className="text-xl uppercase tracking-wider font-bold mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            Advanced View Requires Connection
          </h2>
          <p className="text-sm text-white/50">Connect to iRacing to access detailed telemetry panels</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/driver/pitwall" className="p-2 border border-white/20 hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Advanced Pitwall
              </h1>
              <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider bg-purple-500/20 border border-purple-500/30 text-purple-400">
                Alpha
              </span>
            </div>
            <p className="text-xs text-white/40 mt-1">BlackBox-level telemetry • Power user view</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-500/30">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs uppercase tracking-wider text-green-400">Live</span>
        </div>
      </div>

      {/* Session Banner */}
      {session.trackName && (
        <div className="bg-[#f97316]/10 border border-[#f97316]/30 p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Flag className="w-4 h-4 text-[#f97316]" />
            <span className="text-sm font-semibold">{session.trackName}</span>
            <span className="text-xs text-white/50 uppercase">{session.sessionType}</span>
          </div>
          <div className="flex items-center gap-6 text-sm font-mono">
            <div>P{telemetry.position || '--'}</div>
            <div>Lap {telemetry.lap || '--'}</div>
          </div>
        </div>
      )}

      {/* Main Grid - Dense Layout */}
      <div className="grid grid-cols-12 gap-3">
        {/* Timing Panel - 4 cols */}
        <div className="col-span-4 bg-black/40 backdrop-blur-sm border border-white/10">
          <div className="p-3 border-b border-white/10 flex items-center gap-2">
            <Clock className="w-4 h-4 text-white/40" />
            <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">Timing</span>
          </div>
          <div className="p-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[9px] uppercase tracking-wider text-white/30">Last Lap</div>
                <div className="text-lg font-mono font-bold">{formatTime(telemetry.lastLap)}</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-white/30">Best Lap</div>
                <div className="text-lg font-mono font-bold text-purple-400">{formatTime(telemetry.bestLap)}</div>
              </div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wider text-white/30">Delta to Best</div>
              <div className={`text-2xl font-mono font-bold flex items-center gap-1 ${
                telemetry.delta === null ? 'text-white/40' :
                telemetry.delta < 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {telemetry.delta !== null ? (
                  <>
                    {telemetry.delta < 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    {telemetry.delta > 0 ? '+' : ''}{telemetry.delta.toFixed(3)}s
                  </>
                ) : (
                  <>
                    <Minus className="w-5 h-5" />
                    --.---
                  </>
                )}
              </div>
            </div>
            <div className="pt-2 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-[9px] uppercase tracking-wider text-white/30">Gap Ahead</div>
                <div className="text-sm font-mono text-yellow-400">+{gapData.ahead.toFixed(3)}</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-white/30">Gap Behind</div>
                <div className="text-sm font-mono text-blue-400">-{gapData.behind.toFixed(3)}</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-white/30">To Leader</div>
                <div className="text-sm font-mono text-white/60">+{gapData.toLeader.toFixed(1)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Fuel Panel - 4 cols */}
        <div className="col-span-4 bg-black/40 backdrop-blur-sm border border-white/10">
          <div className="p-3 border-b border-white/10 flex items-center gap-2">
            <Fuel className="w-4 h-4 text-white/40" />
            <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">Fuel</span>
          </div>
          <div className="p-3 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-[9px] uppercase tracking-wider text-white/30">Remaining</div>
                <div className={`text-lg font-mono font-bold ${
                  telemetry.fuel !== null && telemetry.fuel < 5 ? 'text-red-400' : ''
                }`}>
                  {telemetry.fuel !== null ? `${telemetry.fuel.toFixed(1)}L` : '--'}
                </div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-white/30">Per Lap</div>
                <div className="text-lg font-mono font-bold">
                  {telemetry.fuelPerLap !== null ? `${telemetry.fuelPerLap.toFixed(2)}L` : '--'}
                </div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-white/30">Laps Left</div>
                <div className={`text-lg font-mono font-bold ${
                  telemetry.lapsRemaining !== null && telemetry.lapsRemaining < 3 ? 'text-red-400' : ''
                }`}>
                  {telemetry.lapsRemaining ?? '--'}
                </div>
              </div>
            </div>
            {/* Fuel Bar */}
            <div>
              <div className="h-3 bg-white/10 overflow-hidden">
                <div 
                  className={`h-full transition-all ${
                    telemetry.fuel !== null && telemetry.fuel < 5 ? 'bg-red-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${telemetry.fuel !== null ? Math.min(100, (telemetry.fuel / 18) * 100) : 0}%` }}
                />
              </div>
            </div>
            <div className="pt-2 border-t border-white/10">
              <div className="text-[9px] uppercase tracking-wider text-white/30 mb-1">Pit Window</div>
              <div className="text-sm text-white/60">
                {telemetry.lapsRemaining !== null && telemetry.lapsRemaining < 5 
                  ? <span className="text-yellow-400">Consider pitting within {telemetry.lapsRemaining} laps</span>
                  : 'No immediate pit required'}
              </div>
            </div>
          </div>
        </div>

        {/* Speed/RPM Panel - 4 cols */}
        <div className="col-span-4 bg-black/40 backdrop-blur-sm border border-white/10">
          <div className="p-3 border-b border-white/10 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-white/40" />
            <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">Performance</span>
          </div>
          <div className="p-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[9px] uppercase tracking-wider text-white/30">Speed</div>
                <div className="text-2xl font-mono font-bold">
                  {telemetry.speed !== null ? Math.round(telemetry.speed) : '--'}
                  <span className="text-sm text-white/40 ml-1">mph</span>
                </div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-white/30">Gear</div>
                <div className="text-2xl font-mono font-bold">
                  {telemetry.gear ?? '--'}
                </div>
              </div>
            </div>
            {/* RPM Bar */}
            <div>
              <div className="text-[9px] uppercase tracking-wider text-white/30 mb-1">RPM</div>
              <div className="h-4 bg-white/10 overflow-hidden flex">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all"
                  style={{ width: `${telemetry.rpm !== null ? Math.min(100, (telemetry.rpm / 8000) * 100) : 0}%` }}
                />
              </div>
              <div className="text-right text-xs font-mono text-white/40 mt-1">
                {telemetry.rpm !== null ? Math.round(telemetry.rpm) : '--'} / 8000
              </div>
            </div>
            {/* Throttle/Brake */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
              <div>
                <div className="text-[9px] uppercase tracking-wider text-white/30 mb-1">Throttle</div>
                <div className="h-2 bg-white/10 overflow-hidden">
                  <div className="h-full bg-green-500" style={{ width: `${telemetry.throttle ?? 0}%` }} />
                </div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-white/30 mb-1">Brake</div>
                <div className="h-2 bg-white/10 overflow-hidden">
                  <div className="h-full bg-red-500" style={{ width: `${telemetry.brake ?? 0}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tire Panel - 6 cols */}
        <div className="col-span-6 bg-black/40 backdrop-blur-sm border border-white/10">
          <div className="p-3 border-b border-white/10 flex items-center gap-2">
            <Activity className="w-4 h-4 text-white/40" />
            <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">Tires</span>
            <span className="text-[9px] text-white/30 ml-auto">Mock Data</span>
          </div>
          <div className="p-3">
            <div className="grid grid-cols-2 gap-4">
              {/* Front */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/5 border border-white/10 p-2 text-center">
                  <div className="text-[9px] uppercase tracking-wider text-white/30">FL</div>
                  <div className="text-lg font-mono font-bold">{tireData.fl.temp}°</div>
                  <div className="text-xs text-white/40">{tireData.fl.wear}%</div>
                </div>
                <div className="bg-white/5 border border-white/10 p-2 text-center">
                  <div className="text-[9px] uppercase tracking-wider text-white/30">FR</div>
                  <div className="text-lg font-mono font-bold">{tireData.fr.temp}°</div>
                  <div className="text-xs text-white/40">{tireData.fr.wear}%</div>
                </div>
              </div>
              {/* Rear */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/5 border border-white/10 p-2 text-center">
                  <div className="text-[9px] uppercase tracking-wider text-white/30">RL</div>
                  <div className="text-lg font-mono font-bold">{tireData.rl.temp}°</div>
                  <div className="text-xs text-white/40">{tireData.rl.wear}%</div>
                </div>
                <div className="bg-white/5 border border-white/10 p-2 text-center">
                  <div className="text-[9px] uppercase tracking-wider text-white/30">RR</div>
                  <div className="text-lg font-mono font-bold">{tireData.rr.temp}°</div>
                  <div className="text-xs text-white/40">{tireData.rr.wear}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Weather Panel - 6 cols */}
        <div className="col-span-6 bg-black/40 backdrop-blur-sm border border-white/10">
          <div className="p-3 border-b border-white/10 flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-white/40" />
            <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">Conditions</span>
            <span className="text-[9px] text-white/30 ml-auto">Mock Data</span>
          </div>
          <div className="p-3">
            <div className="grid grid-cols-5 gap-3 text-center">
              <div>
                <div className="text-[9px] uppercase tracking-wider text-white/30">Track</div>
                <div className="text-lg font-mono font-bold">{weatherData.trackTemp}°C</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-white/30">Air</div>
                <div className="text-lg font-mono font-bold">{weatherData.airTemp}°C</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-white/30">Humidity</div>
                <div className="text-lg font-mono font-bold">{weatherData.humidity}%</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-white/30">Wind</div>
                <div className="text-lg font-mono font-bold">{weatherData.windSpeed}</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-white/30">Dir</div>
                <div className="text-lg font-mono font-bold">{weatherData.windDir}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {telemetry.fuel !== null && telemetry.fuelPerLap !== null && 
       telemetry.fuel / telemetry.fuelPerLap < 3 && (
        <div className="bg-red-500/20 border border-red-500/50 p-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <span className="text-sm font-semibold text-red-400 uppercase tracking-wider">Fuel Critical</span>
            <span className="text-sm text-white/60 ml-3">Box this lap</span>
          </div>
          <Zap className="w-4 h-4 text-red-400 animate-pulse" />
        </div>
      )}

      {/* Footer Note */}
      <div className="text-center text-[10px] text-white/30 uppercase tracking-wider pt-4">
        Advanced View • Some data is simulated • Full telemetry requires iRacing SDK integration
      </div>
    </div>
  );
}
