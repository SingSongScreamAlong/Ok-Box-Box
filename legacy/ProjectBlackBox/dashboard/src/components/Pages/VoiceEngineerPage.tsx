import React, { useState, useCallback } from 'react';
import './VoiceEngineerPage.css';

interface Message {
  id: string;
  type: 'engineer' | 'user';
  content: string;
  timestamp: Date;
}

const VoiceEngineerPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'engineer',
      content: "Good afternoon, driver. I'm your race engineer for today's session. Current track conditions are optimal - 42°C track temp, dry conditions. How can I assist you?",
      timestamp: new Date(Date.now() - 300000),
    },
    {
      id: '2',
      type: 'user',
      content: "What's my gap to the car ahead?",
      timestamp: new Date(Date.now() - 240000),
    },
    {
      id: '3',
      type: 'engineer',
      content: "Gap to Hamilton ahead is 1.2 seconds. He's on medium tires, lap 18 of 52. You're closing at approximately 0.3 seconds per lap. At this rate, you'll be in DRS range in 4 laps.",
      timestamp: new Date(Date.now() - 180000),
    },
    {
      id: '4',
      type: 'user',
      content: "How are my tires looking?",
      timestamp: new Date(Date.now() - 120000),
    },
    {
      id: '5',
      type: 'engineer',
      content: "Front left is at 78% life, running 2 degrees hot. Rear tires are in good shape at 85%. I'd recommend managing the fronts through Copse and Maggots-Becketts. Consider a lift-and-coast approach for the next 5 laps to extend the stint.",
      timestamp: new Date(Date.now() - 60000),
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const quickCommands = [
    "Gap to leader",
    "Tire status",
    "Weather update",
    "Pit window",
    "Fuel remaining",
    "Best lap",
    "Sector comparison",
    "Strategy update",
  ];

  const recentTopics = [
    { icon: '🛞', text: 'Tire Management' },
    { icon: '⛽', text: 'Fuel Strategy' },
    { icon: '🏁', text: 'Race Position' },
    { icon: '🌡️', text: 'Track Conditions' },
  ];

  const handleSend = useCallback(() => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsProcessing(true);

    // Simulate engineer response
    setTimeout(() => {
      const engineerMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'engineer',
        content: getEngineerResponse(inputText),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, engineerMessage]);
      setIsProcessing(false);
    }, 1500);
  }, [inputText]);

  const getEngineerResponse = (query: string): string => {
    const q = query.toLowerCase();
    if (q.includes('gap') || q.includes('ahead') || q.includes('behind')) {
      return "Gap to P2 Hamilton is now 0.9 seconds. He's pushing hard - his last lap was a 1:28.234. Stay focused, you're doing well.";
    }
    if (q.includes('tire') || q.includes('tyre')) {
      return "Tire update: Fronts at 72%, rears at 80%. Temperature is stable. You have about 12 laps left on this set before performance drops significantly.";
    }
    if (q.includes('fuel')) {
      return "Fuel is looking good. 34 laps remaining with current consumption. You can push for the next 5 laps, then we'll need to manage.";
    }
    if (q.includes('weather')) {
      return "Weather radar shows clear conditions for the next 45 minutes. Track temperature stable at 42°C. No rain expected during this session.";
    }
    if (q.includes('pit') || q.includes('stop')) {
      return "Optimal pit window opens in 8 laps. Current undercut opportunity exists if we pit in 3 laps. Overcut looking less favorable with current tire deg.";
    }
    return "Copy that. I'll get you that information. In the meantime, focus on your marks - you're doing great through Becketts.";
  };

  const handleVoiceToggle = () => {
    setIsListening(!isListening);
    if (!isListening) {
      // Simulate voice recognition
      setTimeout(() => {
        setInputText("What's my current pace compared to the leader?");
        setIsListening(false);
      }, 2000);
    }
  };

  const handleQuickCommand = (cmd: string) => {
    setInputText(cmd);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="voice-engineer-page">
      <div className="voice-header">
        <h1>🎙️ Race Engineer</h1>
        <div className="voice-status">
          <div className={`status-badge ${isListening ? 'listening' : isProcessing ? 'processing' : ''}`}>
            <span className="indicator"></span>
            {isListening ? 'Listening...' : isProcessing ? 'Processing...' : 'Ready'}
          </div>
        </div>
      </div>

      <div className="voice-content">
        {/* Conversation Panel */}
        <div className="conversation-panel">
          <div className="conversation-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.type}`}>
                <div className="message-avatar">
                  {msg.type === 'engineer' ? '🎧' : '🏎️'}
                </div>
                <div>
                  <div className="message-content">{msg.content}</div>
                  <div className="message-time">{formatTime(msg.timestamp)}</div>
                </div>
              </div>
            ))}
            {isProcessing && (
              <div className="message engineer">
                <div className="message-avatar">🎧</div>
                <div className="message-content">Analyzing data...</div>
              </div>
            )}
          </div>

          <div className="voice-input-area">
            <div className="input-container">
              <input
                type="text"
                className="text-input"
                placeholder="Type a message or use voice..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              />
              <button 
                className={`voice-btn mic ${isListening ? 'listening' : ''}`}
                onClick={handleVoiceToggle}
              >
                🎤
              </button>
              <button className="send-btn" onClick={handleSend}>
                ➤
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="voice-sidebar">
          {/* Engineer Profile */}
          <div className="sidebar-section">
            <div className="engineer-profile">
              <div className="engineer-avatar">🎧</div>
              <div className="engineer-name">Marcus Chen</div>
              <div className="engineer-role">Senior Race Engineer</div>
            </div>
          </div>

          {/* Quick Commands */}
          <div className="sidebar-section">
            <h3>Quick Commands</h3>
            <div className="quick-commands">
              {quickCommands.map((cmd) => (
                <button 
                  key={cmd} 
                  className="quick-cmd"
                  onClick={() => handleQuickCommand(cmd)}
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>

          {/* Session Stats */}
          <div className="sidebar-section">
            <h3>Session Stats</h3>
            <div className="session-stats">
              <div className="stat-card">
                <div className="stat-value">24</div>
                <div className="stat-label">Messages</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">8</div>
                <div className="stat-label">Insights</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">3</div>
                <div className="stat-label">Alerts</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">45m</div>
                <div className="stat-label">Session</div>
              </div>
            </div>
          </div>

          {/* Recent Topics */}
          <div className="sidebar-section">
            <h3>Recent Topics</h3>
            <div className="recent-topics">
              {recentTopics.map((topic, i) => (
                <div key={i} className="topic-item">
                  <span className="topic-icon">{topic.icon}</span>
                  <span>{topic.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceEngineerPage;
