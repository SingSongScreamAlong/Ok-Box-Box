import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import TelemetryView from './components/TelemetryView';
import Header from './components/Header';
import './App.css';

function App() {
  return (
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
      <div className="app">
        <Header />
        <main className="main-content" style={{ paddingTop: '44px' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/telemetry" element={<TelemetryView />} />
          </Routes>
        </main>
        <footer className="footer">
          <p>BlackBox Racing Telemetry &copy; {new Date().getFullYear()}</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
