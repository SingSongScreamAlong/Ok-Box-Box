import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getLeague, getUserLeagueRole, League } from '../lib/leagues';
import { 
  ArrowLeft, MessageSquare, CheckCircle, XCircle, 
  Clock, AlertTriangle, ChevronRight, Filter, Search,
  FileText, User, Calendar, ThumbsUp, ThumbsDown, Scale
} from 'lucide-react';

interface Protest {
  id: string;
  incidentId: string;
  submittedBy: {
    id: string;
    name: string;
    team?: string;
  };
  submittedAt: string;
  status: 'pending' | 'under_review' | 'upheld' | 'denied' | 'withdrawn';
  type: 'penalty_appeal' | 'incident_report' | 'rule_clarification';
  subject: string;
  description: string;
  evidence?: string[];
  originalPenalty?: {
    type: string;
    value: string;
  };
  decision?: {
    outcome: string;
    reasoning: string;
    decidedBy: string;
    decidedAt: string;
    newPenalty?: {
      type: string;
      value: string;
    };
  };
  comments: {
    id: string;
    author: string;
    role: string;
    content: string;
    timestamp: string;
  }[];
}

const mockProtests: Protest[] = [
  {
    id: 'prot-1',
    incidentId: 'inc-123',
    submittedBy: { id: 'u1', name: 'Alex Rivera', team: 'Velocity Racing' },
    submittedAt: '2026-01-26T15:00:00Z',
    status: 'pending',
    type: 'penalty_appeal',
    subject: 'Appeal of 10-second penalty - Lap 42 contact',
    description: 'I am appealing the 10-second penalty issued for the lap 42 incident. The telemetry clearly shows I was fully alongside before the braking zone and had the right to racing room. The other driver turned in on me without leaving space.',
    evidence: ['telemetry_lap42.json', 'onboard_video.mp4'],
    originalPenalty: { type: 'time', value: '10 seconds' },
    comments: []
  },
  {
    id: 'prot-2',
    incidentId: 'inc-124',
    submittedBy: { id: 'u2', name: 'Jordan Kim', team: 'Thunder Motorsport' },
    submittedAt: '2026-01-25T20:30:00Z',
    status: 'under_review',
    type: 'incident_report',
    subject: 'Unreported incident - Turn 3 blocking',
    description: 'Reporting an incident that was not flagged by the system. Driver #77 made multiple defensive moves under braking in Turn 3, which is against the rulebook section 4.2.1.',
    comments: [
      {
        id: 'c1',
        author: 'Chief Steward',
        role: 'steward',
        content: 'We are reviewing the footage. Can you provide the exact lap number?',
        timestamp: '2026-01-26T10:00:00Z'
      },
      {
        id: 'c2',
        author: 'Jordan Kim',
        role: 'driver',
        content: 'Lap 23, approximately 14:32:45 session time.',
        timestamp: '2026-01-26T10:15:00Z'
      }
    ]
  },
  {
    id: 'prot-3',
    incidentId: 'inc-125',
    submittedBy: { id: 'u3', name: 'Marcus Chen', team: 'Apex Dynamics' },
    submittedAt: '2026-01-24T18:00:00Z',
    status: 'upheld',
    type: 'penalty_appeal',
    subject: 'Appeal of drive-through penalty - Pit lane speeding',
    description: 'The pit lane speeding penalty was issued in error. My telemetry shows I was at 59.8 kph, below the 60 kph limit.',
    originalPenalty: { type: 'drive_through', value: 'Drive Through' },
    decision: {
      outcome: 'Penalty Rescinded',
      reasoning: 'After reviewing the telemetry data provided by the driver, we confirm the speed was 59.8 kph. The iRacing detection appears to have been a false positive. Penalty is rescinded.',
      decidedBy: 'Steward Panel',
      decidedAt: '2026-01-25T12:00:00Z'
    },
    comments: []
  },
  {
    id: 'prot-4',
    incidentId: 'inc-126',
    submittedBy: { id: 'u4', name: 'Sarah Williams', team: 'Precision Racing' },
    submittedAt: '2026-01-23T14:00:00Z',
    status: 'denied',
    type: 'penalty_appeal',
    subject: 'Appeal of 5-second penalty - Track limits',
    description: 'I believe the track limits penalty was too harsh given the circumstances. I went off to avoid a spinning car.',
    originalPenalty: { type: 'time', value: '5 seconds' },
    decision: {
      outcome: 'Appeal Denied',
      reasoning: 'While we understand the driver was avoiding an incident, the telemetry shows a clear advantage was gained. The penalty stands as issued.',
      decidedBy: 'Steward Panel',
      decidedAt: '2026-01-24T09:00:00Z'
    },
    comments: []
  }
];

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
  const [protests, setProtests] = useState<Protest[]>(mockProtests);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedProtest, setSelectedProtest] = useState<Protest | null>(null);
  const [newComment, setNewComment] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.6;
    }
  }, []);

  useEffect(() => {
    if (leagueId && user) {
      loadData();
    }
  }, [leagueId, user]);

  const loadData = async () => {
    if (!leagueId || !user) return;
    const [leagueData, role] = await Promise.all([
      getLeague(leagueId),
      getUserLeagueRole(leagueId, user.id)
    ]);
    if (!leagueData || !role || !['owner', 'admin', 'steward'].includes(role)) {
      return;
    }
    setLeague(leagueData);
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

  const handleAddComment = () => {
    if (!selectedProtest || !newComment.trim()) return;
    const comment = {
      id: `c-${Date.now()}`,
      author: 'Steward',
      role: 'steward',
      content: newComment,
      timestamp: new Date().toISOString()
    };
    setProtests(prev => prev.map(p => 
      p.id === selectedProtest.id 
        ? { ...p, comments: [...p.comments, comment] }
        : p
    ));
    setSelectedProtest(prev => prev ? { ...prev, comments: [...prev.comments, comment] } : null);
    setNewComment('');
  };

  const handleDecision = (protestId: string, outcome: 'upheld' | 'denied') => {
    const reasoning = prompt('Enter reasoning for this decision:');
    if (!reasoning) return;
    
    setProtests(prev => prev.map(p => 
      p.id === protestId 
        ? { 
            ...p, 
            status: outcome,
            decision: {
              outcome: outcome === 'upheld' ? 'Appeal Upheld' : 'Appeal Denied',
              reasoning,
              decidedBy: 'Steward Panel',
              decidedAt: new Date().toISOString()
            }
          }
        : p
    ));
    if (selectedProtest?.id === protestId) {
      setSelectedProtest(prev => prev ? { 
        ...prev, 
        status: outcome,
        decision: {
          outcome: outcome === 'upheld' ? 'Appeal Upheld' : 'Appeal Denied',
          reasoning,
          decidedBy: 'Steward Panel',
          decidedAt: new Date().toISOString()
        }
      } : null);
    }
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
                            {typeLabels[protest.type]}
                          </span>
                        </div>
                        <p className="text-sm text-white/80 font-medium mb-1">{protest.subject}</p>
                        <div className="flex items-center gap-4 text-xs text-white/40">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {protest.submittedBy.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(protest.submittedAt).toLocaleDateString()}
                          </span>
                          {protest.comments.length > 0 && (
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              {protest.comments.length}
                            </span>
                          )}
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
                      <p className="text-xs text-white/40 mb-1">Subject</p>
                      <p className="text-sm text-white/80 font-medium">{selectedProtest.subject}</p>
                    </div>

                    <div>
                      <p className="text-xs text-white/40 mb-1">Submitted By</p>
                      <p className="text-sm text-white/80">{selectedProtest.submittedBy.name}</p>
                      {selectedProtest.submittedBy.team && (
                        <p className="text-xs text-white/50">{selectedProtest.submittedBy.team}</p>
                      )}
                    </div>

                    <div>
                      <p className="text-xs text-white/40 mb-1">Description</p>
                      <p className="text-sm text-white/70">{selectedProtest.description}</p>
                    </div>

                    {selectedProtest.originalPenalty && (
                      <div>
                        <p className="text-xs text-white/40 mb-1">Original Penalty</p>
                        <p className="text-sm text-red-400">{selectedProtest.originalPenalty.value}</p>
                      </div>
                    )}

                    {selectedProtest.evidence && selectedProtest.evidence.length > 0 && (
                      <div>
                        <p className="text-xs text-white/40 mb-2">Evidence</p>
                        <div className="space-y-1">
                          {selectedProtest.evidence.map((file, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-blue-400">
                              <FileText className="w-3 h-3" />
                              {file}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Decision */}
                    {selectedProtest.decision && (
                      <div className="pt-3 border-t border-white/[0.06]">
                        <p className="text-xs text-white/40 mb-2">Decision</p>
                        <div className={`p-3 rounded ${
                          selectedProtest.status === 'upheld' ? 'bg-green-500/10' : 'bg-red-500/10'
                        }`}>
                          <p className={`text-sm font-medium mb-1 ${
                            selectedProtest.status === 'upheld' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {selectedProtest.decision.outcome}
                          </p>
                          <p className="text-xs text-white/60">{selectedProtest.decision.reasoning}</p>
                          <p className="text-xs text-white/40 mt-2">
                            — {selectedProtest.decision.decidedBy}, {new Date(selectedProtest.decision.decidedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Comments */}
                    {selectedProtest.comments.length > 0 && (
                      <div className="pt-3 border-t border-white/[0.06]">
                        <p className="text-xs text-white/40 mb-2">Discussion</p>
                        <div className="space-y-2">
                          {selectedProtest.comments.map(comment => (
                            <div key={comment.id} className="bg-white/[0.03] rounded p-2">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-white/80">{comment.author}</span>
                                <span className="text-[10px] text-white/40">{comment.role}</span>
                              </div>
                              <p className="text-xs text-white/60">{comment.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {(selectedProtest.status === 'pending' || selectedProtest.status === 'under_review') && (
                      <div className="pt-4 border-t border-white/[0.06] space-y-3">
                        {/* Add comment */}
                        <div>
                          <textarea
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            placeholder="Add a comment..."
                            className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 resize-none"
                            rows={2}
                          />
                          <button
                            onClick={handleAddComment}
                            disabled={!newComment.trim()}
                            className="mt-2 px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.08] text-white/70 rounded text-xs font-medium transition-colors disabled:opacity-50"
                          >
                            Add Comment
                          </button>
                        </div>

                        {/* Decision buttons */}
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
