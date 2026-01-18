import { Outlet, NavLink } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import {
    Users,
    Calendar,
    FileText,
    LayoutDashboard,
    LogOut,
    ClipboardList,
    Wrench,
    Target,
    Timer,
    Map
} from 'lucide-react';

export function TeamLayout() {
    const { logout } = useAuthStore();

    // Mock user for demo - bypasses login requirement
    const user = {
        displayName: 'Test Driver',
        email: 'driver@throttleworks.racing'
    };

    return (
        <div className="flex h-screen bg-slate-950 text-white font-sans overflow-hidden">
            {/* Sidebar - Glassmorphism */}
            <aside className="w-64 bg-slate-900/50 backdrop-blur-xl border-r border-white/10 flex flex-col relative z-20">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-8 h-8 rounded bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white">
                            T
                        </div>
                        <span className="font-bold text-lg tracking-tight">Throttle Works Racing</span>
                    </div>

                    <nav className="space-y-1">
                        <NavLink
                            to=""
                            end
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive
                                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`
                            }
                        >
                            <LayoutDashboard size={18} />
                            <span>Home</span>
                        </NavLink>

                        <NavLink
                            to="roster"
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive
                                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`
                            }
                        >
                            <Users size={18} />
                            <span>Roster</span>
                        </NavLink>

                        <NavLink
                            to="events"
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive
                                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`
                            }
                        >
                            <Calendar size={18} />
                            <span>Events</span>
                        </NavLink>

                        <NavLink
                            to="planning"
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive
                                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`
                            }
                        >
                            <ClipboardList size={18} />
                            <span>Planning</span>
                        </NavLink>

                        <NavLink
                            to="setups"
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive
                                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`
                            }
                        >
                            <Wrench size={18} />
                            <span>Setups</span>
                        </NavLink>

                        <NavLink
                            to="strategy"
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive
                                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`
                            }
                        >
                            <Target size={18} />
                            <span>Strategy</span>
                        </NavLink>

                        <NavLink
                            to="practice"
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive
                                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`
                            }
                        >
                            <Timer size={18} />
                            <span>Practice</span>
                        </NavLink>

                        <NavLink
                            to="reports"
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive
                                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`
                            }
                        >
                            <FileText size={18} />
                            <span>Reports</span>
                        </NavLink>

                        {/* Separator */}
                        <div className="my-3 border-t border-white/5" />

                        <NavLink
                            to="/track-intel"
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive
                                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`
                            }
                        >
                            <Map size={18} />
                            <span>Track Intel</span>
                        </NavLink>
                    </nav>
                </div>

                <div className="mt-auto p-6 border-t border-white/5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                            {user?.displayName?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{user?.displayName}</div>
                            <div className="text-xs text-slate-500 truncate">Team Member</div>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="flex items-center gap-2 text-sm text-slate-400 hover:text-red-400 transition-colors w-full"
                    >
                        <LogOut size={16} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 relative overflow-auto bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
                {/* Background Accents (Neon) */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-600/5 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 min-h-full">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
