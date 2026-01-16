
import {
    Activity,
    Shield,
    TrendingUp,
    TrendingDown,
    Minus,
    Lock,
    Unlock
} from 'lucide-react';
import { TeamMemberView } from '../../types/team.types';

interface DriverCardProps {
    member: TeamMemberView;
}

export function DriverCard({ member }: DriverCardProps) {
    // Helper to get form icon
    const getFormIcon = (form: string) => {
        switch (form) {
            case 'improving': return <TrendingUp className="text-green-400" size={20} />;
            case 'declining': return <TrendingDown className="text-red-400" size={20} />;
            default: return <Minus className="text-slate-500" size={20} />;
        }
    };

    // Helper for access badge
    const getAccessBadge = (scope: string | null) => {
        if (scope === 'granted') {
            // We don't have scope depth in the member view yet (it was access_scope: 'granted'), 
            // but let's assume if we see summary data it's at least standard.
            // Ideally we'd pass the actual scope string (team_deep/team_standard) in the view model.
            // For now, let's just show "Active"
            return (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                    <Unlock size={12} />
                    <span>Active Access</span>
                </div>
            );
        }
        return (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
                <Lock size={12} />
                <span>Pending</span>
            </div>
        );
    };

    return (
        <div className="group relative bg-slate-900/40 border border-white/5 rounded-xl p-4 hover:bg-slate-800/40 hover:border-white/10 transition-all duration-300">
            {/* Neon Glow on Hover */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/0 via-cyan-500/0 to-blue-500/0 group-hover:from-cyan-500/10 group-hover:via-blue-500/10 group-hover:to-purple-500/10 rounded-xl blur transition-all duration-500" />

            <div className="relative flex items-center gap-6">
                {/* Avatar Section */}
                <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center overflow-hidden">
                        {member.avatar_url ? (
                            <img src={member.avatar_url} alt={member.display_name} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-xl font-bold text-slate-400">
                                {member.display_name.charAt(0)}
                            </span>
                        )}
                    </div>
                    {/* Role Badge */}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-950 border border-slate-700 rounded-full text-[10px] uppercase font-bold tracking-wider text-slate-300">
                        {member.role}
                    </div>
                </div>

                {/* Info Section */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-bold text-white truncate">{member.display_name}</h3>
                        {getAccessBadge(member.access_scope)}
                    </div>

                    {/* Metrics Grid (only if summary available) */}
                    {member.summary ? (
                        <div className="grid grid-cols-2 gap-4 mt-3">
                            {/* Pace Metric */}
                            <div className="bg-slate-950/50 rounded p-2 border border-white/5">
                                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                                    <span className="flex items-center gap-1"><Activity size={12} /> Pace</span>
                                    <span className="text-cyan-400 font-mono">
                                        {member.summary.avg_pace_percentile ? `${member.summary.avg_pace_percentile}%` : 'N/A'}
                                    </span>
                                </div>
                                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-cyan-500/80 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                                        style={{ width: `${member.summary.avg_pace_percentile || 0}%` }}
                                    />
                                </div>
                            </div>

                            {/* Consistency Metric */}
                            <div className="bg-slate-950/50 rounded p-2 border border-white/5">
                                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                                    <span className="flex items-center gap-1"><Shield size={12} /> Consistency</span>
                                    <span className="text-blue-400 font-mono">
                                        {member.summary.consistency_index ?? 'N/A'}
                                    </span>
                                </div>
                                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500/80 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                        style={{ width: `${member.summary.consistency_index || 0}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-2 text-sm text-slate-500 italic flex items-center gap-2">
                            <Lock size={14} />
                            Data access limited by driver privacy
                        </div>
                    )}
                </div>

                {/* Right Side: Form & Traits */}
                {member.summary && (
                    <div className="hidden md:flex flex-col items-end gap-3 pl-6 border-l border-white/5">
                        <div className="text-center">
                            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Recent Form</div>
                            <div className="flex flex-col items-center">
                                {getFormIcon(member.summary.recent_form)}
                                <span className={`text-xs font-medium mt-1 ${member.summary.recent_form === 'improving' ? 'text-green-400' :
                                        member.summary.recent_form === 'declining' ? 'text-red-400' : 'text-slate-400'
                                    }`}>
                                    {member.summary.recent_form === 'insufficient_data' ? 'No Data' :
                                        member.summary.recent_form.charAt(0).toUpperCase() + member.summary.recent_form.slice(1)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Trait Chips Footer */}
            {member.summary?.headline_traits && member.summary.headline_traits.length > 0 && (
                <div className="mt-4 pt-3 border-t border-white/5 flex gap-2 overflow-x-auto">
                    {member.summary.headline_traits.map((trait, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] uppercase tracking-wide whitespace-nowrap border border-white/5">
                            {trait}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
