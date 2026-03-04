import { Download, Monitor, CheckCircle2, ArrowRight, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const RELAY_DOWNLOAD_URL = 'https://github.com/SingSongScreamAlong/Ok-Box-Box/releases/latest/download/okboxbox-relay-win.zip';
const PYTHON_DOWNLOAD_URL = 'https://www.python.org/ftp/python/3.12.2/python-3.12.2-amd64.exe';

export function DownloadPage() {
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
              <p className="text-sm text-white/40">Version 1.0.0</p>
            </div>
          </div>

          <div className="space-y-3 mb-8">
            <div className="flex items-center gap-3 text-sm text-white/70">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Live telemetry at 60Hz</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/70">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Voice commands with AI engineer</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/70">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Session logging for analysis</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/70">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Auto-reconnect on network issues</span>
            </div>
          </div>

          <a
            href={RELAY_DOWNLOAD_URL}
            className="w-full px-6 py-4 bg-green-500 text-black font-bold text-sm uppercase tracking-wider hover:bg-green-400 flex items-center justify-center gap-3 transition-colors"
          >
            <Download className="w-5 h-5" />
            Download Relay (32 KB)
          </a>

          <p className="text-xs text-white/30 text-center mt-4">
            Requires Windows 10+ and Python 3.10+
          </p>
        </div>

        {/* Prerequisites */}
        <div className="mt-6 border border-yellow-500/20 bg-yellow-500/5 p-6">
          <h3 className="text-sm uppercase tracking-wider text-yellow-500/80 mb-4" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            Prerequisites
          </h3>
          <p className="text-sm text-white/60 mb-4">
            The relay requires Python to run. If you don't have it installed:
          </p>
          <a
            href={PYTHON_DOWNLOAD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-yellow-500 hover:text-yellow-400"
          >
            <ExternalLink className="w-4 h-4" />
            Download Python 3.12 for Windows
          </a>
          <p className="text-xs text-white/30 mt-2">
            ✓ Check "Add Python to PATH" during installation
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
              <span>Extract the zip to any folder</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-white/10 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
              <span>Copy <code className="bg-white/10 px-1 rounded">.env.example</code> to <code className="bg-white/10 px-1 rounded">.env</code></span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-white/10 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
              <span>Double-click <code className="bg-white/10 px-1 rounded">START-RELAY.bat</code></span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-white/10 flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
              <span>Start iRacing and join a session</span>
            </li>
          </ol>
          <p className="text-xs text-white/30 mt-4">
            First run will install dependencies automatically (~30 seconds)
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
