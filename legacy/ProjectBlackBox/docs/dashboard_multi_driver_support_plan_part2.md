# Dashboard Multi-Driver Support Implementation Plan - Part 2: UI Components & Interaction

## 5. User Interface Components

### 5.1 Driver Selector Component

A new component will be added to the dashboard header to enable driver selection and display the current active driver:

```typescript
// src/components/DriverSelector/DriverSelector.tsx
import React, { useState, useEffect } from 'react';
import { useDriverManager } from '../../services/DriverManager';
import './DriverSelector.css';

const DriverSelector: React.FC = () => {
  const { 
    drivers, 
    activeDriverId, 
    switchActiveDriver,
    driverStatus
  } = useDriverManager();
  
  const handleDriverChange = (driverId: string) => {
    if (driverId !== activeDriverId) {
      switchActiveDriver(driverId);
    }
  };
  
  return (
    <div className="driver-selector">
      <div className="active-driver">
        <div className={`status-indicator ${driverStatus[activeDriverId]}`}></div>
        <div className="driver-avatar">
          {drivers[activeDriverId]?.avatar ? (
            <img src={drivers[activeDriverId].avatar} alt={`${drivers[activeDriverId].name}`} />
          ) : (
            <div className="avatar-placeholder">{drivers[activeDriverId]?.name.charAt(0)}</div>
          )}
        </div>
        <div className="driver-info">
          <div className="driver-name">{drivers[activeDriverId]?.name}</div>
          <div className="driver-role">{drivers[activeDriverId]?.role}</div>
        </div>
      </div>
      
      <div className="driver-dropdown">
        <select 
          value={activeDriverId} 
          onChange={(e) => handleDriverChange(e.target.value)}
          className="driver-select"
        >
          {Object.entries(drivers).map(([id, driver]) => (
            <option key={id} value={id}>
              {driver.name} ({driver.role}) - {driverStatus[id]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default DriverSelector;
```

### 5.2 Driver Comparison Panel

A new panel will be added to enable side-by-side comparison of driver telemetry:

```typescript
// src/components/DriverComparison/DriverComparison.tsx
import React, { useState, useEffect } from 'react';
import { useDriverManager } from '../../services/DriverManager';
import { useComparisonEngine } from '../../services/ComparisonEngine';
import './DriverComparison.css';

const DriverComparison: React.FC = () => {
  const { drivers, activeDriverId } = useDriverManager();
  const [comparisonDriverId, setComparisonDriverId] = useState<string | null>(null);
  const { getComparison, comparisonMetrics } = useComparisonEngine();
  
  useEffect(() => {
    if (comparisonDriverId) {
      getComparison(activeDriverId, comparisonDriverId);
    }
  }, [activeDriverId, comparisonDriverId, getComparison]);
  
  const handleComparisonDriverChange = (driverId: string) => {
    setComparisonDriverId(driverId === 'none' ? null : driverId);
  };
  
  return (
    <div className="panel driver-comparison-panel">
      <div className="panel-header">
        <h3>Driver Comparison</h3>
        <div className="comparison-controls">
          <select 
            value={comparisonDriverId || 'none'} 
            onChange={(e) => handleComparisonDriverChange(e.target.value)}
          >
            <option value="none">Select driver to compare</option>
            {Object.entries(drivers)
              .filter(([id]) => id !== activeDriverId)
              .map(([id, driver]) => (
                <option key={id} value={id}>{driver.name}</option>
              ))}
          </select>
        </div>
      </div>
      
      <div className="panel-content">
        {comparisonDriverId ? (
          <div className="comparison-grid">
            <div className="comparison-header">
              <div className="driver-column driver-a">
                {drivers[activeDriverId]?.name} (Active)
              </div>
              <div className="metric-column">Metric</div>
              <div className="driver-column driver-b">
                {drivers[comparisonDriverId]?.name}
              </div>
            </div>
            
            {comparisonMetrics.map((metric) => (
              <div key={metric.name} className="comparison-row">
                <div className="driver-column driver-a">
                  {metric.driverA.value} 
                  <span className={`delta ${metric.driverA.delta > 0 ? 'positive' : 'negative'}`}>
                    {metric.driverA.delta > 0 ? '+' : ''}{metric.driverA.delta}
                  </span>
                </div>
                <div className="metric-column">{metric.name}</div>
                <div className="driver-column driver-b">
                  {metric.driverB.value}
                  <span className={`delta ${metric.driverB.delta > 0 ? 'positive' : 'negative'}`}>
                    {metric.driverB.delta > 0 ? '+' : ''}{metric.driverB.delta}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-comparison">
            <p>Select a driver to compare with {drivers[activeDriverId]?.name}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverComparison;
```

### 5.3 Driver Handoff Dialog

A modal dialog to facilitate structured driver handoffs:

