import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Dashboard from './components/Dashboard';
import TelemetryPage from './components/TelemetryPage';
import StrategyPage from './components/StrategyPage';
import SettingsPage from './components/SettingsPage';
import Layout from './components/Layout';
import { io } from 'socket.io-client';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#4caf50',
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
});

function App() {
  const [telemetryData, setTelemetryData] = useState({
    lapTime: '00:00.000',
    speed: 0,
    rpm: 0,
    gear: 'N',
    position: 0,
    fuel: 100,
    tireWear: {
      frontLeft: 100,
      frontRight: 100,
      rearLeft: 100,
      rearRight: 100
    }
  });
  
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const socket = io('http://137.184.151.3:3000');
    
    socket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
      setMessages(prev => [...prev, { type: 'system', text: 'Connected to BlackBox server' }]);
    });
    
    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
      setMessages(prev => [...prev, { type: 'system', text: 'Disconnected from BlackBox server' }]);
    });
    
    socket.on('telemetry', (data) => {
      console.log('Received telemetry:', data);
      setTelemetryData(data);
    });
    
    socket.on('coaching', (data) => {
      console.log('Received coaching:', data);
      setMessages(prev => [...prev, { type: 'coach', text: data.message }]);
    });
    
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Router>
        <div style={{
          backgroundColor: '#ff0000',
          color: 'white',
          textAlign: 'center',
          padding: '10px',
          fontWeight: 'bold',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 99999,
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          LEGACY — REFERENCE ONLY — DO NOT BUILD HERE
        </div>
        <div style={{ paddingTop: '44px' }}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard telemetryData={telemetryData} connected={connected} messages={messages} />} />
              <Route path="telemetry" element={<TelemetryPage telemetryData={telemetryData} />} />
              <Route path="strategy" element={<StrategyPage telemetryData={telemetryData} messages={messages} />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
