/**
 * Driver Status Panel
 * 
 * AUTHORITATIVE SCOPE (per ROADMAP-30-60-90.md §1.1):
 * - This is NOT a telemetry overlay
 * - This is NOT a data visualization surface
 * - Driver is NOT expected to look at this during on-track driving
 * 
 * PURPOSE:
 * - Confirm relay connectivity
 * - Confirm telemetry flow (health check only, not data)
 * - Confirm voice listening / mute state
 * - Confirm AI availability
 * - Confirm session context (Practice / Qual / Race)
 * - Surface rare, high-signal error states only
 * 
 * DESIGN PHILOSOPHY:
 * - Voice-first interaction is the primary driver interface
 * - Functions as a system status / annunciator panel, not a dashboard
 * - If the driver never looks at it during a lap, it is working correctly
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { socketClient } from '../lib/socket-client';
import './DriverStatusPanel.css';

type RelayStatus = 'connected' | 'connecting' | 'disconnected';
type VoiceStatus = 'ready' | 'listening' | 'processing' | 'muted';
type AIStatus = 'ready' | 'busy' | 'unavailable';
type SessionType = 'practice' | 'qualifying' | 'race' | 'offline';

interface StatusPanelState {
    relay: RelayStatus;
    voice: VoiceStatus;
    ai: AIStatus;
    session: SessionType;
    lastAIMessage: string | null;
    error: string | null;
}

export const DriverStatusPanel: React.FC = () => {
    const [status, setStatus] = useState<StatusPanelState>({
        relay: 'disconnected',
        voice: 'ready',
        ai: 'ready',
        session: 'offline',
        lastAIMessage: null,
        error: null,
    });

    const [isPTTActive, setIsPTTActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Audio recording refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Subscribe to connection status using the socketClient's event system
    useEffect(() => {
        // Use the socketClient's typed event handlers
        socketClient.on('onConnect', () => {
            setStatus(prev => ({ ...prev, relay: 'connected', error: null }));
        });

        socketClient.on('onDisconnect', () => {
            setStatus(prev => ({ ...prev, relay: 'disconnected' }));
        });

        socketClient.on('onSessionActive', (data) => {
            const sessionType = data.sessionType?.toLowerCase() || 'practice';
            let mapped: SessionType = 'practice';
            if (sessionType.includes('qual')) mapped = 'qualifying';
            else if (sessionType.includes('race')) mapped = 'race';
            else if (sessionType.includes('practice')) mapped = 'practice';
            
            setStatus(prev => ({ ...prev, session: mapped, relay: 'connected' }));
        });

        socketClient.on('telemetry:driver', () => {
            // Just confirms telemetry is flowing - we don't display the data
            setStatus(prev => ({ ...prev, relay: 'connected' }));
        });

        // Voice response handler
        socketClient.on('voice:response', (message) => {
            setIsProcessing(false);
            setStatus(prev => ({ ...prev, voice: 'ready', ai: 'ready' }));

            if (message.success) {
                // Update last AI message
                setStatus(prev => ({ ...prev, lastAIMessage: message.response }));

                // Play audio response if available
                if (message.audioBase64 && audioRef.current) {
                    const audioBlob = new Blob(
                        [Uint8Array.from(atob(message.audioBase64), c => c.charCodeAt(0))],
                        { type: 'audio/mpeg' }
                    );
                    const audioUrl = URL.createObjectURL(audioBlob);
                    audioRef.current.src = audioUrl;
                    audioRef.current.play().catch(err => {
                        console.error('Failed to play audio:', err);
                    });
                }
            } else {
                setStatus(prev => ({ ...prev, error: message.error || 'Voice query failed' }));
            }
        });

        // Check initial connection state
        if (socketClient.getStatus() === 'connected') {
            setStatus(prev => ({ ...prev, relay: 'connected' }));
        }

        // Connect to server
        socketClient.connect();

        return () => {
            socketClient.off('onConnect');
            socketClient.off('onDisconnect');
            socketClient.off('onSessionActive');
            socketClient.off('telemetry:driver');
            socketClient.off('voice:response');
        };
    }, []);

    // PTT Recording
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
            setStatus(prev => ({ ...prev, voice: 'listening' }));
        } catch (err) {
            console.error('Failed to start recording:', err);
            setStatus(prev => ({ ...prev, error: 'Microphone access denied' }));
        }
    }, []);

    const stopRecording = useCallback(async () => {
        if (!mediaRecorderRef.current) return;

        return new Promise<void>((resolve) => {
            const mediaRecorder = mediaRecorderRef.current!;

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                
                // Send to server
                setIsProcessing(true);
                setStatus(prev => ({ ...prev, voice: 'processing', ai: 'busy' }));

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
                    setStatus(prev => ({ ...prev, error: 'Failed to send voice query' }));
                    setIsProcessing(false);
                }

                // Stop all tracks
                mediaRecorder.stream.getTracks().forEach(track => track.stop());
                mediaRecorderRef.current = null;
                resolve();
            };

            mediaRecorder.stop();
            setIsPTTActive(false);
            setStatus(prev => ({ ...prev, voice: 'processing' }));
        });
    }, []);

    // Keyboard shortcut for PTT (V key)
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

    const getStatusColor = (status: string): string => {
        switch (status) {
            case 'connected':
            case 'ready':
                return 'status-green';
            case 'connecting':
            case 'listening':
            case 'busy':
                return 'status-yellow';
            case 'processing':
                return 'status-blue';
            case 'disconnected':
            case 'unavailable':
            case 'muted':
                return 'status-red';
            default:
                return 'status-gray';
        }
    };

    const getStatusLabel = (type: string, value: string): string => {
        switch (type) {
            case 'relay':
                return value === 'connected' ? 'LIVE' : value === 'connecting' ? 'CONNECTING' : 'OFFLINE';
            case 'voice':
                return value.toUpperCase();
            case 'ai':
                return value.toUpperCase();
            case 'session':
                return value === 'qualifying' ? 'QUAL' : value.toUpperCase();
            default:
                return value.toUpperCase();
        }
    };

    return (
        <div className="driver-status-panel">
            {/* Hidden audio element for AI responses */}
            <audio ref={audioRef} />

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                <Link to="/driver/idp" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                    Open Driver IDP
                </Link>
            </div>

            {/* Status Indicators */}
            <div className="status-indicators">
                <div className="status-indicator">
                    <span className="status-label">RELAY</span>
                    <span className={`status-dot ${getStatusColor(status.relay)}`} />
                    <span className="status-value">{getStatusLabel('relay', status.relay)}</span>
                </div>

                <div className="status-indicator">
                    <span className="status-label">VOICE</span>
                    <span className={`status-dot ${getStatusColor(status.voice)}`} />
                    <span className="status-value">{getStatusLabel('voice', status.voice)}</span>
                </div>

                <div className="status-indicator">
                    <span className="status-label">AI</span>
                    <span className={`status-dot ${getStatusColor(status.ai)}`} />
                    <span className="status-value">{getStatusLabel('ai', status.ai)}</span>
                </div>

                <div className="status-indicator">
                    <span className="status-label">SESSION</span>
                    <span className="status-value session-type">{getStatusLabel('session', status.session)}</span>
                </div>
            </div>

            {/* AI Message Display */}
            {status.lastAIMessage && (
                <div className="ai-message">
                    <span className="ai-icon">🎧</span>
                    <span className="ai-text">"{status.lastAIMessage}"</span>
                </div>
            )}

            {/* Error Display */}
            {status.error && (
                <div className="error-message">
                    <span className="error-icon">⚠️</span>
                    <span className="error-text">{status.error}</span>
                    <button 
                        className="error-dismiss"
                        onClick={() => setStatus(prev => ({ ...prev, error: null }))}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* PTT Button */}
            <button
                className={`ptt-button ${isPTTActive ? 'active' : ''} ${isProcessing ? 'processing' : ''}`}
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={() => isPTTActive && stopRecording()}
                disabled={isProcessing || status.relay === 'disconnected'}
            >
                <span className="ptt-icon">🎙️</span>
                <span className="ptt-label">
                    {isProcessing ? 'PROCESSING...' : isPTTActive ? 'LISTENING...' : 'HOLD TO SPEAK'}
                </span>
                <span className="ptt-hint">Press V</span>
            </button>
        </div>
    );
};

export default DriverStatusPanel;
