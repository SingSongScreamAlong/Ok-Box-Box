/**
 * Surface Home Page (Launchpad)
 * 
 * Landing page at /home showing available surfaces.
 * - Unlocked tiles generate launch tokens and open relay
 * - Locked tiles show "Subscribe" CTA
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BootstrapSurface } from '../types/bootstrap';
import './SurfaceHome.css';

interface SurfaceCard {
    surface: BootstrapSurface;
    product: 'blackbox' | 'controlbox' | 'racebox';
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
        surface: 'broadcast',
        product: 'racebox',
        title: 'Broadcast',
        description: 'Live timing, leaderboards, and spectator views',
        icon: '📺',
        color: '#9b59b6'
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
    const [launching, setLaunching] = useState<BootstrapSurface | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleLaunch = async (surface: BootstrapSurface) => {
        setLaunching(surface);
        setError(null);

        // Direct navigation for all surfaces
        const webRoutes: Record<string, string> = {
            'driver': '/driver',
            'team': '/team/live',
            'racecontrol': '/controlbox',
            'broadcast': '/broadcast',
        };

        if (webRoutes[surface]) {
            navigate(webRoutes[surface]);
            setLaunching(null);
            return;
        }

        setLaunching(null);
    };

    return (
        <div className="surface-home">
            <header className="surface-home-header">
                <h1>Ok, Box Box</h1>
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
                    const isLaunching = launching === card.surface;

                    return (
                        <div
                            key={card.surface}
                            className={`surface-card unlocked ${isLaunching ? 'launching' : ''}`}
                            style={{ '--accent-color': card.color } as React.CSSProperties}
                        >
                            <span className="surface-icon">{card.icon}</span>
                            <h2>{card.title}</h2>
                            <p>{card.description}</p>

                            <button
                                className="launch-btn"
                                onClick={() => handleLaunch(card.surface)}
                                disabled={isLaunching}
                            >
                                {isLaunching ? 'Launching...' : 'Launch'}
                            </button>
                        </div>
                    );
                })}
            </div>

            <footer className="surface-home-footer">
                <p className="protocol-hint">
                    💡 First time? <a href="/download-relay">Download the relay agent</a> to use Driver HUD
                </p>
            </footer>
        </div>
    );
}

export default SurfaceHome;
