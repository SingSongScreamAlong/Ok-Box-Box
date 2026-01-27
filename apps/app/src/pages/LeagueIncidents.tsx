import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getLeague, getUserLeagueRole, League } from '../lib/leagues';
import { 
  getLeagueIncidents, 
  getIncidentCounts, 
  Incident, 
  formatIncidentType, 
  formatSeverity,
  getSeverityColor,
  getStatusColor
} from '../lib/incidents';
import { 
  ArrowLeft, AlertTriangle, CheckCircle, XCircle, 
  Clock, Eye, ChevronRight
} from 'lucide-react';

export function LeagueIncidents() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { user } = useAuth();
  const [league, setLeague] = useState<League | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
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

    const [leagueData, role, incidentData, countData] = await Promise.all([
      getLeague(leagueId),
      getUserLeagueRole(leagueId, user.id),
      getLeagueIncidents(leagueId, { status: statusFilter || undefined }),
      getIncidentCounts(leagueId)
    ]);

    if (!leagueData || !role || !['owner', 'admin', 'steward'].includes(role)) {
      return;
    }

    setLeague(leagueData);
    setIncidents(incidentData);
    setCounts(countData);
    setLoading(false);
  };

  const statusTabs = [
    { key: 'pending', label: 'Pending', icon: Clock, count: counts.pending || 0 },
    { key: 'reviewing', label: 'Reviewing', icon: Eye, count: counts.reviewing || 0 },
    { key: 'penalty_issued', label: 'Penalized', icon: AlertTriangle, count: counts.penalty_issued || 0 },
    { key: 'no_action', label: 'No Action', icon: CheckCircle, count: counts.no_action || 0 },
    { key: 'dismissed', label: 'Dismissed', icon: XCircle, count: counts.dismissed || 0 },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/50">Loading incidents...</div>
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
          <source src="/videos/league-bg.mp4" type="video/mp4" />
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
              Incident Queue
            </h1>
            <p className="text-sm text-white/50 mt-1">
              Review and manage race incidents
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

        {/* Incidents List */}
        <div className="space-y-3">
          {incidents.length === 0 ? (
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-12 text-center">
              <AlertTriangle size={32} className="mx-auto mb-3 text-white/20" />
              <p className="text-sm text-white/40">No incidents found</p>
              <p className="text-xs text-white/30 mt-1">
                {statusFilter === 'pending' 
                  ? 'No pending incidents to review' 
                  : `No incidents with status "${statusFilter.replace('_', ' ')}"`}
              </p>
            </div>
          ) : (
            incidents.map(incident => (
              <Link
                key={incident.id}
                to={`/league/${leagueId}/incident/${incident.id}`}
                className="block bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-4 hover:border-white/20 hover:bg-white/[0.05] transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Type and Severity */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border font-semibold ${getSeverityColor(incident.severity)}`}>
                        {formatSeverity(incident.severity)}
                      </span>
                      <span className="text-sm font-medium text-white">
                        {formatIncidentType(incident.incident_type)}
                      </span>
                    </div>

                    {/* Drivers */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {incident.involved_drivers?.slice(0, 4).map((driver, idx) => (
                        <span
                          key={idx}
                          className={`text-xs px-2 py-0.5 rounded ${
                            driver.role === 'aggressor'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                              : driver.role === 'victim'
                              ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                              : 'bg-white/10 text-white/60 border border-white/20'
                          }`}
                        >
                          #{driver.carNumber} {driver.driverName?.split(' ').pop()}
                        </span>
                      ))}
                      {(incident.involved_drivers?.length || 0) > 4 && (
                        <span className="text-xs text-white/40">
                          +{incident.involved_drivers.length - 4} more
                        </span>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-4 text-xs text-white/40">
                      {incident.lap_number && (
                        <span>Lap {incident.lap_number}</span>
                      )}
                      {incident.corner_name && (
                        <span>{incident.corner_name}</span>
                      )}
                      {incident.session?.track_name && (
                        <span>{incident.session.track_name}</span>
                      )}
                      <span>{new Date(incident.created_at).toLocaleDateString()}</span>
                    </div>

                    {/* AI Recommendation */}
                    {incident.ai_recommendation && (
                      <div className="mt-2 p-2 bg-white/[0.03] rounded text-xs border border-white/[0.06]">
                        <span className="text-white/40">AI: </span>
                        <span className="text-[#3b82f6]">
                          {incident.ai_recommendation.replace('_', ' ')}
                        </span>
                        {incident.ai_confidence && (
                          <span className="text-white/30 ml-1">
                            ({Math.round(incident.ai_confidence * 100)}% conf)
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right side */}
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border font-semibold ${getStatusColor(incident.status)}`}>
                      {incident.status.replace('_', ' ')}
                    </span>
                    <ChevronRight size={16} className="text-white/30 group-hover:text-white/60 transition-colors" />
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Incident Detail Modal would go here */}
    </div>
  );
}
