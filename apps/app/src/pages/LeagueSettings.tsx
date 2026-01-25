import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  getLeague, 
  getUserLeagueRole, 
  getLeagueMembers, 
  getLeagueInvitations,
  updateLeague,
  deleteLeague,
  createLeagueInvitation,
  League, 
  LeagueMembership,
  LeagueInvitation
} from '../lib/leagues';
import { ArrowLeft, Trash2, UserPlus, Mail } from 'lucide-react';

export function LeagueSettings() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [league, setLeague] = useState<League | null>(null);
  const [role, setRole] = useState<'owner' | 'admin' | 'steward' | 'member' | null>(null);
  const [members, setMembers] = useState<LeagueMembership[]>([]);
  const [invitations, setInvitations] = useState<LeagueInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [leagueName, setLeagueName] = useState('');
  const [leagueDescription, setLeagueDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (leagueId && user) {
      loadLeagueData();
    }
  }, [leagueId, user]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.6;
    }
  }, []);

  const loadLeagueData = async () => {
    if (!leagueId || !user) return;

    const [leagueData, userRole, leagueMembers, leagueInvites] = await Promise.all([
      getLeague(leagueId),
      getUserLeagueRole(leagueId, user.id),
      getLeagueMembers(leagueId),
      getLeagueInvitations(leagueId)
    ]);

    if (!leagueData || !userRole || (userRole !== 'owner' && userRole !== 'admin')) {
      navigate(`/league/${leagueId}`);
      return;
    }

    setLeague(leagueData);
    setLeagueName(leagueData.name);
    setLeagueDescription(leagueData.description || '');
    setRole(userRole);
    setMembers(leagueMembers);
    setInvitations(leagueInvites);
    setLoading(false);
  };

  const handleUpdateLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leagueId || role !== 'owner') return;

    setSaving(true);
    setError('');
    setSuccess('');

    const { error } = await updateLeague(leagueId, { name: leagueName, description: leagueDescription });

    if (error) {
      setError(error);
    } else {
      setSuccess('League updated successfully');
      setLeague(prev => prev ? { ...prev, name: leagueName, description: leagueDescription } : null);
      setTimeout(() => setSuccess(''), 3000);
    }
    setSaving(false);
  };

  const handleDeleteLeague = async () => {
    if (!leagueId || role !== 'owner') return;

    const confirmed = window.confirm(
      'Are you sure you want to delete this league? This will delete all events and data. This action cannot be undone.'
    );

    if (!confirmed) return;

    const { error } = await deleteLeague(leagueId);

    if (error) {
      setError(error);
    } else {
      navigate('/leagues');
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leagueId || !user || !inviteEmail.trim()) return;

    setInviting(true);
    setError('');

    const { data, error } = await createLeagueInvitation(leagueId, inviteEmail, user.id);

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

  if (!league) {
    return null;
  }

  const isOwner = role === 'owner';

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

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-12">
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
            League Settings
          </h1>
          <p className="text-sm text-white/50">
            Manage {league.name}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-400 text-sm">
            {success}
          </div>
        )}

        <div className="space-y-6">
          {/* League Details */}
          {isOwner && (
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-6 shadow-lg shadow-black/20">
              <h2 
                className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/40 mb-4"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                League Details
              </h2>
              <form onSubmit={handleUpdateLeague} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-white/50 mb-2">
                    League Name
                  </label>
                  <input
                    type="text"
                    value={leagueName}
                    onChange={(e) => setLeagueName(e.target.value)}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-white/50 mb-2">
                    Description
                  </label>
                  <textarea
                    value={leagueDescription}
                    onChange={(e) => setLeagueDescription(e.target.value)}
                    className="input min-h-[80px]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving || (leagueName === league.name && leagueDescription === (league.description || ''))}
                  className="btn btn-primary text-xs"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          )}

          {/* Invite Members */}
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-6 shadow-lg shadow-black/20">
            <h2 
              className="text-[10px] uppercase tracking-[0.15em] font-semibold text-[#3b82f6] mb-4"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              Invite Staff
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
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-6 shadow-lg shadow-black/20">
            <h2 
              className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/40 mb-4"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              Staff & Admins
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
                  <span className="text-xs text-[#3b82f6]">{member.role}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Danger Zone */}
          {isOwner && (
            <div className="bg-red-500/5 border border-red-500/20 rounded p-6 shadow-lg shadow-black/20">
              <h2 
                className="text-[10px] uppercase tracking-[0.15em] font-semibold text-red-400 mb-4"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                Danger Zone
              </h2>
              <p className="text-sm text-white/50 mb-4">
                Permanently delete this league and all its events.
              </p>
              <button
                onClick={handleDeleteLeague}
                className="btn bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 text-xs"
              >
                Delete League
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
