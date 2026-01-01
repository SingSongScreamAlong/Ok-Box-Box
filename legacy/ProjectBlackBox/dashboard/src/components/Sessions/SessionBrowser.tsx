import React, { useState, useEffect } from 'react';
import './SessionBrowser.css';

interface Session {
  id: string;
  name: string;
  track: string;
  car: string;
  date: number;
  duration: number; // minutes
  laps: number;
  bestLap: string;
  avgLap: string;
  incidents: number;
  position: number;
  totalDrivers: number;
  sessionType: 'practice' | 'qualifying' | 'race';
}

interface SessionBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSession: (sessionId: string) => void;
}

const SessionBrowser: React.FC<SessionBrowserProps> = ({ isOpen, onClose, onSelectSession }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'practice' | 'qualifying' | 'race'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'track' | 'bestLap'>('date');
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  // Mock data - in production this would fetch from backend
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        setSessions([
          {
            id: '1',
            name: 'Silverstone Practice',
            track: 'Silverstone',
            car: 'Ferrari SF24',
            date: Date.now() - 86400000,
            duration: 45,
            laps: 22,
            bestLap: '1:28.234',
            avgLap: '1:29.567',
            incidents: 0,
            position: 3,
            totalDrivers: 20,
            sessionType: 'practice'
          },
          {
            id: '2',
            name: 'Silverstone Qualifying',
            track: 'Silverstone',
            car: 'Ferrari SF24',
            date: Date.now() - 82800000,
            duration: 15,
            laps: 8,
            bestLap: '1:27.891',
            avgLap: '1:28.456',
            incidents: 0,
            position: 5,
            totalDrivers: 20,
            sessionType: 'qualifying'
          },
          {
            id: '3',
            name: 'Silverstone Race',
            track: 'Silverstone',
            car: 'Ferrari SF24',
            date: Date.now() - 79200000,
            duration: 90,
            laps: 52,
            bestLap: '1:28.567',
            avgLap: '1:29.234',
            incidents: 2,
            position: 4,
            totalDrivers: 20,
            sessionType: 'race'
          },
          {
            id: '4',
            name: 'Spa Practice',
            track: 'Spa-Francorchamps',
            car: 'Ferrari SF24',
            date: Date.now() - 172800000,
            duration: 60,
            laps: 18,
            bestLap: '1:45.123',
            avgLap: '1:46.789',
            incidents: 1,
            position: 6,
            totalDrivers: 22,
            sessionType: 'practice'
          },
          {
            id: '5',
            name: 'Monza Qualifying',
            track: 'Monza',
            car: 'Ferrari SF24',
            date: Date.now() - 259200000,
            duration: 15,
            laps: 10,
            bestLap: '1:21.456',
            avgLap: '1:22.123',
            incidents: 0,
            position: 2,
            totalDrivers: 20,
            sessionType: 'qualifying'
          },
        ]);
        setLoading(false);
      }, 500);
    }
  }, [isOpen]);

  const filteredSessions = sessions
    .filter(s => filter === 'all' || s.sessionType === filter)
    .sort((a, b) => {
      switch (sortBy) {
        case 'date': return b.date - a.date;
        case 'track': return a.track.localeCompare(b.track);
        case 'bestLap': return a.bestLap.localeCompare(b.bestLap);
        default: return 0;
      }
    });

  const getSessionTypeIcon = (type: string) => {
    switch (type) {
      case 'practice': return '🔧';
      case 'qualifying': return '⏱️';
      case 'race': return '🏁';
      default: return '🏎️';
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const selectedSessionData = selectedSession ? sessions.find(s => s.id === selectedSession) : null;

  if (!isOpen) return null;

  return (
    <div className="session-browser-overlay" onClick={onClose}>
      <div className="session-browser" onClick={(e) => e.stopPropagation()}>
        <div className="browser-header">
          <h2>📂 Session History</h2>
          <button className="browser-close" onClick={onClose}>×</button>
        </div>

        <div className="browser-toolbar">
          <div className="filter-group">
            <label>Filter:</label>
            <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
              <option value="all">All Sessions</option>
              <option value="practice">Practice</option>
              <option value="qualifying">Qualifying</option>
              <option value="race">Race</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Sort by:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
              <option value="date">Date</option>
              <option value="track">Track</option>
              <option value="bestLap">Best Lap</option>
            </select>
          </div>
        </div>

        <div className="browser-content">
          <div className="sessions-list">
            {loading ? (
              <div className="loading">Loading sessions...</div>
            ) : filteredSessions.length === 0 ? (
              <div className="no-sessions">No sessions found</div>
            ) : (
              filteredSessions.map(session => (
                <div 
                  key={session.id}
                  className={`session-card ${selectedSession === session.id ? 'selected' : ''}`}
                  onClick={() => setSelectedSession(session.id)}
                >
                  <div className="session-icon">{getSessionTypeIcon(session.sessionType)}</div>
                  <div className="session-info">
                    <div className="session-name">{session.name}</div>
                    <div className="session-meta">
                      <span>{session.track}</span>
                      <span>•</span>
                      <span>{formatDate(session.date)}</span>
                    </div>
                  </div>
                  <div className="session-stats">
                    <div className="stat">
                      <span className="stat-value">{session.bestLap}</span>
                      <span className="stat-label">Best</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">P{session.position}</span>
                      <span className="stat-label">Pos</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="session-detail">
            {selectedSessionData ? (
              <>
                <div className="detail-header">
                  <span className="detail-icon">{getSessionTypeIcon(selectedSessionData.sessionType)}</span>
                  <div className="detail-title">
                    <h3>{selectedSessionData.name}</h3>
                    <span className="detail-date">{formatDate(selectedSessionData.date)}</span>
                  </div>
                </div>

                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="label">Track</span>
                    <span className="value">{selectedSessionData.track}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Car</span>
                    <span className="value">{selectedSessionData.car}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Duration</span>
                    <span className="value">{selectedSessionData.duration} min</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Laps</span>
                    <span className="value">{selectedSessionData.laps}</span>
                  </div>
                  <div className="detail-item highlight">
                    <span className="label">Best Lap</span>
                    <span className="value purple">{selectedSessionData.bestLap}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Avg Lap</span>
                    <span className="value">{selectedSessionData.avgLap}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Position</span>
                    <span className="value">P{selectedSessionData.position} / {selectedSessionData.totalDrivers}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Incidents</span>
                    <span className={`value ${selectedSessionData.incidents > 0 ? 'warning' : 'good'}`}>
                      {selectedSessionData.incidents}x
                    </span>
                  </div>
                </div>

                <div className="detail-actions">
                  <button 
                    className="action-primary"
                    onClick={() => onSelectSession(selectedSessionData.id)}
                  >
                    📊 View Analysis
                  </button>
                  <button className="action-secondary">
                    📥 Export Data
                  </button>
                  <button className="action-secondary">
                    🔄 Compare
                  </button>
                </div>
              </>
            ) : (
              <div className="no-selection">
                <span className="icon">👆</span>
                <span>Select a session to view details</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionBrowser;
