import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getLeague, getUserLeagueRole, League } from '../lib/leagues';
import { 
  getLeaguePenalties, 
  getPenaltyCounts, 
  updatePenaltyStatus,
  Penalty, 
  formatPenaltyType,
  getPenaltyStatusColor,
  getPenaltyTypeColor
} from '../lib/penalties';
import { 
  ArrowLeft, Flag, CheckCircle, XCircle, 
  Clock, Gavel, ChevronRight, AlertTriangle
} from 'lucide-react';

export function LeaguePenalties() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { user } = useAuth();
  const [league, setLeague] = useState<League | null>(null);
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('proposed');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (leagueId && user) {
      loadData();
    }
  }, [leagueId, user, statusFilter]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.6;
    }
  }, []);

  const loadData = async () => {
    if (!leagueId || !user) return;

    const [leagueData, role, penaltyData, countData] = await Promise.all([
      getLeague(leagueId),
      getUserLeagueRole(leagueId, user.id),
      getLeaguePenalties(leagueId, { status: statusFilter || undefined }),
      getPenaltyCounts(leagueId)
    ]);

    if (!leagueData || !role || !['owner', 'admin', 'steward'].includes(role)) {
      return;
    }

    setLeague(leagueData);
    setPenalties(penaltyData);
    setCounts(countData);
    setLoading(false);
  };

  const handleApprove = async (penaltyId: string) => {
    if (!user) return;
    await updatePenaltyStatus(penaltyId, 'approved', user.id);
    loadData();
  };

  const handleRevoke = async (penaltyId: string) => {
    if (!confirm('Are you sure you want to revoke this penalty?')) return;
    await updatePenaltyStatus(penaltyId, 'revoked');
    loadData();
  };

  const handleApply = async (penaltyId: string) => {
    await updatePenaltyStatus(penaltyId, 'applied');
    loadData();
  };

  const statusTabs = [
    { key: 'proposed', label: 'Proposed', icon: Clock, count: counts.proposed || 0 },
    { key: 'approved', label: 'Approved', icon: CheckCircle, count: counts.approved || 0 },
    { key: 'applied', label: 'Applied', icon: Flag, count: counts.applied || 0 },
    { key: 'appealed', label: 'Appealed', icon: AlertTriangle, count: counts.appealed || 0 },
    { key: 'revoked', label: 'Revoked', icon: XCircle, count: counts.revoked || 0 },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/50">Loading penalties...</div>
      </div>
    );
  }

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
          <source src="/videos/bg-1.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0e]/80 via-[#0e0e0e]/60 to-[#0e0e0e]/40" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0e0e0e]/80" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        {/* Back link */}
        <Link 
          to={`/league/${leagueId}`} 
          className="inline-flex items-center gap-2 text-xs text-white/50 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to {league?.name}
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 
              className="text-xl uppercase tracking-[0.15em] font-semibold text-white"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              Penalties
            </h1>
            <p className="text-sm text-white/50 mt-1">
              Manage driver penalties
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-white/40">Total:</span>
            <span className="text-white font-mono">{counts.total || 0}</span>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {statusTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-medium transition-all whitespace-nowrap ${
                statusFilter === tab.key
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'bg-white/[0.03] text-white/50 border border-white/[0.08] hover:bg-white/[0.06] hover:text-white/70'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] ${
                  statusFilter === tab.key ? 'bg-white/20' : 'bg-white/10'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Penalties List */}
        <div className="space-y-3">
          {penalties.length === 0 ? (
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-12 text-center">
              <Flag size={32} className="mx-auto mb-3 text-white/20" />
              <p className="text-sm text-white/40">No penalties found</p>
              <p className="text-xs text-white/30 mt-1">
                {statusFilter === 'proposed' 
                  ? 'No pending penalties to review' 
                  : `No penalties with status "${statusFilter}"`}
              </p>
            </div>
          ) : (
            penalties.map(penalty => (
              <div
                key={penalty.id}
                className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-4 hover:border-white/20 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Driver and Penalty Type */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg font-mono font-bold text-white/80">
                        #{penalty.car_number}
                      </span>
                      <span className="text-sm font-medium text-white">
                        {penalty.driver_name}
                      </span>
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${getPenaltyTypeColor(penalty.penalty_type)}`}>
                        {formatPenaltyType(penalty.penalty_type)}
                      </span>
                    </div>

                    {/* Penalty Value */}
                    {penalty.penalty_value && (
                      <p className="text-sm text-white/70 mb-2">
                        {penalty.penalty_value}
                      </p>
                    )}

                    {/* Rule Reference */}
                    {penalty.rule_reference && (
                      <p className="text-xs text-white/40 mb-2">
                        Rule: <span className="text-[#3b82f6]">{penalty.rule_reference}</span>
                      </p>
                    )}

                    {/* Rationale */}
                    {penalty.rationale && (
                      <p className="text-xs text-white/50 mb-2 line-clamp-2">
                        {penalty.rationale}
                      </p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-4 text-xs text-white/40">
                      {penalty.session?.track_name && (
                        <span>{penalty.session.track_name}</span>
                      )}
                      {penalty.incident?.lap_number && (
                        <span>Lap {penalty.incident.lap_number}</span>
                      )}
                      <span>{new Date(penalty.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Right side - Status and Actions */}
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border font-semibold ${getPenaltyStatusColor(penalty.status)}`}>
                      {penalty.status}
                    </span>

                    {/* Actions based on status */}
                    {penalty.status === 'proposed' && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleApprove(penalty.id)}
                          className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-xs hover:bg-green-500/30 transition-colors"
                        >
                          <CheckCircle size={12} />
                          Approve
                        </button>
                        <button
                          onClick={() => handleRevoke(penalty.id)}
                          className="flex items-center gap-1 px-2 py-1 bg-white/10 text-white/60 border border-white/20 rounded text-xs hover:bg-white/20 transition-colors"
                        >
                          <XCircle size={12} />
                          Revoke
                        </button>
                      </div>
                    )}

                    {penalty.status === 'approved' && (
                      <button
                        onClick={() => handleApply(penalty.id)}
                        className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-xs hover:bg-blue-500/30 transition-colors mt-2"
                      >
                        <Gavel size={12} />
                        Apply
                      </button>
                    )}

                    {penalty.incident_id && (
                      <Link
                        to={`/league/${leagueId}/incident/${penalty.incident_id}`}
                        className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors mt-1"
                      >
                        View Incident
                        <ChevronRight size={12} />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
