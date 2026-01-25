import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserLeagues, LeagueWithRole } from '../lib/leagues';
import { Plus, Trophy } from 'lucide-react';

export function Leagues() {
  const { user } = useAuth();
  const [leagues, setLeagues] = useState<LeagueWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (user) {
      loadLeagues();
    }
  }, [user]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.6;
    }
  }, []);

  const loadLeagues = async () => {
    if (!user) return;
    const data = await getUserLeagues(user.id);
    setLeagues(data);
    setLoading(false);
  };

  return (
    <div className="min-h-screen relative">
      {/* Background video - more visible */}
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
          <source src="/videos/bg-1.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0e]/80 via-[#0e0e0e]/60 to-[#0e0e0e]/40" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0e0e0e]/80" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 
              className="text-xl uppercase tracking-[0.15em] font-semibold text-white mb-2"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              Leagues
            </h1>
            <p className="text-sm text-white/50">
              Manage your league memberships
            </p>
          </div>
          <Link to="/create-league" className="btn btn-primary text-xs flex items-center gap-2">
            <Plus size={16} />
            Create League
          </Link>
        </div>

        {loading ? (
          <div className="text-white/40">Loading leagues...</div>
        ) : leagues.length === 0 ? (
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.12] rounded p-8 text-center shadow-lg shadow-black/20">
            <Trophy size={48} className="mx-auto mb-4 text-white/20" />
            <h2 className="text-lg text-white/90 mb-2">No Leagues Yet</h2>
            <p className="text-sm text-white/50 mb-6">
              Create a league to organize races, championships, and special events.
            </p>
            <Link to="/create-league" className="btn btn-primary text-xs">
              Create Your First League
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {leagues.map((league) => (
              <Link
                key={league.id}
                to={`/league/${league.id}`}
                className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-6 hover:border-white/20 hover:bg-white/[0.05] transition-all shadow-lg shadow-black/20 group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 
                      className="text-sm uppercase tracking-[0.12em] font-semibold text-white/90 group-hover:text-white transition-colors"
                      style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                      {league.name}
                    </h3>
                    <p className="text-xs text-white/40 mt-1">
                      {league.role === 'owner' ? 'Owner' : league.role === 'admin' ? 'Admin' : league.role === 'steward' ? 'Steward' : 'Member'}
                    </p>
                    {league.description && (
                      <p className="text-xs text-white/30 mt-2 line-clamp-1">{league.description}</p>
                    )}
                  </div>
                  <div className="text-xs text-white/30">
                    Created {new Date(league.created_at).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
