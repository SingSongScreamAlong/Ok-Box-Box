/**
 * Driver HUD Component
 *
 * PTT voice pipeline — two paths, same output:
 *
 * FAST PATH (browser Web Speech API, ~50ms STT):
 *   PTT release → SpeechRecognition result → POST /voice/query-text (NDJSON)
 *     → ack audio plays immediately
 *     → {type:"response", text} → GET /voice/tts-stream (binary streaming audio)
 *     → response audio plays as bytes arrive (first word ~575ms from PTT release)
 *
 * FALLBACK (Whisper, ~450ms STT):
 *   PTT release → audio blob → POST /voice/query (NDJSON)
 *     → ack audio after STT
 *     → {type:"audio", audioBase64} → plays from buffer
 *
 * All audio passes through a radio crackle Web Audio filter chain:
 *   800–3500 Hz band-pass + soft-clip distortion + dynamics compressor
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { socketClient } from '../lib/socket-client';
import './DriverHUD.css';

// ── Types ────────────────────────────────────────────────────────────────────

interface TelemetryData {
    speed: number;
    rpm: number;
    rpmMax: number;
    gear: number;
    fuelLevel: number;
    fuelPerLap: number;
    lapsRemaining: number;
    tireWear: { fl: number; fr: number; rl: number; rr: number };
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

// ── Browser SpeechRecognition types (not in standard TS lib) ─────────────────

interface SpeechRecognitionEvent {
    results: { [i: number]: { [j: number]: { transcript: string } } };
}
interface BrowserSpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    onresult: ((e: SpeechRecognitionEvent) => void) | null;
    onerror: ((e: Event) => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
}
declare let SpeechRecognition: { new(): BrowserSpeechRecognition };

function getSpeechRecognition(): BrowserSpeechRecognition | null {
    const w = window as unknown as Record<string, unknown>;
    const Ctor = (w['SpeechRecognition'] || w['webkitSpeechRecognition']) as (new () => BrowserSpeechRecognition) | undefined;
    return Ctor ? new Ctor() : null;
}

// ── Web Audio — radio crackle filter chain ────────────────────────────────────

interface AudioGraph {
    ctx: AudioContext;
    input: AudioNode; // Entry point: connect sources here
}

function buildAudioGraph(streamingAudioEl: HTMLAudioElement): AudioGraph {
    const ctx = new AudioContext();

    const highPass = ctx.createBiquadFilter();
    highPass.type = 'highpass';
    highPass.frequency.value = 800;
    highPass.Q.value = 0.7;

    const lowPass = ctx.createBiquadFilter();
    lowPass.type = 'lowpass';
    lowPass.frequency.value = 3500;
    lowPass.Q.value = 0.7;

    const distortion = ctx.createWaveShaper();
    const n = 256, drive = 12;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        const x = (i * 2) / n - 1;
        curve[i] = (Math.PI + drive) * x / (Math.PI + drive * Math.abs(x));
    }
    distortion.curve = curve;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 3;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.001;
    compressor.release.value = 0.1;

    // Chain: input (highPass) → lowPass → distortion → compressor → output
    highPass.connect(lowPass);
    lowPass.connect(distortion);
    distortion.connect(compressor);
    compressor.connect(ctx.destination);

    // Connect dedicated streaming audio element permanently
    const mediaSource = ctx.createMediaElementSource(streamingAudioEl);
    mediaSource.connect(highPass);

    return { ctx, input: highPass };
}

// ── Component ─────────────────────────────────────────────────────────────────

export const DriverHUD: React.FC<DriverHUDProps> = ({ sessionId }) => {
    const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
    const [isPTTActive, setIsPTTActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [lastResponse, setLastResponse] = useState<string | null>(null);
    const [lastTranscript, setLastTranscript] = useState<string | null>(null);
    const [voiceError, setVoiceError] = useState<string | null>(null);

    // Audio graph (lazy-init on first PTT press)
    const audioGraphRef = useRef<AudioGraph | null>(null);
    // Dedicated streaming audio element — connected to filter chain permanently
    const streamingAudioRef = useRef<HTMLAudioElement | null>(null);
    // MediaRecorder for Whisper fallback
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    // Browser STT instance
    const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

    // ── Error auto-clear ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!voiceError) return;
        const t = setTimeout(() => setVoiceError(null), 4000);
        return () => clearTimeout(t);
    }, [voiceError]);

    // ── Telemetry socket ──────────────────────────────────────────────────────
    useEffect(() => {
        const onTelemetry = (data: TelemetryData) => { setTelemetry(data); setIsConnected(true); };
        const onDisconnect = () => setIsConnected(false);
        socketClient.on('telemetry:driver', onTelemetry);
        socketClient.on('disconnect', onDisconnect);
        return () => { socketClient.off('telemetry:driver'); socketClient.off('disconnect'); };
    }, [sessionId]);

    // ── Audio graph init ──────────────────────────────────────────────────────

    const ensureAudioGraph = useCallback((): AudioGraph => {
        if (audioGraphRef.current) return audioGraphRef.current;

        // Create the streaming audio element programmatically so we can connect
        // it to the Web Audio graph via MediaElementSource (only allowed once per element)
        const streamEl = new Audio();
        streamEl.preload = 'none';
        streamingAudioRef.current = streamEl;

        const graph = buildAudioGraph(streamEl);
        audioGraphRef.current = graph;
        return graph;
    }, []);

    // Play a base64-encoded audio clip (for ack phrases from NDJSON)
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
            console.error('[HUD] ack playback error:', err);
        }
    }, [ensureAudioGraph]);

    // Play streaming TTS by pointing the dedicated audio element at the stream URL
    const playStreamingTTS = useCallback(async (text: string): Promise<void> => {
        try {
            const graph = ensureAudioGraph();
            if (graph.ctx.state === 'suspended') await graph.ctx.resume();

            const audio = streamingAudioRef.current;
            if (!audio) return;

            const url = `/api/voice/tts-stream?text=${encodeURIComponent(text)}`;
            audio.src = url;
            await audio.play();
        } catch (err) {
            console.error('[HUD] streaming TTS error:', err);
        }
    }, [ensureAudioGraph]);

    // ── NDJSON stream reader (shared by both paths) ───────────────────────────

    const readNDJSONStream = useCallback(async (
        response: Response,
        onResponse: (text: string) => void,
    ): Promise<void> => {
        if (!response.body) return;

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
                            if (chunk.audioBase64) playWithCrackle(chunk.audioBase64);
                            break;
                        case 'response':
                            if (chunk.text) {
                                setLastResponse(chunk.text);
                                onResponse(chunk.text);
                            }
                            break;
                        // Fallback path sends base64 audio directly
                        case 'audio':
                            if (chunk.audioBase64) playWithCrackle(chunk.audioBase64);
                            break;
                        case 'error':
                            setVoiceError(chunk.message ?? 'Engineer unavailable');
                            break;
                    }
                } catch { /* malformed line */ }
            }
        }
    }, [playWithCrackle]);

    // ── Fast path: browser STT transcript → /voice/query-text ────────────────

    const processTextQuery = useCallback(async (transcript: string): Promise<void> => {
        try {
            const response = await fetch('/api/voice/query-text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transcript, driverId: 'driver' }),
            });

            if (!response.ok) { setVoiceError('No response from engineer'); return; }

            // When response text arrives, immediately start streaming TTS
            await readNDJSONStream(response, (text) => playStreamingTTS(text));
        } catch {
            setVoiceError('Radio link failed');
        }
    }, [readNDJSONStream, playStreamingTTS]);

    // ── Fallback path: audio blob → /voice/query (includes TTS as base64) ────

    const processAudioQuery = useCallback(async (audioBlob: Blob): Promise<void> => {
        try {
            const base64Audio = await blobToBase64(audioBlob);
            const response = await fetch('/api/voice/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audio: base64Audio, sessionId, driverId: 'driver' }),
            });

            if (!response.ok) { setVoiceError('No response from engineer'); return; }

            // Fallback path returns base64 audio in {type:"audio"} chunk
            await readNDJSONStream(response, () => {});
        } catch {
            setVoiceError('Radio link failed');
        }
    }, [readNDJSONStream, sessionId]);

    // ── PTT: start ────────────────────────────────────────────────────────────

    const startRecording = useCallback(async () => {
        // Unblock AudioContext on the first user gesture
        ensureAudioGraph();

        // Start browser STT
        const recognition = getSpeechRecognition();
        if (recognition) {
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';
            recognition.maxAlternatives = 1;
            recognitionRef.current = recognition;
            try { recognition.start(); } catch { /* already started */ }
        }

        // Also start MediaRecorder as fallback audio for Whisper
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
            audioChunksRef.current = [];
            mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
            mediaRecorder.start();
            mediaRecorderRef.current = mediaRecorder;
            setIsPTTActive(true);
        } catch {
            setVoiceError('Mic access denied');
        }
    }, [ensureAudioGraph]);

    // ── PTT: release ──────────────────────────────────────────────────────────

    const stopRecording = useCallback(async () => {
        if (!mediaRecorderRef.current) return;

        setIsPTTActive(false);
        setIsProcessing(true);

        const mediaRecorder = mediaRecorderRef.current;
        const recognition = recognitionRef.current;

        // Stop MediaRecorder — accumulate audio blob for potential Whisper fallback
        const audioReady = new Promise<Blob>((resolve) => {
            mediaRecorder.onstop = () => {
                resolve(new Blob(audioChunksRef.current, { type: 'audio/webm' }));
                mediaRecorder.stream.getTracks().forEach(t => t.stop());
            };
            mediaRecorder.stop();
        });

        // Race: browser STT (fast) vs 400ms timeout (then use Whisper)
        const browserTranscript = recognition
            ? await new Promise<string | null>((resolve) => {
                const timeout = setTimeout(() => resolve(null), 400);

                recognition.onresult = (e) => {
                    clearTimeout(timeout);
                    resolve(e.results[0]?.[0]?.transcript?.trim() ?? null);
                };
                recognition.onerror = () => { clearTimeout(timeout); resolve(null); };
                recognition.onend = () => { /* timeout still handles null case */ };
                recognition.stop();
            })
            : null;

        try {
            if (browserTranscript) {
                // ⚡ Fast path — browser STT won, skip Whisper entirely
                console.log(`⚡ [BrowserSTT] "${browserTranscript}"`);
                await processTextQuery(browserTranscript);
            } else {
                // 🐢 Fallback — send audio to Whisper
                console.log('[HUD] Browser STT failed/timed out — using Whisper');
                const audioBlob = await audioReady;
                await processAudioQuery(audioBlob);
            }
        } finally {
            setIsProcessing(false);
        }
    }, [processTextQuery, processAudioQuery]);

    // ── PTT event handlers ────────────────────────────────────────────────────

    const handlePTTDown = useCallback(() => {
        if (!isProcessing) startRecording();
    }, [isProcessing, startRecording]);

    const handlePTTUp = useCallback(() => {
        if (isPTTActive) stopRecording();
    }, [isPTTActive, stopRecording]);

    // ── Format helpers ────────────────────────────────────────────────────────

    const formatLapTime = (s: number | null) => {
        if (!s || s <= 0) return '--:--.---';
        return `${Math.floor(s / 60)}:${(s % 60).toFixed(3).padStart(6, '0')}`;
    };

    const formatGap = (g: number | null) =>
        g === null ? '---' : `${g >= 0 ? '+' : ''}${g.toFixed(2)}`;

    const formatDelta = (d: number | null) => {
        if (d === null) return { text: '-.---', cls: '' };
        return { text: `${d >= 0 ? '+' : '-'}${Math.abs(d).toFixed(3)}`, cls: d < 0 ? 'delta-faster' : d > 0 ? 'delta-slower' : '' };
    };

    const wearClass = (w: number) => w > 80 ? 'wear-critical' : w > 50 ? 'wear-warning' : 'wear-good';

    const fuelLaps = telemetry?.fuelPerLap && telemetry.fuelPerLap > 0
        ? Math.floor(telemetry.fuelLevel / telemetry.fuelPerLap) : null;
    const delta = formatDelta(telemetry?.delta ?? null);
    const rpmPct = telemetry ? Math.min(100, (telemetry.rpm / telemetry.rpmMax) * 100) : 0;

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className={`lovely-hud ${isConnected ? '' : 'disconnected'}`}>
            <div className="hud-brand">
                <span className="brand-text">OK, BOX BOX</span>
                <span className={`brand-status ${isConnected ? 'live' : ''}`}>
                    {isConnected ? '● LIVE' : '○ OFFLINE'}
                </span>
            </div>

            <div className={`rpm-strip ${rpmPct > 95 ? 'shift-light' : ''}`}>
                <div className="rpm-fill" style={{ width: `${rpmPct}%` }} />
                <div className="rpm-markers">
                    {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="rpm-marker" />)}
                </div>
            </div>

            <div className="hud-grid">
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

                <div className="hud-panel panel-center">
                    <div className="center-display">
                        <div className="gear-display">
                            <span className="gear-value">{telemetry?.gear ?? 'N'}</span>
                        </div>
                        <div className="speed-display">
                            <span className="speed-value">{telemetry?.speed ?? 0}</span>
                            <span className="speed-unit">MPH</span>
                        </div>
                        <div className={`delta-display ${delta.cls}`}>
                            <span className="delta-value">{delta.text}</span>
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

                <div className="hud-panel panel-right">
                    <div className="info-block fuel-block">
                        <span className="info-label">FUEL</span>
                        <span className="info-value">{telemetry?.fuelLevel?.toFixed(1) ?? '--'} L</span>
                        <span className="info-sub">{fuelLaps !== null ? `~${fuelLaps} LAPS` : '--'}</span>
                    </div>
                    <div className="tire-display">
                        <div className="tire-row">
                            <div className={`tire ${wearClass(telemetry?.tireWear.fl ?? 0)}`}>{telemetry?.tireWear.fl ?? 0}%</div>
                            <div className={`tire ${wearClass(telemetry?.tireWear.fr ?? 0)}`}>{telemetry?.tireWear.fr ?? 0}%</div>
                        </div>
                        <div className="tire-row">
                            <div className={`tire ${wearClass(telemetry?.tireWear.rl ?? 0)}`}>{telemetry?.tireWear.rl ?? 0}%</div>
                            <div className={`tire ${wearClass(telemetry?.tireWear.rr ?? 0)}`}>{telemetry?.tireWear.rr ?? 0}%</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Engineer readout */}
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

            {/* PTT button */}
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

function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

export default DriverHUD;
