import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRelay } from '../hooks/useRelay';
import { DriverDataProvider, useDriverData } from '../hooks/useDriverData';
import { getDisciplineLabel } from '../lib/driverService';
import { Settings, LogOut, User, ChevronDown, Users, Trophy, Zap, MessageSquare, TrendingUp, Flag, Map, Radio, Brain, Calendar, ClipboardList } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

function DriverLayoutContent() {
  const { user, signOut } = useAuth();
  const { status } = useRelay();
  const { profile } = useDriverData();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);

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

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'bg-blue-500';
      case 'in_session': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500 animate-pulse';
      default: return 'bg-red-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected': return 'Connected';
      case 'in_session': return 'In Session';
      case 'connecting': return 'Connecting...';
      default: return 'Disconnected';
    }
  };

  const navItems = [
    { to: '/driver/home', icon: Calendar, label: 'Prepare' },
    { to: '/driver/cockpit', icon: Zap, label: 'Race' },
    { to: '/driver/crew/engineer', icon: MessageSquare, label: 'Crew' },
    { to: '/driver/history', icon: ClipboardList, label: 'Review' },
    { to: '/driver/progress', icon: TrendingUp, label: 'Develop' },
  ];

  const primaryLicense = profile?.licenses?.[0];
  const driverName = profile?.displayName || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Driver';
  const primaryDisciplineLabel = primaryLicense ? getDisciplineLabel(primaryLicense.discipline) : null;
  const primaryLicenseLabel = primaryLicense
    ? `${primaryDisciplineLabel} ${primaryLicense.licenseClass} ${primaryLicense.safetyRating?.toFixed(2) ?? '—'} SR`
    : null;

  return (
    <div className="min-h-screen bg-[--bg] flex flex-col">
      <header className="border-b border-white/10 bg-[#0e0e0e] sticky top-0 z-50">
        <div className="h-14 flex items-center justify-between px-4">
          <div className="flex items-center gap-6">
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
                <span className="text-[9px] tracking-wider text-[#f97316] uppercase">Driver Tier</span>
              </div>
            </NavLink>

            <nav className="flex items-center gap-1">
              {navItems.map(({ to, icon: Icon, label }) => {
                // Develop nav item should also highlight on /driver/idp
                const isDevelopActive = label === 'Develop' && (
                  location.pathname === '/driver/progress' || location.pathname === '/driver/idp'
                );
                return (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-wider transition-colors ${
                        isActive || isDevelopActive
                          ? 'text-[#f97316] bg-[#f97316]/10'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden md:inline">{label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10">
              <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
              <span className="text-xs uppercase tracking-wider text-white/60">
                Relay: <span className="text-white">{getStatusText()}</span>
              </span>
            </div>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-3 px-3 py-1.5 hover:bg-white/5 transition-colors"
              >
                <div className="w-7 h-7 bg-[#f97316]/20 border border-[#f97316]/30 flex items-center justify-center">
                  <User className="w-4 h-4 text-[#f97316]" />
                </div>
                <div className="hidden sm:block text-left leading-tight">
                  <div className="text-xs text-white/90">{driverName}</div>
                  {primaryLicenseLabel && (
                    <div className="text-[10px] text-white/45">{primaryLicenseLabel}</div>
                  )}
                  {primaryLicense?.iRating != null && (
                    <div className="text-[10px] text-blue-400 font-mono">{primaryLicense.iRating} iR</div>
                  )}
                </div>
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
                    to="/driver/idp"
                    className="flex items-center gap-2 px-4 py-3 text-xs uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/5"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Brain className="w-4 h-4" />
                    Driver Intelligence
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
                    to="/rco"
                    className="flex items-center gap-2 px-4 py-3 text-xs uppercase tracking-wider text-cyan-400 hover:text-cyan-300 hover:bg-white/5"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Flag className="w-4 h-4" />
                    Race Control
                  </NavLink>
                  <NavLink
                    to="/admin/ops"
                    className="flex items-center gap-2 px-4 py-3 text-xs uppercase tracking-wider text-cyan-400 hover:text-cyan-300 hover:bg-white/5"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Radio className="w-4 h-4" />
                    Admin Ops
                  </NavLink>
                  <NavLink
                    to="/track-intel"
                    className="flex items-center gap-2 px-4 py-3 text-xs uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/5"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Map className="w-4 h-4" />
                    Track Intel
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

      <main className="flex-1 p-4 md:p-6">
        <Outlet />
      </main>

      <footer className="h-10 border-t border-white/10 bg-black/20 flex items-center justify-between px-4">
        <span className="text-[10px] uppercase tracking-wider text-white/30">
          Driver Tier • Private Beta
        </span>
        <span className="text-[10px] uppercase tracking-wider text-white/30">
          © 2026 Ok, Box Box
        </span>
      </footer>
    </div>
  );
}

export function DriverLayout() {
  return (
    <DriverDataProvider>
      <DriverLayoutContent />
    </DriverDataProvider>
  );
}
