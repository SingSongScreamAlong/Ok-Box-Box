/**
 * Relay Download Page
 * 
 * Landing page for users who need to download the relay agent.
 * Called when okboxbox:// protocol is not registered.
 */

import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import './DownloadRelay.css';

// Platform detection
function getPlatform(): 'mac' | 'win' | 'linux' | 'unknown' {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('mac')) return 'mac';
    if (ua.includes('win')) return 'win';
    if (ua.includes('linux')) return 'linux';
    return 'unknown';
}

// Download URLs (update these when hosting binaries)
const DOWNLOAD_URLS = {
    mac: '/downloads/relay/OkBoxBox-Relay-1.0.0.dmg',
    win: '/downloads/relay/OkBoxBox-Relay-Setup-1.0.0.exe',
    linux: '/downloads/relay/OkBoxBox-Relay-1.0.0.AppImage'
};

export function DownloadRelay() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [downloading, setDownloading] = useState(false);

    const platform = getPlatform();
    const surface = searchParams.get('surface') || 'driver';
    const returnUrl = searchParams.get('return') || '/home';

    const handleDownload = () => {
        setDownloading(true);
        // Fallback to source zip for all platforms since binaries aren't built yet
        const url = '/downloads/relay/ok-box-box-relay-source.zip';
        window.location.href = url;
        setTimeout(() => setDownloading(false), 2000);
    };

    const handleTryAgain = () => {
        // Attempt to launch with protocol again
        const token = searchParams.get('token');
        if (token) {
            window.location.href = `okboxbox://launch?token=${token}`;
        } else {
            navigate(returnUrl);
        }
    };

    const platformLabels = {
        mac: { name: 'macOS', icon: '🍎', file: '.dmg' },
        win: { name: 'Windows', icon: '🪟', file: '.exe' },
        linux: { name: 'Linux', icon: '🐧', file: '.AppImage' },
        unknown: { name: 'Your Platform', icon: '💻', file: '' }
    };

    const info = platformLabels[platform];

    return (
        <div className="download-relay-page">
            <div className="download-card">
                <div className="download-icon">📦</div>

                <h1>Relay Agent Required</h1>

                <p className="download-description">
                    To launch the <strong>{surface === 'driver' ? 'Driver HUD' : surface === 'team' ? 'Team Pit Wall' : 'Race Control'}</strong>,
                    you need to install the Ok, Box Box Relay Agent.
                </p>

                <div className="platform-info">
                    <span className="platform-icon">{info.icon}</span>
                    <span className="platform-name">{info.name}</span>
                </div>

                <div className="download-actions">
                    <button
                        className="download-btn primary"
                        onClick={handleDownload}
                        disabled={downloading}
                    >
                        {downloading ? 'Downloading...' : `Download Relay Agent (Source)`}
                    </button>
                    <p className="download-note" style={{ marginTop: '1rem', fontSize: '0.9rem', opacity: 0.8 }}>
                        Note: Requires Python 3.8+. Run <code>python main.py</code> to start.
                    </p>

                    {platform !== 'unknown' && (
                        <div className="other-platforms">
                            <span>Other platforms: </span>
                            {platform !== 'mac' && <a href={DOWNLOAD_URLS.mac}>macOS</a>}
                            {platform !== 'win' && <a href={DOWNLOAD_URLS.win}>Windows</a>}
                            {platform !== 'linux' && <a href={DOWNLOAD_URLS.linux}>Linux</a>}
                        </div>
                    )}
                </div>

                <div className="post-install">
                    <h3>After Installation</h3>
                    <ol>
                        <li>Run the installer</li>
                        <li>Launch Ok, Box Box Relay</li>
                        <li>Login with your account</li>
                        <li>Return here and click "Try Again"</li>
                    </ol>

                    <button
                        className="try-again-btn"
                        onClick={handleTryAgain}
                    >
                        🔄 Try Launch Again
                    </button>
                </div>

                <button
                    className="back-link"
                    onClick={() => navigate('/home')}
                >
                    ← Back to Launchpad
                </button>
            </div>
        </div>
    );
}

export default DownloadRelay;
