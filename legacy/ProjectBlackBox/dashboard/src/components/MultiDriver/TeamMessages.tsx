import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { TeamMessage, TeamMessageUtils } from '../../types/TeamMessage';
import multiDriverService from '../../services/MultiDriverService';


/**
 * TeamMessages component for team communication
 */
const TeamMessages: React.FC = () => {
  const [messageContent, setMessageContent] = useState<string>('');
  const [isPriorityMessage, setIsPriorityMessage] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { teamMessages, activeDriverId, drivers } = useSelector((state: RootState) => state.drivers) as {
    teamMessages: TeamMessage[];
    activeDriverId: string | null;
    drivers: any[];
  };
  
  // Get active driver details
  const activeDriver = drivers.find(d => d.id === activeDriverId);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [teamMessages]);
  
  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Format timestamp using the TeamMessageUtils helper
  const formatTime = (message: TeamMessage): string => {
    return TeamMessageUtils.formatTimestamp(message, 'time');
  };
  
  // Handle sending a message
  const handleSendMessage = () => {
    if (!messageContent.trim() || !activeDriverId || !activeDriver) return;
    
    multiDriverService.sendTeamMessage(
      messageContent,
      activeDriverId,
      activeDriver.name,
      isPriorityMessage ? 'high' : 'normal'
    );
    
    setMessageContent('');
    setIsPriorityMessage(false);
  };
  
  // Handle Enter key press to send message
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  return (
    <div className="team-messages">
      <div className="messages-list">
        {teamMessages.length === 0 ? (
          <div className="no-messages">No messages yet</div>
        ) : (
          teamMessages.map((message, index: number) => (
            <div 
              key={index} 
              className={`message-item ${message.priority === 'high' ? 'message-priority-high' : ''}`}
            >
              <div className="message-header">
                <span className="message-sender">{message.senderName}</span>
                <span className="message-time">{formatTime(message)}</span>
              </div>
              <div className="message-content">{message.content}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="message-compose">
        <textarea
          className="message-input"
          value={messageContent}
          onChange={(e) => setMessageContent(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          disabled={!activeDriverId}
        />
        <div className="message-actions">
          <div className="priority-toggle">
            <input
              type="checkbox"
              id="priority-toggle"
              checked={isPriorityMessage}
              onChange={() => setIsPriorityMessage(!isPriorityMessage)}
              disabled={!activeDriverId}
            />
            <label htmlFor="priority-toggle">Priority</label>
          </div>
          <button
            className="send-button"
            onClick={handleSendMessage}
            disabled={!messageContent.trim() || !activeDriverId}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeamMessages;
