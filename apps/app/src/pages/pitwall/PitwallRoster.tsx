import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { UserPlus, Search, Filter, Users, Crown, Wrench, User, Link2, LinkIcon, Mail, Bell, X, Target } from 'lucide-react';

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
  // Linked account fields
  linked_account?: {
    ok_box_box_id: string;
    tier: 'driver' | 'team' | 'league';
    linked_at: string;
    email?: string;
  } | null;
  // IDP summary for quick view
  idp_summary?: {
    total_goals: number;
    achieved: number;
    in_progress: number;
    priority_focus?: string;
  };
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
      safety_rating: 4.67,
      linked_account: {
        ok_box_box_id: 'obb-u1-driver',
        tier: 'driver',
        linked_at: '2025-06-15T10:00:00Z',
        email: 'alex.rivera@email.com'
      },
      idp_summary: {
        total_goals: 5,
        achieved: 2,
        in_progress: 3,
        priority_focus: 'Qualifying Pace'
      }
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
      safety_rating: 3.21,
      linked_account: {
        ok_box_box_id: 'obb-u2-driver',
        tier: 'driver',
        linked_at: '2025-08-22T14:30:00Z',
        email: 'jordan.chen@email.com'
      },
      idp_summary: {
        total_goals: 3,
        achieved: 1,
        in_progress: 2,
        priority_focus: 'Safety Rating'
      }
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
      safety_rating: 4.21,
      linked_account: {
        ok_box_box_id: 'obb-u3-driver',
        tier: 'driver',
        linked_at: '2025-09-10T09:15:00Z'
      },
      idp_summary: {
        total_goals: 2,
        achieved: 0,
        in_progress: 2,
        priority_focus: 'Reach 4000 iR'
      }
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
      safety_rating: 2.87,
      linked_account: null, // Not linked yet
      idp_summary: undefined
    }
  ]
};

// Invite Modal Component
interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamName: string;
}

function InviteModal({ isOpen, onClose, teamName }: InviteModalProps) {
  const [inviteMethod, setInviteMethod] = useState<'system' | 'email' | 'both'>('both');
  const [searchQuery, setSearchQuery] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('driver');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Mock search results for system users
  const mockSystemUsers = [
    { id: 'obb-new1', name: 'Marcus Thompson', irating: 3245, tier: 'driver' },
    { id: 'obb-new2', name: 'Elena Rodriguez', irating: 4102, tier: 'driver' },
  ];

  const filteredUsers = searchQuery.length > 2 
    ? mockSystemUsers.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const handleSendInvite = async () => {
    setSending(true);
    await new Promise(r => setTimeout(r, 800));
    setSending(false);
    setSent(true);
    setTimeout(() => {
      setSent(false);
      onClose();
      setSearchQuery('');
      setEmail('');
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-[#0d0d0d] border border-white/10 w-full max-w-md mx-4" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            Invite Driver
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Invite Method Toggle */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-white/40 mb-2 block">Invite Method</label>
            <div className="flex gap-2">
              {[
                { key: 'system', label: 'System', icon: Bell },
                { key: 'email', label: 'Email', icon: Mail },
                { key: 'both', label: 'Both', icon: Link2 }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setInviteMethod(key as any)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold uppercase tracking-wider border transition-colors ${
                    inviteMethod === key
                      ? 'bg-[#3b82f6]/20 border-[#3b82f6] text-[#3b82f6]'
                      : 'border-white/10 text-white/50 hover:border-white/20'
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* System Search */}
          {(inviteMethod === 'system' || inviteMethod === 'both') && (
            <div>
              <label className="text-[10px] uppercase tracking-wider text-white/40 mb-2 block">Search Ok, Box Box Users</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
                <input
                  type="text"
                  placeholder="Search by name or iRacing ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/10 pl-9 pr-3 py-2 text-sm text-white focus:border-[#3b82f6] focus:outline-none"
                />
              </div>
              {filteredUsers.length > 0 && (
                <div className="mt-2 border border-white/10 bg-[#0a0a0a] max-h-32 overflow-y-auto">
                  {filteredUsers.map(user => (
                    <button
                      key={user.id}
                      onClick={() => setSearchQuery(user.name)}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <LinkIcon size={12} className="text-[#3b82f6]" />
                        <span className="text-sm text-white">{user.name}</span>
                      </div>
                      <span className="text-xs text-white/40 font-mono">{user.irating} iR</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Email Input */}
          {(inviteMethod === 'email' || inviteMethod === 'both') && (
            <div>
              <label className="text-[10px] uppercase tracking-wider text-white/40 mb-2 block">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
                <input
                  type="email"
                  placeholder="driver@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/10 pl-9 pr-3 py-2 text-sm text-white focus:border-[#3b82f6] focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Role Selection */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-white/40 mb-2 block">Assign Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm text-white focus:border-[#3b82f6] focus:outline-none"
            >
              <option value="driver">Driver</option>
              <option value="team_engineer">Engineer</option>
              <option value="team_principal">Principal</option>
            </select>
          </div>

          {/* Info Note */}
          <div className="flex items-start gap-2 p-3 bg-[#3b82f6]/10 border border-[#3b82f6]/20">
            <LinkIcon size={14} className="text-[#3b82f6] mt-0.5 flex-shrink-0" />
            <p className="text-xs text-white/60">
              If the driver has an Ok, Box Box account, their profile, IDP, and session data will automatically sync with {teamName}.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/50 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSendInvite}
            disabled={sending || sent}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
              sent
                ? 'bg-green-500 text-white'
                : 'bg-[#3b82f6] text-white hover:bg-[#2563eb]'
            }`}
          >
            {sending ? 'Sending...' : sent ? 'Invite Sent!' : 'Send Invite'}
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [showInviteModal, setShowInviteModal] = useState(false);
  
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
          <button 
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 border border-white/20 text-white px-4 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-white/5 transition-colors"
          >
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
                <th className="text-center py-3 px-3">Linked</th>
                <th className="text-right py-3 px-3">iRating</th>
                <th className="text-right py-3 px-3">SR</th>
                <th className="text-left py-3 px-3">IDP Focus</th>
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
                    <td className="py-3 px-3 text-center">
                      {m.linked_account ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-[#3b82f6]/20 text-[#3b82f6] border border-[#3b82f6]/30" title={`Linked: ${m.linked_account.email || m.linked_account.ok_box_box_id}`}>
                          <LinkIcon size={10} />
                          Synced
                        </span>
                      ) : (
                        <span className="text-[10px] text-white/30">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-white">
                      {m.irating?.toLocaleString() || '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-white">
                      {m.safety_rating?.toFixed(2) || '—'}
                    </td>
                    <td className="py-3 px-3">
                      {m.idp_summary ? (
                        <div className="flex items-center gap-2">
                          <Target size={12} className="text-[#3b82f6]" />
                          <span className="text-xs text-white/70">{m.idp_summary.priority_focus}</span>
                          <span className="text-[10px] text-white/30">({m.idp_summary.achieved}/{m.idp_summary.total_goals})</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-white/30">No IDP</span>
                      )}
                    </td>
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

      {/* Invite Modal */}
      <InviteModal 
        isOpen={showInviteModal} 
        onClose={() => setShowInviteModal(false)} 
        teamName={roster.team_name} 
      />
    </div>
  );
}
