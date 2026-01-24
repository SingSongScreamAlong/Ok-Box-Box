import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { StackingSections, StackingSection } from '../components/StackingSections';

export function Download() {
    return (
        <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
            {/* Background video */}
            <div className="fixed inset-0 z-0">
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    className="w-full h-full object-cover opacity-70"
                >
                    <source src="/videos/download-bg.mp4" type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />
            </div>

            {/* Page header */}
            <div className="pt-8 pb-8 px-6 relative z-10">
                <div className="max-w-3xl mx-auto text-center">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#f97316] mb-4">The Relay</p>
                    <h1 
                        className="text-2xl uppercase tracking-[0.15em] font-semibold text-white mb-4"
                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                        Download Relay
                    </h1>
                    <p className="text-sm text-white/80 leading-relaxed max-w-lg mx-auto mb-8">
                        The Relay connects your iRacing session to Ok, Box Box in real time.
                        It's the bridge between the simulator and the system.
                    </p>

                    <button className="btn btn-primary px-8 py-4 text-sm uppercase tracking-wider font-semibold mb-3">
                        Download for Windows
                    </button>
                    <p className="text-[10px] text-white/60 uppercase tracking-wider">v0.1.0 · Windows 10+</p>
                </div>
            </div>

            {/* Stacking sections */}
            <div className="max-w-3xl mx-auto px-6 pb-16 relative z-10">
                <StackingSections>
                    <StackingSection
                        index={0}
                        id="enables"
                        title="What the Relay Enables"
                        subtitle="Live data flow, shared awareness, and system authority."
                        stripeColor="#f97316"
                    >
                        <div className="text-sm text-white/80 leading-relaxed space-y-6">
                            <div>
                                <h3 className="text-xs uppercase tracking-wider text-[#3b82f6] font-semibold mb-2">Live Data Flow</h3>
                                <p className="text-white/80">
                                    Streams telemetry, timing, and session state from iRacing to Ok, Box Box in real time — no exports, uploads, or manual steps.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-xs uppercase tracking-wider text-[#f97316] font-semibold mb-2">Shared Awareness</h3>
                                <p className="text-white/80">
                                    Powers driver views, team pit walls, and league control surfaces so everyone sees the same information at the same time.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-xs uppercase tracking-wider text-white font-semibold mb-2">System Authority</h3>
                                <p className="text-white/80">
                                    Enables strategy coordination, incident review, and race operations using a single source of truth.
                                </p>
                            </div>
                        </div>
                    </StackingSection>

                    <StackingSection
                        index={1}
                        id="not"
                        title="What the Relay Is Not"
                        subtitle="A passive connection layer. You are always in control."
                        stripeColor="#f97316"
                    >
                        <div className="text-sm text-white/80 leading-relaxed space-y-4">
                            <ul className="space-y-3 text-white/80">
                                <li>- Does not modify iRacing files</li>
                                <li>- Does not inject overlays into the sim</li>
                                <li>- Does not control your car</li>
                                <li>- Does not run when iRacing is closed</li>
                            </ul>
                            <p className="text-white/70 italic">
                                The Relay is a passive connection layer. You are always in control.
                            </p>
                        </div>
                    </StackingSection>

                    <StackingSection
                        index={2}
                        id="after"
                        title="After You Install"
                        subtitle="No configuration required."
                        stripeColor="#3b82f6"
                    >
                        <div className="text-sm text-white/80 leading-relaxed space-y-4">
                            <div className="space-y-3">
                                <div className="flex items-center gap-4">
                                    <span className="w-6 h-6 flex items-center justify-center bg-[#3b82f6]/20 text-[#3b82f6] text-xs font-semibold rounded-full flex-shrink-0">1</span>
                                    <p className="text-white/80">Launch iRacing</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="w-6 h-6 flex items-center justify-center bg-[#3b82f6]/20 text-[#3b82f6] text-xs font-semibold rounded-full flex-shrink-0">2</span>
                                    <p className="text-white/80">Start the Relay</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="w-6 h-6 flex items-center justify-center bg-[#3b82f6]/20 text-[#3b82f6] text-xs font-semibold rounded-full flex-shrink-0">3</span>
                                    <p className="text-white/80">Log in to Ok, Box Box</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="w-6 h-6 flex items-center justify-center bg-[#3b82f6]/20 text-[#3b82f6] text-xs font-semibold rounded-full flex-shrink-0">4</span>
                                    <p className="text-white/80">Your session appears automatically</p>
                                </div>
                            </div>
                            <p className="text-white/70 italic">
                                No configuration required.
                            </p>
                        </div>
                    </StackingSection>

                    <StackingSection
                        index={3}
                        id="help"
                        title="Need Help?"
                        subtitle="View the installation guide for detailed instructions."
                        stripeColor="#f97316"
                        isLast={true}
                    >
                        <div className="text-sm text-white/80 leading-relaxed space-y-4">
                            <p className="text-white/80">
                                Need help installing or verifying the connection?
                            </p>
                            <Link to="/docs/relay" className="inline-flex items-center gap-2 text-xs text-[#f97316]/70 hover:text-[#f97316] transition-colors duration-150">
                                View Relay Documentation <ExternalLink size={12} />
                            </Link>
                        </div>
                    </StackingSection>
                </StackingSections>

                {/* Status footer */}
                <div className="mt-12 border-t border-white/10 pt-8 text-center">
                    <p className="text-xs text-white/40">
                        Winter Testing
                    </p>
                </div>
            </div>
        </div>
    );
}
