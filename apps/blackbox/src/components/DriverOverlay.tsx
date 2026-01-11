import React, { useState, useEffect, useCallback, useRef } from 'react';
import './DriverOverlay.css';

interface DriverOverlayProps {
  engineerConnected: boolean;
  engineerName?: string;
  onPTTStart: () => void;
  onPTTEnd: () => void;
  pttKey?: string;
  onKeyBindChange?: (key: string) => void;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'listening';

const DriverOverlay: React.FC<DriverOverlayProps> = ({
  engineerConnected,
  engineerName = 'Engineer',
  onPTTStart,
  onPTTEnd,
  pttKey = 'KeyT',
  onKeyBindChange,
}) => {
  const [isPTTActive, setIsPTTActive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [isBindingKey, setIsBindingKey] = useState(false);
  const [currentPTTKey, setCurrentPTTKey] = useState(pttKey);
  const [engineerSpeaking, setEngineerSpeaking] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const pttActiveRef = useRef(false);

  // Update connection status based on prop
  useEffect(() => {
    setConnectionStatus(engineerConnected ? 'connected' : 'disconnected');
  }, [engineerConnected]);

  // Handle PTT key press
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (isBindingKey) {
      e.preventDefault();
      const newKey = e.code;
      setCurrentPTTKey(newKey);
      setIsBindingKey(false);
      onKeyBindChange?.(newKey);
      return;
    }

    if (e.code === currentPTTKey && !pttActiveRef.current) {
      e.preventDefault();
      pttActiveRef.current = true;
      setIsPTTActive(true);
      onPTTStart();
    }
  }, [currentPTTKey, isBindingKey, onPTTStart, onKeyBindChange]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.code === currentPTTKey && pttActiveRef.current) {
      e.preventDefault();
      pttActiveRef.current = false;
      setIsPTTActive(false);
      onPTTEnd();
    }
  }, [currentPTTKey, onPTTEnd]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Simulate engineer speaking (would be triggered by actual TTS playback)
  useEffect(() => {
    if (engineerSpeaking) {
      const timeout = setTimeout(() => setEngineerSpeaking(false), 3000);
      return () => clearTimeout(timeout);
    }
  }, [engineerSpeaking]);

  // Clear last message after delay
  useEffect(() => {
    if (lastMessage) {
      const timeout = setTimeout(() => setLastMessage(null), 5000);
      return () => clearTimeout(timeout);
    }
  }, [lastMessage]);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#00ff88';
      case 'connecting': return '#ffaa00';
      case 'listening': return '#00aaff';
      default: return '#ff4444';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'CONNECTED';
      case 'connecting': return 'CONNECTING...';
      case 'listening': return 'LISTENING';
      default: return 'OFFLINE';
    }
  };

  const formatKeyName = (code: string) => {
    return code
      .replace('Key', '')
      .replace('Digit', '')
      .replace('Numpad', 'Num ')
      .replace('Arrow', '↑↓←→'.includes(code.slice(-1)) ? '' : '')
      .replace('Left', '←')
      .replace('Right', '→')
      .replace('Up', '↑')
      .replace('Down', '↓');
  };

  return (
    <div className="driver-overlay">
      {/* Connection Status Indicator */}
      <div className="connection-indicator">
        <div 
          className={`status-dot ${connectionStatus}`}
          style={{ backgroundColor: getStatusColor() }}
        />
        <div className="status-info">
          <span className="status-text" style={{ color: getStatusColor() }}>
            {getStatusText()}
          </span>
          {engineerConnected && (
            <span className="engineer-name">{engineerName}</span>
          )}
        </div>
      </div>

      {/* PTT Indicator */}
      <div className={`ptt-indicator ${isPTTActive ? 'active' : ''}`}>
        <div className="ptt-icon">
          {isPTTActive ? (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" opacity="0.5">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          )}
        </div>
        <div className="ptt-status">
          {isPTTActive ? 'TRANSMITTING' : 'PTT READY'}
        </div>
        <button 
          className="ptt-keybind"
          onClick={() => setIsBindingKey(true)}
          title="Click to rebind PTT key"
        >
          {isBindingKey ? 'Press any key...' : formatKeyName(currentPTTKey)}
        </button>
      </div>

      {/* Engineer Speaking Indicator */}
      {engineerSpeaking && (
        <div className="engineer-speaking">
          <div className="speaking-waves">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span className="speaking-label">{engineerName} speaking...</span>
        </div>
      )}

      {/* Last Message Preview (optional - can be toggled) */}
      {lastMessage && (
        <div className="last-message">
          <span className="message-from">{engineerName}:</span>
          <span className="message-text">{lastMessage}</span>
        </div>
      )}

      {/* Minimal branding */}
      <div className="overlay-branding">
        <span className="brand-text">BLACKBOX</span>
      </div>
    </div>
  );
};

export default DriverOverlay;
