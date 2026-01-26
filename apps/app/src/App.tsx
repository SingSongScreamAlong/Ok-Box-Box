import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { AuthLayout } from './layouts/AuthLayout';
import { DriverLayout } from './layouts/DriverLayout';
import { RelayProvider } from './hooks/useRelay';
import { Login } from './pages/auth/Login';
import { Signup } from './pages/auth/Signup';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';
import { AuthCallback } from './pages/auth/AuthCallback';
import { DriverCockpit } from './pages/driver/DriverCockpit';
import { DriverSessions } from './pages/driver/DriverSessions';
import { DriverStats } from './pages/driver/DriverStats';
import { DriverRatings } from './pages/driver/DriverRatings';
import { DriverHUD } from './pages/driver/DriverHUD';
import { DriverVoice } from './pages/driver/DriverVoice';
import { DriverProfilePage } from './pages/driver/DriverProfilePage';
import { EngineerChat } from './pages/driver/crew/EngineerChat';
import { SpotterChat } from './pages/driver/crew/SpotterChat';
import { AnalystChat } from './pages/driver/crew/AnalystChat';
import { Settings } from './pages/Settings';
import { CreateDriverProfile } from './pages/CreateDriverProfile';
import { Teams } from './pages/Teams';
import { CreateTeam } from './pages/CreateTeam';
import { TeamDashboard } from './pages/TeamDashboard';
import { TeamSettings } from './pages/TeamSettings';
import { PitwallHome } from './pages/pitwall/PitwallHome';
import { PitwallStrategy } from './pages/pitwall/PitwallStrategy';
import { PitwallPractice } from './pages/pitwall/PitwallPractice';
import { PitwallRoster } from './pages/pitwall/PitwallRoster';
import { PitwallPlanning } from './pages/pitwall/PitwallPlanning';
import { Leagues } from './pages/Leagues';
import { CreateLeague } from './pages/CreateLeague';
import { LeagueDashboard } from './pages/LeagueDashboard';
import { LeagueSettings } from './pages/LeagueSettings';
import { LeagueIncidents } from './pages/LeagueIncidents';
import { LeagueIncidentDetail } from './pages/LeagueIncidentDetail';
import { LeagueRulebook } from './pages/LeagueRulebook';
import { LeaguePenalties } from './pages/LeaguePenalties';
import { DriverProgress } from './pages/driver/DriverProgress';

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
    return <Navigate to="/driver/home" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <RelayProvider>
      <Routes>
        {/* Auth routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/auth/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
        </Route>

        {/* Driver Tier routes */}
        <Route path="/driver" element={<ProtectedRoute><DriverLayout /></ProtectedRoute>}>
          <Route index element={<DriverCockpit />} />
          <Route path="home" element={<DriverCockpit />} />
          <Route path="cockpit" element={<DriverCockpit />} />
          <Route path="sessions" element={<DriverSessions />} />
          <Route path="stats" element={<DriverStats />} />
          <Route path="ratings" element={<DriverRatings />} />
          <Route path="profile" element={<DriverProfilePage />} />
          <Route path="crew/engineer" element={<EngineerChat />} />
          <Route path="crew/spotter" element={<SpotterChat />} />
          <Route path="crew/analyst" element={<AnalystChat />} />
          <Route path="progress" element={<DriverProgress />} />
          <Route path="settings/hud" element={<DriverHUD />} />
          <Route path="settings/voice" element={<DriverVoice />} />
        </Route>

        {/* Settings & Profile Creation (outside driver layout) */}
        <Route path="/settings" element={<ProtectedRoute><DriverLayout /></ProtectedRoute>}>
          <Route index element={<Settings />} />
        </Route>
        <Route path="/create-driver-profile" element={<ProtectedRoute><DriverLayout /></ProtectedRoute>}>
          <Route index element={<CreateDriverProfile />} />
        </Route>

        {/* Team Tier routes */}
        <Route path="/teams" element={<ProtectedRoute><Teams /></ProtectedRoute>} />
        <Route path="/create-team" element={<ProtectedRoute><CreateTeam /></ProtectedRoute>} />
        <Route path="/team/:teamId" element={<ProtectedRoute><TeamDashboard /></ProtectedRoute>} />
        <Route path="/team/:teamId/settings" element={<ProtectedRoute><TeamSettings /></ProtectedRoute>} />
        <Route path="/team/:teamId/pitwall" element={<ProtectedRoute><PitwallHome /></ProtectedRoute>} />
        <Route path="/team/:teamId/pitwall/strategy" element={<ProtectedRoute><PitwallStrategy /></ProtectedRoute>} />
        <Route path="/team/:teamId/pitwall/practice" element={<ProtectedRoute><PitwallPractice /></ProtectedRoute>} />
        <Route path="/team/:teamId/pitwall/roster" element={<ProtectedRoute><PitwallRoster /></ProtectedRoute>} />
        <Route path="/team/:teamId/pitwall/planning" element={<ProtectedRoute><PitwallPlanning /></ProtectedRoute>} />

        {/* League Tier routes */}
        <Route path="/leagues" element={<ProtectedRoute><Leagues /></ProtectedRoute>} />
        <Route path="/create-league" element={<ProtectedRoute><CreateLeague /></ProtectedRoute>} />
        <Route path="/league/:leagueId" element={<ProtectedRoute><LeagueDashboard /></ProtectedRoute>} />
        <Route path="/league/:leagueId/settings" element={<ProtectedRoute><LeagueSettings /></ProtectedRoute>} />
        <Route path="/league/:leagueId/incidents" element={<ProtectedRoute><LeagueIncidents /></ProtectedRoute>} />
        <Route path="/league/:leagueId/incident/:incidentId" element={<ProtectedRoute><LeagueIncidentDetail /></ProtectedRoute>} />
        <Route path="/league/:leagueId/rulebook/:rulebookId" element={<ProtectedRoute><LeagueRulebook /></ProtectedRoute>} />
        <Route path="/league/:leagueId/penalties" element={<ProtectedRoute><LeaguePenalties /></ProtectedRoute>} />

        {/* Redirects */}
        <Route path="/dashboard" element={<Navigate to="/driver/home" replace />} />
        <Route path="/" element={<Navigate to="/driver/home" replace />} />
        <Route path="*" element={<Navigate to="/driver/home" replace />} />
      </Routes>
    </RelayProvider>
  );
}

export default App;
