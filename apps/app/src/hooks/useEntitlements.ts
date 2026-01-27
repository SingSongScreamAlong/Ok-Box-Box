/**
 * Entitlement Gating Hook
 * 
 * Gates FEATURES, not accounts.
 * - Free: account + basic profile
 * - Driver: telemetry, history, HUD
 * - Team: pitwall, roster, strategy, reports
 * - League: league management tools
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export type EntitlementTier = 'free' | 'driver' | 'team' | 'league' | 'enterprise';

export interface UserEntitlements {
  tier: EntitlementTier;
  features: {
    // Free (always true)
    account: boolean;
    basicProfile: boolean;
    
    // Driver tier
    driverTelemetry: boolean;
    driverHistory: boolean;
    driverHUD: boolean;
    
    // Team tier
    teamPitwall: boolean;
    teamRoster: boolean;
    teamStrategy: boolean;
    teamReports: boolean;
    teamIncidents: boolean;
    shareLinks: boolean;
    
    // League tier
    leagueManagement: boolean;
    leagueEvents: boolean;
    leagueStewards: boolean;
  };
  expiresAt: string | null;
  loading: boolean;
}

const FREE_ENTITLEMENTS: UserEntitlements = {
  tier: 'free',
  features: {
    account: true,
    basicProfile: true,
    driverTelemetry: false,
    driverHistory: false,
    driverHUD: false,
    teamPitwall: false,
    teamRoster: false,
    teamStrategy: false,
    teamReports: false,
    teamIncidents: false,
    shareLinks: false,
    leagueManagement: false,
    leagueEvents: false,
    leagueStewards: false,
  },
  expiresAt: null,
  loading: false,
};

const DRIVER_ENTITLEMENTS: UserEntitlements = {
  tier: 'driver',
  features: {
    ...FREE_ENTITLEMENTS.features,
    driverTelemetry: true,
    driverHistory: true,
    driverHUD: true,
  },
  expiresAt: null,
  loading: false,
};

const TEAM_ENTITLEMENTS: UserEntitlements = {
  tier: 'team',
  features: {
    ...DRIVER_ENTITLEMENTS.features,
    teamPitwall: true,
    teamRoster: true,
    teamStrategy: true,
    teamReports: true,
    teamIncidents: true,
    shareLinks: true,
  },
  expiresAt: null,
  loading: false,
};

const LEAGUE_ENTITLEMENTS: UserEntitlements = {
  tier: 'league',
  features: {
    ...TEAM_ENTITLEMENTS.features,
    leagueManagement: true,
    leagueEvents: true,
    leagueStewards: true,
  },
  expiresAt: null,
  loading: false,
};

const TIER_MAP: Record<EntitlementTier, UserEntitlements> = {
  free: FREE_ENTITLEMENTS,
  driver: DRIVER_ENTITLEMENTS,
  team: TEAM_ENTITLEMENTS,
  league: LEAGUE_ENTITLEMENTS,
  enterprise: LEAGUE_ENTITLEMENTS, // Same as league for now
};

export function useEntitlements(): UserEntitlements & {
  hasFeature: (feature: keyof UserEntitlements['features']) => boolean;
  requireFeature: (feature: keyof UserEntitlements['features']) => boolean;
  refresh: () => Promise<void>;
} {
  const { user } = useAuth();
  const [entitlements, setEntitlements] = useState<UserEntitlements>({
    ...FREE_ENTITLEMENTS,
    loading: true,
  });

  const fetchEntitlements = useCallback(async () => {
    if (!user) {
      setEntitlements({ ...FREE_ENTITLEMENTS, loading: false });
      return;
    }

    try {
      // TODO: Fetch from subscriptions table
      // For now, check user metadata or default to free
      const tier = (user.user_metadata?.subscription_tier as EntitlementTier) || 'free';
      
      // In development/winter testing, grant team tier to all users
      const isDev = import.meta.env.DEV;
      const effectiveTier = isDev ? 'team' : tier;
      
      setEntitlements({
        ...TIER_MAP[effectiveTier],
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching entitlements:', error);
      setEntitlements({ ...FREE_ENTITLEMENTS, loading: false });
    }
  }, [user]);

  useEffect(() => {
    fetchEntitlements();
  }, [fetchEntitlements]);

  const hasFeature = useCallback(
    (feature: keyof UserEntitlements['features']): boolean => {
      return entitlements.features[feature] ?? false;
    },
    [entitlements]
  );

  const requireFeature = useCallback(
    (feature: keyof UserEntitlements['features']): boolean => {
      if (entitlements.loading) return false;
      return hasFeature(feature);
    },
    [entitlements.loading, hasFeature]
  );

  return {
    ...entitlements,
    hasFeature,
    requireFeature,
    refresh: fetchEntitlements,
  };
}

/**
 * Hook to check if user can access a specific feature
 */
export function useFeatureGate(feature: keyof UserEntitlements['features']): {
  allowed: boolean;
  loading: boolean;
  tier: EntitlementTier;
} {
  const { features, loading, tier } = useEntitlements();
  return {
    allowed: features[feature] ?? false,
    loading,
    tier,
  };
}
