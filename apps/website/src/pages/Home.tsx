import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

function HowItWorksSection() {
    const steps = [
        {
            number: '01',
            title: 'Install Relay',
            description: 'Install the lightweight local agent that captures live session telemetry.',
            image: '/images/how-it-works/relay-install.jpg'
        },
        {
            number: '02',
            title: 'Launch iRacing',
            description: 'Start your session. Relay activates automatically.',
            image: '/images/how-it-works/iracing-launch.jpg'
        },
        {
            number: '03',
            title: 'Live Operations Surface',
            description: 'Driver, Team, or League surfaces activate in real time.',
            image: '/images/how-it-works/live-surface.jpg'
        },
        {
            number: '04',
            title: 'Post-Session Intelligence',
            description: 'Structured session reports for review and development.',
            image: '/images/how-it-works/post-session.jpg'
        }
    ];

    return (
        <section className="py-20 bg-[#0a0a0a] border-b border-white/5">
            <div className="max-w-6xl mx-auto px-6">
                <div className="text-xs uppercase tracking-[0.2em] text-white/50 mb-4 text-center">
                    How It Works
                </div>
                <h2 className="text-2xl font-semibold text-white mb-16 text-center" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    How Ok, Box Box Works
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {steps.map((step, index) => (
                        <div key={index} className="relative">
                            <div className="aspect-[4/3] bg-[#151515] border border-white/10 mb-4 overflow-hidden">
                                <div 
                                    className="w-full h-full bg-cover bg-center"
                                    style={{ 
                                        backgroundImage: `url(${step.image})`,
                                        filter: 'blur(1px) brightness(0.8)'
                                    }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
                            </div>
                            <div className="text-[10px] text-[#f97316] font-mono mb-2">{step.number}</div>
                            <h3 className="text-sm font-semibold text-white mb-2 uppercase tracking-wider">{step.title}</h3>
                            <p className="text-xs text-white/60 leading-relaxed">{step.description}</p>
                            {index < steps.length - 1 && (
                                <div className="hidden md:block absolute top-[20%] right-0 translate-x-1/2 text-white/20">→</div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function SystemSection() {
    const [isHovered, setIsHovered] = useState(false);

    const pillars = [
        {
            title: 'Driver',
            color: '#3b82f6',
            tagline: 'Identity. Intelligence. Development.',
            subtitle: 'Your crew is always on.',
            link: '/driver',
            image: '/images/system/driver-surface.jpg',
            bullets: [
                'Live stint tracking',
                'Incident timeline',
                'Structured session breakdown'
            ]
        },
        {
            title: 'Team',
            color: '#f97316',
            tagline: 'Strategy. Timing. Coordination.',
            subtitle: 'One shared pit wall.',
            link: '/team',
            image: '/images/system/team-surface.jpg',
            bullets: [
                'Shared pit wall timing',
                'Fuel and stint coordination',
                'Real-time strategy updates'
            ]
        },
        {
            title: 'League',
            color: '#8b5cf6',
            tagline: 'Stewarding. Incidents. Enforcement.',
            subtitle: 'Built for control.',
            link: '/league',
            image: '/images/system/league-surface.jpg',
            bullets: [
                'Incident queue workflow',
                'Replay review tools',
                'Logged penalty issuance'
            ]
        }
    ];

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

            <div className="max-w-6xl mx-auto px-6 relative z-10">
                {/* Section label */}
                <div className="text-xs uppercase tracking-[0.2em] text-white/80 mb-12 text-center" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                    The System
                </div>

                {/* Three pillars with screenshots and bullets */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                    {pillars.map((pillar, index) => (
                        <Link 
                            key={index}
                            to={pillar.link} 
                            className="group cursor-pointer"
                        >
                            {/* Screenshot */}
                            <div className="aspect-[16/10] bg-[#151515] border border-white/10 mb-4 overflow-hidden">
                                <div 
                                    className="w-full h-full bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                                    style={{ 
                                        backgroundImage: `url(${pillar.image})`,
                                        filter: 'blur(0.5px) brightness(0.9)'
                                    }}
                                />
                            </div>
                            
                            {/* Title and tagline */}
                            <div className="text-center mb-4">
                                <div 
                                    className="text-sm uppercase tracking-[0.2em] font-semibold text-white mb-2 transition-colors duration-150" 
                                    style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)', color: isHovered ? pillar.color : 'white' }}
                                >
                                    {pillar.title}
                                </div>
                                <p className="text-sm text-white/80 leading-relaxed" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                                    {pillar.tagline}<br />
                                    {pillar.subtitle}
                                </p>
                            </div>

                            {/* Bullet points */}
                            <ul className="space-y-2">
                                {pillar.bullets.map((bullet, i) => (
                                    <li key={i} className="flex items-center gap-2 text-xs text-white/60">
                                        <span className="w-1 h-1 rounded-full" style={{ backgroundColor: pillar.color }} />
                                        {bullet}
                                    </li>
                                ))}
                            </ul>
                        </Link>
                    ))}
                </div>

                {/* Final action band */}
                <div className="border-t border-white/10 pt-8 text-center">
                    <p className="text-base text-white/70 mb-6" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>Start with the Relay. Scale when you're ready.</p>
                    <div className="flex gap-4 justify-center">
                        <a href="/download" className="text-xs uppercase tracking-wider text-white/60 hover:text-white transition-colors duration-150">Download Relay</a>
                        <span className="text-white/20">|</span>
                        <a href="/pricing" className="text-xs uppercase tracking-wider text-white/60 hover:text-white transition-colors duration-150">View Pricing</a>
                    </div>
                </div>
            </div>
        </section>
    );
}

function ArchitectureSection() {
    const layers = [
        { label: 'iRacing', color: '#ffffff' },
        { label: 'Relay (Local Agent)', color: '#f97316' },
        { label: 'Secure Session Stream', color: '#3b82f6' },
        { label: 'Ok, Box Box Cloud', color: '#8b5cf6' },
        { label: 'Driver / Team / League Surfaces', color: '#ffffff' }
    ];

    return (
        <section className="py-20 bg-[#080808] border-b border-white/5">
            <div className="max-w-4xl mx-auto px-6">
                <div className="text-xs uppercase tracking-[0.2em] text-white/50 mb-4 text-center">
                    Architecture
                </div>
                <h2 className="text-2xl font-semibold text-white mb-16 text-center" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    The Operational Stack
                </h2>

                {/* Vertical stack diagram */}
                <div className="flex flex-col items-center gap-2 mb-12">
                    {layers.map((layer, index) => (
                        <div key={index} className="flex flex-col items-center">
                            <div 
                                className="px-8 py-3 border text-xs uppercase tracking-wider font-medium text-center min-w-[280px]"
                                style={{ 
                                    borderColor: `${layer.color}40`,
                                    color: layer.color,
                                    backgroundColor: `${layer.color}08`
                                }}
                            >
                                {layer.label}
                            </div>
                            {index < layers.length - 1 && (
                                <div className="text-white/30 text-lg py-1">↓</div>
                            )}
                        </div>
                    ))}
                </div>

                <p className="text-sm text-white/60 text-center max-w-xl mx-auto leading-relaxed">
                    Relay captures live session data locally and securely streams it into the Ok, Box Box operations layer.
                </p>
            </div>
        </section>
    );
}

function RaceConditionsSection() {
    const features = [
        {
            title: 'Low-Latency Session Streaming',
            description: 'Designed for live race environments.'
        },
        {
            title: 'Session Integrity & Logging',
            description: 'Persistent session capture with structured review.'
        },
        {
            title: 'Driver Data Ownership',
            description: 'Relay does not modify sim files. Drivers retain control of their data.'
        }
    ];

    return (
        <section className="py-20 bg-[#0a0a0a] border-b border-white/5">
            <div className="max-w-5xl mx-auto px-6">
                <div className="text-xs uppercase tracking-[0.2em] text-white/50 mb-4 text-center">
                    Infrastructure
                </div>
                <h2 className="text-2xl font-semibold text-white mb-16 text-center" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    Built for Race Conditions
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <div key={index} className="text-center">
                            <h3 className="text-xs uppercase tracking-wider font-semibold text-white mb-3">
                                {feature.title}
                            </h3>
                            <p className="text-sm text-white/60 leading-relaxed">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function WhySection() {
    return (
        <section className="py-20 bg-[#080808] border-b border-white/5">
            <div className="max-w-3xl mx-auto px-6 text-center">
                <div className="text-xs uppercase tracking-[0.2em] text-white/50 mb-4">
                    Purpose
                </div>
                <h2 className="text-2xl font-semibold text-white mb-8" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    Why Ok, Box Box Exists
                </h2>

                <div className="text-base text-white/70 leading-relaxed space-y-4">
                    <p>Sim racing evolved. Operations did not.</p>
                    <p className="text-white/50">Scattered tools. Disconnected strategy. No unified race control.</p>
                    <p className="text-white font-medium">Ok, Box Box is the missing operational layer.</p>
                </div>
            </div>
        </section>
    );
}

function VideoDemoSection() {
    return (
        <section className="py-20 bg-[#0a0a0a] border-b border-white/5">
            <div className="max-w-4xl mx-auto px-6">
                <div className="text-xs uppercase tracking-[0.2em] text-white/50 mb-4 text-center">
                    Demo
                </div>
                <h2 className="text-2xl font-semibold text-white mb-12 text-center" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    See It In Action
                </h2>

                <div className="aspect-video bg-[#151515] border border-white/10 overflow-hidden">
                    <video
                        className="w-full h-full object-cover"
                        controls
                        muted
                        playsInline
                        poster="/images/demo-poster.jpg"
                    >
                        <source src="/videos/okboxbox-demo.mp4" type="video/mp4" />
                        <div className="flex items-center justify-center h-full text-white/40 text-sm">
                            Video demo coming soon
                        </div>
                    </video>
                </div>

                <p className="text-xs text-white/40 text-center mt-4">
                    60-second overview of the Ok, Box Box operations system.
                </p>
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
            <section ref={heroRef} className="relative py-24 border-b border-white/5 overflow-hidden bg-[#111]">
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
                            <a href="/download" className="btn btn-primary">
                                Download Relay
                            </a>
                            <a href="/pricing" className="btn btn-outline">
                                View Pricing
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* HOW IT WORKS */}
            <HowItWorksSection />

            {/* THE SYSTEM */}
            <SystemSection />

            {/* ARCHITECTURE */}
            <ArchitectureSection />

            {/* BUILT FOR RACE CONDITIONS */}
            <RaceConditionsSection />

            {/* VIDEO DEMO */}
            <VideoDemoSection />

            {/* WHY OK, BOX BOX EXISTS */}
            <WhySection />
        </div>
    );
}
