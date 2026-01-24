import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  getTeam, 
  getUserTeamRole, 
  getTeamMembers, 
  getTeamInvitations,
  updateTeam,
  deleteTeam,
  removeMember,
  updateMemberRole,
  createInvitation,
  Team, 
  TeamMembership,
  TeamInvitation
} from '../lib/teams';
import { ArrowLeft, Trash2, UserPlus, Mail } from 'lucide-react';

export function TeamSettings() {
  const { teamId } = useParams<{ teamId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [role, setRole] = useState<'owner' | 'manager' | 'member' | null>(null);
  const [members, setMembers] = useState<TeamMembership[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState('');
  const [saving, setSaving] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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

    const [teamData, userRole, teamMembers, teamInvites] = await Promise.all([
      getTeam(teamId),
      getUserTeamRole(teamId, user.id),
      getTeamMembers(teamId),
      getTeamInvitations(teamId)
    ]);

    if (!teamData || !userRole || (userRole !== 'owner' && userRole !== 'manager')) {
      navigate(`/team/${teamId}`);
      return;
    }

    setTeam(teamData);
    setTeamName(teamData.name);
    setRole(userRole);
    setMembers(teamMembers);
    setInvitations(teamInvites);
    setLoading(false);
  };

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamId || role !== 'owner') return;

    setSaving(true);
    setError('');
    setSuccess('');

    const { error } = await updateTeam(teamId, { name: teamName });

    if (error) {
      setError(error);
    } else {
      setSuccess('Team updated successfully');
      setTeam(prev => prev ? { ...prev, name: teamName } : null);
      setTimeout(() => setSuccess(''), 3000);
    }
    setSaving(false);
  };

  const handleDeleteTeam = async () => {
    if (!teamId || role !== 'owner') return;

    const confirmed = window.confirm(
      'Are you sure you want to delete this team? This action cannot be undone.'
    );

    if (!confirmed) return;

    const { error } = await deleteTeam(teamId);

    if (error) {
      setError(error);
    } else {
      navigate('/teams');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!teamId) return;

    const confirmed = window.confirm('Remove this member from the team?');
    if (!confirmed) return;

    const { error } = await removeMember(teamId, userId);

    if (error) {
      setError(error);
    } else {
      setMembers(prev => prev.filter(m => m.user_id !== userId));
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'manager' | 'member') => {
    if (!teamId || role !== 'owner') return;

    const { error } = await updateMemberRole(teamId, userId, newRole);

    if (error) {
      setError(error);
    } else {
      setMembers(prev => prev.map(m => 
        m.user_id === userId ? { ...m, role: newRole } : m
      ));
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamId || !user || !inviteEmail.trim()) return;

    setInviting(true);
    setError('');

    const { data, error } = await createInvitation(teamId, inviteEmail, user.id);

    if (error) {
      setError(error);
    } else if (data) {
      setInvitations(prev => [data, ...prev]);
      setInviteEmail('');
      setSuccess('Invitation sent!');
      setTimeout(() => setSuccess(''), 3000);
    }
    setInviting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/50">Loading...</div>
      </div>
    );
  }

  if (!team) {
    return null;
  }

  const isOwner = role === 'owner';

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

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-12">
        {/* Back link */}
        <Link to={`/team/${teamId}`} className="inline-flex items-center gap-2 text-xs text-white/50 hover:text-white mb-6 transition-colors">
          <ArrowLeft size={14} />
          Back to {team.name}
        </Link>

        <div className="mb-8">
          <h1 
            className="text-xl uppercase tracking-[0.15em] font-semibold text-white mb-2"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Team Settings
          </h1>
          <p className="text-sm text-white/50">
            Manage {team.name}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-3 bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
            {success}
          </div>
        )}

        <div className="space-y-6">
          {/* Team Details */}
          {isOwner && (
            <div className="bg-[--surface]/80 backdrop-blur-sm border border-[--border] p-6">
              <h2 
                className="text-xs uppercase tracking-[0.12em] font-semibold text-white mb-4"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                Team Details
              </h2>
              <form onSubmit={handleUpdateTeam} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-white/50 mb-2">
                    Team Name
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="input"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving || teamName === team.name}
                  className="btn btn-primary text-xs"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          )}

          {/* Invite Members */}
          <div className="bg-[--surface]/80 backdrop-blur-sm border border-[--border] p-6">
            <h2 
              className="text-xs uppercase tracking-[0.12em] font-semibold text-[#f97316] mb-4"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              Invite Members
            </h2>
            <form onSubmit={handleInvite} className="flex gap-3">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="input flex-1"
                placeholder="email@example.com"
                required
              />
              <button
                type="submit"
                disabled={inviting || !inviteEmail.trim()}
                className="btn btn-primary text-xs flex items-center gap-2"
              >
                <UserPlus size={14} />
                {inviting ? 'Sending...' : 'Invite'}
              </button>
            </form>

            {invitations.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs text-white/40 mb-3">Pending Invitations</p>
                <div className="space-y-2">
                  {invitations.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-white/30" />
                        <span className="text-sm text-white/70">{inv.email}</span>
                      </div>
                      <span className="text-[10px] text-white/30">
                        Expires {new Date(inv.expires_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Members */}
          <div className="bg-[--surface]/80 backdrop-blur-sm border border-[--border] p-6">
            <h2 
              className="text-xs uppercase tracking-[0.12em] font-semibold text-white mb-4"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              Members
            </h2>
            <div className="space-y-3">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/50">
                      {member.user_id.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm text-white">{member.user_id.slice(0, 8)}...</p>
                      <p className="text-[10px] text-white/40">
                        {member.user_id === user?.id ? 'You' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isOwner && member.role !== 'owner' ? (
                      <>
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.user_id, e.target.value as 'manager' | 'member')}
                          className="bg-transparent border border-white/10 text-xs text-white/70 px-2 py-1"
                        >
                          <option value="member">Member</option>
                          <option value="manager">Manager</option>
                        </select>
                        <button
                          onClick={() => handleRemoveMember(member.user_id)}
                          className="p-1 text-red-400/50 hover:text-red-400 transition-colors"
                          title="Remove member"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-[#f97316]">{member.role}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Danger Zone */}
          {isOwner && (
            <div className="bg-red-500/5 border border-red-500/20 p-6">
              <h2 
                className="text-xs uppercase tracking-[0.12em] font-semibold text-red-400 mb-4"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                Danger Zone
              </h2>
              <p className="text-sm text-white/50 mb-4">
                Permanently delete this team and remove all members.
              </p>
              <button
                onClick={handleDeleteTeam}
                className="btn bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 text-xs"
              >
                Delete Team
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
