import { Link } from 'react-router-dom';
import { StackingSections, StackingSection } from '../components/StackingSections';

export function Team() {
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
                    <source src="/videos/team-bg.mp4" type="video/mp4" />
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
                    <source src="/videos/team-bg.mp4" type="video/mp4" />
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
                        <div className="text-xs uppercase tracking-[0.15em] text-[#f97316] mb-3">
                            Access Layer
                        </div>
                        <h1 
                            className="text-2xl uppercase tracking-[0.15em] font-semibold text-white mb-4"
                            style={{ fontFamily: 'Orbitron, sans-serif' }}
                        >
                            Team
                        </h1>
                        <p className="text-sm text-white/70 leading-relaxed">
                            Strategy. Timing. Coordination.<br />
                            One shared pit wall.
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
                        subtitle="Team access is built around coordination and shared decision-making."
                        stripeColor="#f97316"
                    >
                        <div className="text-sm text-white/80 leading-relaxed space-y-4">
                            <p>
                                Team access is built around coordination and shared decision-making.
                            </p>
                            <p>
                                Teams operate through a shared pit wall that brings timing, strategy, and driver context 
                                into a single, consistent view. Everyone sees the same information at the same time.
                            </p>
                            <p>
                                The system is designed for endurance racing, multi-driver lineups, and organized teams 
                                where communication, timing, and context matter as much as raw pace.
                            </p>
                        </div>
                    </StackingSection>

                    <StackingSection
                        index={1}
                        id="what-you-get"
                        title="What You Get"
                        subtitle="Shared pit wall, strategy coordination, and role-based views."
                        stripeColor="#f97316"
                    >
                        <div className="text-sm text-white/80 leading-relaxed space-y-6">
                            <div>
                                <h3 className="text-xs uppercase tracking-wider text-white font-semibold mb-2">Shared Pit Wall</h3>
                                <p className="text-white/70">
                                    A unified view of the race for everyone on the team. Timing, strategy, and driver status 
                                    are visible in real time — no more fragmented information across Discord and spreadsheets.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-xs uppercase tracking-wider text-white font-semibold mb-2">Strategy + Timing Coordination</h3>
                                <p className="text-white/70">
                                    Plan stints, track fuel windows, and coordinate pit stops with shared tools. 
                                    The pit wall keeps everyone aligned without constant verbal check-ins.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-xs uppercase tracking-wider text-white font-semibold mb-2">Multi-Driver Context</h3>
                                <p className="text-white/70">
                                    See all drivers in context — who is in the car, who is next, and how the rotation is progressing. 
                                    Designed for endurance events where driver changes are part of the operation.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-xs uppercase tracking-wider text-white font-semibold mb-2">Spotter / Engineer Workflows</h3>
                                <p className="text-white/70">
                                    Purpose-built views for spotters and engineers. Each role sees what they need 
                                    without being overwhelmed by information meant for someone else.
                                </p>
                            </div>
                        </div>
                    </StackingSection>

                    <StackingSection
                        index={2}
                        id="who-its-for"
                        title="Who It's For"
                        subtitle="Teams running endurance or multi-driver programs."
                        stripeColor="#f97316"
                    >
                        <div className="text-sm text-white/80 leading-relaxed space-y-4">
                            <p>
                                Teams running endurance, multi-driver programs, or any group that needs coordination under pressure.
                            </p>
                            <p>
                                If you race with others and need shared visibility into timing, strategy, and driver status, 
                                the team tier adds the coordination layer that solo tools cannot provide.
                            </p>
                            <p className="text-white/60">
                                Teams can plan stints, review sessions, and coordinate strategy 
                                without relying on external tools or fragmented communication.
                            </p>
                        </div>
                    </StackingSection>

                    <StackingSection
                        index={3}
                        id="independence"
                        title="Independence"
                        subtitle="Team access stands on its own."
                        stripeColor="#f97316"
                        isLast={true}
                    >
                        <div className="text-sm text-white/70 leading-relaxed space-y-4">
                            <p>
                                Team access stands on its own. It does not require driver accounts to function.
                            </p>
                            <p>
                                A team can operate the pit wall and coordinate strategy without every driver 
                                having their own Ok, Box Box account. The system adapts to how your team actually works.
                            </p>
                            <p>
                                Team access is also not a prerequisite for league access. 
                                Leagues can operate independently of teams using the system.
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
                            to="/pricing" 
                            className="btn btn-primary"
                        >
                            View Pricing
                        </Link>
                    </div>
                    <div className="flex flex-col items-center gap-3 mt-6">
                        <Link to="/driver" className="text-xs uppercase tracking-wider text-white/40 hover:text-[#3b82f6] transition-colors duration-150">Driver</Link>
                        <Link to="/league" className="text-xs uppercase tracking-wider text-white/40 hover:text-[#8b5cf6] transition-colors duration-150">League</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
