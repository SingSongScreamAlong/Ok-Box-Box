import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createDriverProfile } from '../lib/driverProfile';

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

    setError('');
    setLoading(true);

    const { error } = await createDriverProfile(
      user.id,
      displayName,
      iRacingId || undefined
    );

    if (error) {
      setError(error);
      setLoading(false);
    } else {
      navigate('/driver-profile');
    }
  };

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
          Set up your driver identity to start tracking sessions
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-[--surface] border border-[--border] p-6 space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-white/50 mb-2">
              Driver Name *
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="input"
              placeholder="Your driver name"
              required
            />
            <p className="text-[10px] text-white/30 mt-1">
              This is how you'll appear in Ok, Box Box
            </p>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-white/50 mb-2">
              iRacing Customer ID
            </label>
            <input
              type="text"
              value={iRacingId}
              onChange={(e) => setIRacingId(e.target.value.replace(/\D/g, ''))}
              className="input"
              placeholder="123456"
              pattern="[0-9]*"
            />
            <p className="text-[10px] text-white/30 mt-1">
              Found in iRacing under My Account. Used to link your sessions.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="btn btn-outline flex-1"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !displayName.trim()}
            className="btn btn-primary flex-1"
          >
            {loading ? 'Creating...' : 'Create Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
