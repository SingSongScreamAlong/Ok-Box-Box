import { Link } from 'react-router-dom';

export function DocsAbout() {
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
                    Understanding Ok, Box Box
                </h1>

                {/* Problem Framing */}
                <section className="mb-16">
                    <h2 
                        className="text-sm uppercase tracking-[0.12em] font-semibold text-white mb-6"
                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                        The Problem
                    </h2>
                    <div className="text-sm text-white/80 leading-relaxed space-y-4 border-l-2 border-white/10 pl-6">
                        <p>
                            Sim racing generates a significant amount of operational data.
                            Session results, lap times, incidents, telemetry, standings —
                            all of it exists, but rarely in a form that's easy to use.
                        </p>
                        <p>
                            For individual drivers, this data is scattered.
                            For teams, it's duplicated and inconsistent.
                            For leagues, it's often manual and error-prone.
                        </p>
                        <p>
                            The result is that most serious sim racers
                            spend time managing information
                            instead of acting on it.
                        </p>
                        <p className="text-white/60">
                            Ok, Box Box exists to solve this.
                        </p>
                    </div>
                </section>

                {/* System Philosophy */}
                <section className="mb-16">
                    <h2 
                        className="text-sm uppercase tracking-[0.12em] font-semibold text-white mb-6"
                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                        System Philosophy
                    </h2>
                    <div className="text-sm text-white/80 leading-relaxed space-y-4">
                        <p>
                            Ok, Box Box is not a telemetry overlay.
                            It is not a league management tool.
                            It is not a team communication app.
                        </p>
                        <p>
                            It is a racing operations system —
                            a shared foundation that connects
                            drivers, teams, and leagues
                            through consistent, trusted data.
                        </p>
                        <p>
                            The system is designed around a simple principle:
                            data should be collected once,
                            processed centrally,
                            and presented appropriately to each role.
                        </p>
                        <p className="text-white/60">
                            This means a driver's session data
                            can inform their own development,
                            support their team's strategy,
                            and feed into league-level race control —
                            without anyone entering the same information twice.
                        </p>
                    </div>
                </section>

                {/* System Layers */}
                <section className="mb-16">
                    <h2 
                        className="text-sm uppercase tracking-[0.12em] font-semibold text-white mb-6"
                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                        System Layers
                    </h2>
                    <div className="text-sm text-white/80 leading-relaxed space-y-4 mb-8">
                        <p>
                            Ok, Box Box is composed of three layers.
                            Each layer has a distinct responsibility.
                        </p>
                    </div>

                    <div className="space-y-8">
                        <div className="border-l-2 border-[#f97316]/50 pl-6">
                            <h3 className="text-xs uppercase tracking-wider text-white font-semibold mb-3">Relay</h3>
                            <div className="text-sm text-white/70 leading-relaxed space-y-3">
                                <p>
                                    The Relay is a lightweight application
                                    that runs on your local machine alongside iRacing.
                                </p>
                                <p>
                                    Its job is to observe sessions,
                                    capture relevant data,
                                    and transmit it securely to the platform.
                                </p>
                                <p className="text-white/50">
                                    The Relay does not modify iRacing.
                                    It does not inject data.
                                    It simply watches and reports.
                                </p>
                            </div>
                        </div>

                        <div className="border-l-2 border-[#3b82f6]/50 pl-6">
                            <h3 className="text-xs uppercase tracking-wider text-white font-semibold mb-3">Platform</h3>
                            <div className="text-sm text-white/70 leading-relaxed space-y-3">
                                <p>
                                    The platform is the central system
                                    that receives, processes, and stores race data.
                                </p>
                                <p>
                                    It handles identity, permissions, session history,
                                    and the coordination layer that connects users.
                                </p>
                                <p className="text-white/50">
                                    The platform is where data becomes useful —
                                    not just stored, but structured and accessible.
                                </p>
                            </div>
                        </div>

                        <div className="border-l-2 border-white/30 pl-6">
                            <h3 className="text-xs uppercase tracking-wider text-white font-semibold mb-3">Interfaces</h3>
                            <div className="text-sm text-white/70 leading-relaxed space-y-3">
                                <p>
                                    Interfaces are the surfaces through which users interact with the system.
                                </p>
                                <p>
                                    Each interface is purpose-built for a specific role:
                                    drivers see what drivers need,
                                    teams see what teams need,
                                    leagues see what leagues need.
                                </p>
                                <p className="text-white/50">
                                    The same underlying data powers all interfaces,
                                    but each view is tailored to its context.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Role-Based Impact */}
                <section className="mb-16">
                    <h2 
                        className="text-sm uppercase tracking-[0.12em] font-semibold text-white mb-6"
                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                        Role-Based Impact
                    </h2>
                    <div className="text-sm text-white/80 leading-relaxed space-y-4 mb-8">
                        <p>
                            Ok, Box Box supports three primary roles.
                            Each role has different needs,
                            and the system is designed to meet them without overlap or redundancy.
                        </p>
                    </div>

                    <div className="space-y-8">
                        <div>
                            <h3 className="text-xs uppercase tracking-wider text-white font-semibold mb-3">Driver</h3>
                            <div className="text-sm text-white/70 leading-relaxed space-y-3">
                                <p>
                                    Drivers are the foundation of the system.
                                    Every piece of data in Ok, Box Box
                                    originates from a driver's session.
                                </p>
                                <p>
                                    For drivers, the system provides:
                                    a persistent identity across sessions,
                                    a complete session history,
                                    and a structured view of their own development.
                                </p>
                                <p className="text-white/50">
                                    Drivers always begin with the Relay.
                                    Running the Relay is the entry point to the system.
                                </p>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xs uppercase tracking-wider text-white font-semibold mb-3">Team</h3>
                            <div className="text-sm text-white/70 leading-relaxed space-y-3">
                                <p>
                                    Teams operate through a shared pit wall —
                                    a coordinated view of strategy, timing, and driver status.
                                </p>
                                <p>
                                    For teams, the system provides:
                                    real-time visibility into driver sessions,
                                    shared operational context,
                                    and the ability to coordinate without external tools.
                                </p>
                                <p className="text-white/50">
                                    Teams benefit most when their drivers are already using the Relay.
                                    The team layer builds on driver data.
                                </p>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xs uppercase tracking-wider text-white font-semibold mb-3">League</h3>
                            <div className="text-sm text-white/70 leading-relaxed space-y-3">
                                <p>
                                    Leagues require oversight, accountability, and control.
                                    Ok, Box Box provides tools for stewarding, incident review,
                                    and enforcement.
                                </p>
                                <p>
                                    For leagues, the system provides:
                                    centralized race control,
                                    structured incident handling,
                                    and consistent application of rules.
                                </p>
                                <p className="text-white/50">
                                    League tools are designed for administrators,
                                    not participants.
                                    They assume driver and team data is already flowing.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Choosing the Right Level */}
                <section className="mb-16">
                    <h2 
                        className="text-sm uppercase tracking-[0.12em] font-semibold text-white mb-6"
                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                        Choosing the Right Level
                    </h2>
                    <div className="text-sm text-white/80 leading-relaxed space-y-4">
                        <p>
                            Not everyone needs every part of the system.
                        </p>
                        <p>
                            If you race alone and want to track your own progress,
                            the driver tier is sufficient.
                            You run the Relay, your sessions are recorded,
                            and you have a clear view of your history.
                        </p>
                        <p>
                            If you race with a team and need shared visibility,
                            the team tier adds coordination.
                            Your drivers run the Relay,
                            and your team operates from a shared pit wall.
                        </p>
                        <p>
                            If you run a league and need race control,
                            the league tier adds oversight.
                            Drivers and teams feed data into the system,
                            and you manage the competition from a central view.
                        </p>
                        <p className="text-white/60">
                            Each tier builds on the one before it.
                            The system is modular by design.
                        </p>
                    </div>
                </section>

                {/* Winter Testing Context */}
                <section className="mb-16">
                    <h2 
                        className="text-sm uppercase tracking-[0.12em] font-semibold text-white mb-6"
                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                        Winter Testing
                    </h2>
                    <div className="text-sm text-white/80 leading-relaxed space-y-4">
                        <p>
                            Ok, Box Box is currently in Winter Testing.
                        </p>
                        <p>
                            This is the foundational phase of the program.
                            Core architecture is being validated,
                            data flows are being tested,
                            and system boundaries are being established.
                        </p>
                        <p>
                            Access during Winter Testing is limited.
                            The focus is on correctness and stability,
                            not scale.
                        </p>
                        <p className="text-white/60">
                            If you're reading this documentation,
                            you're either part of the testing group
                            or evaluating whether Ok, Box Box is right for you.
                        </p>
                        <p className="text-white/60">
                            Either way, this documentation is here to help you understand
                            what the system is, how it works,
                            and what level of involvement makes sense.
                        </p>
                    </div>
                </section>

                {/* Closing */}
                <section className="mb-16 border-t border-white/10 pt-8">
                    <div className="text-sm text-white/70 leading-relaxed space-y-4">
                        <p>
                            Ok, Box Box is built for serious sim racers
                            who want operational clarity.
                        </p>
                        <p>
                            It is not a toy.
                            It is not a gimmick.
                            It is a system designed to do one thing well:
                            turn race data into shared understanding.
                        </p>
                        <p className="text-white/50">
                            If that sounds useful, you're in the right place.
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
