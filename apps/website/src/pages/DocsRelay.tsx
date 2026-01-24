import { Link } from 'react-router-dom';

export function DocsRelay() {
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
                    Relay Overview
                </h1>
                
                {/* Introduction */}
                <div className="text-sm text-white/80 leading-relaxed space-y-4 mb-16 border-l-2 border-[#f97316]/50 pl-6">
                    <p>
                        The Relay is the local data bridge between iRacing
                        and the Ok, Box Box platform.
                    </p>
                    <p>
                        All data collection begins here.
                    </p>
                    <p>
                        The Relay runs alongside iRacing
                        and is responsible for observing, capturing,
                        and transmitting session data to the platform
                        in real time.
                    </p>
                    <p className="text-white/60">
                        Without the Relay, Ok, Box Box has no visibility
                        into a driver's sessions.
                    </p>
                </div>

                {/* Why the Relay Exists */}
                <section className="mb-16">
                    <h2 
                        className="text-sm uppercase tracking-[0.12em] font-semibold text-white mb-6"
                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                        Why the Relay Exists
                    </h2>
                    <div className="text-sm text-white/80 leading-relaxed space-y-4">
                        <p>
                            iRacing exposes live session data locally.
                        </p>
                        <p>
                            The Relay exists to interface with that data safely,
                            consistently, and predictably.
                        </p>
                        <p>
                            Rather than embedding logic directly into the platform,
                            Ok, Box Box uses the Relay to separate
                            data collection from data processing.
                        </p>
                        <p className="text-white/60">
                            This separation allows the system to remain modular,
                            stable, and scalable.
                        </p>
                    </div>
                </section>

                {/* What the Relay Does */}
                <section className="mb-16">
                    <h2 
                        className="text-sm uppercase tracking-[0.12em] font-semibold text-white mb-6"
                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                        What the Relay Does
                    </h2>
                    <div className="text-sm text-white/80 leading-relaxed space-y-4">
                        <p>At a high level, the Relay is responsible for:</p>
                        <ul className="space-y-2 text-white/70 ml-4">
                            <li>- Connecting to iRacing's local telemetry and session data</li>
                            <li>- Observing live and completed sessions</li>
                            <li>- Packaging relevant data for transmission</li>
                            <li>- Sending data securely to the Ok, Box Box platform</li>
                        </ul>
                        <p className="text-white/60 pt-2">
                            The Relay does not make strategic decisions.
                            It does not modify sessions.
                            It does not interfere with iRacing.
                        </p>
                        <p className="text-white/60">
                            Its role is observational and transport-focused.
                        </p>
                    </div>
                </section>

                {/* What the Relay Does Not Do */}
                <section className="mb-16">
                    <h2 
                        className="text-sm uppercase tracking-[0.12em] font-semibold text-white mb-6"
                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                        What the Relay Does Not Do
                    </h2>
                    <div className="text-sm text-white/80 leading-relaxed space-y-4">
                        <p>The Relay does not:</p>
                        <ul className="space-y-2 text-white/70 ml-4">
                            <li>- Control the simulation</li>
                            <li>- Inject data into iRacing</li>
                            <li>- Provide user-facing analysis</li>
                            <li>- Replace iRacing tooling</li>
                            <li>- Act as a standalone product</li>
                        </ul>
                        <p className="text-white/60 pt-2">
                            The Relay exists solely to enable
                            everything that follows.
                        </p>
                    </div>
                </section>

                {/* Why Everything Starts With the Relay */}
                <section className="mb-16">
                    <h2 
                        className="text-sm uppercase tracking-[0.12em] font-semibold text-white mb-6"
                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                        Why Everything Starts With the Relay
                    </h2>
                    <div className="text-sm text-white/80 leading-relaxed space-y-4">
                        <p>
                            Ok, Box Box is built around a shared operational foundation.
                        </p>
                        <p>
                            That foundation begins with consistent, trusted data.
                        </p>
                        <p>
                            By requiring the Relay as the entry point,
                            the platform can provide:
                        </p>
                        <ul className="space-y-2 text-white/70 ml-4">
                            <li>- Accurate session history</li>
                            <li>- Reliable telemetry</li>
                            <li>- Shared views across drivers, teams, and leagues</li>
                            <li>- Consistent interpretation of race events</li>
                        </ul>
                        <p className="text-white/60 pt-2">
                            Every interface in Ok, Box Box
                            assumes the presence of Relay data.
                        </p>
                    </div>
                </section>

                {/* Running the Relay */}
                <section className="mb-16">
                    <h2 
                        className="text-sm uppercase tracking-[0.12em] font-semibold text-white mb-6"
                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                        Running the Relay
                    </h2>
                    <div className="text-sm text-white/80 leading-relaxed space-y-4">
                        <p>
                            During Winter Testing,
                            the Relay is provided to a limited group of testers.
                        </p>
                        <p>
                            Running the Relay indicates participation
                            in the Ok, Box Box data pipeline.
                        </p>
                        <p className="text-white/60">
                            Details on installation, configuration,
                            and supported environments
                            will be provided as access expands.
                        </p>
                    </div>
                </section>

                {/* Closing */}
                <section className="mb-16 border-t border-white/10 pt-8">
                    <div className="text-sm text-white/70 leading-relaxed space-y-4">
                        <p>
                            The Relay is intentionally simple.
                        </p>
                        <p>
                            Its responsibility is narrow,
                            but foundational.
                        </p>
                        <p className="text-white/60">
                            Once the Relay is running,
                            the rest of the Ok, Box Box system
                            can operate as designed.
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
