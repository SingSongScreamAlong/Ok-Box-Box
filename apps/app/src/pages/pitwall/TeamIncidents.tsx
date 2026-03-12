import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTeam, Team } from '../../lib/teams';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ArrowLeft, AlertTriangle, ChevronRight, Search, Eye, TrendingDown
} from 'lucide-react';
import { PitwallBackground } from '../../components/PitwallBackground';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : 'https://app.okboxbox.com');

interface TeamIncident {
  id: string;
  sessionId: string;
  sessionName: string;
  trackName: string;
  carName: string;
  timestamp: string;
  eventType: string;
  incidentCount: number;
  lapsComplete: number;
  startPosition: number;
  finishPosition: number;
  iratingChange: number;
  driverName: string;
  driverProfileId: string;
  severity: 'light' | 'medium' | 'heavy';
}

const severityColors: Record<string, string> = {
  light: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  medium: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  heavy: 'bg-red-500/20 text-red-400 border-red-500/30'
};

export function TeamIncidents() {
  const { teamId } = useParams<{ teamId: string }>();
  const { session } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [incidents, setIncidents] = useState<TeamIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<TeamIncident | null>(null);
  useEffect(() => {
    async function loadData() {
      if (!teamId) return;
      try {
        const teamData = await getTeam(teamId);
        setTeam(teamData);

        if (session?.access_token) {
          const res = await fetch(`${API_BASE}/api/v1/teams/${teamId}/incidents`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setIncidents(data.incidents || []);
          }
        }
      } catch (err) {
        console.error('[TeamIncidents] Failed to load:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [teamId, session?.access_token]);

  const filteredIncidents = incidents.filter(inc => {
    if (severityFilter !== 'all' && inc.severity !== severityFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        inc.driverName.toLowerCase().includes(query) ||
        inc.sessionName.toLowerCase().includes(query) ||
        inc.trackName?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const counts = {
    all: incidents.length,
    light: incidents.filter(i => i.severity === 'light').length,
    medium: incidents.filter(i => i.severity === 'medium').length,
    heavy: incidents.filter(i => i.severity === 'heavy').length,
  };

  const totalIncidents = incidents.reduce((sum, i) => sum + i.incidentCount, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-white/50">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <PitwallBackground />

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
              <div className="flex items-center gap-3">
                <span className="px-3 py-1.5 bg-white/10 text-white/60 text-xs font-medium rounded">
                  {totalIncidents} total x
                </span>
                <span className="px-3 py-1.5 bg-red-500/20 text-red-400 text-xs font-medium rounded">
                  {counts.heavy} heavy
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            {/* Severity tabs */}
            <div className="flex bg-white/[0.03] rounded-lg p-1 border border-white/[0.06]">
              {(['all', 'light', 'medium', 'heavy'] as const).map(sev => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors capitalize ${
                    severityFilter === sev
                      ? 'bg-white/10 text-white'
                      : 'text-white/50 hover:text-white/70'
                  }`}
                >
                  {sev} ({counts[sev]})
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                placeholder="Search by driver or track..."
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
                  <p className="text-xs text-white/30 mt-2">Sessions with zero incidents are not shown</p>
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
                            {incident.incidentCount}x
                          </span>
                          <span className="text-xs text-white/60 font-medium">
                            {incident.driverName}
                          </span>
                          <span className="text-xs text-white/30">
                            {incident.eventType || 'Race'}
                          </span>
                        </div>
                        <p className="text-sm text-white/80 mb-1">{incident.sessionName}</p>
                        <div className="flex items-center gap-4 text-xs text-white/40">
                          <span>{incident.carName}</span>
                          <span>{incident.lapsComplete} laps</span>
                          <span>P{incident.startPosition} → P{incident.finishPosition}</span>
                          {incident.timestamp && (
                            <span>{new Date(incident.timestamp).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`text-sm font-mono font-bold ${incident.iratingChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {incident.iratingChange >= 0 ? '+' : ''}{incident.iratingChange}
                        </span>
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
                      Session Details
                    </h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded border ${severityColors[selectedIncident.severity]}`}>
                      {selectedIncident.incidentCount}x incidents
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-white/40 mb-1">Driver</p>
                      <p className="text-sm text-white/80 font-medium">{selectedIncident.driverName}</p>
                    </div>

                    <div>
                      <p className="text-xs text-white/40 mb-1">Session</p>
                      <p className="text-sm text-white/80">{selectedIncident.sessionName}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-white/40 mb-1">Car</p>
                        <p className="text-sm text-white/80">{selectedIncident.carName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/40 mb-1">Type</p>
                        <p className="text-sm text-white/80 capitalize">{selectedIncident.eventType}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 bg-white/[0.03] rounded">
                        <div className="text-lg font-mono font-bold text-white">{selectedIncident.incidentCount}</div>
                        <div className="text-[10px] text-white/40 uppercase">Incidents</div>
                      </div>
                      <div className="text-center p-3 bg-white/[0.03] rounded">
                        <div className="text-lg font-mono font-bold text-white">{selectedIncident.lapsComplete}</div>
                        <div className="text-[10px] text-white/40 uppercase">Laps</div>
                      </div>
                      <div className="text-center p-3 bg-white/[0.03] rounded">
                        <div className={`text-lg font-mono font-bold ${selectedIncident.iratingChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {selectedIncident.iratingChange >= 0 ? '+' : ''}{selectedIncident.iratingChange}
                        </div>
                        <div className="text-[10px] text-white/40 uppercase">iR Change</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-white/40 mb-1">Start</p>
                        <p className="text-sm text-white/80">P{selectedIncident.startPosition}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/40 mb-1">Finish</p>
                        <p className="text-sm text-white/80">P{selectedIncident.finishPosition}</p>
                      </div>
                    </div>

                    {selectedIncident.timestamp && (
                      <div className="pt-3 border-t border-white/[0.06]">
                        <p className="text-xs text-white/40">
                          {new Date(selectedIncident.timestamp).toLocaleString()}
                        </p>
                      </div>
                    )}

                    {/* Incident rate */}
                    <div className="pt-3 border-t border-white/[0.06]">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-white/40" />
                        <p className="text-xs text-white/50">
                          Incident rate: <span className="text-white font-mono">{(selectedIncident.incidentCount / Math.max(selectedIncident.lapsComplete, 1)).toFixed(2)}</span> per lap
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-8 text-center">
                  <Eye className="w-10 h-10 text-white/20 mx-auto mb-3" />
                  <p className="text-sm text-white/50">Select a session to view details</p>
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
