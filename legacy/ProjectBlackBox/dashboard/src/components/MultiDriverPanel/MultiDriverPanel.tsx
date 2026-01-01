import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import DriverSelector from '../DriverSelector/DriverSelector';
import DriverComparison from '../DriverComparison/DriverComparison';
import HandoffManager from '../HandoffManager/HandoffManager';
import TeamChat from '../TeamChat/TeamChat';
import TacviewPanel from '../Tacview/TacviewPanel';
import './MultiDriverPanel.css';

enum TabType {
  DRIVERS = 'drivers',
  COMPARISON = 'comparison',
  HANDOFF = 'handoff',
  TEAM_CHAT = 'team_chat',
  TACVIEW = 'tacview'
}

interface MultiDriverPanelProps {
  onClose?: () => void;
}

const MultiDriverPanel: React.FC<MultiDriverPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>(TabType.DRIVERS);
  const { drivers, pendingHandoffs, teamMessages } = useSelector((state: RootState) => state.drivers);
  
  // Count unread messages
  const unreadMessageCount = teamMessages.filter(msg => !msg.read).length;
  
  // Count pending handoffs
  const pendingHandoffCount = pendingHandoffs.filter(handoff => handoff.status === 'pending').length;

  const renderTabContent = () => {
    switch (activeTab) {
      case TabType.DRIVERS:
        return <DriverSelector />;
      case TabType.COMPARISON:
        return <DriverComparison />;
      case TabType.HANDOFF:
        return <HandoffManager />;
      case TabType.TEAM_CHAT:
        return <TeamChat />;
      case TabType.TACVIEW:
        return <TacviewPanel />;
      default:
        return <div>Select a tab</div>;
    }
  };

  return (
    <div className="multi-driver-panel">
      <div className="panel-header">
        <h2>Multi-Driver Control</h2>
        {onClose && (
          <button className="close-button" onClick={onClose}>×</button>
        )}
      </div>
      
      <div className="panel-tabs">
        <button 
          className={`tab-button ${activeTab === TabType.DRIVERS ? 'active' : ''}`}
          onClick={() => setActiveTab(TabType.DRIVERS)}
        >
          Drivers
          {drivers.length > 0 && (
            <span className="tab-badge">{drivers.length}</span>
          )}
        </button>
        
        <button 
          className={`tab-button ${activeTab === TabType.COMPARISON ? 'active' : ''}`}
          onClick={() => setActiveTab(TabType.COMPARISON)}
        >
          Comparison
        </button>
        
        <button 
          className={`tab-button ${activeTab === TabType.HANDOFF ? 'active' : ''}`}
          onClick={() => setActiveTab(TabType.HANDOFF)}
        >
          Handoff
          {pendingHandoffCount > 0 && (
            <span className="tab-badge alert">{pendingHandoffCount}</span>
          )}
        </button>
        
        <button 
          className={`tab-button ${activeTab === TabType.TEAM_CHAT ? 'active' : ''}`}
          onClick={() => setActiveTab(TabType.TEAM_CHAT)}
        >
          Team Chat
          {unreadMessageCount > 0 && (
            <span className="tab-badge alert">{unreadMessageCount}</span>
          )}
        </button>

        <button 
          className={`tab-button ${activeTab === TabType.TACVIEW ? 'active' : ''}`}
          onClick={() => setActiveTab(TabType.TACVIEW)}
        >
          Tacview
        </button>
      </div>
      
      <div className="panel-content">
        {renderTabContent()}
      </div>
      
      <div className="panel-footer">
        <div className="driver-stats">
          <div className="stat">
            <span className="stat-label">Active Drivers:</span>
            <span className="stat-value">{drivers.filter(d => d.status === 'active').length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Standby:</span>
            <span className="stat-value">{drivers.filter(d => d.status === 'standby').length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Offline:</span>
            <span className="stat-value">{drivers.filter(d => d.status === 'offline').length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiDriverPanel;
