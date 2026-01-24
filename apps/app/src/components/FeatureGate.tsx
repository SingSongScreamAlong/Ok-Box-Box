/**
 * Feature Gate Component
 * 
 * Wraps content that requires a specific entitlement.
 * Shows upgrade prompt if user doesn't have access.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useEntitlements, EntitlementTier, UserEntitlements } from '../hooks/useEntitlements';

interface FeatureGateProps {
  feature: keyof UserEntitlements['features'];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgrade?: boolean;
}

const TIER_NAMES: Record<EntitlementTier, string> = {
  free: 'Free',
  driver: 'Driver',
  team: 'Team',
  league: 'League',
  enterprise: 'Enterprise',
};

const FEATURE_TIERS: Record<keyof UserEntitlements['features'], EntitlementTier> = {
  account: 'free',
  basicProfile: 'free',
  driverTelemetry: 'driver',
  driverHistory: 'driver',
  driverHUD: 'driver',
  teamPitwall: 'team',
  teamRoster: 'team',
  teamStrategy: 'team',
  teamReports: 'team',
  shareLinks: 'team',
  leagueManagement: 'league',
  leagueEvents: 'league',
  leagueStewards: 'league',
};

export function FeatureGate({ 
  feature, 
  children, 
  fallback,
  showUpgrade = true 
}: FeatureGateProps) {
  const { hasFeature, loading, tier } = useEntitlements();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-white/50 text-sm">Loading...</div>
      </div>
    );
  }

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgrade) {
    return null;
  }

  const requiredTier = FEATURE_TIERS[feature];

  return (
    <div className="bg-[#111] border border-white/10 p-8 text-center">
      <Lock size={32} className="mx-auto mb-4 text-white/20" />
      <h3 className="text-lg font-semibold text-white mb-2">
        {TIER_NAMES[requiredTier]} Feature
      </h3>
      <p className="text-sm text-white/50 mb-4">
        This feature requires a {TIER_NAMES[requiredTier]} subscription.
      </p>
      <p className="text-xs text-white/30 mb-6">
        You're currently on the {TIER_NAMES[tier]} tier.
      </p>
      <Link 
        to="/settings" 
        className="inline-block bg-[#f97316] text-black px-6 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-[#f97316]/90 transition-colors"
      >
        Upgrade
      </Link>
    </div>
  );
}

/**
 * Route guard for feature-gated pages
 */
export function RequireFeature({ 
  feature, 
  children 
}: { 
  feature: keyof UserEntitlements['features']; 
  children: React.ReactNode;
}) {
  const { hasFeature, loading } = useEntitlements();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-white/50">Loading...</div>
      </div>
    );
  }

  if (!hasFeature(feature)) {
    const requiredTier = FEATURE_TIERS[feature];
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-6">
        <div className="max-w-md text-center">
          <Lock size={48} className="mx-auto mb-6 text-white/20" />
          <h1 
            className="text-xl font-bold text-white mb-4"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Upgrade Required
          </h1>
          <p className="text-sm text-white/50 mb-6">
            This page requires a {TIER_NAMES[requiredTier]} subscription to access.
          </p>
          <div className="flex gap-4 justify-center">
            <Link 
              to="/dashboard" 
              className="px-6 py-2 border border-white/20 text-white/70 text-xs font-semibold uppercase tracking-wider hover:bg-white/5 transition-colors"
            >
              Go Back
            </Link>
            <Link 
              to="/settings" 
              className="px-6 py-2 bg-[#f97316] text-black text-xs font-semibold uppercase tracking-wider hover:bg-[#f97316]/90 transition-colors"
            >
              View Plans
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
