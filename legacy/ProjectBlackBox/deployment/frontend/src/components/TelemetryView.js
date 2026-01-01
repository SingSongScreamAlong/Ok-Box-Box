import React, { useState, useEffect } from 'react';
import { getLatestTelemetry, getSessionTelemetry, getDriverTelemetry } from '../services/api';

function TelemetryView() {
  const [telemetry, setTelemetry] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [telemetryHistory, setTelemetryHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load initial telemetry data
    const loadInitialData = async () => {
      try {
        const data = await getLatestTelemetry();
        if (data) {
          setTelemetry(data);
          
          // Extract session and driver IDs if available
          if (data.sessionId && !sessions.includes(data.sessionId)) {
            setSessions(prev => [...prev, data.sessionId]);
          }
          
          if (data.driverId && !drivers.includes(data.driverId)) {
            setDrivers(prev => [...prev, data.driverId]);
          }
        }
      } catch (error) {
        console.error('Error loading initial telemetry:', error);
      }
    };

    loadInitialData();
  }, [sessions, drivers]);

  const handleSessionSelect = async (e) => {
    const sessionId = e.target.value;
    setSelectedSession(sessionId);
    
    if (sessionId) {
      setLoading(true);
      try {
        const data = await getSessionTelemetry(sessionId);
        setTelemetryHistory(data);
      } catch (error) {
        console.error('Error loading session telemetry:', error);
        setTelemetryHistory([]);
      }
      setLoading(false);
    } else {
      setTelemetryHistory([]);
    }
  };

  const handleDriverSelect = async (e) => {
    const driverId = e.target.value;
    setSelectedDriver(driverId);
    
    if (driverId) {
      setLoading(true);
      try {
        const data = await getDriverTelemetry(driverId);
        setTelemetryHistory(data);
      } catch (error) {
        console.error('Error loading driver telemetry:', error);
        setTelemetryHistory([]);
      }
      setLoading(false);
    } else {
      setTelemetryHistory([]);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div>
      <h1>Telemetry Data</h1>
      
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Latest Telemetry</h2>
        </div>
        {telemetry ? (
          <div className="telemetry-grid">
            <div className="telemetry-item">
              <span className="telemetry-label">Speed</span>
              <span className="telemetry-value">{telemetry.speed || 0} km/h</span>
            </div>
            <div className="telemetry-item">
              <span className="telemetry-label">Throttle</span>
              <span className="telemetry-value">{telemetry.throttle || 0}%</span>
            </div>
            <div className="telemetry-item">
              <span className="telemetry-label">Brake</span>
              <span className="telemetry-value">{telemetry.brake || 0}%</span>
            </div>
            <div className="telemetry-item">
              <span className="telemetry-label">Gear</span>
              <span className="telemetry-value">{telemetry.gear || 'N'}</span>
            </div>
            {telemetry.fuel !== undefined && (
              <div className="telemetry-item">
                <span className="telemetry-label">Fuel</span>
                <span className="telemetry-value">{telemetry.fuel.toFixed(1)} L</span>
              </div>
            )}
            {telemetry.lap !== undefined && (
              <div className="telemetry-item">
                <span className="telemetry-label">Lap</span>
                <span className="telemetry-value">{telemetry.lap}</span>
              </div>
            )}
          </div>
        ) : (
          <p>No telemetry data available</p>
        )}
      </div>
      
      <div className="filter-controls">
        <div className="filter-group">
          <label htmlFor="session-select">Filter by Session:</label>
          <select 
            id="session-select" 
            value={selectedSession} 
            onChange={handleSessionSelect}
          >
            <option value="">Select Session</option>
            {sessions.map(session => (
              <option key={session} value={session}>{session}</option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="driver-select">Filter by Driver:</label>
          <select 
            id="driver-select" 
            value={selectedDriver} 
            onChange={handleDriverSelect}
          >
            <option value="">Select Driver</option>
            {drivers.map(driver => (
              <option key={driver} value={driver}>{driver}</option>
            ))}
          </select>
        </div>
      </div>
      
      {loading ? (
        <p>Loading telemetry history...</p>
      ) : (
        <div className="telemetry-history">
          <h3>Telemetry History</h3>
          {telemetryHistory.length > 0 ? (
            <table className="telemetry-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Speed</th>
                  <th>Throttle</th>
                  <th>Brake</th>
                  <th>Gear</th>
                  <th>Fuel</th>
                  <th>Lap</th>
                </tr>
              </thead>
              <tbody>
                {telemetryHistory.map((item, index) => (
                  <tr key={index}>
                    <td>{formatTimestamp(item.timestamp)}</td>
                    <td>{item.data.speed || 0} km/h</td>
                    <td>{item.data.throttle || 0}%</td>
                    <td>{item.data.brake || 0}%</td>
                    <td>{item.data.gear || 'N'}</td>
                    <td>{item.data.fuel !== undefined ? `${item.data.fuel.toFixed(1)} L` : 'N/A'}</td>
                    <td>{item.data.lap !== undefined ? item.data.lap : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No history data available. Select a session or driver to view history.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default TelemetryView;
