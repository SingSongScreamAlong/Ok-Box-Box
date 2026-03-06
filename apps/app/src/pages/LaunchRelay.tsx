import { useEffect, useMemo } from 'react';
import { Download, Radio } from 'lucide-react';

const RELAY_DOWNLOAD_URL = 'https://github.com/SingSongScreamAlong/Ok-Box-Box/releases/latest/download/okboxbox-relay-1.0.0-alpha.exe';

export function LaunchRelay() {
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) return;
    const protocolUrl = `okboxbox://launch?token=${encodeURIComponent(token)}`;
    window.location.href = protocolUrl;
  }, [token]);

  return (
    <div className="min-h-screen bg-[--bg] flex items-center justify-center p-4">
      <div className="max-w-lg w-full border border-white/10 bg-white/[0.02] p-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center border border-[#f97316]/30 bg-[#f97316]/10">
          <Radio className="h-8 w-8 text-[#f97316]" />
        </div>
        <h1 className="text-2xl font-bold uppercase tracking-[0.18em] text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          Launch Relay
        </h1>
        <p className="mt-3 text-sm text-white/60">
          We’re trying to open your installed Ok, Box Box Relay.
        </p>

        <div className="mt-6 space-y-3 text-sm text-white/70 text-left">
          <div className="border border-white/10 bg-black/20 p-4">1. If the relay is installed, it should open automatically.</div>
          <div className="border border-white/10 bg-black/20 p-4">2. If nothing happens, install the relay and come back to retry this link.</div>
          <div className="border border-white/10 bg-black/20 p-4">3. Once linked, the relay will remember your account and auto-start on future sessions.</div>
        </div>

        <a
          href={RELAY_DOWNLOAD_URL}
          className="mt-6 inline-flex w-full items-center justify-center gap-3 bg-[#22c55e] px-6 py-4 text-sm font-bold uppercase tracking-[0.18em] text-black transition-colors hover:bg-[#4ade80]"
        >
          <Download className="h-5 w-5" />
          Download Relay Installer
        </a>
      </div>
    </div>
  );
}
