import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getLeague, getUserLeagueRole, League } from '../lib/leagues';
import { 
  getIncident, 
  updateIncidentStatus,
  Incident, 
  formatIncidentType, 
  formatSeverity,
  getSeverityColor,
  getStatusColor
} from '../lib/incidents';
import { 
  ArrowLeft, AlertTriangle, CheckCircle, XCircle, 
  Gavel, MessageSquare, Play, Flag, Car
} from 'lucide-react';

export function LeagueIncidentDetail() {
  const { leagueId, incidentId } = useParams<{ leagueId: string; incidentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [league, setLeague] = useState<League | null>(null);
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stewardNotes, setStewardNotes] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (leagueId && incidentId && user) {
      loadData();
    }
  }, [leagueId, incidentId, user]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.6;
    }
  }, []);

  const loadData = async () => {
    if (!leagueId || !incidentId || !user) return;

    const [leagueData, role, incidentData] = await Promise.all([
      getLeague(leagueId),
      getUserLeagueRole(leagueId, user.id),
      getIncident(incidentId)
    ]);

    if (!leagueData || !role || !['owner', 'admin', 'steward'].includes(role)) {
      navigate(`/league/${leagueId}`);
      return;
    }

    if (!incidentData) {
      navigate(`/league/${leagueId}/incidents`);
      return;
    }

    setLeague(leagueData);
    setIncident(incidentData);
    setStewardNotes(incidentData.steward_notes || '');
    setLoading(false);
  };

  const handleDecision = async (decision: 'penalty_issued' | 'no_action' | 'dismissed') => {
    if (!incident || !user || submitting) return;

    setSubmitting(true);
    const result = await updateIncidentStatus(incident.id, decision, user.id, stewardNotes);
    
    if (result.success) {
      navigate(`/league/${leagueId}/incidents`);
    } else {
      alert('Failed to update incident: ' + result.error);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/50">Loading incident...</div>
      </div>
    );
  }

  if (!incident) return null;

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

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        {/* Back link */}
        <Link 
          to={`/league/${leagueId}/incidents`} 
          className="inline-flex items-center gap-2 text-xs text-white/50 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Incident Queue
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border font-semibold ${getSeverityColor(incident.severity)}`}>
                {formatSeverity(incident.severity)}
              </span>
              <h1 
                className="text-xl uppercase tracking-[0.15em] font-semibold text-white"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                {formatIncidentType(incident.incident_type)}
              </h1>
            </div>
            <p className="text-sm text-white/50">
              {incident.session?.track_name} • Lap {incident.lap_number}
              {incident.corner_name && ` • ${incident.corner_name}`}
            </p>
          </div>
          <span className={`text-[10px] uppercase tracking-wider px-3 py-1 rounded border font-semibold ${getStatusColor(incident.status)}`}>
            {incident.status.replace('_', ' ')}
          </span>
        </div>

        <div className="grid gap-6">
          {/* Drivers Involved */}
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-6">
            <h2 className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/40 mb-4 flex items-center gap-2">
              <Car size={14} />
              Drivers Involved
            </h2>
            <div className="grid gap-3">
              {incident.involved_drivers?.map((driver, idx) => (
                <div 
                  key={idx}
                  className={`flex items-center justify-between p-3 rounded border ${
                    driver.role === 'aggressor'
                      ? 'bg-red-500/10 border-red-500/30'
                      : driver.role === 'victim'
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-white/[0.03] border-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-mono font-bold text-white/80">
                      #{driver.carNumber}
                    </span>
                    <div>
                      <p className="text-sm text-white">{driver.driverName}</p>
                      <p className="text-[10px] uppercase tracking-wider text-white/40">
                        {driver.role}
                      </p>
                    </div>
                  </div>
                  {driver.faultProbability !== undefined && (
                    <div className="text-right">
                      <p className="text-sm font-mono text-white/70">
                        {Math.round(driver.faultProbability * 100)}%
                      </p>
                      <p className="text-[10px] text-white/40">Fault probability</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* AI Analysis */}
          {incident.ai_recommendation && (
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-6">
              <h2 className="text-[10px] uppercase tracking-[0.15em] font-semibold text-[#3b82f6] mb-4 flex items-center gap-2">
                <AlertTriangle size={14} />
                AI Analysis
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">Recommendation</span>
                  <span className="text-sm font-medium text-white">
                    {incident.ai_recommendation.replace('_', ' ')}
                  </span>
                </div>
                {incident.ai_confidence && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">Confidence</span>
                    <span className="text-sm font-mono text-white">
                      {Math.round(incident.ai_confidence * 100)}%
                    </span>
                  </div>
                )}
                {incident.ai_reasoning && (
                  <div className="mt-3 p-3 bg-white/[0.03] rounded border border-white/[0.06]">
                    <p className="text-sm text-white/70 leading-relaxed">
                      {incident.ai_reasoning}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Replay Link */}
          {incident.replay_timestamp_ms && (
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-6">
              <h2 className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/40 mb-4 flex items-center gap-2">
                <Play size={14} />
                Replay
              </h2>
              <p className="text-sm text-white/60">
                Replay timestamp: <span className="font-mono text-white">{Math.floor(incident.replay_timestamp_ms / 1000)}s</span>
              </p>
              <p className="text-xs text-white/40 mt-2">
                Open iRacing replay and navigate to this timestamp to review the incident.
              </p>
            </div>
          )}

          {/* Steward Notes */}
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-6">
            <h2 className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/40 mb-4 flex items-center gap-2">
              <MessageSquare size={14} />
              Steward Notes
            </h2>
            <textarea
              value={stewardNotes}
              onChange={(e) => setStewardNotes(e.target.value)}
              placeholder="Add notes about your decision..."
              className="w-full h-32 bg-white/[0.03] border border-white/[0.10] rounded p-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 resize-none"
              disabled={incident.status !== 'pending' && incident.status !== 'reviewing'}
            />
          </div>

          {/* Decision Actions */}
          {(incident.status === 'pending' || incident.status === 'reviewing') && (
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-6">
              <h2 className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/40 mb-4 flex items-center gap-2">
                <Gavel size={14} />
                Decision
              </h2>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleDecision('penalty_issued')}
                  disabled={submitting}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-sm font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50"
                >
                  <Flag size={16} />
                  Issue Penalty
                </button>
                <button
                  onClick={() => handleDecision('no_action')}
                  disabled={submitting}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-sm font-medium hover:bg-green-500/30 transition-colors disabled:opacity-50"
                >
                  <CheckCircle size={16} />
                  No Action Required
                </button>
                <button
                  onClick={() => handleDecision('dismissed')}
                  disabled={submitting}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white/60 border border-white/20 rounded text-sm font-medium hover:bg-white/20 transition-colors disabled:opacity-50"
                >
                  <XCircle size={16} />
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Previous Decision */}
          {incident.status !== 'pending' && incident.status !== 'reviewing' && (
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-6">
              <h2 className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/40 mb-4 flex items-center gap-2">
                <Gavel size={14} />
                Decision Made
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/50">Status</span>
                  <span className={`px-2 py-0.5 rounded border text-xs font-semibold ${getStatusColor(incident.status)}`}>
                    {incident.status.replace('_', ' ')}
                  </span>
                </div>
                {incident.reviewed_at && (
                  <div className="flex justify-between">
                    <span className="text-white/50">Reviewed</span>
                    <span className="text-white/70">
                      {new Date(incident.reviewed_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
