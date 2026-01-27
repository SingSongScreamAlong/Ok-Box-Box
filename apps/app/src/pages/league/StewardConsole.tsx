import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getLeague, getUserLeagueRole, League } from '../../lib/leagues';
import { useRelay } from '../../hooks/useRelay';
import { 
  ArrowLeft, Radio, AlertTriangle, Flag, Clock, 
  Play, Pause, Users, Car, Zap, Eye, Volume2,
  CheckCircle, XCircle, MessageSquare, Send,
  ChevronDown, Settings, Monitor
} from 'lucide-react';

interface LiveIncident {
  id: string;
  lap: number;
  turn: string;
  timestamp: string;
  type: 'contact' | 'off_track' | 'unsafe_rejoin' | 'blocking' | 'pit_violation';
  severity: 'light' | 'medium' | 'heavy';
  drivers: { carNumber: string; name: string }[];
  status: 'new' | 'reviewing' | 'cleared' | 'penalized';
}

interface RaceControl {
  sessionStatus: 'green' | 'yellow' | 'red' | 'checkered' | 'not_started';
  safetyCarDeployed: boolean;
  currentLap: number;
  totalLaps: number;
  timeRemaining: string;
  carsOnTrack: number;
  incidents: LiveIncident[];
}

const mockRaceControl: RaceControl = {
  sessionStatus: 'green',
  safetyCarDeployed: false,
  currentLap: 42,
  totalLaps: 100,
  timeRemaining: '1:23:45',
  carsOnTrack: 24,
  incidents: [
    {
      id: 'live-1',
      lap: 42,
      turn: 'Turn 3',
      timestamp: new Date().toISOString(),
      type: 'contact',
      severity: 'medium',
      drivers: [
        { carNumber: '7', name: 'Alex Rivera' },
        { carNumber: '23', name: 'Marcus Chen' }
      ],
      status: 'new'
    },
    {
      id: 'live-2',
      lap: 41,
      turn: 'Turn 1',
      timestamp: new Date(Date.now() - 60000).toISOString(),
      type: 'off_track',
      severity: 'light',
      drivers: [
        { carNumber: '15', name: 'Jordan Kim' }
      ],
      status: 'cleared'
    },
    {
      id: 'live-3',
      lap: 39,
      turn: 'Pit Entry',
      timestamp: new Date(Date.now() - 180000).toISOString(),
      type: 'pit_violation',
      severity: 'medium',
      drivers: [
        { carNumber: '42', name: 'Sarah Williams' }
      ],
      status: 'penalized'
    }
  ]
};

const statusColors: Record<string, string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  checkered: 'bg-white',
  not_started: 'bg-gray-500'
};

const incidentStatusColors: Record<string, string> = {
  new: 'bg-red-500/20 text-red-400 border-red-500/30',
  reviewing: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  cleared: 'bg-green-500/20 text-green-400 border-green-500/30',
  penalized: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
};

const severityColors: Record<string, string> = {
  light: 'text-yellow-400',
  medium: 'text-orange-400',
  heavy: 'text-red-400'
};

