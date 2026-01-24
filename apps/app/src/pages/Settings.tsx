import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

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

    // Note: Account deletion requires a server-side function in Supabase
    // For now, we'll show a message to contact support
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
          className="w-full h-full object-cover opacity-90"
        >
          <source src="/videos/team-bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 
          className="text-xl uppercase tracking-[0.15em] font-semibold text-white mb-2"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          Settings
        </h1>
        <p className="text-sm text-white/50">
          Manage your account settings
        </p>
      </div>

      <div className="space-y-8">
        {/* Profile section */}
        <div className="bg-[--surface] border border-[--border] p-6">
          <h2 
            className="text-xs uppercase tracking-[0.12em] font-semibold text-white mb-6"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Profile
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
              Profile updated successfully
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-white/50 mb-2">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                className="input bg-white/5"
                disabled
              />
              <p className="text-[10px] text-white/30 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-white/50 mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input"
                placeholder="Your name"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Account info */}
        <div className="bg-[--surface] border border-[--border] p-6">
          <h2 
            className="text-xs uppercase tracking-[0.12em] font-semibold text-white mb-6"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Account
          </h2>

          <div className="space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-white/50">Account ID</span>
              <span className="text-white/70 font-mono text-xs">{user?.id?.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Created</span>
              <span className="text-white/70">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Auth Provider</span>
              <span className="text-white/70">
                {user?.app_metadata?.provider || 'email'}
              </span>
            </div>
          </div>
        </div>

        {/* Danger zone */}
        <div className="bg-red-500/5 border border-red-500/20 p-6">
          <h2 
            className="text-xs uppercase tracking-[0.12em] font-semibold text-red-400 mb-4"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Danger Zone
          </h2>
          <p className="text-sm text-white/50 mb-4">
            Permanently delete your account and all associated data.
          </p>
          <button
            onClick={handleDeleteAccount}
            className="btn bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 text-xs"
          >
            Delete Account
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
