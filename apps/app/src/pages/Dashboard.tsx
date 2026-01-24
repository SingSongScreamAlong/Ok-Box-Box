import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getDriverProfile, DriverProfile } from '../lib/driverProfile';

export function Dashboard() {
  const { user } = useAuth();
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const displayName = driverProfile?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User';
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
      videoRef.current.playbackRate = 0.6;
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
          className="w-full h-full object-cover opacity-90"
        >
          <source src="/videos/bg-1.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 
          className="text-xl uppercase tracking-[0.15em] font-semibold text-white mb-2"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          Welcome, {displayName}
        </h1>
        <p className="text-sm text-white/50">
          Your Ok, Box Box dashboard
        </p>
      </div>

      <div className="grid gap-6">
        {/* Status card */}
        <div className="bg-[--surface] border border-[--border] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-xs uppercase tracking-wider text-white/50">Account Active</span>
          </div>
          <p className="text-sm text-white/70">
            Your account is set up and ready. The next step is to create your Driver Profile 
            and connect the Relay to start tracking your sessions.
          </p>
        </div>

        {/* Quick actions */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-[--surface] border border-[--border] p-6">
            <h3 
              className="text-xs uppercase tracking-[0.12em] font-semibold text-[#3b82f6] mb-2"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              Driver Profile
            </h3>
            {loadingProfile ? (
              <p className="text-sm text-white/30 mb-4">Loading...</p>
            ) : driverProfile ? (
              <>
                <p className="text-sm text-white/50 mb-4">
                  Profile active as <span className="text-white">{driverProfile.display_name}</span>
                </p>
                <Link to="/driver-profile" className="btn btn-outline text-xs">
                  View Profile
                </Link>
              </>
            ) : (
              <>
                <p className="text-sm text-white/50 mb-4">
                  Create your driver identity to start tracking sessions.
                </p>
                <Link to="/create-driver-profile" className="btn btn-primary text-xs">
                  Create Profile
                </Link>
              </>
            )}
          </div>

          <div className="bg-[--surface] border border-[--border] p-6">
            <h3 
              className="text-xs uppercase tracking-[0.12em] font-semibold text-[#f97316] mb-2"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              Teams
            </h3>
            <p className="text-sm text-white/50 mb-4">
              Create or join a team for shared pit wall and coordination.
            </p>
            <Link to="/teams" className="btn btn-outline text-xs">
              View Teams
            </Link>
          </div>
        </div>

        {/* Winter Testing notice */}
        <div className="bg-[#f97316]/10 border border-[#f97316]/30 p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/30 font-semibold">
              Winter Testing
            </span>
          </div>
          <p className="text-sm text-white/70">
            Ok, Box Box is currently in Winter Testing. Features are being validated and 
            access is limited. Thank you for being part of the early program.
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
