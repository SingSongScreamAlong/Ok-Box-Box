import { Link } from 'react-router-dom';

export function DocsPhases() {
    return (
        <div className="min-h-[calc(100vh-4rem)] py-16 bg-[#0a0a0a]">
            <div className="max-w-3xl mx-auto px-6">
                {/* Breadcrumb */}
                <div className="mb-8">
                    <Link to="/docs" className="text-xs uppercase tracking-wider text-white/40 hover:text-white/70 transition-colors duration-150">
                        ← Documentation
                    </Link>
                </div>

                {/* Page title */}
                <h1 
                    className="text-2xl uppercase tracking-[0.15em] font-semibold text-white mb-8"
                    style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                    Program Phases
                </h1>
                
                {/* Introduction */}
                <div className="text-sm text-white/80 leading-relaxed space-y-4 mb-16 border-l-2 border-white/20 pl-6">
                    <p>
                        Ok, Box Box is developed and released in defined phases, similar to how a real racing program is prepared, tested, and trusted over time.
                    </p>
                    <p>
                        Each phase focuses on validating a different part of the system. Progression is intentional. Phases advance only when the system proves itself under real use, not when it looks ready on paper.
                    </p>
                    <p className="text-white/60">
                        These phases exist to set expectations clearly for drivers, teams, and leagues about what is available, what is being tested, and how the platform is intended to be used at each stage.
                    </p>
                </div>

                {/* Winter Testing */}
                <section className="mb-12">
                    <h2 
                        className="text-sm uppercase tracking-[0.12em] font-semibold text-white mb-4"
                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                        Winter Testing <span className="text-[#f97316] ml-2">(Current)</span>
                    </h2>
                    <div className="text-sm text-white/80 leading-relaxed space-y-4 border-l-2 border-[#f97316]/50 pl-6">
                        <p>
                            Winter Testing is the foundational phase of the program.
                        </p>
                        <p>
                            During this phase, core architecture, data flow, identity, and system behavior are validated. Limited direct interaction with drivers, teams, and leagues is allowed, but only for concept testing and validation.
                        </p>
                        <p>
                            Winter Testing may include:
                        </p>
                        <ul className="list-disc list-inside text-white/70 space-y-1 ml-2">
                            <li>Limited driver usage</li>
                            <li>Read-only or preview team views</li>
                            <li>Guided league walkthroughs and concept reviews</li>
                        </ul>
                        <p className="text-white/60">
                            Winter Testing is not intended for live race operations, enforcement, or strategy execution. The goal is to ensure the system structure makes sense before it is trusted to run real decisions.
                        </p>
                    </div>
                </section>

                {/* FP1 */}
                <section className="mb-12">
                    <h2 
                        className="text-sm uppercase tracking-[0.12em] font-semibold text-white mb-4"
                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                        FP1 — Driver Systems
                    </h2>
                    <div className="text-sm text-white/80 leading-relaxed space-y-4 border-l-2 border-white/10 pl-6">
                        <p>
                            FP1 introduces controlled live use for drivers.
                        </p>
                        <p>
                            Drivers begin running the Relay in real sessions and using driver-facing views for continuity, telemetry, and session history. Team and league interaction remains limited or observational.
                        </p>
                        <p className="text-white/60">
                            FP1 exists to answer a simple question:<br />
                            <em>Does this system make sense for a driver to run every race?</em>
                        </p>
                    </div>
                </section>

                {/* FP2 */}
                <section className="mb-12">
                    <h2 
                        className="text-sm uppercase tracking-[0.12em] font-semibold text-white mb-4"
                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                        FP2 — Team and Coordination Systems
                    </h2>
                    <div className="text-sm text-white/80 leading-relaxed space-y-4 border-l-2 border-white/10 pl-6">
                        <p>
                            FP2 expands the system into active team usage.
                        </p>
                        <p>
                            Team pit wall features, multi-driver coordination, spotter and engineer workflows, and strategy surfaces are enabled for real racing scenarios.
                        </p>
                        <p>
                            This phase validates the system when multiple people depend on it at the same time.
                        </p>
                        <p className="text-white/60">
                            FP2 exists to answer:<br />
                            <em>Can teams actually operate races on this system without added friction?</em>
                        </p>
                    </div>
                </section>

                {/* FP3 */}
                <section className="mb-12">
                    <h2 
                        className="text-sm uppercase tracking-[0.12em] font-semibold text-white mb-4"
                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                        FP3 — League and Control Systems
                    </h2>
                    <div className="text-sm text-white/80 leading-relaxed space-y-4 border-l-2 border-white/10 pl-6">
                        <p>
                            FP3 focuses on authority, consistency, and trust.
                        </p>
                        <p>
                            League tools move into live use, including stewarding, incident review, rule enforcement, and race control coordination. Long-session behavior and scale are exercised heavily.
                        </p>
                        <p className="text-white/60">
                            FP3 exists to answer:<br />
                            <em>Can organizations trust this system with fairness and control?</em>
                        </p>
                    </div>
                </section>

                {/* Qualifying */}
                <section className="mb-12">
                    <h2 
                        className="text-sm uppercase tracking-[0.12em] font-semibold text-white mb-4"
                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                        Qualifying — Release Readiness
                    </h2>
                    <div className="text-sm text-white/80 leading-relaxed space-y-4 border-l-2 border-white/10 pl-6">
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
                </section>

                {/* Race */}
                <section className="mb-12">
                    <h2 
                        className="text-sm uppercase tracking-[0.12em] font-semibold text-white mb-4"
                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                        Race — Version 1
                    </h2>
                    <div className="text-sm text-white/80 leading-relaxed space-y-4 border-l-2 border-white/10 pl-6">
                        <p>
                            Race marks full availability.
                        </p>
                        <p>
                            All systems are enabled, access is open, and Ok, Box Box is considered ready for full-time use by drivers, teams, and leagues.
                        </p>
                        <p className="text-white/60">
                            Ongoing improvements continue, but the operational foundation is complete.
                        </p>
                    </div>
                </section>

                {/* Notes on Phases */}
                <section className="mb-16 border-t border-white/10 pt-8">
                    <h2 
                        className="text-sm uppercase tracking-[0.12em] font-semibold text-white mb-4"
                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                        Notes on Phases
                    </h2>
                    <div className="text-sm text-white/70 leading-relaxed space-y-4">
                        <p>
                            Phases are not time-based.<br />
                            Progression depends on validation, not schedules.
                        </p>
                        <p>
                            Not every user will experience every phase.<br />
                            Access is aligned with readiness and use case.
                        </p>
                        <p className="text-white/60">
                            Program phases exist to provide clarity, not restriction.<br />
                            Each phase answers a different question on the path to a trusted racing operations platform.
                        </p>
                    </div>
                </section>

                {/* Status footer */}
                <div className="border-t border-white/10 pt-8 text-center">
                    <p className="text-xs text-white/40">
                        Winter Testing
                    </p>
                </div>
            </div>
        </div>
    );
}
