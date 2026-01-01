import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../redux/store';
import { addTeamMessage, markMessageRead, markAllMessagesRead } from '../../redux/slices/driversSlice';
import TeamCommunication from '../../services/TeamCommunication';
import { TeamMessage, TeamMessageUtils } from '../../types/TeamMessage';
import './TeamChat.css';
import { v4 as uuidv4 } from 'uuid';

interface TeamChatProps {
  onClose?: () => void;
  compact?: boolean;
}

const TeamChat: React.FC<TeamChatProps> = ({ 
  onClose,
  compact = false 
}) => {
  const dispatch = useDispatch();
  const { drivers, activeDriverId, teamMessages } = useSelector((state: RootState) => state.drivers);
  const [newMessage, setNewMessage] = useState<string>('');
  const [filter, setFilter] = useState<string>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const teamComm = TeamCommunication.getInstance();

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [teamMessages]);

  // Mark messages as read when component mounts or active driver changes
  useEffect(() => {
    if (activeDriverId) {
      const unreadMessages = teamMessages.filter(
        msg => !msg.read && msg.recipientId === activeDriverId
      );
      
      unreadMessages.forEach(msg => {
        dispatch(markMessageRead(msg.id));
      });
    }
  }, [activeDriverId, teamMessages, dispatch]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !activeDriverId) return;

    try {
      const message: TeamMessage = {
        id: uuidv4(),
        senderId: activeDriverId,
        senderName: getDriverName(activeDriverId),
        recipientId: filter === 'all' ? 'all' : filter,
        content: newMessage.trim(),
        timestamp: Date.now(),
        priority: 'normal',
        read: false
      };

      // Add to Redux store
      dispatch(addTeamMessage(message));
      
      // Send via TeamCommunication service (server will echo with canonical ID)
      teamComm.sendMessage(newMessage.trim(), 'normal');
      
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getDriverName = (driverId: string): string => {
    if (driverId === 'all') return 'All';
    const driver = drivers.find(d => d.id === driverId);
    return driver ? driver.name : 'Unknown Driver';
  };

  const getMessageTime = (message: TeamMessage): string => {
    return TeamMessageUtils.formatTimestamp(message, 'time');
  };

  const getFilteredMessages = () => {
    if (filter === 'all') {
      return teamMessages;
    } else {
      return teamMessages.filter(
        msg => msg.senderId === filter || msg.recipientId === filter || 
              msg.recipientId === 'all' || msg.senderId === activeDriverId
      );
    }
  };

  const renderMessage = (message: TeamMessage) => {
    const isFromCurrentDriver = message.senderId === activeDriverId;
    const messageClass = `message ${isFromCurrentDriver ? 'outgoing' : 'incoming'} ${message.priority}`;
    
    return (
      <div key={message.id} className={messageClass}>
        <div className="message-header">
          <span className="sender-name">{message.senderName}</span>
          <span className="message-time">{getMessageTime(message)}</span>
        </div>
        <div className="message-content">{message.content}</div>
        {message.recipientId && message.recipientId !== 'all' && (
          <div className="message-recipient">
            To: {getDriverName(message.recipientId)}
          </div>
        )}
      </div>
    );
  };

  const renderDriverFilter = () => {
    return (
      <div className="message-filter">
        <select 
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All Team</option>
          {drivers.map(driver => (
            <option key={driver.id} value={driver.id}>
              {driver.name}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const renderCompactView = () => {
    const unreadCount = teamMessages.filter(
      msg => !msg.read && (msg.recipientId === activeDriverId || msg.recipientId === 'all')
    ).length;

    return (
      <div className="team-chat compact">
        <div className="chat-header compact">
          <h3>Team Messages</h3>
          {unreadCount > 0 && (
            <div className="unread-badge">{unreadCount}</div>
          )}
        </div>
        <div className="messages-container compact">
          {getFilteredMessages().slice(-3).map(renderMessage)}
          <div ref={messagesEndRef} />
        </div>
      </div>
    );
  };

  if (compact) {
    return renderCompactView();
  }

  return (
    <div className="team-chat">
      <div className="chat-header">
        <h3>Team Communication</h3>
        {onClose && (
          <button className="close-button" onClick={onClose}>×</button>
        )}
      </div>

      <div className="chat-toolbar">
        {renderDriverFilter()}
        <button 
          className="mark-read-button"
          onClick={() => dispatch(markAllMessagesRead())}
        >
          Mark All Read
        </button>
      </div>

      <div className="messages-container">
        {getFilteredMessages().map(renderMessage)}
        <div ref={messagesEndRef} />
      </div>

      <div className="message-input-container">
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          disabled={!activeDriverId}
        />
        <button 
          className="send-button"
          onClick={handleSendMessage}
          disabled={!newMessage.trim() || !activeDriverId}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default TeamChat;
