/**
 * Subscription Management Page
 * 
 * View and manage active subscriptions, billing history, and account settings.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, getAuthHeader } from '../stores/auth.store';
import { useBootstrap } from '../hooks/useBootstrap';
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
    Radio
} from 'lucide-react';

import { API_BASE } from '../config/api';

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

const PRODUCT_INFO: Record<string, { name: string; icon: any; color: string; description: string }> = {
    blackbox: {
        name: 'BlackBox',
        icon: Zap,
        color: 'text-yellow-400',
        description: 'Live race execution and situational awareness'
    },
    controlbox: {
        name: 'ControlBox',
        icon: Shield,
        color: 'text-blue-400',
        description: 'Race control automation and steward workflows'
    },
    racebox_plus: {
        name: 'RaceBox Plus',
        icon: Radio,
        color: 'text-purple-400',
        description: 'Professional broadcast features'
    },
    bundle: {
        name: 'Complete Bundle',
        icon: Users,
        color: 'text-green-400',
        description: 'All products included'
    }
};

export function SubscriptionManagement() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { bootstrap, refresh, loading: bootstrapLoading } = useBootstrap();

    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
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
            const response = await fetch(`${API_BASE}/api/billing/stripe/subscriptions`, {
                headers: {
                    ...getAuthHeader(),
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setSubscriptions(data.data.subscriptions || []);
                    setEntitlements(data.data.entitlements || []);
                }
            }
        } catch (err) {
            console.error('Failed to fetch subscriptions:', err);
            // Don't show error - just use bootstrap data
        }

        setLoading(false);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchSubscriptionData(), refresh()]);
        setRefreshing(false);
    };

    const handleManageSubscription = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/billing/stripe/portal`, {
                method: 'POST',
                headers: {
                    ...getAuthHeader(),
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data.url) {
                    window.location.href = data.data.url;
                }
            }
        } catch (err) {
            console.error('Failed to open billing portal:', err);
            setError('Failed to open billing portal. Please try again.');
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const getStatusBadge = (status: string, cancelAtPeriodEnd: boolean) => {
        if (cancelAtPeriodEnd) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-amber-500/20 text-amber-400">
                    <AlertCircle size={12} />
                    Canceling
                </span>
            );
        }

        switch (status) {
            case 'active':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">
                        <CheckCircle size={12} />
                        Active
                    </span>
                );
            case 'trialing':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                        <Zap size={12} />
                        Trial
                    </span>
                );
            case 'past_due':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400">
                        <AlertCircle size={12} />
                        Past Due
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

    // Derive active products from bootstrap capabilities
    const activeProducts = [];
    if (bootstrap?.capabilities.driver_hud) activeProducts.push('blackbox');
    if (bootstrap?.capabilities.incident_review) activeProducts.push('controlbox');
    if (bootstrap?.capabilities.director_controls) activeProducts.push('racebox_plus');

    if (loading || bootstrapLoading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-slate-400">Loading subscription data...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Subscription Management</h1>
                        <p className="text-slate-400 mt-1">
                            Manage your Ok, Box Box subscriptions and billing
                        </p>
                    </div>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                    >
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
                        {error}
                    </div>
                )}

                {/* Account Info */}
                <div className="bg-slate-800 rounded-lg p-6 mb-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Account</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-slate-400">Email</p>
                            <p className="text-white">{user?.email || bootstrap?.user.email}</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-400">Display Name</p>
                            <p className="text-white">{user?.displayName || bootstrap?.user.displayName}</p>
                        </div>
                    </div>
                </div>

                {/* Active Products */}
                <div className="bg-slate-800 rounded-lg p-6 mb-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Active Products</h2>

                    {activeProducts.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-slate-400 mb-4">No active subscriptions</p>
                            <button
                                onClick={() => navigate('/pricing')}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                            >
                                View Pricing
                            </button>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {activeProducts.map(productId => {
                                const product = PRODUCT_INFO[productId];
                                if (!product) return null;
                                const Icon = product.icon;

                                return (
                                    <div
                                        key={productId}
                                        className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-lg bg-slate-600 ${product.color}`}>
                                                <Icon size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-white">{product.name}</h3>
                                                <p className="text-sm text-slate-400">{product.description}</p>
                                            </div>
                                        </div>
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">
                                            <CheckCircle size={12} />
                                            Active
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Subscriptions from Stripe */}
                {subscriptions.length > 0 && (
                    <div className="bg-slate-800 rounded-lg p-6 mb-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Billing Details</h2>

                        <div className="space-y-4">
                            {subscriptions.map(sub => {
                                const product = PRODUCT_INFO[sub.product];
                                const Icon = product?.icon || CreditCard;

                                return (
                                    <div
                                        key={sub.id}
                                        className="p-4 bg-slate-700/50 rounded-lg"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <Icon size={20} className={product?.color || 'text-slate-400'} />
                                                <span className="font-medium text-white">
                                                    {product?.name || sub.product}
                                                </span>
                                            </div>
                                            {getStatusBadge(sub.status, sub.cancel_at_period_end)}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className="flex items-center gap-2 text-slate-400">
                                                <Calendar size={14} />
                                                <span>Started: {formatDate(sub.created_at)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-400">
                                                <Calendar size={14} />
                                                <span>
                                                    {sub.cancel_at_period_end ? 'Ends' : 'Renews'}:{' '}
                                                    {formatDate(sub.current_period_end)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <button
                            onClick={handleManageSubscription}
                            className="mt-4 flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                        >
                            <ExternalLink size={16} />
                            Manage Billing
                        </button>
                    </div>
                )}

                {/* Manual Entitlements */}
                {entitlements.filter(e => e.source === 'manual').length > 0 && (
                    <div className="bg-slate-800 rounded-lg p-6 mb-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Granted Access</h2>
                        <p className="text-sm text-slate-400 mb-4">
                            These entitlements were granted manually (e.g., alpha access, promotions).
                        </p>

                        <div className="space-y-2">
                            {entitlements
                                .filter(e => e.source === 'manual')
                                .map(ent => (
                                    <div
                                        key={ent.id}
                                        className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                                    >
                                        <span className="text-white capitalize">{ent.product}</span>
                                        <span className="text-sm text-slate-400">
                                            {ent.expires_at
                                                ? `Expires: ${formatDate(ent.expires_at)}`
                                                : 'No expiration'}
                                        </span>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-4">
                    <button
                        onClick={() => navigate('/pricing')}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                    >
                        View All Plans
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    >
                        Back to Dashboard
                    </button>
                </div>

                {/* Support */}
                <div className="mt-8 p-4 bg-slate-800/50 rounded-lg text-center">
                    <p className="text-slate-400 text-sm">
                        Need help with billing?{' '}
                        <a
                            href="mailto:support@okboxbox.com"
                            className="text-blue-400 hover:text-blue-300"
                        >
                            Contact support
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default SubscriptionManagement;
