
import { useEffect, useState } from 'react';
import { useRelay } from '../../hooks/useRelay';
import { useEngineer } from '../../hooks/useEngineer';
import { useVoice } from '../../hooks/useVoice';
import { useLiveBehavioral, getBehavioralGrade } from '../../hooks/useLiveBehavioral';
// useRaceSimulation removed - using live data only
import { 
  Volume2, VolumeX, Gauge, Fuel, Flag, Clock, 
  TrendingUp, TrendingDown, Minus, MapPin,
  AlertTriangle, CircleDot, Wrench, Activity
} from 'lucide-react';
import { TrackMap } from '../../components/TrackMapRive';
import { getTrackId } from '../../data/tracks';

/**
 * DriverCockpit - Glanceable Second Monitor / iPad View
 * Styled to match Crew pages with sidebars, cards, and panels
 */

export function DriverCockpit() {
  const { status, telemetry: realTelemetry, session } = useRelay();
  const { messages: engineerMessages, criticalMessages } = useEngineer();
  const { isEnabled: voiceEnabled, toggleVoice, speak } = useVoice();
  const { metrics: behavioralMetrics } = useLiveBehavioral({ 
    runId: 'live',
    enabled: status === 'in_session' || status === 'connected'
  });

  // LIVE DATA ONLY - No demo fallback
  const isConnected = status === 'connected' || status === 'in_session';

  // Format lap time helper
  const formatLapTime = (seconds: number | null): string => {
    if (!seconds || seconds <= 0) return '--:--.---';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return mins > 0 ? `${mins}:${secs.padStart(6, '0')}` : secs;
  };

  const strat = realTelemetry.strategy;
  const gapAheadStr = strat.gapToCarAhead > 0 ? `+${strat.gapToCarAhead.toFixed(1)}s` : '--';
  const fuelLapsStr = strat.fuelLapsRemaining != null ? String(strat.fuelLapsRemaining) : '--';
  const hasDamage = strat.damageAero > 0.05 || strat.damageEngine > 0.05;

  const activeTelemetry = {
    ...realTelemetry,
    carPosition: realTelemetry.trackPosition !== null ? { x: 0, y: 0, trackPercentage: realTelemetry.trackPosition } : undefined,
    position: realTelemetry.position || 0,
    delta: realTelemetry.delta || 0,
    fuel: realTelemetry.fuel || 0,
    lapsRemaining: realTelemetry.lapsRemaining || 0,
    lastLap: formatLapTime(realTelemetry.lastLap),
    bestLap: formatLapTime(realTelemetry.bestLap),
    gap: gapAheadStr
  };

  useEffect(() => {
    if (voiceEnabled && criticalMessages.length > 0) {
      criticalMessages.forEach(msg => speak(msg));
    }
  }, [voiceEnabled, criticalMessages, speak]);

  // Use trackId directly from session when available (iRacing numeric ID)
  // Fall back to name-based lookup if trackId not provided
  const trackId = session?.trackId 
    ? String(session.trackId) 
    : session?.trackName 
      ? getTrackId(session.trackName) 
      : 'daytona';

  // Heatmap data will come from live telemetry when available
  const [heatmapData] = useState<{ speed: number }[]>([]);

  const DeltaIcon = activeTelemetry.delta < 0 ? TrendingUp : activeTelemetry.delta > 0 ? TrendingDown : Minus;
  const deltaColor = activeTelemetry.delta < 0 ? 'text-emerald-400' : activeTelemetry.delta > 0 ? 'text-red-400' : 'text-white/50';
  const positionLabel = activeTelemetry.position > 0 ? `P${activeTelemetry.position}` : 'P--';
  const sortedLiveCars = [...(realTelemetry.otherCars || [])].sort((a, b) => (a.position || 999) - (b.position || 999));
  const mapCars = sortedLiveCars.filter(o => typeof o.trackPercentage === 'number' && o.trackPercentage >= 0 && o.trackPercentage <= 1);
  const inPitCount = sortedLiveCars.filter(c => !!c.inPit).length;
  const unknownPositionCount = sortedLiveCars.filter(c => !c.position || c.position <= 0).length;

  return (
    <div className="h-[calc(100vh-9rem)] flex relative bg-[#0a0a0a] overflow-hidden">
      
      {/* BUILD IDENTIFIER - Remove when page is finalized */}
      <div className="fixed bottom-2 right-2 z-50 px-2 py-1 bg-black/80 border border-white/10 rounded text-[9px] font-mono text-white/40">
        COCKPIT-v1.0
      </div>
      
      {/* Background Video - Left Side of Page */}
      <div className="absolute left-0 top-0 bottom-0 w-64 overflow-hidden pointer-events-none z-[1]">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-70"
        >
          <source src="/videos/driver-bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0a0a0a]" />
      </div>
      
      {/* Background Video - Right Side of Page */}
      <div className="absolute right-0 top-0 bottom-0 w-72 overflow-hidden pointer-events-none z-[1]">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-70"
        >
          <source src="/videos/driver-bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#0a0a0a]" />
      </div>

      {/* Left Sidebar - Race Info */}
      <div className="w-64 border-r border-white/[0.08] bg-[#111111]/60 backdrop-blur-xl flex flex-col flex-shrink-0 overflow-hidden z-10">
        
        {/* Header */}
        <div className="p-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/[0.04] border border-white/[0.08] rounded flex items-center justify-center">
              <MapPin className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white/90" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Track Map
              </h2>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Live Position</p>
            </div>
          </div>
        </div>

        {/* Position Card */}
        <div className="p-4 border-b border-white/[0.06]">
          <h3 className="text-[10px] uppercase tracking-[0.15em] text-emerald-400 mb-3 flex items-center gap-2">
            <Flag className="w-3 h-3" />Race Position
            <span className="text-white/20 ml-auto">Live</span>
          </h3>
          <div className="bg-white/[0.03] rounded p-4 border border-white/[0.08] backdrop-blur-sm">
            <div className="text-5xl font-bold text-white/90 font-mono">
              {positionLabel}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <DeltaIcon className={`w-4 h-4 ${deltaColor}`} />
              <span className={`text-sm font-mono ${deltaColor}`}>
                {activeTelemetry.delta > 0 ? '+' : ''}{activeTelemetry.delta.toFixed(2)}s
              </span>
              <span className="text-[10px] text-white/30 uppercase">to best</span>
            </div>
          </div>
        </div>

        {/* Lap Times */}
        <div className="p-4 border-b border-white/[0.06]">
          <h3 className="text-[10px] uppercase tracking-[0.15em] text-emerald-400 mb-3 flex items-center gap-2">
            <Clock className="w-3 h-3" />Lap Times
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs bg-white/[0.03] rounded p-3 border border-white/[0.08] backdrop-blur-sm">
              <span className="text-white/50">Last Lap</span>
              <span className="text-white/90 font-mono">{activeTelemetry.lastLap}</span>
            </div>
            <div className="flex items-center justify-between text-xs bg-white/[0.03] rounded p-3 border border-white/[0.08] backdrop-blur-sm">
              <span className="text-white/50">Best Lap</span>
              <span className="text-emerald-400 font-mono">{activeTelemetry.bestLap}</span>
            </div>
          </div>
        </div>

        {/* Fuel & Gaps */}
        <div className="p-4 border-b border-white/[0.06]">
          <h3 className="text-[10px] uppercase tracking-[0.15em] text-emerald-400 mb-3 flex items-center gap-2">
            <Fuel className="w-3 h-3" />Fuel & Gaps
          </h3>
          <div className="space-y-2 bg-white/[0.03] rounded p-3 border border-white/[0.08] backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/40">Fuel</span>
              <span className="text-white/80 font-mono">{activeTelemetry.fuel?.toFixed(1)}L</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/40">Fuel Laps</span>
              <span className={`font-mono ${strat.fuelLapsRemaining != null && strat.fuelLapsRemaining < 3 ? 'text-red-400' : 'text-white/80'}`}>{fuelLapsStr}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/40">Gap Ahead</span>
              <span className="text-white/80 font-mono">{gapAheadStr}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/40">Gap to Leader</span>
              <span className="text-white/80 font-mono">{strat.gapToLeader > 0 ? `+${strat.gapToLeader.toFixed(1)}s` : '--'}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/40">Pit Stops</span>
              <span className="text-white/80 font-mono">{strat.pitStops}</span>
            </div>
          </div>
        </div>

        {/* Tire Wear */}
        <div className="p-4 border-b border-white/[0.06]">
          <h3 className="text-[10px] uppercase tracking-[0.15em] text-emerald-400 mb-3 flex items-center gap-2">
            <CircleDot className="w-3 h-3" />Tires
            <span className="text-white/30 ml-auto">Stint L{strat.tireStintLaps}</span>
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {(['fl', 'fr', 'rl', 'rr'] as const).map((corner) => {
              const wear = strat.tireWear[corner];
              const pct = Math.round(wear * 100);
              const color = wear > 0.6 ? 'bg-emerald-500' : wear > 0.3 ? 'bg-yellow-500' : 'bg-red-500';
              const label = corner === 'fl' ? 'FL' : corner === 'fr' ? 'FR' : corner === 'rl' ? 'RL' : 'RR';
              const temps = strat.tireTemps?.[corner];
              const avgTemp = temps ? Math.round(((temps.l || 0) + (temps.m || 0) + (temps.r || 0)) / 3) : null;
              const tempColor = avgTemp === null ? 'text-white/30'
                : avgTemp > 110 ? 'text-red-400'
                : avgTemp > 95 ? 'text-yellow-400'
                : avgTemp < 60 ? 'text-blue-400'
                : 'text-white/50';
              return (
                <div key={corner} className="bg-white/[0.03] rounded p-2 border border-white/[0.08]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-white/50 font-mono">{label}</span>
                    <span className="text-[10px] text-white/70 font-mono">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                  {avgTemp !== null && (
                    <div className={`text-[9px] font-mono mt-1 text-right ${tempColor}`}>{avgTemp}°C</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Technique Panel */}
        {behavioralMetrics && (
          <div className="p-4 border-b border-white/[0.06]">
            <h3 className="text-[10px] uppercase tracking-[0.15em] text-cyan-400 mb-3 flex items-center gap-2">
              <Activity className="w-3 h-3" />Technique
              <span className="text-white/20 ml-auto">
                {behavioralMetrics.confidence >= 80 ? '●' : behavioralMetrics.confidence >= 50 ? '◐' : '○'}
              </span>
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'bsi', label: 'Brake', value: behavioralMetrics.behavioral.bsi },
                { key: 'tci', label: 'Throttle', value: behavioralMetrics.behavioral.tci },
                { key: 'cpi2', label: 'Corner', value: behavioralMetrics.behavioral.cpi2 },
                { key: 'rci', label: 'Rhythm', value: behavioralMetrics.behavioral.rci },
              ].map(({ key, label, value }) => {
                const { grade, color } = getBehavioralGrade(value);
                return (
                  <div key={key} className="bg-white/[0.03] rounded p-2 border border-white/[0.08]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-white/50">{label}</span>
                      <span className={`text-sm font-bold font-mono ${color}`}>{grade}</span>
                    </div>
                    <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden mt-1">
                      <div 
                        className={`h-full rounded-full ${value >= 80 ? 'bg-emerald-500' : value >= 60 ? 'bg-cyan-500' : value >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {behavioralMetrics.coaching.length > 0 && (
              <div className="mt-2 text-[10px] text-cyan-300/70 bg-cyan-500/10 rounded p-2 border border-cyan-500/20">
                💡 {behavioralMetrics.coaching[0]}
              </div>
            )}
          </div>
        )}

        {/* Damage & Engine */}
        <div className="p-4 flex-1">
          {hasDamage ? (
            <>
              <h3 className="text-[10px] uppercase tracking-[0.15em] text-red-400 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-3 h-3" />Damage
              </h3>
              <div className="space-y-2 bg-red-500/[0.05] rounded p-3 border border-red-500/20">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/50">Aero</span>
                  <span className={`font-mono ${strat.damageAero > 0.3 ? 'text-red-400' : strat.damageAero > 0.05 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                    {strat.damageAero > 0.05 ? `${Math.round(strat.damageAero * 100)}%` : 'OK'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/50">Engine</span>
                  <span className={`font-mono ${strat.damageEngine > 0.3 ? 'text-red-400' : strat.damageEngine > 0.05 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                    {strat.damageEngine > 0.05 ? `${Math.round(strat.damageEngine * 100)}%` : 'OK'}
                  </span>
                </div>
              </div>
              {strat.engine && (
                <div className="mt-2 space-y-1 bg-white/[0.02] rounded p-2 border border-white/[0.06]">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-white/30">Oil</span>
                    <span className={`font-mono ${strat.engine.oilTemp > 130 ? 'text-red-400' : strat.engine.oilTemp > 110 ? 'text-yellow-400' : 'text-white/50'}`}>{Math.round(strat.engine.oilTemp)}°C</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-white/30">Water</span>
                    <span className={`font-mono ${strat.engine.waterTemp > 110 ? 'text-red-400' : strat.engine.waterTemp > 100 ? 'text-yellow-400' : 'text-white/50'}`}>{Math.round(strat.engine.waterTemp)}°C</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <h3 className="text-[10px] uppercase tracking-[0.15em] text-emerald-400 mb-3 flex items-center gap-2">
                <Wrench className="w-3 h-3" />Car Status
              </h3>
              <div className="bg-white/[0.03] rounded p-3 border border-white/[0.08] backdrop-blur-sm">
                <div className="flex items-center gap-2 text-xs text-emerald-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  No damage detected
                </div>
                {strat.engine && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-white/30">Oil</span>
                      <span className={`font-mono ${strat.engine.oilTemp > 130 ? 'text-red-400' : strat.engine.oilTemp > 110 ? 'text-yellow-400' : 'text-white/50'}`}>{Math.round(strat.engine.oilTemp)}°C</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-white/30">Water</span>
                      <span className={`font-mono ${strat.engine.waterTemp > 110 ? 'text-red-400' : strat.engine.waterTemp > 100 ? 'text-yellow-400' : 'text-white/50'}`}>{Math.round(strat.engine.waterTemp)}°C</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-white/30">Voltage</span>
                      <span className={`font-mono ${strat.engine.voltage < 12 ? 'text-yellow-400' : 'text-white/50'}`}>{strat.engine.voltage.toFixed(1)}V</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Content - Track Map */}
      <div className="flex-1 flex flex-col relative">
        
        {/* Top Bar */}
        <div className="h-12 border-b border-white/[0.06] bg-[#0e0e0e]/60 backdrop-blur-xl flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm text-white/70">{session?.trackName || 'No Track'}</span>
            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${isConnected ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-white/40 bg-white/[0.04] border-white/[0.06]'}`}>
              {isConnected ? 'Live' : 'Offline'}
            </span>
            {isConnected && (
              <span className="text-[10px] text-white/45 font-mono">
                Cars {sortedLiveCars.length} • Pit {inPitCount} • Unknown {unknownPositionCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleVoice}
              className={`px-3 py-1.5 text-xs uppercase tracking-wider transition-all duration-200 rounded flex items-center gap-2 ${
                voiceEnabled 
                  ? 'bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/30' 
                  : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04] border border-white/[0.06]'
              }`}
            >
              {voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              Voice
            </button>
          </div>
        </div>

        {/* Track Map Area */}
        <div className="flex-1 relative">
          {/* Ok Box Box Pill Logo - Behind Track - stripes only */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
            <div className="flex gap-2 transform scale-[8]">
              <div className="w-2 h-7 bg-white rounded-full transform rotate-12" />
              <div className="w-2 h-7 bg-[#3b82f6] rounded-full transform rotate-12" />
              <div className="w-2 h-7 bg-[#f97316] rounded-full transform rotate-12" />
            </div>
          </div>

          <TrackMap
            trackId={trackId}
            carPosition={activeTelemetry.carPosition}
            otherCars={mapCars
              .map(o => ({
                x: 0,
                y: 0,
                trackPercentage: o.trackPercentage,
                carNumber: o.carNumber,
                color: o.color,
                driverName: o.driverName,
                position: o.position,
                isPlayer: o.isPlayer,
                inPit: o.inPit,
              }))}
            telemetry={heatmapData}
            className="w-full h-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] via-transparent to-transparent pointer-events-none" />
          
          {/* Speed Overlay */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
            <div className="bg-[#0e0e0e]/80 backdrop-blur-xl border border-white/[0.08] rounded-lg px-6 py-3 flex items-baseline gap-2">
              <Gauge className="w-5 h-5 text-white/40" />
              <span className="font-mono text-4xl font-bold text-white/90">
                {Math.round(activeTelemetry.speed ?? 0)}
              </span>
              <span className="text-sm text-[#f97316] font-semibold">MPH</span>
            </div>
          </div>

          {/* Bottom Left Controls */}
          <div className="absolute bottom-4 left-4">
            <div className="bg-[#0e0e0e]/80 backdrop-blur-xl border border-white/[0.08] rounded-lg p-1.5 flex items-center gap-1">
              <button
                onClick={toggleVoice}
                className={`p-2 rounded transition-all ${
                  voiceEnabled 
                    ? 'bg-[#f97316]/20 text-[#f97316]' 
                    : 'text-white/40 hover:text-white/70 hover:bg-white/[0.06]'
                }`}
                title={voiceEnabled ? 'Mute Voice' : 'Enable Voice'}
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <div className="w-px h-5 bg-white/[0.08]" />
              <button
                className="p-2 rounded text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all"
                title="Settings"
              >
                <MapPin className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Leaderboard */}
      <div className="w-72 border-l border-white/[0.08] bg-[#111111]/60 backdrop-blur-xl flex flex-col z-10">
        
        {/* Header */}
        <div className="p-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/[0.04] border border-white/[0.08] rounded flex items-center justify-center">
              <Flag className="w-5 h-5 text-white/70" />
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white/90" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Leaderboard
              </h2>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Live Standings</p>
            </div>
          </div>
        </div>

        {/* Leaderboard List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* Show real data from otherCars or placeholder when no data */}
          {sortedLiveCars.length > 0 ? (
            sortedLiveCars.map((car, idx) => {
              const displayPosition = typeof car.position === 'number' && car.position > 0 ? car.position : null;
              return (
              <div 
                key={`${idx}-${car.carNumber || 'car'}`}
                className={`flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.04] ${
                  car.isPlayer ? 'bg-cyan-500/10 border-l-2 border-l-cyan-500' : 'hover:bg-white/[0.02]'
                }`}
              >
                <div className={`w-6 text-center font-mono text-sm font-bold ${
                  displayPosition === 1 ? 'text-yellow-400' : 
                  displayPosition === 2 ? 'text-gray-300' : 
                  displayPosition === 3 ? 'text-amber-600' : 'text-white/50'
                }`}>
                  {displayPosition ?? '--'}
                </div>
                <div 
                  className="w-8 h-6 rounded text-[10px] font-mono font-bold flex items-center justify-center text-white"
                  style={{ backgroundColor: car.color || '#374151' }}
                >
                  {car.carNumber || '-'}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-xs truncate ${car.isPlayer ? 'text-white font-semibold' : 'text-white/70'}`}>
                    {car.driverName || `Car ${car.carNumber}`}
                  </span>
                </div>
                <div className={`text-xs font-mono ${car.isPlayer ? 'text-cyan-400' : 'text-white/50'}`}>
                  {car.gap || '--'}
                </div>
              </div>
              );
            })
          ) : (
            <div className="flex items-center justify-center h-full text-white/30 text-xs p-4 text-center">
              {status === 'in_session' ? 'Waiting for standings data...' : 'Start iRacing session for live standings'}
            </div>
          )}
        </div>

        {/* Team Radio Transcripts - F1 Style */}
        <div className="border-t border-white/[0.06] flex flex-col">
          <div className="px-3 py-2 border-b border-white/[0.06] flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${criticalMessages.length > 0 ? 'bg-red-500 animate-pulse' : engineerMessages.length > 0 ? 'bg-green-500' : 'bg-white/20'}`} />
            <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">Team Radio</span>
          </div>
          <div className="p-2 space-y-2 max-h-32 overflow-hidden">
            {engineerMessages.length > 0 ? (
              engineerMessages.slice(-3).reverse().map((msg, i) => {
                const roleLabel = msg.domain === 'racecraft' ? 'Spotter' : msg.domain === 'consistency' || msg.domain === 'development' ? 'Analyst' : 'Engineer';
                const roleColor = msg.domain === 'racecraft' ? 'text-blue-400' : msg.domain === 'consistency' || msg.domain === 'development' ? 'text-purple-400' : 'text-[#f97316]';
                const bgColor = i === 0 ? (msg.urgency === 'critical' ? 'bg-red-500/10 border-l-2 border-l-red-500' : 'bg-[#f97316]/10 border-l-2 border-l-[#f97316]') : 'bg-white/[0.02] border-l-2 border-l-white/20';
                return (
                  <div key={i} className={`${bgColor} rounded-r p-2 ${i > 0 ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[9px] uppercase tracking-wider font-bold ${i === 0 ? roleColor : 'text-white/40'}`}>{roleLabel}</span>
                    </div>
                    <p className={`text-[11px] leading-tight ${i === 0 ? 'text-white/90' : 'text-white/60'}`}>"{msg.content}"</p>
                  </div>
                );
              })
            ) : (
              <div className="flex items-center justify-center h-16 text-white/20 text-xs">
                {isConnected ? 'Listening...' : 'Start session for team radio'}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
