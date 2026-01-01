'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { blackboxClient, TelemetryData, RadioCall } from '@/lib/websocket';

const CLOUD_URL = process.env.NEXT_PUBLIC_CLOUD_URL || 'http://localhost:3000';

function SessionContent() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('id') || '';

    const [connected, setConnected] = useState(false);
    const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
    const [radioCalls, setRadioCalls] = useState<RadioCall[]>([]);
    const radioFeedRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!sessionId) return;

        // Connect to cloud
        blackboxClient.onConnection(setConnected);
        blackboxClient.onTelemetry((data) => {
            setTelemetry(data);
        });
        blackboxClient.onRadioCall((call) => {
            setRadioCalls(prev => [...prev.slice(-49), call]);
        });

        blackboxClient.connect(CLOUD_URL, sessionId);

        return () => {
            blackboxClient.disconnect();
        };
    }, [sessionId]);

    // Auto-scroll radio feed
    useEffect(() => {
        if (radioFeedRef.current) {
            radioFeedRef.current.scrollTop = radioFeedRef.current.scrollHeight;
        }
    }, [radioCalls]);

    if (!sessionId) {
        return (
            <div className="container" style={{ paddingTop: '3rem', textAlign: 'center' }}>
                <p>No session ID provided.</p>
                <Link href="/" className="btn" style={{ marginTop: '1rem', display: 'inline-block' }}>
                    ← Back to Sessions
                </Link>
            </div>
        );
    }

    const formatTime = (ts: number) => {
        const d = new Date(ts);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
        <div>
            <header className="header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link href="/" style={{ color: 'var(--text-secondary)', fontSize: '1.25rem' }}>←</Link>
                    <div className="logo">⚫ BlackBox</div>
                </div>
                <div className="status">
                    <span className={`status-dot ${connected ? 'live' : 'offline'}`}></span>
                    <span>{connected ? 'LIVE' : 'Connecting...'}</span>
                </div>
            </header>

            <div className="session-layout">
                {/* Main Content */}
                <div>
                    {/* Telemetry Cards */}
                    <div className="grid grid-4" style={{ marginBottom: '1rem' }}>
                        <div className="card">
                            <div className="card-title">Speed</div>
                            <div className="telemetry-value">
                                {telemetry?.speed ? Math.round(telemetry.speed) : '--'}
                                <span className="telemetry-unit">km/h</span>
                            </div>
                        </div>
                        <div className="card">
                            <div className="card-title">Gear</div>
                            <div className="telemetry-value">
                                {telemetry?.gear !== undefined ? (telemetry.gear === 0 ? 'N' : telemetry.gear === -1 ? 'R' : telemetry.gear) : '--'}
                            </div>
                        </div>
                        <div className="card">
                            <div className="card-title">RPM</div>
                            <div className="telemetry-value">
                                {telemetry?.rpm ? Math.round(telemetry.rpm).toLocaleString() : '--'}
                            </div>
                        </div>
                        <div className="card">
                            <div className="card-title">Lap</div>
                            <div className="telemetry-value">
                                {telemetry?.lap || '--'}
                            </div>
                        </div>
                    </div>

                    {/* Track Map */}
                    <div className="card">
                        <div className="card-title">Track Position</div>
                        <div className="track-map">
                            <svg viewBox="0 0 400 200">
                                {/* Simple oval track shape */}
                                <ellipse cx="200" cy="100" rx="180" ry="80"
                                    fill="none"
                                    stroke="rgba(255,255,255,0.2)"
                                    strokeWidth="20"
                                    strokeLinecap="round"
                                />
                                {/* Car position */}
                                {telemetry && (
                                    <circle
                                        className="car-dot"
                                        cx={200 + 180 * Math.cos(telemetry.position.s * 2 * Math.PI - Math.PI / 2)}
                                        cy={100 + 80 * Math.sin(telemetry.position.s * 2 * Math.PI - Math.PI / 2)}
                                        r="8"
                                    />
                                )}
                            </svg>
                            <div style={{
                                position: 'absolute',
                                bottom: '0.5rem',
                                right: '0.5rem',
                                fontSize: '0.75rem',
                                color: 'var(--text-secondary)'
                            }}>
                                {telemetry ? `${Math.round(telemetry.position.s * 100)}%` : '--'}
                            </div>
                        </div>
                    </div>

                    {/* Inputs */}
                    <div className="grid grid-2">
                        <div className="card">
                            <div className="card-title">Throttle</div>
                            <div style={{
                                height: '8px',
                                background: 'var(--bg-secondary)',
                                borderRadius: '4px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    height: '100%',
                                    width: `${(telemetry?.throttle || 0) * 100}%`,
                                    background: 'var(--accent-green)',
                                    transition: 'width 0.1s'
                                }} />
                            </div>
                        </div>
                        <div className="card">
                            <div className="card-title">Brake</div>
                            <div style={{
                                height: '8px',
                                background: 'var(--bg-secondary)',
                                borderRadius: '4px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    height: '100%',
                                    width: `${(telemetry?.brake || 0) * 100}%`,
                                    background: 'var(--accent-red)',
                                    transition: 'width 0.1s'
                                }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Radio Feed Sidebar */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
                    <div className="card-title">📻 Radio</div>
                    <div ref={radioFeedRef} className="radio-feed" style={{ flex: 1, overflowY: 'auto' }}>
                        {radioCalls.length === 0 ? (
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>
                                Waiting for radio calls...
                            </div>
                        ) : (
                            radioCalls.map(call => (
                                <div key={call.id} className="radio-message">
                                    <div className="radio-role">{call.role}</div>
                                    <div className="radio-text">{call.text}</div>
                                    <div className="radio-time">{formatTime(call.timestamp)}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function SessionPage() {
    return (
        <Suspense fallback={<div className="container" style={{ paddingTop: '3rem' }}>Loading...</div>}>
            <SessionContent />
        </Suspense>
    );
}
