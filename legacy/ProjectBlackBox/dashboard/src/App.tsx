import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import './App.css';
import './styles/dashboard.css';
import Dashboard from './components/Dashboard/Dashboard';
import ComponentValidator from './components/validation/ComponentValidator';
import RelayAgentPage from './components/RelayAgentPage';
import LandingPage from './components/Pages/LandingPage';
import LoginPage from './components/Pages/LoginPage';
import RegisterPage from './components/Pages/RegisterPage';
import TrackMapPage from './components/Pages/TrackMapPage';
import TrainingDashboard from './components/Training/TrainingDashboard';
import VoiceEngineerPage from './components/Pages/VoiceEngineerPage';
import { multiDriverService } from './services/MultiDriverService';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import { initializeMockDriverData } from './utils/mockDriverData';
import { AuthProvider, useAuth } from './context/AuthContext';

// Protected Route Component
const PrivateRoute = ({ children }: { children: React.ReactElement }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div style={{ color: '#fff', textAlign: 'center', marginTop: '50px' }}>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/landing" state={{ from: location }} replace />;
  }

  return children;
};

// Layout Component for Authenticated Pages
const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { logout, user } = useAuth();

  return (
    <div className="App">
      <nav className="app-nav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <ul>
          <li><Link to="/">Dashboard</Link></li>
          {/* Dev-only navigation items */}
          {process.env.NODE_ENV === 'development' && (
            <>
              <li><Link to="/validator">Validator</Link></li>
              <li><Link to="/relay-agent">Relay</Link></li>
              <li><Link to="/track-map">Track Map</Link></li>
              <li><Link to="/training">Training</Link></li>
              <li><Link to="/voice-engineer">Voice Engineer</Link></li>
            </>
          )}
        </ul>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', paddingRight: '2rem' }}>
          <span style={{ color: '#888', fontSize: '0.9rem' }}>{user?.name}</span>
          <button
            onClick={logout}
            style={{
              background: 'transparent',
              border: '1px solid #444',
              color: '#888',
              padding: '4px 12px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </nav>
      {children}
    </div>
  );
};

function AppContent() {
  // Initialize MultiDriverService only when app starts (could be moved inside authenticated layout if desired)
  useEffect(() => {
    multiDriverService.initialize();

    // Initialize mock driver data for development/debugging
    if (process.env.NODE_ENV === 'development') {
      initializeMockDriverData();
    }
  }, []);

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/voice-engineer" element={<VoiceEngineerPage />} />
        <Route path="/track-map" element={<TrackMapPage />} />
        <Route path="/training" element={<TrainingDashboard />} />

        {/* Protected Routes */}
        <Route path="/" element={
          <PrivateRoute>
            <AppLayout>
              <Dashboard />
            </AppLayout>
          </PrivateRoute>
        } />

        <Route path="/validator" element={
          <PrivateRoute>
            <AppLayout>
              <ComponentValidator />
            </AppLayout>
          </PrivateRoute>
        } />

        <Route path="/relay-agent" element={
          <PrivateRoute>
            <AppLayout>
              <RelayAgentPage />
            </AppLayout>
          </PrivateRoute>
        } />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Provider>
  );
}

export default App;
