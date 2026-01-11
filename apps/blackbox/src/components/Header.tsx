import type { SessionInfo } from '../types';
import './Header.css';

interface HeaderProps {
  connected: boolean;
  relayConnected: boolean;
  iRacingConnected: boolean;
  sessionInfo: SessionInfo;
  onSettingsClick?: () => void;
  demoMode?: boolean;
  onDemoToggle?: () => void;
}

export default function Header({ connected, relayConnected, iRacingConnected, sessionInfo, onSettingsClick, demoMode, onDemoToggle }: HeaderProps) {
  return (
    <header className="blackbox-header">
      <div className="header-left">
        <div className="brand">
          <span className="brand-icon">⬛</span>
          <span className="brand-name">BlackBox</span>
          <span className="brand-tag">AI COACH</span>
        </div>
        {onDemoToggle && (
          <button 
            className={`demo-btn ${demoMode ? 'active' : ''}`}
            onClick={onDemoToggle}
            title={demoMode ? 'Stop Demo' : 'Start Demo Mode'}
          >
            {demoMode ? '⏹ DEMO' : '▶ DEMO'}
          </button>
        )}
      </div>

      <div className="header-center">
        <div className="session-info">
          <span className="track-name">{sessionInfo.track}</span>
          <span className="session-type">{sessionInfo.session}</span>
          {sessionInfo.totalLaps > 0 && (
            <span className="lap-info">Lap {sessionInfo.totalLaps}</span>
          )}
        </div>
      </div>

      <div className="header-right">
        <div className="connection-indicators">
          <div className={`indicator ${connected ? 'connected' : 'disconnected'}`}>
            <span className="indicator-dot"></span>
            <span className="indicator-label">Backend</span>
          </div>
          <div className={`indicator ${relayConnected ? 'connected' : 'disconnected'}`}>
            <span className="indicator-dot"></span>
            <span className="indicator-label">Relay</span>
          </div>
          <div className={`indicator ${iRacingConnected ? 'connected' : 'disconnected'}`}>
            <span className="indicator-dot"></span>
            <span className="indicator-label">iRacing</span>
          </div>
        </div>
        {onSettingsClick && (
          <button className="settings-btn" onClick={onSettingsClick} title="Settings">
            ⚙️
          </button>
        )}
      </div>
    </header>
  );
}
