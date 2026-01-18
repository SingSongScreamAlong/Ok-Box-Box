// =====================================================================
// iRacing Connect Banner
// One-click OAuth onboarding for iRacing account linking
// =====================================================================

import React, { useState, useEffect } from 'react';
import './IRacingConnectBanner.css';

interface IRacingConnectBannerProps {
    /** Called when user successfully links their account */
    onLinked?: () => void;
    /** If true, shows compact version without description */
    compact?: boolean;
}

interface IRacingLinkStatus {
    linked: boolean;
    isValid?: boolean;
    iracingCustomerId?: string;
    iracingDisplayName?: string | null;
}

export const IRacingConnectBanner: React.FC<IRacingConnectBannerProps> = ({
    onLinked,
    compact = false
}) => {
    const [status, setStatus] = useState<IRacingLinkStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    // Check link status on mount
    useEffect(() => {
        checkLinkStatus();

        // Also check for successful return from OAuth
        const params = new URLSearchParams(window.location.search);
        if (params.get('iracing_linked') === 'true') {
            // Refresh status and notify parent
            checkLinkStatus().then(() => {
                onLinked?.();
            });
            // Clean up URL
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    const checkLinkStatus = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                setLoading(false);
                return;
            }

            const response = await fetch('/api/oauth/iracing/status', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setStatus(data);
            }
        } catch (error) {
            console.error('Failed to check iRacing link status:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = () => {
        setConnecting(true);
        // Redirect to OAuth start endpoint
        // The server will redirect to iRacing, then back to our callback
        window.location.href = '/api/oauth/iracing/start';
    };

    const handleDismiss = () => {
        setDismissed(true);
        // Store dismissal in localStorage so it persists
        localStorage.setItem('iracing_banner_dismissed', 'true');
    };

    // Don't show if loading, dismissed, or already linked
    if (loading) return null;
    if (dismissed && !status?.linked) return null;

    // Check localStorage for previous dismissal
    if (!status?.linked && localStorage.getItem('iracing_banner_dismissed') === 'true') {
        return null;
    }

    // If already linked, show success state
    if (status?.linked && status.isValid) {
        return (
            <div className="iracing-connect-banner linked">
                <div className="iracing-connect-content">
                    <div className="iracing-connect-icon">✓</div>
                    <div className="iracing-connect-text">
                        <h3>iRacing Connected</h3>
                        {!compact && (
                            <p>
                                Linked to {status.iracingDisplayName || `Customer #${status.iracingCustomerId}`}
                                • Stats sync automatically
                            </p>
                        )}
                    </div>
                </div>
                <div className="iracing-linked-status">
                    <span>✓ Syncing</span>
                </div>
            </div>
        );
    }

    // Not linked - show connect prompt
    return (
        <div className="iracing-connect-banner">
            <div className="iracing-connect-content">
                <div className="iracing-connect-icon">🏎️</div>
                <div className="iracing-connect-text">
                    <h3>Connect Your iRacing Account</h3>
                    {!compact && (
                        <p>
                            Link your iRacing account to automatically sync your iRating,
                            license level, and race history.
                        </p>
                    )}
                </div>
            </div>
            <button
                className="iracing-connect-button"
                onClick={handleConnect}
                disabled={connecting}
            >
                {connecting ? (
                    <>
                        <span className="spinner" />
                        Connecting...
                    </>
                ) : (
                    <>
                        Connect iRacing
                        <span>→</span>
                    </>
                )}
            </button>
            <button
                className="iracing-connect-dismiss"
                onClick={handleDismiss}
                title="Dismiss"
            >
                ✕
            </button>
        </div>
    );
};

export default IRacingConnectBanner;
