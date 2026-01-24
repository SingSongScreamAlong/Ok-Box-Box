import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getTeam, getUserTeamRole, getTeamMembers, Team, TeamMembership } from '../lib/teams';
import { Settings, Users, ArrowLeft } from 'lucide-react';

export function TeamDashboard() {
  const { teamId } = useParams<{ teamId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [role, setRole] = useState<'owner' | 'manager' | 'member' | null>(null);
  const [members, setMembers] = useState<TeamMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (teamId && user) {
      loadTeamData();
    }
  }, [teamId, user]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.6;
    }
  }, []);

  const loadTeamData = async () => {
    if (!teamId || !user) return;

    const [teamData, userRole, teamMembers] = await Promise.all([
      getTeam(teamId),
      getUserTeamRole(teamId, user.id),
      getTeamMembers(teamId)
    ]);

    if (!teamData || !userRole) {
      navigate('/teams');
      return;
    }

    setTeam(teamData);
    setRole(userRole);
    setMembers(teamMembers);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/50">Loading team...</div>
      </div>
    );
  }

  if (!team) {
    return null;
  }

  const isOwnerOrManager = role === 'owner' || role === 'manager';

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
        {/* Back link */}
        <Link to="/teams" className="inline-flex items-center gap-2 text-xs text-white/50 hover:text-white mb-6 transition-colors">
          <ArrowLeft size={14} />
          Back to Teams
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 
                className="text-xl uppercase tracking-[0.15em] font-semibold text-white"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                {team.name}
              </h1>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/30 font-semibold">
                {role}
              </span>
            </div>
            <p className="text-sm text-white/50">
              Team Dashboard
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link to={`/team/${teamId}/pitwall`} className="btn btn-primary text-xs flex items-center gap-2">
              Pit Wall →
            </Link>
            {isOwnerOrManager && (
              <Link to={`/team/${teamId}/settings`} className="btn btn-outline text-xs flex items-center gap-2">
                <Settings size={14} />
                Settings
              </Link>
            )}
          </div>
        </div>

        <div className="grid gap-6">
          {/* Pit Wall Quick Access */}
          <Link 
            to={`/team/${teamId}/pitwall`}
            className="block bg-[--surface]/80 backdrop-blur-sm border border-[--border] p-6 hover:border-[#f97316]/30 transition-colors group"
          >
            <h2 
              className="text-xs uppercase tracking-[0.12em] font-semibold text-[#f97316] mb-4"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              Pit Wall
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/70 mb-1">Team Operations Center</p>
                <p className="text-xs text-white/40">
                  Live timing, strategy, practice analysis, and race coordination
                </p>
              </div>
              <span className="text-[#f97316] group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </Link>

          {/* Team Members */}
          <div className="bg-[--surface]/80 backdrop-blur-sm border border-[--border] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 
                className="text-xs uppercase tracking-[0.12em] font-semibold text-white"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                Team Members
              </h2>
              <div className="flex items-center gap-2 text-xs text-white/40">
                <Users size={14} />
                {members.length} {members.length === 1 ? 'member' : 'members'}
              </div>
            </div>
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/50">
                      {member.user_id.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm text-white">{member.user_id.slice(0, 8)}...</p>
                      <p className="text-[10px] text-white/40">{member.role}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-white/30">
                    Joined {new Date(member.joined_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
            {isOwnerOrManager && (
              <Link 
                to={`/team/${teamId}/settings`} 
                className="inline-block mt-4 text-xs text-[#f97316]/70 hover:text-[#f97316] transition-colors"
              >
                Manage members →
              </Link>
            )}
          </div>

          {/* Team Info */}
          <div className="bg-[--surface]/80 backdrop-blur-sm border border-[--border] p-6">
            <h2 
              className="text-xs uppercase tracking-[0.12em] font-semibold text-white/50 mb-4"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              Team Info
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-white/50">Team ID</span>
                <span className="text-white/70 font-mono text-xs">{team.id.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Created</span>
                <span className="text-white/70">
                  {new Date(team.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
