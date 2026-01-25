import { useState, useEffect } from 'react';
import { fetchDriverProfile, DriverIdentityProfile, getDisciplineLabel, getLicenseColor } from '../../lib/driverService';
import { Award, Shield, TrendingUp, Loader2 } from 'lucide-react';

export function DriverRatings() {
  const [profile, setProfile] = useState<DriverIdentityProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDriverProfile().then((data) => {
      setProfile(data);
      setLoading(false);
    });
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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 
          className="text-2xl font-bold uppercase tracking-wider"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          Ratings & Licensing
        </h1>
        <p className="text-sm text-white/50 mt-1">Your iRacing license progression</p>
      </div>

      {/* Overall Ratings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-green-500" />
            <span className="text-[10px] uppercase tracking-wider text-white/40">Overall Safety Rating</span>
          </div>
          <div className="text-4xl font-mono font-bold">
            {profile.safetyRatingOverall?.toFixed(2) ?? '—'}
          </div>
          <div className="mt-2 text-xs text-white/50">
            Across all disciplines
          </div>
        </div>
        <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <span className="text-[10px] uppercase tracking-wider text-white/40">Overall iRating</span>
          </div>
          <div className="text-4xl font-mono font-bold">
            {profile.iRatingOverall ?? '—'}
          </div>
          <div className="mt-2 text-xs text-white/50">
            Primary discipline rating
          </div>
        </div>
      </div>

      {/* License Cards */}
      <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-6">
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
              className="relative bg-black/40 border border-white/10 p-5 overflow-hidden"
            >
              {/* License Class Badge */}
              <div 
                className="absolute top-0 right-0 w-16 h-16 flex items-center justify-center"
                style={{ 
                  backgroundColor: getLicenseColor(license.licenseClass),
                  clipPath: 'polygon(100% 0, 0 0, 100% 100%)'
                }}
              >
                <span className="absolute top-2 right-2 text-lg font-bold text-white">
                  {license.licenseClass}
                </span>
              </div>

              <div className="pr-12">
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
                  {getDisciplineLabel(license.discipline)}
                </div>
                <div className="text-lg font-semibold mb-4">
                  Class {license.licenseClass} License
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
                    Safety Rating
                  </div>
                  <div className="text-xl font-mono font-bold text-green-500">
                    {license.safetyRating.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
                    iRating
                  </div>
                  <div className="text-xl font-mono font-bold text-blue-500">
                    {license.iRating ?? '—'}
                  </div>
                </div>
              </div>

              {/* SR Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-[10px] uppercase tracking-wider text-white/40 mb-1">
                  <span>SR Progress</span>
                  <span>{license.safetyRating.toFixed(2)} / 4.00</span>
                </div>
                <div className="h-1.5 bg-white/10 overflow-hidden">
                  <div 
                    className="h-full bg-green-500"
                    style={{ width: `${(license.safetyRating / 4) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* License Legend */}
      <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-4">
        <div className="text-[10px] uppercase tracking-wider text-white/40 mb-3">License Classes</div>
        <div className="flex flex-wrap gap-3">
          {['R', 'D', 'C', 'B', 'A', 'Pro'].map((cls) => (
            <div key={cls} className="flex items-center gap-2">
              <div 
                className="w-4 h-4"
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
  );
}
