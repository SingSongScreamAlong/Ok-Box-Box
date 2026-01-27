import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserTeams, getTeamMembers, TeamWithRole } from '../lib/teams';
import { 
  Plus, Users, Crown, Shield, User, ChevronRight, 
  Gauge, Calendar, Activity, Loader2, ArrowLeft
} from 'lucide-react';

interface TeamCardData extends TeamWithRole {
  memberCount?: number;
}

export function Teams() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<TeamCardData[]>([]);
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
    
    // Fetch member counts for each team
    const teamsWithCounts = await Promise.all(
      data.map(async (team) => {
        const members = await getTeamMembers(team.id);
        return { ...team, memberCount: members.length };
      })
    );
    
    setTeams(teamsWithCounts);
    setLoading(false);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return Crown;
      case 'manager': return Shield;
      default: return User;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'text-[#f97316] bg-[#f97316]/10 border-[#f97316]/30';
      case 'manager': return 'text-[#3b82f6] bg-[#3b82f6]/10 border-[#3b82f6]/30';
      default: return 'text-white/60 bg-white/5 border-white/10';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Owner';
      case 'manager': return 'Manager';
      default: return 'Driver';
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
          className="w-full h-full object-cover opacity-70"
        >
          <source src="/videos/team-bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0e]/90 via-[#0e0e0e]/70 to-[#0e0e0e]/50" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0e0e0e]/90" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-8">
        {/* Back Link */}
        <Link 
          to="/driver/home" 
          className="inline-flex items-center gap-2 text-xs text-white/50 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to Cockpit
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 
              className="text-2xl uppercase tracking-[0.2em] font-bold text-white mb-2"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              Your Teams
            </h1>
            <p className="text-sm text-white/50">
              Collaborate with your racing teams and crew
            </p>
          </div>
          <Link 
            to="/create-team" 
            className="flex items-center gap-2 px-4 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs uppercase tracking-wider font-semibold rounded transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Team
          </Link>
        </div>

        {/* Stats Overview */}
        {!loading && teams.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#3b82f6]/10 border border-[#3b82f6]/30 rounded flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#3b82f6]" />
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-white">{teams.length}</div>
                  <div className="text-[10px] uppercase tracking-wider text-white/40">Teams</div>
                </div>
              </div>
            </div>
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#f97316]/10 border border-[#f97316]/30 rounded flex items-center justify-center">
                  <Crown className="w-5 h-5 text-[#f97316]" />
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-white">
                    {teams.filter(t => t.role === 'owner').length}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-white/40">Owned</div>
                </div>
              </div>
            </div>
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/10 border border-green-500/30 rounded flex items-center justify-center">
                  <Activity className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-white">
                    {teams.reduce((acc, t) => acc + (t.memberCount || 0), 0)}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-white/40">Total Members</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#3b82f6]" />
              <span className="text-white/50 text-sm">Loading teams...</span>
            </div>
          </div>
        ) : teams.length === 0 ? (
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded-lg p-12 text-center">
            <div className="w-20 h-20 bg-[#3b82f6]/10 border border-[#3b82f6]/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-[#3b82f6]" />
            </div>
            <h2 
              className="text-xl uppercase tracking-wider text-white mb-3"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              No Teams Yet
            </h2>
            <p className="text-sm text-white/50 mb-8 max-w-md mx-auto">
              Teams let you coordinate with other drivers and crew members. 
              Share telemetry, plan strategies, and communicate in real-time during races.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link 
                to="/create-team" 
                className="flex items-center gap-2 px-6 py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs uppercase tracking-wider font-semibold rounded transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Your First Team
              </Link>
            </div>
            
            {/* Features */}
            <div className="grid grid-cols-3 gap-4 mt-12 pt-8 border-t border-white/[0.06]">
              <div className="text-center">
                <Gauge className="w-6 h-6 text-[#3b82f6] mx-auto mb-2" />
                <div className="text-xs text-white/70 font-medium">Shared Telemetry</div>
                <div className="text-[10px] text-white/40 mt-1">Real-time data sharing</div>
              </div>
              <div className="text-center">
                <Users className="w-6 h-6 text-[#3b82f6] mx-auto mb-2" />
                <div className="text-xs text-white/70 font-medium">Team Pitwall</div>
                <div className="text-[10px] text-white/40 mt-1">Coordinate strategies</div>
              </div>
              <div className="text-center">
                <Activity className="w-6 h-6 text-[#3b82f6] mx-auto mb-2" />
                <div className="text-xs text-white/70 font-medium">Live Tracking</div>
                <div className="text-[10px] text-white/40 mt-1">Monitor all drivers</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {teams.map((team) => {
              const RoleIcon = getRoleIcon(team.role);
              return (
                <Link
                  key={team.id}
                  to={`/team/${team.id}`}
                  className="group bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-lg overflow-hidden hover:border-[#3b82f6]/50 hover:bg-white/[0.05] transition-all duration-300"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      {/* Left: Team Info */}
                      <div className="flex items-start gap-4">
                        {/* Team Avatar */}
                        <div className="w-14 h-14 bg-gradient-to-br from-[#3b82f6]/20 to-[#3b82f6]/5 border border-[#3b82f6]/30 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span 
                            className="text-xl font-bold text-[#3b82f6]"
                            style={{ fontFamily: 'Orbitron, sans-serif' }}
                          >
                            {team.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        
                        <div>
                          <h3 
                            className="text-lg font-semibold text-white group-hover:text-[#3b82f6] transition-colors"
                            style={{ fontFamily: 'Orbitron, sans-serif' }}
                          >
                            {team.name}
                          </h3>
                          
                          {/* Role Badge */}
                          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] uppercase tracking-wider font-medium mt-2 border ${getRoleColor(team.role)}`}>
                            <RoleIcon className="w-3 h-3" />
                            {getRoleLabel(team.role)}
                          </div>
                        </div>
                      </div>

                      {/* Right: Stats & Arrow */}
                      <div className="flex items-center gap-6">
                        {/* Stats */}
                        <div className="flex items-center gap-6 text-right">
                          <div>
                            <div className="flex items-center gap-1.5 justify-end text-white/80">
                              <Users className="w-3.5 h-3.5 text-white/40" />
                              <span className="text-sm font-mono">{team.memberCount || 0}</span>
                            </div>
                            <div className="text-[10px] text-white/40 uppercase tracking-wider">Members</div>
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 justify-end text-white/80">
                              <Calendar className="w-3.5 h-3.5 text-white/40" />
                              <span className="text-sm font-mono">
                                {new Date(team.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                            <div className="text-[10px] text-white/40 uppercase tracking-wider">Created</div>
                          </div>
                        </div>

                        {/* Arrow */}
                        <div className="w-10 h-10 bg-white/[0.03] border border-white/[0.08] rounded-lg flex items-center justify-center group-hover:bg-[#3b82f6]/10 group-hover:border-[#3b82f6]/30 transition-all">
                          <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-[#3b82f6] transition-colors" />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Bottom Bar - Quick Actions Hint */}
                  <div className="px-6 py-3 bg-white/[0.02] border-t border-white/[0.06] flex items-center justify-between">
                    <div className="flex items-center gap-4 text-[10px] text-white/40 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <Gauge className="w-3 h-3" />
                        Pitwall
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Activity className="w-3 h-3" />
                        Live Session
                      </span>
                    </div>
                    <span className="text-[10px] text-white/30 uppercase tracking-wider group-hover:text-[#3b82f6]/70 transition-colors">
                      Enter Team →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
