import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
    { to: 'idp', label: 'IDP', end: true },
    { to: 'sessions', label: 'Sessions' },
    { to: 'stats', label: 'Stats' },
    { to: 'ratings', label: 'Ratings' },
];

export function DriverLayout() {
    return (
        <div className="min-h-screen bg-[--bg] text-[--text]">
            <div className="px-6 py-4 border-b border-[--border-medium] bg-[--surface-dark] text-white">
                <div className="text-[10px] uppercase tracking-[0.16em] text-white/60">Driver</div>
                <div className="text-sm font-semibold uppercase tracking-wider">Identity Profile</div>
            </div>

            <div className="px-6 py-3 border-b border-[--border-medium] bg-[--panel]">
                <nav className="flex gap-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) =>
                                `px-3 py-1.5 text-xs font-semibold uppercase tracking-widest border ${isActive
                                    ? 'bg-[--surface-dark] text-white border-[--border-hard]'
                                    : 'bg-[--panel2] text-[--muted] border-[--border-medium] hover:text-[--text]'
                                }`
                            }
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
            </div>

            <div className="p-6">
                <Outlet />
            </div>
        </div>
    );
}
