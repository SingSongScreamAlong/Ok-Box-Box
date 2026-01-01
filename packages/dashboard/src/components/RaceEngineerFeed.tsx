import React, { useEffect, useState, useRef } from 'react';
import { socketClient } from '../lib/socket-client';
import { format } from 'date-fns';

interface ExplanationPacket {
    packet: {
        type: string;
        eventTime: number;
        confidence: number;
    };
    summary: string;
    evidence: string;
    audioBase64?: string;
}

export const RaceEngineerFeed: React.FC = () => {
    const [events, setEvents] = useState<ExplanationPacket[]>([]);
    const [isMuted, setIsMuted] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleExplanation = (data: ExplanationPacket) => {
            setEvents(prev => [...prev, data]);

            // Auto-play audio if not muted and audio is available
            if (!isMuted && data.audioBase64) {
                playAudio(data.audioBase64);
            }
        };

        socketClient.on('explanation:generated', handleExplanation);

        return () => {
            // socketClient.off('explanation:generated', handleExplanation);
        };
    }, [isMuted]);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [events]);

    const playAudio = (base64Audio: string) => {
        try {
            // Create audio from base64
            const audioBlob = base64ToBlob(base64Audio, 'audio/mpeg');
            const audioUrl = URL.createObjectURL(audioBlob);

            // Play the audio
            if (audioRef.current) {
                audioRef.current.src = audioUrl;
                audioRef.current.play().catch(err => {
                    console.warn('Audio autoplay blocked:', err);
                });
            }
        } catch (err) {
            console.error('Failed to play audio:', err);
        }
    };

    const base64ToBlob = (base64: string, mimeType: string): Blob => {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    };

    const toggleMute = () => {
        setIsMuted(prev => !prev);
    };

    return (
        <div className="flex flex-col h-full bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
            {/* Hidden audio element for playback */}
            <audio ref={audioRef} />

            <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 font-bold text-gray-200 flex justify-between items-center">
                <span>🤖 Race Intelligence</span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleMute}
                        className={`text-xs px-2 py-0.5 rounded transition ${isMuted
                                ? 'bg-red-900 text-red-200'
                                : 'bg-green-900 text-green-200'
                            }`}
                    >
                        {isMuted ? '🔇 Muted' : '🔊 Voice On'}
                    </button>
                    <span className="text-xs bg-blue-900 text-blue-200 px-2 py-0.5 rounded">Voice Log</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {events.length === 0 && (
                    <div className="text-gray-500 text-center text-sm italic mt-10">
                        Waiting for race events...
                    </div>
                )}

                {events.map((evt, idx) => (
                    <div key={idx} className="bg-gray-800 rounded border-l-4 border-yellow-500 p-3 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-xs text-gray-400 font-mono">
                                {format(new Date(evt.packet.eventTime * 1000), 'HH:mm:ss')} • {evt.packet.type}
                            </span>
                            <div className="flex items-center gap-2">
                                {evt.audioBase64 && (
                                    <button
                                        onClick={() => playAudio(evt.audioBase64!)}
                                        className="text-xs text-cyan-400 hover:text-cyan-300"
                                        title="Replay audio"
                                    >
                                        🔊
                                    </button>
                                )}
                                <span className="text-xs text-gray-500">
                                    {evt.packet.confidence.toFixed(2)} Conf
                                </span>
                            </div>
                        </div>

                        <div className="text-lg text-white font-medium mb-2 leading-tight">
                            "{evt.summary}"
                        </div>

                        {evt.evidence && (
                            <div className="bg-gray-900/50 p-2 rounded text-xs font-mono text-cyan-300 border border-gray-700/50">
                                🔍 {evt.evidence}
                            </div>
                        )}
                    </div>
                ))}
                <div ref={endRef} />
            </div>
        </div>
    );
};
