import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { AppInitializer } from './components/AppInitializer';
import { ProtectedRoute } from './components/ProtectedRoute';
import { BootstrapProvider } from './hooks/useBootstrap';
import { RequireCapability } from './components/RequireCapability';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './contexts/ToastContext';
import { ToastContainer } from './components/ui/Toast';
import { Dashboard } from './pages/Dashboard';
import { SessionView } from './pages/SessionView';
import { IncidentsPage } from './pages/IncidentsPage';
import { RulebookEditor } from './pages/RulebookEditor';
import { ReportsPage } from './pages/ReportsPage';
import { LoginPage } from './pages/LoginPage';
import { Pricing } from './pages/Pricing';
import { BillingReturn } from './pages/BillingReturn';
import AboutBuild from './pages/AboutBuild';
import { DownloadRelay } from './pages/DownloadRelay';
import { Broadcast } from './pages/Broadcast';
import { Watch } from './pages/Watch';
import { DriverStatusPanel } from './components/DriverStatusPanel';
import { SurfaceHome } from './pages/SurfaceHome';
import DiagnosticsPage from './pages/admin/Diagnostics';
import { EventsPage } from './pages/EventsPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { DiscordSettingsPage } from './pages/DiscordSettingsPage';
import ProtestsPage from './pages/ProtestsPage';
import AuditLogPage from './pages/AuditLogPage';
import TeamsPage from './pages/TeamsPage';
import { TeamSessionList } from './pages/TeamSessionList';
import { TeamLayout } from './layouts/TeamLayout';
import TeamRoster from './pages/team/TeamRoster';
import TeamHome from './pages/team/TeamHome';
import TeamEvents from './pages/team/TeamEvents';
import TeamEventDetail from './pages/team/TeamEventDetail';
import TeamReports from './pages/team/TeamReports';
import DriverProfilePage from './pages/team/DriverProfilePage';
import DriverIDPPage from './pages/team/idp/DriverIDPPage';
import { TrackMapPage } from './pages/track-intel/TrackMapPage';
import { TrackSelectorPage } from './pages/track-intel/TrackSelectorPage';
import TeamPlanning from './pages/team/TeamPlanning';
import TeamSetups from './pages/team/TeamSetups';
import TeamStrategy from './pages/team/TeamStrategy';
import TeamPractice from './pages/team/TeamPractice';
import MyIDPPage from './pages/team/idp/MyIDPPage';
import TeamPitwall from './pages/team/TeamPitwall';
import { CanonicalBuildBadge } from './components/CanonicalBuildBadge';
import { DriverLayout } from './pages/driver/DriverLayout';
import { DriverIDPOverviewPage } from './pages/driver/DriverIDPOverviewPage';
import { DriverSessionsPage } from './pages/driver/DriverSessionsPage';
import { DriverStatsPage } from './pages/driver/DriverStatsPage';
import { DriverRatingsPage } from './pages/driver/DriverRatingsPage';

