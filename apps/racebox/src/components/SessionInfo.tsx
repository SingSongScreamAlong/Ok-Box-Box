import type { SessionMetadata } from '@okboxbox/shared';
import './SessionInfo.css';

interface SessionInfoProps {
  session: SessionMetadata;
}

export function SessionInfo({ session }: SessionInfoProps) {
  return (
    <div className="session-info">
      <h3 className="panel-title">Session</h3>
      
      <div className="session-details">
        <div className="session-track">
          <span className="track-name">{session.track.name}</span>
          {session.track.configName && (
            <span className="track-config">{session.track.configName}</span>
          )}
        </div>
        
        <div className="session-type">
          <span className={`type-badge type-${session.type.toLowerCase()}`}>
            {session.type}
          </span>
        </div>
        
        <div className="session-meta">
          <div className="meta-item">
            <span className="meta-label">Drivers</span>
            <span className="meta-value">{session.drivers.length}</span>
          </div>
          {session.totalLaps > 0 && (
            <div className="meta-item">
              <span className="meta-label">Laps</span>
              <span className="meta-value">{session.totalLaps}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
