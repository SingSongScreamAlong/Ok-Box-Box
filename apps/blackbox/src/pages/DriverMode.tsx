import React, { useState, useEffect, useCallback } from 'react';
import DriverOverlay from '../components/DriverOverlay';
import VoiceComms from '../services/VoiceComms';
import webSocketService from '../services/WebSocketService';
import './DriverMode.css';

const DriverMode: React.FC = () => {
  const [engineerConnected, setEngineerConnected] = useState(false);
  const [engineerName, setEngineerName] = useState('Engineer');
  const [pttKey, setPttKey] = useState(VoiceComms.getPTTKey());
  const [showSettings, setShowSettings] = useState(false);
  const [whisperKey, setWhisperKey] = useState('');
  const [elevenLabsKey, setElevenLabsKey] = useState('');
  const [elevenLabsVoice, setElevenLabsVoice] = useState('');

  useEffect(() => {
    // Listen for connection status from WebSocket
    const unsubConnect = webSocketService.on('connect', () => {
      // Check if engineer is connected
    });

    const unsubEngineer = webSocketService.on('engineer:status', (data) => {
      setEngineerConnected(data.connected);
      if (data.name) setEngineerName(data.name);
    });

    // Listen for voice events
    const unsubVoice = VoiceComms.subscribe((event, data) => {
      if (event === 'transcription') {
        // Send transcription to engineer via WebSocket
        const transcription = data as { text: string };
        webSocketService.send('driver:transcription', { text: transcription.text, timestamp: Date.now() });
      }
    });

    // Load saved settings
    const savedPttKey = localStorage.getItem('blackbox_ptt_key');
    if (savedPttKey) {
      setPttKey(savedPttKey);
      VoiceComms.setPTTKey(savedPttKey);
    }

    const savedWhisperKey = localStorage.getItem('blackbox_whisper_key');
    if (savedWhisperKey) {
      setWhisperKey(savedWhisperKey);
      VoiceComms.setWhisperApiKey(savedWhisperKey);
    }

    const savedElevenLabsKey = localStorage.getItem('blackbox_elevenlabs_key');
    const savedElevenLabsVoice = localStorage.getItem('blackbox_elevenlabs_voice');
    if (savedElevenLabsKey && savedElevenLabsVoice) {
      setElevenLabsKey(savedElevenLabsKey);
      setElevenLabsVoice(savedElevenLabsVoice);
      VoiceComms.setElevenLabsConfig(savedElevenLabsKey, savedElevenLabsVoice);
    }

    webSocketService.connect();

    return () => {
      unsubConnect.unsubscribe();
      unsubEngineer.unsubscribe();
      unsubVoice();
    };
  }, []);

  const handlePTTStart = useCallback(() => {
    VoiceComms.startPTT();
  }, []);

  const handlePTTEnd = useCallback(() => {
    VoiceComms.stopPTT();
  }, []);

  const handleKeyBindChange = useCallback((key: string) => {
    setPttKey(key);
    VoiceComms.setPTTKey(key);
    localStorage.setItem('blackbox_ptt_key', key);
  }, []);

  const saveSettings = () => {
    if (whisperKey) {
      localStorage.setItem('blackbox_whisper_key', whisperKey);
      VoiceComms.setWhisperApiKey(whisperKey);
    }
    if (elevenLabsKey && elevenLabsVoice) {
      localStorage.setItem('blackbox_elevenlabs_key', elevenLabsKey);
      localStorage.setItem('blackbox_elevenlabs_voice', elevenLabsVoice);
      VoiceComms.setElevenLabsConfig(elevenLabsKey, elevenLabsVoice);
    }
    setShowSettings(false);
  };

  return (
    <div className="driver-mode">
      {/* The actual overlay */}
      <DriverOverlay
        engineerConnected={engineerConnected}
        engineerName={engineerName}
        onPTTStart={handlePTTStart}
        onPTTEnd={handlePTTEnd}
        pttKey={pttKey}
        onKeyBindChange={handleKeyBindChange}
      />

      {/* Settings button (small, unobtrusive) */}
      <button 
        className="settings-toggle"
        onClick={() => setShowSettings(!showSettings)}
        title="Settings"
      >
        ⚙
      </button>

      {/* Settings Panel */}
      {showSettings && (
        <div className="settings-panel">
          <div className="settings-header">
            <h3>Voice Settings</h3>
            <button className="close-btn" onClick={() => setShowSettings(false)}>×</button>
          </div>
          
          <div className="settings-content">
            <div className="setting-group">
              <label>PTT Key</label>
              <div className="ptt-display">
                <span>{pttKey.replace('Key', '').replace('Digit', '')}</span>
                <small>Click the key in overlay to rebind</small>
              </div>
            </div>

            <div className="setting-group">
              <label>OpenAI API Key (Whisper)</label>
              <input
                type="password"
                value={whisperKey}
                onChange={(e) => setWhisperKey(e.target.value)}
                placeholder="sk-..."
              />
              <small>For speech-to-text transcription</small>
            </div>

            <div className="setting-group">
              <label>ElevenLabs API Key</label>
              <input
                type="password"
                value={elevenLabsKey}
                onChange={(e) => setElevenLabsKey(e.target.value)}
                placeholder="Your ElevenLabs API key"
              />
            </div>

            <div className="setting-group">
              <label>ElevenLabs Voice ID</label>
              <input
                type="text"
                value={elevenLabsVoice}
                onChange={(e) => setElevenLabsVoice(e.target.value)}
                placeholder="Voice ID for engineer"
              />
              <small>For text-to-speech from engineer</small>
            </div>

            <button className="save-btn" onClick={saveSettings}>
              Save Settings
            </button>
          </div>
        </div>
      )}

      {/* Instructions (shown when not connected) */}
      {!engineerConnected && (
        <div className="connection-help">
          <p>Waiting for engineer connection...</p>
          <small>Make sure the team dashboard is running and connected</small>
        </div>
      )}
    </div>
  );
};

export default DriverMode;