export function App() {
    return (
        <ErrorBoundary>
            <ToastProvider>
                <AppInitializer>
                    <BrowserRouter>
                        <CanonicalBuildBadge />
                        <BootstrapProvider>
                            <Routes>
                                {/* Public route */}
                                <Route path="/login" element={<LoginPage />} />
                                <Route path="/about/build" element={<AboutBuild />} />

                                {/* Pricing (public) */}
                                <Route path="/pricing" element={<Pricing />} />

                                {/* Download relay (public) */}
                                <Route path="/download-relay" element={<DownloadRelay />} />

                                {/* My IDP (standalone, works without login) */}
                                <Route path="/my-idp" element={<MyIDPPage />} />

                                {/* Track Intel - selector and individual maps */}
                                <Route path="/track-intel" element={<TrackSelectorPage />} />
                                <Route path="/track-intel/:trackId" element={<TrackMapPage />} />

                                {/* ============================================================
                            RACEBOX SURFACES (Broadcast/Spectator) - FREE
                            ============================================================ */}

                                {/* Broadcast Director - basic access is FREE, Plus features gated in component */}
                                <Route path="/broadcast" element={
                                    <ProtectedRoute>
                                        <Broadcast />
                                    </ProtectedRoute>
                                } />

                                {/* Public Watch Page - no auth required */}
                                <Route path="/watch/:sessionId" element={<Watch />} />

                                {/* Driver Status Panel TEST - no auth for testing */}
                                <Route path="/driver-test" element={<DriverStatusPanel />} />

                                {/* Session View TEST - no auth for testing */}
                                <Route path="/session-test" element={<SessionView />} />


                                {/* Driver Status Panel - requires BlackBox */}
                                <Route path="/driver" element={
                                    <ProtectedRoute>
                                        <RequireCapability capability="driver_hud">
                                            <DriverStatusPanel />
                                        </RequireCapability>
                                    </ProtectedRoute>
                                } />

                                {/* Driver System (Phase 2) - Identity Profile */}
                                <Route path="/driver/*" element={
                                    <ProtectedRoute>
                                        <RequireCapability capability="driver_idp">
                                            <DriverLayout />
                                        </RequireCapability>
                                    </ProtectedRoute>
                                }>
                                    <Route index element={<DriverIDPOverviewPage />} />
                                    <Route path="idp" element={<DriverIDPOverviewPage />} />
                                    <Route path="sessions" element={<DriverSessionsPage />} />
                                    <Route path="stats" element={<DriverStatsPage />} />
                                    <Route path="ratings" element={<DriverRatingsPage />} />
                                </Route>

                                {/* Billing return (after checkout) */}
                                <Route path="/billing/return" element={
                                    <ProtectedRoute>
                                        <BillingReturn />
                                    </ProtectedRoute>
                                } />

                                {/* Legacy /home redirect to root */}
                                <Route path="/home" element={
                                    <ProtectedRoute>
                                        <SurfaceHome />
                                    </ProtectedRoute>
                                } />

                                {/* ============================================================
                            BLACKBOX SURFACES (Team/Driver)
                            ============================================================ */}

                                {/* Team Session List - BlackBox session selector */}
                                <Route path="/team" element={
                                    <ProtectedRoute>
                                        <RequireCapability capability="pitwall_view">
                                            <TeamSessionList />
                                        </RequireCapability>
                                    </ProtectedRoute>
                                } />

                                {/* Canonical Pit Wall Surface */}
                                <Route path="/team/pitwall" element={
                                    <ProtectedRoute>
                                        <RequireCapability capability="pitwall_view">
                                            <TeamPitwall />
                                        </RequireCapability>
                                    </ProtectedRoute>
                                } />

                                {/* Team Dashboard - BlackBox pit wall surface (auth disabled for alpha testing) */}
                                <Route path="/team/:sessionId" element={
                                    <SessionView />
                                } />

                                {/* ============================================================
                            TEAM SYSTEM V1 (IDP Powered) 
                            ============================================================ */}

                                <Route path="/teams/:teamId" element={
                                    <ProtectedRoute>
                                        <TeamLayout />
                                    </ProtectedRoute>
                                }>
                                    <Route index element={<TeamHome />} />
                                    <Route path="roster" element={<TeamRoster />} />
                                    <Route path="events" element={<TeamEvents />} />
                                    <Route path="events/:eventId" element={<TeamEventDetail />} />
                                    <Route path="planning" element={<TeamPlanning />} />
                                    <Route path="setups" element={<TeamSetups />} />
                                    <Route path="strategy" element={<TeamStrategy />} />
                                    <Route path="practice" element={<TeamPractice />} />
                                    <Route path="reports" element={<TeamReports />} />
                                    <Route path="driver/:driverId" element={<DriverProfilePage />} />
                                    <Route path="driver/:driverId/idp" element={<DriverIDPPage />} />
                                </Route>

                                {/* ============================================================
                            CONTROLBOX SURFACES (Race Control)
                            ============================================================ */}

                                {/* Root - Surface selector (launchpad) */}
                                <Route path="/" element={
                                    <ProtectedRoute>
                                        <SurfaceHome />
                                    </ProtectedRoute>
                                } />

                                {/* Protected routes with MainLayout (ControlBox) */}
                                <Route path="/controlbox" element={
                                    <ProtectedRoute>
                                        <MainLayout />
                                    </ProtectedRoute>
                                }>
                                    {/* ControlBox Home */}
                                    <Route index element={<Dashboard />} />

                                    {/* Session view - ControlBox race control */}
                                    <Route path="session/:sessionId" element={
                                        <RequireCapability capability="incident_review">
                                            <SessionView />
                                        </RequireCapability>
                                    } />

                                    {/* Incidents - ControlBox */}
                                    <Route path="incidents" element={
                                        <RequireCapability capability="incident_review">
                                            <IncidentsPage />
                                        </RequireCapability>
                                    } />

                                    {/* Rulebooks - ControlBox admin */}
                                    <Route path="rulebooks" element={
                                        <RequireCapability capability="rulebook_manage">
                                            <RulebookEditor />
                                        </RequireCapability>
                                    } />

                                    {/* Reports - ControlBox */}
                                    <Route path="reports" element={
                                        <RequireCapability capability="incident_review">
                                            <ReportsPage />
                                        </RequireCapability>
                                    } />

                                    {/* Events - shared */}
                                    <Route path="events" element={<EventsPage />} />
                                    <Route path="seasons/:seasonId/events" element={<EventsPage />} />
                                    <Route path="events/:eventId" element={<EventDetailPage />} />

                                    {/* Teams - BlackBox team view */}
                                    <Route path="teams" element={
                                        <RequireCapability capability="multi_car_monitor">
                                            <TeamsPage />
                                        </RequireCapability>
                                    } />

                                    {/* Discord Settings */}
                                    <Route path="leagues/:leagueId/discord" element={<DiscordSettingsPage />} />

                                    {/* Protests - ControlBox */}
                                    <Route path="protests" element={
                                        <RequireCapability capability="protest_review">
                                            <ProtestsPage />
                                        </RequireCapability>
                                    } />

                                    {/* Audit Log - admin only */}
                                    <Route path="audit" element={
                                        <RequireCapability capability="session_authority">
                                            <AuditLogPage />
                                        </RequireCapability>
                                    } />

                                    {/* DEV Diagnostics - admin only */}
                                    <Route path="admin/diagnostics" element={
                                        <RequireCapability capability="session_authority">
                                            <DiagnosticsPage />
                                        </RequireCapability>
                                    } />
                                </Route>
                            </Routes>
                            <ToastContainer />
                        </BootstrapProvider>
                    </BrowserRouter>
                </AppInitializer>
            </ToastProvider>
        </ErrorBoundary>
    );
}

