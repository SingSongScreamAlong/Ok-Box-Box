// =====================================================================
// Auth Context - Hook wrapper for useAuthStore
// Provides claims and capability checking
// =====================================================================

import { useAuthStore } from '../stores/auth.store';

interface Claims {
    role?: string;
    token?: string;
    capabilities?: string[];
}

interface UseAuthResult {
    claims: Claims | null;
    hasCap: (capability: string) => boolean;
}

/**
 * Hook to access auth claims and check capabilities.
 * Wraps useAuthStore to provide a consistent interface for capability checking.
 */
export function useAuth(): UseAuthResult {
    const { user, accessToken } = useAuthStore();

    // Parse JWT claims if we have a token
    const claims: Claims | null = user ? {
        role: user.isSuperAdmin ? 'admin' : 'user',
        token: accessToken || undefined,
        capabilities: user.isSuperAdmin ? [
            'admin:ops',
            'admin:users',
            'admin:system',
            'controlbox:view',
            'controlbox:manage',
            'racebox:director:control'
        ] : []
    } : null;

    const hasCap = (capability: string): boolean => {
        if (!claims?.capabilities) return false;

        // Super admin has all capabilities
        if (claims.role === 'admin') return true;

        // Check for exact match or wildcard
        return claims.capabilities.some(cap => {
            if (cap === capability) return true;
            // Check for wildcard (e.g., 'admin:*' matches 'admin:ops')
            if (cap.endsWith('*')) {
                const prefix = cap.slice(0, -1);
                return capability.startsWith(prefix);
            }
            return false;
        });
    };

    return { claims, hasCap };
}
