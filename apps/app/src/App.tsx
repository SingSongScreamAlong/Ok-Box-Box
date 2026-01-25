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
import { DriverHome } from './pages/driver/DriverHome';
import { DriverPitwall } from './pages/driver/DriverPitwall';
import { DriverHUD } from './pages/driver/DriverHUD';
import { DriverVoice } from './pages/driver/DriverVoice';
import { DriverProfilePage } from './pages/driver/DriverProfilePage';
import { Settings } from './pages/Settings';
import { CreateDriverProfile } from './pages/CreateDriverProfile';

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
          <Route path="home" element={<DriverHome />} />
          <Route path="pitwall" element={<DriverPitwall />} />
          <Route path="hud" element={<DriverHUD />} />
          <Route path="voice" element={<DriverVoice />} />
          <Route path="profile" element={<DriverProfilePage />} />
        </Route>

        {/* Settings & Profile Creation (outside driver layout) */}
        <Route path="/settings" element={<ProtectedRoute><DriverLayout /></ProtectedRoute>}>
          <Route index element={<Settings />} />
        </Route>
        <Route path="/create-driver-profile" element={<ProtectedRoute><DriverLayout /></ProtectedRoute>}>
          <Route index element={<CreateDriverProfile />} />
        </Route>

        {/* Redirects */}
        <Route path="/dashboard" element={<Navigate to="/driver/home" replace />} />
        <Route path="/" element={<Navigate to="/driver/home" replace />} />
        <Route path="*" element={<Navigate to="/driver/home" replace />} />
      </Routes>
    </RelayProvider>
  );
}

export default App;
