import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getDriverProfile, updateDriverProfile, DriverProfile as DriverProfileType } from '../lib/driverProfile';
import { Edit2, Check, X } from 'lucide-react';

export function DriverProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<DriverProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<'name' | 'iracing' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.7;
    }
  }, []);

  const loadProfile = async () => {
    if (!user) return;
    const data = await getDriverProfile(user.id);
    setProfile(data);
    setLoading(false);
  };

  const handleEdit = (field: 'name' | 'iracing') => {
    setEditing(field);
    setEditValue(field === 'name' ? profile?.display_name || '' : profile?.iracing_customer_id || '');
  };

  const handleSave = async () => {
    if (!user || !profile) return;
    setSaving(true);

    const updates = editing === 'name' 
      ? { display_name: editValue }
      : { iracing_customer_id: editValue || null };

    const { data, error } = await updateDriverProfile(user.id, updates);
    
    if (!error && data) {
      setProfile(data);
    }
    
    setEditing(null);
    setSaving(false);
  };

  const handleCancel = () => {
    setEditing(null);
    setEditValue('');
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-white/50">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12 text-center">
        <h1 
          className="text-xl uppercase tracking-[0.15em] font-semibold text-white mb-4"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          No Driver Profile
        </h1>
        <p className="text-sm text-white/50 mb-8">
          You haven't created a driver profile yet.
        </p>
        <Link to="/create-driver-profile" className="btn btn-primary">
          Create Driver Profile
        </Link>
      </div>
    );
  }

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
          <source src="/videos/driver-bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 
          className="text-xl uppercase tracking-[0.15em] font-semibold text-white mb-2"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          Driver Profile
        </h1>
        <p className="text-sm text-white/50">
          Your racing identity in Ok, Box Box
        </p>
      </div>

      <div className="space-y-4">
        {/* Driver Name */}
        <div className="bg-[--surface] border border-[--border] p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <label className="block text-xs uppercase tracking-wider text-[#3b82f6] mb-2">
                Driver Name
              </label>
              {editing === 'name' ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="input flex-1"
                    autoFocus
                  />
                  <button 
                    onClick={handleSave} 
                    disabled={saving || !editValue.trim()}
                    className="p-2 text-green-500 hover:bg-green-500/10 transition-colors"
                  >
                    <Check size={18} />
                  </button>
                  <button 
                    onClick={handleCancel}
                    className="p-2 text-white/50 hover:bg-white/5 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-lg text-white">{profile.display_name}</span>
                  <button 
                    onClick={() => handleEdit('name')}
                    className="p-2 text-white/30 hover:text-white/70 transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* iRacing Customer ID */}
        <div className="bg-[--surface] border border-[--border] p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <label className="block text-xs uppercase tracking-wider text-[#f97316] mb-2">
                iRacing Customer ID
              </label>
              {editing === 'iracing' ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value.replace(/\D/g, ''))}
                    className="input flex-1"
                    placeholder="123456"
                    autoFocus
                  />
                  <button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="p-2 text-green-500 hover:bg-green-500/10 transition-colors"
                  >
                    <Check size={18} />
                  </button>
                  <button 
                    onClick={handleCancel}
                    className="p-2 text-white/50 hover:bg-white/5 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-lg text-white font-mono">
                    {profile.iracing_customer_id || <span className="text-white/30 font-sans">Not linked</span>}
                  </span>
                  <button 
                    onClick={() => handleEdit('iracing')}
                    className="p-2 text-white/30 hover:text-white/70 transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              )}
              <p className="text-[10px] text-white/30 mt-2">
                Links your iRacing sessions to this profile
              </p>
            </div>
          </div>
        </div>

        {/* Profile Info */}
        <div className="bg-[--surface] border border-[--border] p-6">
          <label className="block text-xs uppercase tracking-wider text-white/50 mb-4">
            Profile Info
          </label>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-white/50">Profile ID</span>
              <span className="text-white/70 font-mono text-xs">{profile.id.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Created</span>
              <span className="text-white/70">
                {new Date(profile.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Last Updated</span>
              <span className="text-white/70">
                {new Date(profile.updated_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Session History Placeholder */}
        <div className="bg-[--surface] border border-[--border] p-6">
          <label className="block text-xs uppercase tracking-wider text-white/50 mb-4">
            Session History
          </label>
          <div className="text-center py-8">
            <p className="text-sm text-white/30 mb-2">No sessions recorded yet</p>
            <p className="text-xs text-white/20">
              Connect the Relay and start a session in iRacing to begin tracking
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
