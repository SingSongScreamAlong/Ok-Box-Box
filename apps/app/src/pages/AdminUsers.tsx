import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft,
  Eye,
  RefreshCw,
  Shield,
  ShieldAlert,
  User,
  Users,
  Trophy,
  Target,
  Activity,
  Gamepad2,
  Flag,
  Car,
  FileText,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://octopus-app-qsi3i.ondigitalocean.app';

// ─── Types ──────────────────────────────────────────────────────────────

interface UserListItem {
  id: string;
  email: string;
  displayName: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface UserView {
  account: {
    id: string;
    email: string;
    displayName: string;
    isSuperAdmin: boolean;
    isActive: boolean;
    emailVerified: boolean;
    lastLoginAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  driverProfile: {
    id: string;
    displayName: string;
    bio: string | null;
    primaryDiscipline: string;
    privacyLevel: string;
    totalSessions: number;
    totalLaps: number;
    totalIncidents: number;
    createdAt: string;
  } | null;
  entitlements: Array<{
    id: string;
    product: string;
    status: string;
    source: string;
    starts_at: string;
    expires_at: string | null;
    created_at: string;
  }>;
  iracingAccount: {
    iracing_customer_id: string;
    iracing_display_name: string;
    is_valid: boolean;
    last_used_at: string | null;
    created_at: string;
  } | null;
  linkedIdentities: Array<{
    platform: string;
    platform_user_id: string;
    platform_display_name: string;
    verified_at: string | null;
    sync_status: string;
    created_at: string;
  }>;
  behavioralAggregates: Array<{
    time_window: string;
    avg_bsi: number | null;
    avg_tci: number | null;
    avg_cpi2: number | null;
    avg_rci: number | null;
    avg_behavioral_stability: number | null;
    session_count: number;
    total_laps_analyzed: number;
    avg_telemetry_confidence: number | null;
    computed_at: string;
  }>;
  recentSessions: Array<{
    id: string;
    track_name: string;
    car_name: string;
    session_type: string;
    created_at: string;
    finish_position: number | null;
    best_lap_time_ms: number | null;
    incident_count: number | null;
    irating_change: number | null;
  }>;
  teams: Array<{
    team_id: string;
    team_name: string;
    role: string;
    status: string;
    joined_at: string;
  }>;
  goals: Array<{
    id: string;
    title: string;
    category: string;
    status: string;
    priority: number;
    target_value: number | null;
    current_value: number | null;
    created_at: string;
  }>;
  traits: Array<{
    trait_key: string;
    trait_label: string;
    trait_category: string;
    confidence: number;
    evidence_summary: string | null;
  }>;
  leagueRoles: Array<{
    role: string;
    league_id: string;
    league_name: string | null;
    created_at: string;
  }>;
  recentAuditLog: Array<{
    action: string;
    entity_type: string;
    entity_id: string | null;
    description: string | null;
    created_at: string;
  }>;
}

// ─── Helpers ────────────────────────────────────────────────────────────

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatLapTime(ms: number | null): string {
  if (!ms) return '—';
  const s = ms / 1000;
  const minutes = Math.floor(s / 60);
  const seconds = (s % 60).toFixed(3);
  return minutes > 0 ? `${minutes}:${seconds.padStart(6, '0')}` : `${seconds}s`;
}

function metricBar(value: number | null, label: string) {
  if (value === null) return null;
  const pct = Math.max(0, Math.min(100, value * 100));
  const color = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-8 text-white/50 text-right">{label}</span>
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-white/60 text-right">{pct.toFixed(0)}%</span>
    </div>
  );
}

// ─── Card component ─────────────────────────────────────────────────────

function Card({ title, icon: Icon, children, empty }: {
  title: string;
  icon: React.ComponentType<any>;
  children: React.ReactNode;
  empty?: string;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 border-b border-white/10 flex items-center gap-2">
        <Icon size={14} className="text-cyan-400" />
        <span className="text-xs font-medium text-white/80 uppercase tracking-wider">{title}</span>
      </div>
      <div className="p-4">
        {children || <p className="text-white/30 text-xs italic">{empty || 'No data'}</p>}
      </div>
    </div>
  );
}

// ─── Badge ──────────────────────────────────────────────────────────────

function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' }) {
  const colors = {
    default: 'bg-white/10 text-white/60',
    success: 'bg-green-500/20 text-green-400',
    warning: 'bg-yellow-500/20 text-yellow-400',
    danger: 'bg-red-500/20 text-red-400',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${colors[variant]}`}>
      {children}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// USER LIST PAGE
// ═══════════════════════════════════════════════════════════════════════

function UserList() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/admin/users`, { headers });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const json = await res.json();
      setUsers(json.data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  return (
    <div className="min-h-screen bg-[--bg] text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to="/admin/ops" className="text-white/40 hover:text-white/80 transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <Users size={20} className="text-cyan-400" />
            <h1 className="text-lg font-semibold">User Management</h1>
            <span className="text-white/30 text-sm">({users.length})</span>
          </div>
          <button onClick={fetchUsers} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-xs text-white/60 hover:text-white transition-all">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* User table */}
        <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-2.5">User</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-left px-4 py-2.5">Last Login</th>
                <th className="text-left px-4 py-2.5">Joined</th>
                <th className="text-right px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {u.isSuperAdmin ? <ShieldAlert size={14} className="text-amber-400" /> : <User size={14} className="text-white/30" />}
                      <div>
                        <div className="text-white/90 font-medium">{u.displayName}</div>
                        <div className="text-white/40 text-xs">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.isActive ? 'success' : 'danger'}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-white/50 text-xs">{timeAgo(u.lastLoginAt)}</td>
                  <td className="px-4 py-3 text-white/50 text-xs">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/admin/users/${u.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded text-xs transition-colors">
                      <Eye size={12} />
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && users.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-white/30 text-xs">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// USER DETAIL PAGE (View As User)
// ═══════════════════════════════════════════════════════════════════════

function UserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<UserView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/view`, { headers });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const json = await res.json();
      setData(json.data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUser(); }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[--bg] flex items-center justify-center">
        <RefreshCw size={20} className="text-white/30 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[--bg] text-white p-6">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => navigate('/admin/users')} className="text-white/40 hover:text-white mb-4 flex items-center gap-1 text-sm">
            <ArrowLeft size={14} /> Back
          </button>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
            {error || 'User not found'}
          </div>
        </div>
      </div>
    );
  }

  const { account: a, driverProfile: dp, entitlements, iracingAccount, linkedIdentities, behavioralAggregates, recentSessions, teams, goals, traits, leagueRoles, recentAuditLog } = data;

  return (
    <div className="min-h-screen bg-[--bg] text-white p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin/users')} className="text-white/40 hover:text-white/80 transition-colors">
              <ArrowLeft size={18} />
            </button>
            <Eye size={20} className="text-cyan-400" />
            <div>
              <h1 className="text-lg font-semibold">{a.displayName}</h1>
              <div className="text-white/40 text-xs flex items-center gap-2">
                {a.email}
                {a.isSuperAdmin && <Badge variant="warning">Super Admin</Badge>}
                <Badge variant={a.isActive ? 'success' : 'danger'}>{a.isActive ? 'Active' : 'Inactive'}</Badge>
              </div>
            </div>
          </div>
          <button onClick={fetchUser}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-xs text-white/60 hover:text-white transition-all">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Account Info */}
          <Card title="Account" icon={User}>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-white/40">User ID</span><span className="text-white/70 font-mono text-[10px]">{a.id}</span></div>
              <div className="flex justify-between"><span className="text-white/40">Email Verified</span><span>{a.emailVerified ? '✓ Yes' : '✗ No'}</span></div>
              <div className="flex justify-between"><span className="text-white/40">Last Login</span><span className="text-white/70">{timeAgo(a.lastLoginAt)}</span></div>
              <div className="flex justify-between"><span className="text-white/40">Created</span><span className="text-white/70">{formatDate(a.createdAt)}</span></div>
              <div className="flex justify-between"><span className="text-white/40">Updated</span><span className="text-white/70">{formatDate(a.updatedAt)}</span></div>
            </div>
          </Card>

          {/* Entitlements */}
          <Card title="Entitlements" icon={Shield} empty="No entitlements">
            {entitlements.length > 0 ? (
              <div className="space-y-2">
                {entitlements.map(e => (
                  <div key={e.id} className="flex items-center justify-between text-xs bg-white/5 rounded px-3 py-2">
                    <div>
                      <span className="text-white/90 font-medium">{e.product}</span>
                      <span className="text-white/30 ml-2">via {e.source}</span>
                    </div>
                    <Badge variant={e.status === 'active' ? 'success' : e.status === 'expired' ? 'danger' : 'default'}>
                      {e.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>

          {/* Driver Profile */}
          <Card title="Driver Profile" icon={Car} empty="No driver profile created">
            {dp ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-white/40">Display Name</span><span className="text-white/70">{dp.displayName}</span></div>
                <div className="flex justify-between"><span className="text-white/40">Discipline</span><span className="text-white/70">{dp.primaryDiscipline}</span></div>
                <div className="flex justify-between"><span className="text-white/40">Privacy</span><span className="text-white/70">{dp.privacyLevel}</span></div>
                <div className="flex justify-between"><span className="text-white/40">Sessions</span><span className="text-white/70">{dp.totalSessions || 0}</span></div>
                <div className="flex justify-between"><span className="text-white/40">Laps</span><span className="text-white/70">{dp.totalLaps || 0}</span></div>
                <div className="flex justify-between"><span className="text-white/40">Incidents</span><span className="text-white/70">{dp.totalIncidents || 0}</span></div>
                {dp.bio && <div className="mt-2 text-white/50 italic border-t border-white/10 pt-2">"{dp.bio}"</div>}
              </div>
            ) : null}
          </Card>

          {/* Linked Accounts */}
          <Card title="Linked Accounts" icon={Gamepad2} empty="No linked accounts">
            <div className="space-y-2 text-xs">
              {iracingAccount && (
                <div className="bg-white/5 rounded px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-white/90 font-medium">iRacing (OAuth)</span>
                    <Badge variant={iracingAccount.is_valid ? 'success' : 'danger'}>
                      {iracingAccount.is_valid ? 'Valid' : 'Invalid'}
                    </Badge>
                  </div>
                  <div className="text-white/50 mt-1">{iracingAccount.iracing_display_name} (#{iracingAccount.iracing_customer_id})</div>
                </div>
              )}
              {linkedIdentities.map((li, i) => (
                <div key={i} className="bg-white/5 rounded px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-white/90 font-medium">{li.platform}</span>
                    <Badge variant={li.verified_at ? 'success' : 'default'}>
                      {li.verified_at ? 'Verified' : li.sync_status}
                    </Badge>
                  </div>
                  <div className="text-white/50 mt-1">{li.platform_display_name} ({li.platform_user_id})</div>
                </div>
              ))}
              {!iracingAccount && linkedIdentities.length === 0 && (
                <p className="text-white/30 italic">No linked accounts</p>
              )}
            </div>
          </Card>

          {/* Behavioral Metrics */}
          <Card title="Behavioral Indices" icon={Activity} empty="No telemetry data yet">
            {behavioralAggregates.length > 0 ? (
              <div className="space-y-4">
                {behavioralAggregates.map(ba => (
                  <div key={ba.time_window}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-white/60 uppercase">{ba.time_window.replace('_', ' ')}</span>
                      <span className="text-[10px] text-white/30">{ba.session_count} sessions, {ba.total_laps_analyzed} laps</span>
                    </div>
                    <div className="space-y-1">
                      {metricBar(ba.avg_bsi, 'BSI')}
                      {metricBar(ba.avg_tci, 'TCI')}
                      {metricBar(ba.avg_cpi2, 'CPI')}
                      {metricBar(ba.avg_rci, 'RCI')}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>

          {/* Traits */}
          <Card title="Driver Traits" icon={Trophy} empty="No traits derived yet">
            {traits.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {traits.map(t => (
                  <span key={t.trait_key}
                    className="inline-block px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] text-white/70"
                    title={t.evidence_summary || undefined}>
                    {t.trait_label} <span className="text-white/30">({(t.confidence * 100).toFixed(0)}%)</span>
                  </span>
                ))}
              </div>
            ) : null}
          </Card>

          {/* Recent Sessions */}
          <Card title="Recent Sessions" icon={Flag} empty="No sessions recorded">
            {recentSessions.length > 0 ? (
              <div className="space-y-1.5">
                {recentSessions.map(s => (
                  <div key={s.id} className="flex items-center justify-between text-xs bg-white/5 rounded px-3 py-2">
                    <div>
                      <span className="text-white/90">{s.track_name || 'Unknown Track'}</span>
                      <span className="text-white/30 ml-1.5">{s.car_name}</span>
                      <span className="text-white/20 ml-1.5">{s.session_type}</span>
                    </div>
                    <div className="flex items-center gap-3 text-white/50">
                      {s.finish_position && <span>P{s.finish_position}</span>}
                      {s.best_lap_time_ms && <span>{formatLapTime(s.best_lap_time_ms)}</span>}
                      {s.incident_count !== null && <span>{s.incident_count}x</span>}
                      {s.irating_change !== null && (
                        <span className={s.irating_change >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {s.irating_change >= 0 ? '+' : ''}{s.irating_change}
                        </span>
                      )}
                      <span className="text-white/20">{timeAgo(s.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>

          {/* Goals */}
          <Card title="Development Goals" icon={Target} empty="No goals set">
            {goals.length > 0 ? (
              <div className="space-y-1.5">
                {goals.map(g => (
                  <div key={g.id} className="flex items-center justify-between text-xs bg-white/5 rounded px-3 py-2">
                    <div>
                      <span className="text-white/90">{g.title}</span>
                      <span className="text-white/30 ml-1.5">{g.category}</span>
                    </div>
                    <Badge variant={g.status === 'completed' ? 'success' : g.status === 'active' || g.status === 'in_progress' ? 'warning' : 'default'}>
                      {g.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>

          {/* Teams & Roles */}
          <Card title="Teams & Roles" icon={Users} empty="Not in any teams">
            <div className="space-y-1.5 text-xs">
              {teams.map(t => (
                <div key={t.team_id} className="flex items-center justify-between bg-white/5 rounded px-3 py-2">
                  <span className="text-white/90">{t.team_name}</span>
                  <div className="flex items-center gap-2">
                    <Badge>{t.role}</Badge>
                    <Badge variant={t.status === 'active' ? 'success' : 'default'}>{t.status}</Badge>
                  </div>
                </div>
              ))}
              {leagueRoles.length > 0 && (
                <div className="border-t border-white/10 pt-2 mt-2">
                  <div className="text-white/30 uppercase tracking-wider text-[10px] mb-1">League Roles</div>
                  {leagueRoles.map((r, i) => (
                    <div key={i} className="flex items-center justify-between bg-white/5 rounded px-3 py-2">
                      <span className="text-white/70">{r.league_name || r.league_id}</span>
                      <Badge>{r.role}</Badge>
                    </div>
                  ))}
                </div>
              )}
              {teams.length === 0 && leagueRoles.length === 0 && (
                <p className="text-white/30 italic">Not in any teams or leagues</p>
              )}
            </div>
          </Card>

          {/* Audit Log */}
          <Card title="Recent Activity" icon={FileText} empty="No recorded activity">
            {recentAuditLog.length > 0 ? (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {recentAuditLog.map((a, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] py-1 border-b border-white/5 last:border-0">
                    <div>
                      <span className="text-cyan-400/70">{a.action}</span>
                      <span className="text-white/30 ml-1">{a.entity_type}</span>
                      {a.description && <span className="text-white/20 ml-1">— {a.description}</span>}
                    </div>
                    <span className="text-white/20 whitespace-nowrap ml-2">{timeAgo(a.created_at)}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════

export { UserList as AdminUserList, UserDetail as AdminUserDetail };
