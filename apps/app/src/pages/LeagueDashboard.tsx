import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getLeague, getUserLeagueRole, getLeagueMembers, League, LeagueMembership } from '../lib/leagues';
import { getLeagueEvents, Event } from '../lib/events';
import { Settings, Users, ArrowLeft, Calendar, Plus, AlertTriangle, Flag, Trophy } from 'lucide-react';

export function LeagueDashboard() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [league, setLeague] = useState<League | null>(null);
  const [role, setRole] = useState<'owner' | 'admin' | 'steward' | 'member' | null>(null);
  const [members, setMembers] = useState<LeagueMembership[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
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

    const [leagueData, userRole, leagueMembers, leagueEvents] = await Promise.all([
      getLeague(leagueId),
      getUserLeagueRole(leagueId, user.id),
      getLeagueMembers(leagueId),
      getLeagueEvents(leagueId)
    ]);

    if (!leagueData || !userRole) {
      navigate('/leagues');
      return;
    }

    setLeague(leagueData);
    setRole(userRole);
    setMembers(leagueMembers);
    setEvents(leagueEvents);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/50">Loading league...</div>
      </div>
    );
  }

  if (!league) {
    return null;
  }

  const isAdmin = role === 'owner' || role === 'admin';

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
        {/* Back link */}
        <Link to="/leagues" className="inline-flex items-center gap-2 text-xs text-white/50 hover:text-white mb-6 transition-colors">
          <ArrowLeft size={14} />
          Back to Leagues
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 
                className="text-xl uppercase tracking-[0.15em] font-semibold text-white"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                {league.name}
              </h1>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[#3b82f6]/20 text-[#3b82f6] border border-[#3b82f6]/30 font-semibold">
                {role}
              </span>
            </div>
            {league.description && (
              <p className="text-sm text-white/50">{league.description}</p>
            )}
          </div>
          {isAdmin && (
            <Link to={`/league/${leagueId}/settings`} className="btn btn-outline text-xs flex items-center gap-2">
              <Settings size={14} />
              Settings
            </Link>
          )}
        </div>

        <div className="grid gap-6">
          {/* Steward Actions - for admins/stewards */}
          {(role === 'owner' || role === 'admin' || role === 'steward') && (
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.12] rounded p-6 shadow-lg shadow-black/20">
              <div className="flex items-center justify-between mb-4">
                <h2 
                  className="text-[10px] uppercase tracking-[0.15em] font-semibold text-[#f97316]"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  Steward Actions
                </h2>
              </div>
              <div className="flex gap-3">
                <Link
                  to={`/league/${leagueId}/incidents`}
                  className="flex items-center gap-2 px-4 py-3 bg-white/[0.03] border border-white/[0.10] rounded hover:border-[#f97316]/50 hover:bg-white/[0.05] transition-all"
                >
                  <AlertTriangle size={16} className="text-[#f97316]" />
                  <div>
                    <p className="text-sm text-white font-medium">Incident Queue</p>
                    <p className="text-[10px] text-white/40">Review pending incidents</p>
                  </div>
                </Link>
                <Link
                  to={`/league/${leagueId}/penalties`}
                  className="flex items-center gap-2 px-4 py-3 bg-white/[0.03] border border-white/[0.10] rounded hover:border-red-500/50 hover:bg-white/[0.05] transition-all"
                >
                  <Flag size={16} className="text-red-400" />
                  <div>
                    <p className="text-sm text-white font-medium">Penalties</p>
                    <p className="text-[10px] text-white/40">Manage driver penalties</p>
                  </div>
                </Link>
                <Link
                  to={`/league/${leagueId}/championship`}
                  className="flex items-center gap-2 px-4 py-3 bg-white/[0.03] border border-white/[0.10] rounded hover:border-yellow-500/50 hover:bg-white/[0.05] transition-all"
                >
                  <Trophy size={16} className="text-yellow-400" />
                  <div>
                    <p className="text-sm text-white font-medium">Championship</p>
                    <p className="text-[10px] text-white/40">Standings & points</p>
                  </div>
                </Link>
              </div>
            </div>
          )}

          {/* Events */}
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.12] rounded p-6 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between mb-4">
              <h2 
                className="text-[10px] uppercase tracking-[0.15em] font-semibold text-[#3b82f6]"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                Events
              </h2>
              {isAdmin && (
                <Link to={`/league/${leagueId}/create-event`} className="btn btn-primary text-xs flex items-center gap-2">
                  <Plus size={14} />
                  Create Event
                </Link>
              )}
            </div>
            
            {events.length === 0 ? (
              <div className="text-center py-8">
                <Calendar size={32} className="mx-auto mb-3 text-white/20" />
                <p className="text-sm text-white/30 mb-2">No events scheduled</p>
                {isAdmin && (
                  <p className="text-xs text-white/20">
                    Create your first event to get started
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <Link
                    key={event.id}
                    to={`/event/${event.id}`}
                    className="block p-4 bg-white/5 border border-white/10 hover:border-[#3b82f6]/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm text-white font-medium">{event.name}</h3>
                        {event.track_name && (
                          <p className="text-xs text-white/40 mt-1">{event.track_name}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 font-semibold ${
                          event.status === 'live' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                          event.status === 'completed' ? 'bg-white/10 text-white/40 border border-white/20' :
                          event.status === 'cancelled' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          'bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/30'
                        }`}>
                          {event.status}
                        </span>
                        {event.scheduled_at && (
                          <p className="text-xs text-white/30 mt-1">
                            {new Date(event.scheduled_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Members */}
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-6 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between mb-4">
              <h2 
                className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/40"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                Staff & Admins
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
                </div>
              ))}
            </div>
            {isAdmin && (
              <Link 
                to={`/league/${leagueId}/settings`} 
                className="inline-block mt-4 text-xs text-white/50 hover:text-white/80 transition-colors"
              >
                Manage members →
              </Link>
            )}
          </div>

          {/* League Info */}
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-6 shadow-lg shadow-black/20">
            <h2 
              className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/40 mb-4"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              League Info
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-white/50">League ID</span>
                <span className="text-white/70 font-mono text-xs">{league.id.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Created</span>
                <span className="text-white/70">
                  {new Date(league.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
