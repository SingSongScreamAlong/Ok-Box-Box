import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { TeamRosterView, DriverSummaryForTeam } from '../../types/team.types';
import { InviteDriverModal } from '../../components/team/InviteDriverModal';
import { DriverDrawer } from '../../components/team/DriverDrawer';
import { UserPlus, Search, Filter, Users, Crown, Wrench, User } from 'lucide-react';
// Role types imported for type checking, display handled locally

// Mock data for demo mode - updated with new role hierarchy
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

// Role badge styling with icons
const roleStyles: Record<string, { class: string; icon: JSX.Element }> = {
    owner: {
        class: 'bg-racing-yellow/10 text-racing-yellow border-racing-yellow/30',
        icon: <Crown size={12} />
    },
    team_principal: {
        class: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
        icon: <User size={12} />
    },
    team_engineer: {
        class: 'bg-racing-blue/10 text-racing-blue border-racing-blue/30',
        icon: <Wrench size={12} />
    },
    driver: {
        class: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
        icon: <User size={12} />
    }
};

// Role label formatting
const roleLabels: Record<string, string> = {
    owner: 'Owner',
    team_principal: 'Team Principal',
    team_engineer: 'Engineer',
    driver: 'Driver'
};

// Access styles removed - not needed with open culture approach

export default function TeamRoster() {
    const { teamId } = useParams<{ teamId: string }>();
    const { accessToken } = useAuthStore();

    const [roster, setRoster] = useState<TeamRosterView | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState('');
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [selectedDriver, setSelectedDriver] = useState<DriverSummaryForTeam | null>(null);

    useEffect(() => {
        if (teamId) fetchRoster();
    }, [teamId]);

    const fetchRoster = async () => {
        try {
            setLoading(true);
            setError(null);

            // Demo mode
            if (teamId === 'demo') {
                await new Promise(resolve => setTimeout(resolve, 400));
                setRoster(mockRoster);
                setLoading(false);
                return;
            }

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/teams/${teamId}/roster`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (!response.ok) {
                if (response.status === 401) throw new Error('Unauthorized');
                if (response.status === 404) throw new Error('Team not found');
                throw new Error('Failed to fetch roster');
            }

            const data = await response.json();
            setRoster(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleInviteSuccess = () => fetchRoster();

    const filteredMembers = roster?.members.filter(m =>
        m.display_name.toLowerCase().includes(filter.toLowerCase()) ||
        m.role.toLowerCase().includes(filter.toLowerCase())
    ) || [];

    // Team totals
    const totals = roster ? {
        sessions: roster.members.reduce((sum, m) => sum + (m.total_sessions || 0), 0),
        laps: roster.members.reduce((sum, m) => sum + (m.total_laps || 0), 0)
    } : { sessions: 0, laps: 0 };

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <div className="text-zinc-500">Loading roster...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-center">
                <p className="text-racing-red mb-4">Error: {error}</p>
                <button onClick={fetchRoster} className="btn btn-secondary">Retry</button>
            </div>
        );
    }

    if (!roster) return null;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-6">
                <div>
                    <h1 className="font-racing text-2xl text-white tracking-wide">Team Roster</h1>
                    <p className="text-sm text-zinc-500">{roster.team_name} • {roster.member_count} Drivers</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                        <input
                            type="text"
                            placeholder="Search drivers..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="input pl-9 py-2 text-sm"
                        />
                    </div>
                    <button onClick={() => setShowInviteModal(true)} className="btn btn-primary">
                        <UserPlus size={16} className="mr-2" />
                        Invite
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="stat-card">
                    <div className="stat-label">Drivers</div>
                    <div className="stat-value">{roster.member_count}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Total Sessions</div>
                    <div className="stat-value">{totals.sessions}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Total Laps</div>
                    <div className="stat-value">{totals.laps.toLocaleString()}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Avg Inc Rate</div>
                    <div className="stat-value">
                        {(roster.members.reduce((s, m) => s + (m.avg_incident_rate || 0), 0) / roster.members.length).toFixed(1)}
                    </div>
                </div>
            </div>

            {/* Driver Table */}
            <div className="card">
                <div className="card-header">
                    <div className="flex items-center gap-2">
                        <Users size={16} className="text-racing-blue" />
                        <span className="font-medium text-sm uppercase tracking-wider">Drivers</span>
                    </div>
                    <span className="text-xs text-zinc-500">Click a driver for details</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/10 text-zinc-500 text-xs uppercase tracking-wider">
                                <th className="text-left py-3 px-5">Driver</th>
                                <th className="text-left py-3 px-3">Role</th>
                                <th className="text-right py-3 px-3">iRating</th>
                                <th className="text-right py-3 px-3">Sessions</th>
                                <th className="text-right py-3 px-3">Laps</th>
                                <th className="text-right py-3 px-3">Avg Inc</th>
                                <th className="text-left py-3 px-5">Traits</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredMembers.map((m) => {
                                const roleStyle = roleStyles[m.role] || roleStyles.driver;
                                return (
                                    <tr
                                        key={m.membership_id}
                                        className="table-row cursor-pointer"
                                        onClick={() => setSelectedDriver(m)}
                                    >
                                        <td className="py-3 px-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-300">
                                                    {m.display_name.split(' ').map(n => n[0]).join('')}
                                                </div>
                                                <span className="font-medium text-white">{m.display_name}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-3">
                                            <span className={`badge border flex items-center gap-1.5 ${roleStyle.class}`}>
                                                {roleStyle.icon}
                                                {roleLabels[m.role] || m.role}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 text-right font-mono text-zinc-300">
                                            {m.irating?.toLocaleString() || '—'}
                                        </td>
                                        <td className="py-3 px-3 text-right font-mono text-zinc-300">{m.total_sessions || 0}</td>
                                        <td className="py-3 px-3 text-right font-mono text-zinc-300">{(m.total_laps || 0).toLocaleString()}</td>
                                        <td className="py-3 px-3 text-right font-mono">
                                            <span className={`${(m.avg_incident_rate || 0) < 2 ? 'text-racing-green' : (m.avg_incident_rate || 0) < 3 ? 'text-racing-yellow' : 'text-racing-red'}`}>
                                                {m.avg_incident_rate?.toFixed(1) || '—'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-5">
                                            <div className="flex gap-1 flex-wrap">
                                                {(m.traits || []).slice(0, 2).map((t, i) => (
                                                    <span key={i} className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">{t}</span>
                                                ))}
                                                {(m.traits?.length || 0) > 2 && (
                                                    <span className="text-xs text-zinc-600">+{(m.traits?.length || 0) - 2}</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {filteredMembers.length === 0 && (
                        <div className="py-12 text-center text-zinc-500">
                            <Filter className="mx-auto mb-2" size={24} />
                            <p>No drivers found</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Driver Drawer */}
            {selectedDriver && teamId && (
                <DriverDrawer
                    driver={selectedDriver}
                    teamId={teamId}
                    onClose={() => setSelectedDriver(null)}
                />
            )}

            {showInviteModal && teamId && (
                <InviteDriverModal
                    teamId={teamId}
                    onClose={() => setShowInviteModal(false)}
                    onInviteSuccess={handleInviteSuccess}
                />
            )}
        </div>
    );
}
