declare global {
    interface Window {
        electronAPI: {
            getStatus: () => Promise<{
                iracing: boolean;
                server: boolean;
            }>;
            onTelemetry: (callback: (data: any) => void) => void;
            onSession: (callback: (data: any) => void) => void;
            onRelayStatus: (callback: (status: string) => void) => void;
            onIRacingStatus: (callback: (status: string) => void) => void;
            removeAllListeners: (channel: string) => void;
        };
    }
}
export {};
