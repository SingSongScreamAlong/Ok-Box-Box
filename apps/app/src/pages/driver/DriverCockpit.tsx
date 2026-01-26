import { useEffect, useState } from 'react';
import { useRelay } from '../../hooks/useRelay';
import { useEngineer } from '../../hooks/useEngineer';
import { useVoice } from '../../hooks/useVoice';
import { 
  Fuel, AlertTriangle, Volume2, VolumeX, Flag, Radio,
  Settings2, Circle, Wrench
} from 'lucide-react';
import { TrackMapRive } from '../../components/TrackMapRive';

/**
 * DriverCockpit - Glanceable Second Monitor / iPad View
 * 
 * Track map is the hero (4/5 height). Bottom panel for radio, pit strategy, tire wear.
 * Designed for quick glances during a race.
 */

// Flag state colors and labels
const FLAG_STATES = {
  green: { color: 'bg-green-500', label: 'GREEN', textColor: 'text-green-400' },
  yellow: { color: 'bg-yellow-500', label: 'YELLOW', textColor: 'text-yellow-400' },
  white: { color: 'bg-white', label: 'WHITE', textColor: 'text-white' },
  checkered: { color: 'bg-white', label: 'CHECKERED', textColor: 'text-white' },
  red: { color: 'bg-red-500', label: 'RED', textColor: 'text-red-400' },
  blue: { color: 'bg-blue-500', label: 'BLUE', textColor: 'text-blue-400' },
  black: { color: 'bg-black border border-white', label: 'BLACK', textColor: 'text-white' },
} as const;

type FlagState = keyof typeof FLAG_STATES;

