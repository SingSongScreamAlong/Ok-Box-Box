import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getDriverProfile, updateDriverProfile, DriverProfile } from '../../lib/driverProfile';
import { User, Hash, Edit2, Check, X, Loader2 } from 'lucide-react';

export function DriverProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingCustId, setEditingCustId] = useState(false);
  const [tempName, setTempName] = useState('');
  const [tempCustId, setTempCustId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      try {
        const data = await getDriverProfile(user.id);
        setProfile(data);
        if (data) {
          setTempName(data.display_name);
          setTempCustId(data.iracing_customer_id?.toString() || '');
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [user]);

  const handleSaveName = async () => {
    if (!profile || !user) return;
    setSaving(true);
    setError(null);
    try {
      const result = await updateDriverProfile(user.id, { display_name: tempName });
      if (result.data) {
        setProfile(result.data);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
      setEditingName(false);
    } catch (err) {
      setError('Failed to update name');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCustId = async () => {
    if (!profile || !user) return;
    setSaving(true);
    setError(null);
    try {
      const custId = tempCustId || null;
      const result = await updateDriverProfile(user.id, { iracing_customer_id: custId });
      if (result.data) {
        setProfile(result.data);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
      setEditingCustId(false);
    } catch (err) {
      setError('Failed to update iRacing ID');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-white/40" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-[#f97316]/20 border border-[#f97316]/30 flex items-center justify-center">
            <User className="w-8 h-8 text-[#f97316]" />
          </div>
          <h2 
            className="text-xl uppercase tracking-wider font-bold mb-2"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            No Driver Profile
          </h2>
          <p className="text-sm text-white/50 mb-6">
            Create your driver identity to get started.
          </p>
          <a 
            href="/create-driver-profile"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#f97316] hover:bg-[#ea580c] text-white text-sm uppercase tracking-wider font-semibold transition-colors"
          >
            Create Profile
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 
          className="text-2xl font-bold uppercase tracking-wider"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          Driver Profile
        </h1>
        <p className="text-sm text-white/50 mt-1">Manage your racing identity</p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 p-4 text-green-400 text-sm">
          Profile updated successfully
        </div>
      )}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-6">
        <div className="flex items-center gap-6 mb-8">
          <div className="w-20 h-20 bg-[#f97316]/20 border border-[#f97316]/30 flex items-center justify-center">
            <User className="w-10 h-10 text-[#f97316]" />
          </div>
          <div>
            <div className="text-xl font-semibold">{profile.display_name}</div>
            <div className="text-sm text-white/50">{user?.email}</div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Display Name */}
          <div className="border-b border-white/10 pb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] uppercase tracking-wider text-white/40">
                Display Name
              </label>
              {!editingName && (
                <button
                  onClick={() => setEditingName(true)}
                  className="text-xs text-[#f97316] hover:text-[#fb923c] flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  Edit
                </button>
              )}
            </div>
            {editingName ? (
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="flex-1 bg-black/40 border border-white/20 px-4 py-2 text-white focus:border-[#f97316] focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  disabled={saving}
                  className="p-2 bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => {
                    setEditingName(false);
                    setTempName(profile.display_name);
                  }}
                  className="p-2 bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="text-lg">{profile.display_name}</div>
            )}
          </div>

          {/* iRacing Customer ID */}
          <div className="border-b border-white/10 pb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] uppercase tracking-wider text-white/40">
                iRacing Customer ID
              </label>
              {!editingCustId && (
                <button
                  onClick={() => setEditingCustId(true)}
                  className="text-xs text-[#f97316] hover:text-[#fb923c] flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  Edit
                </button>
              )}
            </div>
            {editingCustId ? (
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    value={tempCustId}
                    onChange={(e) => setTempCustId(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-black/40 border border-white/20 pl-10 pr-4 py-2 text-white focus:border-[#f97316] focus:outline-none"
                    placeholder="123456"
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleSaveCustId}
                  disabled={saving}
                  className="p-2 bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => {
                    setEditingCustId(false);
                    setTempCustId(profile.iracing_customer_id?.toString() || '');
                  }}
                  className="p-2 bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-white/30" />
                <span className="text-lg font-mono">
                  {profile.iracing_customer_id || 'Not set'}
                </span>
              </div>
            )}
          </div>

          {/* Account Info */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-white/40 mb-2 block">
              Account Created
            </label>
            <div className="text-sm text-white/60">
              {new Date(profile.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Linked Identities Placeholder */}
      <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-6">
        <h2 
          className="text-xs uppercase tracking-[0.15em] text-white/60 mb-4"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          Linked Racing Identities
        </h2>
        <div className="text-center py-8 text-white/30 text-sm">
          Identity linking coming soon
        </div>
      </div>
    </div>
  );
}
