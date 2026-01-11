import React, { useState, useEffect, useRef } from 'react';
import VoiceComms, { VoiceMessage } from '../services/VoiceComms';
import webSocketService from '../services/WebSocketService';
import './EngineerComms.css';

interface EngineerCommsProps {
  driverName?: string;
}

const EngineerComms: React.FC<EngineerCommsProps> = ({ driverName = 'Driver' }) => {
  const [driverConnected, setDriverConnected] = useState(false);
  const [isDriverSpeaking, setIsDriverSpeaking] = useState(false);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Listen for driver connection status
    const unsubDriver = webSocketService.on('relay:status', (status) => {
      setDriverConnected(status.iRacingConnected);
    });

    // Listen for driver transcriptions
    const unsubTranscription = webSocketService.on('driver:transcription', (data) => {
      const message: VoiceMessage = {
        id: `msg-${Date.now()}`,
        from: 'driver',
        text: data.text,
        timestamp: data.timestamp,
      };
      setMessages(prev => [...prev, message]);
      setIsDriverSpeaking(false);
    });

    // Listen for voice events
    const unsubVoice = VoiceComms.subscribe((event, data) => {
      if (event === 'engineer_speaking') {
        const msg = data as { text: string };
        const message: VoiceMessage = {
          id: `msg-${Date.now()}`,
          from: 'engineer',
          text: msg.text,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, message]);
      }
    });

    return () => {
      unsubDriver.unsubscribe();
      unsubTranscription.unsubscribe();
      unsubVoice();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim() || isSending) return;

    setIsSending(true);
    try {
      // Speak to driver via TTS
      await VoiceComms.speakToDriver(inputText);
      
      // Also send via WebSocket for logging
      webSocketService.send('engineer:message', { 
        text: inputText, 
        timestamp: Date.now() 
      });
      
      setInputText('');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickMessages = [
    'Box this lap',
    'Stay out',
    'Push now',
    'Save fuel',
    'Yellow flag ahead',
    'Car behind closing',
  ];

  return (
    <div className="engineer-comms">
      <div className="comms-header">
        <div className="header-left">
          <span className="comms-icon">🎙️</span>
          <span className="comms-title">DRIVER COMMS</span>
        </div>
        <div className="header-right">
          <div className={`driver-status ${driverConnected ? 'connected' : 'disconnected'}`}>
            <span className="status-dot"></span>
            <span className="status-text">
              {driverConnected ? `${driverName} Connected` : 'Driver Offline'}
            </span>
          </div>
        </div>
      </div>

      <div className="comms-messages">
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet</p>
            <small>Type a message or use quick actions to communicate with the driver</small>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.from}`}>
              <div className="message-header">
                <span className="message-from">
                  {msg.from === 'engineer' ? 'You' : driverName}
                </span>
                <span className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="message-text">{msg.text}</div>
            </div>
          ))
        )}
        
        {isDriverSpeaking && (
          <div className="driver-speaking">
            <div className="speaking-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span>{driverName} is speaking...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="quick-messages">
        {quickMessages.map((msg, i) => (
          <button
            key={i}
            className="quick-msg-btn"
            onClick={() => {
              setInputText(msg);
            }}
          >
            {msg}
          </button>
        ))}
      </div>

      <div className="comms-input">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type message to driver..."
          rows={2}
          disabled={!driverConnected}
        />
        <button 
          className="send-btn"
          onClick={sendMessage}
          disabled={!inputText.trim() || isSending || !driverConnected}
        >
          {isSending ? (
            <span className="sending">Sending...</span>
          ) : (
            <>
              <span className="send-icon">📢</span>
              <span>Send</span>
            </>
          )}
        </button>
      </div>

      <div className="comms-footer">
        <small>Messages are spoken to driver via TTS</small>
      </div>
    </div>
  );
};

export default EngineerComms;
