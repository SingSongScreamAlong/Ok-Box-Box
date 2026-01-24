import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { AuthLayout } from './components/layout/AuthLayout';
import { Login } from './pages/auth/Login';
import { Signup } from './pages/auth/Signup';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';
import { AuthCallback } from './pages/auth/AuthCallback';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { DriverProfile } from './pages/DriverProfile';
import { CreateDriverProfile } from './pages/CreateDriverProfile';
import { Teams } from './pages/Teams';
import { CreateTeam } from './pages/CreateTeam';
import { TeamDashboard } from './pages/TeamDashboard';
import { TeamSettings } from './pages/TeamSettings';
import { Leagues } from './pages/Leagues';
import { CreateLeague } from './pages/CreateLeague';
import { LeagueDashboard } from './pages/LeagueDashboard';
import { LeagueSettings } from './pages/LeagueSettings';
import { CreateEvent } from './pages/CreateEvent';
import { EventView } from './pages/EventView';
import { PitwallLayout } from './layouts/PitwallLayout';
import { ThemeProvider } from './hooks/useTheme';
import { PitwallHome } from './pages/pitwall/PitwallHome';
import { PitwallRoster } from './pages/pitwall/PitwallRoster';
import { PitwallEvents } from './pages/pitwall/PitwallEvents';
import { PitwallPlanning } from './pages/pitwall/PitwallPlanning';
import { PitwallSetups } from './pages/pitwall/PitwallSetups';
import { PitwallStrategy } from './pages/pitwall/PitwallStrategy';
import { PitwallPractice } from './pages/pitwall/PitwallPractice';
import { PitwallReports } from './pages/pitwall/PitwallReports';
import { DriverProfilePage } from './pages/pitwall/DriverProfile';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[--bg]">
        <div className="text-white/60">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[--bg]">
        <div className="text-white/60">Loading...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      {/* Auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Route>

      {/* Protected app routes */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/driver-profile" element={<DriverProfile />} />
        <Route path="/create-driver-profile" element={<CreateDriverProfile />} />
        <Route path="/teams" element={<Teams />} />
        <Route path="/create-team" element={<CreateTeam />} />
        <Route path="/team/:teamId" element={<TeamDashboard />} />
        <Route path="/team/:teamId/settings" element={<TeamSettings />} />
        <Route path="/leagues" element={<Leagues />} />
        <Route path="/create-league" element={<CreateLeague />} />
        <Route path="/league/:leagueId" element={<LeagueDashboard />} />
        <Route path="/league/:leagueId/settings" element={<LeagueSettings />} />
        <Route path="/league/:leagueId/create-event" element={<CreateEvent />} />
        <Route path="/event/:eventId" element={<EventView />} />
      </Route>

      {/* Team Pitwall routes - separate layout */}
      <Route path="/team/:teamId/pitwall" element={<ProtectedRoute><ThemeProvider><PitwallLayout /></ThemeProvider></ProtectedRoute>}>
        <Route index element={<PitwallHome />} />
        <Route path="roster" element={<PitwallRoster />} />
        <Route path="events" element={<PitwallEvents />} />
        <Route path="planning" element={<PitwallPlanning />} />
        <Route path="setups" element={<PitwallSetups />} />
        <Route path="strategy" element={<PitwallStrategy />} />
        <Route path="practice" element={<PitwallPractice />} />
        <Route path="reports" element={<PitwallReports />} />
        <Route path="driver/:driverId" element={<DriverProfilePage />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
