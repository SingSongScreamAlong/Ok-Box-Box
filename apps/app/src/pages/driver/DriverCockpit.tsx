import { useEffect } from 'react';
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
  Fuel,
  Flag,
  Clock,
  Wrench,
  Eye,
  Gauge,
  ArrowLeft,
  Timer,
  Zap
} from 'lucide-react';

/**
 * DriverCockpit - Race-Ready Decision Surface
 * 
 * Designed for use DURING a race with large, easy-to-click buttons.
 * Matches the Crew page layout and styling.
 */

export function DriverCockpit() {
  const { status, telemetry, session } = useRelay();
  const { 
    criticalMessages,
    messages,
    driverAssessment,
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

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return '--:--.---';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${mins}:${secs.padStart(6, '0')}`;
  };

  // Quick actions for during the race - large buttons
  const quickActions = [
    { label: 'Fuel Status', icon: Fuel, action: () => speak({ id: 'fuel', content: `${telemetry.lapsRemaining ?? 'Unknown'} laps of fuel remaining`, urgency: 'normal' as const }) },
    { label: 'Gap Report', icon: Timer, action: () => speak({ id: 'gap', content: 'Checking gaps...', urgency: 'normal' as const }) },
    { label: 'Weather', icon: Eye, action: () => speak({ id: 'weather', content: 'Checking weather conditions...', urgency: 'normal' as const }) },
    { label: 'Pit Window', icon: Wrench, action: () => speak({ id: 'pit', content: 'Calculating optimal pit window...', urgency: 'normal' as const }) },
  ];

  return (
    <div className="h-[calc(100vh-4rem)] flex relative">
      {/* Background */}
      <div className="absolute inset-0 bg-[#0e0e0e]" />

      {/* Sidebar */}
      <div className="relative z-10 w-72 border-r border-white/[0.06] bg-[#0e0e0e]/80 backdrop-blur-xl flex flex-col">
        <div className="p-4 border-b border-white/[0.06]">
          <Link to="/driver/home" className="flex items-center gap-2 text-white/50 hover:text-white text-xs mb-4 transition-colors">
            <ArrowLeft className="w-3 h-3" />Back to Operations
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/[0.04] border border-white/[0.08] rounded flex items-center justify-center">
              <Gauge className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white/90">Cockpit</h2>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Live Session</p>
            </div>
          </div>
        </div>

        {/* Session Info */}
        <div className="p-4 border-b border-white/[0.06]">
          <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3 flex items-center gap-2">
            <Flag className="w-3 h-3" />Current Session
          </h3>
          {isLive ? (
            <div className="space-y-3 bg-white/[0.02] rounded p-3 border border-white/[0.06]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-white/80">{session.trackName || 'On Track'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/40">Session</span>
                <span className="text-white/80 font-medium capitalize">{session.sessionType || 'Practice'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/40">Lap</span>
                <span className="text-white/80 font-medium">{telemetry.lap ?? '--'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/40">Position</span>
                <span className="text-white/80 font-medium">P{telemetry.position ?? '--'}</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-white/40 italic">Not connected</div>
          )}
        </div>

        {/* Lap Times */}
        {isLive && (
          <div className="p-4 border-b border-white/[0.06]">
            <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3 flex items-center gap-2">
              <Clock className="w-3 h-3" />Lap Times
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">Last Lap</span>
                <span className="text-sm font-mono text-white/80">{formatTime(telemetry.lastLap)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">Best Lap</span>
                <span className="text-sm font-mono text-purple-400">{formatTime(telemetry.bestLap)}</span>
              </div>
              {telemetry.delta !== null && (
                <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                  <span className="text-xs text-white/40">Delta</span>
                  <span className={`text-sm font-mono font-bold ${telemetry.delta < 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {telemetry.delta > 0 ? '+' : ''}{telemetry.delta.toFixed(3)}s
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fuel */}
        {isLive && (
          <div className="p-4 flex-1">
            <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3 flex items-center gap-2">
              <Fuel className="w-3 h-3" />Fuel
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">Remaining</span>
                <span className="text-sm font-mono text-white/80">{telemetry.fuel?.toFixed(1) ?? '--'} L</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">Laps Left</span>
                <span className={`text-sm font-mono font-bold ${
                  telemetry.lapsRemaining !== null && telemetry.lapsRemaining < 3 ? 'text-red-400' : 'text-white/80'
                }`}>
                  {telemetry.lapsRemaining ?? '--'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col">
        {/* Header */}
        <div className="h-12 border-b border-white/[0.06] bg-[#0e0e0e]/60 backdrop-blur-xl flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-white/30'}`} />
            <span className="text-sm text-white/70">
              {isLive ? `${session.trackName || 'On Track'} • ${session.sessionType || 'Session'}` : 'Waiting for connection...'}
            </span>
          </div>
          <button 
            onClick={toggleVoice}
            className={`p-2 rounded transition-colors ${voiceEnabled ? 'bg-orange-500/20 text-orange-400' : 'text-white/30 hover:text-white/50 hover:bg-white/[0.04]'}`}
            title={voiceEnabled ? 'Voice On' : 'Voice Off'}
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>

        {/* Critical Alerts */}
        {criticalMessages.length > 0 && (
          <div className="p-4 space-y-2">
            {criticalMessages.map(msg => (
              <div 
                key={msg.id}
                className="border-l-4 border-red-500 bg-red-500/10 rounded-r px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <span className="font-semibold text-red-400">{msg.content}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {!isLive && status !== 'connecting' && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-orange-500/10 border border-orange-500/20 rounded-full flex items-center justify-center">
                  <Radio className="w-10 h-10 text-orange-400" />
                </div>
                <h2 className="text-xl font-medium mb-2">Standing By</h2>
                <p className="text-white/50 mb-6">
                  {engineerLoading ? 'Loading...' : 'Start iRacing to connect.'}
                </p>
                <Link 
                  to="/driver/crew/engineer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500/20 border border-orange-500/30 rounded text-sm hover:bg-orange-500/30 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Talk to Engineer
                </Link>
              </div>
            </div>
          )}

          {status === 'connecting' && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-orange-400">Connecting to iRacing...</p>
              </div>
            </div>
          )}

          {isLive && (
            <div className="space-y-6">
              {/* Engineer Message */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-orange-400" />
                  <span className="text-[10px] uppercase tracking-wider text-orange-400">Current Focus</span>
                </div>
                <p className="text-lg text-white/90 leading-relaxed">
                  {messages.find(m => m.urgency === 'important')?.content || driverAssessment || "I'm still learning your style. Give me a few more sessions."}
                </p>
              </div>

              {/* Large Quick Action Buttons - Easy to click during race */}
              <div>
                <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-4">
                  {quickActions.map(action => (
                    <button
                      key={action.label}
                      onClick={action.action}
                      className="h-24 bg-white/[0.02] border border-white/[0.08] rounded-lg hover:bg-white/[0.06] hover:border-white/20 transition-all duration-200 flex flex-col items-center justify-center gap-3"
                    >
                      <action.icon className="w-8 h-8 text-orange-400" />
                      <span className="text-sm font-medium text-white/80">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Crew Links - Large buttons */}
              <div>
                <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-4">Talk to Crew</h3>
                <div className="grid grid-cols-3 gap-4">
                  <Link
                    to="/driver/crew/engineer"
                    className="h-20 bg-white/[0.02] border border-white/[0.08] rounded-lg hover:bg-white/[0.06] hover:border-orange-500/30 transition-all duration-200 flex flex-col items-center justify-center gap-2"
                  >
                    <Wrench className="w-6 h-6 text-white/60" />
                    <span className="text-xs font-medium text-white/70">Engineer</span>
                  </Link>
                  <Link
                    to="/driver/crew/spotter"
                    className="h-20 bg-white/[0.02] border border-white/[0.08] rounded-lg hover:bg-white/[0.06] hover:border-orange-500/30 transition-all duration-200 flex flex-col items-center justify-center gap-2"
                  >
                    <Eye className="w-6 h-6 text-white/60" />
                    <span className="text-xs font-medium text-white/70">Spotter</span>
                  </Link>
                  <Link
                    to="/driver/crew/analyst"
                    className="h-20 bg-white/[0.02] border border-white/[0.08] rounded-lg hover:bg-white/[0.06] hover:border-orange-500/30 transition-all duration-200 flex flex-col items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-6 h-6 text-white/60" />
                    <span className="text-xs font-medium text-white/70">Analyst</span>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
