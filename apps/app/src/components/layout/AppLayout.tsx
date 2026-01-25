import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Settings, User, LayoutDashboard, Users, Trophy, Menu, X } from 'lucide-react';
import { useState } from 'react';

export function AppLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User';

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/driver-profile', label: 'Driver', icon: User },
    { path: '/teams', label: 'Teams', icon: Users },
    { path: '/leagues', label: 'Leagues', icon: Trophy },
  ];

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="min-h-screen bg-[--bg] flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/10">
        {/* Main nav row */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="flex gap-1">
              <div className="w-2 h-6 bg-white rounded-full transform rotate-12 group-hover:scale-110 transition-transform"></div>
              <div className="w-2 h-6 bg-[#3b82f6] rounded-full transform rotate-12 group-hover:scale-110 transition-transform"></div>
              <div className="w-2 h-6 bg-[#f97316] rounded-full transform rotate-12 group-hover:scale-110 transition-transform"></div>
            </div>
            <div className="hidden sm:flex flex-col">
              <span 
                className="text-base font-bold tracking-wider uppercase text-white"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                Ok, Box Box
              </span>
              <span className="text-[0.6rem] tracking-widest text-[#f97316] uppercase">Racing Operations System</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link 
                  key={item.path}
                  to={item.path} 
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-medium uppercase tracking-wider transition-all duration-150 ${
                    active 
                      ? 'text-white bg-white/10' 
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={14} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User menu */}
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 text-sm text-white/70">
              <User size={14} />
              <span className="max-w-[120px] truncate">{displayName}</span>
            </div>
            <Link 
              to="/settings" 
              className="p-2.5 text-white/40 hover:text-white hover:bg-white/5 transition-all"
              title="Settings"
            >
              <Settings size={18} />
            </Link>
            <button 
              onClick={handleSignOut}
              className="p-2.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
            
            {/* Mobile menu button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2.5 text-white/50 hover:text-white"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Status bar */}
        <div className="border-t border-white/5 bg-[#050505]">
          <div className="max-w-7xl mx-auto px-4 md:px-6 h-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-[10px] uppercase tracking-wider text-[#f97316] font-medium">Winter Testing</span>
              <span className="text-white/10">|</span>
              <span className="text-[10px] uppercase tracking-wider text-white/30">v0.1.0-alpha</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-[10px] uppercase tracking-wider text-white/30">Connected</span>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 bg-black/95">
            <nav className="p-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link 
                    key={item.path}
                    to={item.path} 
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium uppercase tracking-wider transition-all ${
                      active 
                        ? 'text-white bg-white/10' 
                        : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 pt-24">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="relative z-20 bg-[#050505] border-t border-white/10 py-6">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                <div className="w-1 h-3 bg-white rounded-full transform rotate-12"></div>
                <div className="w-1 h-3 bg-[#3b82f6] rounded-full transform rotate-12"></div>
                <div className="w-1 h-3 bg-[#f97316] rounded-full transform rotate-12"></div>
              </div>
              <span className="text-[10px] text-white/30 uppercase tracking-wider">Ok, Box Box</span>
            </div>
            <div className="flex items-center gap-6 text-[10px] text-white/30 uppercase tracking-wider">
              <a href="https://okboxbox.com" target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition-colors">Website</a>
              <a href="https://okboxbox.com/docs" target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition-colors">Docs</a>
              <a href="https://okboxbox.com/support" target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition-colors">Support</a>
            </div>
            <p className="text-[10px] text-white/20">
              © 2025 Ok, Box Box
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
