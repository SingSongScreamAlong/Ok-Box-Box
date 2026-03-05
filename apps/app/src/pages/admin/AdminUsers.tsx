import { useEffect, useState, useCallback } from 'react';
import { Users, Plus, Trash2, ShieldCheck, RefreshCw, X } from 'lucide-react';
import {
  fetchAdminUsers, createAdminUser, deactivateAdminUser,
  type AdminUser,
} from '../../lib/adminService';

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null); // userId to deactivate
  const [actionError, setActionError] = useState<string | null>(null);

  // Create form state
  const [form, setForm] = useState({ email: '', password: '', displayName: '', isSuperAdmin: false });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAdminUsers();
      setUsers(data);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setActionError(null);
    try {
      const newUser = await createAdminUser(form);
      setUsers(prev => [newUser, ...prev]);
      setShowCreate(false);
      setForm({ email: '', password: '', displayName: '', isSuperAdmin: false });
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivate = async (userId: string) => {
    setActionError(null);
    try {
      await deactivateAdminUser(userId);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: false } : u));
      setConfirm(null);
    } catch (e: any) {
      setActionError(e.message);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold uppercase tracking-[0.2em] text-white/90" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          Users
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2 rounded border border-white/[0.08] text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { setShowCreate(true); setActionError(null); }}
            className="flex items-center gap-2 px-3 py-2 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs uppercase tracking-wider transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Create User
          </button>
        </div>
      </div>

      {actionError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded p-3 text-red-400 text-xs flex items-center justify-between">
          {actionError}
          <button onClick={() => setActionError(null)}><X className="w-3 h-3" /></button>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="bg-white/[0.03] border border-white/[0.08] rounded p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs uppercase tracking-wider text-white/60 flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" /> New User
            </h2>
            <button onClick={() => setShowCreate(false)} className="text-white/30 hover:text-white/60">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Display Name</label>
              <input
                type="text"
                value={form.displayName}
                onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                className="input w-full text-sm"
                placeholder="John Doe"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="input w-full text-sm"
                placeholder="user@team.com"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="input w-full text-sm"
                placeholder="min 8 chars"
                required
                minLength={8}
              />
            </div>
            <div className="flex items-center gap-3 pt-5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isSuperAdmin}
                  onChange={e => setForm(f => ({ ...f, isSuperAdmin: e.target.checked }))}
                  className="w-4 h-4 rounded"
                />
                <span className="text-xs text-white/50">Super Admin</span>
              </label>
            </div>
            <div className="col-span-2 flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded text-xs uppercase tracking-wider transition-all disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* User table */}
      {loading && users.length === 0 ? (
        <div className="text-xs text-white/30 py-8 text-center">Loading users...</div>
      ) : error ? (
        <div className="text-xs text-red-400 py-4">{error}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['User', 'Email', 'Role', 'Status', 'Last Login', 'Created', ''].map(h => (
                  <th key={h} className="text-left py-2.5 px-3 text-[10px] uppercase tracking-wider text-white/30 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className={`border-b border-white/[0.04] hover:bg-white/[0.02] ${!u.isActive ? 'opacity-40' : ''}`}>
                  <td className="py-3 px-3 text-white/80 font-medium">{u.displayName}</td>
                  <td className="py-3 px-3 text-white/50 font-mono">{u.email}</td>
                  <td className="py-3 px-3">
                    {u.isSuperAdmin ? (
                      <span className="flex items-center gap-1 text-red-400">
                        <ShieldCheck className="w-3 h-3" /> Super Admin
                      </span>
                    ) : (
                      <span className="text-white/30">User</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] ${u.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-white/30'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-white/40">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-3 px-3 text-white/30">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-3">
                    {u.isActive && (
                      confirm === u.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-red-400">Confirm?</span>
                          <button
                            onClick={() => handleDeactivate(u.id)}
                            className="text-[10px] text-red-400 hover:text-red-300 underline"
                          >Yes</button>
                          <button
                            onClick={() => setConfirm(null)}
                            className="text-[10px] text-white/30 hover:text-white/60"
                          >No</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirm(u.id)}
                          className="p-1.5 rounded text-white/20 hover:text-red-400 hover:bg-red-500/[0.08] transition-all"
                          title="Deactivate user"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 text-[10px] text-white/20">{users.length} users total</div>
        </div>
      )}
    </div>
  );
}
