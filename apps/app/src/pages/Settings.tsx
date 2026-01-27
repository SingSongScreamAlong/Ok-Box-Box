import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { User, Mail, Shield, Key, Trash2, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

export function Settings() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.user_metadata?.display_name || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
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
