import { Outlet, NavLink, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, ArrowLeft, Sun, Moon } from 'lucide-react';
import { ObbBrandMark } from '../components/brand/ObbBrandMark';
import { useTheme } from '../hooks/useTheme';

const navItems = [
  { to: '', label: 'Home', end: true },
  { to: 'roster', label: 'Roster' },
  { to: 'events', label: 'Events' },
  { to: 'planning', label: 'Planning' },
  { to: 'setups', label: 'Setups' },
  { to: 'strategy', label: 'Strategy' },
  { to: 'practice', label: 'Practice' },
  { to: 'reports', label: 'Reports' },
];

export function PitwallLayout() {
  const { user, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-[#0a0a0a] border-r border-white/10 flex flex-col">
        {/* Logo Header */}
        <div className="px-4 py-4 border-b border-white/10">
          <Link to="/" className="block mb-3">
            <ObbBrandMark size="md" />
          </Link>
          <Link to="/teams" className="flex items-center gap-2 text-[10px] text-white/40 hover:text-white/70 transition-colors">
            <ArrowLeft size={10} />
            <span className="uppercase tracking-wider">Back to Teams</span>
          </Link>
        </div>
        
        {/* Surface Label */}
        <div className="px-4 py-3 border-b border-white/10">
          <div className="text-[10px] font-semibold text-white/50 uppercase tracking-[0.2em]">Pit Wall</div>
          <div className="text-sm font-bold text-white uppercase tracking-wider mt-0.5" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            Team Operations
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider transition-colors border-l-2 ${
                  isActive
                    ? 'bg-white/5 text-white border-white/40'
                    : 'text-white/40 hover:bg-white/5 hover:text-white/60 border-transparent'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User Panel */}
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-white/10 border border-white/20 flex items-center justify-center text-[10px] font-bold text-white/70">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold text-white truncate uppercase tracking-wider">{displayName}</div>
              <div className="text-[10px] text-white/40 truncate uppercase tracking-wider">Crew</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 text-[11px] font-semibold text-white/40 hover:text-white/70 transition-colors uppercase tracking-wider"
            >
              <LogOut size={12} />
              <span>Sign Out</span>
            </button>
            <button
              onClick={toggleTheme}
              className="p-1.5 text-white/40 hover:text-white/70 transition-colors ml-auto"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 overflow-auto ${isDark ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
        <Outlet context={{ isDark }} />
      </main>
    </div>
  );
}
