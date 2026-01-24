import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserTeams, TeamWithRole } from '../lib/teams';
import { Plus, Users } from 'lucide-react';

export function Teams() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<TeamWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (user) {
      loadTeams();
    }
  }, [user]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.6;
    }
  }, []);

  const loadTeams = async () => {
    if (!user) return;
    const data = await getUserTeams(user.id);
    setTeams(data);
    setLoading(false);
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
          <source src="/videos/team-bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 
              className="text-xl uppercase tracking-[0.15em] font-semibold text-white mb-2"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              Teams
            </h1>
            <p className="text-sm text-white/50">
              Manage your team memberships
            </p>
          </div>
          <Link to="/create-team" className="btn btn-primary text-xs flex items-center gap-2">
            <Plus size={16} />
            Create Team
          </Link>
        </div>

        {loading ? (
          <div className="text-white/50">Loading teams...</div>
        ) : teams.length === 0 ? (
          <div className="bg-[--surface]/80 backdrop-blur-sm border border-[--border] p-8 text-center">
            <Users size={48} className="mx-auto mb-4 text-white/20" />
            <h2 className="text-lg text-white mb-2">No Teams Yet</h2>
            <p className="text-sm text-white/50 mb-6">
              Create a team to coordinate with other drivers and crew members.
            </p>
            <Link to="/create-team" className="btn btn-primary text-xs">
              Create Your First Team
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {teams.map((team) => (
              <Link
                key={team.id}
                to={`/team/${team.id}`}
                className="bg-[--surface]/80 backdrop-blur-sm border border-[--border] p-6 hover:border-[#f97316]/50 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 
                      className="text-sm uppercase tracking-[0.12em] font-semibold text-white group-hover:text-[#f97316] transition-colors"
                      style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                      {team.name}
                    </h3>
                    <p className="text-xs text-white/40 mt-1">
                      {team.role === 'owner' ? 'Owner' : team.role === 'manager' ? 'Manager' : 'Member'}
                    </p>
                  </div>
                  <div className="text-xs text-white/30">
                    Created {new Date(team.created_at).toLocaleDateString()}
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
