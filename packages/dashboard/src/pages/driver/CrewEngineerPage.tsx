/**
 * Crew Engineer Page
 * 
 * Live race engineer interface for the driver tier.
 * Shows real-time telemetry, strategy recommendations, and voice interaction.
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { socketClient } from '../../lib/socket-client';
import { RaceEngineerFeed } from '../../components/RaceEngineerFeed';
import './CrewEngineerPage.css';

interface TelemetryData {
    speed: number;
    rpm: number;
    gear: number;
    throttle: number;
    brake: number;
    lap: number;
    position: number;
    lastLapTime: number;
    bestLapTime: number;
    trackPosition: number;
    fuel: { level: number };
    timestamp: number;
}

interface SessionInfo {
    track: string;
    session: string;
    sessionId: string;
}

interface CompetitorData {
    position: number;
    driver: string;
    gap: string;
    lastLap: string;
}

export function CrewEngineerPage() {
    const [isConnected, setIsConnected] = useState(false);
    const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
    const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
    const [competitors, setCompetitors] = useState<CompetitorData[]>([]);
    const [isPTTActive, setIsPTTActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastResponse, setLastResponse] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Connection handlers
        socketClient.on('onConnect', () => {
            setIsConnected(true);
            // Join as dashboard client
            socketClient.emit('dashboard:join', { type: 'crew-engineer' });
        });

        socketClient.on('onDisconnect', () => {
            setIsConnected(false);
        });

        // Session info
        socketClient.on('onSessionActive', (data) => {
            setSessionInfo({
                track: data.trackName,
                session: data.sessionType,
                sessionId: data.sessionId
            });
        });

        // Check initial connection
        if (socketClient.getStatus() === 'connected') {
            setIsConnected(true);
            socketClient.emit('dashboard:join', { type: 'crew-engineer' });
        }

        // Connect
        socketClient.connect();

        // Listen for raw socket events for telemetry
        const socket = (socketClient as any).socket;
        if (socket) {
            socket.on('session_info', (data: SessionInfo) => {
                setSessionInfo(data);
            });

            socket.on('telemetry_update', (data: TelemetryData) => {
                setTelemetry(data);
            });

            socket.on('competitor_data', (data: CompetitorData[]) => {
                setCompetitors(data);
            });

            socket.on('voice:response', (message: any) => {
                setIsProcessing(false);
                if (message.success) {
                    setLastResponse(message.response);
                    if (message.audioBase64 && audioRef.current) {
                        const audioBlob = base64ToBlob(message.audioBase64, 'audio/mpeg');
                        const audioUrl = URL.createObjectURL(audioBlob);
                        audioRef.current.src = audioUrl;
                        audioRef.current.play().catch(console.error);
                    }
                }
            });
        }

        return () => {
            socketClient.off('onConnect');
            socketClient.off('onDisconnect');
            socketClient.off('onSessionActive');
        };
    }, []);

    const base64ToBlob = (base64: string, mimeType: string): Blob => {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
    };

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.start();
            mediaRecorderRef.current = mediaRecorder;
            setIsPTTActive(true);
        } catch (err) {
            console.error('Failed to start recording:', err);
        }
    }, []);

    const stopRecording = useCallback(async () => {
        if (!mediaRecorderRef.current) return;

        return new Promise<void>((resolve) => {
            const mediaRecorder = mediaRecorderRef.current!;

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

                setIsProcessing(true);

                try {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64Audio = (reader.result as string).split(',')[1];
                        socketClient.emit('voice:query', {
                            audio: base64Audio,
                            format: 'webm'
                        });
                    };
                    reader.readAsDataURL(audioBlob);
                } catch (err) {
                    console.error('Failed to send audio:', err);
                    setIsProcessing(false);
                }

                mediaRecorder.stream.getTracks().forEach(track => track.stop());
                mediaRecorderRef.current = null;
                resolve();
            };

            mediaRecorder.stop();
            setIsPTTActive(false);
        });
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'KeyV' && !e.repeat && !isPTTActive && !isProcessing) {
                startRecording();
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'KeyV' && isPTTActive) {
                stopRecording();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isPTTActive, isProcessing, startRecording, stopRecording]);

    const formatLapTime = (seconds: number): string => {
        if (!seconds || seconds <= 0) return '—';
        const mins = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(3);
        return mins > 0 ? `${mins}:${secs.padStart(6, '0')}` : secs;
    };

    return (
        <div className="crew-engineer-page">
            <audio ref={audioRef} />

            {/* Header */}
            <div className="crew-header">
                <div className="crew-title">
                    <div className="crew-label">CREW</div>
                    <h1>Race Engineer</h1>
                </div>
                <div className="crew-status">
                    <span className={`status-badge ${isConnected ? 'connected' : 'disconnected'}`}>
                        {isConnected ? '● LIVE' : '○ OFFLINE'}
                    </span>
                    {sessionInfo && (
                        <span className="session-badge">
                            {sessionInfo.track} • {sessionInfo.session.toUpperCase()}
                        </span>
                    )}
                </div>
            </div>

            {/* Main Grid */}
            <div className="crew-grid">
                {/* Left Panel - Telemetry */}
                <div className="crew-panel telemetry-panel">
                    <div className="panel-header">Live Telemetry</div>
                    <div className="telemetry-grid">
                        <div className="telemetry-item large">
                            <span className="telemetry-label">SPEED</span>
                            <span className="telemetry-value">{telemetry?.speed ?? 0}</span>
                            <span className="telemetry-unit">MPH</span>
                        </div>
                        <div className="telemetry-item">
                            <span className="telemetry-label">GEAR</span>
                            <span className="telemetry-value gear">{telemetry?.gear ?? 'N'}</span>
                        </div>
                        <div className="telemetry-item">
                            <span className="telemetry-label">LAP</span>
                            <span className="telemetry-value">{telemetry?.lap ?? 0}</span>
                        </div>
                        <div className="telemetry-item">
                            <span className="telemetry-label">POSITION</span>
                            <span className="telemetry-value">P{telemetry?.position ?? '-'}</span>
                        </div>
                        <div className="telemetry-item">
                            <span className="telemetry-label">FUEL</span>
                            <span className="telemetry-value">{telemetry?.fuel?.level?.toFixed(1) ?? '--'}</span>
                            <span className="telemetry-unit">L</span>
                        </div>
                        <div className="telemetry-item wide">
                            <span className="telemetry-label">LAST LAP</span>
                            <span className="telemetry-value time">{formatLapTime(telemetry?.lastLapTime ?? 0)}</span>
                        </div>
                        <div className="telemetry-item wide">
                            <span className="telemetry-label">BEST LAP</span>
                            <span className="telemetry-value time best">{formatLapTime(telemetry?.bestLapTime ?? 0)}</span>
                        </div>
                    </div>

                    {/* Throttle/Brake Bars */}
                    <div className="input-bars">
                        <div className="input-bar throttle">
                            <span className="input-label">THR</span>
                            <div className="input-track">
                                <div className="input-fill" style={{ width: `${telemetry?.throttle ?? 0}%` }} />
                            </div>
                            <span className="input-value">{Math.round(telemetry?.throttle ?? 0)}%</span>
                        </div>
                        <div className="input-bar brake">
                            <span className="input-label">BRK</span>
                            <div className="input-track">
                                <div className="input-fill" style={{ width: `${telemetry?.brake ?? 0}%` }} />
                            </div>
                            <span className="input-value">{Math.round(telemetry?.brake ?? 0)}%</span>
                        </div>
                    </div>
                </div>

                {/* Center Panel - Engineer Feed */}
                <div className="crew-panel engineer-panel">
                    <RaceEngineerFeed />
                </div>

                {/* Right Panel - Leaderboard */}
                <div className="crew-panel leaderboard-panel">
                    <div className="panel-header">Standings</div>
                    <div className="leaderboard">
                        {competitors.length === 0 ? (
                            <div className="empty-state">Waiting for data...</div>
                        ) : (
                            competitors.slice(0, 10).map((c, i) => (
                                <div key={i} className={`leaderboard-row ${c.position === telemetry?.position ? 'highlight' : ''}`}>
                                    <span className="lb-pos">P{c.position}</span>
                                    <span className="lb-driver">{c.driver}</span>
                                    <span className="lb-gap">{c.gap}</span>
                                    <span className="lb-lap">{c.lastLap}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Engineer Response */}
            {lastResponse && (
                <div className="engineer-response">
                    <span className="response-icon">🎧</span>
                    <span className="response-text">"{lastResponse}"</span>
                </div>
            )}

            {/* PTT Button */}
            <button
                className={`ptt-button ${isPTTActive ? 'active' : ''} ${isProcessing ? 'processing' : ''}`}
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={() => isPTTActive && stopRecording()}
                disabled={isProcessing || !isConnected}
            >
                <span className="ptt-icon">🎙️</span>
                <span className="ptt-label">
                    {isProcessing ? 'PROCESSING...' : isPTTActive ? 'LISTENING...' : 'HOLD TO SPEAK'}
                </span>
                <span className="ptt-hint">Press V</span>
            </button>
        </div>
    );
}

export default CrewEngineerPage;
