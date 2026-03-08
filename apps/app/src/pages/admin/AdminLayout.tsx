import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, CreditCard, Activity,
  Radio, Shield, LogOut, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const NAV = [
  { to: '/admin',             label: 'Overview',      icon: LayoutDashboard, end: true },
  { to: '/admin/users',       label: 'Users',         icon: Users },
  { to: '/admin/entitlements',label: 'Entitlements',  icon: CreditCard },
  { to: '/admin/ops',         label: 'Live Ops',      icon: Activity },
  { to: '/admin/telemetry',   label: 'Telemetry',     icon: Radio },
];

export function AdminLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-[#080808] text-white">

      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col border-r border-white/[0.06] bg-[#0d0d0d]">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-red-500/20 border border-red-500/40 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-red-400" />
            </div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/80" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              Admin
            </span>
          </div>
          <p className="text-[10px] text-white/30 mt-1.5 truncate">{user?.email}</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded text-xs uppercase tracking-wider font-medium transition-all ${
                  isActive
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                }`
              }
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-2 py-4 border-t border-white/[0.06] space-y-1">
          <NavLink
            to="/driver/home"
            className="flex items-center justify-between gap-2 px-3 py-2 rounded text-[11px] text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all"
          >
            <span>Back to App</span>
            <ChevronRight className="w-3 h-3" />
          </NavLink>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded text-[11px] text-white/30 hover:text-red-400 hover:bg-red-500/[0.06] transition-all"
          >
            <LogOut className="w-3 h-3" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
