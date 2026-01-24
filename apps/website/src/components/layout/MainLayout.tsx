import { Link, Outlet } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export function MainLayout() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen flex flex-col bg-[--bg] text-[--text]">
            {/* HEADER */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-[--surface-dark] border-b border-[--border-medium]">
                {/* Main nav row */}
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-4 group">
                        {/* Triple stripe logo */}
                        <div className="flex gap-1">
                            <div className="w-2 h-7 bg-white rounded-full transform rotate-12"></div>
                            <div className="w-2 h-7 bg-[#3b82f6] rounded-full transform rotate-12"></div>
                            <div className="w-2 h-7 bg-[#f97316] rounded-full transform rotate-12"></div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-lg font-bold tracking-wider uppercase text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>Ok, Box Box</span>
                            <span className="text-[0.625rem] tracking-wider text-[--accent] uppercase">Racing Operations System</span>
                        </div>
                    </Link>

                    {/* Nav */}
                    <nav className="hidden md:flex items-center gap-6">
                        <Link to="/" className="text-xs font-medium uppercase tracking-wider text-white/80 hover:text-white transition-colors duration-150">Home</Link>
                        <Link to="/track-ready" className="text-xs font-medium uppercase tracking-wider text-white/80 hover:text-white transition-colors duration-150">Getting Track Ready</Link>
                        <Link to="/pricing" className="text-xs font-medium uppercase tracking-wider text-white/80 hover:text-white transition-colors duration-150">Pricing</Link>
                        <Link to="/download-relay" className="text-xs font-medium uppercase tracking-wider text-white/80 hover:text-white transition-colors duration-150">Download</Link>
                        <Link to="/docs" className="text-xs font-medium uppercase tracking-wider text-white/80 hover:text-white transition-colors duration-150">Docs</Link>
                    </nav>

                    {/* Auth Actions */}
                    <div className="hidden md:flex items-center gap-3">
                        <Link to="/login" className="text-xs font-medium uppercase tracking-wider text-white/70 hover:text-white transition-colors duration-150">Log In</Link>
                        <a href="https://app.okboxbox.com/login" className="text-xs font-semibold uppercase tracking-wider bg-[--accent] text-white px-4 py-2 hover:bg-[#ea580c] transition-colors duration-150">
                            Launch App
                        </a>
                    </div>

                    {/* Mobile menu button */}
                    <button 
                        className="md:hidden p-2 text-white/70 hover:text-white transition-colors"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
                
                {/* Access layers row - hidden on mobile when menu open */}
                <div className={`border-t border-white/5 bg-[#080808] ${mobileMenuOpen ? 'hidden' : ''}`}>
                    <div className="max-w-7xl mx-auto px-6 h-10 flex items-center justify-center gap-8">
                        <Link to="/driver" className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/50 hover:text-[#3b82f6] transition-colors duration-150">Drivers</Link>
                        <span className="text-white/20">|</span>
                        <Link to="/team" className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/50 hover:text-[#f97316] transition-colors duration-150">Teams</Link>
                        <span className="text-white/20">|</span>
                        <Link to="/league" className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/50 hover:text-[#8b5cf6] transition-colors duration-150">Leagues</Link>
                    </div>
                </div>

                {/* Mobile menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-white/10 bg-[#0a0a0a]">
                        <nav className="flex flex-col px-6 py-4 space-y-4">
                            <Link to="/" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium uppercase tracking-wider text-white/80 hover:text-white transition-colors">Home</Link>
                            <Link to="/track-ready" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium uppercase tracking-wider text-white/80 hover:text-white transition-colors">Getting Track Ready</Link>
                            <Link to="/pricing" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium uppercase tracking-wider text-white/80 hover:text-white transition-colors">Pricing</Link>
                            <Link to="/download-relay" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium uppercase tracking-wider text-white/80 hover:text-white transition-colors">Download</Link>
                            <Link to="/docs" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium uppercase tracking-wider text-white/80 hover:text-white transition-colors">Docs</Link>
                            <div className="border-t border-white/10 pt-4 space-y-3">
                                <Link to="/driver" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium uppercase tracking-wider text-[#3b82f6]/70 hover:text-[#3b82f6] transition-colors">Drivers</Link>
                                <Link to="/team" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium uppercase tracking-wider text-[#f97316]/70 hover:text-[#f97316] transition-colors">Teams</Link>
                                <Link to="/league" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium uppercase tracking-wider text-[#8b5cf6]/70 hover:text-[#8b5cf6] transition-colors">Leagues</Link>
                            </div>
                            <div className="border-t border-white/10 pt-4">
                                <a href="https://app.okboxbox.com/login" className="block w-full text-center text-sm font-semibold uppercase tracking-wider bg-[--accent] text-white px-4 py-3 hover:bg-[#ea580c] transition-colors">
                                    Launch App
                                </a>
                            </div>
                        </nav>
                    </div>
                )}
            </header>

            {/* MAIN CONTENT */}
            <main className="flex-1 pt-[104px]">
                <Outlet />
            </main>

            {/* FOOTER */}
            <footer className="relative z-20 bg-[#0a0a0a] py-10">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10 text-center justify-items-center">
                        <div>
                            <div className="text-xs font-semibold tracking-wider uppercase text-white/80 mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>Ok, Box Box</div>
                            <p className="text-[11px] text-white/40 leading-relaxed">
                                Racing Operations System for iRacing<br />
                                Build v0.1.0-alpha
                            </p>
                        </div>
                        <div>
                            <h4 className="text-[10px] uppercase tracking-[0.15em] text-white/50 mb-3">Product</h4>
                            <div className="flex flex-col gap-1 text-xs text-white/40">
                                <Link to="/download-relay" className="hover:text-white/70 transition-colors duration-150">Relay</Link>
                                <Link to="/pricing" className="hover:text-white/70 transition-colors duration-150">Pricing</Link>
                                <Link to="/docs" className="hover:text-white/70 transition-colors duration-150">Docs</Link>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-[10px] uppercase tracking-[0.15em] text-white/50 mb-3">Community</h4>
                            <div className="flex flex-col gap-1 text-xs text-white/40">
                                <span className="text-white/25">Discord — Coming Soon</span>
                                <span className="text-white/25">Instagram — Coming Soon</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Closing line */}
                    <div className="border-t border-white/10 pt-6 text-center">
                        <p className="text-[10px] text-white/30">
                            © Ok, Box Box<br />
                            Take control of your racing.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
