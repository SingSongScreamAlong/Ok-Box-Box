import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTeam, Team } from '../../lib/teams';
import { useRelay } from '../../hooks/useRelay';
import { 
  ArrowLeft, AlertTriangle, CheckCircle, Clock, 
  Play, ChevronRight, Filter, Search, Flag,
  Car, Users, TrendingDown, Eye
} from 'lucide-react';

interface TeamIncident {
  id: string;
  sessionId: string;
  sessionName: string;
  lap: number;
  turn: string;
  timestamp: string;
  type: 'contact' | 'off_track' | 'unsafe_rejoin' | 'blocking' | 'pit_violation';
  severity: 'light' | 'medium' | 'heavy';
  status: 'detected' | 'reviewed' | 'dismissed' | 'noted';
  involvedDrivers: {
    id: string;
    name: string;
    carNumber: string;
    isTeamMember: boolean;
    atFault?: boolean;
  }[];
  description: string;
  notes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

const mockIncidents: TeamIncident[] = [
  {
    id: 'inc-1',
    sessionId: 'ses-1',
    sessionName: 'Daytona 24h Practice',
    lap: 42,
    turn: 'Bus Stop Chicane',
    timestamp: '2026-01-26T14:32:00Z',
    type: 'contact',
    severity: 'medium',
    status: 'detected',
    involvedDrivers: [
      { id: 'd1', name: 'Alex Rivera', carNumber: '42', isTeamMember: true, atFault: false },
      { id: 'd2', name: 'Marcus Chen', carNumber: '77', isTeamMember: false, atFault: true }
    ],
    description: 'Contact in braking zone. #77 locked up and made contact with rear of #42.'
  },
  {
    id: 'inc-2',
    sessionId: 'ses-1',
    sessionName: 'Daytona 24h Practice',
    lap: 38,
    turn: 'Turn 1',
    timestamp: '2026-01-26T14:28:00Z',
    type: 'off_track',
    severity: 'light',
    status: 'reviewed',
    involvedDrivers: [
      { id: 'd3', name: 'Jordan Kim', carNumber: '42', isTeamMember: true }
    ],
    description: 'Four wheels off track avoiding slower traffic.',
    notes: 'No advantage gained. Defensive move.',
    reviewedBy: 'Team Manager',
    reviewedAt: '2026-01-26T14:35:00Z'
  },
  {
    id: 'inc-3',
    sessionId: 'ses-2',
    sessionName: 'Spa Qualifying',
    lap: 5,
    turn: 'Eau Rouge',
    timestamp: '2026-01-25T10:15:00Z',
    type: 'contact',
    severity: 'heavy',
    status: 'noted',
    involvedDrivers: [
      { id: 'd1', name: 'Alex Rivera', carNumber: '42', isTeamMember: true, atFault: true },
      { id: 'd4', name: 'Sarah Williams', carNumber: '23', isTeamMember: false, atFault: false }
    ],
    description: 'Lost control on exit, collected #23. Both cars damaged.',
    notes: 'Driver briefed on entry speed. Setup adjusted for more stability.',
    reviewedBy: 'Race Engineer',
    reviewedAt: '2026-01-25T10:45:00Z'
  },
  {
    id: 'inc-4',
    sessionId: 'ses-3',
    sessionName: 'Road Atlanta Race',
    lap: 67,
    turn: 'Pit Entry',
    timestamp: '2026-01-24T16:42:00Z',
    type: 'pit_violation',
    severity: 'medium',
    status: 'dismissed',
    involvedDrivers: [
      { id: 'd5', name: 'Sam Torres', carNumber: '42', isTeamMember: true }
    ],
    description: 'Pit lane speeding detected - 62 kph in 60 kph zone.',
    notes: 'False positive - telemetry shows 59.8 kph. iRacing detection error.',
    reviewedBy: 'Data Analyst',
    reviewedAt: '2026-01-24T17:00:00Z'
  }
];

const incidentTypeLabels: Record<string, string> = {
  contact: 'Contact',
  off_track: 'Off Track',
  unsafe_rejoin: 'Unsafe Rejoin',
  blocking: 'Blocking',
  pit_violation: 'Pit Violation'
};

const severityColors: Record<string, string> = {
  light: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  medium: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  heavy: 'bg-red-500/20 text-red-400 border-red-500/30'
};

const statusColors: Record<string, string> = {
  detected: 'bg-blue-500/20 text-blue-400',
  reviewed: 'bg-green-500/20 text-green-400',
  dismissed: 'bg-white/10 text-white/50',
  noted: 'bg-purple-500/20 text-purple-400'
};

export function TeamIncidents() {
  const { teamId } = useParams<{ teamId: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [incidents, setIncidents] = useState<TeamIncident[]>(mockIncidents);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<TeamIncident | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.6;
    }
  }, []);

  useEffect(() => {
    if (teamId) {
      getTeam(teamId).then(data => {
        setTeam(data);
        setLoading(false);
      });
    }
  }, [teamId]);

  const filteredIncidents = incidents.filter(inc => {
    if (statusFilter !== 'all' && inc.status !== statusFilter) return false;
    if (typeFilter !== 'all' && inc.type !== typeFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        inc.description.toLowerCase().includes(query) ||
        inc.sessionName.toLowerCase().includes(query) ||
        inc.involvedDrivers.some(d => d.name.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const counts = {
    all: incidents.length,
    detected: incidents.filter(i => i.status === 'detected').length,
    reviewed: incidents.filter(i => i.status === 'reviewed').length,
    noted: incidents.filter(i => i.status === 'noted').length,
    dismissed: incidents.filter(i => i.status === 'dismissed').length
  };

  const handleUpdateStatus = (incidentId: string, newStatus: TeamIncident['status']) => {
    setIncidents(prev => prev.map(inc => 
      inc.id === incidentId 
        ? { ...inc, status: newStatus, reviewedAt: new Date().toISOString(), reviewedBy: 'Current User' }
        : inc
    ));
    if (selectedIncident?.id === incidentId) {
      setSelectedIncident(prev => prev ? { ...prev, status: newStatus } : null);
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
          <source src="/videos/bg-1.mp4" type="video/mp4" />
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
                  to={`/team/${teamId}/pitwall`}
                  className="p-2 hover:bg-white/[0.05] rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-white/60" />
                </Link>
                <div>
                  <h1 
                    className="text-lg font-semibold text-white uppercase tracking-wider"
                    style={{ fontFamily: 'Orbitron, sans-serif' }}
                  >
                    Team Incidents
                  </h1>
                  <p className="text-sm text-white/50">{team?.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 bg-blue-500/20 text-blue-400 text-xs font-medium rounded">
                  {counts.detected} New
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            {/* Status tabs */}
            <div className="flex bg-white/[0.03] rounded-lg p-1 border border-white/[0.06]">
              {['all', 'detected', 'reviewed', 'noted', 'dismissed'].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors capitalize ${
                    statusFilter === status
                      ? 'bg-white/10 text-white'
                      : 'text-white/50 hover:text-white/70'
                  }`}
                >
                  {status} ({counts[status as keyof typeof counts]})
                </button>
              ))}
            </div>

            {/* Type filter */}
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white/80 focus:outline-none focus:border-white/20"
            >
              <option value="all">All Types</option>
              <option value="contact">Contact</option>
              <option value="off_track">Off Track</option>
              <option value="unsafe_rejoin">Unsafe Rejoin</option>
              <option value="blocking">Blocking</option>
              <option value="pit_violation">Pit Violation</option>
            </select>

            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                placeholder="Search incidents..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Incident List */}
            <div className="lg:col-span-2 space-y-3">
              {filteredIncidents.length === 0 ? (
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-12 text-center">
                  <AlertTriangle className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/50">No incidents found</p>
                </div>
              ) : (
                filteredIncidents.map(incident => (
                  <button
                    key={incident.id}
                    onClick={() => setSelectedIncident(incident)}
                    className={`w-full text-left bg-white/[0.02] border rounded-lg p-4 transition-all hover:bg-white/[0.04] ${
                      selectedIncident?.id === incident.id
                        ? 'border-[#f97316]/50 bg-white/[0.04]'
                        : 'border-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded border ${severityColors[incident.severity]}`}>
                            {incident.severity.toUpperCase()}
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${statusColors[incident.status]}`}>
                            {incident.status}
                          </span>
                          <span className="text-xs text-white/40">
                            {incidentTypeLabels[incident.type]}
                          </span>
                        </div>
                        <p className="text-sm text-white/80 mb-1">{incident.description}</p>
                        <div className="flex items-center gap-4 text-xs text-white/40">
                          <span>{incident.sessionName}</span>
                          <span>Lap {incident.lap}</span>
                          <span>{incident.turn}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex -space-x-2">
                          {incident.involvedDrivers.map(driver => (
                            <div
                              key={driver.id}
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                                driver.isTeamMember
                                  ? 'bg-[#f97316]/20 border-[#f97316]/50 text-[#f97316]'
                                  : 'bg-white/10 border-white/20 text-white/60'
                              }`}
                              title={driver.name}
                            >
                              {driver.carNumber}
                            </div>
                          ))}
                        </div>
                        <ChevronRight className="w-4 h-4 text-white/30" />
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Detail Panel */}
            <div className="lg:col-span-1">
              {selectedIncident ? (
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-5 sticky top-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 
                      className="text-sm font-semibold text-white uppercase tracking-wider"
                      style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                      Incident Details
                    </h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded border ${severityColors[selectedIncident.severity]}`}>
                      {selectedIncident.severity.toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* Session Info */}
                    <div>
                      <p className="text-xs text-white/40 mb-1">Session</p>
                      <p className="text-sm text-white/80">{selectedIncident.sessionName}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-white/40 mb-1">Lap</p>
                        <p className="text-sm text-white/80">{selectedIncident.lap}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/40 mb-1">Location</p>
                        <p className="text-sm text-white/80">{selectedIncident.turn}</p>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <p className="text-xs text-white/40 mb-1">Description</p>
                      <p className="text-sm text-white/70">{selectedIncident.description}</p>
                    </div>

                    {/* Involved Drivers */}
                    <div>
                      <p className="text-xs text-white/40 mb-2">Involved Drivers</p>
                      <div className="space-y-2">
                        {selectedIncident.involvedDrivers.map(driver => (
                          <div 
                            key={driver.id}
                            className={`flex items-center justify-between p-2 rounded ${
                              driver.isTeamMember ? 'bg-[#f97316]/10' : 'bg-white/[0.03]'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${driver.isTeamMember ? 'text-[#f97316]' : 'text-white/60'}`}>
                                #{driver.carNumber}
                              </span>
                              <span className="text-sm text-white/80">{driver.name}</span>
                            </div>
                            {driver.atFault !== undefined && (
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                driver.atFault ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                              }`}>
                                {driver.atFault ? 'At Fault' : 'Not at Fault'}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Notes */}
                    {selectedIncident.notes && (
                      <div>
                        <p className="text-xs text-white/40 mb-1">Notes</p>
                        <p className="text-sm text-white/70 italic">{selectedIncident.notes}</p>
                      </div>
                    )}

                    {/* Review Info */}
                    {selectedIncident.reviewedBy && (
                      <div className="pt-3 border-t border-white/[0.06]">
                        <p className="text-xs text-white/40">
                          Reviewed by {selectedIncident.reviewedBy}
                        </p>
                        <p className="text-xs text-white/30">
                          {new Date(selectedIncident.reviewedAt!).toLocaleString()}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    {selectedIncident.status === 'detected' && (
                      <div className="pt-4 border-t border-white/[0.06] space-y-2">
                        <button
                          onClick={() => handleUpdateStatus(selectedIncident.id, 'reviewed')}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm font-medium transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Mark Reviewed
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(selectedIncident.id, 'noted')}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-sm font-medium transition-colors"
                        >
                          <Flag className="w-4 h-4" />
                          Add to Driver Notes
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(selectedIncident.id, 'dismissed')}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/[0.05] hover:bg-white/[0.08] text-white/60 rounded-lg text-sm font-medium transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-8 text-center">
                  <Eye className="w-10 h-10 text-white/20 mx-auto mb-3" />
                  <p className="text-sm text-white/50">Select an incident to view details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeamIncidents;
