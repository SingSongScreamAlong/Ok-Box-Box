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
    <div className="h-screen bg-[#080808] text-white overflow-hidden flex flex-col">
      
      {/* Track Map Section - fills remaining space */}
      <div className="relative flex-1 min-h-0">
        {/* Critical Alerts - Top overlay */}
        {criticalMessages.length > 0 && (
          <div className="absolute top-9 left-2 right-2 z-30">
            {criticalMessages.slice(0, 1).map(msg => (
              <div key={msg.id} className="border-l-2 border-red-500 bg-red-500/20 backdrop-blur-xl rounded-r px-2 py-1">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />
                  <span className="text-xs font-semibold text-red-400 truncate">{msg.content}</span>
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
          <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-transparent to-black/30 pointer-events-none" />
        </div>

        {/* Top Bar - Track name, status, flag */}
        <div className="absolute top-0 left-0 right-0 z-20 h-8 px-2 flex items-center justify-between bg-black/60 backdrop-blur-sm border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-white/30'}`} />
            <h1 className="text-xs font-bold uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              {session.trackName || 'Waiting'}
            </h1>
            <span className="text-[9px] text-white/40 capitalize">{session.sessionType || ''}</span>
            {/* Flag State */}
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/40 border border-white/10`}>
              <Flag className={`w-2.5 h-2.5 ${flagInfo.textColor}`} />
              <span className={`text-[9px] font-bold uppercase ${flagInfo.textColor}`}>{flagInfo.label}</span>
            </div>
          </div>
          <button 
            onClick={toggleVoice}
            className={`p-1 rounded transition-colors ${voiceEnabled ? 'bg-orange-500/30 text-orange-400' : 'text-white/40 hover:text-white/60'}`}
          >
            {voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Position & Lap - Top left */}
        <div className="absolute top-10 left-2 z-20">
          <div className="bg-black/70 backdrop-blur-sm rounded px-2 py-1 border border-white/10">
            <div className="text-2xl font-bold font-mono tracking-tighter leading-none">
              P{telemetry.position ?? '--'}
            </div>
            <div className="text-[9px] text-white/50">L{telemetry.lap ?? '--'}</div>
          </div>
        </div>

        {/* Delta - Top right */}
        <div className="absolute top-10 right-2 z-20">
          <div className="bg-black/70 backdrop-blur-sm rounded px-2 py-1 border border-white/10">
            <div className={`text-xl font-bold font-mono tracking-tighter leading-none ${
              telemetry.delta !== null && telemetry.delta < 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {telemetry.delta !== null ? `${telemetry.delta > 0 ? '+' : ''}${telemetry.delta.toFixed(2)}` : '--'}
            </div>
            <div className="text-[9px] text-white/50">delta</div>
          </div>
        </div>

        {/* Speed - Bottom center of map area */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-black/70 backdrop-blur-sm rounded px-3 py-1 border border-white/10 text-center">
            <div className="text-2xl font-bold font-mono tracking-tighter leading-none">
              {telemetry.speed !== null ? Math.round(telemetry.speed) : '--'}
            </div>
            <div className="text-[8px] text-white/50">MPH</div>
          </div>
        </div>

        {/* Lap Times - Bottom left */}
        <div className="absolute bottom-1 left-2 z-20">
          <div className="bg-black/70 backdrop-blur-sm rounded px-1.5 py-1 border border-white/10 text-[10px]">
            <div className="flex items-center gap-1">
              <span className="text-white/40">L</span>
              <span className="font-mono">{formatTime(telemetry.lastLap)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-purple-400">B</span>
              <span className="font-mono text-purple-400">{formatTime(telemetry.bestLap)}</span>
            </div>
          </div>
        </div>

        {/* Fuel - Bottom right */}
        <div className="absolute bottom-1 right-2 z-20">
          <div className="bg-black/70 backdrop-blur-sm rounded px-1.5 py-1 border border-white/10 text-[10px]">
            <div className="flex items-center gap-1">
              <Fuel className={`w-2.5 h-2.5 ${
                telemetry.lapsRemaining !== null && telemetry.lapsRemaining < 3 ? 'text-red-400' : 'text-green-400'
              }`} />
              <span className="font-mono font-bold">{telemetry.fuel?.toFixed(1) ?? '--'}L</span>
              <span className={`text-[9px] ${
                telemetry.lapsRemaining !== null && telemetry.lapsRemaining < 3 ? 'text-red-400' : 'text-white/40'
              }`}>
                ({telemetry.lapsRemaining ?? '--'})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Panel - Compact */}
      <div className="h-20 border-t border-white/10 bg-[#0a0a0a]">
        <div className="h-full grid grid-cols-4 divide-x divide-white/5">
          
          {/* Radio Transcripts */}
          <div className="px-2 py-1.5 flex flex-col min-w-0">
            <div className="flex items-center gap-1 mb-1">
              <Radio className="w-2.5 h-2.5 text-[#f97316]" />
              <span className="text-[8px] uppercase tracking-wider text-[#f97316] font-medium">Radio</span>
            </div>
            <div className="flex-1 overflow-hidden space-y-0.5 text-[10px]">
              {radioTranscripts.length > 0 ? radioTranscripts.slice(0, 2).map((t, i) => (
                <div key={i} className="flex gap-1 leading-tight truncate">
                  <span className="text-orange-400 flex-shrink-0">{t.from}:</span>
                  <span className="text-white/60 truncate">{t.message}</span>
                </div>
              )) : (
                <div className="text-white/30 italic text-[9px]">No messages</div>
              )}
            </div>
          </div>

          {/* Pit Strategy */}
          <div className="px-2 py-1.5 flex flex-col">
            <div className="flex items-center gap-1 mb-1">
              <Wrench className="w-2.5 h-2.5 text-[#f97316]" />
              <span className="text-[8px] uppercase tracking-wider text-[#f97316] font-medium">Pit</span>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-x-2 gap-y-0 text-[10px]">
              <div className="flex justify-between">
                <span className="text-white/40">Win</span>
                <span className="font-mono font-bold text-white/90">L{pitStrategy.plannedPitLap}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">In</span>
                <span className={`font-mono font-bold ${
                  pitStrategy.plannedPitLap - pitStrategy.currentStint <= 3 ? 'text-orange-400' : 'text-white/90'
                }`}>
                  {Math.max(0, pitStrategy.plannedPitLap - pitStrategy.currentStint)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Fuel</span>
                <span className="font-mono text-white/70">{pitStrategy.fuelToAdd}L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Tire</span>
                <span className="font-mono text-green-400">{pitStrategy.tireChange ? '4' : '0'}</span>
              </div>
            </div>
          </div>

          {/* Tire Wear */}
          <div className="px-2 py-1.5 flex flex-col">
            <div className="flex items-center gap-1 mb-1">
              <Circle className="w-2.5 h-2.5 text-[#f97316]" />
              <span className="text-[8px] uppercase tracking-wider text-[#f97316] font-medium">Tires</span>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="grid grid-cols-2 gap-x-3 gap-y-0 text-center">
                <div className="flex items-center gap-1">
                  <span className="text-[8px] text-white/30">FL</span>
                  <span className={`text-sm font-mono font-bold ${getTireColor(tireWear.fl)}`}>{tireWear.fl}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[8px] text-white/30">FR</span>
                  <span className={`text-sm font-mono font-bold ${getTireColor(tireWear.fr)}`}>{tireWear.fr}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[8px] text-white/30">RL</span>
                  <span className={`text-sm font-mono font-bold ${getTireColor(tireWear.rl)}`}>{tireWear.rl}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[8px] text-white/30">RR</span>
                  <span className={`text-sm font-mono font-bold ${getTireColor(tireWear.rr)}`}>{tireWear.rr}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Spotter & Settings */}
          <div className="px-2 py-1.5 flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <Settings2 className="w-2.5 h-2.5 text-[#f97316]" />
                <span className="text-[8px] uppercase tracking-wider text-[#f97316] font-medium">Spotter</span>
              </div>
              <button 
                onClick={() => setSpotterEnabled(!spotterEnabled)}
                className={`px-1 py-0.5 text-[8px] uppercase rounded transition-colors ${
                  spotterEnabled ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'
                }`}
              >
                {spotterEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className="flex-1 space-y-0.5 text-[10px]">
              <div className="flex items-center justify-between">
                <span className="text-white/40">Prox</span>
                <span className="text-green-400">Clear</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/40">Mode</span>
                <span className="text-white/60">Full</span>
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
