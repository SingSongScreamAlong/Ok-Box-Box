/**
 * Voice Engineer - Text-to-Speech Service
 * 
 * Uses system speech synthesis or external TTS to speak race engineer messages.
 * This is the "race engineer voice" that communicates with the driver.
 * 
 * OFF by default - user must explicitly enable via settings.
 */

import { BrowserWindow } from 'electron';
import Store from 'electron-store';

// Settings persistence
const store = new Store({
    name: 'voice-engineer-settings',
    defaults: {
        enabled: false,
        rate: 1.1,
        pitch: 1.0,
        volume: 1.0,
        voiceName: '', // Empty = auto-select best voice
        useElevenLabs: true, // Use ElevenLabs when available, fallback to system TTS
        elevenLabsVoiceId: '', // Empty = use server default (Adam)
        // What types of messages to speak
        speakGaps: false,
        speakFuel: true,
        speakCautions: true,
        speakOpportunities: false,
        speakPitCalls: true
    }
});

// Cloud socket reference for ElevenLabs requests
let cloudSocket: any = null;

// TTS Configuration
interface TTSConfig {
    voice?: string;
    rate?: number;  // 0.5 - 2.0
    pitch?: number; // 0.5 - 2.0
    volume?: number; // 0.0 - 1.0
    enabled?: boolean;
}

// Message type settings
export interface VoiceSettings {
    enabled: boolean;
    rate: number;
    pitch: number;
    volume: number;
    voiceName: string;
    useElevenLabs: boolean;
    elevenLabsVoiceId: string;
    speakGaps: boolean;
    speakFuel: boolean;
    speakCautions: boolean;
    speakOpportunities: boolean;
    speakPitCalls: boolean;
}

const DEFAULT_CONFIG: TTSConfig = {
    rate: store.get('rate') as number,
    pitch: store.get('pitch') as number,
    volume: store.get('volume') as number,
    enabled: store.get('enabled') as boolean
};

let currentConfig: TTSConfig = { ...DEFAULT_CONFIG };
let speakQueue: string[] = [];
let isSpeaking = false;

/**
 * Initialize voice engineer with config
 */
export function initVoiceEngineer(config: Partial<TTSConfig> = {}): void {
    currentConfig = { ...DEFAULT_CONFIG, ...config };
    console.log('🎙️ Voice Engineer initialized');
}

/**
 * Speak a message - uses ElevenLabs if available, falls back to system TTS
 */
export function speak(message: string, priority: 'normal' | 'high' = 'normal'): void {
    if (!currentConfig.enabled) return;

    const useElevenLabs = store.get('useElevenLabs') as boolean;
    
    // Try ElevenLabs if enabled and connected
    if (useElevenLabs && cloudSocket?.connected) {
        const voiceId = store.get('elevenLabsVoiceId') as string;
        cloudSocket.emit('voice:generate', {
            text: message,
            preset: priority === 'high' ? 'urgent' : 'raceEngineer',
            voiceId: voiceId || undefined
        });
        return;
    }

    // Fallback to system TTS
    if (priority === 'high') {
        speakQueue = [message];
    } else {
        speakQueue.push(message);
    }

    processQueue();
}

/**
 * Speak using system TTS (fallback when ElevenLabs unavailable)
 */
function speakWithSystemTTS(message: string): void {
    speakQueue.push(message);
    processQueue();
}

/**
 * Speak a race engineer style message
 * Formats with appropriate callouts
 * Respects message type settings
 */
export function callout(type: 'gap' | 'pit' | 'caution' | 'clear' | 'info', message: string): void {
    // Map callout types to setting types
    const typeMap: Record<string, 'gap' | 'fuel' | 'caution' | 'opportunity' | 'pit' | 'info'> = {
        gap: 'gap',
        pit: 'pit',
        caution: 'caution',
        clear: 'opportunity',
        info: 'info'
    };

    // Check if this type should be spoken
    if (!shouldSpeak(typeMap[type])) return;

    const prefixes: Record<string, string> = {
        gap: '',
        pit: 'Box, box. ',
        caution: 'Caution. ',
        clear: 'You\'re clear. ',
        info: ''
    };

    speak(prefixes[type] + message, type === 'pit' || type === 'caution' ? 'high' : 'normal');
}

// Queue processing
async function processQueue(): Promise<void> {
    if (isSpeaking || speakQueue.length === 0) return;

    isSpeaking = true;
    const message = speakQueue.shift();

    if (message) {
        await speakInWindow(message);
    }

    isSpeaking = false;

    // Process next in queue
    if (speakQueue.length > 0) {
        processQueue();
    }
}

