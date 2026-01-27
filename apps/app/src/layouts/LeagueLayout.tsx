import { Outlet, NavLink, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Settings, LogOut, User, ChevronDown, Users, Trophy, 
  AlertTriangle, Flag, BookOpen, Award, Radio, Gavel,
  Scale, Timer, ArrowLeft
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { getLeague, League } from '../lib/leagues';

export function LeagueLayout() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [league, setLeague] = useState<League | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (leagueId) {
      getLeague(leagueId).then(setLeague);
    }
  }, [leagueId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { to: `/league/${leagueId}`, icon: Trophy, label: 'Dashboard', end: true },
    { to: `/league/${leagueId}/championship`, icon: Award, label: 'Championship' },
    { to: `/league/${leagueId}/incidents`, icon: AlertTriangle, label: 'Incidents' },
    { to: `/league/${leagueId}/penalties`, icon: Flag, label: 'Penalties' },
  ];

  const moreItems = [
    { to: `/league/${leagueId}/protests`, icon: Scale, label: 'Protests' },
    { to: `/league/${leagueId}/steward-console`, icon: Gavel, label: 'Steward Console' },
    { to: `/league/${leagueId}/broadcast`, icon: Radio, label: 'Broadcast' },
    { to: `/league/${leagueId}/timing`, icon: Timer, label: 'Public Timing' },
  ];

  return (
    <div className="min-h-screen bg-[--bg] flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0e0e0e] sticky top-0 z-50">
        <div className="h-14 flex items-center justify-between px-4">
          <div className="flex items-center gap-6">
            {/* Logo */}
            <NavLink to="/driver/home" className="flex items-center gap-3 group">
              <div className="flex gap-1">
                <div className="w-2 h-7 bg-white rounded-full transform rotate-12"></div>
                <div className="w-2 h-7 bg-[#3b82f6] rounded-full transform rotate-12"></div>
                <div className="w-2 h-7 bg-[#f97316] rounded-full transform rotate-12"></div>
              </div>
              <div className="flex flex-col hidden sm:flex">
                <span 
                  className="text-sm font-bold tracking-wider text-white uppercase"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  Ok, Box Box
                </span>
                <span className="text-[9px] tracking-wider text-[#22c55e] uppercase">League Tier</span>
              </div>
            </NavLink>

            {/* Back to Leagues */}
            <NavLink 
              to="/leagues" 
              className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white/70 transition-colors uppercase tracking-wider"
            >
              <ArrowLeft className="w-3 h-3" />
              Leagues
            </NavLink>

            {/* League Name */}
            {league && (
              <div className="hidden md:block pl-4 border-l border-white/10">
                <span className="text-xs text-white/80 font-medium uppercase tracking-wider">
                  {league.name}
                </span>
              </div>
            )}

            {/* Main Nav */}
            <nav className="flex items-center gap-1">
              {navItems.map(({ to, icon: Icon, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-wider transition-colors ${
                      isActive
                        ? 'text-[#22c55e] bg-[#22c55e]/10'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden lg:inline">{label}</span>
                </NavLink>
              ))}
              
              {/* More dropdown */}
              <div className="relative group">
                <button className="flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/5 transition-colors">
                  <span className="hidden lg:inline">More</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                <div className="absolute left-0 top-full mt-1 w-48 bg-[#141414] border border-white/10 shadow-xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  {moreItems.map(({ to, icon: Icon, label }) => (
                    <NavLink
                      key={to}
                      to={to}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-4 py-3 text-xs uppercase tracking-wider transition-colors ${
                          isActive
                            ? 'text-[#22c55e] bg-[#22c55e]/10'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </NavLink>
                  ))}
                </div>
              </div>
            </nav>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Rulebook */}
            <NavLink
              to={`/league/${leagueId}/rulebook/main`}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 text-xs uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Rulebook</span>
            </NavLink>

            {/* Settings */}
            <NavLink
              to={`/league/${leagueId}/settings`}
              className="p-2 text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </NavLink>

            {/* User Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 transition-colors"
              >
                <div className="w-7 h-7 bg-[#22c55e]/20 border border-[#22c55e]/30 flex items-center justify-center">
                  <User className="w-4 h-4 text-[#22c55e]" />
                </div>
                <span className="text-xs text-white/80 hidden sm:block">
                  {user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User'}
                </span>
                <ChevronDown className="w-3 h-3 text-white/40" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-[#141414] border border-white/10 shadow-xl z-50 backdrop-blur-md">
                  <NavLink
                    to="/driver/profile"
                    className="flex items-center gap-2 px-4 py-3 text-xs uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/5"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <User className="w-4 h-4" />
                    Driver Profile
                  </NavLink>
                  <NavLink
                    to="/teams"
                    className="flex items-center gap-2 px-4 py-3 text-xs uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/5"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Users className="w-4 h-4" />
                    Teams
                  </NavLink>
                  <NavLink
                    to="/leagues"
                    className="flex items-center gap-2 px-4 py-3 text-xs uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/5"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Trophy className="w-4 h-4" />
                    Leagues
                  </NavLink>
                  <NavLink
                    to="/settings"
                    className="flex items-center gap-2 px-4 py-3 text-xs uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/5"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </NavLink>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-4 py-3 text-xs uppercase tracking-wider text-red-400 hover:text-red-300 hover:bg-white/5"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="h-10 border-t border-white/10 bg-black/20 flex items-center justify-between px-4">
        <span className="text-[10px] uppercase tracking-wider text-white/30">
          League Tier • v0.1.0-alpha
        </span>
        <span className="text-[10px] uppercase tracking-wider text-white/30">
          © 2026 Ok, Box Box
        </span>
      </footer>
    </div>
  );
}
