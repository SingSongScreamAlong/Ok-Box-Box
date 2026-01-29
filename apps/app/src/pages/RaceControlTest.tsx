import { useState, useEffect } from 'react';
import { useRelay } from '../hooks/useRelay';
import { 
  AlertTriangle, Flag, Clock, Car, Eye,
  CheckCircle, Radio, Zap
} from 'lucide-react';

interface DisplayIncident {
  id: string;
  lap: number;
  turn: string;
  timestamp: string;
  type: string;
  severity: 'light' | 'medium' | 'heavy';
  drivers: { carNumber: string; name: string }[];
  status: 'new' | 'reviewing' | 'cleared' | 'penalized';
}

const statusColors: Record<string, string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  checkered: 'bg-white',
  caution: 'bg-yellow-500',
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

export function RaceControlTest() {
  const { status, telemetry, session, incidents: liveIncidents, connect } = useRelay();
  const [displayIncidents, setDisplayIncidents] = useState<DisplayIncident[]>([]);
  const [sessionStatus, setSessionStatus] = useState<string>('not_started');
  const [connectAttempted, setConnectAttempted] = useState(false);

  // Force connect immediately on mount
  useEffect(() => {
    if (!connectAttempted) {
      setConnectAttempted(true);
      console.log('[RCO] Forcing connect on mount, current status:', status);
      connect();
    }
  }, [connect, connectAttempted, status]);

  // Retry connect if still disconnected after 2 seconds
  useEffect(() => {
    if (status === 'disconnected' && connectAttempted) {
      const timer = setTimeout(() => {
        console.log('[RCO] Still disconnected, retrying connect...');
        connect();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, connect, connectAttempted]);

  // Update incidents from live data
  useEffect(() => {
    if (liveIncidents && liveIncidents.length > 0) {
      const mapped: DisplayIncident[] = liveIncidents.map(inc => ({
        id: inc.id,
        lap: inc.lapNumber,
        turn: inc.cornerName || 'Unknown',
        timestamp: new Date(inc.timestamp).toISOString(),
        type: inc.type,
        severity: inc.severity === 'high' ? 'heavy' : inc.severity === 'low' ? 'light' : 'medium',
        drivers: inc.involvedCars?.map(car => ({
          carNumber: car.carNumber,
          name: car.driverName
        })) || [],
        status: inc.status
      }));
      setDisplayIncidents(mapped);
    }
  }, [liveIncidents]);

  // Update session status from telemetry
  useEffect(() => {
    if (status === 'in_session') {
      setSessionStatus('green');
    }
  }, [status]);

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const handleIncidentAction = (incidentId: string, action: 'clear' | 'penalize' | 'review') => {
    setDisplayIncidents(prev => prev.map(inc => 
      inc.id === incidentId 
        ? { ...inc, status: action === 'clear' ? 'cleared' : action === 'penalize' ? 'penalized' : 'reviewing' }
        : inc
    ));
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Flag className="w-6 h-6 text-cyan-400" />
              <h1 className="text-xl font-bold">Race Control</h1>
              <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded">TEST MODE</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${status === 'in_session' ? 'bg-green-500 animate-pulse' : status === 'connected' ? 'bg-blue-500' : status === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-500'}`} />
              <span className="text-sm text-gray-400">
                {status === 'in_session' ? 'LIVE' : status === 'connected' ? 'Connected' : status === 'connecting' ? 'Connecting...' : 'Disconnected'}
              </span>
              {status === 'disconnected' && (
                <button 
                  onClick={() => connect()}
                  className="ml-2 px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs hover:bg-cyan-500/30"
                >
                  Connect
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Panel - Session Info */}
        <div className="w-80 bg-gray-800/50 border-r border-gray-700 p-4 space-y-4">
          {/* Session Status */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
              <Radio className="w-4 h-4" />
              SESSION STATUS
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Status</span>
                <span className={`font-mono uppercase ${status === 'in_session' ? 'text-green-400' : status === 'connected' ? 'text-blue-400' : 'text-gray-400'}`}>{status}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Flag</span>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded ${status === 'in_session' ? 'bg-green-500' : 'bg-gray-500'}`} />
                  <span className="font-mono uppercase">{status === 'in_session' ? 'GREEN' : 'N/A'}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Track</span>
                <span className="font-mono text-sm text-right max-w-[150px] truncate">{session.trackName || 'Waiting...'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Session</span>
                <span className="font-mono uppercase">{session.sessionType || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Cars</span>
                <span className="font-mono text-cyan-400">{telemetry.otherCars?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Current Lap</span>
                <span className="font-mono">{telemetry.lap || 0}</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              INCIDENT STATS
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-700/50 rounded p-3 text-center">
                <div className="text-2xl font-bold text-red-400">{displayIncidents.filter(i => i.status === 'new').length}</div>
                <div className="text-xs text-gray-400">New</div>
              </div>
              <div className="bg-gray-700/50 rounded p-3 text-center">
                <div className="text-2xl font-bold text-yellow-400">{displayIncidents.filter(i => i.status === 'reviewing').length}</div>
                <div className="text-xs text-gray-400">Reviewing</div>
              </div>
              <div className="bg-gray-700/50 rounded p-3 text-center">
                <div className="text-2xl font-bold text-green-400">{displayIncidents.filter(i => i.status === 'cleared').length}</div>
                <div className="text-xs text-gray-400">Cleared</div>
              </div>
              <div className="bg-gray-700/50 rounded p-3 text-center">
                <div className="text-2xl font-bold text-purple-400">{displayIncidents.filter(i => i.status === 'penalized').length}</div>
                <div className="text-xs text-gray-400">Penalized</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Panel - Incidents */}
        <div className="flex-1 p-4 overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              Live Incidents
              <span className="text-sm text-gray-400">({displayIncidents.length})</span>
            </h2>
          </div>

          {displayIncidents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Eye className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg">No incidents detected</p>
              <p className="text-sm">Incidents will appear here when they occur</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayIncidents.map((incident) => (
                <div 
                  key={incident.id}
                  className={`bg-gray-800 rounded-lg border ${
                    incident.status === 'new' ? 'border-red-500/50' : 'border-gray-700'
                  } p-4`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${incidentStatusColors[incident.status]}`}>
                          {incident.status.toUpperCase()}
                        </span>
                        <span className={`text-sm font-semibold ${severityColors[incident.severity]}`}>
                          {incident.severity.toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-400">
                          Lap {incident.lap} • {incident.turn}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(incident.timestamp)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-gray-400">Type:</span>
                        <span className="text-sm font-mono uppercase">{incident.type}</span>
                      </div>
                      {incident.drivers.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Car className="w-4 h-4 text-gray-400" />
                          <div className="flex flex-wrap gap-2">
                            {incident.drivers.map((driver, idx) => (
                              <span key={idx} className="bg-gray-700 px-2 py-1 rounded text-sm">
                                #{driver.carNumber} {driver.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      {incident.status === 'new' && (
                        <>
                          <button
                            onClick={() => handleIncidentAction(incident.id, 'review')}
                            className="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded text-sm hover:bg-yellow-500/30 transition"
                          >
                            Review
                          </button>
                          <button
                            onClick={() => handleIncidentAction(incident.id, 'clear')}
                            className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded text-sm hover:bg-green-500/30 transition"
                          >
                            Clear
                          </button>
                        </>
                      )}
                      {incident.status === 'reviewing' && (
                        <>
                          <button
                            onClick={() => handleIncidentAction(incident.id, 'clear')}
                            className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded text-sm hover:bg-green-500/30 transition"
                          >
                            <CheckCircle className="w-4 h-4 inline mr-1" />
                            Clear
                          </button>
                          <button
                            onClick={() => handleIncidentAction(incident.id, 'penalize')}
                            className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded text-sm hover:bg-purple-500/30 transition"
                          >
                            Penalize
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
