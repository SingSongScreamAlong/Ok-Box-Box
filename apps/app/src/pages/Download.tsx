import { useState } from 'react';
import { Download, Monitor, CheckCircle2, ArrowRight, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'https://octopus-app-qsi3i.ondigitalocean.app';
const RELAY_DOWNLOAD_URL = 'https://github.com/SingSongScreamAlong/Ok-Box-Box/releases/latest/download/okboxbox-relay-1.0.0-alpha.exe';

export function DownloadPage() {
  const { user, session } = useAuth();
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState('');

  const handleLaunchRelay = async () => {
    if (!session?.access_token) {
      window.location.href = '/login';
      return;
    }

    try {
      setLaunching(true);
      setLaunchError('');
      const response = await fetch(`${API_BASE}/api/launch-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ surface: 'driver' }),
      });

      const json: any = await response.json().catch(() => ({}));
      if (!response.ok || !json?.data?.protocolUrl) {
        throw new Error(json?.error?.message || 'Failed to launch relay');
      }

      const { protocolUrl, fallbackUrl } = json.data as { protocolUrl: string; fallbackUrl: string };
      window.location.href = protocolUrl;
      window.setTimeout(() => {
        window.location.href = fallbackUrl;
      }, 1500);
    } catch (error) {
      setLaunchError(error instanceof Error ? error.message : 'Failed to launch relay');
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="min-h-screen bg-[--bg] flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold uppercase tracking-wider mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            Ok, Box Box Relay
          </h1>
          <p className="text-white/60">Connect iRacing to your dashboard</p>
        </div>

        {/* Download Card */}
        <div className="border border-white/10 bg-white/[0.02] p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-green-500/20 border border-green-500/30 flex items-center justify-center">
              <Monitor className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Windows Relay</h2>
              <p className="text-sm text-white/40">Version 1.0.0-alpha</p>
            </div>
          </div>

          <div className="space-y-3 mb-8">
            <div className="flex items-center gap-3 text-sm text-white/70">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Live telemetry at 60Hz</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/70">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Embedded runtime — no Python install required</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/70">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Self-updating desktop relay</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/70">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>One-click connect from your account</span>
            </div>
          </div>

          <a
            href={RELAY_DOWNLOAD_URL}
            className="w-full px-6 py-4 bg-green-500 text-black font-bold text-sm uppercase tracking-wider hover:bg-green-400 flex items-center justify-center gap-3 transition-colors"
          >
            <Download className="w-5 h-5" />
            Download Relay Installer
          </a>

          <button
            onClick={handleLaunchRelay}
            className="mt-3 w-full px-6 py-4 border border-white/15 text-white font-bold text-sm uppercase tracking-wider hover:bg-white/5 flex items-center justify-center gap-3 transition-colors"
          >
            <Radio className="w-5 h-5" />
            {user ? (launching ? 'Launching Relay...' : 'Launch Installed Relay') : 'Sign In To Connect Relay'}
          </button>

          {launchError ? (
            <p className="text-xs text-red-300 text-center mt-3">{launchError}</p>
          ) : null}

          <p className="text-xs text-white/30 text-center mt-4">
            Windows 10+ • Installer bundles the runtime and auto-start behavior
          </p>
        </div>

        {/* Instructions */}
        <div className="mt-6 border border-white/10 bg-white/[0.02] p-6">
          <h3 className="text-sm uppercase tracking-wider text-white/60 mb-4" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            Quick Start
          </h3>
          <ol className="space-y-3 text-sm text-white/70">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-white/10 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
              <span>Download and run the Windows installer</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-white/10 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
              <span>Open the relay once to register protocol + auto-start</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-white/10 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
              <span>Return here and click <code className="bg-white/10 px-1 rounded">Launch Installed Relay</code></span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-white/10 flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
              <span>Start iRacing and the relay will auto-detect + stream</span>
            </li>
          </ol>
          <p className="text-xs text-white/30 mt-4">
            No Docker, no Python, no manual config files required for end users
          </p>
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <Link 
            to="/driver/home" 
            className="text-sm text-white/40 hover:text-white/60 inline-flex items-center gap-2"
          >
            Back to Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
