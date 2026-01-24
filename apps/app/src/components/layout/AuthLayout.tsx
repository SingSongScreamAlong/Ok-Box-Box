import { Outlet } from 'react-router-dom';
import { useEffect, useRef } from 'react';

export function AuthLayout() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.5;
    }
  }, []);

  return (
    <div className="min-h-screen bg-[--bg] flex flex-col relative">
      {/* Background video */}
      <div className="fixed inset-0 z-0">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover opacity-90"
        >
          <source src="/videos/bg-1.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40" />
      </div>

      {/* Header */}
      <header className="relative z-10 bg-[--surface-dark]/80 backdrop-blur-sm border-b border-[--border]">
        {/* Main row */}
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="https://okboxbox.com" className="flex items-center gap-4 group">
            <div className="flex gap-1">
              <div className="w-2 h-7 bg-white rounded-full transform rotate-12"></div>
              <div className="w-2 h-7 bg-[#3b82f6] rounded-full transform rotate-12"></div>
              <div className="w-2 h-7 bg-[#f97316] rounded-full transform rotate-12"></div>
            </div>
            <div className="flex flex-col">
              <span 
                className="text-lg font-bold tracking-wider uppercase text-white"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                Ok, Box Box
              </span>
              <span className="text-[0.625rem] tracking-wider text-[--accent] uppercase">Racing Operations System</span>
            </div>
          </a>

          <div className="flex items-center gap-4">
            <a 
              href="https://okboxbox.com" 
              className="text-xs font-medium uppercase tracking-wider text-white/50 hover:text-white transition-colors"
            >
              ← Back to Website
            </a>
          </div>
        </div>

        {/* Secondary row */}
        <div className="border-t border-white/5 bg-[#080808]/80">
          <div className="max-w-7xl mx-auto px-6 h-10 flex items-center justify-center gap-8">
            <span className="text-[10px] uppercase tracking-wider text-[#f97316]">Winter Testing</span>
            <span className="text-white/20">|</span>
            <span className="text-[10px] uppercase tracking-wider text-white/30">Build v0.1.0-alpha</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-[#0a0a0a]/80 backdrop-blur-sm border border-white/10 p-8">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 bg-[#0a0a0a]/80 backdrop-blur-sm border-t border-white/10 py-6">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex gap-0.5">
                <div className="w-1 h-4 bg-white rounded-full transform rotate-12"></div>
                <div className="w-1 h-4 bg-[#3b82f6] rounded-full transform rotate-12"></div>
                <div className="w-1 h-4 bg-[#f97316] rounded-full transform rotate-12"></div>
              </div>
              <span className="text-xs text-white/40">Ok, Box Box</span>
            </div>
            <div className="flex items-center gap-6 text-xs text-white/30">
              <a href="https://okboxbox.com" target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition-colors">Website</a>
              <a href="https://okboxbox.com/docs" target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition-colors">Docs</a>
              <a href="https://okboxbox.com/pricing" target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition-colors">Pricing</a>
            </div>
            <p className="text-[10px] text-white/20">
              © Ok, Box Box · Take control of your racing.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
