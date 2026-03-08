import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getLeague, getUserLeagueRole, League,
  fetchLeagueProtests, updateProtestStatus, type LeagueProtest,
} from '../lib/leagues';
import { VIDEO_PLAYBACK_RATE } from '../lib/config';
import {
  ArrowLeft, ChevronRight, FileText, User, Calendar,
  ThumbsUp, ThumbsDown, Scale
} from 'lucide-react';

function deriveProtestType(protest: LeagueProtest): string {
  if (protest.penaltyId) return 'Penalty Appeal';
  if (protest.incidentId) return 'Incident Report';
  return 'Submission';
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  under_review: 'bg-blue-500/20 text-blue-400',
  upheld: 'bg-green-500/20 text-green-400',
  denied: 'bg-red-500/20 text-red-400',
  withdrawn: 'bg-white/10 text-white/50'
};

const typeLabels: Record<string, string> = {
  penalty_appeal: 'Penalty Appeal',
  incident_report: 'Incident Report',
  rule_clarification: 'Rule Clarification'
};

export function LeagueProtests() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { user } = useAuth();
  const [league, setLeague] = useState<League | null>(null);
  const [protests, setProtests] = useState<LeagueProtest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedProtest, setSelectedProtest] = useState<LeagueProtest | null>(null);
  const [stewardNote, setStewardNote] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = VIDEO_PLAYBACK_RATE;
    }
  }, []);

  useEffect(() => {
    if (leagueId && user) {
      loadData();
    }
  }, [leagueId, user]);

  const loadData = async () => {
    if (!leagueId || !user) return;
    const [leagueData, role, protestData] = await Promise.all([
      getLeague(leagueId),
      getUserLeagueRole(leagueId, user.id),
      fetchLeagueProtests(leagueId),
    ]);
    if (!leagueData || !role || !['owner', 'admin', 'steward'].includes(role)) {
      return;
    }
    setLeague(leagueData);
    setProtests(protestData);
    setLoading(false);
  };

  const filteredProtests = protests.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    return true;
  });

  const counts = {
    all: protests.length,
    pending: protests.filter(p => p.status === 'pending').length,
    under_review: protests.filter(p => p.status === 'under_review').length,
    upheld: protests.filter(p => p.status === 'upheld').length,
    denied: protests.filter(p => p.status === 'denied').length
  };

  const handleDecision = async (protestId: string, outcome: 'upheld' | 'denied') => {
    const reasoning = prompt('Enter reasoning for this decision:');
    if (!reasoning) return;
    const ok = await updateProtestStatus(protestId, outcome, reasoning);
    if (!ok) return;
    const updated = protests.map(p =>
      p.id === protestId
        ? { ...p, status: outcome, resolution: reasoning, resolvedAt: new Date().toISOString() }
        : p
    );
    setProtests(updated);
    setSelectedProtest(updated.find(p => p.id === protestId) ?? null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-white/50">Loading...</div>
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
          className="w-full h-full object-cover opacity-40"
        >
          <source src="/videos/track-left.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/70 via-[#0a0a0a]/50 to-[#0a0a0a]/90" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="border-b border-white/[0.06] bg-black/20 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link 
                  to={`/league/${leagueId}`}
                  className="p-2 hover:bg-white/[0.05] rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-white/60" />
                </Link>
                <div>
                  <h1 
                    className="text-lg font-semibold text-white uppercase tracking-wider"
                    style={{ fontFamily: 'Orbitron, sans-serif' }}
                  >
                    Protests & Appeals
                  </h1>
                  <p className="text-sm text-white/50">{league?.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded">
                  {counts.pending} Pending
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex bg-white/[0.03] rounded-lg p-1 border border-white/[0.06]">
              {['all', 'pending', 'under_review', 'upheld', 'denied'].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    statusFilter === status
                      ? 'bg-white/10 text-white'
                      : 'text-white/50 hover:text-white/70'
                  }`}
                >
                  {status.replace('_', ' ')} ({counts[status as keyof typeof counts] || 0})
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Protest List */}
            <div className="lg:col-span-2 space-y-3">
              {filteredProtests.length === 0 ? (
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-12 text-center">
                  <Scale className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/50">No protests found</p>
                </div>
              ) : (
                filteredProtests.map(protest => (
                  <button
                    key={protest.id}
                    onClick={() => setSelectedProtest(protest)}
                    className={`w-full text-left bg-white/[0.02] border rounded-lg p-4 transition-all hover:bg-white/[0.04] ${
                      selectedProtest?.id === protest.id
                        ? 'border-[#f97316]/50 bg-white/[0.04]'
                        : 'border-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${statusColors[protest.status]}`}>
                            {protest.status.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-white/40">
                            {deriveProtestType(protest)}
                          </span>
                          {protest.incidentSeverity && (
                            <span className="text-xs text-white/30">{protest.incidentSeverity}</span>
                          )}
                        </div>
                        <p className="text-sm text-white/80 font-medium mb-1 line-clamp-2">{protest.grounds}</p>
                        <div className="flex items-center gap-4 text-xs text-white/40">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {protest.submittedByName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(protest.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/30" />
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Detail Panel */}
            <div className="lg:col-span-1">
              {selectedProtest ? (
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-5 sticky top-6 max-h-[calc(100vh-8rem)] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 
                      className="text-sm font-semibold text-white uppercase tracking-wider"
                      style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                      Protest Details
                    </h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${statusColors[selectedProtest.status]}`}>
                      {selectedProtest.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-white/40 mb-1">Type</p>
                      <p className="text-sm text-white/70">{deriveProtestType(selectedProtest)}</p>
                    </div>

                    <div>
                      <p className="text-xs text-white/40 mb-1">Submitted By</p>
                      <p className="text-sm text-white/80">{selectedProtest.submittedByName}</p>
                      <p className="text-xs text-white/40 mt-0.5">{new Date(selectedProtest.createdAt).toLocaleString()}</p>
                    </div>

                    <div>
                      <p className="text-xs text-white/40 mb-1">Grounds</p>
                      <p className="text-sm text-white/70 leading-relaxed">{selectedProtest.grounds}</p>
                    </div>

                    {selectedProtest.evidenceUrls.length > 0 && (
                      <div>
                        <p className="text-xs text-white/40 mb-2">Evidence</p>
                        <div className="space-y-1">
                          {selectedProtest.evidenceUrls.map((url, i) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300"
                            >
                              <FileText className="w-3 h-3 flex-shrink-0" />
                              {url.split('/').pop() || url}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedProtest.stewardNotes && (
                      <div>
                        <p className="text-xs text-white/40 mb-1">Steward Notes</p>
                        <p className="text-sm text-white/60 italic">{selectedProtest.stewardNotes}</p>
                      </div>
                    )}

                    {/* Decision */}
                    {selectedProtest.resolution && (
                      <div className="pt-3 border-t border-white/[0.06]">
                        <p className="text-xs text-white/40 mb-2">Decision</p>
                        <div className={`p-3 rounded ${
                          selectedProtest.status === 'upheld' ? 'bg-green-500/10' : 'bg-red-500/10'
                        }`}>
                          <p className={`text-sm font-medium mb-1 ${
                            selectedProtest.status === 'upheld' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {selectedProtest.status === 'upheld' ? 'Appeal Upheld' : 'Appeal Denied'}
                          </p>
                          <p className="text-xs text-white/60">{selectedProtest.resolution}</p>
                          {selectedProtest.resolvedByName && selectedProtest.resolvedAt && (
                            <p className="text-xs text-white/40 mt-2">
                              — {selectedProtest.resolvedByName},{' '}
                              {new Date(selectedProtest.resolvedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {(selectedProtest.status === 'pending' || selectedProtest.status === 'under_review') && (
                      <div className="pt-4 border-t border-white/[0.06] space-y-3">
                        <div>
                          <textarea
                            value={stewardNote}
                            onChange={e => setStewardNote(e.target.value)}
                            placeholder="Add steward notes..."
                            className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 resize-none"
                            rows={2}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDecision(selectedProtest.id, 'upheld')}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm font-medium transition-colors"
                          >
                            <ThumbsUp className="w-4 h-4" />
                            Uphold
                          </button>
                          <button
                            onClick={() => handleDecision(selectedProtest.id, 'denied')}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
                          >
                            <ThumbsDown className="w-4 h-4" />
                            Deny
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-8 text-center">
                  <Scale className="w-10 h-10 text-white/20 mx-auto mb-3" />
                  <p className="text-sm text-white/50">Select a protest to view details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LeagueProtests;