```typescript
// src/components/DriverHandoff/DriverHandoffDialog.tsx
import React, { useState } from 'react';
import { useDriverManager } from '../../services/DriverManager';
import './DriverHandoffDialog.css';

interface DriverHandoffDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const DriverHandoffDialog: React.FC<DriverHandoffDialogProps> = ({ isOpen, onClose }) => {
  const { 
    drivers, 
    activeDriverId, 
    initiateHandoff,
    cancelHandoff,
    confirmHandoff
  } = useDriverManager();
  
  const [targetDriverId, setTargetDriverId] = useState<string>('');
  const [handoffNotes, setHandoffNotes] = useState<string>('');
  const [step, setStep] = useState<'select' | 'confirm' | 'complete'>('select');
  const [handoffId, setHandoffId] = useState<string | null>(null);
  
  const handleInitiateHandoff = () => {
    if (!targetDriverId) return;
    
    const id = initiateHandoff(activeDriverId, targetDriverId, handoffNotes);
    setHandoffId(id);
    setStep('confirm');
  };
  
  const handleConfirmHandoff = () => {
    if (!handoffId) return;
    
    confirmHandoff(handoffId);
    setStep('complete');
  };
  
  const handleCancel = () => {
    if (handoffId) {
      cancelHandoff(handoffId);
    }
    resetAndClose();
  };
  
  const resetAndClose = () => {
    setTargetDriverId('');
    setHandoffNotes('');
    setStep('select');
    setHandoffId(null);
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay">
      <div className="modal-container driver-handoff-dialog">
        <div className="modal-header">
          <h2>Driver Handoff</h2>
          <button className="close-button" onClick={handleCancel}>×</button>
        </div>
        
        <div className="modal-content">
          {step === 'select' && (
            <>
              <div className="handoff-info">
                <p>Current driver: <strong>{drivers[activeDriverId]?.name}</strong></p>
                
                <div className="form-group">
                  <label htmlFor="target-driver">Hand off to:</label>
                  <select 
                    id="target-driver"
                    value={targetDriverId} 
                    onChange={(e) => setTargetDriverId(e.target.value)}
                  >
                    <option value="">Select driver</option>
                    {Object.entries(drivers)
                      .filter(([id]) => id !== activeDriverId && drivers[id].status === 'standby')
                      .map(([id, driver]) => (
                        <option key={id} value={id}>{driver.name}</option>
                      ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="handoff-notes">Handoff notes:</label>
                  <textarea
                    id="handoff-notes"
                    value={handoffNotes}
                    onChange={(e) => setHandoffNotes(e.target.value)}
                    placeholder="Add notes for the next driver..."
                    rows={4}
                  />
                </div>
              </div>
              
              <div className="modal-actions">
                <button className="cancel-button" onClick={handleCancel}>Cancel</button>
                <button 
                  className="confirm-button" 
                  onClick={handleInitiateHandoff}
                  disabled={!targetDriverId}
                >
                  Initiate Handoff
                </button>
              </div>
            </>
          )}
          
          {step === 'confirm' && (
            <>
              <div className="handoff-confirmation">
                <p>Waiting for {drivers[targetDriverId]?.name} to confirm handoff...</p>
                <div className="loading-indicator"></div>
                <p className="handoff-id">Handoff ID: {handoffId}</p>
              </div>
              
              <div className="modal-actions">
                <button className="cancel-button" onClick={handleCancel}>Cancel Handoff</button>
                {/* For demo purposes, we're allowing manual confirmation */}
                <button className="confirm-button" onClick={handleConfirmHandoff}>
                  Simulate Confirmation
                </button>
              </div>
            </>
          )}
          
          {step === 'complete' && (
            <>
              <div className="handoff-complete">
                <div className="success-icon">✓</div>
                <h3>Handoff Complete</h3>
                <p>Control has been transferred to {drivers[targetDriverId]?.name}</p>
              </div>
              
              <div className="modal-actions">
                <button className="ok-button" onClick={resetAndClose}>Close</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverHandoffDialog;
```

### 5.4 Team Communication Panel

A panel for team-wide messaging and notifications:

```typescript
// src/components/TeamCommunication/TeamCommunication.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useDriverManager } from '../../services/DriverManager';
import { webSocketService } from '../../services/WebSocketService';
import './TeamCommunication.css';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  timestamp: number;
  content: string;
  priority: 'normal' | 'high' | 'critical';
}

const TeamCommunication: React.FC = () => {
  const { drivers, activeDriverId } = useDriverManager();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high' | 'critical'>('normal');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleTeamMessage = (data: any) => {
      if (data && data.message) {
        setMessages(prev => [...prev, data.message]);
        scrollToBottom();
      }
    };
    
    const unsubscribe = webSocketService.on('team_message', handleTeamMessage);
    
    // Load initial messages
    // This would typically come from an API call or WebSocket
    setMessages([
      {
        id: '1',
        senderId: 'system',
        senderName: 'System',
        timestamp: Date.now() - 60000,
        content: 'Team communication channel initialized',
        priority: 'normal'
      }
    ]);
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const sendMessage = () => {
    if (!newMessage.trim()) return;
    
    const message: Message = {
      id: `msg-${Date.now()}`,
      senderId: activeDriverId,
      senderName: drivers[activeDriverId]?.name || 'Unknown',
      timestamp: Date.now(),
      content: newMessage.trim(),
      priority
    };
    
    // Send via WebSocket
    webSocketService.send('team_message', { message });
    
    // Optimistically add to local state
    setMessages(prev => [...prev, message]);
    setNewMessage('');
    setPriority('normal');
  };
  
  return (
    <div className="panel team-communication-panel">
      <div className="panel-header">
        <h3>Team Communication</h3>
      </div>
      
      <div className="panel-content">
        <div className="message-list">
          {messages.map(message => (
            <div 
              key={message.id} 
              className={`message ${message.senderId === activeDriverId ? 'own-message' : ''} priority-${message.priority}`}
            >
              <div className="message-header">
                <span className="sender-name">{message.senderName}</span>
                <span className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="message-content">{message.content}</div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="message-input">
          <div className="priority-selector">
            <select 
              value={priority} 
              onChange={(e) => setPriority(e.target.value as 'normal' | 'high' | 'critical')}
            >
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <input 
            type="text" 
            value={newMessage} 
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
};

export default TeamCommunication;
```
