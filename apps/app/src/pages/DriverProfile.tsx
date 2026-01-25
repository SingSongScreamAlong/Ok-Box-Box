import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getDriverProfile, updateDriverProfile, DriverProfile as DriverProfileType } from '../lib/driverProfile';
import { Edit2, Check, X, User, Hash, Calendar, Clock, Loader2 } from 'lucide-react';

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-white/50">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading profile...
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen relative">
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
            <source src="/videos/driver-bg.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
        </div>
        <div className="relative z-10 max-w-md mx-auto px-6 py-20 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-[#3b82f6]/20 border border-[#3b82f6]/30 flex items-center justify-center">
            <User className="w-10 h-10 text-[#3b82f6]" />
          </div>
          <h1 
            className="text-2xl uppercase tracking-[0.2em] font-bold text-white mb-4"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            No Driver Profile
          </h1>
          <p className="text-sm text-white/50 mb-8">
            Create your driver identity to start tracking sessions and accessing the pit wall.
          </p>
          <Link to="/create-driver-profile" className="btn btn-primary">
            Create Driver Profile
          </Link>
        </div>
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
          className="w-full h-full object-cover opacity-60"
        >
          <source src="/videos/driver-bg.mp4" type="video/mp4" />
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
            Driver Profile
          </h1>
          <p className="text-sm text-white/50">
            Your racing identity
          </p>
        </div>

        <div className="grid gap-4">
          {/* Driver Name Card */}
          <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#3b82f6]/20 border border-[#3b82f6]/30 flex items-center justify-center">
                <User className="w-5 h-5 text-[#3b82f6]" />
              </div>
              <label 
                className="text-xs uppercase tracking-[0.15em] font-semibold text-[#3b82f6]"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                Driver Name
              </label>
            </div>
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
                  className="p-3 text-green-500 hover:bg-green-500/10 transition-colors border border-green-500/30"
                >
                  <Check size={18} />
                </button>
                <button 
                  onClick={handleCancel}
                  className="p-3 text-white/50 hover:bg-white/5 transition-colors border border-white/10"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-xl text-white font-medium">{profile.display_name}</span>
                <button 
                  onClick={() => handleEdit('name')}
                  className="p-2.5 text-white/30 hover:text-white hover:bg-white/5 transition-all border border-transparent hover:border-white/10"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            )}
          </div>

          {/* iRacing Customer ID Card */}
          <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#f97316]/20 border border-[#f97316]/30 flex items-center justify-center">
                <Hash className="w-5 h-5 text-[#f97316]" />
              </div>
              <label 
                className="text-xs uppercase tracking-[0.15em] font-semibold text-[#f97316]"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                iRacing Customer ID
              </label>
            </div>
            {editing === 'iracing' ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value.replace(/\D/g, ''))}
                  className="input flex-1 font-mono"
                  placeholder="123456"
                  autoFocus
                />
                <button 
                  onClick={handleSave} 
                  disabled={saving}
                  className="p-3 text-green-500 hover:bg-green-500/10 transition-colors border border-green-500/30"
                >
                  <Check size={18} />
                </button>
                <button 
                  onClick={handleCancel}
                  className="p-3 text-white/50 hover:bg-white/5 transition-colors border border-white/10"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-xl text-white font-mono">
                  {profile.iracing_customer_id || <span className="text-white/30 font-sans text-base">Not linked</span>}
                </span>
                <button 
                  onClick={() => handleEdit('iracing')}
                  className="p-2.5 text-white/30 hover:text-white hover:bg-white/5 transition-all border border-transparent hover:border-white/10"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            )}
            <p className="text-[11px] text-white/30 mt-3">
              Links your iRacing sessions to this profile for automatic tracking
            </p>
          </div>

          {/* Profile Info Card */}
          <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white/5 border border-white/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white/50" />
              </div>
              <label 
                className="text-xs uppercase tracking-[0.15em] font-semibold text-white/50"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                Profile Info
              </label>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Profile ID</p>
                <p className="text-sm text-white/70 font-mono">{profile.id.slice(0, 8)}...</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Created</p>
                <p className="text-sm text-white/70">{new Date(profile.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Updated</p>
                <p className="text-sm text-white/70">{new Date(profile.updated_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Session History Placeholder */}
          <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white/5 border border-white/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-white/50" />
              </div>
              <label 
                className="text-xs uppercase tracking-[0.15em] font-semibold text-white/50"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                Session History
              </label>
            </div>
            <div className="text-center py-8 border border-dashed border-white/10">
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
