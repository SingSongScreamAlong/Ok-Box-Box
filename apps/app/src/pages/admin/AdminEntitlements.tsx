import { useEffect, useState, useCallback } from 'react';
import { CreditCard, Plus, Ban, RefreshCw, X, Clock } from 'lucide-react';
import {
  fetchEntitlements, grantEntitlement, revokeEntitlement, fetchAuditLog,
  type Entitlement, type AuditLogEntry,
} from '../../lib/adminService';

const PRODUCTS = ['driver', 'team', 'league', 'bundle'] as const;

const PRODUCT_COLORS: Record<string, string> = {
  driver: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  team:   'text-purple-400 bg-purple-500/10 border-purple-500/20',
  league: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  bundle: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};

export function AdminEntitlements() {
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [tab, setTab] = useState<'active' | 'audit'>('active');

  // Grant form
  const [grantForm, setGrantForm] = useState({ userEmail: '', product: 'driver' as string, notes: '' });
  const [granting, setGranting] = useState(false);
  const [showGrant, setShowGrant] = useState(false);

  // Revoke confirm
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ents, log] = await Promise.all([fetchEntitlements(), fetchAuditLog(100)]);
      setEntitlements(ents);
      setAuditLog(log);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    setGranting(true);
    setActionError(null);
    try {
      const newEnt = await grantEntitlement(grantForm);
      setEntitlements(prev => [newEnt, ...prev]);
      setShowGrant(false);
      setGrantForm({ userEmail: '', product: 'driver', notes: '' });
      // Reload audit log
      fetchAuditLog(100).then(log => setAuditLog(log)).catch(() => {});
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setGranting(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setActionError(null);
    try {
      await revokeEntitlement(id, revokeReason || undefined);
      setEntitlements(prev => prev.map(e => e.id === id ? { ...e, status: 'canceled' } : e));
      setConfirmRevoke(null);
      setRevokeReason('');
      fetchAuditLog(100).then(log => setAuditLog(log)).catch(() => {});
    } catch (e: any) {
      setActionError(e.message);
    }
  };

  const active = entitlements.filter(e => e.status === 'active');
  const inactive = entitlements.filter(e => e.status !== 'active');

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold uppercase tracking-[0.2em] text-white/90" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          Entitlements
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded border border-white/[0.08] text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-all">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { setShowGrant(true); setActionError(null); }}
            className="flex items-center gap-2 px-3 py-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-xs uppercase tracking-wider transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Grant Access
          </button>
        </div>
      </div>

      {actionError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded p-3 text-red-400 text-xs flex items-center justify-between">
          {actionError}
          <button onClick={() => setActionError(null)}><X className="w-3 h-3" /></button>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {PRODUCTS.map(p => {
          const count = active.filter(e => e.product === p).length;
          return (
            <div key={p} className={`bg-white/[0.03] border rounded p-3 ${PRODUCT_COLORS[p]?.split(' ')[2] || 'border-white/[0.07]'}`}>
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">{p}</div>
              <div className={`text-2xl font-mono font-bold ${PRODUCT_COLORS[p]?.split(' ')[0] || 'text-white/80'}`}>{count}</div>
              <div className="text-[10px] text-white/30">active</div>
            </div>
          );
        })}
      </div>

      {/* Grant form */}
      {showGrant && (
        <div className="bg-white/[0.03] border border-white/[0.08] rounded p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs uppercase tracking-wider text-white/60 flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" /> Grant Entitlement
            </h2>
            <button onClick={() => setShowGrant(false)} className="text-white/30 hover:text-white/60"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleGrant} className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1.5">User Email</label>
              <input
                type="email"
                value={grantForm.userEmail}
                onChange={e => setGrantForm(f => ({ ...f, userEmail: e.target.value }))}
                className="input w-full text-sm"
                placeholder="user@team.com"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Product</label>
              <select
                value={grantForm.product}
                onChange={e => setGrantForm(f => ({ ...f, product: e.target.value }))}
                className="input w-full text-sm"
              >
                {PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Notes (optional)</label>
              <input
                type="text"
                value={grantForm.notes}
                onChange={e => setGrantForm(f => ({ ...f, notes: e.target.value }))}
                className="input w-full text-sm"
                placeholder="Alpha tester, demo..."
              />
            </div>
            <div className="col-span-3 flex justify-end gap-2">
              <button type="button" onClick={() => setShowGrant(false)} className="px-4 py-2 text-xs text-white/40 hover:text-white/70">Cancel</button>
              <button
                type="submit"
                disabled={granting}
                className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 rounded text-xs uppercase tracking-wider transition-all disabled:opacity-50"
              >
                {granting ? 'Granting...' : 'Grant'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/[0.06] pb-0">
        {(['active', 'audit'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs uppercase tracking-wider transition-colors border-b-2 -mb-px ${
              tab === t ? 'text-white/80 border-white/40' : 'text-white/30 border-transparent hover:text-white/50'
            }`}
          >
            {t === 'active' ? `Active (${active.length})` : `Audit Log (${auditLog.length})`}
          </button>
        ))}
      </div>

      {loading && entitlements.length === 0 ? (
        <div className="text-xs text-white/30 py-8 text-center">Loading...</div>
      ) : error ? (
        <div className="text-xs text-red-400 py-4">{error}</div>
      ) : tab === 'active' ? (
        <EntitlementsTable
          rows={active}
          confirmRevoke={confirmRevoke}
          revokeReason={revokeReason}
          setConfirmRevoke={setConfirmRevoke}
          setRevokeReason={setRevokeReason}
          onRevoke={handleRevoke}
        />
      ) : (
        <AuditLogTable rows={auditLog} />
      )}

      {/* Inactive / canceled */}
      {tab === 'active' && inactive.length > 0 && (
        <details className="opacity-40">
          <summary className="text-[10px] uppercase tracking-wider text-white/30 cursor-pointer select-none py-1">
            {inactive.length} canceled / expired
          </summary>
          <EntitlementsTable rows={inactive} confirmRevoke={null} revokeReason="" setConfirmRevoke={() => {}} setRevokeReason={() => {}} onRevoke={() => {}} />
        </details>
      )}
    </div>
  );
}

function EntitlementsTable({
  rows, confirmRevoke, revokeReason, setConfirmRevoke, setRevokeReason, onRevoke
}: {
  rows: Entitlement[];
  confirmRevoke: string | null;
  revokeReason: string;
  setConfirmRevoke: (id: string | null) => void;
  setRevokeReason: (r: string) => void;
  onRevoke: (id: string) => void;
}) {
  if (rows.length === 0) {
    return <div className="text-xs text-white/20 py-6 text-center border border-white/[0.05] rounded">No entitlements</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/[0.06]">
            {['User', 'Product', 'Status', 'Source', 'Granted', ''].map(h => (
              <th key={h} className="text-left py-2.5 px-3 text-[10px] uppercase tracking-wider text-white/30 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(e => {
            const colors = PRODUCT_COLORS[e.product] || 'text-white/50 bg-white/5 border-white/10';
            const [textC, bgC, borderC] = colors.split(' ');
            return (
              <tr key={e.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="py-3 px-3 text-white/70">
                  {e.user_display_name || '—'}
                  <div className="text-[10px] text-white/30 font-mono">{e.user_email || e.user_id || e.org_id || '—'}</div>
                </td>
                <td className="py-3 px-3">
                  <span className={`px-2 py-0.5 rounded border text-[10px] font-medium ${textC} ${bgC} ${borderC}`}>
                    {e.product}
                  </span>
                </td>
                <td className="py-3 px-3">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] ${e.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-white/30'}`}>
                    {e.status}
                  </span>
                </td>
                <td className="py-3 px-3 text-white/30 font-mono text-[10px]">{e.source}</td>
                <td className="py-3 px-3 text-white/30">{new Date(e.created_at).toLocaleDateString()}</td>
                <td className="py-3 px-3">
                  {e.status === 'active' && (
                    confirmRevoke === e.id ? (
                      <div className="space-y-1">
                        <input
                          value={revokeReason}
                          onChange={ev => setRevokeReason(ev.target.value)}
                          className="input w-full text-[10px] py-1 px-2"
                          placeholder="Reason (optional)"
                        />
                        <div className="flex items-center gap-2">
                          <button onClick={() => onRevoke(e.id)} className="text-[10px] text-red-400 hover:text-red-300 underline">Revoke</button>
                          <button onClick={() => setConfirmRevoke(null)} className="text-[10px] text-white/30 hover:text-white/60">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmRevoke(e.id)}
                        className="p-1.5 rounded text-white/20 hover:text-red-400 hover:bg-red-500/[0.08] transition-all"
                        title="Revoke"
                      >
                        <Ban className="w-3 h-3" />
                      </button>
                    )
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AuditLogTable({ rows }: { rows: AuditLogEntry[] }) {
  if (rows.length === 0) {
    return <div className="text-xs text-white/20 py-6 text-center border border-white/[0.05] rounded">No audit entries</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/[0.06]">
            {['When', 'Action', 'Admin', 'Product', 'Old → New', 'Notes'].map(h => (
              <th key={h} className="text-left py-2.5 px-3 text-[10px] uppercase tracking-wider text-white/30 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(e => (
            <tr key={e.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
              <td className="py-2.5 px-3 text-white/30 text-[10px]">
                <div className="flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {new Date(e.created_at).toLocaleString()}
                </div>
              </td>
              <td className="py-2.5 px-3">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${
                  e.action.includes('grant') ? 'bg-emerald-500/10 text-emerald-400'
                  : e.action.includes('revoke') ? 'bg-red-500/10 text-red-400'
                  : 'bg-white/5 text-white/40'
                }`}>
                  {e.action}
                </span>
              </td>
              <td className="py-2.5 px-3 text-white/50 font-mono text-[10px]">{e.admin_email || e.triggered_by}</td>
              <td className="py-2.5 px-3 text-white/60">{(e.metadata as any)?.product || '—'}</td>
              <td className="py-2.5 px-3 text-white/30 font-mono text-[10px]">
                {e.previous_status && <span className="text-red-400/60">{e.previous_status}</span>}
                {e.previous_status && e.new_status && <span className="text-white/20"> → </span>}
                {e.new_status && <span className="text-emerald-400/60">{e.new_status}</span>}
              </td>
              <td className="py-2.5 px-3 text-white/30 text-[10px]">{(e.metadata as any)?.notes || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
