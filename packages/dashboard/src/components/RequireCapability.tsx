/**
 * RequireCapability Component
 * 
 * Route/component guard that checks capabilities from bootstrap.
 * Shows children only if user has the required capability.
 */

import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useBootstrap } from '../hooks/useBootstrap';
import type { CapabilityKey } from '../types/bootstrap';

// ============================================================================
// REQUIRE CAPABILITY
// ============================================================================

interface RequireCapabilityProps {
    /** The capability required to view this content */
    capability: CapabilityKey;
    /** Content to show if user has capability */
    children: ReactNode;
    /** Optional fallback if capability is missing (default: redirect to /) */
    fallback?: ReactNode;
    /** If true, show nothing instead of fallback */
    silent?: boolean;
}

export function RequireCapability({
    capability,
    children,
    fallback,
    silent = false
}: RequireCapabilityProps) {
    const { hasCapability, loading, bootstrap } = useBootstrap();

    // Still loading - show nothing or loading state
    if (loading) {
        return (
            <div className="capability-loading">
                <span>Loading...</span>
            </div>
        );
    }

    // Not authenticated at all
    if (!bootstrap) {
        return <Navigate to="/login" replace />;
    }

    // Check capability
    if (!hasCapability(capability)) {
        if (silent) {
            return null;
        }
        if (fallback) {
            return <>{fallback}</>;
        }
        // Default: redirect to home
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}

// ============================================================================
// REQUIRE ANY CAPABILITY
// ============================================================================

interface RequireAnyCapabilityProps {
    /** List of capabilities, user must have at least one */
    capabilities: CapabilityKey[];
    children: ReactNode;
    fallback?: ReactNode;
    silent?: boolean;
}

export function RequireAnyCapability({
    capabilities,
    children,
    fallback,
    silent = false
}: RequireAnyCapabilityProps) {
    const { hasCapability, loading, bootstrap } = useBootstrap();

    if (loading) {
        return <div className="capability-loading">Loading...</div>;
    }

    if (!bootstrap) {
        return <Navigate to="/login" replace />;
    }

    const hasAny = capabilities.some(cap => hasCapability(cap));

    if (!hasAny) {
        if (silent) return null;
        if (fallback) return <>{fallback}</>;
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}

// ============================================================================
// REQUIRE LICENSE
// ============================================================================

interface RequireLicenseProps {
    license: 'blackbox' | 'controlbox';
    children: ReactNode;
    fallback?: ReactNode;
}

export function RequireLicense({ license, children, fallback }: RequireLicenseProps) {
    const { hasLicense, loading, bootstrap } = useBootstrap();

    if (loading) {
        return <div className="capability-loading">Loading...</div>;
    }

    if (!bootstrap) {
        return <Navigate to="/login" replace />;
    }

    if (!hasLicense(license)) {
        if (fallback) return <>{fallback}</>;
        return (
            <div className="license-required">
                <h2>License Required</h2>
                <p>You need a {license === 'blackbox' ? 'BlackBox' : 'ControlBox'} license to access this feature.</p>
            </div>
        );
    }

    return <>{children}</>;
}

// ============================================================================
// CONDITIONAL RENDER HELPER
// ============================================================================

interface IfCapabilityProps {
    capability: CapabilityKey;
    children: ReactNode;
    else?: ReactNode;
}

/**
 * Inline conditional render based on capability.
 * Use for showing/hiding UI elements, not for route guarding.
 */
export function IfCapability({ capability, children, else: elseContent }: IfCapabilityProps) {
    const { hasCapability, loading } = useBootstrap();

    if (loading) return null;

    if (hasCapability(capability)) {
        return <>{children}</>;
    }

    return elseContent ? <>{elseContent}</> : null;
}
