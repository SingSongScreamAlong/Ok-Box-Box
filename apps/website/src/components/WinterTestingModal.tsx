import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export function WinterTestingModal() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const seen = localStorage.getItem('winterTestingSeen');
        if (!seen) {
            setIsVisible(true);
        }
    }, []);

    const handleDismiss = () => {
        localStorage.setItem('winterTestingSeen', 'true');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* Backdrop overlay */}
            <div 
                className="absolute inset-0"
                style={{ background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(2px)' }}
            />

            {/* Panel */}
            <div 
                className="relative max-w-[520px] mx-4 border overflow-hidden"
                style={{ borderColor: 'rgba(255,255,255,0.08)' }}
            >
                {/* Background image inside panel */}
                <div 
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: 'url(/images/winter-testing-bg.jpg)' }}
                />
                <div className="absolute inset-0 bg-black/60" />

                <div className="relative p-8 text-center">
                    {/* Title */}
                    <h2 
                        className="text-white mb-4 uppercase tracking-[0.12em]"
                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                        Winter Testing
                    </h2>

                    {/* Body */}
                    <p className="text-white/90 text-sm leading-relaxed mb-3.5">
                        Ok, Box Box is currently in Winter Testing.
                    </p>
                    <p className="text-white/90 text-sm leading-relaxed mb-3.5">
                        Core foundations are being validated
                        and the system is being shaped deliberately.
                    </p>
                    <p className="text-white/90 text-sm leading-relaxed mb-3.5">
                        Access isn't broadly open yet.
                        That said, if you're interested in helping test,
                        or have relevant experience to contribute,
                        we'd genuinely be glad to hear from you.
                    </p>
                    <p className="text-white/75 text-sm leading-relaxed mb-6">
                        Thanks for stopping by and taking a look.
                    </p>

                    {/* Continue button */}
                    <button
                        onClick={handleDismiss}
                        className="bg-transparent border text-white py-2.5 px-4 cursor-pointer text-sm hover:border-white/50 transition-colors duration-150"
                        style={{ borderColor: 'rgba(255,255,255,0.25)' }}
                    >
                        Continue to site
                    </button>

                    {/* Contact link */}
                    <Link 
                        to="/contact" 
                        onClick={handleDismiss}
                        className="block mt-3 text-[0.9rem] text-white/65 no-underline hover:text-white/90 transition-colors duration-150"
                    >
                        Contact us
                    </Link>
                </div>
            </div>
        </div>
    );
}
