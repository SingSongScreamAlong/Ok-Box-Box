import { useState, useEffect, useCallback, useMemo } from 'react';
import { VoiceService, getVoiceService, type VoiceConfig } from '../services/VoiceService';
import type { EngineerMessage } from '../services/EngineerCore';

/**
 * useVoice - Voice interface hook
 * 
 * Provides voice-first interface for the engineer.
 * Typing is secondary. The driver should feel like they're talking to SOMEONE.
 */
export function useVoice() {
  const [isEnabled, setIsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.8);

  const voiceService = useMemo(() => getVoiceService(), []);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = voiceService.getAvailableVoices();
      setAvailableVoices(voices);
    };

    loadVoices();
    
    // Voices may load asynchronously
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [voiceService]);

  // Update service config when settings change
  useEffect(() => {
    voiceService.updateConfig({
      enabled: isEnabled,
      volume,
      voice: selectedVoice,
    });
  }, [voiceService, isEnabled, volume, selectedVoice]);

  // Speak a message
  const speak = useCallback((message: EngineerMessage) => {
    if (!isEnabled) return;
    voiceService.speak(message);
  }, [voiceService, isEnabled]);

  // Speak simple text
  const speakText = useCallback((text: string, urgency: EngineerMessage['urgency'] = 'normal') => {
    if (!isEnabled) return;
    voiceService.speakText(text, urgency);
  }, [voiceService, isEnabled]);

  // Stop speaking
  const stop = useCallback(() => {
    voiceService.stop();
  }, [voiceService]);

  // Request silence
  const requestSilence = useCallback((durationMs: number = 30000) => {
    voiceService.requestSilence(durationMs);
  }, [voiceService]);

  // Toggle voice
  const toggleVoice = useCallback(() => {
    setIsEnabled(prev => !prev);
  }, []);

  // Check speaking status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setIsSpeaking(voiceService.isBusy());
    }, 100);
    return () => clearInterval(interval);
  }, [voiceService]);

  return {
    // State
    isEnabled,
    isSpeaking,
    isAvailable: voiceService.isAvailable(),
    availableVoices,
    selectedVoice,
    volume,
    
    // Actions
    speak,
    speakText,
    stop,
    requestSilence,
    toggleVoice,
    setVolume,
    setSelectedVoice,
    setIsEnabled,
  };
}

/**
 * VoiceSettings component for configuration
 */
export function VoiceSettings() {
  const { 
    isEnabled, 
    availableVoices, 
    selectedVoice, 
    volume,
    toggleVoice,
    setVolume,
    setSelectedVoice,
    speakText
  } = useVoice();

  const testVoice = () => {
    speakText("Box this lap. Fuel is critical.", 'important');
  };

  return (
    <div className="space-y-4">
      {/* Enable/Disable */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Voice Callouts</div>
          <div className="text-xs text-white/50">Engineer speaks important messages</div>
        </div>
        <button
          onClick={toggleVoice}
          className={`w-12 h-6 rounded-full transition-colors ${
            isEnabled ? 'bg-green-500' : 'bg-white/20'
          }`}
        >
          <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
            isEnabled ? 'translate-x-6' : 'translate-x-0.5'
          }`} />
        </button>
      </div>

      {isEnabled && (
        <>
          {/* Volume */}
          <div>
            <div className="text-xs text-white/50 mb-2">Volume</div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Voice Selection */}
          <div>
            <div className="text-xs text-white/50 mb-2">Voice</div>
            <select
              value={selectedVoice || ''}
              onChange={(e) => setSelectedVoice(e.target.value || null)}
              className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-sm"
            >
              <option value="">Default</option>
              {availableVoices
                .filter(v => v.lang.startsWith('en'))
                .map(voice => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name}
                  </option>
                ))
              }
            </select>
          </div>

          {/* Test Button */}
          <button
            onClick={testVoice}
            className="w-full px-4 py-2 bg-orange-500/20 border border-orange-500/30 rounded text-xs uppercase tracking-wider hover:bg-orange-500/30 transition-colors"
          >
            Test Voice
          </button>
        </>
      )}
    </div>
  );
}
