/**
 * Subscription Management Page
 * Ported from packages/dashboard — adapted for Supabase auth (Gen 3)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  CreditCard,
  Calendar,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Shield,
  Zap,
  Users,
  Radio,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://octopus-app-qsi3i.ondigitalocean.app';

interface Subscription {
  id: string;
  product: 'blackbox' | 'controlbox' | 'racebox_plus';
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
}

interface Entitlement {
  id: string;
  product: string;
  granted_at: string;
  expires_at: string | null;
  source: 'stripe' | 'squarespace' | 'manual';
}

interface BillingData {
  subscriptions: Subscription[];
  entitlements: Entitlement[];
}

const PRODUCT_INFO: Record<string, { name: string; icon: React.ElementType; color: string; description: string }> = {
  blackbox: {
    name: 'BlackBox',
    icon: Zap,
    color: 'text-orange-400',
    description: 'AI crew, live race execution, and session analytics',
  },
  driver: {
    name: 'BlackBox',
    icon: Zap,
    color: 'text-orange-400',
    description: 'AI crew, live race execution, and session analytics',
  },
  controlbox: {
    name: 'ControlBox',
    icon: Shield,
    color: 'text-blue-400',
    description: 'Race control automation and steward workflows',
  },
  league: {
    name: 'ControlBox',
    icon: Shield,
    color: 'text-blue-400',
    description: 'Race control automation and steward workflows',
  },
  racebox_plus: {
    name: 'RaceBox Plus',
    icon: Radio,
    color: 'text-purple-400',
    description: 'Professional broadcast features',
  },
  bundle: {
    name: 'Complete Bundle',
    icon: Users,
    color: 'text-green-400',
    description: 'All products included',
  },
};

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return { Authorization: `Bearer ${session.access_token}` };
  }
  return {};
}

export function SubscriptionManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [billingData, setBillingData] = useState<BillingData>({ subscriptions: [], entitlements: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`${API_BASE}/api/billing/stripe/subscriptions`, {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBillingData({
            subscriptions: data.data.subscriptions || [],
            entitlements: data.data.entitlements || [],
          });
        }
      }
    } catch {
      // Silently fall through — show empty state, not an error
    }
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSubscriptionData();
    setRefreshing(false);
  };

  const handleManageSubscription = async () => {
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`${API_BASE}/api/billing/stripe/portal`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.url) {
          window.location.href = data.data.url;
        }
      }
    } catch {
      setError('Failed to open billing portal. Please try again.');
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const getStatusBadge = (status: string, cancelAtPeriodEnd: boolean) => {
    if (cancelAtPeriodEnd) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-amber-500/20 text-amber-400">
          <AlertCircle size={12} /> Canceling
        </span>
      );
    }
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">
            <CheckCircle size={12} /> Active
          </span>
        );
      case 'trialing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
            <Zap size={12} /> Trial
          </span>
        );
      case 'past_due':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400">
            <AlertCircle size={12} /> Past Due
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-slate-500/20 text-slate-400">
            {status}
          </span>
        );
    }
  };

  const activeEntitlements = billingData.entitlements.filter(e => !e.expires_at || new Date(e.expires_at) > new Date());
  const manualEntitlements = activeEntitlements.filter(e => e.source === 'manual');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white/40">Loading subscription data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              Subscription
            </h1>
            <p className="text-white/40 mt-1 text-sm">Manage your Ok, Box Box plan and billing</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 border border-white/10 hover:border-white/20 text-white/60 hover:text-white text-sm transition-colors"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Account */}
        <div className="border border-white/10 bg-white/[0.02] p-6 mb-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-4">Account</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-white/30 mb-1">Email</p>
              <p className="text-white">{user?.email}</p>
            </div>
            <div>
              <p className="text-xs text-white/30 mb-1">Display Name</p>
              <p className="text-white">{user?.user_metadata?.display_name || user?.email?.split('@')[0] || '—'}</p>
            </div>
          </div>
        </div>

        {/* Active entitlements */}
        <div className="border border-white/10 bg-white/[0.02] p-6 mb-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-4">Active Products</h2>
          {activeEntitlements.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white/30 mb-4 text-sm">No active subscriptions</p>
              <button
                onClick={() => navigate('/pricing')}
                className="px-6 py-2 bg-orange-500 hover:bg-orange-400 text-black font-bold text-sm uppercase tracking-wider transition-colors"
              >
                View Pricing
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {activeEntitlements.map(ent => {
                const info = PRODUCT_INFO[ent.product];
                if (!info) return null;
                const Icon = info.icon;
                return (
                  <div key={ent.id} className="flex items-center justify-between p-4 border border-white/10 bg-white/5">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 border border-white/10 ${info.color}`}>
                        <Icon size={20} />
                      </div>
                      <div>
                        <h3 className="font-medium text-white">{info.name}</h3>
                        <p className="text-xs text-white/40">{info.description}</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-500/20 text-green-400">
                      <CheckCircle size={12} /> Active
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Stripe billing details */}
        {billingData.subscriptions.length > 0 && (
          <div className="border border-white/10 bg-white/[0.02] p-6 mb-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-4">Billing Details</h2>
            <div className="space-y-3">
              {billingData.subscriptions.map(sub => {
                const info = PRODUCT_INFO[sub.product];
                const Icon = info?.icon || CreditCard;
                return (
                  <div key={sub.id} className="border border-white/10 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Icon size={18} className={info?.color || 'text-white/40'} />
                        <span className="font-medium text-white">{info?.name || sub.product}</span>
                      </div>
                      {getStatusBadge(sub.status, sub.cancel_at_period_end)}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs text-white/40">
                      <div className="flex items-center gap-2">
                        <Calendar size={12} />
                        Started: {formatDate(sub.created_at)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar size={12} />
                        {sub.cancel_at_period_end ? 'Ends' : 'Renews'}: {formatDate(sub.current_period_end)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={handleManageSubscription}
              className="mt-4 flex items-center gap-2 px-4 py-2 border border-white/10 hover:border-white/20 text-white/60 hover:text-white text-sm transition-colors"
            >
              <ExternalLink size={14} />
              Manage Billing
            </button>
          </div>
        )}

        {/* Manual / alpha entitlements */}
        {manualEntitlements.length > 0 && (
          <div className="border border-white/10 bg-white/[0.02] p-6 mb-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-2">Granted Access</h2>
            <p className="text-xs text-white/30 mb-4">Manually granted (alpha access, promotions).</p>
            <div className="space-y-2">
              {manualEntitlements.map(ent => (
                <div key={ent.id} className="flex items-center justify-between p-3 border border-white/10">
                  <span className="text-white capitalize text-sm">{ent.product}</span>
                  <span className="text-xs text-white/30">
                    {ent.expires_at ? `Expires: ${formatDate(ent.expires_at)}` : 'No expiration'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/pricing')}
            className="px-6 py-2 bg-orange-500 hover:bg-orange-400 text-black font-bold text-sm uppercase tracking-wider transition-colors"
          >
            View All Plans
          </button>
          <button
            onClick={() => navigate('/driver/home')}
            className="px-6 py-2 border border-white/10 hover:border-white/20 text-white/60 hover:text-white text-sm transition-colors"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="mt-8 p-4 border border-white/5 text-center">
          <p className="text-white/30 text-xs">
            Need help with billing?{' '}
            <a href="mailto:support@okboxbox.com" className="text-orange-400 hover:text-orange-300 transition-colors">
              support@okboxbox.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SubscriptionManagement;
