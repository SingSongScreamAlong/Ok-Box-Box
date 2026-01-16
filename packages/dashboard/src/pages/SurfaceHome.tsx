/**
 * Surface Home Page (Launchpad)
 * 
 * Landing page showing available surfaces.
 * Professional racing software suite.
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
    color: string;
}

const SURFACE_CARDS: SurfaceCard[] = [
    {
        surface: 'driverbox',
        product: 'blackbox',
        title: 'MY TEAM',
        description: 'Development plans, goals, practice & strategy',
        color: '#ffd700'
    },
    {
        surface: 'driver',
        product: 'blackbox',
        title: 'DRIVER HUD',
        description: 'Real-time telemetry overlay with AI race engineer',
        color: '#00d4ff'
    },
    {
        surface: 'team',
        product: 'blackbox',
        title: 'PIT WALL',
        description: 'Strategy management, fuel calculations, live timing',
        color: '#00ff88'
    },
    {
        surface: 'broadcast',
        product: 'racebox',
        title: 'BROADCAST',
        description: 'Professional timing graphics and spectator views',
        color: '#9b59b6'
    },
    {
        surface: 'racecontrol',
        product: 'controlbox',
        title: 'RACE CONTROL',
        description: 'Incident review, stewarding, and penalty management',
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
            'driverbox': '/teams/demo',
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
                <div className="logo-mark">OK, BOX BOX</div>
                <p className="tagline">PROFESSIONAL RACING SOFTWARE</p>
            </header>

            {error && (
                <div className="launch-error">
                    <span>{error}</span>
                    <button onClick={() => setError(null)}>DISMISS</button>
                </div>
            )}

            <div className="surface-cards">
                {SURFACE_CARDS.map(card => {
                    const isLaunching = launching === card.surface;

                    return (
                        <div
                            key={card.surface}
                            className={`surface-card ${isLaunching ? 'launching' : ''}`}
                            style={{ '--accent-color': card.color } as React.CSSProperties}
                            onClick={() => !isLaunching && handleLaunch(card.surface)}
                        >
                            <div className="card-accent" />
                            <h2>{card.title}</h2>
                            <p>{card.description}</p>
                            <div className="card-footer">
                                <span className="status-indicator" />
                                <span className="status-text">{isLaunching ? 'LAUNCHING' : 'READY'}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <footer className="surface-home-footer">
                <a href="/download-relay" className="download-link">DOWNLOAD RELAY</a>
            </footer>
        </div>
    );
}

export default SurfaceHome;
