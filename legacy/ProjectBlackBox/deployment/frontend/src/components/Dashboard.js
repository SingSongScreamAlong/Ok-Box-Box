import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import io from 'socket.io-client';
import { getLatestTelemetry } from '../services/api';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function Dashboard() {
  const [connected, setConnected] = useState(false);
  const [telemetry, setTelemetry] = useState(null);
  const [telemetryHistory, setTelemetryHistory] = useState({
    speed: [],
    throttle: [],
    brake: [],
    timestamps: []
  });

  useEffect(() => {
    // Load initial telemetry data
    const loadInitialData = async () => {
      try {
        const data = await getLatestTelemetry();
        if (data) {
          setTelemetry(data);
        }
      } catch (error) {
        console.error('Error loading initial telemetry:', error);
      }
    };

    loadInitialData();

    // Connect to Socket.IO server
    const apiUrl = process.env.REACT_APP_API_URL || '';
    const socket = io(apiUrl, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('Connected to BlackBox server');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from BlackBox server');
      setConnected(false);
    });

    socket.on('telemetry_update', (data) => {
      setTelemetry(data);
      
      // Update history for charts (keep last 20 points)
      setTelemetryHistory(prev => {
        const timestamp = new Date().toLocaleTimeString();
        
        return {
          speed: [...prev.speed.slice(-19), data.speed || 0],
          throttle: [...prev.throttle.slice(-19), data.throttle || 0],
          brake: [...prev.brake.slice(-19), data.brake || 0],
          timestamps: [...prev.timestamps.slice(-19), timestamp]
        };
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const speedChartData = {
    labels: telemetryHistory.timestamps,
    datasets: [
      {
        label: 'Speed',
        data: telemetryHistory.speed,
        borderColor: '#4caf50',
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
        tension: 0.4,
      }
    ]
  };

  const pedalChartData = {
    labels: telemetryHistory.timestamps,
    datasets: [
      {
        label: 'Throttle',
        data: telemetryHistory.throttle,
        borderColor: '#2196f3',
        backgroundColor: 'rgba(33, 150, 243, 0.2)',
        tension: 0.4,
      },
      {
        label: 'Brake',
        data: telemetryHistory.brake,
        borderColor: '#f44336',
        backgroundColor: 'rgba(244, 67, 54, 0.2)',
        tension: 0.4,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: '#b0b0b0'
        }
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: '#b0b0b0'
        }
      }
    },
    plugins: {
      legend: {
        labels: {
          color: '#f5f5f5'
        }
      }
    }
  };

  return (
    <div>
      <h1>BlackBox Dashboard</h1>
      <div className="connection-status">
        <span 
          className={`status-indicator ${connected ? 'status-online' : 'status-offline'}`}
        ></span>
        {connected ? 'Connected to Server' : 'Disconnected'}
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Current Telemetry</h2>
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

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Driver Info</h2>
          </div>
          {telemetry && telemetry.driverId ? (
            <div className="telemetry-grid">
              <div className="telemetry-item">
                <span className="telemetry-label">Driver ID</span>
                <span className="telemetry-value">{telemetry.driverId}</span>
              </div>
              <div className="telemetry-item">
                <span className="telemetry-label">Session ID</span>
                <span className="telemetry-value">{telemetry.sessionId || 'N/A'}</span>
              </div>
            </div>
          ) : (
            <p>No driver data available</p>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Speed Chart</h2>
          </div>
          <div className="chart-container">
            <Line data={speedChartData} options={chartOptions} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Pedal Input</h2>
          </div>
          <div className="chart-container">
            <Line data={pedalChartData} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
