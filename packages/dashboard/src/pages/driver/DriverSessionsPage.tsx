import { useEffect, useState } from 'react';
import { fetchMyDriverSessions, type DriverSessionSummary } from '../../services/driver/driver.service';

export function DriverSessionsPage() {
    const [sessions, setSessions] = useState<DriverSessionSummary[] | null>(null);

    useEffect(() => {
        let active = true;
        fetchMyDriverSessions().then((rows) => {
            if (active) setSessions(rows);
        });
        return () => {
            active = false;
        };
    }, []);

    if (!sessions) {
        return (
            <div className="panel p-6">
                <div className="text-xs uppercase tracking-[0.12em] text-[--muted]">Driver</div>
                <div className="mt-2 text-sm">Loading sessions…</div>
            </div>
        );
    }

    return (
        <div className="panel p-6">
            <div className="text-xs uppercase tracking-[0.12em] text-[--muted]">Sessions</div>
            <div className="mt-4 overflow-x-auto">
                <table className="data-table w-full">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Series</th>
                            <th>Track</th>
                            <th>Disc</th>
                            <th>Start</th>
                            <th>Finish</th>
                            <th>Inc</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sessions.map((s) => (
                            <tr key={s.sessionId} className="table-row">
                                <td className="font-mono text-xs">{new Date(s.startedAt).toLocaleString()}</td>
                                <td className="text-sm">{s.seriesName}</td>
                                <td className="text-sm">{s.trackName}</td>
                                <td className="text-xs uppercase tracking-wider">{s.discipline}</td>
                                <td className="font-mono">{s.startPos ?? '—'}</td>
                                <td className="font-mono">{s.finishPos ?? '—'}</td>
                                <td className="font-mono">{s.incidents ?? '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
