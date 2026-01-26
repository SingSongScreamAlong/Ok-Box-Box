import { useEffect, useMemo } from 'react';
import { useRelay } from '../../hooks/useRelay';
import { useEngineer } from '../../hooks/useEngineer';
import { useVoice } from '../../hooks/useVoice';
import { Link } from 'react-router-dom';
import { 
  AlertTriangle,
  Radio,
  MessageSquare,
  Volume2,
  VolumeX,
  ChevronRight,
  Shield,
  Zap,
  Wind,
  Brain,
  CheckCircle
} from 'lucide-react';

/**
 * DriverCockpit - Adaptive Decision Surface
 * 
 * NOT a dashboard. NOT a telemetry screen. NOT a HUD clone.
 * 
 * This is an adaptive decision surface whose sole purpose is to help
 * the driver make better decisions in the moment they are being made.
 * 
 * If information does not reduce uncertainty, guide judgment, or influence
 * an immediate decision, it does not belong here by default.
 * 
 * The surface adapts to driver context:
 * - Warmup: Calm, sparse, avoid pressure
 * - Push: Validate progress, warn early, stay quiet
 * - Traffic: Spatial awareness, behavioral tags, spotter-led
 * - Degradation: Reduce load, de-emphasize time, gentle truth
 * - Cooldown: Synthesize, reinforce identity, provide clarity
 * 
 * SILENCE IS CONFIDENCE. The best compliment: "It only talks when it matters."
 */

// Driver context types
type DriverContext = 'warmup' | 'push' | 'traffic' | 'degradation' | 'cooldown' | 'idle';

