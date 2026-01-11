import './ConnectionStatus.css';

interface ConnectionStatusProps {
  connected: boolean;
  relayConnected: boolean;
  iRacingConnected: boolean;
}

export function ConnectionStatus({ connected, relayConnected, iRacingConnected }: ConnectionStatusProps) {
  return (
    <div className="connection-status">
      <h3 className="panel-title">Connection Status</h3>
      
      <div className="status-items">
        <div className="status-item">
          <span className={`status-dot ${connected ? 'connected' : 'disconnected'}`} />
          <span className="status-label">Backend</span>
          <span className={`status-value ${connected ? 'text-green' : 'text-red'}`}>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        <div className="status-item">
          <span className={`status-dot ${relayConnected ? 'connected' : 'disconnected'}`} />
          <span className="status-label">Relay</span>
          <span className={`status-value ${relayConnected ? 'text-green' : 'text-muted'}`}>
            {relayConnected ? 'Running' : 'Not Running'}
          </span>
        </div>
        
        <div className="status-item">
          <span className={`status-dot ${iRacingConnected ? 'connected' : 'disconnected'}`} />
          <span className="status-label">iRacing</span>
          <span className={`status-value ${iRacingConnected ? 'text-green' : 'text-muted'}`}>
            {iRacingConnected ? 'Connected' : 'Not Running'}
          </span>
        </div>
      </div>
    </div>
  );
}
