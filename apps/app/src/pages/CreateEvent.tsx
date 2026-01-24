import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getLeague, getUserLeagueRole, League } from '../lib/leagues';
import { createEvent } from '../lib/events';
import { ArrowLeft } from 'lucide-react';

export function CreateEvent() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [league, setLeague] = useState<League | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trackName, setTrackName] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (leagueId && user) {
      loadLeague();
    }
  }, [leagueId, user]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.6;
    }
  }, []);

  const loadLeague = async () => {
    if (!leagueId || !user) return;

    const [leagueData, role] = await Promise.all([
      getLeague(leagueId),
      getUserLeagueRole(leagueId, user.id)
    ]);

    if (!leagueData || !role || (role !== 'owner' && role !== 'admin')) {
      navigate(`/league/${leagueId}`);
      return;
    }

    setLeague(leagueData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !leagueId) return;

    setError('');
    setLoading(true);

    const { data, error } = await createEvent(leagueId, name, user.id, {
      description: description || undefined,
      track_name: trackName || undefined,
      scheduled_at: scheduledAt || undefined
    });

    if (error) {
      setError(error);
      setLoading(false);
    } else if (data) {
      navigate(`/event/${data.id}`);
    }
  };

  if (!league) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/50">Loading...</div>
      </div>
    );
  }

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
        {/* Back link */}
        <Link to={`/league/${leagueId}`} className="inline-flex items-center gap-2 text-xs text-white/50 hover:text-white mb-6 transition-colors">
          <ArrowLeft size={14} />
          Back to {league.name}
        </Link>

        <div className="mb-8">
          <h1 
            className="text-xl uppercase tracking-[0.15em] font-semibold text-white mb-2"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Create Event
          </h1>
          <p className="text-sm text-white/50">
            Schedule a new race or event for {league.name}
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
                Event Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="e.g. Round 1 - Daytona 500"
                required
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-white/50 mb-2">
                Track
              </label>
              <input
                type="text"
                value={trackName}
                onChange={(e) => setTrackName(e.target.value)}
                className="input"
                placeholder="e.g. Daytona International Speedway"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-white/50 mb-2">
                Date & Time
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="input"
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
                placeholder="Event details, rules, etc..."
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate(`/league/${leagueId}`)}
              className="btn btn-outline flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="btn btn-primary flex-1"
            >
              {loading ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
