
import { useState } from 'react';
import { useAuthStore } from '../../stores/auth.store';
import { X, Shield, User, Key, Search } from 'lucide-react';

interface InviteDriverModalProps {
    teamId: string;
    onClose: () => void;
    onInviteSuccess: () => void;
}

export function InviteDriverModal({ teamId, onClose, onInviteSuccess }: InviteDriverModalProps) {
    const { accessToken } = useAuthStore();
    const [driverId, setDriverId] = useState('');
    const [role, setRole] = useState<'driver' | 'engineer' | 'manager'>('driver');
    const [scope, setScope] = useState<'team_standard' | 'team_deep'>('team_standard');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!driverId.trim()) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/teams/${teamId}/invite`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    driver_profile_id: driverId,
                    role,
                    requested_scope: scope
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send invitation');
            }

            onInviteSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-lg shadow-2xl relative overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
                    <h2 className="text-xl font-bold text-white">Invite New Member</h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Driver ID Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                            <Search size={16} className="text-cyan-400" />
                            Driver Profile ID
                        </label>
                        <input
                            type="text"
                            value={driverId}
                            onChange={(e) => setDriverId(e.target.value)}
                            placeholder="e.g. uuid-of-driver-profile"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono text-sm"
                            required
                        />
                        <p className="text-xs text-slate-500">
                            Enter the unique Profile ID of the driver you wish to invite.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {/* Role Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                <User size={16} className="text-blue-400" />
                                Role
                            </label>
                            <div className="space-y-2">
                                <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-700 bg-slate-950/50 cursor-pointer hover:border-slate-600 transition-colors">
                                    <input
                                        type="radio"
                                        name="role"
                                        value="driver"
                                        checked={role === 'driver'}
                                        onChange={() => setRole('driver')}
                                        className="text-cyan-500 focus:ring-cyan-500 bg-slate-900 border-slate-600"
                                    />
                                    <span className="text-white text-sm">Driver</span>
                                </label>
                                <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-700 bg-slate-950/50 cursor-pointer hover:border-slate-600 transition-colors">
                                    <input
                                        type="radio"
                                        name="role"
                                        value="engineer"
                                        checked={role === 'engineer'}
                                        onChange={() => setRole('engineer')}
                                        className="text-blue-500 focus:ring-blue-500 bg-slate-900 border-slate-600"
                                    />
                                    <span className="text-white text-sm">Engineer</span>
                                </label>
                            </div>
                        </div>

                        {/* Access Scope Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                <Key size={16} className="text-amber-400" />
                                Access Scope
                            </label>
                            <div className="space-y-2">
                                <label className={`flex flex-col gap-1 p-3 rounded-lg border cursor-pointer transition-all ${scope === 'team_standard' ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-slate-700 bg-slate-950/50 hover:border-slate-600'}`}>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="scope"
                                            value="team_standard"
                                            checked={scope === 'team_standard'}
                                            onChange={() => setScope('team_standard')}
                                            className="text-cyan-500 focus:ring-cyan-500 bg-slate-900 border-slate-600"
                                        />
                                        <span className="text-white text-sm font-medium">Standard</span>
                                    </div>
                                    <span className="text-xs text-slate-400 ml-6">Basic telemetry & public stats</span>
                                </label>

                                <label className={`flex flex-col gap-1 p-3 rounded-lg border cursor-pointer transition-all ${scope === 'team_deep' ? 'border-purple-500/50 bg-purple-500/5' : 'border-slate-700 bg-slate-950/50 hover:border-slate-600'}`}>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="scope"
                                            value="team_deep"
                                            checked={scope === 'team_deep'}
                                            onChange={() => setScope('team_deep')}
                                            className="text-purple-500 focus:ring-purple-500 bg-slate-900 border-slate-600"
                                        />
                                        <span className="text-white text-sm font-medium">Deep (Full)</span>
                                    </div>
                                    <span className="text-xs text-slate-400 ml-6">Detailed inputs & private logs</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
                            <Shield size={16} />
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-lg font-medium shadow-lg shadow-cyan-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isSubmitting ? 'Sending...' : 'Send Invitation'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
