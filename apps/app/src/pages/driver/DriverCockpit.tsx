import { useEffect, useState, useMemo } from 'react';
import { useRelay } from '../../hooks/useRelay';
import { useEngineer } from '../../hooks/useEngineer';
import { useVoice } from '../../hooks/useVoice';
import { Volume2, VolumeX, Mic, MicOff, Radio } from 'lucide-react';
import { TrackMapRive } from '../../components/TrackMapRive';

/**
 * DriverCockpit - Calm Adaptive Co-Driver
 * 
 * Design principles:
 * 1. No nouns the driver didn't ask for - speak in feelings, not labels
 * 2. One reason to exist per moment - answer ONE of: "What now?", "Am I okay?", "What changed?"
 * 3. Intelligence is invisible - the driver should feel guided, not analyzed
 * 4. Progress is emotional, not numerical - "You're doing fine" > "-0.160s"
 * 
 * The page changes posture based on driver need. Sometimes it talks,
 * sometimes it shows one thing, sometimes it shuts up entirely.
 */

// Driver mood determines what the page shows
type DriverMood = 
  | 'calm'        // Everything's fine - show almost nothing
  | 'focused'     // In the zone - minimal, supportive
  | 'struggling'  // Having a hard time - reassurance
  | 'improving'   // Getting better - gentle encouragement  
  | 'urgent';     // Needs attention NOW - clear single action

// Determine driver mood from telemetry and context
function getDriverMood(
  delta: number | null,
  position: number | null,
  lap: number | null,
  hasCriticalMessage: boolean,
  recentLapTrend: 'improving' | 'stable' | 'struggling'
): DriverMood {
  // Urgent: critical message or very low fuel
  if (hasCriticalMessage) return 'urgent';
  
  // Early laps: let them settle in
  if (lap !== null && lap <= 3) return 'calm';
  
  // Struggling: consistently losing time
  if (recentLapTrend === 'struggling') return 'struggling';
  
  // Improving: getting faster
  if (recentLapTrend === 'improving') return 'improving';
  
  // Focused: running consistent laps, in the zone
  if (delta !== null && Math.abs(delta) < 0.5) return 'focused';
  
  // Default: calm
  return 'calm';
}

// Human-first messages for each mood
function getMoodMessage(mood: DriverMood, context: {
  delta: number | null;
  position: number | null;
  criticalContent?: string;
}): { main: string; sub?: string } {
  switch (mood) {
    case 'urgent':
      return { 
        main: context.criticalContent || 'Check in',
        sub: undefined
      };
    
    case 'struggling':
      return { 
        main: "This is normal",
        sub: "Stay smooth. We'll figure it out."
      };
    
    case 'improving':
      return { 
        main: "That's better",
        sub: "Keep doing what you're doing"
      };
    
    case 'focused':
      return { 
        main: "You're in it",
        sub: undefined
      };
    
    case 'calm':
    default:
      return { 
        main: "You're okay",
        sub: undefined
      };
  }
}

