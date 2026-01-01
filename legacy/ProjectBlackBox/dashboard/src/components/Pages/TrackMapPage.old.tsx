import React, { useEffect, useState } from 'react';
import TrackMap from '../TrackMap/TrackMap';
import webSocketService, { TelemetryData, SessionInfo } from '../../services/WebSocketService';
import { BACKEND_URL } from '../../config/environment';

const TrackMapPage: React.FC = () => {
    const [telemetryData, setTelemetryData] = useState<TelemetryData | null>(null);
    const [trackName, setTrackName] = useState<string>('Silverstone');
    const [connected, setConnected] = useState<boolean>(false);

    useEffect(() => {
        const wsService = webSocketService;

        const handleConnect = () => setConnected(true);
        const handleDisconnect = () => setConnected(false);
        const handleTelemetryUpdate = (data: TelemetryData | TelemetryData[]) => {
            const latest = Array.isArray(data) ? data[data.length - 1] : data;
            setTelemetryData(latest);
        };
        const handleSessionUpdate = (data: Partial<SessionInfo>) => {
            if (data.track) setTrackName(data.track);
        };

        const subConnect = wsService.on('connect', handleConnect);
        const subDisconnect = wsService.on('disconnect', handleDisconnect);
        const subTelemetry = wsService.on('telemetry', handleTelemetryUpdate);
        const subSession = wsService.on('session_info', handleSessionUpdate);

        if (wsService.isConnectedToServer()) {
            setConnected(true);
        } else {
            wsService.connect(BACKEND_URL);
        }

        return () => {
            subConnect.unsubscribe();
            subDisconnect.unsubscribe();
            subTelemetry.unsubscribe();
            subSession.unsubscribe();
        };
    }, []);

    return (
        <div className="p-6 bg-gray-900 min-h-screen text-white flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                    <a href="/" className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm transition-colors border border-gray-700">
                        ← Back to Dashboard
                    </a>
                    <h1 className="text-3xl font-bold">Track Map</h1>
                </div>
                <div className="text-sm">
                    Status: <span className={connected ? "text-green-500" : "text-red-500"}>
                        {connected ? "Connected" : "Disconnected"}
                    </span>
                    <span className="ml-4 text-gray-400">Track: {trackName}</span>
                </div>
            </div>

            <div className="flex-1 bg-black rounded-lg border border-gray-800 overflow-hidden relative" style={{ minHeight: '600px' }}>
                <TrackMap telemetryData={telemetryData} trackName={trackName} />
            </div>
        </div>
    );
};

export default TrackMapPage;
