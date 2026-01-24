import { useEffect, useState } from 'react';
import { fetchMyDriverProfile, type DriverIdentityProfile } from '../../services/driver/driver.service';

export function DriverRatingsPage() {
    const [profile, setProfile] = useState<DriverIdentityProfile | null>(null);

    useEffect(() => {
        let active = true;
        fetchMyDriverProfile().then((p) => {
            if (active) setProfile(p);
        });
        return () => {
            active = false;
        };
    }, []);

    if (!profile) {
        return (
            <div className="panel p-6">
                <div className="text-xs uppercase tracking-[0.12em] text-[--muted]">Driver</div>
                <div className="mt-2 text-sm">Loading ratings…</div>
            </div>
        );
    }

    return (
        <div className="panel p-6">
            <div className="text-xs uppercase tracking-[0.12em] text-[--muted]">Ratings & Licensing</div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.licenses.map((l) => (
                    <div key={l.discipline} className="panel p-4 bg-[--panel2]">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-[10px] uppercase tracking-[0.12em] text-[--muted]">{l.discipline}</div>
                                <div className="mt-1 text-lg font-bold">{l.licenseClass}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-mono">SR {l.safetyRating.toFixed(2)}</div>
                                <div className="text-sm font-mono text-[--muted]">iR {l.iRating ?? '—'}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
