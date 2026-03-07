/**
 * Voice System for Desktop App
 * Handles PTT (Push-to-Talk), audio recording, transcription, and TTS playback
 */
import { BrowserWindow } from 'electron';
interface VoiceConfig {
    pttType: 'keyboard' | 'joystick';
    pttKey: string;
    joystickId: number;
    joystickButton: number;
    openaiKey: string;
    serverUrl: string;
}
export declare class VoiceSystem {
    private config;
    private mainWindow;
    private recording;
    private audioChunks;
    private pttPressed;
    private pollInterval;
    private joystick;
    private socket;
    private sessionId;
    private telemetryContext;
    constructor(config?: Partial<VoiceConfig>);
    setWindow(window: BrowserWindow): void;
    setSocket(socket: any): void;
    setSessionId(id: string): void;
    updateTelemetry(data: any): void;
    private setupSocketListeners;
    start(): Promise<void>;
    stop(): void;
    private initJoystick;
    private pollPTT;
    onPTTStateChange(pressed: boolean): void;
    private startRecording;
    private stopRecording;
    processAudio(audioBuffer: Buffer): Promise<void>;
    private transcribe;
    private sendToAI;
    private playAudioBase64;
    private sendToRenderer;
}
export {};
