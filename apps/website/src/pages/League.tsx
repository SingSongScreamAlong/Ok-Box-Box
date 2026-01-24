import { Link } from 'react-router-dom';
import { StackingSections, StackingSection } from '../components/StackingSections';

export function League() {
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
                    <source src="/videos/league-bg.mp4" type="video/mp4" />
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
                    <source src="/videos/league-bg.mp4" type="video/mp4" />
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
                        <div className="text-xs uppercase tracking-[0.15em] text-[#8b5cf6] mb-3">
                            Access Layer
                        </div>
                        <h1 
                            className="text-2xl uppercase tracking-[0.15em] font-semibold text-white mb-4"
                            style={{ fontFamily: 'Orbitron, sans-serif' }}
                        >
                            League
                        </h1>
                        <p className="text-sm text-white/70 leading-relaxed">
                            Stewarding. Incidents. Enforcement.<br />
                            Built for control.
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
                        subtitle="League access is built around control, accountability, and consistency."
                        stripeColor="#8b5cf6"
                    >
                        <div className="text-sm text-white/80 leading-relaxed space-y-4">
                            <p>
                                League access is built around control, accountability, and consistency.
                            </p>
                            <p>
                                League tools provide structured visibility into sessions, incidents, and enforcement decisions. 
                                Stewarding is supported by recorded data rather than incomplete reports or subjective interpretation.
                            </p>
                            <p>
                                Ok, Box Box helps leagues maintain consistency across events while reducing manual overhead for administrators.
                            </p>
                        </div>
                    </StackingSection>

                    <StackingSection
                        index={1}
                        id="what-you-get"
                        title="What You Get"
                        subtitle="Incident tracking, rulebook enforcement, and stewarding tools."
                        stripeColor="#8b5cf6"
                    >
                        <div className="text-sm text-white/80 leading-relaxed space-y-6">
                            <div>
                                <h3 className="text-xs uppercase tracking-wider text-white font-semibold mb-2">Incidents + Penalties</h3>
                                <p className="text-white/70">
                                    Structured incident tracking with full context. Review what happened, 
                                    who was involved, and make decisions based on data — not just driver reports.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-xs uppercase tracking-wider text-white font-semibold mb-2">Rulebook Enforcement</h3>
                                <p className="text-white/70">
                                    Codify your league's rules and apply them consistently. 
                                    The system helps ensure enforcement is neutral, transparent, and repeatable.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-xs uppercase tracking-wider text-white font-semibold mb-2">Stewarding Workflow</h3>
                                <p className="text-white/70">
                                    Purpose-built tools for stewards to review incidents, assign penalties, 
                                    and document decisions. Designed to reduce workload while improving quality.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-xs uppercase tracking-wider text-white font-semibold mb-2">Broadcast Coordination</h3>
                                <p className="text-white/70">
                                    Visibility into race state for broadcast teams. 
                                    Know what's happening across the field without relying on fragmented communication.
                                </p>
                            </div>
                        </div>
                    </StackingSection>

                    <StackingSection
                        index={2}
                        id="who-its-for"
                        title="Who It's For"
                        subtitle="Leagues that want credible competition with consistent officiating."
                        stripeColor="#8b5cf6"
                    >
                        <div className="text-sm text-white/80 leading-relaxed space-y-4">
                            <p>
                                Leagues that want credible competition — with consistent officiating and clean operations.
                            </p>
                            <p>
                                If you run events, enforce rules, and need accountability at scale, 
                                the league tier provides the oversight layer that driver and team tools do not.
                            </p>
                            <p className="text-white/60">
                                League features are intentionally separated from driver and team views, 
                                ensuring enforcement remains neutral, transparent, and fair.
                            </p>
                        </div>
                    </StackingSection>

                    <StackingSection
                        index={3}
                        id="independence"
                        title="Independence"
                        subtitle="League access stands on its own."
                        stripeColor="#8b5cf6"
                        isLast={true}
                    >
                        <div className="text-sm text-white/70 leading-relaxed space-y-4">
                            <p>
                                League access stands on its own. It does not require team or driver accounts to function.
                            </p>
                            <p>
                                A league can operate race control, review incidents, and enforce rules 
                                without teams or drivers using the system directly. The data flows through the Relay 
                                regardless of who has accounts.
                            </p>
                            <p>
                                League access is not an "upgrade" from team access. 
                                These are separate responsibilities with separate tools.
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
                        <Link to="/team" className="text-xs uppercase tracking-wider text-white/40 hover:text-[#f97316] transition-colors duration-150">Team</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