/**
 * Speak using a hidden BrowserWindow with Web Speech API
 */
function speakInWindow(text: string): Promise<void> {
    const selectedVoice = store.get('voiceName') as string;
    
    return new Promise((resolve) => {
        // Create a tiny hidden window for TTS
        const ttsWindow = new BrowserWindow({
            width: 1,
            height: 1,
            show: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        const html = `
            <!DOCTYPE html>
            <html>
            <body>
            <script>
                const utterance = new SpeechSynthesisUtterance("${escapeText(text)}");
                utterance.rate = ${currentConfig.rate};
                utterance.pitch = ${currentConfig.pitch};
                utterance.volume = ${currentConfig.volume};
                const selectedVoiceName = "${escapeText(selectedVoice)}";
                
                function selectVoice() {
                    const voices = speechSynthesis.getVoices();
                    if (voices.length === 0) return false;
                    
                    // If user selected a specific voice, use it
                    if (selectedVoiceName) {
                        const selected = voices.find(v => v.name === selectedVoiceName);
                        if (selected) {
                            utterance.voice = selected;
                            return true;
                        }
                    }
                    
                    // Auto-select: prefer natural sounding male voices
                    const preferred = voices.find(v => 
                        v.name.includes('Daniel') || 
                        v.name.includes('Alex') || 
                        v.name.includes('Google UK English Male') ||
                        v.name.includes('Microsoft David')
                    );
                    if (preferred) utterance.voice = preferred;
                    return true;
                }
                
                // Try to select voice and speak
                window.speechSynthesis.onvoiceschanged = () => {
                    if (selectVoice()) {
                        speechSynthesis.speak(utterance);
                    }
                };
                
                utterance.onend = () => window.close();
                utterance.onerror = () => window.close();
                
                // Trigger immediately if voices already loaded
                if (speechSynthesis.getVoices().length > 0) {
                    if (selectVoice()) {
                        speechSynthesis.speak(utterance);
                    }
                }
            </script>
            </body>
            </html>
        `;

        ttsWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

        // Timeout fallback
        const timeout = setTimeout(() => {
            if (!ttsWindow.isDestroyed()) ttsWindow.close();
            resolve();
        }, 10000);

        ttsWindow.on('closed', () => {
            clearTimeout(timeout);
            resolve();
        });
    });
}

function escapeText(text: string): string {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, ' ');
}

/**
 * Get available system voices
 * Returns a promise that resolves with voice names
 */
export function getAvailableVoices(): Promise<string[]> {
    return new Promise((resolve) => {
        const voiceWindow = new BrowserWindow({
            width: 1,
            height: 1,
            show: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        const html = `
            <!DOCTYPE html>
            <html>
            <body>
            <script>
                function getVoices() {
                    const voices = speechSynthesis.getVoices();
                    if (voices.length > 0) {
                        // Filter to English voices and sort
                        const englishVoices = voices
                            .filter(v => v.lang.startsWith('en'))
                            .map(v => v.name)
                            .sort();
                        console.log(JSON.stringify(englishVoices));
                        window.close();
                    }
                }
                
                speechSynthesis.onvoiceschanged = getVoices;
                
                // Try immediately
                if (speechSynthesis.getVoices().length > 0) {
                    getVoices();
                }
            </script>
            </body>
            </html>
        `;

        let voices: string[] = [];

        voiceWindow.webContents.on('console-message', (_event, _level, message) => {
            try {
                voices = JSON.parse(message);
            } catch {
                // Not JSON
            }
        });

        voiceWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

        // Timeout
        const timeout = setTimeout(() => {
            if (!voiceWindow.isDestroyed()) voiceWindow.close();
            resolve(voices);
        }, 3000);

        voiceWindow.on('closed', () => {
            clearTimeout(timeout);
            resolve(voices);
        });
    });
}

/**
 * Stop all speech
 */
export function stopSpeech(): void {
    speakQueue = [];
    isSpeaking = false;
}

/**
 * Update TTS configuration
 */
export function setConfig(config: Partial<TTSConfig>): void {
    currentConfig = { ...currentConfig, ...config };
}

/**
 * Enable/disable voice
 */
export function setEnabled(enabled: boolean): void {
    currentConfig.enabled = enabled;
    if (!enabled) {
        stopSpeech();
    }
}

/**
 * Check if voice is enabled
 */
export function isEnabled(): boolean {
    return currentConfig.enabled ?? false;
}

/**
 * Get all voice settings
 */
export function getSettings(): VoiceSettings {
    return {
        enabled: store.get('enabled') as boolean,
        rate: store.get('rate') as number,
        pitch: store.get('pitch') as number,
        volume: store.get('volume') as number,
        voiceName: store.get('voiceName') as string,
        useElevenLabs: store.get('useElevenLabs') as boolean,
        elevenLabsVoiceId: store.get('elevenLabsVoiceId') as string,
        speakGaps: store.get('speakGaps') as boolean,
        speakFuel: store.get('speakFuel') as boolean,
        speakCautions: store.get('speakCautions') as boolean,
        speakOpportunities: store.get('speakOpportunities') as boolean,
        speakPitCalls: store.get('speakPitCalls') as boolean
    };
}

/**
 * Update voice settings
 */
export function updateSettings(settings: Partial<VoiceSettings>): void {
    if (settings.enabled !== undefined) {
        store.set('enabled', settings.enabled);
        currentConfig.enabled = settings.enabled;
    }
    if (settings.rate !== undefined) {
        store.set('rate', settings.rate);
        currentConfig.rate = settings.rate;
    }
    if (settings.pitch !== undefined) {
        store.set('pitch', settings.pitch);
        currentConfig.pitch = settings.pitch;
    }
    if (settings.volume !== undefined) {
        store.set('volume', settings.volume);
        currentConfig.volume = settings.volume;
    }
    if (settings.voiceName !== undefined) {
        store.set('voiceName', settings.voiceName);
        currentConfig.voice = settings.voiceName;
    }
    if (settings.useElevenLabs !== undefined) store.set('useElevenLabs', settings.useElevenLabs);
    if (settings.elevenLabsVoiceId !== undefined) store.set('elevenLabsVoiceId', settings.elevenLabsVoiceId);
    if (settings.speakGaps !== undefined) store.set('speakGaps', settings.speakGaps);
    if (settings.speakFuel !== undefined) store.set('speakFuel', settings.speakFuel);
    if (settings.speakCautions !== undefined) store.set('speakCautions', settings.speakCautions);
    if (settings.speakOpportunities !== undefined) store.set('speakOpportunities', settings.speakOpportunities);
    if (settings.speakPitCalls !== undefined) store.set('speakPitCalls', settings.speakPitCalls);
}

/**
 * Set the cloud socket for ElevenLabs requests
 */
export function setCloudSocket(socket: any): void {
    cloudSocket = socket;
    
    // Listen for voice audio responses
    if (cloudSocket) {
        cloudSocket.on('voice:audio', (data: { success: boolean; audioBase64?: string; text: string; error?: string }) => {
            if (data.success && data.audioBase64) {
                playBase64Audio(data.audioBase64);
            } else {
                // Fallback to system TTS if ElevenLabs fails
                console.warn('ElevenLabs failed, falling back to system TTS:', data.error);
                speakWithSystemTTS(data.text);
            }
        });
    }
}

/**
 * Play base64 encoded audio (from ElevenLabs)
 */
function playBase64Audio(base64Audio: string): void {
    const audioWindow = new BrowserWindow({
        width: 1,
        height: 1,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    const html = `
        <!DOCTYPE html>
        <html>
        <body>
        <script>
            const audio = new Audio('data:audio/mpeg;base64,${base64Audio}');
            audio.volume = ${currentConfig.volume};
            audio.onended = () => window.close();
            audio.onerror = () => window.close();
            audio.play().catch(() => window.close());
        </script>
        </body>
        </html>
    `;

    audioWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    // Timeout fallback
    setTimeout(() => {
        if (!audioWindow.isDestroyed()) audioWindow.close();
    }, 30000);
}

/**
 * Check if a specific message type should be spoken
 */
export function shouldSpeak(type: 'gap' | 'fuel' | 'caution' | 'opportunity' | 'pit' | 'info'): boolean {
    if (!currentConfig.enabled) return false;
    
    switch (type) {
        case 'gap': return store.get('speakGaps') as boolean;
        case 'fuel': return store.get('speakFuel') as boolean;
        case 'caution': return store.get('speakCautions') as boolean;
        case 'opportunity': return store.get('speakOpportunities') as boolean;
        case 'pit': return store.get('speakPitCalls') as boolean;
        case 'info': return true; // Always speak info if enabled
        default: return true;
    }
}
