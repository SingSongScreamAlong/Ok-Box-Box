import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../../config/environment';
import './SimulationControl.css';

interface SimulationStatus {
  running: boolean;
  lap: number;
  sector: number;
  speed: number;
  fuel: number;
}

const SimulationControl: React.FC = () => {
  const [status, setStatus] = useState<SimulationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial status
  useEffect(() => {
    fetchStatus();
  }, []);

  // Poll status while running
  useEffect(() => {
    if (!status?.running) return;
    
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [status?.running]);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/simulation/status`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        setError(null);
      }
    } catch (err) {
      console.error('Failed to fetch simulation status:', err);
    }
  };

  const startSimulation = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/simulation/start`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        console.log('Simulation started:', data);
        await fetchStatus();
      } else {
        setError('Failed to start simulation');
      }
    } catch (err) {
      setError('Connection error');
      console.error('Failed to start simulation:', err);
    } finally {
      setLoading(false);
    }
  };

  const stopSimulation = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/simulation/stop`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        console.log('Simulation stopped:', data);
        await fetchStatus();
      } else {
        setError('Failed to stop simulation');
      }
    } catch (err) {
      setError('Connection error');
      console.error('Failed to stop simulation:', err);
    } finally {
      setLoading(false);
    }
  };

  const isRunning = status?.running ?? false;

  return (
    <div className={`simulation-control ${isRunning ? 'running' : 'stopped'}`}>
      <div className="simulation-header">
        <span className="simulation-title">Telemetry Simulation</span>
        <span className={`simulation-status ${isRunning ? 'live' : 'offline'}`}>
          {isRunning ? '● LIVE' : '○ STOPPED'}
        </span>
      </div>

      {isRunning && status && (
        <div className="simulation-stats">
          <div className="stat">
            <span className="stat-label">LAP</span>
            <span className="stat-value">{status.lap}</span>
          </div>
          <div className="stat">
            <span className="stat-label">SECTOR</span>
            <span className="stat-value">{status.sector}</span>
          </div>
          <div className="stat">
            <span className="stat-label">SPEED</span>
            <span className="stat-value">{status.speed?.toFixed(0)} km/h</span>
          </div>
          <div className="stat">
            <span className="stat-label">FUEL</span>
            <span className="stat-value">{status.fuel?.toFixed(1)} L</span>
          </div>
        </div>
      )}

      <div className="simulation-actions">
        {!isRunning ? (
          <button 
            className="sim-button start" 
            onClick={startSimulation}
            disabled={loading}
          >
            {loading ? 'Starting...' : '▶ Start Simulation'}
          </button>
        ) : (
          <button 
            className="sim-button stop" 
            onClick={stopSimulation}
            disabled={loading}
          >
            {loading ? 'Stopping...' : '■ Stop Simulation'}
          </button>
        )}
      </div>

      {error && <div className="simulation-error">{error}</div>}

      <div className="simulation-hint">
        {isRunning 
          ? 'Generating mock telemetry data...'
          : 'Start simulation to test UI without iRacing'
        }
      </div>
    </div>
  );
};

export default SimulationControl;