export function StewardConsole() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { user } = useAuth();
  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);
  const [raceControl, setRaceControl] = useState<RaceControl>(mockRaceControl);
  const [selectedIncident, setSelectedIncident] = useState<LiveIncident | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [isLive, setIsLive] = useState(true);
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

  // Simulate live updates
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      setRaceControl(prev => ({
        ...prev,
        currentLap: Math.min(prev.currentLap + 1, prev.totalLaps),
        timeRemaining: formatTimeRemaining(prev.timeRemaining)
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, [isLive]);

  const formatTimeRemaining = (time: string): string => {
    const [h, m, s] = time.split(':').map(Number);
    let totalSeconds = h * 3600 + m * 60 + s - 5;
    if (totalSeconds < 0) totalSeconds = 0;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

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

  const handleIncidentAction = (incidentId: string, action: 'clear' | 'penalize' | 'review') => {
    setRaceControl(prev => ({
      ...prev,
      incidents: prev.incidents.map(inc => 
        inc.id === incidentId 
          ? { ...inc, status: action === 'clear' ? 'cleared' : action === 'penalize' ? 'penalized' : 'reviewing' }
          : inc
      )
    }));
  };

  const handleSessionControl = (action: 'yellow' | 'red' | 'green' | 'safety_car') => {
    if (action === 'safety_car') {
      setRaceControl(prev => ({ ...prev, safetyCarDeployed: !prev.safetyCarDeployed }));
    } else {
      setRaceControl(prev => ({ ...prev, sessionStatus: action }));
    }
  };

  const handleAnnouncement = () => {
    if (!announcement.trim()) return;
    // In real implementation, this would broadcast to all connected clients
    alert(`Announcement sent: ${announcement}`);
    setAnnouncement('');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-white/50">Loading...</div>
      </div>
    );
  }

  const newIncidents = raceControl.incidents.filter(i => i.status === 'new').length;

  return (
    <div className="min-h-screen relative bg-[#0a0a0a]">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#111] to-[#0a0a0a]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(249,115,22,0.05),transparent_50%)]" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="border-b border-white/[0.06] bg-black/40 backdrop-blur-sm">
          <div className="max-w-[1800px] mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link 
                  to={`/league/${leagueId}`}
                  className="p-2 hover:bg-white/[0.05] rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-white/60" />
                </Link>
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
                  <h1 
                    className="text-lg font-semibold text-white uppercase tracking-wider"
                    style={{ fontFamily: 'Orbitron, sans-serif' }}
                  >
                    Steward Console
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsLive(!isLive)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    isLive ? 'bg-red-500/20 text-red-400' : 'bg-white/[0.05] text-white/60'
                  }`}
                >
                  {isLive ? <Radio className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  {isLive ? 'LIVE' : 'PAUSED'}
                </button>
                {newIncidents > 0 && (
                  <span className="px-3 py-1.5 bg-red-500/20 text-red-400 text-xs font-medium rounded animate-pulse">
                    {newIncidents} New Incident{newIncidents > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1800px] mx-auto p-4">
          <div className="grid grid-cols-12 gap-4">
            {/* Left Panel - Race Status */}
            <div className="col-span-3 space-y-4">
              {/* Session Status */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4">
                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Session Status</h3>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-8 h-8 rounded ${statusColors[raceControl.sessionStatus]}`} />
                  <div>
                    <p className="text-lg font-bold text-white uppercase">{raceControl.sessionStatus} FLAG</p>
                    {raceControl.safetyCarDeployed && (
                      <p className="text-xs text-yellow-400">Safety Car Deployed</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-white/[0.03] rounded p-2">
                    <p className="text-2xl font-bold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                      {raceControl.currentLap}
                    </p>
                    <p className="text-[10px] text-white/40 uppercase">Lap</p>
                  </div>
                  <div className="bg-white/[0.03] rounded p-2">
                    <p className="text-2xl font-bold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                      {raceControl.totalLaps}
                    </p>
                    <p className="text-[10px] text-white/40 uppercase">Total</p>
                  </div>
                </div>
                <div className="mt-3 bg-white/[0.03] rounded p-2 text-center">
                  <p className="text-xl font-mono text-white">{raceControl.timeRemaining}</p>
                  <p className="text-[10px] text-white/40 uppercase">Time Remaining</p>
                </div>
                <div className="mt-3 flex items-center justify-center gap-2 text-sm text-white/60">
                  <Car className="w-4 h-4" />
                  <span>{raceControl.carsOnTrack} cars on track</span>
                </div>
              </div>

              {/* Race Control Actions */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4">
                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Race Control</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleSessionControl('green')}
                    className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                      raceControl.sessionStatus === 'green'
                        ? 'bg-green-500 text-white'
                        : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    }`}
                  >
                    GREEN
                  </button>
                  <button
                    onClick={() => handleSessionControl('yellow')}
                    className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                      raceControl.sessionStatus === 'yellow'
                        ? 'bg-yellow-500 text-black'
                        : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                    }`}
                  >
                    YELLOW
                  </button>
                  <button
                    onClick={() => handleSessionControl('red')}
                    className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                      raceControl.sessionStatus === 'red'
                        ? 'bg-red-500 text-white'
                        : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    }`}
                  >
                    RED
                  </button>
                  <button
                    onClick={() => handleSessionControl('safety_car')}
                    className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                      raceControl.safetyCarDeployed
                        ? 'bg-orange-500 text-white'
                        : 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                    }`}
                  >
                    SC
                  </button>
                </div>
              </div>

              {/* Announcements */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4">
                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Broadcast</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={announcement}
                    onChange={e => setAnnouncement(e.target.value)}
                    placeholder="Race control message..."
                    className="flex-1 px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20"
                  />
                  <button
                    onClick={handleAnnouncement}
                    className="p-2 bg-[#f97316] hover:bg-[#ea580c] rounded transition-colors"
                  >
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </div>

            {/* Center Panel - Live Incidents */}
            <div className="col-span-6">
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg">
                <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    Live Incidents
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/40">{raceControl.incidents.length} total</span>
                  </div>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {raceControl.incidents.map(incident => (
                    <div
                      key={incident.id}
                      className={`p-4 transition-colors ${
                        selectedIncident?.id === incident.id ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded border ${incidentStatusColors[incident.status]}`}>
                              {incident.status.toUpperCase()}
                            </span>
                            <span className={`text-xs font-medium ${severityColors[incident.severity]}`}>
                              {incident.severity.toUpperCase()}
                            </span>
                            <span className="text-xs text-white/40 capitalize">
                              {incident.type.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mb-2">
                            {incident.drivers.map((driver, i) => (
                              <span key={i} className="flex items-center gap-1 text-sm text-white/80">
                                <span className="font-bold text-[#f97316]">#{driver.carNumber}</span>
                                {driver.name}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-white/40">
                            <span>Lap {incident.lap}</span>
                            <span>{incident.turn}</span>
                          </div>
                        </div>
                        {incident.status === 'new' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleIncidentAction(incident.id, 'review')}
                              className="p-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded transition-colors"
                              title="Review"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleIncidentAction(incident.id, 'clear')}
                              className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded transition-colors"
                              title="No Action"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleIncidentAction(incident.id, 'penalize')}
                              className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors"
                              title="Penalize"
                            >
                              <Flag className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        {incident.status === 'reviewing' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleIncidentAction(incident.id, 'clear')}
                              className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleIncidentAction(incident.id, 'penalize')}
                              className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors"
                            >
                              <Flag className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {raceControl.incidents.length === 0 && (
                    <div className="p-12 text-center">
                      <CheckCircle className="w-12 h-12 text-green-500/30 mx-auto mb-3" />
                      <p className="text-white/50">No incidents detected</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Panel - Quick Actions & Stats */}
            <div className="col-span-3 space-y-4">
              {/* Quick Penalties */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4">
                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Quick Penalties</h3>
                <div className="space-y-2">
                  <button className="w-full p-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded text-sm text-white/70 text-left transition-colors">
                    +5 Second Time Penalty
                  </button>
                  <button className="w-full p-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded text-sm text-white/70 text-left transition-colors">
                    +10 Second Time Penalty
                  </button>
                  <button className="w-full p-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded text-sm text-white/70 text-left transition-colors">
                    Drive Through Penalty
                  </button>
                  <button className="w-full p-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded text-sm text-white/70 text-left transition-colors">
                    Stop & Go (10s)
                  </button>
                  <button className="w-full p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded text-sm text-red-400 text-left transition-colors">
                    Disqualification
                  </button>
                </div>
              </div>

              {/* Session Stats */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4">
                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Session Stats</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">Total Incidents</span>
                    <span className="text-sm font-medium text-white">{raceControl.incidents.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">Penalties Issued</span>
                    <span className="text-sm font-medium text-white">
                      {raceControl.incidents.filter(i => i.status === 'penalized').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">No Further Action</span>
                    <span className="text-sm font-medium text-white">
                      {raceControl.incidents.filter(i => i.status === 'cleared').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">Under Review</span>
                    <span className="text-sm font-medium text-yellow-400">
                      {raceControl.incidents.filter(i => i.status === 'reviewing').length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Links */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4">
                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Quick Links</h3>
                <div className="space-y-2">
                  <Link
                    to={`/league/${leagueId}/incidents`}
                    className="flex items-center gap-2 p-2 bg-white/[0.03] hover:bg-white/[0.06] rounded text-sm text-white/70 transition-colors"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Incident Review
                  </Link>
                  <Link
                    to={`/league/${leagueId}/penalties`}
                    className="flex items-center gap-2 p-2 bg-white/[0.03] hover:bg-white/[0.06] rounded text-sm text-white/70 transition-colors"
                  >
                    <Flag className="w-4 h-4" />
                    Penalty Management
                  </Link>
                  <Link
                    to={`/league/${leagueId}/protests`}
                    className="flex items-center gap-2 p-2 bg-white/[0.03] hover:bg-white/[0.06] rounded text-sm text-white/70 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Protests
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StewardConsole;
