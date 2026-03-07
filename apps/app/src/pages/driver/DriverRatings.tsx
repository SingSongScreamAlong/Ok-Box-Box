import { useEffect, useRef } from 'react';
import { useDriverData } from '../../hooks/useDriverData';
import { getDisciplineLabel, getLicenseColor } from '../../lib/driverService';
import { Award, Shield, TrendingUp, Loader2 } from 'lucide-react';
import { VIDEO_PLAYBACK_RATE } from '../../lib/config';

export function DriverRatings() {
  const { profile, loading } = useDriverData();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = VIDEO_PLAYBACK_RATE;
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

      <div className="relative z-10 max-w-6xl mx-auto space-y-4 py-4 px-4">
        {/* Header */}
        <div className="mb-4">
          <h1 
            className="text-2xl font-bold uppercase tracking-wider"
            style={{ fontFamily: 'Orbitron, sans-serif', textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
          >
            Ratings & Licensing
          </h1>
        </div>

        {/* Overall Ratings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className={`bg-white/[0.03] backdrop-blur-xl border rounded p-4 transition-all duration-200 ${
            (profile.safetyRatingOverall ?? 0) >= 2.5 
              ? 'border-green-500/30 hover:border-green-500/50' 
              : 'border-amber-500/30 hover:border-amber-500/50'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Shield className={`w-4 h-4 ${(profile.safetyRatingOverall ?? 0) >= 2.5 ? 'text-green-400' : 'text-amber-400'}`} />
              <span className={`text-[10px] uppercase tracking-[0.15em] ${(profile.safetyRatingOverall ?? 0) >= 2.5 ? 'text-green-400' : 'text-amber-400'}`}>Safety Rating</span>
            </div>
            <div className={`text-3xl font-mono font-bold ${(profile.safetyRatingOverall ?? 0) >= 2.5 ? 'text-green-400' : 'text-amber-400'}`}>
              {profile.safetyRatingOverall?.toFixed(2) ?? '—'}
            </div>
            <div className="mt-1 text-[10px] text-white/40">
              Across all active disciplines
            </div>
          </div>
          <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded p-4 hover:border-white/20 transition-all duration-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-400/70" />
              <span className="text-[10px] uppercase tracking-[0.15em] text-blue-400/70">iRating</span>
            </div>
            <div className="text-3xl font-mono font-bold text-blue-400/80">
              {profile.iRatingOverall ?? '—'}
            </div>
            <div className="mt-1 text-[10px] text-white/40">
              Highest active discipline
            </div>
          </div>
        </div>

        {/* License Cards */}
        <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded p-4">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-white/50" />
            <span className="text-[10px] uppercase tracking-[0.15em] text-white/50">License Breakdown</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {profile.licenses.map((license) => {
              const sr = license.safetyRating;
              const srColor = sr >= 3.0 ? 'bg-green-500' : sr >= 2.0 ? 'bg-amber-500' : 'bg-red-500';
              const srTextColor = sr >= 3.0 ? 'text-green-400' : sr >= 2.0 ? 'text-amber-400' : 'text-red-400';
              const licenseLabel = license.licenseClass === 'R' ? 'Rookie' : `Class ${license.licenseClass}`;
              
              return (
                <div 
                  key={license.discipline}
                  className="relative bg-white/[0.02] border border-white/[0.06] rounded p-4 overflow-hidden hover:bg-white/[0.03] hover:border-white/15 transition-all duration-200"
                >
                  {/* License Class Badge */}
                  <div 
                    className="absolute top-0 right-0 w-12 h-12 flex items-center justify-center"
                    style={{ 
                      backgroundColor: getLicenseColor(license.licenseClass),
                      clipPath: 'polygon(100% 0, 0 0, 100% 100%)'
                    }}
                  >
                    <span className="absolute top-1.5 right-1.5 text-sm font-bold text-white">
                      {license.licenseClass}
                    </span>
                  </div>

                  {/* Header: Discipline + License */}
                  <div className="pr-10 mb-3">
                    <div className="text-sm font-medium text-white/90">
                      {getDisciplineLabel(license.discipline)}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-white/40">
                      {licenseLabel} License
                    </div>
                  </div>

                  {/* SR | iRating row */}
                  <div className="flex items-baseline gap-4 mb-3">
                    <div>
                      <span className={`text-lg font-mono font-bold ${srTextColor}`}>{sr.toFixed(2)}</span>
                      <span className="text-[9px] text-white/40 ml-1">SR</span>
                    </div>
                    <div>
                      <span className="text-lg font-mono font-bold text-blue-400/80">{license.iRating ?? '—'}</span>
                      <span className="text-[9px] text-white/40 ml-1">iR</span>
                    </div>
                  </div>

                  {/* SR Progress Bar */}
                  <div className="relative">
                    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className={`h-full ${srColor} rounded-full transition-all duration-300`}
                        style={{ width: `${Math.min((sr / 4.99) * 100, 100)}%` }}
                      />
                    </div>
                    {/* Promotion threshold marker at 4.99 */}
                    <div className="absolute right-0 top-0 w-px h-1.5 bg-white/30" title="Max: 4.99" />
                    <div className="flex justify-between text-[9px] text-white/30 mt-0.5">
                      <span>{sr.toFixed(2)}</span>
                      <span>4.99</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* License Legend - Compact */}
        <div className="flex items-center gap-3 px-1">
          <span className="text-[9px] uppercase tracking-wider text-white/30">Classes:</span>
          <div className="flex items-center gap-2">
            {['R', 'D', 'C', 'B', 'A', 'Pro'].map((cls) => (
              <div key={cls} className="flex items-center gap-1">
                <div 
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: getLicenseColor(cls) }}
                />
                <span className="text-[9px] text-white/40">
                  {cls === 'R' ? 'R' : cls}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
