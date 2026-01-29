import { Download, Monitor, CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const RELAY_DOWNLOAD_URL = 'https://github.com/SingSongScreamAlong/Ok-Box-Box/releases/download/v1.0.0/OkBoxBoxRelay-win.exe';

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
              <span>Auto-starts with Windows</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/70">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Auto-detects iRacing sessions</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/70">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Sends telemetry at 60Hz</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/70">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Runs silently in system tray</span>
            </div>
          </div>

          <a
            href={RELAY_DOWNLOAD_URL}
            className="w-full px-6 py-4 bg-green-500 text-black font-bold text-sm uppercase tracking-wider hover:bg-green-400 flex items-center justify-center gap-3 transition-colors"
          >
            <Download className="w-5 h-5" />
            Download for Windows
          </a>

          <p className="text-xs text-white/30 text-center mt-4">
            Requires Windows 10 or later
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
              <span>Download and run the installer</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-white/10 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
              <span>Look for the relay icon in your system tray</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-white/10 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
              <span>Start iRacing - the relay connects automatically</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-white/10 flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
              <span>View your live data on the dashboard</span>
            </li>
          </ol>
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
