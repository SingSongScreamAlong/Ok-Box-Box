import { useRef, useEffect, useState, useCallback } from 'react';
import { useRelay } from '../../../hooks/useRelay';
import { useLiveBehavioral, getBehavioralGrade } from '../../../hooks/useLiveBehavioral';
import { usePTT } from '../../../hooks/usePTT';
import { useVoiceQuery } from '../../../hooks/useVoiceQuery';
import type { ChatMessage } from '../../../lib/crewChatService';
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
  ChevronRight,
  CircleDot,
  Wrench,
  Brain,
  Target,
  Timer,
  ChevronDown,
  ChevronUp,
  Activity,
  Gauge,
  Mic,
  Loader2
} from 'lucide-react';
import { TrackMinimap } from '../../../components/TrackMinimap';
import { DriverHUDOverlay } from '../../../components/DriverHUDOverlay';

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
  const { status, telemetry, session, raceIntelligence } = useRelay();
  const { metrics: behavioralMetrics } = useLiveBehavioral({ 
    runId: 'live',
    enabled: status === 'in_session' || status === 'connected'
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const [alerts, setAlerts] = useState<AIAlert[]>([]);
  const [showIntel, setShowIntel] = useState(true);
  const [showBehavioral, setShowBehavioral] = useState(true);

  // PTT voice query
  const voiceChatHistoryRef = useRef<ChatMessage[]>([]);
  const getHistory = useCallback(() => voiceChatHistoryRef.current, []);
  const handleVoiceResponse = useCallback((transcript: string, response: string) => {
    voiceChatHistoryRef.current = [
      ...voiceChatHistoryRef.current.slice(-10),
      { role: 'user', content: transcript },
      { role: 'engineer', content: response },
    ];
  }, []);
  const voiceQuery = useVoiceQuery({ role: 'engineer', getHistory, onResponse: handleVoiceResponse });
  usePTT({
    onPress: () => voiceQuery.startListening(),
    onRelease: () => voiceQuery.stopListening(),
    enabled: true,
  });

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.5;
    }
  }, []);

  // Generate AI alerts based on telemetry
  useEffect(() => {
    const newAlerts: AIAlert[] = [];

    const fuelLaps = telemetry.strategy.fuelLapsRemaining;
    if (fuelLaps !== null && fuelLaps < 2) {
      newAlerts.push({
        id: 'fuel-critical',
        role: 'engineer',
        message: 'BOX NOW — Fuel critical',
        urgency: 'critical',
      });
    } else if (fuelLaps !== null && fuelLaps < 5) {
      newAlerts.push({
        id: 'fuel-warning',
        role: 'engineer',
        message: `Pit window open — ${Math.floor(fuelLaps)} laps fuel`,
        urgency: 'warning',
      });
    }

    if (telemetry.strategy.damageAero > 0.3 || telemetry.strategy.damageEngine > 0.3) {
      newAlerts.push({
        id: 'damage-warning',
        role: 'engineer',
        message: `Damage detected — ${telemetry.strategy.damageAero > 0.3 ? 'Aero' : 'Engine'} ${Math.round(Math.max(telemetry.strategy.damageAero, telemetry.strategy.damageEngine) * 100)}%`,
        urgency: telemetry.strategy.damageAero > 0.6 || telemetry.strategy.damageEngine > 0.6 ? 'critical' : 'warning',
      });
    }

    const minTire = Math.min(telemetry.strategy.tireWear.fl, telemetry.strategy.tireWear.fr, telemetry.strategy.tireWear.rl, telemetry.strategy.tireWear.rr);
    if (minTire < 0.15 && minTire > 0) {
      newAlerts.push({
        id: 'tire-critical',
        role: 'engineer',
        message: 'Tires critical — consider pitting',
        urgency: 'critical',
      });
    } else if (minTire < 0.3 && minTire > 0) {
      newAlerts.push({
        id: 'tire-warning',
        role: 'engineer',
        message: `Tire wear ${Math.round(minTire * 100)}% — manage pace`,
        urgency: 'warning',
      });
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
  }, [telemetry.strategy, telemetry.delta]);

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
            {telemetry.strategy.fuelLapsRemaining !== null && (
              <div className={`flex items-center gap-1 text-xs ${
                telemetry.strategy.fuelLapsRemaining < 3 ? 'text-red-400' : 
                telemetry.strategy.fuelLapsRemaining < 6 ? 'text-yellow-400' : 'text-green-400'
              }`}>
                <Fuel className="w-3 h-3" />
                <span>{telemetry.strategy.fuelLapsRemaining} laps</span>
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
                  style={{ width: `${telemetry.rpm ? Math.min(100, (telemetry.rpm / session.rpmRedline) * 100) : 0}%` }}
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
                  telemetry.strategy.fuelLapsRemaining !== null && telemetry.strategy.fuelLapsRemaining < 3 ? 'text-red-400' : 'text-white/60'
                }`}>
                  {telemetry.strategy.fuelLapsRemaining ?? '--'} laps
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
                    telemetry.strategy.fuelLapsRemaining !== null && telemetry.strategy.fuelLapsRemaining < 3 ? 'bg-red-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${telemetry.fuel ? Math.min(100, (telemetry.fuel / session.fuelTankCapacity) * 100) : 0}%` }}
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
                  <span className="font-mono ml-1">{telemetry.strategy.gapToCarAhead > 0 ? `+${telemetry.strategy.gapToCarAhead.toFixed(1)}s` : '--'}</span>
                </div>
                <div>
                  <span className="text-white/40">Leader:</span>
                  <span className="font-mono ml-1">{telemetry.strategy.gapToLeader > 0 ? `+${telemetry.strategy.gapToLeader.toFixed(1)}s` : '--'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tire Wear & Car Status */}
        <div className="grid grid-cols-12 gap-2">
          {/* Tire Wear */}
          <div className="col-span-6 bg-black/60 border border-white/10 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CircleDot className="w-3 h-3 text-white/40" />
                <span className="text-[10px] uppercase tracking-wider text-white/40">Tires</span>
              </div>
              <span className="text-[10px] text-white/30 font-mono">Stint L{telemetry.strategy.tireStintLaps}</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(['fl', 'fr', 'rl', 'rr'] as const).map((corner) => {
                const wear = telemetry.strategy.tireWear[corner];
                const pct = Math.round(wear * 100);
                const color = wear > 0.6 ? 'bg-green-500' : wear > 0.3 ? 'bg-yellow-500' : 'bg-red-500';
                const label = corner.toUpperCase();
                return (
                  <div key={corner} className="text-center">
                    <div className="text-[10px] text-white/40 font-mono mb-1">{label}</div>
                    <div className="h-12 bg-white/10 relative overflow-hidden">
                      <div className={`absolute bottom-0 left-0 right-0 ${color} transition-all duration-500`} style={{ height: `${pct}%` }} />
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold">{pct}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Damage & Pit */}
          <div className="col-span-3 bg-black/60 border border-white/10 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="w-3 h-3 text-white/40" />
              <span className="text-[10px] uppercase tracking-wider text-white/40">Car</span>
            </div>
            {(telemetry.strategy.damageAero > 0.05 || telemetry.strategy.damageEngine > 0.05) ? (
              <div className="space-y-2">
                {telemetry.strategy.damageAero > 0.05 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40">Aero</span>
                    <span className={`font-mono ${telemetry.strategy.damageAero > 0.3 ? 'text-red-400' : 'text-yellow-400'}`}>
                      {Math.round(telemetry.strategy.damageAero * 100)}%
                    </span>
                  </div>
                )}
                {telemetry.strategy.damageEngine > 0.05 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40">Engine</span>
                    <span className={`font-mono ${telemetry.strategy.damageEngine > 0.3 ? 'text-red-400' : 'text-yellow-400'}`}>
                      {Math.round(telemetry.strategy.damageEngine * 100)}%
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-green-400">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                No damage
              </div>
            )}
            <div className="mt-3 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/40">Pit Stops</span>
                <span className="font-mono text-white/70">{telemetry.strategy.pitStops}</span>
              </div>
            </div>
          </div>

          {/* Engine */}
          <div className="col-span-3 bg-black/60 border border-white/10 p-3">
            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Engine</div>
            {telemetry.strategy.engine ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40">Oil</span>
                  <span className={`font-mono ${telemetry.strategy.engine.oilTemp > 130 ? 'text-red-400' : telemetry.strategy.engine.oilTemp > 110 ? 'text-yellow-400' : 'text-white/70'}`}>
                    {Math.round(telemetry.strategy.engine.oilTemp)}°C
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40">Water</span>
                  <span className={`font-mono ${telemetry.strategy.engine.waterTemp > 110 ? 'text-red-400' : telemetry.strategy.engine.waterTemp > 100 ? 'text-yellow-400' : 'text-white/70'}`}>
                    {Math.round(telemetry.strategy.engine.waterTemp)}°C
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40">Voltage</span>
                  <span className="font-mono text-white/70">{telemetry.strategy.engine.voltage.toFixed(1)}V</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-white/30 italic">No data</div>
            )}
          </div>
        </div>

        {/* Live Behavioral Panel */}
        {behavioralMetrics && (
          <div className="bg-black/60 border border-cyan-500/30">
            <button
              onClick={() => setShowBehavioral(!showBehavioral)}
              className="w-full flex items-center justify-between px-3 py-2 border-b border-cyan-500/20 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-cyan-400" />
                <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-semibold">Technique</span>
                <span className="text-[10px] text-white/30">
                  {behavioralMetrics.confidence >= 80 ? '● High' : behavioralMetrics.confidence >= 50 ? '◐ Med' : '○ Low'}
                </span>
              </div>
              {showBehavioral ? <ChevronUp className="w-3 h-3 text-white/30" /> : <ChevronDown className="w-3 h-3 text-white/30" />}
            </button>

            {showBehavioral && (
              <div className="p-2 space-y-2">
                {/* Behavioral Indices */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { key: 'bsi', label: 'Braking', value: behavioralMetrics.behavioral.bsi },
                    { key: 'tci', label: 'Throttle', value: behavioralMetrics.behavioral.tci },
                    { key: 'cpi2', label: 'Cornering', value: behavioralMetrics.behavioral.cpi2 },
                    { key: 'rci', label: 'Rhythm', value: behavioralMetrics.behavioral.rci },
                  ].map(({ key, label, value }) => {
                    const { grade, color } = getBehavioralGrade(value);
                    return (
                      <div key={key} className="bg-white/5 p-2 text-center">
                        <div className="text-[10px] text-white/40 uppercase">{label}</div>
                        <div className={`text-lg font-bold font-mono ${color}`}>{grade}</div>
                        <div className="text-[10px] text-white/30 font-mono">{Math.round(value)}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Coaching Hints */}
                {behavioralMetrics.coaching.length > 0 && (
                  <div className="space-y-1">
                    {behavioralMetrics.coaching.slice(0, 2).map((hint, i) => (
                      <div key={i} className="flex items-start gap-2 px-2 py-1 bg-cyan-500/10 border-l-2 border-cyan-500 text-xs text-cyan-300">
                        <Target className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>{hint}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Warnings */}
                {behavioralMetrics.warnings.length > 0 && (
                  <div className="space-y-1">
                    {behavioralMetrics.warnings.map((warning, i) => (
                      <div key={i} className="flex items-start gap-2 px-2 py-1 bg-yellow-500/10 border-l-2 border-yellow-500 text-xs text-yellow-300">
                        <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>{warning}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pillars Summary */}
                <div className="grid grid-cols-5 gap-1">
                  {[
                    { label: 'Pace', value: behavioralMetrics.pillars.pace },
                    { label: 'Consist', value: behavioralMetrics.pillars.consistency },
                    { label: 'Tech', value: behavioralMetrics.pillars.technique },
                    { label: 'Safety', value: behavioralMetrics.pillars.safety },
                    { label: 'Reliab', value: behavioralMetrics.pillars.reliability },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center">
                      <div className="text-[8px] text-white/30 uppercase">{label}</div>
                      <div className="h-1 bg-white/10 mt-0.5 overflow-hidden">
                        <div 
                          className={`h-full ${value >= 80 ? 'bg-emerald-500' : value >= 60 ? 'bg-cyan-500' : value >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* V1.1: Segment Insights */}
                {behavioralMetrics.segmentInsights && behavioralMetrics.segmentInsights.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/10">
                    <div className="text-[9px] uppercase tracking-wider text-orange-400/70 mb-1">Where You're Losing Time</div>
                    <div className="space-y-1">
                      {behavioralMetrics.segmentInsights.slice(0, 2).map((insight, i) => (
                        <div key={i} className="flex items-start gap-2 px-2 py-1 bg-orange-500/10 border-l-2 border-orange-500 text-[10px] text-orange-300/80">
                          <span className="font-mono text-orange-400">{insight.sectionType === 'slow_corner' ? '🔄' : insight.sectionType === 'straight' ? '➡️' : '📍'}</span>
                          <span>
                            <span className="text-white/50">{insight.sectionType.replace('_', ' ')} ({Math.round(insight.binStartPct)}%):</span>{' '}
                            {insight.suggestion}
                            <span className="text-white/30 ml-1">(-{Math.round(insight.timeDelta)}ms)</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Track Map */}
        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-4 bg-black/60 border border-white/10 p-2">
            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1 px-1">Track Map</div>
            <TrackMinimap
              trackName={session.trackId ? String(session.trackId) : session.trackName}
              trackPosition={telemetry.trackPosition}
              otherCars={telemetry.otherCars}
              className="h-32"
            />
          </div>
          <div className="col-span-8 bg-black/60 border border-white/10 p-3">
            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Nearby Cars</div>
            <div className="space-y-1 max-h-28 overflow-y-auto">
              {telemetry.otherCars.length > 0 ? (
                telemetry.otherCars.slice(0, 8).map((car, i) => (
                  <div key={car.carNumber || i} className={`flex items-center gap-2 text-xs py-0.5 ${car.isPlayer ? 'text-cyan-400 font-bold' : 'text-white/60'}`}>
                    <span className="w-5 text-right font-mono text-white/40">P{car.position ?? i + 1}</span>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: car.isPlayer ? '#06b6d4' : car.color || '#374151' }} />
                    <span className="truncate flex-1">{car.driverName || `Car ${car.carNumber}`}</span>
                    <span className="font-mono text-white/30">{car.gap || '--'}</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-white/20 italic">Waiting for standings...</div>
              )}
            </div>
          </div>
        </div>

        {/* Race Intelligence Panel */}
        {raceIntelligence && (
          <div className="bg-black/60 border border-white/10">
            <button
              onClick={() => setShowIntel(!showIntel)}
              className="w-full flex items-center justify-between px-3 py-2 border-b border-white/10 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-400" />
                <span className="text-[10px] uppercase tracking-wider text-purple-400 font-semibold">Race Intelligence</span>
                <span className="text-[10px] text-white/30">Lap {raceIntelligence.lapCount}</span>
              </div>
              {showIntel ? <ChevronUp className="w-3 h-3 text-white/30" /> : <ChevronDown className="w-3 h-3 text-white/30" />}
            </button>

            {showIntel && (
              <div className="p-2 space-y-2">
                {/* Strategy Recommendation */}
                <div className="bg-purple-500/10 border border-purple-500/20 px-3 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-3 h-3 text-purple-400" />
                    <span className="text-[10px] uppercase tracking-wider text-purple-400">Strategy</span>
                  </div>
                  <div className="text-sm text-white/90">{raceIntelligence.recommendedAction}</div>
                </div>

                {/* Pace & Consistency */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white/5 p-2 text-center">
                    <div className="text-[10px] text-white/40 uppercase">Pace</div>
                    <div className={`text-sm font-bold ${
                      raceIntelligence.paceTrend === 'improving' ? 'text-green-400' :
                      raceIntelligence.paceTrend === 'degrading' ? 'text-red-400' :
                      raceIntelligence.paceTrend === 'erratic' ? 'text-yellow-400' : 'text-white/70'
                    }`}>
                      {raceIntelligence.paceTrend === 'improving' && <TrendingUp className="w-3 h-3 inline mr-1" />}
                      {raceIntelligence.paceTrend === 'degrading' && <TrendingDown className="w-3 h-3 inline mr-1" />}
                      {raceIntelligence.paceTrend.charAt(0).toUpperCase() + raceIntelligence.paceTrend.slice(1)}
                    </div>
                  </div>
                  <div className="bg-white/5 p-2 text-center">
                    <div className="text-[10px] text-white/40 uppercase">Consistency</div>
                    <div className={`text-sm font-bold font-mono ${
                      raceIntelligence.consistencyRating > 80 ? 'text-green-400' :
                      raceIntelligence.consistencyRating > 60 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {raceIntelligence.consistencyRating}/100
                    </div>
                  </div>
                  <div className="bg-white/5 p-2 text-center">
                    <div className="text-[10px] text-white/40 uppercase">Positions</div>
                    <div className={`text-sm font-bold font-mono ${
                      raceIntelligence.positionsGainedTotal > 0 ? 'text-green-400' :
                      raceIntelligence.positionsGainedTotal < 0 ? 'text-red-400' : 'text-white/70'
                    }`}>
                      {raceIntelligence.positionsGainedTotal > 0 ? '+' : ''}{raceIntelligence.positionsGainedTotal}
                    </div>
                  </div>
                </div>

                {/* Fuel & Tire Projections */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/5 p-2">
                    <div className="flex items-center gap-1 mb-1">
                      <Fuel className="w-3 h-3 text-orange-400" />
                      <span className="text-[10px] text-white/40 uppercase">Fuel</span>
                    </div>
                    <div className="text-sm font-mono">
                      <span className={raceIntelligence.fuelToFinish ? 'text-green-400' : 'text-red-400'}>
                        {raceIntelligence.projectedFuelLaps.toFixed(0)} laps
                      </span>
                      <span className="text-[10px] text-white/30 ml-1">
                        {raceIntelligence.fuelToFinish ? '✓ finish' : '✗ pit needed'}
                      </span>
                    </div>
                    {raceIntelligence.optimalPitLap && (
                      <div className="text-[10px] text-orange-400 mt-1">
                        <Timer className="w-2.5 h-2.5 inline mr-1" />
                        Pit lap {raceIntelligence.optimalPitLap}
                      </div>
                    )}
                  </div>
                  <div className="bg-white/5 p-2">
                    <div className="flex items-center gap-1 mb-1">
                      <CircleDot className="w-3 h-3 text-blue-400" />
                      <span className="text-[10px] text-white/40 uppercase">Tires</span>
                    </div>
                    <div className="text-sm font-mono">
                      <span className={raceIntelligence.tireCliff ? 'text-red-400' : raceIntelligence.estimatedTireLapsLeft < 10 ? 'text-yellow-400' : 'text-green-400'}>
                        ~{raceIntelligence.estimatedTireLapsLeft} laps
                      </span>
                      <span className="text-[10px] text-white/30 ml-1">
                        {(raceIntelligence.tireDegRate * 100).toFixed(1)}%/lap
                      </span>
                    </div>
                    {raceIntelligence.tireCliff && (
                      <div className="text-[10px] text-red-400 mt-1">
                        <AlertTriangle className="w-2.5 h-2.5 inline mr-1" />Cliff warning
                      </div>
                    )}
                  </div>
                </div>

                {/* Gap Trends & Mental State */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white/5 p-2 text-center">
                    <div className="text-[10px] text-white/40 uppercase">Ahead</div>
                    <div className={`text-xs font-mono ${
                      raceIntelligence.gapAheadTrend === 'closing' ? 'text-green-400' :
                      raceIntelligence.gapAheadTrend === 'opening' ? 'text-red-400' : 'text-white/50'
                    }`}>
                      {raceIntelligence.gapAhead > 0 ? `${raceIntelligence.gapAhead.toFixed(1)}s` : '--'}
                      <div className="text-[9px]">{raceIntelligence.gapAheadTrend}</div>
                    </div>
                    {raceIntelligence.overtakeOpportunity && (
                      <div className="text-[9px] text-green-400 mt-0.5">ATTACK</div>
                    )}
                  </div>
                  <div className="bg-white/5 p-2 text-center">
                    <div className="text-[10px] text-white/40 uppercase">Behind</div>
                    <div className={`text-xs font-mono ${
                      raceIntelligence.gapBehindTrend === 'closing' ? 'text-red-400' :
                      raceIntelligence.gapBehindTrend === 'opening' ? 'text-green-400' : 'text-white/50'
                    }`}>
                      {raceIntelligence.gapBehind > 0 ? `${raceIntelligence.gapBehind.toFixed(1)}s` : '--'}
                      <div className="text-[9px]">{raceIntelligence.gapBehindTrend}</div>
                    </div>
                    {raceIntelligence.underThreat && (
                      <div className="text-[9px] text-red-400 mt-0.5">DEFEND</div>
                    )}
                  </div>
                  <div className="bg-white/5 p-2 text-center">
                    <div className="text-[10px] text-white/40 uppercase">Mental</div>
                    <div className={`text-xs font-bold ${
                      raceIntelligence.mentalFatigue === 'fresh' ? 'text-green-400' :
                      raceIntelligence.mentalFatigue === 'normal' ? 'text-white/70' :
                      raceIntelligence.mentalFatigue === 'fatigued' ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      <Activity className="w-3 h-3 inline mr-0.5" />
                      {raceIntelligence.mentalFatigue.charAt(0).toUpperCase() + raceIntelligence.mentalFatigue.slice(1)}
                    </div>
                    {raceIntelligence.incidentClustering && (
                      <div className="text-[9px] text-red-400 mt-0.5">⚠ Clustering</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

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
          {/* PTT mic status indicator */}
          <div className={`flex items-center gap-1 text-[10px] uppercase tracking-wider ${
            voiceQuery.status === 'listening' ? 'text-[#06b6d4] animate-pulse' :
            voiceQuery.status === 'processing' ? 'text-[#f97316]/70' :
            voiceQuery.status === 'responding' ? 'text-emerald-400 animate-pulse' :
            voiceQuery.status === 'error' ? 'text-red-400' :
            'text-white/20'
          }`}>
            {voiceQuery.status === 'processing'
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <Mic className="w-3 h-3" />}
            {voiceQuery.status === 'idle' ? 'PTT' :
             voiceQuery.status === 'listening' ? 'Listening' :
             voiceQuery.status === 'processing' ? 'Thinking' :
             voiceQuery.status === 'responding' ? 'Engineer' : 'Error'}
          </div>
        </div>
      </div>

      {/* Driver HUD Overlay — fixed, fades when idle */}
      <DriverHUDOverlay
        voiceStatus={voiceQuery.status}
        voiceTranscript={voiceQuery.transcript}
        voiceResponse={voiceQuery.lastResponse}
      />

      {/* Build marker */}
      <div className="fixed bottom-1 right-2 text-[9px] text-white/10 font-mono select-none pointer-events-none z-50">
        v{__APP_VERSION__} · {__GIT_COMMIT__.slice(0, 7)} · {__BUILD_TIME__.slice(0, 16).replace('T', ' ')}
      </div>
    </div>
  );
}
