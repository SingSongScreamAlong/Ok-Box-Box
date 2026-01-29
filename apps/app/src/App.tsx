import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { AuthLayout } from './layouts/AuthLayout';
import { DriverLayout } from './layouts/DriverLayout';
import { TeamLayout } from './layouts/TeamLayout';
import { LeagueLayout } from './layouts/LeagueLayout';
import { RelayProvider } from './hooks/useRelay';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DevAuditProvider, AuditToggleButton } from './components/DevAuditOverlay';
import { Login } from './pages/auth/Login';
import { Signup } from './pages/auth/Signup';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';
import { AuthCallback } from './pages/auth/AuthCallback';
import { DriverCockpit } from './pages/driver/DriverCockpit';
import { DriverLanding } from './pages/driver/DriverLanding';
import { DriverHistory } from './pages/driver/DriverHistory';
import { DriverRatings } from './pages/driver/DriverRatings';
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
import { PitwallEvents } from './pages/pitwall/PitwallEvents';
import { PitwallReports } from './pages/pitwall/PitwallReports';
import { PitwallSetups } from './pages/pitwall/PitwallSetups';
import { TeamRaceViewer } from './pages/pitwall/TeamRaceViewer';
import { TeamIncidents } from './pages/pitwall/TeamIncidents';
import { Leagues } from './pages/Leagues';
import { CreateLeague } from './pages/CreateLeague';
import { LeagueDashboard } from './pages/LeagueDashboard';
import { LeagueSettings } from './pages/LeagueSettings';
import { LeagueIncidents } from './pages/LeagueIncidents';
import { LeagueIncidentDetail } from './pages/LeagueIncidentDetail';
import { LeagueRulebook } from './pages/LeagueRulebook';
import { LeaguePenalties } from './pages/LeaguePenalties';
import { LeagueChampionship } from './pages/LeagueChampionship';
import { LeagueProtests } from './pages/LeagueProtests';
import { StewardConsole } from './pages/league/StewardConsole';
import { PublicTiming } from './pages/league/PublicTiming';
import { DriverProgress } from './pages/driver/DriverProgress';
import { ReplayViewer } from './pages/driver/ReplayViewer';
import { DriverHUD } from './pages/driver/DriverHUD';
import { DriverVoice } from './pages/driver/DriverVoice';
import { DriverComparison } from './pages/pitwall/DriverComparison';
import { StintPlanner } from './pages/pitwall/StintPlanner';
import { RacePlan } from './pages/pitwall/RacePlan';
import { BroadcastGraphics } from './pages/league/BroadcastGraphics';
import { RaceControlTest as RaceControl } from './pages/RaceControlTest';
import { CreateEvent } from './pages/CreateEvent';
import { EventView } from './pages/EventView';
import { DriverProfilePage as PitwallDriverProfile } from './pages/pitwall/DriverProfile';

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
    <ErrorBoundary>
    <DevAuditProvider>
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
          <Route index element={<DriverLanding />} />
          <Route path="home" element={<DriverLanding />} />
          <Route path="cockpit" element={<DriverCockpit />} />
          <Route path="history" element={<DriverHistory />} />
          <Route path="ratings" element={<DriverRatings />} />
          <Route path="profile" element={<DriverProfilePage />} />
          <Route path="crew/engineer" element={<EngineerChat />} />
          <Route path="crew/spotter" element={<SpotterChat />} />
          <Route path="crew/analyst" element={<AnalystChat />} />
          <Route path="progress" element={<DriverProgress />} />
          <Route path="replay/:sessionId" element={<ReplayViewer />} />
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
        <Route path="/team/:teamId" element={<ProtectedRoute><TeamLayout /></ProtectedRoute>}>
          <Route index element={<TeamDashboard />} />
          <Route path="settings" element={<TeamSettings />} />
          <Route path="pitwall" element={<PitwallHome />} />
          <Route path="pitwall/strategy" element={<PitwallStrategy />} />
          <Route path="pitwall/practice" element={<PitwallPractice />} />
          <Route path="pitwall/roster" element={<PitwallRoster />} />
          <Route path="pitwall/planning" element={<PitwallPlanning />} />
          <Route path="pitwall/race-plan" element={<RacePlan />} />
          <Route path="pitwall/race" element={<TeamRaceViewer />} />
          <Route path="pitwall/compare" element={<DriverComparison />} />
          <Route path="pitwall/stint-planner" element={<StintPlanner />} />
          <Route path="pitwall/events" element={<PitwallEvents />} />
          <Route path="pitwall/reports" element={<PitwallReports />} />
          <Route path="pitwall/setups" element={<PitwallSetups />} />
          <Route path="pitwall/incidents" element={<TeamIncidents />} />
          <Route path="pitwall/driver/:driverId" element={<PitwallDriverProfile />} />
        </Route>

        {/* Race Control Test - No auth required */}
        <Route path="/rco" element={<RaceControl />} />

        {/* League Tier routes */}
        <Route path="/leagues" element={<ProtectedRoute><Leagues /></ProtectedRoute>} />
        <Route path="/create-league" element={<ProtectedRoute><CreateLeague /></ProtectedRoute>} />
        <Route path="/league/:leagueId" element={<ProtectedRoute><LeagueLayout /></ProtectedRoute>}>
          <Route index element={<LeagueDashboard />} />
          <Route path="settings" element={<LeagueSettings />} />
          <Route path="incidents" element={<LeagueIncidents />} />
          <Route path="incident/:incidentId" element={<LeagueIncidentDetail />} />
          <Route path="rulebook/:rulebookId" element={<LeagueRulebook />} />
          <Route path="penalties" element={<LeaguePenalties />} />
          <Route path="championship" element={<LeagueChampionship />} />
          <Route path="broadcast" element={<BroadcastGraphics />} />
          <Route path="protests" element={<LeagueProtests />} />
          <Route path="steward-console" element={<StewardConsole />} />
          <Route path="create-event" element={<CreateEvent />} />
        </Route>
        {/* Public timing page - no auth required */}
        <Route path="/league/:leagueId/timing" element={<PublicTiming />} />
        {/* Event view */}
        <Route path="/event/:eventId" element={<ProtectedRoute><EventView /></ProtectedRoute>} />

        {/* Redirects */}
        <Route path="/dashboard" element={<Navigate to="/driver/home" replace />} />
        <Route path="/" element={<Navigate to="/driver/home" replace />} />
        <Route path="*" element={<Navigate to="/driver/home" replace />} />
      </Routes>
      {/* Dev Audit Toggle - only visible in development */}
      {import.meta.env.DEV && <AuditToggleButton />}
    </RelayProvider>
    </DevAuditProvider>
    </ErrorBoundary>
  );
}

export default App;
