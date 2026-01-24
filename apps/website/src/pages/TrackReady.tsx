import { StackingSections, StackingSection } from '../components/StackingSections';

export function TrackReady() {
    return (
        <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
            {/* Left vertical video */}
            <div className="hidden xl:block fixed left-0 top-16 overflow-hidden" style={{ width: 'calc((100vw - 768px) / 2 + 100px)', height: 'calc(100vh - 280px)' }}>
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="h-full w-full object-cover opacity-50"
                >
                    <source src="/videos/track-left.mp4" type="video/mp4" />
                </video>
                <div 
                    className="absolute inset-0" 
                    style={{ background: 'linear-gradient(to right, transparent 0%, #0a0a0a 70%)' }}
                ></div>
                <div 
                    className="absolute bottom-0 left-0 right-0 h-40" 
                    style={{ background: 'linear-gradient(to top, #0a0a0a 0%, transparent 100%)' }}
                ></div>
            </div>

            {/* Right vertical video */}
            <div className="hidden xl:block fixed right-0 top-16 overflow-hidden" style={{ width: 'calc((100vw - 768px) / 2 + 100px)', height: 'calc(100vh - 280px)' }}>
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="h-full w-full object-cover opacity-50"
                >
                    <source src="/videos/track-right.mp4" type="video/mp4" />
                </video>
                <div 
                    className="absolute inset-0" 
                    style={{ background: 'linear-gradient(to left, transparent 0%, #0a0a0a 70%)' }}
                ></div>
                <div 
                    className="absolute bottom-0 left-0 right-0 h-40" 
                    style={{ background: 'linear-gradient(to top, #0a0a0a 0%, transparent 100%)' }}
                ></div>
            </div>

            {/* Page header */}
            <div className="pt-8 pb-8 px-6 relative z-10">
                <div className="max-w-3xl mx-auto">
                    <h1 
                        className="text-2xl uppercase tracking-[0.15em] font-semibold text-white mb-8"
                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                        Getting Track Ready
                    </h1>
                    
                    <div className="text-sm text-white/80 leading-relaxed space-y-4 mb-8 border-l-2 border-white/10 pl-6">
                        <p>
                            Getting track ready is not a single step.
                            It is the process of preparing a system to operate under real conditions, real pressure, and real responsibility.
                        </p>
                        <p>
                            Ok, Box Box is developed the same way a serious racing program is prepared.
                            Capability is introduced in stages, each one validated before moving to the next.
                            Nothing advances until it proves it belongs on track.
                        </p>
                        <p className="text-white/60">
                            This page explains how Ok, Box Box earns that readiness.
                        </p>
                    </div>

                    <div className="mb-4 border-l-2 border-[#f97316]/50 pl-6">
                        <p className="text-sm text-white/80 leading-relaxed">
                            Ok, Box Box is currently in <span className="text-[#f97316] font-semibold">Winter Testing</span>.
                        </p>
                    </div>
                </div>
            </div>

            {/* Stacking sections */}
            <div className="max-w-3xl mx-auto px-6 pb-16">
                <StackingSections>
                    <StackingSection
                        index={0}
                        id="winter-testing"
                        title="Winter Testing"
                        subtitle="Foundation built and verified under controlled conditions."
                        stripeColor="#f97316"
                        isCurrent={true}
                    >
                        <div className="text-sm text-white/80 leading-relaxed space-y-4">
                            <p>
                                Winter Testing is where the foundation is built and verified.
                            </p>
                            <p>
                                Core architecture, data flow, identity, and system behavior are validated under controlled conditions. Limited direct interaction with drivers, teams, and leagues is allowed, but only for concept testing and validation.
                            </p>
                            <p>This phase may include:</p>
                            <ul className="list-disc list-inside text-white/70 space-y-1 ml-2">
                                <li>Limited driver usage</li>
                                <li>Read-only or preview team views</li>
                                <li>Guided league walkthroughs and concept validation</li>
                            </ul>
                            <p className="text-white/60">
                                Winter Testing is not intended for live race operations, enforcement, or strategy execution.
                                The goal is to ensure the system structure is correct before it is trusted with real decisions.
                            </p>
                        </div>
                    </StackingSection>

                    <StackingSection
                        index={1}
                        id="fp1"
                        title="FP1 — Driver Systems"
                        subtitle="Controlled live use for drivers begins."
                        stripeColor="#3b82f6"
                    >
                        <div className="text-sm text-white/80 leading-relaxed space-y-4">
                            <p>
                                FP1 introduces controlled live use for drivers.
                            </p>
                            <p>
                                Drivers begin running the Relay in real sessions and using driver-focused views for continuity, telemetry, and session history. Team and league interaction remains limited or observational.
                            </p>
                            <p className="text-white/60">
                                FP1 answers a single question:<br />
                                <em>Does this system make sense for a driver to run every race?</em>
                            </p>
                        </div>
                    </StackingSection>

                    <StackingSection
                        index={2}
                        id="fp2"
                        title="FP2 — Team & Coordination"
                        subtitle="Active team usage and multi-driver coordination."
                        stripeColor="#3b82f6"
                    >
                        <div className="text-sm text-white/80 leading-relaxed space-y-4">
                            <p>
                                FP2 expands Ok, Box Box into active team usage.
                            </p>
                            <p>
                                Team pit wall features, multi-driver coordination, spotter and engineer workflows, and strategy surfaces are enabled for real racing scenarios.
                            </p>
                            <p>
                                This phase validates the system when multiple people depend on it at the same time.
                            </p>
                            <p className="text-white/60">
                                FP2 answers:<br />
                                <em>Can teams operate races on this system without added friction?</em>
                            </p>
                        </div>
                    </StackingSection>

                    <StackingSection
                        index={3}
                        id="fp3"
                        title="FP3 — League & Control"
                        subtitle="Authority, consistency, and trust validation."
                        stripeColor="#8b5cf6"
                    >
                        <div className="text-sm text-white/80 leading-relaxed space-y-4">
                            <p>
                                FP3 focuses on authority, consistency, and trust.
                            </p>
                            <p>
                                League tools move into live use, including stewarding, incident review, rule enforcement, and race control coordination. Long-session behavior and scale are exercised heavily.
                            </p>
                            <p className="text-white/60">
                                FP3 answers:<br />
                                <em>Can organizations trust this system with fairness and control?</em>
                            </p>
                        </div>
                    </StackingSection>

                    <StackingSection
                        index={4}
                        id="qualifying"
                        title="Qualifying — Release Readiness"
                        subtitle="Features frozen. Stability and documentation finalized."
                        stripeColor="#6b7280"
                    >
                        <div className="text-sm text-white/80 leading-relaxed space-y-4">
                            <p>
                                Qualifying represents release readiness.
                            </p>
                            <p>
                                Features are frozen. Performance, stability, documentation, and onboarding are finalized. Changes are limited to fixes and refinements only.
                            </p>
                            <p className="text-white/60">
                                This phase determines whether the platform is ready to be judged publicly.
                            </p>
                        </div>
                    </StackingSection>

                    <StackingSection
                        index={5}
                        id="race"
                        title="Race — Version 1"
                        subtitle="Full availability for drivers, teams, and leagues."
                        stripeColor="#22c55e"
                    >
                        <div className="text-sm text-white/80 leading-relaxed space-y-4">
                            <p>
                                Race marks full availability.
                            </p>
                            <p>
                                All systems are enabled, access is open, and Ok, Box Box is ready for full-time use by drivers, teams, and leagues.
                            </p>
                        </div>
                    </StackingSection>

                    <StackingSection
                        index={6}
                        id="notes"
                        title="Notes"
                        subtitle="Phases are not time-based. Progression depends on validation."
                        stripeColor="#404040"
                        isLast={true}
                    >
                        <div className="text-sm text-white/70 leading-relaxed space-y-4">
                            <p>
                                Phases are not time-based.<br />
                                Progression depends on validation, not schedules.
                            </p>
                            <p>
                                Not every user will experience every phase.<br />
                                Access aligns with readiness and real-world use.
                            </p>
                            <p className="text-white/60">
                                Getting track ready is about discipline, not speed.<br />
                                Each phase earns the right to move forward.
                            </p>
                        </div>
                    </StackingSection>
                </StackingSections>

                {/* Status footer */}
                <div className="border-t border-white/10 pt-8 mt-16 text-center">
                    <p className="text-xs text-white/40">
                        Winter Testing Underway
                    </p>
                </div>
            </div>
        </div>
    );
}