export function DriverCockpit() {
  const { status, telemetry, session } = useRelay();
  const { 
    criticalMessages,
    messages,
    driverAssessment,
    engineerKnowledge,
    loading: engineerLoading 
  } = useEngineer();
  const { isEnabled: voiceEnabled, toggleVoice, speak } = useVoice();

  // Speak critical messages automatically
  useEffect(() => {
    if (voiceEnabled && criticalMessages.length > 0) {
      criticalMessages.forEach(msg => speak(msg));
    }
  }, [voiceEnabled, criticalMessages, speak]);

  const isLive = status === 'in_session' || status === 'connected';

  // Determine driver context based on session state
  const driverContext = useMemo((): DriverContext => {
    if (!isLive) return 'idle';
    
    const lap = telemetry.lap ?? 0;
    const sessionType = session.sessionType;
    
    // Early laps = warmup
    if (lap <= 2) return 'warmup';
    
    // TODO: Detect traffic from proximity data
    // For now, use position changes as proxy
    
    // TODO: Detect degradation from lap time trends
    // For now, check if delta is consistently positive
    if (telemetry.delta && telemetry.delta > 0.5) return 'degradation';
    
    // Race with good position = push
    if (sessionType === 'race' || sessionType === 'qualifying') {
      return 'push';
    }
    
    // Practice default = push (building pace)
    return 'push';
  }, [isLive, telemetry.lap, telemetry.delta, session.sessionType]);

  // Get context-appropriate guidance
  // All states use orange as primary accent to match app theme
  const getContextGuidance = () => {
    switch (driverContext) {
      case 'warmup':
        return {
          icon: Wind,
          label: 'Building Rhythm',
          message: 'Get settled. Find your marks. No pressure.',
          color: 'text-orange-400',
          bg: 'bg-white/[0.02] border-white/10'
        };
      case 'push':
        return {
          icon: Zap,
          label: 'Clean Air',
          message: messages.find(m => m.urgency === 'important')?.content || driverAssessment || 'Drive your line.',
          color: 'text-orange-400',
          bg: 'bg-white/[0.02] border-white/10'
        };
      case 'traffic':
        return {
          icon: Shield,
          label: 'Traffic Ahead',
          message: 'Pick your battles. Survive first.',
          color: 'text-orange-400',
          bg: 'bg-white/[0.02] border-white/10'
        };
      case 'degradation':
        return {
          icon: Brain,
          label: 'Manage the Moment',
          message: 'Stay smooth. Consistency over pace.',
          color: 'text-orange-400',
          bg: 'bg-white/[0.02] border-white/10'
        };
      case 'cooldown':
        return {
          icon: CheckCircle,
          label: 'Session Complete',
          message: 'Good work. Review when ready.',
          color: 'text-orange-400',
          bg: 'bg-white/[0.02] border-white/10'
        };
      default:
        return {
          icon: Radio,
          label: 'Standing By',
          message: 'Ready when you are.',
          color: 'text-orange-400',
          bg: 'bg-white/[0.02] border-white/10'
        };
    }
  };

  const guidance = getContextGuidance();
  const GuidanceIcon = guidance.icon;

  // Determine what to show based on context
  // Rule: If the driver is not making a decision, hide the data
  const shouldShowDelta = driverContext === 'push' && telemetry.delta !== null;
  const shouldShowFuel = telemetry.lapsRemaining !== null && telemetry.lapsRemaining < 5;
  const shouldShowPosition = session.sessionType === 'race' && driverContext !== 'warmup';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      
      {/* CRITICAL ALERTS - Always visible, interrupt everything */}
      {criticalMessages.length > 0 && (
        <div className="px-6 pt-6">
          {criticalMessages.map(msg => (
            <div 
              key={msg.id}
              className="mb-4 border-l-4 border-red-500 bg-red-500/10 backdrop-blur-xl rounded-r-lg px-5 py-4"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <span className="font-semibold text-red-400">{msg.content}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MAIN CONTENT - Centered, breathing space */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">
          
          {/* ============================================ */}
          {/* DISCONNECTED STATE */}
          {/* ============================================ */}
          {!isLive && status !== 'connecting' && (
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-8 bg-orange-500/10 backdrop-blur-xl border border-orange-500/20 rounded-full flex items-center justify-center">
                <Radio className="w-12 h-12 text-orange-400" />
              </div>
              <h2 className="text-2xl font-medium mb-3">Your Engineer</h2>
              <p className="text-white/50 mb-10">
                {engineerLoading ? 'Loading...' : 'Standing by. Start iRacing to connect.'}
              </p>

              {/* What the Engineer Knows - Only if meaningful */}
              {!engineerLoading && engineerKnowledge.length > 0 && (
                <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6 mb-10 text-left">
                  <div className="text-xs uppercase tracking-wider text-orange-400/80 mb-4">What I Know About You</div>
                  <div className="space-y-3">
                    {engineerKnowledge.slice(0, 3).map((knowledge, idx) => (
                      <div key={idx} className="text-sm text-white/60">
                        {knowledge}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-center gap-4">
                <Link 
                  to="/driver/crew/engineer"
                  className="flex items-center gap-2 px-5 py-2.5 bg-orange-500/20 border border-orange-500/30 rounded-lg text-sm hover:bg-orange-500/30 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Talk to Engineer
                </Link>
              </div>
            </div>
          )}

          {/* ============================================ */}
          {/* CONNECTING STATE */}
          {/* ============================================ */}
          {status === 'connecting' && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-yellow-400">Connecting...</p>
            </div>
          )}

          {/* ============================================ */}
          {/* LIVE SESSION - Adaptive Decision Surface */}
          {/* ============================================ */}
          {isLive && (
            <div className="space-y-8">
              
              {/* CONTEXT INDICATOR - Small, unobtrusive */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-white/40">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span>{session.trackName || 'On Track'}</span>
                  <span className="text-white/20">•</span>
                  <span className="capitalize">{session.sessionType || 'Session'}</span>
                </div>
                <button 
                  onClick={toggleVoice}
                  className={`p-2 rounded-lg transition-colors ${voiceEnabled ? 'text-orange-400' : 'text-white/30 hover:text-white/50'}`}
                  title={voiceEnabled ? 'Voice On' : 'Voice Off'}
                >
                  {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
              </div>

              {/* PRIMARY GUIDANCE - The one thing that matters */}
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <GuidanceIcon className="w-6 h-6 text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs uppercase tracking-wider mb-2 text-orange-400">
                      {guidance.label}
                    </div>
                    <div className="text-lg font-medium leading-relaxed text-white">
                      {guidance.message}
                    </div>
                  </div>
                </div>
              </div>

              {/* CONTEXTUAL DATA - Only what reduces uncertainty */}
              <div className="flex items-center justify-center gap-8 text-center">
                
                {/* Delta - Only in push mode */}
                {shouldShowDelta && (
                  <div>
                    <div className={`text-4xl font-mono font-bold ${
                      telemetry.delta! < 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {telemetry.delta! > 0 ? '+' : ''}{telemetry.delta!.toFixed(2)}s
                    </div>
                    <div className="text-xs text-white/30 mt-1">vs personal best</div>
                  </div>
                )}

                {/* Position - Only in race, not warmup */}
                {shouldShowPosition && (
                  <div>
                    <div className="text-4xl font-mono font-bold text-white">
                      P{telemetry.position ?? '--'}
                    </div>
                    <div className="text-xs text-white/30 mt-1">position</div>
                  </div>
                )}

                {/* Fuel - Only when actionable */}
                {shouldShowFuel && (
                  <div>
                    <div className={`text-4xl font-mono font-bold ${
                      telemetry.lapsRemaining! < 3 ? 'text-red-400' : 'text-yellow-400'
                    }`}>
                      {telemetry.lapsRemaining}
                    </div>
                    <div className="text-xs text-white/30 mt-1">laps of fuel</div>
                  </div>
                )}

                {/* If nothing to show, that's intentional */}
                {!shouldShowDelta && !shouldShowPosition && !shouldShowFuel && (
                  <div className="text-white/20 text-sm">
                    No action required
                  </div>
                )}
              </div>

              {/* ENGINEER VOICE - Only if there's something to say */}
              {messages.filter(m => m.urgency !== 'critical').length > 0 && (
                <div className="pt-4 border-t border-white/5">
                  <div className="text-xs text-white/30 mb-3">Engineer</div>
                  {messages.filter(m => m.urgency !== 'critical').slice(0, 1).map(msg => (
                    <div 
                      key={msg.id}
                      className="text-white/60 text-sm"
                    >
                      {msg.content}
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

        </div>
      </div>

      {/* FOOTER - Minimal, out of the way */}
      <div className="px-6 py-4 flex items-center justify-between text-xs text-white/20">
        <div className="flex items-center gap-4">
          <Link to="/driver/sessions" className="hover:text-white/40 transition-colors flex items-center gap-1">
            Sessions <ChevronRight className="w-3 h-3" />
          </Link>
          <Link to="/driver/crew/engineer" className="hover:text-white/40 transition-colors flex items-center gap-1">
            Engineer <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <span>Cockpit</span>
      </div>

    </div>
  );
}
