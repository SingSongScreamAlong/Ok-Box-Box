/**
 * License and entitlement types for Ok, Box Box
 * Backend is the source of truth for all license validation
 */

export type LicenseTier = 'FREE' | 'PRO' | 'TEAM' | 'ENTERPRISE';

export type ProductModule = 'RACEBOX' | 'BLACKBOX' | 'CONTROLBOX' | 'TEAMBOX';

export interface LicenseInfo {
  userId: string;
  email: string;
  tier: LicenseTier;
  modules: ProductModule[];
  expiresAt: number | null;  // null = never expires (free tier)
  isActive: boolean;
  
  // Limits
  maxConcurrentSessions: number;
  maxStoredSessions: number;
  
  // Metadata
  createdAt: number;
  updatedAt: number;
}

/**
 * License validation request from Launcher/Relay
 */
export interface LicenseValidationRequest {
  licenseKey?: string;      // Optional - free tier doesn't need one
  machineId: string;        // Hardware fingerprint
  version: string;          // Client version
}

/**
 * License validation response from Backend
 */
export interface LicenseValidationResponse {
  valid: boolean;
  license: LicenseInfo | null;
  error?: string;
  
  // Connection info for Relay (only present when valid=true)
  relayToken?: string;       // JWT for Relay -> Backend auth
  apiEndpoint?: string;
  wsEndpoint?: string;
}

/**
 * Free tier defaults
 */
export const FREE_TIER_LICENSE: Omit<LicenseInfo, 'userId' | 'email' | 'createdAt' | 'updatedAt'> = {
  tier: 'FREE',
  modules: ['RACEBOX'],
  expiresAt: null,
  isActive: true,
  maxConcurrentSessions: 1,
  maxStoredSessions: 10,
};
