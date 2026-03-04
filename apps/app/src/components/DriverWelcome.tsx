import { useState } from 'react';
import { X, Radio, Download, Mic, BarChart3, ChevronRight, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DriverWelcomeProps {
  displayName: string;
  onComplete: () => void;
}

export function DriverWelcome({ displayName, onComplete }: DriverWelcomeProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Welcome to Ok, Box Box",
      subtitle: `Ready to race, ${displayName || 'Driver'}?`,
      content: "Your AI race engineer is standing by. Real-time telemetry analysis, voice commands during racing, and personalized coaching to help you improve.",
      visual: (
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="bg-white/5 border border-white/10 p-4 text-center">
            <div className="text-2xl font-bold text-[#f97316] font-mono">AI</div>
            <div className="text-[10px] text-white/40 uppercase mt-1">Engineer</div>
          </div>
          <div className="bg-white/5 border border-white/10 p-4 text-center">
            <div className="text-2xl font-bold text-[#3b82f6] font-mono">LIVE</div>
            <div className="text-[10px] text-white/40 uppercase mt-1">Telemetry</div>
          </div>
          <div className="bg-white/5 border border-white/10 p-4 text-center">
            <div className="text-2xl font-bold text-green-400 font-mono">IDP</div>
            <div className="text-[10px] text-white/40 uppercase mt-1">Coaching</div>
          </div>
        </div>
      )
    },
    {
      title: "Step 1: Download the Relay",
      subtitle: "Connect iRacing to your dashboard",
      content: "The relay runs on your PC and streams telemetry to your dashboard. It auto-detects iRacing sessions and runs silently in your system tray.",
      visual: (
        <div className="mt-6 space-y-3">
          <Link
            to="/download"
            onClick={onComplete}
            className="flex items-center justify-center gap-3 p-4 bg-green-500/20 border border-green-500/30 hover:bg-green-500/30 transition-colors"
          >
            <Download size={20} className="text-green-400" />
            <span className="text-sm font-semibold text-green-400 uppercase tracking-wider">Download Relay</span>
          </Link>
          <p className="text-xs text-white/40 text-center">Windows 10 or later required</p>
        </div>
      )
    },
    {
      title: "Step 2: Link iRacing",
      subtitle: "Sync your profile and race history",
      content: "Connect your iRacing account to import your licenses, iRating, and race history. This powers your personalized coaching insights.",
      visual: (
        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10">
            <Zap size={16} className="text-[#f97316]" />
            <div>
              <div className="text-sm font-medium text-white">Auto-sync race results</div>
              <div className="text-[10px] text-white/40">Your history imports automatically</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10">
            <BarChart3 size={16} className="text-[#3b82f6]" />
            <div>
              <div className="text-sm font-medium text-white">Track your progress</div>
              <div className="text-[10px] text-white/40">iRating trends, consistency metrics</div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Step 3: Talk to Your Engineer",
      subtitle: "Voice-first racing assistance",
      content: "Press and hold your PTT key to ask questions during a session. \"What's my gap to the leader?\" \"How are my tires?\" Your engineer knows your car state in real-time.",
      visual: (
        <div className="mt-6 flex items-center justify-center">
          <div className="relative">
            <div className="w-20 h-20 bg-[#f97316]/20 border border-[#f97316]/40 rounded-full flex items-center justify-center">
              <Mic size={32} className="text-[#f97316]" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse" />
          </div>
        </div>
      )
    },
    {
      title: "You're Ready",
      subtitle: "Your engineer is standing by",
      content: "Start a session in iRacing with the relay running. Your dashboard will light up with live data. Ask your engineer anything - they know your car, your history, and your goals.",
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
                className={`w-6 h-1 ${i <= step ? 'bg-[#f97316]' : 'bg-white/10'} transition-colors`}
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
              Let's Race <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
