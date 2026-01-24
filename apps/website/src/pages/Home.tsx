import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

function SystemSection() {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <section 
            className="relative py-20 overflow-hidden"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Background image */}
            <div 
                className="absolute inset-0 bg-no-repeat transition-all duration-700 ease-out"
                style={{ 
                    backgroundImage: 'url(/images/system-bg.jpg)', 
                    backgroundPosition: '20% 90%', 
                    backgroundSize: '145%',
                    filter: isHovered ? 'brightness(1.15)' : 'brightness(1)'
                }}
            />
            <div className={`absolute inset-0 transition-opacity duration-700 ease-out ${isHovered ? 'bg-black/60' : 'bg-black/70'}`} />

            <div className="max-w-5xl mx-auto px-6 relative z-10">
                {/* Section label */}
                <div className="text-xs uppercase tracking-[0.2em] text-white/80 mb-12 text-center" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                    The System
                </div>

                {/* Three pillars */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                    <Link to="/driver" className="text-center hover:translate-y-[-2px] transition-transform duration-150 group cursor-pointer">
                        <div className="text-sm uppercase tracking-[0.2em] font-semibold text-white mb-3 group-hover:text-[#3b82f6] transition-colors duration-150" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>Driver</div>
                        <p className="text-base text-white/80 leading-relaxed" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                            Identity. Telemetry. Sessions.<br />
                            Starts with the Relay.
                        </p>
                    </Link>
                    <Link to="/team" className="text-center hover:translate-y-[-2px] transition-transform duration-150 group cursor-pointer">
                        <div className="text-sm uppercase tracking-[0.2em] font-semibold text-white mb-3 group-hover:text-[#f97316] transition-colors duration-150" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>Team</div>
                        <p className="text-base text-white/80 leading-relaxed" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                            Strategy. Timing. Coordination.<br />
                            One shared pit wall.
                        </p>
                    </Link>
                    <Link to="/league" className="text-center hover:translate-y-[-2px] transition-transform duration-150 group cursor-pointer">
                        <div className="text-sm uppercase tracking-[0.2em] font-semibold text-white mb-3 group-hover:text-[#8b5cf6] transition-colors duration-150" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>League</div>
                        <p className="text-base text-white/80 leading-relaxed" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                            Stewarding. Incidents. Enforcement.<br />
                            Built for control.
                        </p>
                    </Link>
                </div>

                {/* Final action band */}
                <div className="border-t border-white/10 pt-8 text-center">
                    <p className="text-base text-white/70 mb-6" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>Start with the Relay. Scale when you're ready.</p>
                    <div className="flex gap-4 justify-center">
                        <a href="/download-relay" className="text-xs uppercase tracking-wider text-white/60 hover:text-white transition-colors duration-150">Download Relay</a>
                        <span className="text-white/20">|</span>
                        <a href="/pricing" className="text-xs uppercase tracking-wider text-white/60 hover:text-white transition-colors duration-150">View Pricing</a>
                    </div>
                </div>
            </div>
        </section>
    );
}

export function Home() {
    const [videosLoaded, setVideosLoaded] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const heroRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const timer = setTimeout(() => setVideosLoaded(true), 100);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!heroRef.current) return;
            const rect = heroRef.current.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            setMousePos({ x, y });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div className="flex flex-col">
            {/* HERO SECTION */}
            <section ref={heroRef} className="relative py-24 border-b border-[--border-hard] overflow-hidden bg-[#111]">
                {/* Video backgrounds - equal thirds grid */}
                <div 
                    className={`absolute inset-0 grid grid-cols-3 transition-opacity duration-500 ${videosLoaded ? 'opacity-100' : 'opacity-0'}`}
                >
                    {/* Left video */}
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                        style={{ transform: `translate(${mousePos.x * -15}px, ${mousePos.y * -10}px) scale(1.1)` }}
                        onLoadedMetadata={(e) => { (e.target as HTMLVideoElement).playbackRate = 0.5; }}
                    >
                        <source src="/videos/bg-2.mp4" type="video/mp4" />
                    </video>
                    {/* Center video */}
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                        style={{ transform: `translate(${mousePos.x * -20}px, ${mousePos.y * -15}px) scale(1.1)` }}
                    >
                        <source src="/videos/bg-1.mp4" type="video/mp4" />
                    </video>
                    {/* Right video */}
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                        style={{ transform: `translate(${mousePos.x * -12}px, ${mousePos.y * -8}px) scale(1.1)`, objectPosition: 'center 70%' }}
                    >
                        <source src="/videos/bg-3.mp4" type="video/mp4" />
                    </video>
                </div>

                {/* Subtle dark vignette for depth */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30 pointer-events-none" />

                <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
                    <div className="inline-block bg-white/40 backdrop-blur-md p-8 md:p-10 shadow-2xl" style={{ backdropFilter: 'blur(12px) grayscale(0.3)' }}>
                        {/* Triple stripe logo */}
                        <div className="flex gap-3 mb-6">
                            <div className="w-6 h-20 bg-white rounded-full transform rotate-12"></div>
                            <div className="w-6 h-20 bg-[#3b82f6] rounded-full transform rotate-12"></div>
                            <div className="w-6 h-20 bg-[#f97316] rounded-full transform rotate-12"></div>
                        </div>

                        <h1 className="text-5xl md:text-6xl font-bold tracking-wide mb-5 leading-[1.1] text-[#1a1a1a]" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                            Driver Identity.
                            <br />
                            Team Strategy.
                            <br />
                            League Operations.
                        </h1>

                        <p className="text-base text-[#555] mb-8 max-w-lg leading-relaxed">
                            Ok, Box Box is the Racing Operations System for iRacing.
                            Driver surfaces, team pit wall, and league race control — all in one platform.
                        </p>

                        <div className="flex gap-4">
                            <a href="/download-relay" className="btn btn-primary">
                                Download Relay
                            </a>
                            <a href="/pricing" className="btn btn-outline">
                                View Pricing
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* THE SYSTEM */}
            <SystemSection />
        </div>
    );
}
