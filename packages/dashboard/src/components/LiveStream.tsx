import { useEffect, useState, useRef } from 'react';
import { socketClient } from '../lib/socket-client';

interface VideoFramePacket {
    sessionId: string;
    image: ArrayBuffer; // Raw binary
    timestamp: number;
}

export const LiveStream: React.FC = () => {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [stats, setStats] = useState({ fps: 0, kilobytes: 0 });

    // Use refs for stats calculation to avoid re-renders
    const frameCountRef = useRef(0);
    const byteCountRef = useRef(0);
    const lastStatTimeRef = useRef(Date.now());
    const previousUrlRef = useRef<string | null>(null);

    useEffect(() => {
        const handleFrame = (data: VideoFramePacket) => {
            // Revoke previous URL to prevent memory leaks
            if (previousUrlRef.current) {
                URL.revokeObjectURL(previousUrlRef.current);
            }

            // Create Blob from ArrayBuffer
            const blob = new Blob([data.image], { type: 'image/jpeg' });
            const url = URL.createObjectURL(blob);

            previousUrlRef.current = url;
            setImageSrc(url);

            // Update stats
            frameCountRef.current++;
            byteCountRef.current += data.image.byteLength;
        };

        socketClient.on('video:frame', handleFrame);

        // Stats interval
        const intervalId = setInterval(() => {
            const now = Date.now();
            const elapsed = (now - lastStatTimeRef.current) / 1000;

            if (elapsed >= 1.0) {
                setStats({
                    fps: Math.round(frameCountRef.current / elapsed),
                    kilobytes: Math.round((byteCountRef.current / 1024) / elapsed)
                });

                frameCountRef.current = 0;
                byteCountRef.current = 0;
                lastStatTimeRef.current = now;
            }
        }, 1000);

        return () => {
            // socketClient.off('video:frame', handleFrame); // Clean up if possible
            clearInterval(intervalId);
            if (previousUrlRef.current) {
                URL.revokeObjectURL(previousUrlRef.current);
            }
        };
    }, []);

    if (!imageSrc) {
        return (
            <div className="flex items-center justify-center h-full bg-black text-gray-500 text-sm font-mono border border-gray-800 rounded-lg aspect-video">
                <div className="flex flex-col items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500/50 animate-pulse"></span>
                    WAITING FOR SIGNAL...
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full bg-black rounded-lg overflow-hidden border border-gray-800 shadow-lg group">
            {/* Main Video Plane */}
            <img
                src={imageSrc}
                alt="Cockpit Live Stream"
                className="w-full h-full object-contain"
            />

            {/* Overlay UI */}
            <div className="absolute top-2 left-2 flex items-center gap-2">
                <span className="flex items-center gap-1 bg-red-600/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    LIVE
                </span>
                <span className="bg-black/50 backdrop-blur text-gray-300 text-[10px] font-mono px-1.5 py-0.5 rounded border border-white/10">
                    CAM 1
                </span>
            </div>

            {/* Tech Stats (Hidden by default, shown on hover) */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur px-2 py-1 rounded border border-white/10 pointer-events-none">
                <div className="flex flex-col items-end text-[10px] font-mono text-green-400">
                    <span>{stats.fps} FPS</span>
                    <span>{stats.kilobytes} KB/s</span>
                </div>
            </div>
        </div>
    );
};
