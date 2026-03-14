import { useEffect, useState, useRef } from 'react';
import './index.css';
import logo from './assets/logo.png';
import bgVideo from './assets/bg.mp4';

interface Status {
  iracing: boolean;
  server: boolean;
  iracingState: 'connected' | 'waiting' | 'disconnected';
  serverState: 'connected' | 'disconnected' | 'error';
  voiceState: 'starting' | 'ready' | 'fallback' | 'listening' | 'processing' | 'error';
  voiceDetail: string;
  mode: 'waiting' | 'driving' | 'spectating';
}

interface User {
  email: string;
  tier: string;
}

interface Message {
  id: string;
  text: string;
  type: 'sent' | 'received';
  timestamp: number;
}

type CrewRole = 'engineer' | 'spotter';

interface Settings {
  audioInput: string;
  audioOutput: string;
  pttType: 'disabled' | 'keyboard' | 'joystick';
  pttKey: string;
  joystickId: number;
  joystickButton: number;
  crewRole: CrewRole;
}

const DEFAULT_SETTINGS: Settings = {
  audioInput: 'default',
  audioOutput: 'default',
  pttType: 'keyboard',
  pttKey: 'Space',
  joystickId: 0,
  joystickButton: 0,
  crewRole: 'engineer',
};

const CREW_ROLE_LABELS: Record<CrewRole, string> = {
  engineer: 'Engineer',
  spotter: 'Spotter',
};

function normalizeLiveCrewRole(value: unknown): CrewRole {
  return value === 'spotter' ? 'spotter' : 'engineer';
}

interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
}

interface GamepadInfo {
  index: number;
  id: string;
  buttons: number;
}

