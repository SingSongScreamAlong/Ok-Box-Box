import { useEffect, useState, useCallback } from 'react';
import voiceService, { VoiceSettings } from '../services/VoiceService';
import './EngineerVoice.css';

interface EngineerVoiceProps {
  sessionActive: boolean;
}

export default function EngineerVoice({ sessionActive }: EngineerVoiceProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPTTActive, setIsPTTActive] = useState(false);
  const [isBindingKey, setIsBindingKey] = useState(false);
  const [settings, setSettings] = useState<VoiceSettings>(voiceService.getSettings());
  // micLevel will be used for audio visualization in future
  const [_micLevel, _setMicLevel] = useState(0);
  void _micLevel; void _setMicLevel;

  useEffect(() => {
    const init = async () => {
      const success = await voiceService.initialize();
      setIsInitialized(success);
    };
    init();

    // Listen for PTT events
    const unsubStart = voiceService.on('ptt_start', () => {
      setIsPTTActive(true);
    });

    const unsubEnd = voiceService.on('ptt_end', () => {
      setIsPTTActive(false);
    });

    const unsubSettings = voiceService.on('settings_changed', (newSettings) => {
      setSettings(newSettings as VoiceSettings);
    });

    return () => {
      unsubStart();
      unsubEnd();
      unsubSettings();
    };
  }, []);

  const handleBindKey = useCallback(() => {
    setIsBindingKey(true);
    
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      voiceService.setPTTKey(e.code);
      setIsBindingKey(false);
      window.removeEventListener('keydown', handleKeyDown);
    };

    window.addEventListener('keydown', handleKeyDown, { once: true });
  }, []);

  const formatKeyName = (keyCode: string): string => {
    // Convert key codes to readable names
    const keyMap: Record<string, string> = {
      'KeyT': 'T',
      'KeyV': 'V',
      'KeyB': 'B',
      'Space': 'Space',
      'ControlLeft': 'Left Ctrl',
      'ControlRight': 'Right Ctrl',
      'ShiftLeft': 'Left Shift',
      'ShiftRight': 'Right Shift',
      'AltLeft': 'Left Alt',
      'AltRight': 'Right Alt',
      'CapsLock': 'Caps Lock',
      'Tab': 'Tab',
      'Backquote': '`',
    };
    
    if (keyMap[keyCode]) return keyMap[keyCode];
    if (keyCode.startsWith('Key')) return keyCode.slice(3);
    if (keyCode.startsWith('Digit')) return keyCode.slice(5);
    return keyCode;
  };

  return (
    <div className="panel engineer-voice-panel">
      <div className="panel-header">
        AI ENGINEER VOICE
        <span className={`voice-status ${isPTTActive ? 'active' : ''}`}>
          {isPTTActive ? '🔴 TRANSMITTING' : '⚪ STANDBY'}
        </span>
      </div>
      <div className="panel-content">
        {!isInitialized ? (
          <div className="voice-init-prompt">
            <p>Microphone access required for voice communication</p>
            <button 
              className="btn-init-voice"
              onClick={() => voiceService.initialize().then(setIsInitialized)}
            >
              Enable Microphone
            </button>
          </div>
        ) : (
          <>
            <div className="ptt-indicator">
              <div className={`ptt-button ${isPTTActive ? 'active' : ''}`}>
                <div className="ptt-icon">🎙️</div>
                <div className="ptt-label">
                  {isPTTActive ? 'SPEAKING...' : 'PUSH TO TALK'}
                </div>
              </div>
              <div className="ptt-hint">
                Hold <span className="key-badge">{formatKeyName(settings.pttKey)}</span> to speak
              </div>
            </div>

            <div className="voice-settings">
              <div className="setting-row">
                <label>PTT Key Binding</label>
                <button 
                  className={`btn-bind ${isBindingKey ? 'binding' : ''}`}
                  onClick={handleBindKey}
                >
                  {isBindingKey ? 'Press any key...' : formatKeyName(settings.pttKey)}
                </button>
              </div>

              <div className="setting-row">
                <label>Mic Volume</label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={settings.volume}
                  onChange={(e) => voiceService.updateSettings({ volume: parseInt(e.target.value) })}
                />
                <span className="setting-value">{settings.volume}%</span>
              </div>

              <div className="setting-row">
                <label>Noise Gate</label>
                <input 
                  type="range" 
                  min="0" 
                  max="50" 
                  value={settings.noiseGate}
                  onChange={(e) => voiceService.updateSettings({ noiseGate: parseInt(e.target.value) })}
                />
                <span className="setting-value">{settings.noiseGate}%</span>
              </div>
            </div>

            <div className="voice-targets">
              <div className="target-header">Broadcasting To:</div>
              <div className="target-list">
                <div className="target-item active">
                  <span className="target-icon">🖥️</span>
                  <span className="target-name">Team Dashboard</span>
                  <span className="target-status">✓</span>
                </div>
                <div className={`target-item ${sessionActive ? 'active' : 'inactive'}`}>
                  <span className="target-icon">🏎️</span>
                  <span className="target-name">Driver HUD</span>
                  <span className="target-status">{sessionActive ? '✓' : '—'}</span>
                </div>
                <div className={`target-item ${sessionActive ? 'active' : 'inactive'}`}>
                  <span className="target-icon">📡</span>
                  <span className="target-name">Relay Agent</span>
                  <span className="target-status">{sessionActive ? '✓' : '—'}</span>
                </div>
              </div>
            </div>

            {isPTTActive && (
              <div className="voice-waveform">
                <div className="waveform-bar" style={{ height: `${20 + Math.random() * 60}%` }}></div>
                <div className="waveform-bar" style={{ height: `${20 + Math.random() * 60}%` }}></div>
                <div className="waveform-bar" style={{ height: `${20 + Math.random() * 60}%` }}></div>
                <div className="waveform-bar" style={{ height: `${20 + Math.random() * 60}%` }}></div>
                <div className="waveform-bar" style={{ height: `${20 + Math.random() * 60}%` }}></div>
                <div className="waveform-bar" style={{ height: `${20 + Math.random() * 60}%` }}></div>
                <div className="waveform-bar" style={{ height: `${20 + Math.random() * 60}%` }}></div>
                <div className="waveform-bar" style={{ height: `${20 + Math.random() * 60}%` }}></div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
