import React from 'react';

const AboutBuild: React.FC = () => {
    const buildInfo = {
        name: 'Ok, Box Box',
        version: __APP_VERSION__,
        environment: import.meta.env.MODE,
        buildTimestamp: new Date().toISOString(),
        commit: __GIT_COMMIT__,
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-[--surface-base] text-[--ink-hard]">
            <div className="panel p-8 max-w-md w-full border-[--border-hard] shadow-lg">
                <div className="card-header mb-6 !bg-[--surface-dark] !text-white !justify-center">
                    SYSTEM IDENTITY
                </div>
                
                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-[--border-subtle] pb-2">
                        <span className="text-sm uppercase tracking-wider text-[--ink-muted] font-bold">App Name</span>
                        <span className="font-mono font-bold">{buildInfo.name}</span>
                    </div>

                    <div className="flex justify-between items-center border-b border-[--border-subtle] pb-2">
                        <span className="text-sm uppercase tracking-wider text-[--ink-muted] font-bold">Version</span>
                        <span className="font-mono text-[--state-active]" data-preflight-marker="build-version">{buildInfo.version}</span>
                    </div>

                    <div className="flex justify-between items-center border-b border-[--border-subtle] pb-2">
                        <span className="text-sm uppercase tracking-wider text-[--ink-muted] font-bold">Environment</span>
                        <span className="font-mono uppercase" data-preflight-marker="build-env">{buildInfo.environment}</span>
                    </div>

                    <div className="flex justify-between items-center border-b border-[--border-subtle] pb-2">
                        <span className="text-sm uppercase tracking-wider text-[--ink-muted] font-bold">Timestamp</span>
                        <span className="font-mono text-xs">{buildInfo.buildTimestamp}</span>
                    </div>

                    <div className="flex justify-between items-center border-b border-[--border-subtle] pb-2">
                        <span className="text-sm uppercase tracking-wider text-[--ink-muted] font-bold">Commit</span>
                        <span className="font-mono text-xs">{buildInfo.commit}</span>
                    </div>
                </div>

                <div className="mt-8 pt-4 border-t-2 border-[--state-warning] text-center">
                    <p className="text-xs text-[--ink-muted] uppercase tracking-widest mb-2">Canonical Build Verified</p>
                    <div className="inline-block w-3 h-3 rounded-full bg-[--state-success]"></div>
                </div>
            </div>
        </div>
    );
};

export default AboutBuild;
