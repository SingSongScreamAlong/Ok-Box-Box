import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Settings, User } from 'lucide-react';

export function AppLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="min-h-screen bg-[--bg] flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[--surface-dark]/95 backdrop-blur-sm border-b border-[--border]">
        {/* Main nav row */}
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-4 group">
            <div className="flex gap-1">
              <div className="w-2 h-7 bg-white rounded-full transform rotate-12"></div>
              <div className="w-2 h-7 bg-[#3b82f6] rounded-full transform rotate-12"></div>
              <div className="w-2 h-7 bg-[#f97316] rounded-full transform rotate-12"></div>
            </div>
            <div className="flex flex-col">
              <span 
                className="text-lg font-bold tracking-wider uppercase text-white"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                Ok, Box Box
              </span>
              <span className="text-[0.625rem] tracking-wider text-[--accent] uppercase">Racing Operations System</span>
            </div>
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/dashboard" className="text-xs font-medium uppercase tracking-wider text-white/80 hover:text-white transition-colors duration-150">Dashboard</Link>
            <Link to="/driver-profile" className="text-xs font-medium uppercase tracking-wider text-white/80 hover:text-white transition-colors duration-150">Driver</Link>
            <Link to="/teams" className="text-xs font-medium uppercase tracking-wider text-white/80 hover:text-white transition-colors duration-150">Teams</Link>
            <Link to="/leagues" className="text-xs font-medium uppercase tracking-wider text-white/80 hover:text-white transition-colors duration-150">Leagues</Link>
          </nav>

          {/* User menu */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm text-white/70">
              <User size={16} />
              <span>{displayName}</span>
            </div>
            <Link 
              to="/settings" 
              className="p-2 text-white/50 hover:text-white transition-colors"
              title="Settings"
            >
              <Settings size={18} />
            </Link>
            <button 
              onClick={handleSignOut}
              className="p-2 text-white/50 hover:text-white transition-colors"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Secondary row */}
        <div className="border-t border-white/5 bg-[#080808]">
          <div className="max-w-7xl mx-auto px-6 h-10 flex items-center justify-center gap-8">
            <span className="text-[10px] uppercase tracking-wider text-[#f97316]">Winter Testing</span>
            <span className="text-white/20">|</span>
            <span className="text-[10px] uppercase tracking-wider text-white/30">Build v0.1.0-alpha</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 pt-[104px]">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="relative z-20 bg-[#0a0a0a] border-t border-white/10 py-8">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex gap-0.5">
                <div className="w-1 h-4 bg-white rounded-full transform rotate-12"></div>
                <div className="w-1 h-4 bg-[#3b82f6] rounded-full transform rotate-12"></div>
                <div className="w-1 h-4 bg-[#f97316] rounded-full transform rotate-12"></div>
              </div>
              <span className="text-xs text-white/40">Ok, Box Box</span>
            </div>
            <div className="flex items-center gap-6 text-xs text-white/30">
              <a href="https://okboxbox.com" target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition-colors">Website</a>
              <a href="https://okboxbox.com/docs" target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition-colors">Docs</a>
              <a href="https://okboxbox.com/pricing" target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition-colors">Pricing</a>
            </div>
            <p className="text-[10px] text-white/20">
              © Ok, Box Box · Take control of your racing.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
