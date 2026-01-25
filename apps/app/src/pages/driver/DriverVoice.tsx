import { useState } from 'react';
import { 
  Wrench,
  Eye,
  Volume2,
  VolumeX,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle
} from 'lucide-react';

interface CalloutCategory {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  examples: string[];
}

export function DriverVoice() {
  const [engineerVolume, setEngineerVolume] = useState(80);
  const [spotterVolume, setSpotterVolume] = useState(100);
  const [engineerExpanded, setEngineerExpanded] = useState(true);
  const [spotterExpanded, setSpotterExpanded] = useState(true);

  const [engineerCallouts, setEngineerCallouts] = useState<CalloutCategory[]>([
    {
      id: 'fuel',
      name: 'Fuel Updates',
      description: 'Fuel remaining, consumption rate, and pit window calculations',
      enabled: true,
      examples: [
        '"Fuel looking good. 12 laps remaining on current load."',
        '"Pit window opens in 3 laps. Start thinking about your stop."',
        '"Fuel critical. Box this lap."',
      ],
    },
    {
      id: 'pace',
      name: 'Pace Analysis',
      description: 'Lap time trends, sector comparisons, and consistency feedback',
      enabled: true,
      examples: [
        '"Good lap. Two tenths under your average."',
        '"Pace dropping in sector 2. Check your entry speed."',
        '"Consistent laps. Keep this rhythm."',
      ],
    },
    {
      id: 'strategy',
      name: 'Strategy Calls',
      description: 'Pit timing, tire strategy, and race situation updates',
      enabled: true,
      examples: [
        '"Leader just pitted. You\'ll cycle to P3 after stops."',
        '"Undercut opportunity. Box now to jump the 42."',
        '"Stay out. Track position is more valuable here."',
      ],
    },
    {
      id: 'weather',
      name: 'Weather Updates',
      description: 'Track temperature, rain probability, and condition changes',
      enabled: false,
      examples: [
        '"Track temp rising. Expect grip to drop."',
        '"Rain in 10 minutes. Start planning for wets."',
      ],
    },
  ]);

  const [spotterCallouts, setSpotterCallouts] = useState<CalloutCategory[]>([
    {
      id: 'traffic',
      name: 'Traffic Calls',
      description: 'Cars around you, closing rates, and passing opportunities',
      enabled: true,
      examples: [
        '"Car inside. Hold your line."',
        '"Clear left. Go when ready."',
        '"Three wide into turn 1. Be careful."',
      ],
    },
    {
      id: 'gaps',
      name: 'Gap Updates',
      description: 'Time to car ahead, car behind, and pit delta',
      enabled: true,
      examples: [
        '"Gap to leader: 4.2 seconds."',
        '"Car behind closing. 0.8 seconds now."',
        '"You\'re pulling away. Gap is 2.1 and growing."',
      ],
    },
    {
      id: 'flags',
      name: 'Flag Conditions',
      description: 'Yellow flags, incidents, and track status changes',
      enabled: true,
      examples: [
        '"Yellow flag sector 3. Incident ahead."',
        '"Green green green. Go racing."',
        '"Full course caution. Slow down."',
      ],
    },
    {
      id: 'incidents',
      name: 'Incident Alerts',
      description: 'Crashes, spins, and debris warnings',
      enabled: true,
      examples: [
        '"Crash ahead turn 4. Stay high."',
        '"Debris on the racing line. Watch turn 7."',
        '"Car spinning ahead. Check up!"',
      ],
    },
  ]);

  const toggleCallout = (
    callouts: CalloutCategory[], 
    setCallouts: React.Dispatch<React.SetStateAction<CalloutCategory[]>>,
    id: string
  ) => {
    setCallouts(callouts.map(c => 
      c.id === id ? { ...c, enabled: !c.enabled } : c
    ));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 
          className="text-2xl font-bold uppercase tracking-wider"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          Crew Communication
        </h1>
        <p className="text-white/50 mt-2">
          Configure what your virtual crew calls out during sessions
        </p>
      </div>

      {/* Engineer Section */}
      <div className="bg-black/40 backdrop-blur-sm border border-white/10">
        <button
          onClick={() => setEngineerExpanded(!engineerExpanded)}
          className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#f97316]/20 border border-[#f97316]/30 flex items-center justify-center">
              <Wrench className="w-6 h-6 text-[#f97316]" />
            </div>
            <div className="text-left">
              <h2 
                className="text-sm font-semibold uppercase tracking-wider"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                Race Engineer
              </h2>
              <p className="text-xs text-white/50">Strategy, fuel, and pace analysis</p>
            </div>
          </div>
          {engineerExpanded ? (
            <ChevronUp className="w-5 h-5 text-white/40" />
          ) : (
            <ChevronDown className="w-5 h-5 text-white/40" />
          )}
        </button>

        {engineerExpanded && (
          <div className="border-t border-white/10 p-4 space-y-4">
            {/* Volume Control */}
            <div className="flex items-center gap-4 pb-4 border-b border-white/10">
              <Volume2 className="w-5 h-5 text-white/40" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wider text-white/40">Volume</span>
                  <span className="text-xs font-mono">{engineerVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={engineerVolume}
                  onChange={(e) => setEngineerVolume(parseInt(e.target.value))}
                  className="w-full accent-[#f97316]"
                />
              </div>
              {engineerVolume === 0 && <VolumeX className="w-5 h-5 text-red-500" />}
            </div>

            {/* Callout Categories */}
            <div>
              <div className="text-xs uppercase tracking-wider text-white/40 mb-3">
                What Your Engineer Calls Out
              </div>
              <div className="space-y-2">
                {engineerCallouts.map((callout) => (
                  <div key={callout.id} className="border border-white/10 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleCallout(engineerCallouts, setEngineerCallouts, callout.id)}
                            className="flex items-center gap-2"
                          >
                            {callout.enabled ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                              <Circle className="w-4 h-4 text-white/30" />
                            )}
                            <span className="text-sm font-semibold">{callout.name}</span>
                          </button>
                        </div>
                        <p className="text-xs text-white/50 mt-1 ml-6">{callout.description}</p>
                      </div>
                    </div>
                    {callout.enabled && (
                      <div className="mt-3 ml-6 space-y-1">
                        {callout.examples.map((example, i) => (
                          <p key={i} className="text-xs text-white/40 italic">{example}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Spotter Section */}
      <div className="bg-black/40 backdrop-blur-sm border border-white/10">
        <button
          onClick={() => setSpotterExpanded(!spotterExpanded)}
          className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#3b82f6]/20 border border-[#3b82f6]/30 flex items-center justify-center">
              <Eye className="w-6 h-6 text-[#3b82f6]" />
            </div>
            <div className="text-left">
              <h2 
                className="text-sm font-semibold uppercase tracking-wider"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                Spotter
              </h2>
              <p className="text-xs text-white/50">Traffic, gaps, and track awareness</p>
            </div>
          </div>
          {spotterExpanded ? (
            <ChevronUp className="w-5 h-5 text-white/40" />
          ) : (
            <ChevronDown className="w-5 h-5 text-white/40" />
          )}
        </button>

        {spotterExpanded && (
          <div className="border-t border-white/10 p-4 space-y-4">
            {/* Volume Control */}
            <div className="flex items-center gap-4 pb-4 border-b border-white/10">
              <Volume2 className="w-5 h-5 text-white/40" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wider text-white/40">Volume</span>
                  <span className="text-xs font-mono">{spotterVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={spotterVolume}
                  onChange={(e) => setSpotterVolume(parseInt(e.target.value))}
                  className="w-full accent-[#3b82f6]"
                />
              </div>
              {spotterVolume === 0 && <VolumeX className="w-5 h-5 text-red-500" />}
            </div>

            {/* Callout Categories */}
            <div>
              <div className="text-xs uppercase tracking-wider text-white/40 mb-3">
                What Your Spotter Watches For
              </div>
              <div className="space-y-2">
                {spotterCallouts.map((callout) => (
                  <div key={callout.id} className="border border-white/10 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleCallout(spotterCallouts, setSpotterCallouts, callout.id)}
                            className="flex items-center gap-2"
                          >
                            {callout.enabled ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                              <Circle className="w-4 h-4 text-white/30" />
                            )}
                            <span className="text-sm font-semibold">{callout.name}</span>
                          </button>
                        </div>
                        <p className="text-xs text-white/50 mt-1 ml-6">{callout.description}</p>
                      </div>
                    </div>
                    {callout.enabled && (
                      <div className="mt-3 ml-6 space-y-1">
                        {callout.examples.map((example, i) => (
                          <p key={i} className="text-xs text-white/40 italic">{example}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Note */}
      <div className="bg-white/5 border border-white/10 p-4 flex items-start gap-3">
        <MessageSquare className="w-5 h-5 text-white/40 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-white/60">
            Your crew learns from your driving style over time. The more you race with Ok, Box Box, 
            the more personalized their callouts become.
          </p>
        </div>
      </div>
    </div>
  );
}
