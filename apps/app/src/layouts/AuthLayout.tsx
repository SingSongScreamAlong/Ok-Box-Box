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
    <div className="min-h-screen bg-[--bg] flex flex-col relative overflow-hidden">
      {/* Background video */}
      <div className="fixed inset-0 z-0">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover opacity-80"
        >
          <source src="/videos/bg-1.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="https://okboxbox.com" className="flex items-center gap-3 group">
            {/* 3-pill logo */}
            <div className="flex gap-1">
              <div className="w-2 h-6 bg-white rounded-full transform rotate-12 group-hover:scale-110 transition-transform"></div>
              <div className="w-2 h-6 bg-[#3b82f6] rounded-full transform rotate-12 group-hover:scale-110 transition-transform"></div>
              <div className="w-2 h-6 bg-[#f97316] rounded-full transform rotate-12 group-hover:scale-110 transition-transform"></div>
            </div>
            <div className="flex flex-col">
              <span 
                className="text-base font-bold tracking-wider uppercase text-white"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                Ok, Box Box
              </span>
              <span className="text-[0.6rem] tracking-widest text-[#f97316] uppercase">
                Racing Operations System
              </span>
            </div>
          </a>

          <a 
            href="https://okboxbox.com" 
            className="text-xs font-medium uppercase tracking-wider text-white/40 hover:text-white transition-colors"
          >
            ← Back to Website
          </a>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-6">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                <div className="w-1 h-3 bg-white rounded-full transform rotate-12"></div>
                <div className="w-1 h-3 bg-[#3b82f6] rounded-full transform rotate-12"></div>
                <div className="w-1 h-3 bg-[#f97316] rounded-full transform rotate-12"></div>
              </div>
              <span className="text-[10px] text-white/30 uppercase tracking-wider">Ok, Box Box</span>
            </div>
            <div className="flex items-center gap-6 text-[10px] text-white/30 uppercase tracking-wider">
              <a href="https://okboxbox.com/docs" className="hover:text-white/50 transition-colors">Docs</a>
              <a href="https://okboxbox.com/pricing" className="hover:text-white/50 transition-colors">Pricing</a>
              <a href="https://okboxbox.com/support" className="hover:text-white/50 transition-colors">Support</a>
            </div>
            <p className="text-[10px] text-white/20">
              © 2025 Ok, Box Box
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
