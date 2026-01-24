import { Link } from 'react-router-dom';

export function Contact() {
    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-16">
            <div className="max-w-lg mx-auto px-6 text-center">
                {/* Title */}
                <h1 
                    className="text-2xl uppercase tracking-[0.15em] font-semibold text-white mb-6"
                    style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                    Contact
                </h1>

                {/* Body */}
                <div className="text-sm text-white/70 leading-relaxed space-y-4 mb-8">
                    <p>
                        Ok, Box Box is currently in Winter Testing.
                    </p>
                    <p>
                        If you're interested in helping test,
                        have relevant experience to contribute,
                        or just want to say hello —
                        we'd be glad to hear from you.
                    </p>
                </div>

                {/* Contact options */}
                <div className="space-y-4 mb-10">
                    <a 
                        href="mailto:hello@okboxbox.com"
                        className="block py-3 px-6 border text-sm text-white hover:border-white/50 transition-colors duration-150"
                        style={{ borderColor: 'rgba(255,255,255,0.25)' }}
                    >
                        hello@okboxbox.com
                    </a>
                    <a 
                        href="#"
                        className="block py-3 px-6 border text-sm text-white hover:border-white/50 transition-colors duration-150"
                        style={{ borderColor: 'rgba(255,255,255,0.25)' }}
                    >
                        Discord
                    </a>
                </div>

                {/* Back link */}
                <Link 
                    to="/" 
                    className="text-xs uppercase tracking-wider text-white/50 hover:text-white/80 transition-colors duration-150"
                >
                    ← Back to home
                </Link>
            </div>
        </div>
    );
}
