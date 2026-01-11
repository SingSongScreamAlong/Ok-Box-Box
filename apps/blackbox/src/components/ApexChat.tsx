import React, { useState, useEffect, useRef } from 'react';
import { Apex, ApexMessage, ApexInsight } from '../services/Apex';
import './ApexChat.css';

interface ApexChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const ApexChat: React.FC<ApexChatProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ApexMessage[]>([]);
  const [insights, setInsights] = useState<ApexInsight[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubMessages = Apex.subscribe((message) => {
      setMessages(prev => [...prev, message]);
    });

    const unsubInsights = Apex.subscribeToInsights((insight) => {
      setInsights(prev => [...prev.slice(-4), insight]);
    });

    // Load existing history
    setMessages(Apex.getConversationHistory());
    setInsights(Apex.getInsights().slice(-5));

    return () => {
      unsubMessages();
      unsubInsights();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: ApexMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    await Apex.ask(input);
    setIsTyping(false);
  };

  const quickQuestions = [
    'When should I pit?',
    'How are my tires?',
    'Fuel status?',
    'Should I push?',
    'Strategy overview',
  ];

  const handleQuickQuestion = async (question: string) => {
    const userMessage: ApexMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    await Apex.ask(question);
    setIsTyping(false);
  };

  const getPriorityColor = (priority: ApexInsight['priority']) => {
    switch (priority) {
      case 'critical': return 'var(--accent-danger)';
      case 'high': return 'var(--accent-warning)';
      case 'medium': return 'var(--accent-primary)';
      default: return 'var(--text-muted)';
    }
  };

  const getTypeIcon = (type: ApexInsight['type']) => {
    switch (type) {
      case 'strategy': return '🎯';
      case 'pace': return '⚡';
      case 'tires': return '🔘';
      case 'fuel': return '⛽';
      case 'weather': return '🌧️';
      case 'competitor': return '🏎️';
      default: return '💡';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="apex-overlay">
      <div className="apex-container">
        <div className="apex-header">
          <div className="apex-logo">
            <span className="apex-icon">◈</span>
            <span className="apex-title">APEX</span>
            <span className="apex-subtitle">AI Performance Expert</span>
          </div>
          <button className="apex-close" onClick={onClose}>×</button>
        </div>

        {insights.length > 0 && (
          <div className="apex-insights">
            <div className="insights-header">Live Insights</div>
            <div className="insights-list">
              {insights.slice(-3).map((insight, i) => (
                <div 
                  key={i} 
                  className="insight-item"
                  style={{ borderLeftColor: getPriorityColor(insight.priority) }}
                >
                  <span className="insight-icon">{getTypeIcon(insight.type)}</span>
                  <div className="insight-content">
                    <div className="insight-title">{insight.title}</div>
                    <div className="insight-message">{insight.message}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="apex-messages">
          {messages.length === 0 && (
            <div className="apex-welcome">
              <div className="welcome-icon">◈</div>
              <h3>Welcome to APEX</h3>
              <p>Your AI race strategist. Ask me anything about strategy, tires, fuel, or pace.</p>
              <div className="quick-questions">
                {quickQuestions.map((q, i) => (
                  <button 
                    key={i} 
                    className="quick-question"
                    onClick={() => handleQuickQuestion(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`message ${msg.role}`}
            >
              {msg.role === 'apex' && (
                <div className="message-avatar">◈</div>
              )}
              <div className="message-content">
                <div className="message-text">{msg.content}</div>
                <div className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="message apex">
              <div className="message-avatar">◈</div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="apex-quick-actions">
          {quickQuestions.slice(0, 3).map((q, i) => (
            <button 
              key={i} 
              className="quick-action"
              onClick={() => handleQuickQuestion(q)}
            >
              {q}
            </button>
          ))}
        </div>

        <form className="apex-input-form" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask APEX about strategy, tires, fuel..."
            className="apex-input"
          />
          <button type="submit" className="apex-send" disabled={!input.trim()}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ApexChat;
