import { NavLink } from 'react-router-dom';

const navItems = [
    { to: '/', label: 'Dashboard' },
    { to: '/track-intel', label: 'Track Intel' },
    { to: '/incidents', label: 'Incidents' },
    { to: '/protests', label: 'Protests' },
    { to: '/rulebooks', label: 'Rulebooks' },
    { to: '/reports', label: 'Reports' },
    { to: '/events', label: 'Events' },
    { to: '/teams', label: 'Teams' },
    { to: '/audit', label: 'Audit Log' },
];

export function Sidebar() {
    return (
        <aside className="w-56 bg-black border-r border-white/15 flex flex-col">
            {/* System identifier */}
            <div className="px-4 py-3 border-b border-white/15">
                <div className="text-[0.6rem] font-semibold text-white/40 uppercase tracking-widest">System</div>
                <div className="text-xs font-semibold text-white uppercase tracking-wider mt-0.5">Ok, Box Box</div>
                <NavLink to="/about/build" className="mt-2 inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
                    <div className="w-1.5 h-1.5 rounded-full bg-[--state-success]"></div>
                    <span className="text-[0.55rem] font-mono text-white/60 group-hover:text-white transition-colors">CANONICAL BUILD</span>
                </NavLink>
            </div>

            <nav className="flex-1 py-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            `flex items-center px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors border-l-2 ${isActive
                                ? 'bg-white/8 text-white border-white'
                                : 'text-white/50 hover:bg-white/5 hover:text-white/80 border-transparent'
                            }`
                        }
                    >
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            {/* Session quick actions */}
            <div className="p-3 border-t border-white/15">
                <button className="w-full btn btn-primary">
                    New Session
                </button>
            </div>
        </aside>
    );
}
