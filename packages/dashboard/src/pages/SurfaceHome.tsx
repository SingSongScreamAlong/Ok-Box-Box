/**
 * Surface Home Page (Launchpad)
 * 
 * Landing page showing available surfaces.
 * Professional racing software suite.
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Radio, Target, BarChart3, Users, Calendar, FileText, TrendingUp, Zap } from 'lucide-react';
import type { BootstrapSurface } from '../types/bootstrap';
import { useBootstrap } from '../hooks/useBootstrap';
import { useAuthStore } from '../stores/auth.store';
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
    const { bootstrap } = useBootstrap();
    const { user } = useAuthStore();

    const handleLaunch = async (surface: BootstrapSurface) => {
        setLaunching(surface);
        setError(null);

        const webRoutes: Record<string, string> = {
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

    // Pit wall quick links for driver profile
    const pitwallLinks = [
        { icon: Target, label: 'Strategy', desc: 'Race planning & fuel', path: '/teams/demo/strategy', color: '#f97316' },
        { icon: BarChart3, label: 'Practice', desc: 'Session analysis', path: '/teams/demo/practice', color: '#3b82f6' },
        { icon: TrendingUp, label: 'Development', desc: 'AI coaching & goals', path: '/my-idp', color: '#22c55e' },
    ];

    return (
        <div className="surface-home">
            <header className="surface-home-header">
                <div className="logo-mark">OK, BOX BOX</div>
                <p className="tagline">RACING OPERATIONS SYSTEM</p>
            </header>

            {error && (
                <div className="launch-error">
                    <span>{error}</span>
                    <button onClick={() => setError(null)}>DISMISS</button>
                </div>
            )}

            {/* Welcome Section */}
            <div style={{ maxWidth: '900px', margin: '0 auto 2rem', padding: '0 1rem' }}>
                <div style={{ 
                    background: 'linear-gradient(135deg, rgba(249,115,22,0.1) 0%, rgba(17,17,17,1) 50%, rgba(59,130,246,0.1) 100%)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '2rem'
                }}>
                    <h2 style={{ 
                        fontFamily: 'Orbitron, sans-serif', 
                        fontSize: '1.5rem', 
                        color: 'white',
                        marginBottom: '0.5rem'
                    }}>
                        Welcome, {user?.displayName || 'Driver'}
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                        Your racing operations center is ready.
                    </p>

                    {/* Primary Actions */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        {/* Driver Profile - leads to pit wall */}
                        <Link 
                            to="/my-idp"
                            style={{
                                background: '#111',
                                border: '2px solid #f97316',
                                padding: '1.5rem',
                                textDecoration: 'none',
                                display: 'block'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                <div style={{ width: '48px', height: '48px', background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Zap size={24} color="black" />
                                </div>
                                <div>
                                    <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1rem', color: 'white', textTransform: 'uppercase' }}>
                                        Driver Profile
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                                        Your identity, stats & development
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {pitwallLinks.map(link => (
                                    <div key={link.path} style={{ 
                                        flex: 1, 
                                        background: 'rgba(255,255,255,0.05)', 
                                        padding: '0.5rem',
                                        textAlign: 'center'
                                    }}>
                                        <link.icon size={14} color={link.color} style={{ marginBottom: '0.25rem' }} />
                                        <div style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>
                                            {link.label}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Link>

                        {/* Team - opens team directly */}
                        <Link 
                            to="/teams/demo"
                            style={{
                                background: '#111',
                                border: '2px solid #22c55e',
                                padding: '1.5rem',
                                textDecoration: 'none',
                                display: 'block'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                <div style={{ width: '48px', height: '48px', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Radio size={24} color="black" />
                                </div>
                                <div>
                                    <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1rem', color: 'white', textTransform: 'uppercase' }}>
                                        My Team
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                                        Pit wall & team operations
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', padding: '0.5rem', textAlign: 'center' }}>
                                    <Users size={14} color="#22c55e" style={{ marginBottom: '0.25rem' }} />
                                    <div style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>Roster</div>
                                </div>
                                <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', padding: '0.5rem', textAlign: 'center' }}>
                                    <Calendar size={14} color="#22c55e" style={{ marginBottom: '0.25rem' }} />
                                    <div style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>Planning</div>
                                </div>
                                <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', padding: '0.5rem', textAlign: 'center' }}>
                                    <FileText size={14} color="#22c55e" style={{ marginBottom: '0.25rem' }} />
                                    <div style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>Reports</div>
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Other Surfaces */}
            <div className="surface-cards">
                {SURFACE_CARDS.filter((card) => {
                    const available = bootstrap?.ui?.availableSurfaces;
                    if (!available || available.length === 0) {
                        return true;
                    }
                    return available.includes(card.surface);
                }).map(card => {
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
