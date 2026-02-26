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
                            Identity. Intelligence. Development.<br />
                            Your crew is always on.
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
                        subtitle="A persistent racing identity with AI crew intelligence and structured development."
                        stripeColor="#3b82f6"
                    >
                        <div className="text-sm text-white/80 leading-relaxed space-y-4">
                            <p>
                                Driver access is built around continuity, intelligence, and structured development.
                            </p>
                            <p>
                                The system maintains a persistent driver identity across sessions, tracks, and seasons.
                                Every result, every incident, every iRating change feeds into a living profile that tracks
                                your progression — not just your stats.
                            </p>
                            <p>
                                You get an AI crew — Engineer, Spotter, and Analyst — that knows your data and gives
                                specific, grounded advice based on your actual performance. No generic tips.
                                Real analysis from your real sessions.
                            </p>
                        </div>
                    </StackingSection>

                    <StackingSection
                        index={1}
                        id="what-you-get"
                        title="What You Get"
                        subtitle="AI crew, development tracking, live cockpit, and full session intelligence."
                        stripeColor="#3b82f6"
                    >
                        <div className="text-sm text-white/80 leading-relaxed space-y-6">
                            <div>
                                <h3 className="text-xs uppercase tracking-wider text-white font-semibold mb-2">AI Crew — Engineer, Spotter, Analyst</h3>
                                <p className="text-white/70">
                                    Three AI crew members that study your actual session data and give targeted advice.
                                    Your Engineer focuses on strategy and race preparation. Your Spotter analyzes racecraft
                                    and situational awareness. Your Analyst breaks down performance trends, track-specific
                                    strengths, and areas for improvement — all grounded in your real numbers.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-xs uppercase tracking-wider text-white font-semibold mb-2">Individual Development Plan (IDP)</h3>
                                <p className="text-white/70">
                                    A structured progression system with skill trees, focus areas, and coaching notes
                                    derived from your performance data. Track your development phase, earn XP,
                                    unlock achievements, and see exactly where you are improving and where to focus next.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-xs uppercase tracking-wider text-white font-semibold mb-2">Consistency Performance Index (CPI)</h3>
                                <p className="text-white/70">
                                    A composite score that measures your overall consistency across incidents, pace,
                                    and finishing positions. CPI gives you a single number that reflects how reliably
                                    you perform — not just how fast you are on your best day.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-xs uppercase tracking-wider text-white font-semibold mb-2">Live Cockpit + Telemetry</h3>
                                <p className="text-white/70">
                                    A second-screen cockpit view with live position, lap times, fuel status,
                                    track map, leaderboard, and team radio — all streaming from the Relay in real time.
                                    iRating trends and session history build automatically over time.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-xs uppercase tracking-wider text-white font-semibold mb-2">Session History + Track Analysis</h3>
                                <p className="text-white/70">
                                    Every session is recorded with full context — finish position, incidents, iRating change,
                                    positions gained, and more. Per-track analysis shows your performance trends, strengths,
                                    and weaknesses at specific circuits over time.
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
                        subtitle="Drivers who want structured development, not just lap times."
                        stripeColor="#3b82f6"
                    >
                        <div className="text-sm text-white/80 leading-relaxed space-y-4">
                            <p>
                                Drivers who want structured development — not just lap times and leaderboard positions.
                            </p>
                            <p>
                                If you want to understand why your results look the way they do, where your consistency
                                breaks down, and what to focus on next — the driver tier gives you that intelligence.
                                You do not need team or league access to use Ok, Box Box.
                            </p>
                            <p className="text-white/60">
                                Every driver begins with the Relay. It establishes the data connection
                                and unlocks your crew, your development plan, and your full session intelligence.
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
                            to="/download" 
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
