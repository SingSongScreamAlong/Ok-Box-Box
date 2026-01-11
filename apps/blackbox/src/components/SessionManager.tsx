import { useState } from 'react';
import './SessionManager.css';

interface Driver {
  id: string;
  name: string;
  carNumber: string;
  position: number;
  isActive: boolean;
}

interface Session {
  id: string;
  type: string;
  track: string;
  startTime: number;
  drivers: Driver[];
}

interface SessionManagerProps {
  currentSession: Session | null;
  onDriverSelect: (driverId: string) => void;
  selectedDriverId: string | null;
}

export default function SessionManager({ 
  currentSession, 
  onDriverSelect, 
  selectedDriverId 
}: SessionManagerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filter, setFilter] = useState('');

  const filteredDrivers = currentSession?.drivers.filter(d => 
    d.name.toLowerCase().includes(filter.toLowerCase()) ||
    d.carNumber.includes(filter)
  ) || [];

  const selectedDriver = currentSession?.drivers.find(d => d.id === selectedDriverId);

  return (
    <div className="panel session-manager">
      <div className="panel-header">
        SESSION
        {currentSession && (
          <span className="session-type">{currentSession.type}</span>
        )}
      </div>
      <div className="panel-content">
        {!currentSession ? (
          <div className="no-session">
            <div className="no-session-icon">🏁</div>
            <div className="no-session-text">No Active Session</div>
            <div className="no-session-hint">Waiting for relay connection...</div>
          </div>
        ) : (
          <>
            <div className="session-info">
              <div className="session-track">
                <span className="track-icon">🏎️</span>
                <span className="track-name">{currentSession.track}</span>
              </div>
              <div className="session-stats">
                <span className="stat">{currentSession.drivers.length} Drivers</span>
              </div>
            </div>

            <div className="driver-selector">
              <div 
                className="selected-driver"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {selectedDriver ? (
                  <>
                    <span className="driver-number">#{selectedDriver.carNumber}</span>
                    <span className="driver-name">{selectedDriver.name}</span>
                    <span className="driver-position">P{selectedDriver.position}</span>
                  </>
                ) : (
                  <span className="no-driver">Select a driver...</span>
                )}
                <span className="expand-icon">{isExpanded ? '▲' : '▼'}</span>
              </div>

              {isExpanded && (
                <div className="driver-dropdown">
                  <input
                    type="text"
                    className="driver-search"
                    placeholder="Search drivers..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    autoFocus
                  />
                  <div className="driver-list">
                    {filteredDrivers.map(driver => (
                      <div
                        key={driver.id}
                        className={`driver-item ${driver.id === selectedDriverId ? 'selected' : ''} ${driver.isActive ? 'active' : 'inactive'}`}
                        onClick={() => {
                          onDriverSelect(driver.id);
                          setIsExpanded(false);
                          setFilter('');
                        }}
                      >
                        <span className="driver-pos">P{driver.position}</span>
                        <span className="driver-num">#{driver.carNumber}</span>
                        <span className="driver-name">{driver.name}</span>
                        {!driver.isActive && <span className="driver-status">OUT</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="quick-actions">
              <button className="action-btn" title="Follow Leader">
                🥇 Leader
              </button>
              <button className="action-btn" title="Follow Battle">
                ⚔️ Battle
              </button>
              <button className="action-btn" title="Follow Pit">
                🔧 Pit
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
