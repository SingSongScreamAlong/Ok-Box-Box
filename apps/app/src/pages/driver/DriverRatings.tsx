import { useState, useEffect, useRef } from 'react';
import { fetchDriverProfile, DriverIdentityProfile, getDisciplineLabel, getLicenseColor } from '../../lib/driverService';
import { Award, Shield, TrendingUp, Loader2 } from 'lucide-react';

export function DriverRatings() {
  const [profile, setProfile] = useState<DriverIdentityProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    fetchDriverProfile().then((data) => {
      setProfile(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.6;
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-white/40" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-12 text-center">
          <p className="text-white/50">Unable to load ratings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-8rem)]">
      {/* Background video */}
      <div className="fixed inset-0 z-0">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover opacity-70"
        >
          <source src="/videos/track-right.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0e]/80 via-[#0e0e0e]/60 to-[#0e0e0e]/40" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0e0e0e]/80" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto space-y-6 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 
            className="text-3xl font-bold uppercase tracking-wider"
            style={{ fontFamily: 'Orbitron, sans-serif', textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
          >
            Ratings & Licensing
          </h1>
          <p className="text-sm text-white/60 mt-2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>Your iRacing license progression</p>
        </div>

        {/* Overall Ratings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/[0.03] backdrop-blur-xl border border-green-500/30 rounded p-6 shadow-lg shadow-green-500/10 hover:bg-white/[0.05] transition-all duration-200">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-green-400" />
              <span className="text-[10px] uppercase tracking-[0.15em] text-green-400">Overall Safety Rating</span>
            </div>
            <div className="text-4xl font-mono font-bold text-green-400" style={{ textShadow: '0 2px 15px rgba(34,197,94,0.3)' }}>
              {profile.safetyRatingOverall?.toFixed(2) ?? '—'}
            </div>
            <div className="mt-2 text-xs text-white/50">
              Across all disciplines
            </div>
          </div>
          <div className="bg-white/[0.03] backdrop-blur-xl border border-blue-500/30 rounded p-6 shadow-lg shadow-blue-500/10 hover:bg-white/[0.05] transition-all duration-200">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <span className="text-[10px] uppercase tracking-[0.15em] text-blue-400">Overall iRating</span>
            </div>
            <div className="text-4xl font-mono font-bold text-blue-400" style={{ textShadow: '0 2px 15px rgba(59,130,246,0.3)' }}>
              {profile.iRatingOverall ?? '—'}
            </div>
            <div className="mt-2 text-xs text-white/50">
              Primary discipline rating
            </div>
          </div>
        </div>

        {/* License Cards */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-6 shadow-lg shadow-black/20">
          <div className="flex items-center gap-2 mb-6">
            <Award className="w-5 h-5 text-white/60" />
            <span 
              className="text-xs uppercase tracking-[0.15em] text-white/60"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              License Breakdown
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profile.licenses.map((license) => (
              <div 
                key={license.discipline}
                className="relative bg-white/[0.02] border border-white/[0.08] rounded p-5 overflow-hidden hover:bg-white/[0.04] hover:border-white/20 transition-all duration-200"
              >
                {/* License Class Badge */}
                <div 
                  className="absolute top-0 right-0 w-16 h-16 flex items-center justify-center shadow-lg"
                  style={{ 
                    backgroundColor: getLicenseColor(license.licenseClass),
                    clipPath: 'polygon(100% 0, 0 0, 100% 100%)'
                  }}
                >
                  <span className="absolute top-2 right-2 text-lg font-bold text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                    {license.licenseClass}
                  </span>
                </div>

                <div className="pr-12">
                  <div className="text-[10px] uppercase tracking-[0.15em] text-white/50 mb-1">
                    {getDisciplineLabel(license.discipline)}
                  </div>
                  <div className="text-lg font-semibold mb-4" style={{ fontFamily: 'Orbitron, sans-serif', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                    Class {license.licenseClass} License
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/50 mb-1">
                      Safety Rating
                    </div>
                    <div className="text-xl font-mono font-bold text-green-400">
                      {license.safetyRating.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/50 mb-1">
                      iRating
                    </div>
                    <div className="text-xl font-mono font-bold text-blue-400">
                      {license.iRating ?? '—'}
                    </div>
                  </div>
                </div>

                {/* SR Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-[10px] uppercase tracking-wider text-white/50 mb-1">
                    <span>SR Progress</span>
                    <span>{license.safetyRating.toFixed(2)} / 4.00</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
                      style={{ width: `${(license.safetyRating / 4) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* License Legend */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-4 shadow-lg shadow-black/20">
          <div className="text-[10px] uppercase tracking-[0.15em] text-white/50 mb-3">License Classes</div>
          <div className="flex flex-wrap gap-4">
            {['R', 'D', 'C', 'B', 'A', 'Pro'].map((cls) => (
              <div key={cls} className="flex items-center gap-2">
                <div 
                  className="w-5 h-5 rounded-sm shadow-md"
                  style={{ backgroundColor: getLicenseColor(cls) }}
                />
                <span className="text-xs text-white/60">
                  {cls === 'R' ? 'Rookie' : cls === 'Pro' ? 'Pro' : `Class ${cls}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
