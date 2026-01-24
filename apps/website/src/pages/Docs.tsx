import { Link } from 'react-router-dom';
import { StackingSections, StackingSection } from '../components/StackingSections';

export function Docs() {
    return (
        <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
            {/* Left vertical video - fixed, stops before footer */}
            <div className="hidden xl:block fixed left-0 top-16 overflow-hidden" style={{ width: 'calc((100vw - 768px) / 2 + 100px)', height: 'calc(100vh - 280px)' }}>
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="h-full w-full object-cover opacity-50"
                >
                    <source src="/videos/docs-left.mp4" type="video/mp4" />
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

            {/* Right vertical video - fixed, stops before footer */}
            <div className="hidden xl:block fixed right-0 top-16 overflow-hidden" style={{ width: 'calc((100vw - 768px) / 2 + 100px)', height: 'calc(100vh - 280px)' }}>
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="h-full w-full object-cover opacity-50"
                >
                    <source src="/videos/docs-right.mp4" type="video/mp4" />
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
                        Documentation
                    </h1>
                    
                    <div className="text-sm text-white/80 leading-relaxed space-y-4 mb-8 border-l-2 border-white/10 pl-6">
                        <p>
                            Ok, Box Box is a racing operations system built for iRacing drivers, teams, and leagues who want more control over how they race.
                        </p>
                        <p>
                            Most racing tools focus on a single moment. One session. One lap. One race.<br />
                            Ok, Box Box is built around continuity.
                        </p>
                        <p className="text-white/60">
                            This documentation explains what each part of Ok, Box Box does, why it exists, and how to decide which level is right for you.
                        </p>
                    </div>
                </div>
            </div>

            {/* Stacking sections */}
            <div className="max-w-3xl mx-auto px-6 pb-16 relative z-10">
                <StackingSections>
                    <StackingSection
                        index={0}
                        id="system-overview"
                        title="System Overview"
                        subtitle="Ok, Box Box is composed of three primary layers."
                        stripeColor="#f97316"
                    >
                        <div className="text-sm text-white/80 leading-relaxed space-y-6">
                            <p>Ok, Box Box is composed of three primary layers:</p>
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-xs uppercase tracking-wider text-white font-semibold mb-2">1. Relay</h3>
                                    <p className="text-white/70">
                                        The local data bridge between iRacing and the Ok, Box Box platform.
                                        All data collection begins here.
                                    </p>
                                    <Link to="/docs/relay" className="text-xs text-[#f97316]/70 hover:text-[#f97316] transition-colors duration-150 mt-2 inline-block">
                                        Read more →
                                    </Link>
                                </div>
                                <div>
                                    <h3 className="text-xs uppercase tracking-wider text-white font-semibold mb-2">2. Platform</h3>
                                    <p className="text-white/70">
                                        The central system that processes, stores, and coordinates race data.
                                        This layer supports shared views, analysis, and operational tooling.
                                    </p>
                                </div>
                                <div>
                                    <h3 className="text-xs uppercase tracking-wider text-white font-semibold mb-2">3. Interfaces</h3>
                                    <p className="text-white/70">
                                        Purpose-built surfaces for Drivers, Teams, and Leagues.
                                        Each interface exposes only what is relevant to its role.
                                    </p>
                                </div>
                            </div>
                            <p className="text-white/60">
                                The system is modular by design. Not all users need every component.
                            </p>
                        </div>
                    </StackingSection>

                    <StackingSection
                        index={1}
                        id="for-drivers"
                        title="For Drivers"
                        subtitle="Continuity and personal performance."
                        stripeColor="#3b82f6"
                    >
                        <div className="text-sm text-white/80 leading-relaxed space-y-4">
                            <p>
                                For drivers, Ok, Box Box is about continuity and personal performance.
                            </p>
                            <p>
                                The system maintains a persistent driver identity across sessions, tracks, and seasons. Telemetry, results, and session history stay connected so progress is not lost between races.
                            </p>
                            <p>
                                Instead of treating each session as an isolated event, drivers can review patterns, compare runs, and understand how changes in setup, conditions, or approach affect performance over time.
                            </p>
                            <p className="text-white/50">
                                Every driver begins with the Relay.
                                It establishes the data connection and unlocks driver-focused views without requiring teams or league involvement.
                            </p>
                            <Link to="/driver" className="text-xs text-[#3b82f6]/70 hover:text-[#3b82f6] transition-colors duration-150 inline-block">
                                Learn more about Driver access →
                            </Link>
                        </div>
                    </StackingSection>

                    <StackingSection
                        index={2}
                        id="for-teams"
                        title="For Teams"
                        subtitle="Coordination and shared decision-making."
                        stripeColor="#f97316"
                    >
                        <div className="text-sm text-white/80 leading-relaxed space-y-4">
                            <p>
                                For teams, Ok, Box Box is about coordination and shared decision-making.
                            </p>
                            <p>
                                Teams operate through a shared pit wall that brings timing, strategy, and driver context into a single, consistent view. Everyone sees the same information at the same time.
                            </p>
                            <p>
                                The system is designed for endurance racing, multi-driver lineups, and organized teams where communication, timing, and context matter as much as raw pace.
                            </p>
                            <p className="text-white/50">
                                Teams can plan stints, review sessions, and coordinate strategy without relying on external tools or fragmented communication.
                            </p>
                            <Link to="/team" className="text-xs text-[#f97316]/70 hover:text-[#f97316] transition-colors duration-150 inline-block">
                                Learn more about Team access →
                            </Link>
                        </div>
                    </StackingSection>

                    <StackingSection
                        index={3}
                        id="for-leagues"
                        title="For Leagues"
                        subtitle="Control, accountability, and consistency."
                        stripeColor="#8b5cf6"
                    >
                        <div className="text-sm text-white/80 leading-relaxed space-y-4">
                            <p>
                                For leagues, Ok, Box Box is about control, accountability, and consistency.
                            </p>
                            <p>
                                League tools provide structured visibility into sessions, incidents, and enforcement decisions. Stewarding is supported by recorded data rather than incomplete reports or subjective interpretation.
                            </p>
                            <p>
                                Ok, Box Box helps leagues maintain consistency across events while reducing manual overhead for administrators.
                            </p>
                            <p className="text-white/50">
                                League features are intentionally separated from driver and team views, ensuring enforcement remains neutral, transparent, and fair.
                            </p>
                            <Link to="/league" className="text-xs text-[#8b5cf6]/70 hover:text-[#8b5cf6] transition-colors duration-150 inline-block">
                                Learn more about League access →
                            </Link>
                        </div>
                    </StackingSection>

                    <StackingSection
                        index={4}
                        id="relay-overview"
                        title="Relay Overview"
                        subtitle="What the Relay is and why everything starts there."
                        stripeColor="#f97316"
                    >
                        <div className="text-sm text-white/80 leading-relaxed space-y-6">
                            <p>
                                The Relay is the local data bridge between iRacing and the Ok, Box Box platform. All data collection begins here.
                            </p>
                            <p className="text-white/60">
                                Without the Relay, Ok, Box Box has no visibility into a driver's sessions.
                            </p>
                            <div>
                                <h4 className="text-xs uppercase tracking-wider text-white font-semibold mb-3">What the Relay Does</h4>
                                <ul className="space-y-2 text-white/70">
                                    <li>- Connects to iRacing's local telemetry and session data</li>
                                    <li>- Observes live and completed sessions</li>
                                    <li>- Packages relevant data for transmission</li>
                                    <li>- Sends data securely to the Ok, Box Box platform</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="text-xs uppercase tracking-wider text-white font-semibold mb-3">What the Relay Does Not Do</h4>
                                <ul className="space-y-2 text-white/70">
                                    <li>- Control the simulation</li>
                                    <li>- Inject data into iRacing</li>
                                    <li>- Provide user-facing analysis</li>
                                    <li>- Replace iRacing tooling</li>
                                </ul>
                            </div>
                            <p className="text-white/50">The Relay exists solely to enable everything that follows.</p>
                            <Link to="/download-relay" className="text-xs text-[#f97316]/70 hover:text-[#f97316] transition-colors duration-150 inline-block">
                                Download Relay →
                            </Link>
                        </div>
                    </StackingSection>

                    <StackingSection
                        index={5}
                        id="program-phases"
                        title="Program Phases"
                        subtitle="How Ok, Box Box progresses through testing and validation."
                        stripeColor="#f97316"
                        isLast={true}
                    >
                        <div className="text-sm text-white/80 leading-relaxed space-y-6">
                            <p>
                                Ok, Box Box is developed and released in defined phases, similar to how a real racing program is prepared, tested, and trusted over time.
                            </p>
                            <p className="text-white/60">
                                Phases advance only when the system proves itself under real use, not when it looks ready on paper.
                            </p>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-xs uppercase tracking-wider text-white font-semibold mb-1">
                                        Winter Testing <span className="text-[#f97316]">(Current)</span>
                                    </h4>
                                    <p className="text-white/60">Core architecture, data flow, and system behavior validated under controlled conditions.</p>
                                </div>
                                <div>
                                    <h4 className="text-xs uppercase tracking-wider text-white font-semibold mb-1">FP1 — Driver Systems</h4>
                                    <p className="text-white/60">Controlled live use for drivers begins.</p>
                                </div>
                                <div>
                                    <h4 className="text-xs uppercase tracking-wider text-white font-semibold mb-1">FP2 — Team Systems</h4>
                                    <p className="text-white/60">Team pit wall and coordination features enabled.</p>
                                </div>
                                <div>
                                    <h4 className="text-xs uppercase tracking-wider text-white font-semibold mb-1">FP3 — League Systems</h4>
                                    <p className="text-white/60">Stewarding, incident review, and race control go live.</p>
                                </div>
                                <div>
                                    <h4 className="text-xs uppercase tracking-wider text-white font-semibold mb-1">Qualifying → Race</h4>
                                    <p className="text-white/60">Release readiness, then full availability.</p>
                                </div>
                            </div>
                            <p className="text-white/50">Phases are not time-based. Progression depends on validation, not schedules.</p>
                            <Link to="/track-ready" className="text-xs text-[#f97316]/70 hover:text-[#f97316] transition-colors duration-150 inline-block">
                                Learn more about Getting Track Ready →
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
