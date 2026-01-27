import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { UserPlus, Search, Filter, Users, Crown, Wrench, User } from 'lucide-react';

// Types from legacy
interface DriverSummary {
  membership_id: string;
  driver_id: string;
  user_id: string;
  display_name: string;
  role: string;
  access_scope: string;
  joined_at: string;
  total_sessions?: number;
  total_laps?: number;
  avg_incident_rate?: number;
  traits?: string[];
  irating?: number;
  safety_rating?: number;
}

interface TeamRosterView {
  team_id: string;
  team_name: string;
  member_count: number;
  members: DriverSummary[];
}

// Mock data from legacy
const mockRoster: TeamRosterView = {
  team_id: 'demo',
  team_name: 'Throttle Works Racing',
  member_count: 4,
  members: [
    {
      membership_id: '1',
      driver_id: 'd1',
      user_id: 'u1',
      display_name: 'Alex Rivera',
      role: 'owner',
      access_scope: 'team_deep',
      joined_at: '2025-06-15T10:00:00Z',
      total_sessions: 42,
      total_laps: 1847,
      avg_incident_rate: 1.8,
      traits: ['Consistent', 'Fuel Saver', 'Night Specialist'],
      irating: 4856,
      safety_rating: 4.67
    },
    {
      membership_id: '2',
      driver_id: 'd2',
      user_id: 'u2',
      display_name: 'Jordan Chen',
      role: 'team_principal',
      access_scope: 'team_deep',
      joined_at: '2025-08-22T14:30:00Z',
      total_sessions: 38,
      total_laps: 1523,
      avg_incident_rate: 2.1,
      traits: ['Aggressive', 'Wet Weather', 'Quick Qualifier'],
      irating: 5234,
      safety_rating: 3.21
    },
    {
      membership_id: '3',
      driver_id: 'd3',
      user_id: 'u3',
      display_name: 'Sam Williams',
      role: 'team_engineer',
      access_scope: 'team_deep',
      joined_at: '2025-09-10T09:15:00Z',
      total_sessions: 29,
      total_laps: 1102,
      avg_incident_rate: 2.4,
      traits: ['Tire Management', 'Endurance'],
      irating: 3876,
      safety_rating: 4.21
    },
    {
      membership_id: '4',
      driver_id: 'd4',
      user_id: 'u4',
      display_name: 'Casey Morgan',
      role: 'driver',
      access_scope: 'team_standard',
      joined_at: '2025-12-01T16:45:00Z',
      total_sessions: 15,
      total_laps: 624,
      avg_incident_rate: 3.2,
      traits: ['Rookie'],
      irating: 1842,
      safety_rating: 2.87
    }
  ]
};

// Role badge styling
const roleStyles: Record<string, { class: string; icon: any; label: string }> = {
  owner: { class: 'bg-[#f97316]/20 text-[#f97316] border-[#f97316]/30', icon: Crown, label: 'Owner' },
  team_principal: { class: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: User, label: 'Principal' },
  team_engineer: { class: 'bg-[#3b82f6]/20 text-[#3b82f6] border-[#3b82f6]/30', icon: Wrench, label: 'Engineer' },
  driver: { class: 'bg-white/10 text-white/60 border-white/20', icon: User, label: 'Driver' }
};