function App() {
  const [status, setStatus] = useState<Status>({ iracing: false, server: false, iracingState: 'waiting', serverState: 'disconnected', voiceState: 'starting', voiceDetail: 'Starting', mode: 'waiting' });
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [gamepads, setGamepads] = useState<GamepadInfo[]>([]);
  const [listeningForKey, setListeningForKey] = useState(false);
  const [listeningForButton, setListeningForButton] = useState(false);
  const [pttFallbackMode, setPttFallbackMode] = useState(false);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const sampleRateRef = useRef(44100);
  const messageCounterRef = useRef(0);
  const recordingStartedAtRef = useRef(0);
  const recordingMimeTypeRef = useRef('audio/wav');
  const videoRef = useRef<HTMLVideoElement>(null);
  const isRecordingRef = useRef(false);
  const isStartingRecordingRef = useRef(false);
  const isStoppingRecordingRef = useRef(false);
  const stopRequestedWhileStartingRef = useRef(false);
  const recordingSessionRef = useRef(0);
  const listenersInitializedRef = useRef(false);
  const keyboardListenerCleanupRef = useRef<(() => void) | null>(null);
  const settingsRef = useRef(settings);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioUrlRef = useRef<string | null>(null);
  const fallbackPollIntervalRef = useRef<number | null>(null);
  const fallbackPressedRef = useRef(false);
  const manualPttPressedRef = useRef(false);

  useEffect(() => {
    if (!window.electronAPI) {
      console.log('Not running in Electron');
      setLoading(false);
      return;
    }

    window.electronAPI.onAuthUpdated?.(async (auth) => {
      if (!auth.loggedIn || !auth.user) {
        setUser(null);
        setStatus({ iracing: false, server: false, iracingState: 'waiting', serverState: 'disconnected', voiceState: 'starting', voiceDetail: 'Starting', mode: 'waiting' });
        return;
      }

      setLoginError('');
      setUser(auth.user);
      const loadedSettings = await loadSettings();
      setupListeners(loadedSettings);
      window.electronAPI.getStatus().then((s) => setStatus({ ...s, mode: 'waiting' }));
    });

    window.electronAPI.onAuthError?.((message) => {
      setUser(null);
      setLoginError(message);
      setStatus({ iracing: false, server: false, iracingState: 'waiting', serverState: 'disconnected', voiceState: 'starting', voiceDetail: 'Starting', mode: 'waiting' });
      setLoading(false);
    });

    window.electronAPI.checkAuth().then(async (result) => {
      if (result.loggedIn && result.user) {
        setLoginError('');
        setUser(result.user);
        window.electronAPI.getStatus().then((s) => setStatus({ ...s, mode: 'waiting' }));
        // Load settings first, then setup listeners with loaded settings
        const loadedSettings = await loadSettings();
        setupListeners(loadedSettings);
      } else if (result.reason === 'expired') {
        setLoginError('Your saved session expired. Please sign in again.');
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const stopAudioPlayback = () => {
    currentAudioRef.current?.pause();
    currentAudioRef.current = null;
    if (currentAudioUrlRef.current) {
      URL.revokeObjectURL(currentAudioUrlRef.current);
      currentAudioUrlRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      keyboardListenerCleanupRef.current?.();
      if (fallbackPollIntervalRef.current !== null) {
        window.clearInterval(fallbackPollIntervalRef.current);
        fallbackPollIntervalRef.current = null;
      }
      if (manualPttPressedRef.current) {
        manualPttPressedRef.current = false;
        window.electronAPI?.sendPTTState(false);
      }
      stopAudioPlayback();
      cleanupAudioCapture();
    };
  }, []);

  useEffect(() => {
    if (fallbackPollIntervalRef.current !== null) {
      window.clearInterval(fallbackPollIntervalRef.current);
      fallbackPollIntervalRef.current = null;
    }

    if (!pttFallbackMode || settings.pttType !== 'joystick') {
      if (fallbackPressedRef.current) {
        fallbackPressedRef.current = false;
        window.electronAPI.sendPTTState(false);
      }
      return;
    }

    fallbackPollIntervalRef.current = window.setInterval(() => {
      const hasFocus = document.hasFocus();
      const gamepads = navigator.getGamepads();
      const gamepad = gamepads[settingsRef.current.joystickId];
      const pressed = hasFocus && !!gamepad?.buttons?.[settingsRef.current.joystickButton]?.pressed;

      if (pressed !== fallbackPressedRef.current) {
        fallbackPressedRef.current = pressed;
        window.electronAPI.sendPTTState(pressed);
      }
    }, 50);

    return () => {
      if (fallbackPollIntervalRef.current !== null) {
        window.clearInterval(fallbackPollIntervalRef.current);
        fallbackPollIntervalRef.current = null;
      }
      if (fallbackPressedRef.current) {
        fallbackPressedRef.current = false;
        window.electronAPI.sendPTTState(false);
      }
    };
  }, [pttFallbackMode, settings.pttType, settings.joystickId, settings.joystickButton]);

  const loadSettings = async (): Promise<Settings> => {
    // Load saved settings from main process
    const saved = await window.electronAPI.getSettings?.();
    if (saved) {
      const mergedSettings: Settings = {
        ...DEFAULT_SETTINGS,
        ...saved,
        crewRole: normalizeLiveCrewRole(saved.crewRole),
      };
      setSettings(mergedSettings);
      return mergedSettings;
    }
    // Load audio devices
    loadAudioDevices();
    // Load gamepads
    loadGamepads();
    return DEFAULT_SETTINGS;
  };

  const loadAudioDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDevs = devices
        .filter(d => d.kind === 'audioinput' || d.kind === 'audiooutput')
        .map(d => ({
          deviceId: d.deviceId,
          label: d.label || `${d.kind === 'audioinput' ? 'Microphone' : 'Speaker'} ${d.deviceId.slice(0, 8)}`,
          kind: d.kind as 'audioinput' | 'audiooutput',
        }));
      setAudioDevices(audioDevs);
    } catch (err) {
      console.error('Failed to enumerate audio devices:', err);
    }
  };

  const loadGamepads = () => {
    const gps = navigator.getGamepads();
    const gpList: GamepadInfo[] = [];
    for (let i = 0; i < gps.length; i++) {
      const gp = gps[i];
      if (gp) {
        gpList.push({
          index: gp.index,
          id: gp.id,
          buttons: gp.buttons.length,
        });
      }
    }
    setGamepads(gpList);
  };

  const encodeWav = (samples: Float32Array[], sampleRate: number) => {
    const totalSamples = samples.reduce((sum, chunk) => sum + chunk.length, 0);
    const bytesPerSample = 2;
    const buffer = new ArrayBuffer(44 + totalSamples * bytesPerSample);
    const view = new DataView(buffer);

    const writeString = (offset: number, value: string) => {
      for (let i = 0; i < value.length; i++) {
        view.setUint8(offset + i, value.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + totalSamples * bytesPerSample, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * bytesPerSample, true);
    view.setUint16(32, bytesPerSample, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, totalSamples * bytesPerSample, true);

    let offset = 44;
    for (const chunk of samples) {
      for (let i = 0; i < chunk.length; i++) {
        const sample = Math.max(-1, Math.min(1, chunk[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
        offset += 2;
      }
    }

    return buffer;
  };

  const cleanupAudioCapture = () => {
    processorRef.current?.disconnect();
    mediaSourceRef.current?.disconnect();
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    audioContextRef.current?.close().catch(() => undefined);

    processorRef.current = null;
    mediaSourceRef.current = null;
    mediaStreamRef.current = null;
    audioContextRef.current = null;
    isRecordingRef.current = false;
    isStartingRecordingRef.current = false;
    isStoppingRecordingRef.current = false;
  };

  const saveSettings = async (newSettings: Settings) => {
    setSettings(newSettings);
    await window.electronAPI.saveSettings?.(newSettings);
  };

  const setManualPttPressed = (pressed: boolean) => {
    if (!window.electronAPI || !status.server || !status.iracing) {
      return;
    }

    if (manualPttPressedRef.current === pressed) {
      return;
    }

    manualPttPressedRef.current = pressed;
    window.electronAPI.sendPTTState(pressed);
  };

  const setupListeners = (currentSettings: Settings = settings) => {
    settingsRef.current = currentSettings;

    if (listenersInitializedRef.current) {
      return keyboardListenerCleanupRef.current ?? (() => undefined);
    }

    listenersInitializedRef.current = true;

    window.electronAPI.onRelayStatus((s: string) => {
      const serverState = s === 'error' ? 'error' : s === 'connected' ? 'connected' : 'disconnected';
      setStatus((prev) => ({ ...prev, server: serverState === 'connected', serverState }));
    });

    window.electronAPI.onIRacingStatus((s: string) => {
      const iracingState = s === 'connected' ? 'connected' : s === 'disconnected' ? 'disconnected' : 'waiting';
      setStatus((prev) => ({ ...prev, iracing: iracingState === 'connected', iracingState }));
    });

    window.electronAPI.onVoiceStatus?.((voice) => {
      setStatus((prev) => ({ ...prev, voiceState: voice.state, voiceDetail: voice.detail }));
    });

    // Listen for relay mode changes (driving vs spectating)
    window.electronAPI.onRelayMode?.((mode: string) => {
      setStatus((prev) => ({ ...prev, mode: mode as 'driving' | 'spectating' }));
    });

    // Listen for voice/text messages
    window.electronAPI.onMessage?.((msg: { text: string; type: 'sent' | 'received' }) => {
      messageCounterRef.current += 1;
      const timestamp = Date.now();
      setMessages((prev) => [...prev.slice(-4), { 
        id: `${timestamp}-${messageCounterRef.current}`,
        text: msg.text, 
        type: msg.type,
        timestamp
      }]);
    });

    // Voice recording control from main process
    window.electronAPI.onStartRecording?.(() => {
      startRecording();
    });

    window.electronAPI.onStopRecording?.(() => {
      stopRecording();
    });

    // TTS playback
    window.electronAPI.onPlayAudio?.((base64Audio: string) => {
      playAudio(base64Audio);
    });

    window.electronAPI.onStopAudio?.(() => {
      stopAudioPlayback();
    });

    window.electronAPI.onPTTFallbackMode?.((enabled: boolean) => {
      setPttFallbackMode(enabled);
      if (!enabled && fallbackPressedRef.current) {
        fallbackPressedRef.current = false;
        window.electronAPI.sendPTTState(false);
      }
    });

    const cleanup = () => undefined;

    keyboardListenerCleanupRef.current = cleanup;
    return cleanup;
  };

  const startRecording = async () => {
    if (isRecordingRef.current || isStartingRecordingRef.current) {
      return;
    }

    isStartingRecordingRef.current = true;
    isStoppingRecordingRef.current = false;
    stopRequestedWhileStartingRef.current = false;
    const sessionId = recordingSessionRef.current + 1;
    recordingSessionRef.current = sessionId;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: settings.audioInput !== 'default'
          ? { deviceId: { exact: settings.audioInput } }
          : true,
      });
      const audioContext = new AudioContext();
      await audioContext.resume();
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      if (recordingSessionRef.current !== sessionId) {
        stream.getTracks().forEach(track => track.stop());
        audioContext.close().catch(() => undefined);
        isStartingRecordingRef.current = false;
        return;
      }

      mediaStreamRef.current = stream;
      audioContextRef.current = audioContext;
      mediaSourceRef.current = source;
      processorRef.current = processor;
      pcmChunksRef.current = [];
      recordingStartedAtRef.current = Date.now();
      recordingMimeTypeRef.current = 'audio/wav';
      sampleRateRef.current = audioContext.sampleRate;

      processor.onaudioprocess = (event) => {
        if (!isRecordingRef.current || recordingSessionRef.current !== sessionId) {
          return;
        }
        const input = event.inputBuffer.getChannelData(0);
        pcmChunksRef.current.push(new Float32Array(input));
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
      isStartingRecordingRef.current = false;
      isRecordingRef.current = true;
      setIsRecording(true);

      if (stopRequestedWhileStartingRef.current) {
        stopRequestedWhileStartingRef.current = false;
        void stopRecording();
      }
    } catch (err) {
      isStartingRecordingRef.current = false;
      isRecordingRef.current = false;
      console.error('Failed to start recording:', err);
      messageCounterRef.current += 1;
      const timestamp = Date.now();
      const detail = err instanceof Error ? err.message : 'Microphone unavailable';
      setMessages((prev) => [...prev.slice(-4), {
        id: `${timestamp}-${messageCounterRef.current}`,
        text: `PTT unavailable: ${detail}`,
        type: 'received',
        timestamp,
      }]);
    }
  };

  const stopRecording = async () => {
    if (isStoppingRecordingRef.current) {
      return;
    }

    if (isStartingRecordingRef.current && !isRecordingRef.current) {
      stopRequestedWhileStartingRef.current = true;
      return;
    }

    if (!audioContextRef.current || !mediaStreamRef.current || !isRecordingRef.current) return;

    isStoppingRecordingRef.current = true;
    isRecordingRef.current = false;

    setIsRecording(false);

    console.log('PCM recorder stopped, chunks:', pcmChunksRef.current.length);

    const durationMs = Date.now() - recordingStartedAtRef.current;
    const pcmChunks = [...pcmChunksRef.current];
    cleanupAudioCapture();
    isStoppingRecordingRef.current = false;

    if (pcmChunks.length === 0) {
      console.error('No audio chunks recorded');
      return;
    }

    if (durationMs < 500) {
      console.log(`Recording too short (${durationMs}ms < 500ms), discarded`);
      return;
    }

    const wavBuffer = encodeWav(pcmChunks, sampleRateRef.current);
    console.log(`Sending WAV: ${wavBuffer.byteLength} bytes, ${durationMs}ms, ${pcmChunks.length} chunks, ${sampleRateRef.current}Hz`);
    window.electronAPI.sendAudioData(wavBuffer, recordingMimeTypeRef.current);
  };

  const playAudio = (base64Audio: string) => {
    try {
      stopAudioPlayback();

      const audioData = atob(base64Audio);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const view = new Uint8Array(arrayBuffer);
      for (let i = 0; i < audioData.length; i++) {
        view[i] = audioData.charCodeAt(i);
      }
      
      const audioBlob = new Blob([arrayBuffer], { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      currentAudioUrlRef.current = audioUrl;
      audio.onended = () => {
        if (currentAudioRef.current === audio) {
          currentAudioRef.current = null;
        }
        if (currentAudioUrlRef.current === audioUrl) {
          URL.revokeObjectURL(audioUrl);
          currentAudioUrlRef.current = null;
        }
      };
      audio.play();
    } catch (err) {
      console.error('Failed to play audio:', err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError('');

    const result = await window.electronAPI.login(email, password);
    
    if (result.success && result.user) {
      setUser(result.user);
      setupListeners();
      window.electronAPI.getStatus().then((s) => setStatus({ ...s, mode: 'waiting' }));
    } else {
      setLoginError(result.error || 'Login failed');
    }
    setLoggingIn(false);
  };

  const handleLogout = async () => {
    await window.electronAPI.logout();
    setUser(null);
    setLoginError('');
    setMessages([]);
    setStatus({ iracing: false, server: false, iracingState: 'waiting', serverState: 'disconnected', voiceState: 'starting', voiceDetail: 'Starting', mode: 'waiting' });
  };

  // Custom title bar component
  const TitleBar = () => (
    <div className="title-bar">
      <div className="title-bar-drag">
        <span className="title-bar-text">Ok, Box Box</span>
      </div>
      <div className="title-bar-controls">
        <button className="title-btn minimize" onClick={() => window.electronAPI.minimizeWindow()}>
          <svg viewBox="0 0 12 12"><rect y="5" width="10" height="1"/></svg>
        </button>
        <button className="title-btn maximize" onClick={() => window.electronAPI.maximizeWindow()}>
          <svg viewBox="0 0 12 12"><rect x="1" y="1" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1"/></svg>
        </button>
        <button className="title-btn close" onClick={() => window.electronAPI.closeWindow()}>
          <svg viewBox="0 0 12 12"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.2"/></svg>
        </button>
      </div>
    </div>
  );

  // Loading state
  if (loading) {
    return (
      <div className="app-container">
        <TitleBar />
        <video ref={videoRef} className="bg-video" autoPlay muted loop playsInline>
          <source src={bgVideo} type="video/mp4" />
        </video>
        <div className="overlay" />
        <div className="loading-screen">
          <img src={logo} alt="Ok, Box Box" className="logo" />
          <div className="loader" />
        </div>
      </div>
    );
  }

  // Login screen
  if (!user) {
    return (
      <div className="app-container">
        <TitleBar />
        <video ref={videoRef} className="bg-video" autoPlay muted loop playsInline>
          <source src={bgVideo} type="video/mp4" />
        </video>
        <div className="overlay" />
        
        <div className="login-panel">
          <div className="login-header">
            <img src={logo} alt="Ok, Box Box" className="logo" />
            <h1 className="title">SIGN IN</h1>
            <p className="subtitle">Welcome back to the pit wall</p>
          </div>

          {loginError && (
            <div className="error-box">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="login-form">
            <div className="input-group">
              <label>EMAIL</label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <input
                  type="email"
                  placeholder="driver@team.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label>PASSWORD</label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-footer">
              <a href="https://app.okboxbox.com/forgot-password" target="_blank" rel="noreferrer" className="forgot-link">
                Forgot password?
              </a>
            </div>

            <button type="submit" className="btn-primary" disabled={loggingIn}>
              {loggingIn ? (
                <span className="btn-loader" />
              ) : (
                'SIGN IN'
              )}
            </button>
          </form>

          <p className="signup-text">
            New to Ok, Box Box?{' '}
            <a href="https://app.okboxbox.com/signup" target="_blank" rel="noreferrer">
              Create account
            </a>
          </p>
        </div>
      </div>
    );
  }

  // Main dashboard
  return (
    <div className="app-container dashboard">
      <TitleBar />
      <div className="dashboard-bg" />
      
      <header className="dashboard-header">
        <img 
          src={logo} 
          alt="Ok, Box Box" 
          className="header-logo clickable" 
          onClick={() => window.electronAPI.openWebsite()}
          title="Open okboxbox.com"
        />
        <div className="header-right">
          <span className="tier-badge">{user.tier.toUpperCase()}</span>
          <button onClick={() => { setShowSettings(true); loadAudioDevices(); loadGamepads(); }} className="btn-settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
          <button onClick={handleLogout} className="btn-logout">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="status-grid">
          <div className={`status-card ${status.server ? 'connected' : ''}`}>
            <div className="status-indicator">
              <span className={`dot ${status.server ? 'active' : ''}`} />
            </div>
            <div className="status-content">
              <span className="status-label">RELAY</span>
              <span className="status-value">{status.serverState === 'connected' ? 'Online' : status.serverState === 'error' ? 'Connection error' : 'Disconnected'}</span>
            </div>
          </div>
          
          <div className={`status-card ${status.iracing ? 'connected' : ''}`}>
            <div className="status-indicator">
              <span className={`dot ${status.iracing ? 'active' : ''}`} />
            </div>
            <div className="status-content">
              <span className="status-label">iRACING</span>
              <span className="status-value">{status.iracingState === 'connected' ? 'Live' : status.iracingState === 'disconnected' ? 'Disconnected' : 'Waiting...'}</span>
            </div>
          </div>

          <div className={`status-card ${status.voiceState === 'ready' || status.voiceState === 'fallback' ? 'connected' : ''}`}>
            <div className="status-indicator">
              <span className={`dot ${status.voiceState === 'ready' || status.voiceState === 'fallback' ? 'active' : ''}`} />
            </div>
            <div className="status-content">
              <span className="status-label">VOICE</span>
              <span className="status-value">
                {status.voiceState === 'ready' ? 'Ready' :
                 status.voiceState === 'fallback' ? 'Fallback mode' :
                 status.voiceState === 'listening' ? 'Listening' :
                 status.voiceState === 'processing' ? 'Processing' :
                 status.voiceState === 'error' ? 'Error' : 'Starting...'}
              </span>
            </div>
          </div>
        </div>
        
        {/* Quick status summary */}
        {status.server && status.iracing && (
          <div className={`status-summary ${status.mode === 'spectating' ? 'spectating' : ''}`}>
            <span className="pulse-dot" />
            <span>
              {status.mode === 'spectating' 
                ? '👁️ Spectating — streaming to okboxbox.com' 
                : '🏎️ Driving — streaming to okboxbox.com'}
            </span>
          </div>
        )}

        {/* Recording indicator */}
        {isRecording && (
          <div className="recording-bar">
            <span className="recording-pulse" />
            <span className="recording-text">LISTENING...</span>
          </div>
        )}

        {status.server && status.iracing && (
          <button
            type="button"
            className={`manual-ptt-button ${isRecording ? 'active' : ''}`}
            onPointerDown={(e) => {
              e.preventDefault();
              setManualPttPressed(true);
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              setManualPttPressed(false);
            }}
            onPointerLeave={() => {
              setManualPttPressed(false);
            }}
            onPointerCancel={() => {
              setManualPttPressed(false);
            }}
          >
            <span className="manual-ptt-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </span>
            <span className="manual-ptt-text">{isRecording ? 'Release to send' : `Hold to talk to ${CREW_ROLE_LABELS[settings.crewRole]}`}</span>
          </button>
        )}

        {/* Voice messages */}
        <div className="messages-panel">
          {messages.length === 0 && status.iracing && !isRecording && (
            <div className="message-hint">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              </svg>
              <span>
                {status.voiceState === 'error'
                  ? `Voice unavailable: ${status.voiceDetail}`
                  : status.voiceState === 'fallback'
                    ? `Voice ready in fallback mode. ${status.voiceDetail}. Keep the app focused while using ${CREW_ROLE_LABELS[settings.crewRole]}.`
                    : `Ready to talk to ${CREW_ROLE_LABELS[settings.crewRole]}. Hold your PTT or use the on-screen talk button and ask naturally.`}
              </span>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.type}`}>
              <div className="message-icon">
                {msg.type === 'sent' ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                  </svg>
                )}
              </div>
              <span className="message-text">{msg.text}</span>
            </div>
          ))}
        </div>
      </main>

      <footer className="dashboard-footer">
        <span className="user-email">{user.email}</span>
        <span className="version">v1.0.0</span>
      </footer>

      {/* Settings Modal */}
      {showSettings && (
        <div className="settings-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-header">
              <h2>SETTINGS</h2>
              <button className="btn-close" onClick={() => setShowSettings(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="settings-content">
              {/* Audio Settings */}
              <section className="settings-section">
                <h3>AUDIO</h3>
                
                <div className="setting-row">
                  <label>Microphone</label>
                  <select 
                    value={settings.audioInput}
                    onChange={(e) => saveSettings({ ...settings, audioInput: e.target.value })}
                  >
                    <option value="default">Default</option>
                    {audioDevices.filter(d => d.kind === 'audioinput').map(d => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                    ))}
                  </select>
                </div>

                <div className="setting-row">
                  <label>Speaker</label>
                  <select 
                    value={settings.audioOutput}
                    onChange={(e) => saveSettings({ ...settings, audioOutput: e.target.value })}
                  >
                    <option value="default">Default</option>
                    {audioDevices.filter(d => d.kind === 'audiooutput').map(d => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                    ))}
                  </select>
                </div>
              </section>

              {/* PTT Settings */}
              <section className="settings-section">
                <h3>PUSH TO TALK</h3>
                {settings.pttType === 'joystick' && pttFallbackMode && (
                  <div className="message received">
                    <div className="message-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                      </svg>
                    </div>
                    <span className="message-text">Focused-window fallback is active for wheel PTT.</span>
                  </div>
                )}
                
                <div className="setting-row">
                  <label>PTT Type</label>
                  <select 
                    value={settings.pttType}
                    onChange={(e) => saveSettings({ ...settings, pttType: e.target.value as 'disabled' | 'keyboard' | 'joystick' })}
                  >
                    <option value="disabled">On-screen button only</option>
                    <option value="keyboard">Keyboard</option>
                    <option value="joystick">Wheel/Joystick</option>
                  </select>
                </div>

                <div className="setting-row">
                  <label>Live Radio Voice</label>
                  <select
                    value={settings.crewRole}
                    onChange={(e) => saveSettings({ ...settings, crewRole: e.target.value as CrewRole })}
                  >
                    <option value="engineer">Engineer</option>
                    <option value="spotter">Spotter</option>
                  </select>
                </div>

                {settings.pttType === 'keyboard' && (
                  <div className="setting-row">
                    <label>PTT Key</label>
                    <button 
                      className={`key-bind-btn ${listeningForKey ? 'listening' : ''}`}
                      onClick={() => {
                        setListeningForKey(true);
                        const handler = (e: KeyboardEvent) => {
                          e.preventDefault();
                          saveSettings({ ...settings, pttKey: e.code });
                          setListeningForKey(false);
                          window.removeEventListener('keydown', handler);
                        };
                        window.addEventListener('keydown', handler);
                      }}
                    >
                      {listeningForKey ? 'Press any key...' : settings.pttKey}
                    </button>
                  </div>
                )}

                {settings.pttType === 'joystick' && (
                  <>
                    <div className="setting-row">
                      <label>Device</label>
                      <select 
                        value={settings.joystickId}
                        onChange={(e) => saveSettings({ ...settings, joystickId: parseInt(e.target.value) })}
                      >
                        {gamepads.length === 0 && <option value="0">No devices found</option>}
                        {gamepads.map(gp => (
                          <option key={gp.index} value={gp.index}>{gp.id}</option>
                        ))}
                      </select>
                      <button className="btn-refresh" onClick={loadGamepads}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M23 4v6h-6"/>
                          <path d="M1 20v-6h6"/>
                          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                        </svg>
                      </button>
                    </div>

                    <div className="setting-row">
                      <label>Button</label>
                      <button 
                        className={`key-bind-btn ${listeningForButton ? 'listening' : ''}`}
                        onClick={() => {
                          setListeningForButton(true);
                          const pollInterval = setInterval(() => {
                            const gps = navigator.getGamepads();
                            const gp = gps[settings.joystickId];
                            if (gp) {
                              for (let i = 0; i < gp.buttons.length; i++) {
                                if (gp.buttons[i].pressed) {
                                  saveSettings({ ...settings, joystickButton: i });
                                  setListeningForButton(false);
                                  clearInterval(pollInterval);
                                  break;
                                }
                              }
                            }
                          }, 50);
                          // Timeout after 10 seconds
                          setTimeout(() => {
                            setListeningForButton(false);
                            clearInterval(pollInterval);
                          }, 10000);
                        }}
                      >
                        {listeningForButton ? 'Press button...' : `Button ${settings.joystickButton}`}
                      </button>
                    </div>
                  </>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
