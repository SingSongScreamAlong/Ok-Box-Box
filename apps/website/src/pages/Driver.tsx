import { Link } from 'react-router-dom';
import { StackingSections, StackingSection } from '../components/StackingSections';

export function Driver() {
    return (
        <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
            {/* Left video half */}
            <div className="fixed top-0 left-0 w-1/2 h-full overflow-hidden pointer-events-none">
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute top-0 left-0 w-[200%] h-full object-cover opacity-20"
                    style={{ objectPosition: 'left center' }}
                >
                    <source src="/videos/driver-bg.mp4" type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0a0a0a]" />
            </div>
            
            {/* Right video half */}
            <div className="fixed top-0 right-0 w-1/2 h-full overflow-hidden pointer-events-none">
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute top-0 right-0 w-[200%] h-full object-cover opacity-20"
                    style={{ objectPosition: 'right center' }}
                >
                    <source src="/videos/driver-bg.mp4" type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#0a0a0a]" />
            </div>

            {/* Page header */}
            <div className="pt-8 pb-8 px-6 relative z-10">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-8">
                        <Link 
                            to="/" 
                            className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-white/50 hover:text-white/80 transition-colors duration-150"
                        >
                            ← Back to Home
                        </Link>
                    </div>
                    
                    <div className="text-center mb-8">
                        <div className="text-xs uppercase tracking-[0.15em] text-[#3b82f6] mb-3">
                            Access Layer
                        </div>
                        <h1 
                            className="text-2xl uppercase tracking-[0.15em] font-semibold text-white mb-4"
                            style={{ fontFamily: 'Orbitron, sans-serif' }}
                        >
                            Driver
                        </h1>
                        <p className="text-sm text-white/70 leading-relaxed">
                            Identity. Telemetry. Sessions.<br />
                            Starts with the Relay.
                        </p>
                    </div>
                </div>
            </div>

            {/* Stacking sections */}
            <div className="max-w-3xl mx-auto px-6 pb-16 relative z-10">
                <StackingSections>
                    <StackingSection
                        index={0}
                        id="overview"
                        title="Overview"
                        subtitle="Driver access is built around continuity and personal performance."
                        stripeColor="#3b82f6"
                    >
                        <div className="text-sm text-white/80 leading-relaxed space-y-4">
                            <p>
                                Driver access is built around continuity and personal performance.
                            </p>
                            <p>
                                The system maintains a persistent driver identity across sessions, tracks, and seasons. 
                                Telemetry, results, and session history stay connected so progress is not lost between races.
                            </p>
                            <p>
                                Instead of treating each session as an isolated event, drivers can review patterns, 
                                compare runs, and understand how changes in setup, conditions, or approach affect performance over time.
                            </p>
                        </div>
                    </StackingSection>

                    <StackingSection
                        index={1}
                        id="what-you-get"
                        title="What You Get"
                        subtitle="Identity, telemetry, session history, and driver-focused views."
                        stripeColor="#3b82f6"
                    >
                        <div className="text-sm text-white/80 leading-relaxed space-y-6">
                            <div>
                                <h3 className="text-xs uppercase tracking-wider text-white font-semibold mb-2">Driver Identity (IDP)</h3>
                                <p className="text-white/70">
                                    A persistent identity that follows you across sessions, tracks, and seasons. 
                                    Your racing history stays connected instead of scattered across tools and exports.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-xs uppercase tracking-wider text-white font-semibold mb-2">Session History</h3>
                                <p className="text-white/70">
                                    Every session is recorded and accessible. Review past performances, 
                                    compare conditions, and track progress without manual exports or external tools.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-xs uppercase tracking-wider text-white font-semibold mb-2">Telemetry + Trends</h3>
                                <p className="text-white/70">
                                    Live telemetry streams from the Relay. Historical data builds over time, 
                                    revealing patterns in your driving that single-session tools cannot show.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-xs uppercase tracking-wider text-white font-semibold mb-2">Driver Views</h3>
                                <p className="text-white/70">
                                    Purpose-built interfaces for reviewing your own data. 
                                    No team overhead, no league complexity — just what matters to you as a driver.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-xs uppercase tracking-wider text-white font-semibold mb-2">Relay Connectivity</h3>
                                <p className="text-white/70">
                                    The Relay is the bridge between iRacing and Ok, Box Box. 
                                    It runs locally, observes your sessions, and transmits data securely to the platform.
                                </p>
                            </div>
                        </div>
                    </StackingSection>

                    <StackingSection
                        index={2}
                        id="who-its-for"
                        title="Who It's For"
                        subtitle="Drivers who want progress that carries forward."
                        stripeColor="#3b82f6"
                    >
                        <div className="text-sm text-white/80 leading-relaxed space-y-4">
                            <p>
                                Drivers who want progress that carries forward — not one-off sessions.
                            </p>
                            <p>
                                If you race alone and want to track your own performance over time, 
                                the driver tier is sufficient. You do not need team or league access to use Ok, Box Box.
                            </p>
                            <p className="text-white/60">
                                Every driver begins with the Relay. It establishes the data connection 
                                and unlocks driver-focused views without requiring teams or league involvement.
                            </p>
                        </div>
                    </StackingSection>

                    <StackingSection
                        index={3}
                        id="independence"
                        title="Independence"
                        subtitle="Driver access stands on its own."
                        stripeColor="#3b82f6"
                        isLast={true}
                    >
                        <div className="text-sm text-white/70 leading-relaxed space-y-4">
                            <p>
                                Driver access stands on its own. It is not a prerequisite for team or league access, 
                                and it does not require either to function.
                            </p>
                            <p>
                                Teams and leagues can operate without drivers using the system directly. 
                                If you are only here for your own data, that is a complete use case.
                            </p>
                            <p className="text-white/50">
                                There is no required upgrade path. Start where it makes sense. 
                                Expand access only if your responsibilities change.
                            </p>
                        </div>
                    </StackingSection>
                </StackingSections>

                {/* CTA */}
                <div className="mt-12 border-t border-white/10 pt-10">
                    <div className="flex justify-center">
                        <Link 
                            to="/download-relay" 
                            className="btn btn-primary"
                        >
                            Download Relay
                        </Link>
                    </div>
                    <div className="flex flex-col items-center gap-3 mt-6">
                        <Link to="/team" className="text-xs uppercase tracking-wider text-white/40 hover:text-[#f97316] transition-colors duration-150">Team</Link>
                        <Link to="/league" className="text-xs uppercase tracking-wider text-white/40 hover:text-[#8b5cf6] transition-colors duration-150">League</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