export function DriverCockpit() {
  const { status, telemetry, session, getCarMapPosition } = useRelay();
  const { criticalMessages, messages } = useEngineer();
  const { isEnabled: voiceEnabled, toggleVoice, speak } = useVoice();

  // Engineer/Spotter mute controls
  const [engineerMuted, setEngineerMuted] = useState(false);
  const [spotterMuted, setSpotterMuted] = useState(false);

  // Track recent lap trend (simplified - would be more sophisticated in production)
  const [recentLapTrend] = useState<'improving' | 'stable' | 'struggling'>('stable');

  // Get the most recent message to display (fades after a few seconds)
  const [visibleMessage, setVisibleMessage] = useState<{ content: string; from: 'engineer' | 'spotter'; id: string } | null>(null);
  
  // Show new messages temporarily
  useEffect(() => {
    if (messages.length > 0) {
      const latest = messages[messages.length - 1];
      const from = latest.urgency === 'critical' ? 'engineer' : 'spotter';
      
      // Don't show if muted
      if ((from === 'engineer' && engineerMuted) || (from === 'spotter' && spotterMuted)) {
        return;
      }
      
      setVisibleMessage({ content: latest.content, from, id: latest.id });
      
      // Clear after 5 seconds
      const timer = setTimeout(() => {
        setVisibleMessage(prev => prev?.id === latest.id ? null : prev);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [messages, engineerMuted, spotterMuted]);

  // Speak critical messages automatically
  useEffect(() => {
    if (voiceEnabled && criticalMessages.length > 0) {
      criticalMessages.forEach(msg => speak(msg));
    }
  }, [voiceEnabled, criticalMessages, speak]);

  const isLive = true;

  // Get car position for track map
  const carPosition = telemetry.trackPosition !== null
    ? getCarMapPosition(telemetry.trackPosition)
    : undefined;

  const trackId = 'daytona';

  // Determine current driver mood
  const mood = useMemo(() => getDriverMood(
    telemetry.delta,
    telemetry.position,
    telemetry.lap,
    criticalMessages.length > 0,
    recentLapTrend
  ), [telemetry.delta, telemetry.position, telemetry.lap, criticalMessages.length, recentLapTrend]);

  // Get the message to show
  const moodMessage = useMemo(() => getMoodMessage(mood, {
    delta: telemetry.delta,
    position: telemetry.position,
    criticalContent: criticalMessages[0]?.content
  }), [mood, telemetry.delta, telemetry.position, criticalMessages]);

  // Mood-based styling
  const moodStyles = {
    urgent: 'text-red-400 border-red-500/30',
    struggling: 'text-amber-400 border-amber-500/20',
    improving: 'text-green-400 border-green-500/20',
    focused: 'text-cyan-400 border-cyan-500/20',
    calm: 'text-white/70 border-white/10'
  };

  return (
    <div className="fixed inset-0 top-14 bottom-10 bg-[#080808] text-white overflow-hidden z-10">

      {/* Ok Box Box 3-pill logo - background layer */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
        <div className="flex gap-8 opacity-[0.04]">
          <div className="w-24 h-96 bg-white rounded-full transform rotate-12" />
          <div className="w-24 h-96 bg-[#3b82f6] rounded-full transform rotate-12" />
          <div className="w-24 h-96 bg-[#f97316] rounded-full transform rotate-12" />
        </div>
      </div>

      {/* Full-screen Track Map - the visual anchor */}
      <div className="absolute inset-0 z-[1]">
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
        {/* Subtle vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080808]/80 via-transparent to-[#080808]/40 pointer-events-none" />
      </div>

      {/* The One Card - adaptive message based on mood */}
      <div className="absolute inset-x-0 bottom-24 flex justify-center z-20">
        <div className={`
          px-8 py-4 rounded-2xl backdrop-blur-xl bg-black/60 border
          ${moodStyles[mood]}
          transition-all duration-500 ease-out
          max-w-md text-center
        `}>
          <div className="text-2xl font-medium tracking-tight">
            {moodMessage.main}
          </div>
          {moodMessage.sub && (
            <div className="text-sm text-white/50 mt-1">
              {moodMessage.sub}
            </div>
          )}
        </div>
      </div>

      {/* Minimal position indicator - only when relevant */}
      {telemetry.position !== null && mood !== 'urgent' && (
        <div className="absolute top-4 left-4 z-20">
          <div className="text-4xl font-bold font-mono text-white/30">
            P{telemetry.position}
          </div>
        </div>
      )}

      {/* Controls - top right */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2 py-1">
        {/* Engineer mute */}
        <button
          onClick={() => setEngineerMuted(!engineerMuted)}
          className={`p-2 rounded-full transition-all flex items-center gap-1.5 ${
            engineerMuted 
              ? 'bg-red-500/20 text-red-400' 
              : 'bg-white/5 text-white/50 hover:text-white/70'
          }`}
          title={engineerMuted ? 'Unmute Engineer' : 'Mute Engineer'}
        >
          {engineerMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          <span className="text-[10px] uppercase tracking-wider">Eng</span>
        </button>

        {/* Spotter mute */}
        <button
          onClick={() => setSpotterMuted(!spotterMuted)}
          className={`p-2 rounded-full transition-all flex items-center gap-1.5 ${
            spotterMuted 
              ? 'bg-red-500/20 text-red-400' 
              : 'bg-white/5 text-white/50 hover:text-white/70'
          }`}
          title={spotterMuted ? 'Unmute Spotter' : 'Mute Spotter'}
        >
          {spotterMuted ? <MicOff className="w-4 h-4" /> : <Radio className="w-4 h-4" />}
          <span className="text-[10px] uppercase tracking-wider">Spt</span>
        </button>

        {/* Voice toggle */}
        <button
          onClick={toggleVoice}
          className={`p-2 rounded-full transition-all ${
            voiceEnabled 
              ? 'bg-orange-500/20 text-orange-400' 
              : 'bg-white/5 text-white/30 hover:text-white/50'
          }`}
          title={voiceEnabled ? 'Mute Voice' : 'Enable Voice'}
        >
          {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </div>

      {/* Engineer/Spotter message - appears temporarily when they speak */}
      {visibleMessage && (
        <div className="absolute top-16 left-4 right-4 z-20 flex justify-center animate-in fade-in slide-in-from-top-2 duration-300">
          <div className={`
            px-6 py-3 rounded-xl backdrop-blur-xl bg-black/70 border max-w-lg
            ${visibleMessage.from === 'engineer' ? 'border-orange-500/30' : 'border-cyan-500/30'}
          `}>
            <div className="flex items-start gap-3">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                ${visibleMessage.from === 'engineer' ? 'bg-orange-500/20' : 'bg-cyan-500/20'}
              `}>
                {visibleMessage.from === 'engineer' 
                  ? <Mic className="w-4 h-4 text-orange-400" />
                  : <Radio className="w-4 h-4 text-cyan-400" />
                }
              </div>
              <div>
                <div className={`text-[10px] uppercase tracking-wider mb-0.5 ${
                  visibleMessage.from === 'engineer' ? 'text-orange-400' : 'text-cyan-400'
                }`}>
                  {visibleMessage.from === 'engineer' ? 'Engineer' : 'Spotter'}
                </div>
                <div className="text-white/90 text-sm leading-snug">
                  {visibleMessage.content}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session info - very subtle, bottom */}
      <div className="absolute bottom-4 left-4 right-4 z-20">
        <div className="flex items-center justify-between text-xs text-white/30">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-green-500' : 'bg-white/30'}`} />
            <span>{session.trackName || 'Waiting for session'}</span>
          </div>
          {telemetry.lap !== null && (
            <span>Lap {telemetry.lap}</span>
          )}
        </div>
      </div>

      {/* Connecting state */}
      {status === 'connecting' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-white/50">Connecting...</div>
          </div>
        </div>
      )}

    </div>
  );
}
