/**
 * useBootstrap Hook
 * 
 * Fetches and caches the bootstrap response.
 * Single source of truth for licenses, roles, and capabilities.
 */

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import type { BootstrapResponse, BootstrapCapabilities, CapabilityKey } from '../types/bootstrap';

const API_URL = import.meta.env.VITE_API_URL || '';

// ============================================================================
// CONTEXT
// ============================================================================

interface BootstrapContextValue {
    bootstrap: BootstrapResponse | null;
    loading: boolean;
    error: string | null;
    hasCapability: (capability: CapabilityKey) => boolean;
    hasRole: (role: string) => boolean;
    hasLicense: (product: 'blackbox' | 'controlbox') => boolean;
    refresh: () => Promise<void>;
}

const BootstrapContext = createContext<BootstrapContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface BootstrapProviderProps {
    children: ReactNode;
}

export function BootstrapProvider({ children }: BootstrapProviderProps) {
    const [bootstrap, setBootstrap] = useState<BootstrapResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchBootstrap = useCallback(async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`${API_URL}/api/auth/me/bootstrap`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // Token expired, clear and let auth flow handle it
                    localStorage.removeItem('accessToken');
                    setBootstrap(null);
                    return;
                }
                throw new Error('Failed to fetch bootstrap');
            }

            const result = await response.json();
            if (result.success && result.data) {
                setBootstrap(result.data);
            } else {
                throw new Error(result.error?.message || 'Invalid bootstrap response');
            }
        } catch (err) {
            console.error('Bootstrap fetch error:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBootstrap();
    }, [fetchBootstrap]);

    const hasCapability = useCallback((capability: CapabilityKey): boolean => {
        return bootstrap?.capabilities?.[capability] ?? false;
    }, [bootstrap]);

    const hasRole = useCallback((role: string): boolean => {
        return bootstrap?.roles?.includes(role as any) ?? false;
    }, [bootstrap]);

    const hasLicense = useCallback((product: 'blackbox' | 'controlbox'): boolean => {
        return bootstrap?.licenses?.[product] ?? false;
    }, [bootstrap]);

    const value: BootstrapContextValue = {
        bootstrap,
        loading,
        error,
        hasCapability,
        hasRole,
        hasLicense,
        refresh: fetchBootstrap
    };

    return (
        <BootstrapContext.Provider value={value}>
            {children}
        </BootstrapContext.Provider>
    );
}

// ============================================================================
// HOOK
// ============================================================================

export function useBootstrap(): BootstrapContextValue {
    const context = useContext(BootstrapContext);
    if (!context) {
        throw new Error('useBootstrap must be used within a BootstrapProvider');
    }
    return context;
}

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

export function useCapability(capability: CapabilityKey): boolean {
    const { hasCapability, loading } = useBootstrap();
    if (loading) return false;
    return hasCapability(capability);
}

export function useCapabilities(): BootstrapCapabilities | null {
    const { bootstrap } = useBootstrap();
    return bootstrap?.capabilities ?? null;
}
