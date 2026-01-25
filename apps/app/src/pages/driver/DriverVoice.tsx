import { useState } from 'react';
import { useRelay } from '../../hooks/useRelay';
import { 
  Mic, 
  Volume2, 
  VolumeX,
  Bot,
  Radio,
  Play,
  Square,
  Sliders,
  MessageSquare
} from 'lucide-react';

interface VoiceProfile {
  id: string;
  name: string;
  description: string;
  accent: string;
}

const voiceProfiles: VoiceProfile[] = [
  { id: 'engineer-1', name: 'Marcus', description: 'Calm, technical engineer', accent: 'British' },
  { id: 'engineer-2', name: 'Sofia', description: 'Energetic strategist', accent: 'Italian' },
  { id: 'spotter-1', name: 'Jake', description: 'Clear, direct spotter', accent: 'American' },
  { id: 'spotter-2', name: 'Liam', description: 'Experienced veteran', accent: 'Australian' },
];

export function DriverVoice() {
  const { status } = useRelay();
  const [engineerEnabled, setEngineerEnabled] = useState(true);
  const [spotterEnabled, setSpotterEnabled] = useState(true);
  const [selectedEngineer, setSelectedEngineer] = useState('engineer-1');
  const [selectedSpotter, setSelectedSpotter] = useState('spotter-1');
  const [engineerVolume, setEngineerVolume] = useState(80);
  const [spotterVolume, setSpotterVolume] = useState(100);
  const [testPlaying, setTestPlaying] = useState<string | null>(null);

  const handleTestVoice = (voiceId: string) => {
    if (testPlaying === voiceId) {
      setTestPlaying(null);
    } else {
      setTestPlaying(voiceId);
      // Simulate audio playback
      setTimeout(() => setTestPlaying(null), 3000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 
            className="text-2xl font-bold uppercase tracking-wider"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Voice Systems
          </h1>
          <p className="text-sm text-white/50 mt-1">AI Engineer & Spotter configuration</p>
        </div>
      </div>

      {/* Connection Warning */}
      {status === 'disconnected' && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 flex items-center gap-3">
          <Mic className="w-5 h-5 text-yellow-500" />
          <p className="text-sm text-yellow-400">
            Connect the Relay to enable voice systems during sessions. Configuration changes will be saved.
          </p>
        </div>
      )}

      {/* AI Engineer Section */}
      <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#f97316]/20 border border-[#f97316]/30 flex items-center justify-center">
              <Bot className="w-5 h-5 text-[#f97316]" />
            </div>
            <div>
              <h2 
                className="text-sm uppercase tracking-wider font-semibold"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                AI Engineer
              </h2>
              <p className="text-xs text-white/50">Strategy, fuel, tire management</p>
            </div>
          </div>
          <button
            onClick={() => setEngineerEnabled(!engineerEnabled)}
            className={`flex items-center gap-2 px-4 py-2 border transition-colors ${
              engineerEnabled 
                ? 'bg-green-500/20 border-green-500/30 text-green-400'
                : 'bg-red-500/20 border-red-500/30 text-red-400'
            }`}
          >
            {engineerEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="text-xs uppercase tracking-wider">
              {engineerEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </button>
        </div>

        {engineerEnabled && (
          <div className="space-y-6">
            {/* Voice Selection */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-white/40 mb-3 block">
                Voice Profile
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {voiceProfiles.filter(v => v.id.startsWith('engineer')).map(voice => (
                  <div
                    key={voice.id}
                    onClick={() => setSelectedEngineer(voice.id)}
                    className={`border p-4 cursor-pointer transition-colors ${
                      selectedEngineer === voice.id
                        ? 'bg-[#f97316]/10 border-[#f97316]/50'
                        : 'bg-black/20 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{voice.name}</div>
                        <div className="text-xs text-white/50">{voice.description}</div>
                        <div className="text-[10px] text-white/30 mt-1">{voice.accent}</div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTestVoice(voice.id);
                        }}
                        className="p-2 hover:bg-white/10 transition-colors"
                      >
                        {testPlaying === voice.id ? (
                          <Square className="w-4 h-4 text-[#f97316]" />
                        ) : (
                          <Play className="w-4 h-4 text-white/40" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Volume */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-white/40 mb-3 block">
                Volume: {engineerVolume}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={engineerVolume}
                onChange={(e) => setEngineerVolume(Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#f97316]"
              />
            </div>

            {/* Callout Settings */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-white/40 mb-3 block">
                Callouts
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['Fuel Updates', 'Pit Window', 'Tire Wear', 'Weather Changes'].map(callout => (
                  <label key={callout} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="accent-[#f97316]" />
                    <span className="text-xs text-white/60">{callout}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Spotter Section */}
      <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#3b82f6]/20 border border-[#3b82f6]/30 flex items-center justify-center">
              <Radio className="w-5 h-5 text-[#3b82f6]" />
            </div>
            <div>
              <h2 
                className="text-sm uppercase tracking-wider font-semibold"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                AI Spotter
              </h2>
              <p className="text-xs text-white/50">Proximity alerts, traffic awareness</p>
            </div>
          </div>
          <button
            onClick={() => setSpotterEnabled(!spotterEnabled)}
            className={`flex items-center gap-2 px-4 py-2 border transition-colors ${
              spotterEnabled 
                ? 'bg-green-500/20 border-green-500/30 text-green-400'
                : 'bg-red-500/20 border-red-500/30 text-red-400'
            }`}
          >
            {spotterEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="text-xs uppercase tracking-wider">
              {spotterEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </button>
        </div>

        {spotterEnabled && (
          <div className="space-y-6">
            {/* Voice Selection */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-white/40 mb-3 block">
                Voice Profile
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {voiceProfiles.filter(v => v.id.startsWith('spotter')).map(voice => (
                  <div
                    key={voice.id}
                    onClick={() => setSelectedSpotter(voice.id)}
                    className={`border p-4 cursor-pointer transition-colors ${
                      selectedSpotter === voice.id
                        ? 'bg-[#3b82f6]/10 border-[#3b82f6]/50'
                        : 'bg-black/20 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{voice.name}</div>
                        <div className="text-xs text-white/50">{voice.description}</div>
                        <div className="text-[10px] text-white/30 mt-1">{voice.accent}</div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTestVoice(voice.id);
                        }}
                        className="p-2 hover:bg-white/10 transition-colors"
                      >
                        {testPlaying === voice.id ? (
                          <Square className="w-4 h-4 text-[#3b82f6]" />
                        ) : (
                          <Play className="w-4 h-4 text-white/40" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Volume */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-white/40 mb-3 block">
                Volume: {spotterVolume}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={spotterVolume}
                onChange={(e) => setSpotterVolume(Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#3b82f6]"
              />
            </div>

            {/* Callout Settings */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-white/40 mb-3 block">
                Callouts
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['Car Left', 'Car Right', 'Clear', 'Yellow Flags'].map(callout => (
                  <label key={callout} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="accent-[#3b82f6]" />
                    <span className="text-xs text-white/60">{callout}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Settings */}
      <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Sliders className="w-5 h-5 text-white/40" />
          <span 
            className="text-xs uppercase tracking-[0.15em] text-white/40"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Advanced Settings
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-white/40 mb-2 block">
              Push-to-Talk Key
            </label>
            <div className="bg-black/40 border border-white/10 px-4 py-3 text-sm text-white/60">
              Press any key to bind...
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-white/40 mb-2 block">
              Audio Output Device
            </label>
            <select className="w-full bg-black/40 border border-white/10 px-4 py-3 text-sm text-white/60">
              <option>Default System Output</option>
              <option>VoiceMeeter Input</option>
              <option>Virtual Cable</option>
            </select>
          </div>
        </div>
      </div>

      {/* Info Panel */}
      <div className="bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 p-4 flex items-start gap-3">
        <MessageSquare className="w-5 h-5 text-[#8b5cf6] flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-[#8b5cf6]">Voice Systems Powered by ElevenLabs</h3>
          <p className="text-xs text-white/60 mt-1">
            AI voices are generated in real-time using advanced speech synthesis. 
            Voice quality and latency depend on your internet connection.
          </p>
        </div>
      </div>
    </div>
  );
}
