import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useEntitlements, EntitlementTier } from './hooks/useEntitlements';
import { RelayProvider } from './hooks/useRelay';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DevAuditProvider, AuditToggleButton } from './components/DevAuditOverlay';

// Layouts — small, always needed — NOT lazy
import { AuthLayout } from './layouts/AuthLayout';
import { DriverLayout } from './layouts/DriverLayout';
import { TeamLayout } from './layouts/TeamLayout';
import { LeagueLayout } from './layouts/LeagueLayout';

// ─── Lazy page chunks ────────────────────────────────────────────────────────
// Auth
const Login            = lazy(() => import('./pages/auth/Login').then(m => ({ default: m.Login })));
const Signup           = lazy(() => import('./pages/auth/Signup').then(m => ({ default: m.Signup })));
const ForgotPassword   = lazy(() => import('./pages/auth/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword    = lazy(() => import('./pages/auth/ResetPassword').then(m => ({ default: m.ResetPassword })));
const AuthCallback     = lazy(() => import('./pages/auth/AuthCallback').then(m => ({ default: m.AuthCallback })));
const IRacingCallback  = lazy(() => import('./pages/auth/IRacingCallback').then(m => ({ default: m.IRacingCallback })));

// Driver tier
const DriverLanding    = lazy(() => import('./pages/driver/DriverLanding').then(m => ({ default: m.DriverLanding })));
const DriverCockpit    = lazy(() => import('./pages/driver/DriverCockpit').then(m => ({ default: m.DriverCockpit })));
const DriverHistory    = lazy(() => import('./pages/driver/DriverHistory').then(m => ({ default: m.DriverHistory })));
const DriverRatings    = lazy(() => import('./pages/driver/DriverRatings').then(m => ({ default: m.DriverRatings })));
const DriverProfilePage = lazy(() => import('./pages/driver/DriverProfilePage').then(m => ({ default: m.DriverProfilePage })));
const EngineerChat     = lazy(() => import('./pages/driver/crew/EngineerChat').then(m => ({ default: m.EngineerChat })));
const SpotterChat      = lazy(() => import('./pages/driver/crew/SpotterChat').then(m => ({ default: m.SpotterChat })));
const AnalystChat      = lazy(() => import('./pages/driver/crew/AnalystChat').then(m => ({ default: m.AnalystChat })));
const DriverProgress   = lazy(() => import('./pages/driver/DriverProgress').then(m => ({ default: m.DriverProgress })));
const DriverIDP        = lazy(() => import('./pages/driver/DriverIDP').then(m => ({ default: m.DriverIDP })));
const ReplayViewer     = lazy(() => import('./pages/driver/ReplayViewer').then(m => ({ default: m.ReplayViewer })));
const DriverHUD        = lazy(() => import('./pages/driver/DriverHUD').then(m => ({ default: m.DriverHUD })));
const DriverVoice      = lazy(() => import('./pages/driver/DriverVoice').then(m => ({ default: m.DriverVoice })));
const DriverBlackBox   = lazy(() => import('./pages/driver/DriverBlackBox').then(m => ({ default: m.DriverBlackBox })));

// Shared / hub pages
const Settings            = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const CreateDriverProfile = lazy(() => import('./pages/CreateDriverProfile').then(m => ({ default: m.CreateDriverProfile })));
const Teams               = lazy(() => import('./pages/Teams').then(m => ({ default: m.Teams })));
const CreateTeam          = lazy(() => import('./pages/CreateTeam').then(m => ({ default: m.CreateTeam })));
const Pricing             = lazy(() => import('./pages/Pricing').then(m => ({ default: m.Pricing })));
const SubscriptionManagement = lazy(() => import('./pages/SubscriptionManagement').then(m => ({ default: m.SubscriptionManagement })));
const BillingReturn       = lazy(() => import('./pages/BillingReturn').then(m => ({ default: m.BillingReturn })));
const DownloadPage        = lazy(() => import('./pages/Download').then(m => ({ default: m.DownloadPage })));
const TrackSelectorPage   = lazy(() => import('./pages/track-intel/TrackSelectorPage').then(m => ({ default: m.TrackSelectorPage })));
const TrackMapPage        = lazy(() => import('./pages/track-intel/TrackMapPage').then(m => ({ default: m.TrackMapPage })));
const EventView           = lazy(() => import('./pages/EventView').then(m => ({ default: m.EventView })));

// Team tier
const TeamDashboard   = lazy(() => import('./pages/TeamDashboard').then(m => ({ default: m.TeamDashboard })));
const TeamSettings    = lazy(() => import('./pages/TeamSettings').then(m => ({ default: m.TeamSettings })));
const PitwallHome     = lazy(() => import('./pages/pitwall/PitwallHome').then(m => ({ default: m.PitwallHome })));
const PitwallStrategy = lazy(() => import('./pages/pitwall/PitwallStrategy').then(m => ({ default: m.PitwallStrategy })));
const PitwallPractice = lazy(() => import('./pages/pitwall/PitwallPractice').then(m => ({ default: m.PitwallPractice })));
const PitwallRoster   = lazy(() => import('./pages/pitwall/PitwallRoster').then(m => ({ default: m.PitwallRoster })));
const PitwallPlanning = lazy(() => import('./pages/pitwall/PitwallPlanning').then(m => ({ default: m.PitwallPlanning })));
const PitwallEvents   = lazy(() => import('./pages/pitwall/PitwallEvents').then(m => ({ default: m.PitwallEvents })));
const PitwallReports  = lazy(() => import('./pages/pitwall/PitwallReports').then(m => ({ default: m.PitwallReports })));
const PitwallSetups   = lazy(() => import('./pages/pitwall/PitwallSetups').then(m => ({ default: m.PitwallSetups })));
const TeamRaceViewer  = lazy(() => import('./pages/pitwall/TeamRaceViewer').then(m => ({ default: m.TeamRaceViewer })));
const TeamIncidents   = lazy(() => import('./pages/pitwall/TeamIncidents').then(m => ({ default: m.TeamIncidents })));
const DriverComparison = lazy(() => import('./pages/pitwall/DriverComparison').then(m => ({ default: m.DriverComparison })));
const StintPlanner    = lazy(() => import('./pages/pitwall/StintPlanner').then(m => ({ default: m.StintPlanner })));
const RacePlan        = lazy(() => import('./pages/pitwall/RacePlan').then(m => ({ default: m.RacePlan })));
const PitwallDriverProfile = lazy(() => import('./pages/pitwall/DriverProfile').then(m => ({ default: m.DriverProfilePage })));

// League tier
const Leagues             = lazy(() => import('./pages/Leagues').then(m => ({ default: m.Leagues })));
const CreateLeague        = lazy(() => import('./pages/CreateLeague').then(m => ({ default: m.CreateLeague })));
const LeagueDashboard     = lazy(() => import('./pages/LeagueDashboard').then(m => ({ default: m.LeagueDashboard })));
const LeagueSettings      = lazy(() => import('./pages/LeagueSettings').then(m => ({ default: m.LeagueSettings })));
const LeagueIncidents     = lazy(() => import('./pages/LeagueIncidents').then(m => ({ default: m.LeagueIncidents })));
const LeagueIncidentDetail = lazy(() => import('./pages/LeagueIncidentDetail').then(m => ({ default: m.LeagueIncidentDetail })));
const LeagueRulebook      = lazy(() => import('./pages/LeagueRulebook').then(m => ({ default: m.LeagueRulebook })));
const LeaguePenalties     = lazy(() => import('./pages/LeaguePenalties').then(m => ({ default: m.LeaguePenalties })));
const LeagueChampionship  = lazy(() => import('./pages/LeagueChampionship').then(m => ({ default: m.LeagueChampionship })));
const LeagueProtests      = lazy(() => import('./pages/LeagueProtests').then(m => ({ default: m.LeagueProtests })));
const StewardConsole      = lazy(() => import('./pages/league/StewardConsole').then(m => ({ default: m.StewardConsole })));
const BroadcastGraphics   = lazy(() => import('./pages/league/BroadcastGraphics').then(m => ({ default: m.BroadcastGraphics })));
const PublicTiming        = lazy(() => import('./pages/league/PublicTiming').then(m => ({ default: m.PublicTiming })));
const CreateEvent         = lazy(() => import('./pages/CreateEvent').then(m => ({ default: m.CreateEvent })));
const RaceControlTest     = lazy(() => import('./pages/RaceControlTest').then(m => ({ default: m.RaceControlTest })));

// ─── Route guards ────────────────────────────────────────────────────────────

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[--bg]">
      <div className="text-white/40 text-xs uppercase tracking-widest">Loading...</div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to="/driver/home" replace />;
  return <>{children}</>;
}

/**
 * CapabilityRoute — redirects to /pricing when the user's tier is below
 * the minimum required tier.
 *
 * Tier order: free < driver < team < league
 * If entitlements are still loading, shows the page loader (not a flash-of-pricing).
 */
const TIER_ORDER: Record<EntitlementTier, number> = {
  free: 0, driver: 1, team: 2, league: 3, enterprise: 4,
};

function CapabilityRoute({
  children,
  minTier,
}: {
  children: React.ReactNode;
  minTier: EntitlementTier;
}) {
  const { tier, loading } = useEntitlements();
  if (loading) return <PageLoader />;
  if (TIER_ORDER[tier] < TIER_ORDER[minTier]) {
    return <Navigate to="/pricing" replace />;
  }
  return <>{children}</>;
}

// ─── App ─────────────────────────────────────────────────────────────────────

function App() {
  return (
    <ErrorBoundary>
    <DevAuditProvider>
    <RelayProvider>
      <Suspense fallback={<PageLoader />}>
      <Routes>

        {/* ── Auth ─────────────────────────────────────────────────────── */}
        <Route element={<AuthLayout />}>
          <Route path="/login"             element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup"            element={<PublicRoute><Signup /></PublicRoute>} />
          <Route path="/forgot-password"   element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/auth/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback"     element={<AuthCallback />} />
        </Route>

        {/* ── Public / no-auth ─────────────────────────────────────────── */}
        <Route path="/pricing"             element={<Pricing />} />
        <Route path="/billing/return"      element={<BillingReturn />} />
        <Route path="/download"            element={<DownloadPage />} />
        <Route path="/league/:leagueId/timing" element={<PublicTiming />} />
        <Route path="/oauth/iracing/callback"  element={<IRacingCallback />} />

        {/* ── Driver tier ──────────────────────────────────────────────── */}
        <Route path="/driver" element={
          <ProtectedRoute>
            <CapabilityRoute minTier="free">
              <DriverLayout />
            </CapabilityRoute>
          </ProtectedRoute>
        }>
          <Route index               element={<DriverLanding />} />
          <Route path="home"         element={<DriverLanding />} />
          <Route path="cockpit"      element={<DriverCockpit />} />
          <Route path="history"      element={<DriverHistory />} />
          <Route path="ratings"      element={<DriverRatings />} />
          <Route path="profile"      element={<DriverProfilePage />} />
          <Route path="crew/engineer" element={<EngineerChat />} />
          <Route path="crew/spotter"  element={<SpotterChat />} />
          <Route path="crew/analyst"  element={<AnalystChat />} />
          <Route path="progress"     element={<DriverProgress />} />
          <Route path="idp"          element={<DriverIDP />} />
          <Route path="replay/:sessionId" element={<ReplayViewer />} />
          <Route path="settings/hud"   element={<DriverHUD />} />
          <Route path="settings/voice" element={<DriverVoice />} />
          <Route path="blackbox"       element={<DriverBlackBox />} />
        </Route>

        {/* Settings & profile creation — inside DriverLayout, any auth'd user */}
        <Route path="/settings" element={<ProtectedRoute><DriverLayout /></ProtectedRoute>}>
          <Route index element={<Settings />} />
        </Route>
        <Route path="/create-driver-profile" element={<ProtectedRoute><DriverLayout /></ProtectedRoute>}>
          <Route index element={<CreateDriverProfile />} />
        </Route>

        {/* ── Shared hub ───────────────────────────────────────────────── */}
        <Route path="/teams"       element={<ProtectedRoute><Teams /></ProtectedRoute>} />
        <Route path="/create-team" element={<ProtectedRoute><CreateTeam /></ProtectedRoute>} />
        <Route path="/leagues"     element={<ProtectedRoute><Leagues /></ProtectedRoute>} />
        <Route path="/create-league" element={<ProtectedRoute><CreateLeague /></ProtectedRoute>} />
        <Route path="/subscription"  element={<ProtectedRoute><SubscriptionManagement /></ProtectedRoute>} />
        <Route path="/event/:eventId" element={<ProtectedRoute><EventView /></ProtectedRoute>} />

        <Route path="/track-intel" element={
          <ProtectedRoute>
            <CapabilityRoute minTier="driver">
              <TrackSelectorPage />
            </CapabilityRoute>
          </ProtectedRoute>
        } />
        <Route path="/track-intel/:trackId" element={
          <ProtectedRoute>
            <CapabilityRoute minTier="driver">
              <TrackMapPage />
            </CapabilityRoute>
          </ProtectedRoute>
        } />

        {/* ── Team tier (requires team subscription) ───────────────────── */}
        <Route path="/team/:teamId" element={
          <ProtectedRoute>
            <CapabilityRoute minTier="team">
              <TeamLayout />
            </CapabilityRoute>
          </ProtectedRoute>
        }>
          <Route index                        element={<TeamDashboard />} />
          <Route path="settings"              element={<TeamSettings />} />
          <Route path="pitwall"               element={<PitwallHome />} />
          <Route path="pitwall/strategy"      element={<PitwallStrategy />} />
          <Route path="pitwall/practice"      element={<PitwallPractice />} />
          <Route path="pitwall/roster"        element={<PitwallRoster />} />
          <Route path="pitwall/planning"      element={<PitwallPlanning />} />
          <Route path="pitwall/race-plan"     element={<RacePlan />} />
          <Route path="pitwall/race"          element={<TeamRaceViewer />} />
          <Route path="pitwall/compare"       element={<DriverComparison />} />
          <Route path="pitwall/stint-planner" element={<StintPlanner />} />
          <Route path="pitwall/events"        element={<PitwallEvents />} />
          <Route path="pitwall/reports"       element={<PitwallReports />} />
          <Route path="pitwall/setups"        element={<PitwallSetups />} />
          <Route path="pitwall/incidents"     element={<TeamIncidents />} />
          <Route path="pitwall/driver/:driverId" element={<PitwallDriverProfile />} />
        </Route>

        {/* ── League tier (requires league subscription) ───────────────── */}
        <Route path="/league/:leagueId" element={
          <ProtectedRoute>
            <CapabilityRoute minTier="league">
              <LeagueLayout />
            </CapabilityRoute>
          </ProtectedRoute>
        }>
          <Route index                          element={<LeagueDashboard />} />
          <Route path="settings"                element={<LeagueSettings />} />
          <Route path="incidents"               element={<LeagueIncidents />} />
          <Route path="incident/:incidentId"    element={<LeagueIncidentDetail />} />
          <Route path="rulebook/:rulebookId"    element={<LeagueRulebook />} />
          <Route path="penalties"               element={<LeaguePenalties />} />
          <Route path="championship"            element={<LeagueChampionship />} />
          <Route path="broadcast"               element={<BroadcastGraphics />} />
          <Route path="protests"                element={<LeagueProtests />} />
          <Route path="steward-console"         element={<StewardConsole />} />
          <Route path="create-event"            element={<CreateEvent />} />
        </Route>

        {/* ── Race control test (protected — dev/admin use only) ───────── */}
        <Route path="/rco" element={<ProtectedRoute><RaceControlTest /></ProtectedRoute>} />

        {/* ── Redirects ────────────────────────────────────────────────── */}
        <Route path="/dashboard" element={<Navigate to="/driver/home" replace />} />
        <Route path="/"          element={<Navigate to="/driver/home" replace />} />
        <Route path="*"          element={<Navigate to="/driver/home" replace />} />

      </Routes>
      </Suspense>
      {import.meta.env.DEV && <AuditToggleButton />}
    </RelayProvider>
    </DevAuditProvider>
    </ErrorBoundary>
  );
}

export default App;
