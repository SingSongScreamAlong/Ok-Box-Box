import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { User, Mail, Shield, Key, Trash2, Loader2, CheckCircle, AlertTriangle, Link2, Unlink, RefreshCw } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://octopus-app-qsi3i.ondigitalocean.app';

export function Settings() {
  const { user, session } = useAuth();
  const [displayName, setDisplayName] = useState(user?.user_metadata?.display_name || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // iRacing link state
  const [iracingStatus, setIracingStatus] = useState<{
    linked: boolean;
    iracingDisplayName?: string;
    iracingCustomerId?: string;
    isValid?: boolean;
  } | null>(null);
  const [iracingLoading, setIracingLoading] = useState(true);
  const [iracingError, setIracingError] = useState('');

  // Check iRacing link status on mount
  useEffect(() => {
    async function checkIracingStatus() {
      if (!session?.access_token) {
        setIracingLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/api/oauth/iracing/status`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setIracingStatus(data);
        }
      } catch (err) {
        console.error('[Settings] Failed to check iRacing status:', err);
      } finally {
        setIracingLoading(false);
      }
    }
    checkIracingStatus();

    // Check URL params for OAuth callback result
    const params = new URLSearchParams(window.location.search);
    if (params.get('iracing_linked') === 'true') {
      const name = params.get('name');
      setIracingStatus({ linked: true, iracingDisplayName: name || undefined, isValid: true });
      setIracingLoading(false);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('iracing_error')) {
      setIracingError(`iRacing link failed: ${params.get('iracing_error')}`);
      setIracingLoading(false);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [session?.access_token]);

  const handleConnectIRacing = () => {
    // Redirect to server OAuth start endpoint (server redirects to iRacing)
    window.location.href = `${API_BASE}/api/oauth/iracing/start`;
  };

  const handleDisconnectIRacing = async () => {
    if (!session?.access_token) return;
    const confirmed = window.confirm('Disconnect your iRacing account? You can reconnect anytime.');
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE}/api/oauth/iracing/revoke`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        setIracingStatus({ linked: false });
        setIracingError('');
      }
    } catch (err) {
      setIracingError('Failed to disconnect iRacing account');
    }
  };
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.5;
    }
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    const { error } = await supabase.auth.updateUser({
      data: { display_name: displayName }
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setLoading(false);
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone.'
    );
    
    if (!confirmed) return;
    alert('Please contact support@okboxbox.com to delete your account.');
  };

  return (
    <div className="min-h-screen relative">
      {/* Background video */}
      <div className="fixed inset-0 z-0">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover opacity-60"
        >
          <source src="/videos/bg-2.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 md:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 
            className="text-2xl md:text-3xl uppercase tracking-[0.2em] font-bold text-white mb-2"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Settings
          </h1>
          <p className="text-sm text-white/50">
            Manage your account
          </p>
        </div>

        <div className="grid gap-4">
          {/* Profile Section */}
          <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#3b82f6]/20 border border-[#3b82f6]/30 flex items-center justify-center">
                <User className="w-5 h-5 text-[#3b82f6]" />
              </div>
              <h2 
                className="text-xs uppercase tracking-[0.15em] font-semibold text-[#3b82f6]"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                Profile
              </h2>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-green-500/10 border border-green-500/30 text-green-400 text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Profile updated successfully
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-5">
              <div>
                <label className="block text-xs uppercase tracking-wider text-white/50 mb-2 font-medium">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input
                    type="email"
                    value={user?.email || ''}
                    className="input pl-11 bg-white/5 text-white/50 cursor-not-allowed"
                    disabled
                  />
                </div>
                <p className="text-[10px] text-white/30 mt-2">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-white/50 mb-2 font-medium">
                  Display Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="input pl-11"
                    placeholder="Your name"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary h-11 text-sm"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Save Changes'
                )}
              </button>
            </form>
          </div>

          {/* iRacing Connection */}
          <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#f97316]/20 border border-[#f97316]/30 flex items-center justify-center">
                <Link2 className="w-5 h-5 text-[#f97316]" />
              </div>
              <h2 
                className="text-xs uppercase tracking-[0.15em] font-semibold text-[#f97316]"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                iRacing Account
              </h2>
            </div>

            {iracingError && (
              <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {iracingError}
              </div>
            )}

            {iracingLoading ? (
              <div className="flex items-center gap-3 text-white/40">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Checking iRacing connection...</span>
              </div>
            ) : iracingStatus?.linked ? (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-sm text-white font-medium">
                      Connected{iracingStatus.iracingDisplayName ? ` as ${iracingStatus.iracingDisplayName}` : ''}
                    </p>
                    {iracingStatus.iracingCustomerId && (
                      <p className="text-[10px] text-white/30 font-mono">ID: {iracingStatus.iracingCustomerId}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleDisconnectIRacing}
                    className="btn bg-white/5 text-white/50 border border-white/10 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 text-xs h-9 gap-2"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-white/40 mb-4">
                  Link your iRacing account to sync your stats, licenses, and race history.
                </p>
                <button
                  onClick={handleConnectIRacing}
                  className="btn bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/30 hover:bg-[#f97316]/30 text-xs h-10 gap-2"
                >
                  <Link2 className="w-4 h-4" />
                  Connect iRacing Account
                </button>
              </div>
            )}
          </div>

          {/* Account Info */}
          <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-white/5 border border-white/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white/50" />
              </div>
              <h2 
                className="text-xs uppercase tracking-[0.15em] font-semibold text-white/50"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                Account
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Account ID</p>
                <p className="text-sm text-white/70 font-mono">{user?.id?.slice(0, 8)}...</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Created</p>
                <p className="text-sm text-white/70">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Auth Provider</p>
                <p className="text-sm text-white/70 capitalize">
                  {user?.app_metadata?.provider || 'email'}
                </p>
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-white/5 border border-white/10 flex items-center justify-center">
                <Key className="w-5 h-5 text-white/50" />
              </div>
              <h2 
                className="text-xs uppercase tracking-[0.15em] font-semibold text-white/50"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                Security
              </h2>
            </div>
            <p className="text-sm text-white/40 mb-4">
              Password management and two-factor authentication
            </p>
            <button className="btn btn-outline text-xs h-10 opacity-50 cursor-not-allowed" disabled>
              Coming Soon
            </button>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-500/5 border border-red-500/20 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h2 
                className="text-xs uppercase tracking-[0.15em] font-semibold text-red-400"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                Danger Zone
              </h2>
            </div>
            <p className="text-sm text-white/50 mb-4">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <button
              onClick={handleDeleteAccount}
              className="btn bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 text-xs h-10"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
