import { ReactNode, useEffect, useState, useRef, useCallback } from 'react';

const COLLAPSED_BAR_HEIGHT = 72;
const NAV_HEIGHT = 104;

interface StackingSectionsProps {
    children: ReactNode;
}

export function StackingSections({ children }: StackingSectionsProps) {
    return (
        <div className="relative">
            {children}
        </div>
    );
}

interface StackingSectionProps {
    index: number;
    id: string;
    title: string;
    subtitle: string;
    stripeColor: string;
    isCurrent?: boolean;
    isLast?: boolean;
    children: ReactNode;
}

export function StackingSection({ 
    index,
    id, 
    title, 
    subtitle, 
    stripeColor, 
    isCurrent = false,
    isLast = false,
    children 
}: StackingSectionProps) {
    const [isPinned, setIsPinned] = useState(false);
    const sectionRef = useRef<HTMLElement>(null);
    const stickyTop = NAV_HEIGHT + (index * COLLAPSED_BAR_HEIGHT);
    const zIndex = 50 - index;

    const checkPinned = useCallback(() => {
        // Last section never pins/collapses
        if (isLast) return;
        if (!sectionRef.current) return;
        const rect = sectionRef.current.getBoundingClientRect();
        // Pin when section top reaches its sticky position
        setIsPinned(rect.top <= stickyTop);
    }, [stickyTop, isLast]);

    useEffect(() => {
        window.addEventListener('scroll', checkPinned, { passive: true });
        checkPinned();
        return () => window.removeEventListener('scroll', checkPinned);
    }, [checkPinned]);

    return (
        <section ref={sectionRef} id={id} className="relative">
            {/* Pinned header - fixed position when scrolled past (never for last section) */}
            {isPinned && !isLast && (
                <div
                    className="fixed left-0 right-0"
                    style={{ 
                        top: `${stickyTop}px`,
                        zIndex: zIndex + 10
                    }}
                >
                    <div className="max-w-3xl mx-auto px-6">
                        <div className="bg-[#0a0a0a] border border-white/10">
                            <div className="flex items-stretch">
                                <div 
                                    className="w-1 flex-shrink-0"
                                    style={{ backgroundColor: stripeColor }}
                                />
                                <div className="flex-1 px-6 py-4 min-h-[72px] flex flex-col justify-center">
                                    <div className="flex items-center gap-4">
                                        <h3 
                                            className="text-sm uppercase tracking-[0.12em] font-semibold text-white"
                                            style={{ fontFamily: 'Orbitron, sans-serif' }}
                                        >
                                            {title}
                                        </h3>
                                        {isCurrent && (
                                            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/30 font-semibold">
                                                Current
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-white/50 mt-1 line-clamp-1">
                                        {subtitle}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* In-flow header - visible when not pinned */}
            <div className={isPinned ? 'invisible' : ''}>
                <div className="bg-[#0a0a0a] border border-white/10">
                    <div className="flex items-stretch">
                        <div 
                            className="w-1 flex-shrink-0"
                            style={{ backgroundColor: stripeColor }}
                        />
                        <div className="flex-1 px-6 py-4 min-h-[72px] flex flex-col justify-center">
                            <div className="flex items-center gap-4">
                                <h3 
                                    className="text-sm uppercase tracking-[0.12em] font-semibold text-white"
                                    style={{ fontFamily: 'Orbitron, sans-serif' }}
                                >
                                    {title}
                                </h3>
                                {isCurrent && (
                                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/30 font-semibold">
                                        Current
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-white/50 mt-1 line-clamp-1">
                                {subtitle}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section content */}
            <div 
                className="relative pl-7 pr-6 py-6 border-l-2 bg-black/60 backdrop-blur-sm" 
                style={{ borderColor: `${stripeColor}40` }}
            >
                <div className="max-w-2xl">
                    {children}
                </div>
            </div>
        </section>
    );
}
