import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { TimingTower } from './components/TimingTower';
import { SessionInfo } from './components/SessionInfo';
import { TelemetryPanel } from './components/TelemetryPanel';
import { ConnectionStatus } from './components/ConnectionStatus';
import { useSocket } from './hooks/useSocket';
import type { TimingEntry, SessionMetadata, TelemetryPacket } from '@okboxbox/shared';
import './App.css';

function App() {
  const { connected, relayStatus, socket } = useSocket();
  const [session, setSession] = useState<SessionMetadata | null>(null);
  const [timing, setTiming] = useState<TimingEntry[]>([]);
  const [playerTelemetry, setPlayerTelemetry] = useState<TelemetryPacket | null>(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('session:start', (data: SessionMetadata) => {
      console.log('Session started:', data);
      setSession(data);
      setTiming([]);
      socket.emit('join:session', data.sessionId);
    });

    socket.on('session:end', () => {
      console.log('Session ended');
      setSession(null);
      setTiming([]);
    });

    socket.on('timing:update', (data: { sessionId: string; entries: TimingEntry[] }) => {
      console.log('Timing update received:', data.entries?.length || 0, 'entries');
      if (data.entries) {
        setTiming(data.entries);
      }
    });

    socket.on('telemetry:update', (data: TelemetryPacket) => {
      setPlayerTelemetry(data);
    });

    return () => {
      socket.off('session:start');
      socket.off('session:end');
      socket.off('timing:update');
      socket.off('telemetry:update');
    };
  }, [socket]);

  return (
    <div className="app">
      <Header />
      
      <main className="main-content">
        <div className="left-panel">
          <ConnectionStatus 
            connected={connected} 
            relayConnected={relayStatus.connected}
            iRacingConnected={relayStatus.iRacingConnected}
          />
          
          {session && <SessionInfo session={session} />}
          
          {playerTelemetry && <TelemetryPanel telemetry={playerTelemetry} />}
        </div>
        
        <div className="center-panel">
          <TimingTower entries={timing} />
        </div>
        
        <div className="right-panel">
          {/* Future: Track map, gap analysis */}
        </div>
      </main>
    </div>
  );
}

export default App;
