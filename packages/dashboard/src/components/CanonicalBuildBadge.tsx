import React from 'react';
import { Link } from 'react-router-dom';

export const CanonicalBuildBadge: React.FC = () => {
    const env = import.meta.env.MODE;

    const shortCommit =
        __GIT_COMMIT__ && __GIT_COMMIT__ !== 'UNKNOWN'
            ? __GIT_COMMIT__.slice(0, 7)
            : undefined;

    return (
        <Link
            to="/about/build"
            className="fixed bottom-4 right-4 z-[9999] select-none"
            aria-label="Canonical build identity"
        >
            <div className="panel border-[--border-hard] shadow-lg px-4 py-2">
                <div className="text-[10px] uppercase tracking-[0.14em] font-semibold text-[--text]">
                    OK, BOX BOX — CANONICAL
                </div>
                <div className="mt-1 flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-[--muted]">{env}</span>
                    <span className="text-[--accent2]">v{__APP_VERSION__}</span>
                    {shortCommit ? (
                        <span className="text-[--muted]">{shortCommit}</span>
                    ) : (
                        <span className="text-[--muted]">NO-COMMIT</span>
                    )}
                </div>
            </div>
        </Link>
    );
};
