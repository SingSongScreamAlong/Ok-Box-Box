import { useEffect, useState } from 'react';
import { fetchMyDriverStats, type DriverStatsSnapshot } from '../../services/driver/driver.service';

export function DriverStatsPage() {
    const [stats, setStats] = useState<DriverStatsSnapshot[] | null>(null);

    useEffect(() => {
        let active = true;
        fetchMyDriverStats().then((rows) => {
            if (active) setStats(rows);
        });
        return () => {
            active = false;
        };
    }, []);

    if (!stats) {
        return (
            <div className="panel p-6">
                <div className="text-xs uppercase tracking-[0.12em] text-[--muted]">Driver</div>
                <div className="mt-2 text-sm">Loading stats…</div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.map((s) => (
                <div key={s.discipline} className="panel p-6">
                    <div className="text-xs uppercase tracking-[0.12em] text-[--muted]">{s.discipline}</div>
                    <div className="mt-3 grid grid-cols-3 gap-3">
                        <div className="panel p-3 bg-[--panel2]">
                            <div className="text-[10px] uppercase tracking-[0.12em] text-[--muted]">Starts</div>
                            <div className="mt-1 font-mono font-semibold">{s.starts}</div>
                        </div>
                        <div className="panel p-3 bg-[--panel2]">
                            <div className="text-[10px] uppercase tracking-[0.12em] text-[--muted]">Wins</div>
                            <div className="mt-1 font-mono font-semibold">{s.wins}</div>
                        </div>
                        <div className="panel p-3 bg-[--panel2]">
                            <div className="text-[10px] uppercase tracking-[0.12em] text-[--muted]">Top 5</div>
                            <div className="mt-1 font-mono font-semibold">{s.top5s}</div>
                        </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                        <div className="panel p-3 bg-[--panel2]">
                            <div className="text-[10px] uppercase tracking-[0.12em] text-[--muted]">Avg Start</div>
                            <div className="mt-1 font-mono font-semibold">{s.avgStart}</div>
                        </div>
                        <div className="panel p-3 bg-[--panel2]">
                            <div className="text-[10px] uppercase tracking-[0.12em] text-[--muted]">Avg Finish</div>
                            <div className="mt-1 font-mono font-semibold">{s.avgFinish}</div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
