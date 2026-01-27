import { Outlet, NavLink, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRelay } from '../hooks/useRelay';
import { 
  Settings, LogOut, User, ChevronDown, History, Users, Trophy, 
  Radio, Target, BarChart3, Play, GitCompare, Fuel, Calendar,
  FileText, AlertTriangle, Wrench, ArrowLeft
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { getTeam, Team } from '../lib/teams';

export function TeamLayout() {
  const { teamId } = useParams<{ teamId: string }>();
  const { user, signOut } = useAuth();
  const { status } = useRelay();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [team, setTeam] = useState<Team | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (teamId) {
      getTeam(teamId).then(setTeam);
    }
  }, [teamId]);

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
    { to: `/team/${teamId}`, icon: Radio, label: 'Dashboard', end: true },
    { to: `/team/${teamId}/pitwall`, icon: Target, label: 'Pit Wall', desc: 'Comms & Cameras', end: true },
    { to: `/team/${teamId}/pitwall/race`, icon: Play, label: 'Race', desc: 'Timing & Standings' },
    { to: `/team/${teamId}/pitwall/strategy`, icon: BarChart3, label: 'Strategy' },
    { to: `/team/${teamId}/pitwall/roster`, icon: Users, label: 'Roster' },
  ];

  const moreItems = [
    { to: `/team/${teamId}/pitwall/practice`, icon: History, label: 'Practice' },
    { to: `/team/${teamId}/pitwall/compare`, icon: GitCompare, label: 'Compare' },
    { to: `/team/${teamId}/pitwall/stint-planner`, icon: Fuel, label: 'Stints' },
    { to: `/team/${teamId}/pitwall/planning`, icon: Calendar, label: 'Planning' },
    { to: `/team/${teamId}/pitwall/events`, icon: Calendar, label: 'Events' },
    { to: `/team/${teamId}/pitwall/setups`, icon: Wrench, label: 'Setups' },
    { to: `/team/${teamId}/pitwall/reports`, icon: FileText, label: 'Reports' },
    { to: `/team/${teamId}/pitwall/incidents`, icon: AlertTriangle, label: 'Incidents' },
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
                <span className="text-[9px] tracking-wider text-[#3b82f6] uppercase">Team Tier</span>
              </div>
            </NavLink>

            {/* Back to Teams */}
            <NavLink 
              to="/teams" 
              className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white/70 transition-colors uppercase tracking-wider"
            >
              <ArrowLeft className="w-3 h-3" />
              Teams
            </NavLink>

            {/* Team Name */}
            {team && (
              <div className="hidden md:block pl-4 border-l border-white/10">
                <span className="text-xs text-white/80 font-medium uppercase tracking-wider">
                  {team.name}
                </span>
              </div>
            )}

            {/* Main Nav */}
            <nav className="flex items-center gap-1">
              {navItems.map(({ to, icon: Icon, label, desc, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-wider transition-colors ${
                      isActive
                        ? 'text-[#3b82f6] bg-[#3b82f6]/10'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden lg:inline">{label}</span>
                  {desc && (
                    <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 bg-[#1a1a1a] border border-white/20 text-[9px] text-white/70 whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 normal-case tracking-normal">
                      {desc}
                    </span>
                  )}
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
                            ? 'text-[#3b82f6] bg-[#3b82f6]/10'
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
            {/* Relay Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10">
              <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
              <span className="text-xs uppercase tracking-wider text-white/60">
                Relay: <span className="text-white">{getStatusText()}</span>
              </span>
            </div>

            {/* Settings */}
            <NavLink
              to={`/team/${teamId}/settings`}
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
                <div className="w-7 h-7 bg-[#3b82f6]/20 border border-[#3b82f6]/30 flex items-center justify-center">
                  <User className="w-4 h-4 text-[#3b82f6]" />
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
          Team Tier • v0.1.0-alpha
        </span>
        <span className="text-[10px] uppercase tracking-wider text-white/30">
          © 2026 Ok, Box Box
        </span>
      </footer>
    </div>
  );
}
