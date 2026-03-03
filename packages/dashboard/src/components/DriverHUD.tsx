/**
 * Driver HUD Component
 *
 * Modular dashboard with PTT voice recording capability.
 * Features:
 * - Central speed/gear/RPM display
 * - Side panels for fuel, tires, gaps
 * - PTT button — records audio, streams response with NDJSON
 * - Ack audio ("Copy, checking...") plays immediately after STT
 * - Full engineer response plays with radio crackle filter
 * - Error state flash when something goes wrong
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { socketClient } from '../lib/socket-client';
import './DriverHUD.css';

interface TelemetryData {
    speed: number;
    rpm: number;
    rpmMax: number;
    gear: number;
    fuelLevel: number;
    fuelPerLap: number;
    lapsRemaining: number;
    tireWear: {
        fl: number;
        fr: number;
        rl: number;
        rr: number;
    };
    position: number;
    totalCars: number;
    gapAhead: number | null;
    gapBehind: number | null;
    lapNumber: number;
    lastLapTime: number | null;
    bestLapTime: number | null;
    delta: number | null;
}

interface DriverHUDProps {
    sessionId?: string;
}

// ============================================================================
// Web Audio — radio crackle filter chain (band-pass + light distortion)
// ============================================================================

interface AudioGraph {
    ctx: AudioContext;
    input: AudioNode;
}

function buildAudioGraph(): AudioGraph {
    const ctx = new AudioContext();

    // Band-pass: cut below 800 Hz and above 3500 Hz (radio characteristic)
    const highPass = ctx.createBiquadFilter();
    highPass.type = 'highpass';
    highPass.frequency.value = 800;
    highPass.Q.value = 0.7;

    const lowPass = ctx.createBiquadFilter();
    lowPass.type = 'lowpass';
    lowPass.frequency.value = 3500;
    lowPass.Q.value = 0.7;

    // Soft-clip distortion for crackle texture
    const distortion = ctx.createWaveShaper();
    const n = 256;
    const curve = new Float32Array(n);
    const drive = 12;
    for (let i = 0; i < n; i++) {
        const x = (i * 2) / n - 1;
        curve[i] = (Math.PI + drive) * x / (Math.PI + drive * Math.abs(x));
    }
    distortion.curve = curve;

    // Compressor — keeps volume punchy and consistent
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 3;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.001;
    compressor.release.value = 0.1;

    highPass.connect(lowPass);
    lowPass.connect(distortion);
    distortion.connect(compressor);
    compressor.connect(ctx.destination);

    return { ctx, input: highPass };
}

// ============================================================================
// Component
// ============================================================================

export const DriverHUD: React.FC<DriverHUDProps> = ({ sessionId }) => {
    const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
    const [isPTTActive, setIsPTTActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [lastResponse, setLastResponse] = useState<string | null>(null);
    const [lastTranscript, setLastTranscript] = useState<string | null>(null);
    const [voiceError, setVoiceError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioGraphRef = useRef<AudioGraph | null>(null);

    // Auto-clear error after 4 seconds
    useEffect(() => {
        if (!voiceError) return;
        const t = setTimeout(() => setVoiceError(null), 4000);
        return () => clearTimeout(t);
    }, [voiceError]);

    // Subscribe to telemetry updates
    useEffect(() => {
        const handleTelemetry = (data: TelemetryData) => {
            setTelemetry(data);
            setIsConnected(true);
        };
        const handleDisconnect = () => setIsConnected(false);

        socketClient.on('telemetry:driver', handleTelemetry);
        socketClient.on('disconnect', handleDisconnect);

        return () => {
            socketClient.off('telemetry:driver');
            socketClient.off('disconnect');
        };
    }, [sessionId]);

    // ── Audio graph (lazy init on first PTT press) ────────────────────────────

    const ensureAudioGraph = useCallback((): AudioGraph => {
        if (!audioGraphRef.current) {
            audioGraphRef.current = buildAudioGraph();
        }
        return audioGraphRef.current;
    }, []);

    const playWithCrackle = useCallback(async (audioBase64: string): Promise<void> => {
        try {
            const graph = ensureAudioGraph();
            if (graph.ctx.state === 'suspended') await graph.ctx.resume();

            const binary = atob(audioBase64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

            const audioBuffer = await graph.ctx.decodeAudioData(bytes.buffer);
            const source = graph.ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(graph.input);
            source.start();
        } catch (err) {
            console.error('[HUD] Audio playback error:', err);
        }
    }, [ensureAudioGraph]);

    // ── PTT recording ─────────────────────────────────────────────────────────

    const startRecording = useCallback(async () => {
        // Ensure AudioContext is unblocked on first user gesture
        ensureAudioGraph();

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });

            audioChunksRef.current = [];
            mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
            mediaRecorder.start();
            mediaRecorderRef.current = mediaRecorder;
            setIsPTTActive(true);
        } catch (err) {
            console.error('[HUD] Failed to start recording:', err);
            setVoiceError('Mic access denied');
        }
    }, [ensureAudioGraph]);

    const stopRecording = useCallback(async () => {
        if (!mediaRecorderRef.current) return;

        setIsPTTActive(false);
        setIsProcessing(true);

        const mediaRecorder = mediaRecorderRef.current;

        return new Promise<void>((resolve) => {
            mediaRecorder.onstop = async () => {
                try {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    const base64Audio = await blobToBase64(audioBlob);

                    const response = await fetch('/api/voice/query', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            audio: base64Audio,
                            sessionId: sessionId || 'driver-session',
                            driverId: 'driver',
                        }),
                    });

                    if (!response.ok || !response.body) {
                        setVoiceError('No response from engineer');
                        return;
                    }

                    // ── NDJSON stream reader ──────────────────────────────────
                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    let buffer = '';

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop() ?? '';

                        for (const line of lines) {
                            if (!line.trim()) continue;
                            try {
                                const chunk = JSON.parse(line) as {
                                    type: string;
                                    text?: string;
                                    audioBase64?: string;
                                    message?: string;
                                };

                                switch (chunk.type) {
                                    case 'transcript':
                                        setLastTranscript(chunk.text ?? null);
                                        break;

                                    case 'ack':
                                        // Play immediately — driver hears "Copy, checking..." while LLM runs
                                        if (chunk.audioBase64) {
                                            playWithCrackle(chunk.audioBase64);
                                        }
                                        break;

                                    case 'response':
                                        setLastResponse(chunk.text ?? null);
                                        break;

                                    case 'audio':
                                        // Full engineer response with radio crackle
                                        if (chunk.audioBase64) {
                                            playWithCrackle(chunk.audioBase64);
                                        }
                                        break;

                                    case 'error':
                                        setVoiceError(chunk.message ?? 'Engineer unavailable');
                                        break;

                                    case 'done':
                                        // Stream complete
                                        break;
                                }
                            } catch {
                                // Malformed JSON line — skip
                            }
                        }
                    }
                } catch (err) {
                    console.error('[HUD] Voice query error:', err);
                    setVoiceError('Radio link failed');
                } finally {
                    setIsProcessing(false);
                    mediaRecorder.stream.getTracks().forEach(t => t.stop());
                    resolve();
                }
            };

            mediaRecorder.stop();
        });
    }, [sessionId, playWithCrackle]);

    // ── PTT handlers ──────────────────────────────────────────────────────────

    const handlePTTDown = useCallback(() => {
        if (!isProcessing) startRecording();
    }, [isProcessing, startRecording]);

    const handlePTTUp = useCallback(() => {
        if (isPTTActive) stopRecording();
    }, [isPTTActive, stopRecording]);

    // ── Format helpers ────────────────────────────────────────────────────────

    const formatLapTime = (seconds: number | null): string => {
        if (seconds === null || seconds <= 0) return '--:--.---';
        const minutes = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(3);
        return `${minutes}:${secs.padStart(6, '0')}`;
    };

    const formatGap = (gap: number | null): string => {
        if (gap === null) return '---';
        return `${gap >= 0 ? '+' : ''}${gap.toFixed(2)}`;
    };

    const formatDelta = (delta: number | null): { text: string; className: string } => {
        if (delta === null) return { text: '-.---', className: '' };
        const sign = delta >= 0 ? '+' : '-';
        return {
            text: `${sign}${Math.abs(delta).toFixed(3)}`,
            className: delta < 0 ? 'delta-faster' : delta > 0 ? 'delta-slower' : '',
        };
    };

    const getWearClass = (wear: number): string => {
        if (wear > 80) return 'wear-critical';
        if (wear > 50) return 'wear-warning';
        return 'wear-good';
    };

    const fuelLaps = telemetry?.fuelPerLap && telemetry.fuelPerLap > 0
        ? Math.floor(telemetry.fuelLevel / telemetry.fuelPerLap)
        : null;

    const deltaInfo = formatDelta(telemetry?.delta ?? null);
    const rpmPct = telemetry ? Math.min(100, (telemetry.rpm / telemetry.rpmMax) * 100) : 0;
    const isShiftLight = rpmPct > 95;

    return (
        <div className={`lovely-hud ${isConnected ? '' : 'disconnected'}`}>
            {/* Branding */}
            <div className="hud-brand">
                <span className="brand-text">OK, BOX BOX</span>
                <span className={`brand-status ${isConnected ? 'live' : ''}`}>
                    {isConnected ? '● LIVE' : '○ OFFLINE'}
                </span>
            </div>

            {/* RPM Bar */}
            <div className={`rpm-strip ${isShiftLight ? 'shift-light' : ''}`}>
                <div className="rpm-fill" style={{ width: `${rpmPct}%` }} />
                <div className="rpm-markers">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} className="rpm-marker" />
                    ))}
                </div>
            </div>

            {/* Main Dashboard Grid */}
            <div className="hud-grid">
                {/* Left Panel */}
                <div className="hud-panel panel-left">
                    <div className="info-block position-block">
                        <span className="info-label">POS</span>
                        <span className="info-value position-value">
                            P{telemetry?.position ?? '-'}
                            <span className="position-total">/{telemetry?.totalCars ?? '-'}</span>
                        </span>
                    </div>
                    <div className="info-block">
                        <span className="info-label">GAP AHEAD</span>
                        <span className="info-value gap-value">{formatGap(telemetry?.gapAhead ?? null)}</span>
                    </div>
                    <div className="info-block">
                        <span className="info-label">BEHIND</span>
                        <span className="info-value gap-value">{formatGap(telemetry?.gapBehind ?? null)}</span>
                    </div>
                </div>

                {/* Center Panel */}
                <div className="hud-panel panel-center">
                    <div className="center-display">
                        <div className="gear-display">
                            <span className="gear-value">{telemetry?.gear ?? 'N'}</span>
                        </div>
                        <div className="speed-display">
                            <span className="speed-value">{telemetry?.speed ?? 0}</span>
                            <span className="speed-unit">MPH</span>
                        </div>
                        <div className={`delta-display ${deltaInfo.className}`}>
                            <span className="delta-value">{deltaInfo.text}</span>
                        </div>
                    </div>
                    <div className="lap-info">
                        <div className="lap-block">
                            <span className="lap-label">LAP</span>
                            <span className="lap-value">{telemetry?.lapNumber ?? 0}</span>
                        </div>
                        <div className="lap-block">
                            <span className="lap-label">LAST</span>
                            <span className="lap-value time">{formatLapTime(telemetry?.lastLapTime ?? null)}</span>
                        </div>
                        <div className="lap-block best">
                            <span className="lap-label">BEST</span>
                            <span className="lap-value time">{formatLapTime(telemetry?.bestLapTime ?? null)}</span>
                        </div>
                    </div>
                </div>

                {/* Right Panel */}
                <div className="hud-panel panel-right">
                    <div className="info-block fuel-block">
                        <span className="info-label">FUEL</span>
                        <span className="info-value">{telemetry?.fuelLevel?.toFixed(1) ?? '--'} L</span>
                        <span className="info-sub">{fuelLaps !== null ? `~${fuelLaps} LAPS` : '--'}</span>
                    </div>
                    <div className="tire-display">
                        <div className="tire-row">
                            <div className={`tire ${getWearClass(telemetry?.tireWear.fl ?? 0)}`}>
                                {telemetry?.tireWear.fl ?? 0}%
                            </div>
                            <div className={`tire ${getWearClass(telemetry?.tireWear.fr ?? 0)}`}>
                                {telemetry?.tireWear.fr ?? 0}%
                            </div>
                        </div>
                        <div className="tire-row">
                            <div className={`tire ${getWearClass(telemetry?.tireWear.rl ?? 0)}`}>
                                {telemetry?.tireWear.rl ?? 0}%
                            </div>
                            <div className={`tire ${getWearClass(telemetry?.tireWear.rr ?? 0)}`}>
                                {telemetry?.tireWear.rr ?? 0}%
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Engineer Readout — transcript while waiting, response when ready */}
            {voiceError ? (
                <div className="engineer-response error">
                    <span className="response-icon">⚠</span>
                    <span className="response-text">{voiceError}</span>
                </div>
            ) : isProcessing && lastTranscript ? (
                <div className="engineer-response processing">
                    <span className="response-icon">🎙</span>
                    <span className="response-text">"{lastTranscript}"</span>
                </div>
            ) : lastResponse ? (
                <div className="engineer-response">
                    <span className="response-icon">🎧</span>
                    <span className="response-text">"{lastResponse}"</span>
                </div>
            ) : null}

            {/* PTT Button */}
            <button
                className={`ptt-button ${isPTTActive ? 'active' : ''} ${isProcessing ? 'processing' : ''}`}
                onMouseDown={handlePTTDown}
                onMouseUp={handlePTTUp}
                onMouseLeave={handlePTTUp}
                onTouchStart={handlePTTDown}
                onTouchEnd={handlePTTUp}
                disabled={isProcessing}
            >
                <span className="ptt-icon">{isProcessing ? '⏳' : '🎙️'}</span>
                <span className="ptt-text">
                    {isProcessing ? 'ENGINEER...' : isPTTActive ? 'SPEAKING...' : 'ASK ENGINEER'}
                </span>
            </button>
        </div>
    );
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

export default DriverHUD;
