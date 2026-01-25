import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createDriverProfile } from '../lib/driverProfile';
import { Hash, User, AlertTriangle, ExternalLink } from 'lucide-react';

export function CreateDriverProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(user?.user_metadata?.display_name || '');
  const [iRacingId, setIRacingId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate iRacing ID is provided
    if (!iRacingId.trim()) {
      setError('iRacing Customer ID is required to create a driver profile');
      return;
    }

    setError('');
    setLoading(true);

    const { error } = await createDriverProfile(
      user.id,
      displayName,
      iRacingId
    );

    if (error) {
      setError(error);
      setLoading(false);
    } else {
      navigate('/driver/home');
    }
  };

  const isValid = displayName.trim() && iRacingId.trim();

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 
          className="text-xl uppercase tracking-[0.15em] font-semibold text-white mb-2"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          Create Driver Profile
        </h1>
        <p className="text-sm text-white/50">
          Link your iRacing account to unlock the full Ok, Box Box experience
        </p>
      </div>

      {/* iRacing Requirement Notice */}
      <div className="mb-6 p-4 bg-[#f97316]/10 border border-[#f97316]/30 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-[#f97316] flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-[#f97316]">iRacing Account Required</h3>
          <p className="text-xs text-white/60 mt-1">
            Ok, Box Box requires an iRacing account to function. Your iRacing data powers 
            the AI Engineer, Spotter, session tracking, and performance analysis.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-[--surface] border border-[--border] p-6 space-y-6">
          {/* Driver Name */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-white/50 mb-2">
              Driver Name *
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input"
                style={{ paddingLeft: '2.75rem' }}
                placeholder="Your driver name"
                required
              />
            </div>
            <p className="text-[10px] text-white/30 mt-1">
              This is how you'll appear in Ok, Box Box
            </p>
          </div>

          {/* iRacing Customer ID */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-white/50 mb-2">
              iRacing Customer ID *
            </label>
            <div className="relative">
              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                value={iRacingId}
                onChange={(e) => setIRacingId(e.target.value.replace(/\D/g, ''))}
                className="input"
                style={{ paddingLeft: '2.75rem' }}
                placeholder="123456"
                pattern="[0-9]*"
                required
              />
            </div>
            <p className="text-[10px] text-white/30 mt-1">
              Found in iRacing → My Account → Customer ID
            </p>
            <a 
              href="https://members.iracing.com/membersite/member/Home.do"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-[#f97316] hover:text-[#fb923c] mt-2"
            >
              Find your Customer ID on iRacing.com
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate('/driver/home')}
            className="btn btn-outline flex-1"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !isValid}
            className="btn btn-primary flex-1"
          >
            {loading ? 'Creating...' : 'Create Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
