/**
 * Entitlement Gating Hook
 *
 * Fetches real entitlements from the server bootstrap endpoint.
 * Single source of truth: /api/auth/me/bootstrap → capabilities.
 *
 * Tier hierarchy (additive):
 *   free → driver → team → league
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const API_BASE = import.meta.env.VITE_API_URL || 'https://octopus-app-qsi3i.ondigitalocean.app';

export type EntitlementTier = 'free' | 'driver' | 'team' | 'league' | 'enterprise';

export interface UserEntitlements {
  tier: EntitlementTier;
  features: {
    // Free (always true for authenticated users)
    account: boolean;
    basicProfile: boolean;

    // Driver tier ($14/mo — BlackBox)
    driverTelemetry: boolean;
    driverHistory: boolean;
    driverHUD: boolean;

    // Team tier ($26/mo — TeamBox, includes driver)
    teamPitwall: boolean;
    teamRoster: boolean;
    teamStrategy: boolean;
    teamReports: boolean;
    teamIncidents: boolean;
    shareLinks: boolean;

    // League tier ($48/mo — LeagueBox, includes team)
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

/**
 * Derive frontend feature flags from server capabilities.
 * Maps the server's capability names to the frontend's feature names.
 */
function capabilitiesToFeatures(caps: Record<string, boolean>): UserEntitlements['features'] {
  return {
    account: true,
    basicProfile: true,

    // Driver: driver_hud gates history + HUD; personal_telemetry gates raw data
    driverTelemetry: caps.personal_telemetry ?? false,
    driverHistory: caps.driver_hud ?? false,
    driverHUD: caps.driver_hud ?? false,

    // Team: pitwall_view is the gate for all team surfaces
    teamPitwall: caps.pitwall_view ?? false,
    teamRoster: caps.pitwall_view ?? false,
    teamStrategy: caps.strategy_timeline ?? false,
    teamReports: caps.pitwall_view ?? false,
    teamIncidents: caps.pitwall_view ?? false,
    shareLinks: caps.livespotter_access ?? false,

    // League: incident_review is the base league capability
    leagueManagement: caps.incident_review ?? false,
    leagueEvents: caps.incident_review ?? false,
    leagueStewards: caps.incident_review ?? false,
  };
}

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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setEntitlements({ ...FREE_ENTITLEMENTS, loading: false });
        return;
      }

      const response = await fetch(`${API_BASE}/api/auth/me/bootstrap`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!response.ok) {
        setEntitlements({ ...FREE_ENTITLEMENTS, loading: false });
        return;
      }

      const { data } = await response.json();
      const { licenses, capabilities } = data as {
        licenses: { driver: boolean; team: boolean; league: boolean };
        capabilities: Record<string, boolean>;
      };

      // Derive tier — highest wins
      let tier: EntitlementTier = 'free';
      if (licenses.league) tier = 'league';
      else if (licenses.team) tier = 'team';
      else if (licenses.driver) tier = 'driver';

      setEntitlements({
        tier,
        features: capabilitiesToFeatures(capabilities),
        expiresAt: null,
        loading: false,
      });
    } catch (err) {
      console.error('Error fetching entitlements:', err);
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
 * Hook to check if user can access a specific feature.
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
