import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getDriverProfile, DriverProfile } from '../lib/driverProfile';
import { User, Users, Trophy, Radio, Gauge, Video, Mic, ArrowRight, Loader2 } from 'lucide-react';

export function Dashboard() {
  const { user } = useAuth();
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const displayName = driverProfile?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Driver';
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (user) {
      getDriverProfile(user.id).then((profile) => {
        setDriverProfile(profile);
        setLoadingProfile(false);
      });
    }
  }, [user]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.5;
    }
  }, []);

  return (
    <div className="min-h-screen relative">
      {/* Background video */}
      <div className="fixed inset-0 z-0">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover opacity-60"
        >
          <source src="/videos/bg-1.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 md:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 
            className="text-2xl md:text-3xl uppercase tracking-[0.2em] font-bold text-white mb-2"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Welcome, {displayName}
          </h1>
          <p className="text-sm text-white/50">
            Your racing command center
          </p>
        </div>

        {/* Status Banner */}
        <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs uppercase tracking-wider text-white/50">System Ready</span>
            </div>
            <span className="text-white/20">|</span>
            <span className="text-xs text-white/30">Relay: <span className="text-yellow-500">Not Connected</span></span>
          </div>
          <Link to="/settings" className="text-xs text-[#f97316] hover:text-[#fb923c] transition-colors">
            Configure →
          </Link>
        </div>

        {/* Main Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Driver Profile Card */}
          <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-6 hover:border-[#3b82f6]/50 transition-colors group">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#3b82f6]/20 border border-[#3b82f6]/30 flex items-center justify-center">
                <User className="w-5 h-5 text-[#3b82f6]" />
              </div>
              <h3 
                className="text-xs uppercase tracking-[0.15em] font-semibold text-[#3b82f6]"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                Driver Profile
              </h3>
            </div>
            {loadingProfile ? (
              <div className="flex items-center gap-2 text-white/30 text-sm mb-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </div>
            ) : driverProfile ? (
              <>
                <p className="text-sm text-white/50 mb-4">
                  Racing as <span className="text-white font-medium">{driverProfile.display_name}</span>
                </p>
                <Link to="/driver-profile" className="inline-flex items-center gap-2 text-xs text-[#3b82f6] hover:text-[#60a5fa] transition-colors group-hover:gap-3">
                  View Profile <ArrowRight className="w-3 h-3" />
                </Link>
              </>
            ) : (
              <>
                <p className="text-sm text-white/50 mb-4">
                  Set up your driver identity
                </p>
                <Link to="/create-driver-profile" className="btn btn-primary text-xs h-9">
                  Create Profile
                </Link>
              </>
            )}
          </div>

          {/* Teams Card */}
          <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-6 hover:border-[#f97316]/50 transition-colors group">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#f97316]/20 border border-[#f97316]/30 flex items-center justify-center">
                <Users className="w-5 h-5 text-[#f97316]" />
              </div>
              <h3 
                className="text-xs uppercase tracking-[0.15em] font-semibold text-[#f97316]"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                Teams
              </h3>
            </div>
            <p className="text-sm text-white/50 mb-4">
              Coordinate with your crew
            </p>
            <Link to="/teams" className="inline-flex items-center gap-2 text-xs text-[#f97316] hover:text-[#fb923c] transition-colors group-hover:gap-3">
              View Teams <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Leagues Card */}
          <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-6 hover:border-[#8b5cf6]/50 transition-colors group">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-[#8b5cf6]" />
              </div>
              <h3 
                className="text-xs uppercase tracking-[0.15em] font-semibold text-[#8b5cf6]"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                Leagues
              </h3>
            </div>
            <p className="text-sm text-white/50 mb-4">
              Compete in organized events
            </p>
            <Link to="/leagues" className="inline-flex items-center gap-2 text-xs text-[#8b5cf6] hover:text-[#a78bfa] transition-colors group-hover:gap-3">
              View Leagues <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Driver Tier Features */}
        <div className="mb-6">
          <h2 
            className="text-xs uppercase tracking-[0.15em] font-semibold text-white/50 mb-4"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Driver Systems
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* HUD */}
            <div className="bg-black/30 border border-white/5 p-4 opacity-50">
              <div className="flex items-center gap-2 mb-2">
                <Gauge className="w-4 h-4 text-white/40" />
                <span className="text-xs uppercase tracking-wider text-white/40">HUD Overlay</span>
              </div>
              <span className="text-[10px] text-white/20 uppercase">Coming Soon</span>
            </div>

            {/* AI Engineer */}
            <div className="bg-black/30 border border-white/5 p-4 opacity-50">
              <div className="flex items-center gap-2 mb-2">
                <Mic className="w-4 h-4 text-white/40" />
                <span className="text-xs uppercase tracking-wider text-white/40">AI Engineer</span>
              </div>
              <span className="text-[10px] text-white/20 uppercase">Coming Soon</span>
            </div>

            {/* AI Spotter */}
            <div className="bg-black/30 border border-white/5 p-4 opacity-50">
              <div className="flex items-center gap-2 mb-2">
                <Radio className="w-4 h-4 text-white/40" />
                <span className="text-xs uppercase tracking-wider text-white/40">AI Spotter</span>
              </div>
              <span className="text-[10px] text-white/20 uppercase">Coming Soon</span>
            </div>

            {/* Driver Cam */}
            <div className="bg-black/30 border border-white/5 p-4 opacity-50">
              <div className="flex items-center gap-2 mb-2">
                <Video className="w-4 h-4 text-white/40" />
                <span className="text-xs uppercase tracking-wider text-white/40">Driver Cam</span>
              </div>
              <span className="text-[10px] text-white/20 uppercase">Coming Soon</span>
            </div>
          </div>
        </div>

        {/* Winter Testing Notice */}
        <div className="bg-[#f97316]/10 border border-[#f97316]/30 p-5">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-[#f97316]/20 border border-[#f97316]/30 flex items-center justify-center flex-shrink-0">
              <span className="text-[#f97316] text-lg">⚠</span>
            </div>
            <div>
              <h3 
                className="text-xs uppercase tracking-[0.15em] font-semibold text-[#f97316] mb-2"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                Winter Testing
              </h3>
              <p className="text-sm text-white/60">
                Ok, Box Box is in early access. Features are being validated and refined. 
                Thank you for being part of the development program.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
