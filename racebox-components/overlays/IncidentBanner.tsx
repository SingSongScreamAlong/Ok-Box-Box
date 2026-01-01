// =====================================================================
// Incident Banner Overlay (Week 8)
// Simple incident notification for OBS.
// =====================================================================

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import './IncidentBanner.css';

// =====================================================================
// Component
// =====================================================================

export function IncidentBannerOverlay() {
    const [searchParams] = useSearchParams();
    const theme = (searchParams.get('theme') as 'dark' | 'light') || 'dark';
    const demo = searchParams.get('demo') === '1';

    const [message, setMessage] = useState<string>('');
    const [visible, setVisible] = useState(false);

    // Demo mode
    useEffect(() => {
        if (demo) {
            setMessage('INCIDENT UNDER INVESTIGATION');
            setVisible(true);
        }
    }, [demo]);

    // Listen for broadcast:state with activeCue
    useEffect(() => {
        if (demo) return;

        // Would subscribe to broadcast:state and check activeCue.type === 'incident-banner'
        const urlMessage = searchParams.get('message');
        if (urlMessage) {
            setMessage(urlMessage);
            setVisible(true);
        }
    }, [demo, searchParams]);

    if (!visible || !message) return null;

    return (
        <div className={`incident-banner incident-banner--${theme}`} data-overlay="incident-banner">
            <div className="incident-banner__icon">⚠️</div>
            <div className="incident-banner__text">{message}</div>
        </div>
    );
}
