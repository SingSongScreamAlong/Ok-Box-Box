/**
 * Surface Home Page (Launchpad)
 * 
 * Landing page at /home showing available surfaces.
 * - Unlocked tiles generate launch tokens and open relay
 * - Locked tiles show "Subscribe" CTA
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBootstrap } from '../hooks/useBootstrap';
import type { BootstrapSurface } from '../types/bootstrap';
import { SURFACE_CAPABILITIES } from '../types/bootstrap';
import './SurfaceHome.css';

const API_URL = import.meta.env.VITE_API_URL || '';
const PRICING_URL = '/pricing';

interface SurfaceCard {
    surface: BootstrapSurface;
    product: 'blackbox' | 'controlbox';
    title: string;
    description: string;
    icon: string;
    color: string;
}

const SURFACE_CARDS: SurfaceCard[] = [
    {
        surface: 'driver',
        product: 'blackbox',
        title: 'Driver HUD',
        description: 'In-car overlay with AI coaching and spotter alerts',
        icon: '🏎️',
        color: '#00d4ff'
    },
    {
        surface: 'team',
        product: 'blackbox',
        title: 'Team Pit Wall',
        description: 'Strategy timeline, fuel management, and opponent intel',
        icon: '📊',
        color: '#00ff88'
    },
    {
        surface: 'racecontrol',
        product: 'controlbox',
        title: 'Race Control',
        description: 'Incident review, penalty assignment, and protests',
        icon: '⚖️',
        color: '#ff6b00'
    }
];

export function SurfaceHome() {
    const navigate = useNavigate();
    const { bootstrap, loading, hasCapability } = useBootstrap();
    const [launching, setLaunching] = useState<BootstrapSurface | null>(null);
    const [error, setError] = useState<string | null>(null);

    if (loading) {
        return (
            <div className="surface-home loading">
                <div className="loading-spinner" />
                <p>Loading...</p>
            </div>
        );
    }

    if (!bootstrap) {
        return (
            <div className="surface-home error">
                <h2>Not Authenticated</h2>
                <button onClick={() => navigate('/login')}>Log In</button>
            </div>
        );
    }

    const handleLaunch = async (surface: BootstrapSurface) => {
        setLaunching(surface);
        setError(null);

        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`${API_URL}/api/launch-token`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ surface })
            });

            const result = await response.json();

            if (!result.success) {
                setError(result.error?.message || 'Failed to generate launch token');
                return;
            }

            // Try protocol URL first, fallback to HTTPS
            const { protocolUrl, fallbackUrl } = result.data;

            // Attempt to open protocol URL
            // If it fails (protocol not registered), use fallback
            const protocolOpened = await tryOpenProtocol(protocolUrl);

            if (!protocolOpened) {
                // Fallback: navigate to web-based launch handler
                window.location.href = fallbackUrl;
            }
        } catch (err) {
            console.error('Launch error:', err);
            setError('Connection error. Please try again.');
        } finally {
            setLaunching(null);
        }
    };

    const handleSubscribe = () => {
        navigate(PRICING_URL);
    };

    return (
        <div className="surface-home">
            <header className="surface-home-header">
                <h1>Welcome, {bootstrap.user.displayName}</h1>
                <p>Choose your surface to get started</p>
            </header>

            {error && (
                <div className="launch-error">
                    <span>⚠️ {error}</span>
                    <button onClick={() => setError(null)}>Dismiss</button>
                </div>
            )}

            <div className="surface-cards">
                {SURFACE_CARDS.map(card => {
                    const requiredCap = SURFACE_CAPABILITIES[card.surface];
                    const isUnlocked = hasCapability(requiredCap);
                    const isLaunching = launching === card.surface;

                    return (
                        <div
                            key={card.surface}
                            className={`surface-card ${isUnlocked ? 'unlocked' : 'locked'} ${isLaunching ? 'launching' : ''}`}
                            style={{ '--accent-color': card.color } as React.CSSProperties}
                        >
                            <span className="surface-icon">{card.icon}</span>
                            <h2>{card.title}</h2>
                            <p>{card.description}</p>

                            {isUnlocked ? (
                                <button
                                    className="launch-btn"
                                    onClick={() => handleLaunch(card.surface)}
                                    disabled={isLaunching}
                                >
                                    {isLaunching ? 'Launching...' : 'Launch'}
                                </button>
                            ) : (
                                <div className="locked-overlay">
                                    <span className="locked-badge">🔒 Locked</span>
                                    <button
                                        className="subscribe-btn"
                                        onClick={handleSubscribe}
                                    >
                                        Subscribe to {card.product === 'blackbox' ? 'BlackBox' : 'ControlBox'}
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <footer className="surface-home-footer">
                <p className="user-info">
                    Logged in as {bootstrap.user.email}
                </p>
                <p className="protocol-hint">
                    💡 First time? <a href="/download-relay">Download the relay agent</a> to use Driver HUD
                </p>
            </footer>
        </div>
    );
}

/**
 * Attempt to open a custom protocol URL.
 * Returns true if opened successfully, false if protocol not registered.
 */
async function tryOpenProtocol(protocolUrl: string): Promise<boolean> {
    return new Promise((resolve) => {
        // Create a hidden iframe to test protocol
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);

        // Set a timeout - if we're still here after 500ms, protocol didn't work
        const timeout = setTimeout(() => {
            cleanup();
            resolve(false);
        }, 500);

        // Listen for blur event - indicates app was opened
        const onBlur = () => {
            clearTimeout(timeout);
            cleanup();
            resolve(true);
        };

        window.addEventListener('blur', onBlur);

        function cleanup() {
            window.removeEventListener('blur', onBlur);
            document.body.removeChild(iframe);
        }

        // Attempt to open protocol
        iframe.contentWindow?.location.assign(protocolUrl);
    });
}

export default SurfaceHome;
