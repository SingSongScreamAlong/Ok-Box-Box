import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createLeague } from '../lib/leagues';

export function CreateLeague() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.6;
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError('');
    setLoading(true);

    const { data, error } = await createLeague(name, user.id, description);

    if (error) {
      setError(error);
      setLoading(false);
    } else if (data) {
      navigate(`/league/${data.id}`);
    }
  };

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

      <div className="relative z-10 max-w-xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 
            className="text-xl uppercase tracking-[0.15em] font-semibold text-white mb-2"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Create League
          </h1>
          <p className="text-sm text-white/50">
            Set up a new league for races and championships
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-[--surface]/80 backdrop-blur-sm border border-[--border] p-6 space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-white/50 mb-2">
                League Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="e.g. Sunday Night Racing League"
                required
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-white/50 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input min-h-[80px]"
                placeholder="Brief description of your league..."
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/leagues')}
              className="btn btn-outline flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="btn btn-primary flex-1"
            >
              {loading ? 'Creating...' : 'Create League'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
