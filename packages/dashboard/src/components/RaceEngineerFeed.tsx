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
}

export const RaceEngineerFeed: React.FC = () => {
    const [events, setEvents] = useState<ExplanationPacket[]>([]);
    const endRef = useRef<HTMLDivElement>(null);

    // TODO: Verify useSocket hook availability, for now assuming standard pattern
    // const socket = useSocket();

    useEffect(() => {
        const handleExplanation = (data: ExplanationPacket) => {
            setEvents(prev => [...prev, data]);
        };

        // Listen for new explanations
        // Note: 'explanation:generated' event name must match server emission
        socketClient.on('explanation:generated', handleExplanation);

        return () => {
            // socketClient.off('explanation:generated', handleExplanation);
        };
    }, []);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [events]);

    return (
        <div className="flex flex-col h-full bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
            <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 font-bold text-gray-200 flex justify-between items-center">
                <span>🤖 Race Intelligence</span>
                <span className="text-xs bg-blue-900 text-blue-200 px-2 py-0.5 rounded">Voice Log</span>
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
                            <span className="text-xs text-gray-500">
                                {evt.packet.confidence.toFixed(2)} Conf
                            </span>
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
