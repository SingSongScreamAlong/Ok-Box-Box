import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface ExpanderProps {
    title: string;
    children: React.ReactNode;
    accentColor: string;
}

function Expander({ title, children, accentColor }: ExpanderProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border-t border-white/10">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between py-3 text-left hover:bg-white/5 transition-colors"
            >
                <span className="text-xs text-white/60">{title}</span>
                <ChevronDown 
                    size={14} 
                    className={`text-white/40 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    style={{ color: isOpen ? accentColor : undefined }}
                />
            </button>
            {isOpen && (
                <div className="pb-3 text-xs text-white/50 leading-relaxed">
                    {children}
                </div>
            )}
        </div>
    );
}

function IndependentAccessSection() {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const handleClick = () => {
        setIsExpanded(!isExpanded);
        if (!isExpanded) {
            videoRef.current?.play();
        } else {
            videoRef.current?.pause();
        }
    };

    const handleMouseEnter = () => {
        setIsHovered(true);
        videoRef.current?.play();
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        if (!isExpanded) {
            videoRef.current?.pause();
        }
    };

    return (
        <div 
            className={`mt-10 border border-white/10 p-6 cursor-pointer transition-colors duration-200 relative overflow-hidden ${isExpanded ? 'bg-[#080808]' : 'bg-[#0d0d0d]'}`}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Background video */}
            <video
                ref={videoRef}
                loop
                muted
                playsInline
                preload="auto"
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isExpanded || isHovered ? 'opacity-80' : 'opacity-20'}`}
                style={{ objectPosition: '50% 40%' }}
            >
                <source src="/videos/independent-access.mp4" type="video/mp4" />
            </video>
            <div className={`absolute inset-0 transition-opacity duration-300 ${isHovered || isExpanded ? 'bg-black/40' : 'bg-black/60'}`} />
            
            <div className="max-w-[65ch] mx-auto relative z-10">
                {/* Header row with chevron */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <div 
                            className="text-xs uppercase tracking-[0.12em] font-semibold text-white mb-3" 
                            style={{ fontFamily: 'Orbitron, sans-serif' }}
                        >
                            Each access level stands on its own.
                        </div>
                        <p className="text-sm text-white leading-relaxed" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                            Driver, Team, and League access are independent. You only need the level that matches your responsibility in racing.
                        </p>
                        <p className="text-sm text-white/70 mt-2" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                            Start where it makes sense. Expand only if your role changes.
                        </p>
                    </div>
                    <ChevronDown 
                        size={16} 
                        className={`text-white/40 flex-shrink-0 mt-1 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    />
                </div>

                {/* Expanded content */}
                <div 
                    className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[600px] opacity-100 mt-6' : 'max-h-0 opacity-0 mt-0'}`}
                >
                    <div className="border-t border-white/10 pt-6 space-y-4 text-sm text-white/80 leading-relaxed" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                        <p>Ok, Box Box is not sold as stacked tiers.</p>
                        <p>Each access level maps to a different responsibility in racing — not a feature ladder.</p>
                        
                        <div className="space-y-2 py-2">
                            <p><span className="text-white">Drivers</span> use Ok, Box Box to manage personal performance, telemetry, and session history.</p>
                            <p><span className="text-white">Teams</span> use it to coordinate strategy, timing, and shared decision-making.</p>
                            <p><span className="text-white">Leagues</span> use it to run events, enforce rules, and manage incidents at scale.</p>
                        </div>

                        <p>These roles do not depend on one another.</p>

                        <ul className="space-y-1 text-white/60 ml-4">
                            <li>• Teams do not require driver accounts.</li>
                            <li>• Leagues do not require team or driver access unless they choose to use it.</li>
                        </ul>

                        <p className="text-white/60 pt-2">
                            Access is granted based on what you are responsible for — not what you might need later.
                        </p>
                        <p className="text-white/50">
                            If responsibilities change, access can be added later. Nothing needs to be decided up front.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface PricingCardProps {
    tier: string;
    price: string;
    pricePeriod?: string;
    accentColor: string;
    videoSrc: string;
    videoPosition?: string;
    isRecommended?: boolean;
    bullets: string[];
    ctaText: string;
    ctaStyle: 'primary' | 'outline';
    expanders: { title: string; content: string; showCta?: boolean }[];
    videosReady?: boolean;
}

function PricingCard({ 
    tier, 
    price, 
    pricePeriod,
    accentColor, 
    videoSrc,
    videoPosition = 'center',
    isRecommended, 
    bullets, 
    ctaText, 
    ctaStyle,
    expanders,
    videosReady = false
}: PricingCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [videoReady, setVideoReady] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Wait for video to be fully ready with correct position before showing
    const handleCanPlay = () => {
        if (videoRef.current && !videoReady) {
            videoRef.current.currentTime = 1;
            // Longer delay to ensure objectPosition is fully applied
            setTimeout(() => setVideoReady(true), 150);
        }
    };

    const handleMouseEnter = () => {
        setIsHovered(true);
        if (videoRef.current) {
            videoRef.current.playbackRate = tier === 'Team' ? 0.8 : 1;
            videoRef.current.play();
        }
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        videoRef.current?.pause();
    };

    return (
        <div 
            className={`relative overflow-hidden bg-[#0d0d0d] border ${isRecommended ? 'border-[#f97316]' : 'border-white/10'} flex flex-col`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Background video */}
            <div className="absolute inset-0 z-0">
                <video
                    ref={videoRef}
                    loop
                    muted
                    playsInline
                    preload="auto"
                    onCanPlay={handleCanPlay}
                    className={`h-full w-full object-cover transition-opacity duration-500 ${!videosReady || !videoReady ? 'opacity-0' : isHovered ? 'opacity-90' : 'opacity-20'}`}
                    style={{ objectPosition: videoPosition }}
                >
                    <source src={videoSrc} type="video/mp4" />
                </video>
                <div 
                    className="absolute inset-0" 
                    style={{ background: 'linear-gradient(to top, #0d0d0d 20%, transparent 100%)' }}
                ></div>
            </div>

            {/* Content */}
            <div className="relative z-10 p-10 flex flex-col flex-1" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                {isRecommended && (
                    <div className="absolute top-0 right-0 bg-[#f97316] text-white text-[9px] font-semibold px-2 py-1 uppercase tracking-wider">
                        Recommended
                    </div>
                )}
                
                <div 
                    className="text-[10px] uppercase tracking-[0.15em] font-medium mb-1"
                    style={{ color: accentColor }}
                >
                    {tier}
                </div>
                <div className="text-4xl font-bold mb-2" style={{ color: accentColor }}>
                    {price}<span className="text-sm font-normal text-white/40 ml-1">/mo</span>
                </div>
                {pricePeriod && (
                    <div className="text-[10px] uppercase tracking-[0.1em] text-white/40 mb-5">{pricePeriod}</div>
                )}
                {!pricePeriod && <div className="mb-5"></div>}
                
                <ul className="flex-1 space-y-4 mb-10 text-base text-white/70">
                    {bullets.map((bullet, i) => (
                        <li key={i} className="flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full" style={{ backgroundColor: accentColor }}></div>
                            {bullet}
                        </li>
                    ))}
                </ul>
                
                {/* Expanders */}
                <div className="mt-auto">
                    {expanders.map((exp, i) => (
                        <Expander key={i} title={exp.title} accentColor={accentColor}>
                            {exp.content}
                            {exp.showCta && (
                                <button 
                                    className="w-full mt-4 py-3 text-xs font-semibold uppercase tracking-wider bg-[#f97316] text-white hover:bg-[#ea580c] transition-colors duration-150"
                                >
                                    Start Trial
                                </button>
                            )}
                        </Expander>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function Pricing() {
    const [videosReady, setVideosReady] = useState(false);

    // Fade in all videos together after a short delay
    useEffect(() => {
        const timer = setTimeout(() => setVideosReady(true), 200);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="min-h-screen py-12 bg-[#0a0a0a]">
            <div className="max-w-7xl mx-auto px-6">
                {/* Header */}
                <div className="text-center mb-10">
                    <h1 
                        className="text-2xl uppercase tracking-[0.15em] font-semibold text-white mb-3"
                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                        Pricing
                    </h1>
                    <p className="text-sm text-white/60">Season-first pricing for drivers, teams, and leagues.</p>
                </div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[85vh]">
                    <PricingCard
                        tier="Driver"
                        price="$14"
                        accentColor="#3b82f6"
                        videoSrc="/videos/pricing-driver.mp4"
                        videoPosition="30% center"
                        videosReady={videosReady}
                        bullets={[
                            "Driver IDP + session history",
                            "Telemetry + trends over time",
                            "Driver views",
                            "Relay connectivity"
                        ]}
                        ctaText="Get Started"
                        ctaStyle="outline"
                        expanders={[
                            { title: "What you get", content: "Driver access is built around continuity. Your sessions, telemetry, and results stay connected across tracks and seasons so you can review patterns, compare runs, and understand what actually improved your pace." },
                            { title: "Who it's for", content: "Drivers who want progress that carries forward — not one-off sessions." },
                            { title: "Trial access", content: "During testing phases, driver trials are rate-limited and focused on core driver workflows. You'll be able to connect the Relay, view key driver screens, and validate the experience without full access to team or league operations.", showCta: true }
                        ]}
                    />

                    <PricingCard
                        tier="Team"
                        price="$26"
                        accentColor="#f97316"
                        videoSrc="/videos/pricing-team.mp4"
                        videosReady={videosReady}
                        bullets={[
                            "Shared pit wall",
                            "Strategy + timing coordination",
                            "Multi-driver context",
                            "Spotter / engineer workflows"
                        ]}
                        ctaText="Start Trial"
                        ctaStyle="primary"
                        expanders={[
                            { title: "What you get", content: "Team access exists because racing decisions are shared. The pit wall brings timing, strategy, and driver context into one coordinated view so everyone is operating off the same reality in real time." },
                            { title: "Who it's for", content: "Teams running endurance, multi-driver programs, or any group that needs coordination under pressure." },
                            { title: "Trial access", content: "Team trials are guided and rate-limited. You can explore how teams operate inside the system and preview coordination workflows, but full live race operation tools remain restricted until the platform is ready for broader use.", showCta: true }
                        ]}
                    />

                    <PricingCard
                        tier="League"
                        videosReady={videosReady}
                        price="$42"
                        pricePeriod="Per season"
                        accentColor="#8b5cf6"
                        videoSrc="/videos/pricing-league.mp4"
                        bullets={[
                            "Incidents + penalties",
                            "Rulebook enforcement",
                            "Stewarding workflow",
                            "Broadcast coordination"
                        ]}
                        ctaText="Contact Us"
                        ctaStyle="outline"
                        expanders={[
                            { title: "What you get", content: "League access is built for authority, consistency, and trust. Stewarding and enforcement workflows are designed to be repeatable, transparent, and grounded in shared data." },
                            { title: "Who it's for", content: "Leagues that want credible competition — with consistent officiating and clean operations." },
                            { title: "Trial access", content: "League trials during testing are walkthrough-based. They focus on learning the workflow and reviewing example scenarios — not live enforcement driven by your real league data.", showCta: true }
                        ]}
                    />
                </div>

                {/* Independent Access */}
                <IndependentAccessSection />
            </div>
        </div>
    );
}
