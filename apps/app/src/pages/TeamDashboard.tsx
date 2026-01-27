import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getTeam, getUserTeamRole, getTeamMembers, Team, TeamMembership } from '../lib/teams';
import { 
  Users, Radio, Target, BarChart3,
  Play, GitCompare, Calendar, Fuel, AlertTriangle
} from 'lucide-react';
import { WeatherWidget } from '../components/WeatherWidget';

export function TeamDashboard() {
  const { teamId } = useParams<{ teamId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [role, setRole] = useState<'owner' | 'manager' | 'member' | null>(null);
  const [members, setMembers] = useState<TeamMembership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (teamId && user) {
      loadTeamData();
    }
  }, [teamId, user]);

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
      <div className="flex-1 flex items-center justify-center">
        <div className="text-white/50">Loading team...</div>
      </div>
    );
  }

  if (!team) {
    return null;
  }

  const isOwnerOrManager = role === 'owner' || role === 'manager';

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 
            className="text-lg uppercase tracking-[0.15em] font-semibold text-white"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Dashboard
          </h1>
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[#3b82f6]/20 text-[#3b82f6] border border-[#3b82f6]/30 font-semibold">
            {role}
          </span>
        </div>
        <p className="text-xs text-white/50">Team overview and quick access</p>
      </div>

      <div className="grid gap-6">
          {/* Quick Actions Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Link 
              to={`/team/${teamId}/pitwall`}
              className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.12] rounded p-4 hover:border-[#f97316]/50 hover:bg-white/[0.05] transition-all group"
            >
              <Radio size={20} className="text-[#f97316] mb-2" />
              <p className="text-sm font-medium text-white">Pit Wall</p>
              <p className="text-[10px] text-white/40 mt-1">Live operations</p>
            </Link>
            <Link 
              to={`/team/${teamId}/pitwall/race`}
              className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.12] rounded p-4 hover:border-green-500/50 hover:bg-white/[0.05] transition-all group"
            >
              <Play size={20} className="text-green-400 mb-2" />
              <p className="text-sm font-medium text-white">Race Viewer</p>
              <p className="text-[10px] text-white/40 mt-1">Live telemetry</p>
            </Link>
            <Link 
              to={`/team/${teamId}/pitwall/strategy`}
              className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.12] rounded p-4 hover:border-purple-500/50 hover:bg-white/[0.05] transition-all group"
            >
              <Target size={20} className="text-purple-400 mb-2" />
              <p className="text-sm font-medium text-white">Strategy</p>
              <p className="text-[10px] text-white/40 mt-1">Race engineering</p>
            </Link>
            <Link 
              to={`/team/${teamId}/pitwall/practice`}
              className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.12] rounded p-4 hover:border-blue-500/50 hover:bg-white/[0.05] transition-all group"
            >
              <BarChart3 size={20} className="text-blue-400 mb-2" />
              <p className="text-sm font-medium text-white">Practice</p>
              <p className="text-[10px] text-white/40 mt-1">Session analysis</p>
            </Link>
          </div>

          {/* Tools Grid */}
          <div>
            <h2 
              className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/40 mb-3"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              Team Tools
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Link 
                to={`/team/${teamId}/pitwall/compare`}
                className="bg-white/[0.03] border border-white/[0.10] rounded p-4 hover:border-cyan-500/50 hover:bg-white/[0.05] transition-all"
              >
                <GitCompare size={18} className="text-cyan-400 mb-2" />
                <p className="text-sm text-white">Driver Comparison</p>
                <p className="text-[10px] text-white/40 mt-1">Compare lap data</p>
              </Link>
              <Link 
                to={`/team/${teamId}/pitwall/stint-planner`}
                className="bg-white/[0.03] border border-white/[0.10] rounded p-4 hover:border-amber-500/50 hover:bg-white/[0.05] transition-all"
              >
                <Fuel size={18} className="text-amber-400 mb-2" />
                <p className="text-sm text-white">Stint Planner</p>
                <p className="text-[10px] text-white/40 mt-1">Endurance strategy</p>
              </Link>
              <Link 
                to={`/team/${teamId}/pitwall/roster`}
                className="bg-white/[0.03] border border-white/[0.10] rounded p-4 hover:border-pink-500/50 hover:bg-white/[0.05] transition-all"
              >
                <Users size={18} className="text-pink-400 mb-2" />
                <p className="text-sm text-white">Roster</p>
                <p className="text-[10px] text-white/40 mt-1">Driver profiles</p>
              </Link>
              <Link 
                to={`/team/${teamId}/pitwall/planning`}
                className="bg-white/[0.03] border border-white/[0.10] rounded p-4 hover:border-indigo-500/50 hover:bg-white/[0.05] transition-all"
              >
                <Calendar size={18} className="text-indigo-400 mb-2" />
                <p className="text-sm text-white">Planning</p>
                <p className="text-[10px] text-white/40 mt-1">Event schedule</p>
              </Link>
            </div>
          </div>

          {/* Weather Widget */}
          <div>
            <h2 
              className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/40 mb-3"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              Track Conditions
            </h2>
            <WeatherWidget variant="full" trackName="Next Event Track" />
          </div>

          {/* Team Members */}
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-6 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between mb-4">
              <h2 
                className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/40"
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
                className="inline-block mt-4 text-xs text-white/50 hover:text-white/80 transition-colors"
              >
                Manage members →
              </Link>
            )}
          </div>

          {/* Team Info */}
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-6 shadow-lg shadow-black/20">
            <h2 
              className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/40 mb-4"
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
  );
}
