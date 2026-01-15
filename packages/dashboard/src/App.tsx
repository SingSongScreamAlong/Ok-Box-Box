import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { AppInitializer } from './components/AppInitializer';
import { ProtectedRoute } from './components/ProtectedRoute';
import { BootstrapProvider } from './hooks/useBootstrap';
import { RequireCapability } from './components/RequireCapability';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Dashboard } from './pages/Dashboard';
import { SessionView } from './pages/SessionView';
import { IncidentsPage } from './pages/IncidentsPage';
import { RulebookEditor } from './pages/RulebookEditor';
import { ReportsPage } from './pages/ReportsPage';
import { LoginPage } from './pages/LoginPage';
import { EventsPage } from './pages/EventsPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { DiscordSettingsPage } from './pages/DiscordSettingsPage';
import ProtestsPage from './pages/ProtestsPage';
import AuditLogPage from './pages/AuditLogPage';
import TeamsPage from './pages/TeamsPage';
import { TeamDashboard } from './components/team/TeamDashboard';
import { SurfaceHome } from './pages/SurfaceHome';
import { Pricing } from './pages/Pricing';
import { BillingReturn } from './pages/BillingReturn';
import { DownloadRelay } from './pages/DownloadRelay';
import DiagnosticsPage from './pages/admin/Diagnostics';
import { Broadcast } from './pages/Broadcast';
import { Watch } from './pages/Watch';
import { DriverHUD } from './components/DriverHUD';
import { TeamSessionList } from './pages/TeamSessionList';

// Wrapper to extract sessionId from URL for TeamDashboard
function TeamDashboardWrapper() {
    const { sessionId } = useParams<{ sessionId: string }>();
    return <TeamDashboard sessionId={sessionId || ''} />;
}

export function App() {
    return (
        <ErrorBoundary>
            <AppInitializer>
                <BrowserRouter>
                    <BootstrapProvider>
                        <Routes>
                            {/* Public route */}
                            <Route path="/login" element={<LoginPage />} />

                            {/* Pricing (public) */}
                            <Route path="/pricing" element={<Pricing />} />

                            {/* Download relay (public) */}
                            <Route path="/download-relay" element={<DownloadRelay />} />

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

                            {/* Driver HUD - requires BlackBox */}
                            <Route path="/driver" element={
                                <ProtectedRoute>
                                    <RequireCapability capability="driver_hud">
                                        <DriverHUD />
                                    </RequireCapability>
                                </ProtectedRoute>
                            } />

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

                            {/* Team Session List - BlackBox session selector - NO AUTH FOR TESTING */}
                            <Route path="/team" element={<TeamSessionList />} />

                            {/* Team Dashboard - BlackBox pit wall surface - NO AUTH FOR TESTING */}
                            <Route path="/team/:sessionId" element={<TeamDashboardWrapper />} />

                            {/* ============================================================
                            CONTROLBOX SURFACES (Race Control)
                            ============================================================ */}

                            {/* Root - Surface selector (launchpad) - NO AUTH FOR TESTING */}
                            <Route path="/" element={<SurfaceHome />} />

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
                    </BootstrapProvider>
                </BrowserRouter>
            </AppInitializer>
        </ErrorBoundary>
    );
}