export function DriverCockpit() {
  const { status, telemetry, session, getCarMapPosition } = useRelay();
  const { criticalMessages, messages } = useEngineer();
  const { isEnabled: voiceEnabled, toggleVoice, speak } = useVoice();
  
  // Spotter settings
  const [spotterEnabled, setSpotterEnabled] = useState(true);

  // Speak critical messages automatically
  useEffect(() => {
    if (voiceEnabled && criticalMessages.length > 0) {
      criticalMessages.forEach(msg => speak(msg));
    }
  }, [voiceEnabled, criticalMessages, speak]);

  const isLive = status === 'in_session' || status === 'connected';

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return '--:--.---';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${mins}:${secs.padStart(6, '0')}`;
  };

  // Get car position for track map
  const carPosition = telemetry.trackPosition !== null 
    ? getCarMapPosition(telemetry.trackPosition) 
    : undefined;

  // Track ID for map
  const trackId = (session.trackName || 'default').toLowerCase().replace(/[^a-z]/g, '-').replace(/-+/g, '-');

  // Mock flag state - will come from telemetry
  const flagState: FlagState = (telemetry as { flagState?: FlagState }).flagState || 'green';
  const flagInfo = FLAG_STATES[flagState];

  // Mock tire wear data - will come from telemetry
  const tireWear = {
    fl: (telemetry as { tireWearFL?: number }).tireWearFL ?? 92,
    fr: (telemetry as { tireWearFR?: number }).tireWearFR ?? 88,
    rl: (telemetry as { tireWearRL?: number }).tireWearRL ?? 85,
    rr: (telemetry as { tireWearRR?: number }).tireWearRR ?? 82,
  };

  // Get tire wear color
  const getTireColor = (wear: number) => {
    if (wear > 80) return 'text-green-400';
    if (wear > 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  // Mock radio transcripts - will come from engineer messages
  const radioTranscripts = messages.slice(-3).map(m => ({
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    from: m.urgency === 'critical' ? 'ENGINEER' : 'SPOTTER',
    message: m.content,
  }));

  // Pit strategy info
  const pitStrategy = {
    currentStint: telemetry.lap ?? 0,
    plannedPitLap: 22,
    fuelToAdd: 12.5,
    tireChange: true,
  };

  return (
    <div className="h-screen bg-[#0a0a0a] text-white overflow-hidden flex flex-col">
      
      {/* Track Map Section - 4/5 height */}
      <div className="relative flex-1" style={{ height: '80%' }}>
        {/* Critical Alerts - Top overlay */}
        {criticalMessages.length > 0 && (
          <div className="absolute top-4 left-4 right-4 z-30 space-y-2">
            {criticalMessages.map(msg => (
              <div key={msg.id} className="border-l-4 border-red-500 bg-red-500/20 backdrop-blur-xl rounded-r px-4 py-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <span className="font-semibold text-red-400">{msg.content}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Track Map */}
        <div className="absolute inset-0 z-0">
          <TrackMapRive 
            trackId={trackId}
            showPitLane={true}
            carPosition={carPosition}
            currentSector={telemetry.sector || undefined}
            speed={telemetry.speed || undefined}
            throttle={telemetry.throttle || undefined}
            brake={telemetry.brake || undefined}
            className="w-full h-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-black/20 pointer-events-none" />
        </div>

        {/* Top Bar - Track name, status, flag */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-white/30'}`} />
              <div>
                <h1 className="text-lg font-bold uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  {session.trackName || 'Waiting for Session'}
                </h1>
                <div className="text-xs text-white/50 capitalize">{session.sessionType || 'Practice'}</div>
              </div>
            </div>
            {/* Flag State */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10`}>
              <Flag className={`w-4 h-4 ${flagInfo.textColor}`} />
              <span className={`text-sm font-bold uppercase tracking-wider ${flagInfo.textColor}`}>{flagInfo.label}</span>
            </div>
          </div>
          <button 
            onClick={toggleVoice}
            className={`p-3 rounded-lg backdrop-blur-sm transition-colors ${voiceEnabled ? 'bg-orange-500/30 text-orange-400' : 'bg-black/30 text-white/40 hover:text-white/60'}`}
          >
            {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>

        {/* Position & Lap - Top left */}
        <div className="absolute top-20 left-4 z-20">
          <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="text-5xl font-bold font-mono tracking-tighter">
              P{telemetry.position ?? '--'}
            </div>
            <div className="text-sm text-white/50 mt-1">Lap {telemetry.lap ?? '--'}</div>
          </div>
        </div>

        {/* Delta - Top right */}
        <div className="absolute top-20 right-4 z-20">
          <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className={`text-4xl font-bold font-mono tracking-tighter ${
              telemetry.delta !== null && telemetry.delta < 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {telemetry.delta !== null ? `${telemetry.delta > 0 ? '+' : ''}${telemetry.delta.toFixed(2)}s` : '--'}
            </div>
            <div className="text-sm text-white/50 mt-1">vs Best</div>
          </div>
        </div>

        {/* Speed - Bottom center of map area */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-black/40 backdrop-blur-sm rounded-xl px-6 py-3 border border-white/10 text-center">
            <div className="text-5xl font-bold font-mono tracking-tighter">
              {telemetry.speed !== null ? Math.round(telemetry.speed) : '--'}
            </div>
            <div className="text-xs text-white/50">mph</div>
          </div>
        </div>
      </div>

      {/* Bottom Panel - 1/5 height */}
      <div className="h-[20%] border-t border-white/[0.08] bg-[#0e0e0e]/95 backdrop-blur-xl">
        <div className="h-full grid grid-cols-4 gap-px bg-white/[0.04]">
          
          {/* Radio Transcripts */}
          <div className="bg-[#0e0e0e] p-3 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Radio className="w-3.5 h-3.5 text-[#f97316]" />
              <span className="text-[10px] uppercase tracking-[0.15em] text-[#f97316]">Radio</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 text-xs">
              {radioTranscripts.length > 0 ? radioTranscripts.map((t, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-white/30 flex-shrink-0">{t.time}</span>
                  <span className="text-orange-400 flex-shrink-0">{t.from}:</span>
                  <span className="text-white/70 truncate">{t.message}</span>
                </div>
              )) : (
                <div className="text-white/30 italic">No radio messages</div>
              )}
            </div>
          </div>

          {/* Pit Strategy */}
          <div className="bg-[#0e0e0e] p-3 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="w-3.5 h-3.5 text-[#f97316]" />
              <span className="text-[10px] uppercase tracking-[0.15em] text-[#f97316]">Pit Strategy</span>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-white/40">Pit Window</div>
                <div className="text-lg font-mono font-bold text-white/90">Lap {pitStrategy.plannedPitLap}</div>
              </div>
              <div>
                <div className="text-white/40">Laps to Pit</div>
                <div className={`text-lg font-mono font-bold ${
                  pitStrategy.plannedPitLap - pitStrategy.currentStint <= 3 ? 'text-orange-400' : 'text-white/90'
                }`}>
                  {Math.max(0, pitStrategy.plannedPitLap - pitStrategy.currentStint)}
                </div>
              </div>
              <div>
                <div className="text-white/40">Fuel Add</div>
                <div className="text-sm font-mono text-white/70">{pitStrategy.fuelToAdd}L</div>
              </div>
              <div>
                <div className="text-white/40">Tires</div>
                <div className="text-sm font-mono text-green-400">{pitStrategy.tireChange ? 'Change' : 'No Change'}</div>
              </div>
            </div>
          </div>

          {/* Tire Wear */}
          <div className="bg-[#0e0e0e] p-3 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Circle className="w-3.5 h-3.5 text-[#f97316]" />
              <span className="text-[10px] uppercase tracking-[0.15em] text-[#f97316]">Tire Wear</span>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-center">
                <div>
                  <div className={`text-xl font-mono font-bold ${getTireColor(tireWear.fl)}`}>{tireWear.fl}%</div>
                  <div className="text-[10px] text-white/40">FL</div>
                </div>
                <div>
                  <div className={`text-xl font-mono font-bold ${getTireColor(tireWear.fr)}`}>{tireWear.fr}%</div>
                  <div className="text-[10px] text-white/40">FR</div>
                </div>
                <div>
                  <div className={`text-xl font-mono font-bold ${getTireColor(tireWear.rl)}`}>{tireWear.rl}%</div>
                  <div className="text-[10px] text-white/40">RL</div>
                </div>
                <div>
                  <div className={`text-xl font-mono font-bold ${getTireColor(tireWear.rr)}`}>{tireWear.rr}%</div>
                  <div className="text-[10px] text-white/40">RR</div>
                </div>
              </div>
            </div>
          </div>

          {/* Fuel & Spotter Settings */}
          <div className="bg-[#0e0e0e] p-3 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Fuel className="w-3.5 h-3.5 text-[#f97316]" />
                <span className="text-[10px] uppercase tracking-[0.15em] text-[#f97316]">Fuel & Spotter</span>
              </div>
              <button className="text-white/30 hover:text-white/60 transition-colors">
                <Settings2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 space-y-2">
              {/* Fuel */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Fuel className={`w-4 h-4 ${
                    telemetry.lapsRemaining !== null && telemetry.lapsRemaining < 3 ? 'text-red-400' : 'text-green-400'
                  }`} />
                  <span className="text-xs text-white/50">Fuel</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-mono font-bold">{telemetry.fuel?.toFixed(1) ?? '--'}L</span>
                  <span className={`text-xs ml-2 ${
                    telemetry.lapsRemaining !== null && telemetry.lapsRemaining < 3 ? 'text-red-400' : 'text-white/40'
                  }`}>
                    ({telemetry.lapsRemaining ?? '--'} laps)
                  </span>
                </div>
              </div>
              {/* Spotter Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/50">Spotter</span>
                <button 
                  onClick={() => setSpotterEnabled(!spotterEnabled)}
                  className={`px-2 py-0.5 text-[10px] uppercase tracking-wider rounded transition-colors ${
                    spotterEnabled ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'
                  }`}
                >
                  {spotterEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
              {/* Lap Times */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/40">Last</span>
                <span className="font-mono">{formatTime(telemetry.lastLap)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-purple-400">Best</span>
                <span className="font-mono text-purple-400">{formatTime(telemetry.bestLap)}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Not connected state */}
      {!isLive && status !== 'connecting' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="text-2xl font-medium mb-2">Waiting for Session</div>
            <div className="text-white/50">Start iRacing to connect</div>
          </div>
        </div>
      )}

      {status === 'connecting' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-orange-400">Connecting...</div>
          </div>
        </div>
      )}

    </div>
  );
}
