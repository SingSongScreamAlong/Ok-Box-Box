import { useRelay } from '../../hooks/useRelay';
import { Link } from 'react-router-dom';
import { 
  Wrench,
  Eye,
  Flag, 
  Fuel,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  Radio,
  MessageSquare
} from 'lucide-react';

interface EngineerInsight {
  type: 'fuel' | 'pace' | 'strategy' | 'info';
  message: string;
  priority: 'high' | 'medium' | 'low';
}

interface SpotterCall {
  type: 'clear' | 'traffic' | 'warning' | 'info';
  message: string;
  timestamp: number;
}

export function DriverPitwall() {
  const { status, telemetry, session } = useRelay();

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return '--:--.---';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${mins}:${secs.padStart(6, '0')}`;
  };

  // Generate engineer insights based on telemetry
  const getEngineerInsights = (): EngineerInsight[] => {
    const insights: EngineerInsight[] = [];
    
    if (telemetry.fuel !== null && telemetry.fuelPerLap !== null && telemetry.lapsRemaining !== null) {
      const fuelLaps = telemetry.fuel / telemetry.fuelPerLap;
      if (fuelLaps < telemetry.lapsRemaining + 2) {
        insights.push({
          type: 'fuel',
          message: `Fuel critical. ${fuelLaps.toFixed(1)} laps of fuel remaining. Consider pitting.`,
          priority: 'high',
        });
      } else if (fuelLaps < telemetry.lapsRemaining + 5) {
        insights.push({
          type: 'fuel',
          message: `Fuel window opening. ${fuelLaps.toFixed(1)} laps remaining on current fuel.`,
          priority: 'medium',
        });
      }
    }

    if (telemetry.delta !== null) {
      if (telemetry.delta < -0.5) {
        insights.push({
          type: 'pace',
          message: `Strong pace. You're ${Math.abs(telemetry.delta).toFixed(2)}s under your best. Keep it clean.`,
          priority: 'low',
        });
      } else if (telemetry.delta > 1.0) {
        insights.push({
          type: 'pace',
          message: `Pace dropping. You're ${telemetry.delta.toFixed(2)}s off. Check tire grip.`,
          priority: 'medium',
        });
      }
    }

    if (insights.length === 0 && status === 'in_session') {
      insights.push({
        type: 'info',
        message: 'All systems nominal. Focus on hitting your marks.',
        priority: 'low',
      });
    }

    return insights;
  };

  // Generate spotter calls based on session state
  const getSpotterCalls = (): SpotterCall[] => {
    const calls: SpotterCall[] = [];
    
    if (status === 'in_session') {
      if (telemetry.position !== null && telemetry.position <= 3) {
        calls.push({
          type: 'info',
          message: `P${telemetry.position}. Running in the lead pack. Stay focused.`,
          timestamp: Date.now(),
        });
      }
      
      calls.push({
        type: 'clear',
        message: 'Track clear ahead. Push when ready.',
        timestamp: Date.now() - 5000,
      });
    }

    return calls;
  };

  const engineerInsights = getEngineerInsights();
  const spotterCalls = getSpotterCalls();

  const getInsightIcon = (type: EngineerInsight['type']) => {
    switch (type) {
      case 'fuel': return <Fuel className="w-4 h-4" />;
      case 'pace': return <Clock className="w-4 h-4" />;
      case 'strategy': return <Flag className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getInsightColor = (priority: EngineerInsight['priority']) => {
    switch (priority) {
      case 'high': return 'border-red-500/50 bg-red-500/10 text-red-400';
      case 'medium': return 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400';
      default: return 'border-white/20 bg-white/5 text-white/60';
    }
  };

  // Disconnected state - Engineer waiting
  if (status === 'disconnected') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-[#f97316]/20 border border-[#f97316]/30 flex items-center justify-center">
            <Wrench className="w-10 h-10 text-[#f97316]" />
          </div>
          <h2 
            className="text-xl uppercase tracking-wider font-bold mb-2"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Your Engineer is Waiting
          </h2>
          <p className="text-sm text-white/50 max-w-md mx-auto mb-6">
            Connect the Ok, Box Box Relay to receive live strategy insights, 
            fuel calculations, and pace analysis from your virtual engineer.
          </p>
          <Link 
            to="/download"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#f97316] text-black font-semibold text-sm uppercase tracking-wider hover:bg-[#fb923c] transition-colors"
          >
            Download Relay
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Wrench className="w-5 h-5 text-[#f97316]" />
              <span className="text-sm font-semibold uppercase tracking-wider">What Your Engineer Does</span>
            </div>
            <ul className="space-y-2 text-sm text-white/60">
              <li className="flex items-start gap-2">
                <span className="text-[#f97316]">•</span>
                Calculates fuel windows and pit strategy
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#f97316]">•</span>
                Monitors pace trends and tire degradation
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#f97316]">•</span>
                Provides real-time strategy recommendations
              </li>
            </ul>
          </div>
          <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-5 h-5 text-[#3b82f6]" />
              <span className="text-sm font-semibold uppercase tracking-wider">What Your Spotter Does</span>
            </div>
            <ul className="space-y-2 text-sm text-white/60">
              <li className="flex items-start gap-2">
                <span className="text-[#3b82f6]">•</span>
                Watches traffic and calls positions
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#3b82f6]">•</span>
                Alerts you to incidents and yellow flags
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#3b82f6]">•</span>
                Provides situational awareness in traffic
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Connecting state
  if (status === 'connecting') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-black/40 backdrop-blur-sm border border-yellow-500/30 p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center animate-pulse">
            <Radio className="w-10 h-10 text-yellow-500" />
          </div>
          <h2 
            className="text-xl uppercase tracking-wider font-bold mb-2"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Connecting to Your Crew
          </h2>
          <p className="text-sm text-white/50">Establishing connection to iRacing...</p>
        </div>
      </div>
    );
  }

  // Connected / In Session - Live Support View
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 
            className="text-2xl font-bold uppercase tracking-wider"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Live Pitwall
          </h1>
          <p className="text-sm text-white/50 mt-1">
            {status === 'in_session' 
              ? 'Your crew is actively monitoring'
              : 'Standing by for session start'}
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/30">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs uppercase tracking-wider text-green-400">
            {status === 'in_session' ? 'Live' : 'Connected'}
          </span>
        </div>
      </div>

      {/* Session Info */}
      {session.trackName && (
        <div className="bg-black/40 backdrop-blur-sm border border-[#f97316]/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Flag className="w-5 h-5 text-[#f97316]" />
              <div>
                <div className="text-sm font-semibold">{session.trackName}</div>
                <div className="text-xs text-white/50 uppercase">{session.sessionType}</div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              {telemetry.position !== null && (
                <div className="text-right">
                  <div className="text-xs text-white/40 uppercase">Position</div>
                  <div className="text-2xl font-mono font-bold">P{telemetry.position}</div>
                </div>
              )}
              {telemetry.lap !== null && (
                <div className="text-right">
                  <div className="text-xs text-white/40 uppercase">Lap</div>
                  <div className="text-2xl font-mono font-bold">{telemetry.lap}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Two Column Layout: Engineer + Spotter */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engineer Panel */}
        <div className="bg-black/40 backdrop-blur-sm border border-white/10">
          <div className="p-4 border-b border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 bg-[#f97316]/20 border border-[#f97316]/30 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-[#f97316]" />
            </div>
            <div>
              <h2 
                className="text-sm font-semibold uppercase tracking-wider"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                Race Engineer
              </h2>
              <p className="text-[10px] text-white/40 uppercase">Strategy & Fuel</p>
            </div>
          </div>
          
          <div className="p-4 space-y-3">
            {/* Key Metrics */}
            <div className="grid grid-cols-3 gap-3 pb-4 border-b border-white/10">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Fuel</div>
                <div className="text-xl font-mono font-bold">
                  {telemetry.fuel !== null ? `${telemetry.fuel.toFixed(1)}L` : '--'}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Per Lap</div>
                <div className="text-xl font-mono font-bold">
                  {telemetry.fuelPerLap !== null ? `${telemetry.fuelPerLap.toFixed(2)}L` : '--'}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Laps Left</div>
                <div className="text-xl font-mono font-bold">
                  {telemetry.lapsRemaining !== null ? telemetry.lapsRemaining : '--'}
                </div>
              </div>
            </div>

            {/* Engineer Insights */}
            <div>
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Engineer Says</div>
              {engineerInsights.length > 0 ? (
                <div className="space-y-2">
                  {engineerInsights.map((insight, i) => (
                    <div 
                      key={i}
                      className={`p-3 border ${getInsightColor(insight.priority)} flex items-start gap-3`}
                    >
                      {getInsightIcon(insight.type)}
                      <p className="text-sm">{insight.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 border border-white/10 text-sm text-white/40 italic">
                  "Waiting for session data..."
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Spotter Panel */}
        <div className="bg-black/40 backdrop-blur-sm border border-white/10">
          <div className="p-4 border-b border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 bg-[#3b82f6]/20 border border-[#3b82f6]/30 flex items-center justify-center">
              <Eye className="w-5 h-5 text-[#3b82f6]" />
            </div>
            <div>
              <h2 
                className="text-sm font-semibold uppercase tracking-wider"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                Spotter
              </h2>
              <p className="text-[10px] text-white/40 uppercase">Traffic & Awareness</p>
            </div>
          </div>
          
          <div className="p-4 space-y-3">
            {/* Timing */}
            <div className="grid grid-cols-3 gap-3 pb-4 border-b border-white/10">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Last Lap</div>
                <div className="text-xl font-mono font-bold">
                  {formatTime(telemetry.lastLap)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Best Lap</div>
                <div className="text-xl font-mono font-bold text-[#8b5cf6]">
                  {formatTime(telemetry.bestLap)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Delta</div>
                <div className={`text-xl font-mono font-bold flex items-center gap-1 ${
                  telemetry.delta === null ? 'text-white/40' :
                  telemetry.delta < 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {telemetry.delta !== null ? (
                    <>
                      {telemetry.delta < 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {telemetry.delta > 0 ? '+' : ''}{telemetry.delta.toFixed(3)}
                    </>
                  ) : (
                    <>
                      <Minus className="w-4 h-4" />
                      --
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Spotter Calls */}
            <div>
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Spotter Says</div>
              {spotterCalls.length > 0 ? (
                <div className="space-y-2">
                  {spotterCalls.map((call, i) => (
                    <div 
                      key={i}
                      className="p-3 border border-white/10 bg-white/5 flex items-start gap-3"
                    >
                      <Eye className="w-4 h-4 text-[#3b82f6]" />
                      <p className="text-sm text-white/60">"{call.message}"</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 border border-white/10 text-sm text-white/40 italic">
                  "Standing by. I'll call traffic when you're on track."
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Warning Banner (when applicable) */}
      {telemetry.fuel !== null && telemetry.fuelPerLap !== null && 
       telemetry.fuel / telemetry.fuelPerLap < 3 && (
        <div className="bg-red-500/20 border border-red-500/50 p-4 flex items-center gap-4">
          <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider">
              Fuel Critical
            </h3>
            <p className="text-sm text-white/60">
              Less than 3 laps of fuel remaining. Box this lap.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
