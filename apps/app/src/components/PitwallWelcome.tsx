import { useState } from 'react';
import { X, Target, Fuel, Clock, Zap, ChevronRight, Radio } from 'lucide-react';

interface PitwallWelcomeProps {
  teamName: string;
  onComplete: () => void;
}

export function PitwallWelcome({ teamName, onComplete }: PitwallWelcomeProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Welcome to Your Pit Wall",
      subtitle: `${teamName}'s Race Operations Center`,
      content: "This is where championships are won. Real-time strategy, driver development, telemetry analysis - everything a professional racing team needs, now backing you.",
      visual: (
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="bg-white/5 border border-white/10 p-4 text-center">
            <div className="text-2xl font-bold text-[#f97316] font-mono">LIVE</div>
            <div className="text-[10px] text-white/40 uppercase mt-1">Race Strategy</div>
          </div>
          <div className="bg-white/5 border border-white/10 p-4 text-center">
            <div className="text-2xl font-bold text-[#3b82f6] font-mono">AI</div>
            <div className="text-[10px] text-white/40 uppercase mt-1">Coaching</div>
          </div>
          <div className="bg-white/5 border border-white/10 p-4 text-center">
            <div className="text-2xl font-bold text-green-400 font-mono">DATA</div>
            <div className="text-[10px] text-white/40 uppercase mt-1">Telemetry</div>
          </div>
        </div>
      )
    },
    {
      title: "Race Strategy",
      subtitle: "Plan every stint, every stop, every decision",
      content: "Build race strategies with tire degradation models, weather forecasting, fuel calculations, and pit window optimization. Know exactly when to pit before the race even starts.",
      visual: (
        <div className="mt-6 space-y-2">
          {[
            { icon: Target, label: 'Stint Planning', desc: 'Map out driver rotations and tire strategies' },
            { icon: Fuel, label: 'Fuel Calculator', desc: 'Never run out, never carry too much' },
            { icon: Clock, label: 'Pit Windows', desc: 'Optimal pit timing based on track position' }
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-white/5 border border-white/10">
              <item.icon size={16} className="text-[#f97316]" />
              <div>
                <div className="text-sm font-medium text-white">{item.label}</div>
                <div className="text-[10px] text-white/40">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )
    },
    {
      title: "Practice Analysis",
      subtitle: "Every lap tells a story",
      content: "Sector-by-sector breakdown, theoretical best laps, tire wear tracking, fuel consumption mapping. Understand exactly where you're fast and where you're leaving time on the table.",
      visual: (
        <div className="mt-6">
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-purple-500/20 border border-purple-500/30 p-3 text-center">
              <div className="text-xs font-mono text-purple-400">32.234</div>
              <div className="text-[9px] text-white/40">S1 Best</div>
            </div>
            <div className="bg-green-500/20 border border-green-500/30 p-3 text-center">
              <div className="text-xs font-mono text-green-400">42.089</div>
              <div className="text-[9px] text-white/40">S2 Best</div>
            </div>
            <div className="bg-yellow-500/20 border border-yellow-500/30 p-3 text-center">
              <div className="text-xs font-mono text-yellow-400">32.678</div>
              <div className="text-[9px] text-white/40">S3</div>
            </div>
          </div>
          <div className="bg-[#3b82f6]/10 border border-[#3b82f6]/30 p-3 text-center">
            <div className="text-[10px] text-white/40 uppercase">Theoretical Best</div>
            <div className="text-lg font-mono font-bold text-[#3b82f6]">1:47.001</div>
          </div>
        </div>
      )
    },
    {
      title: "Driver Development",
      subtitle: "Track progress, identify opportunities",
      content: "AI-powered coaching insights, iRating trends, safety rating tracking, personalized targets. We analyze your driving to help you improve where it matters most.",
      visual: (
        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-3 p-3 bg-green-500/10 border-l-2 border-green-500">
            <Zap size={16} className="text-green-400" />
            <div>
              <div className="text-sm font-medium text-green-400">Strength: Consistency</div>
              <div className="text-[10px] text-white/50">Your lap variance is elite-level at 0.42%</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-yellow-500/10 border-l-2 border-yellow-500">
            <Target size={16} className="text-yellow-400" />
            <div>
              <div className="text-sm font-medium text-yellow-400">Focus: Qualifying Pace</div>
              <div className="text-[10px] text-white/50">0.3s gap to race pace percentile</div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "You're Ready",
      subtitle: "Your team is standing by",
      content: "Explore at your own pace. Hover over any element for details. Click the help icons for explanations. We're building something special here - your racing operation.",
      visual: (
        <div className="mt-6 flex items-center justify-center">
          <div className="relative">
            <div className="w-24 h-24 bg-[#f97316] flex items-center justify-center">
              <Radio size={40} className="text-black" />
            </div>
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-500 rounded-full animate-pulse" />
          </div>
        </div>
      )
    }
  ];

  const currentStep = steps[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-lg mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`w-8 h-1 ${i <= step ? 'bg-[#f97316]' : 'bg-white/10'} transition-colors`}
              />
            ))}
          </div>
          <button
            onClick={onComplete}
            className="text-white/30 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <h2 
            className="text-xl font-bold text-white tracking-wide"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            {currentStep.title}
          </h2>
          <p className="text-sm text-[#f97316] mt-1">{currentStep.subtitle}</p>
          <p className="text-sm text-white/50 mt-4 leading-relaxed">{currentStep.content}</p>
          {currentStep.visual}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            className={`text-xs uppercase tracking-wider ${step === 0 ? 'text-white/20 cursor-not-allowed' : 'text-white/50 hover:text-white'}`}
            disabled={step === 0}
          >
            Back
          </button>
          <div className="text-xs text-white/30">
            {step + 1} of {steps.length}
          </div>
          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1 text-xs uppercase tracking-wider text-[#f97316] hover:text-[#f97316]/80"
            >
              Next <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={onComplete}
              className="flex items-center gap-1 bg-[#f97316] text-black px-4 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-[#f97316]/90"
            >
              Let's Go <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook to manage first-time experience
export function useFirstTimeExperience(key: string) {
  const storageKey = `okboxbox_ftue_${key}`;
  const [hasSeenWelcome, setHasSeenWelcome] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(storageKey) === 'true';
  });

  const markAsSeen = () => {
    localStorage.setItem(storageKey, 'true');
    setHasSeenWelcome(true);
  };

  const reset = () => {
    localStorage.removeItem(storageKey);
    setHasSeenWelcome(false);
  };

  return { hasSeenWelcome, markAsSeen, reset };
}