export function PitwallRoster() {
  const { teamId } = useParams<{ teamId: string }>();
  const [roster, setRoster] = useState<TeamRosterView | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  useEffect(() => {
    const fetchRoster = async () => {
      setLoading(true);
      if (teamId === 'demo') {
        await new Promise(r => setTimeout(r, 400));
      }
      setRoster(mockRoster);
      setLoading(false);
    };
    fetchRoster();
  }, [teamId]);

  const filteredMembers = roster?.members.filter(m =>
    m.display_name.toLowerCase().includes(filter.toLowerCase()) ||
    m.role.toLowerCase().includes(filter.toLowerCase())
  ) || [];

  // Team totals
  const totals = roster ? {
    sessions: roster.members.reduce((sum, m) => sum + (m.total_sessions || 0), 0),
    laps: roster.members.reduce((sum, m) => sum + (m.total_laps || 0), 0),
    avgInc: roster.members.reduce((s, m) => s + (m.avg_incident_rate || 0), 0) / roster.members.length
  } : { sessions: 0, laps: 0, avgInc: 0 };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-white/50">Loading roster...</div>
      </div>
    );
  }

  if (!roster) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-6">
        <div>
          <h1 
            className="text-xl font-bold tracking-wide uppercase text-white"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Team Roster
          </h1>
          <p className="text-sm mt-1 text-white/50">{roster.team_name} • {roster.member_count} Drivers</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
            <input
              type="text"
              placeholder="Search drivers..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-white/10 pl-9 pr-3 py-2 text-sm text-white focus:border-[#f97316] focus:outline-none"
            />
          </div>
          <button className="flex items-center gap-2 border border-white/20 text-white px-4 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-white/5 transition-colors">
            <UserPlus size={14} />
            Invite
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-[#0a0a0a] p-4 text-center" style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}>
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Drivers</div>
          <div className="text-xl font-bold text-white font-mono mt-1">{roster.member_count}</div>
        </div>
        <div className="bg-[#0a0a0a] p-4 text-center" style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}>
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Total Sessions</div>
          <div className="text-xl font-bold text-white font-mono mt-1">{totals.sessions}</div>
        </div>
        <div className="bg-[#0a0a0a] p-4 text-center" style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}>
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Total Laps</div>
          <div className="text-xl font-bold text-white font-mono mt-1">{totals.laps.toLocaleString()}</div>
        </div>
        <div className="bg-[#0a0a0a] p-4 text-center" style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}>
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Avg Inc Rate</div>
          <div className="text-xl font-bold text-white font-mono mt-1">{totals.avgInc.toFixed(1)}</div>
        </div>
      </div>

      {/* Driver Table */}
      <div className="bg-[#0a0a0a]" style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}>
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-white/40" />
            <span 
              className="font-medium text-sm uppercase tracking-wider text-white"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              Drivers
            </span>
          </div>
          <span className="text-xs text-white/40">Click a driver for details</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0a0a0a] text-white/50 text-[10px] font-semibold uppercase tracking-widest">
                <th className="text-left py-3 px-5">Driver</th>
                <th className="text-left py-3 px-3">Role</th>
                <th className="text-right py-3 px-3">iRating</th>
                <th className="text-right py-3 px-3">SR</th>
                <th className="text-right py-3 px-3">Sessions</th>
                <th className="text-right py-3 px-3">Laps</th>
                <th className="text-right py-3 px-3">Avg Inc</th>
                <th className="text-left py-3 px-5">Traits</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((m) => {
                const roleStyle = roleStyles[m.role] || roleStyles.driver;
                const RoleIcon = roleStyle.icon;
                return (
                  <tr
                    key={m.membership_id}
                    className="border-t border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-5">
                      <Link to={`/team/${teamId}/pitwall/driver/${m.driver_id}`} className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white/10 border border-white/20 flex items-center justify-center text-xs font-bold text-white/70">
                          {m.display_name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="font-medium text-white">{m.display_name}</span>
                      </Link>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2 py-0.5 font-semibold border w-fit ${roleStyle.class}`}>
                        <RoleIcon size={10} />
                        {roleStyle.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-white">
                      {m.irating?.toLocaleString() || '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-white">
                      {m.safety_rating?.toFixed(2) || '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-white/70">{m.total_sessions || 0}</td>
                    <td className="py-3 px-3 text-right font-mono text-white/70">{(m.total_laps || 0).toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-mono">
                      <span className={`${(m.avg_incident_rate || 0) < 2 ? 'text-green-400' : (m.avg_incident_rate || 0) < 3 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {m.avg_incident_rate?.toFixed(1) || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-5">
                      <div className="flex gap-1 flex-wrap">
                        {(m.traits || []).slice(0, 2).map((t, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 bg-white/5 border border-white/10 text-white/50 uppercase tracking-wider">{t}</span>
                        ))}
                        {(m.traits?.length || 0) > 2 && (
                          <span className="text-[10px] text-white/30">+{(m.traits?.length || 0) - 2}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredMembers.length === 0 && (
            <div className="py-12 text-center text-white/30">
              <Filter className="mx-auto mb-2" size={24} />
              <p>No drivers found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
