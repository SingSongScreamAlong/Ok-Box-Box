import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../redux/store';
import { setActiveDriver } from '../../redux/slices/driversSlice';
import DriverSelector from './DriverSelector';
import DriverComparison from './DriverComparison';
import TeamMessages from './TeamMessages';
import HandoffManager from './HandoffManager';
import './MultiDriver.css';

/**
 * MultiDriverPanel component for managing multi-driver functionality
 * Includes driver selection, comparison, team messages, and handoff management
 */
const MultiDriverPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'drivers' | 'comparison' | 'messages' | 'handoff'>('drivers');
  const dispatch = useDispatch();
  const { drivers, activeDriverId } = useSelector((state: RootState) => state.drivers);
  
  // Handle driver selection
  const handleDriverSelect = (driverId: string) => {
    dispatch(setActiveDriver(driverId));
  };
  
  return (
    <div className="multi-driver-panel">
      <div className="multi-driver-tabs">
        <button 
          className={`tab-button ${activeTab === 'drivers' ? 'active' : ''}`}
          onClick={() => setActiveTab('drivers')}
        >
          Drivers
        </button>
        <button 
          className={`tab-button ${activeTab === 'comparison' ? 'active' : ''}`}
          onClick={() => setActiveTab('comparison')}
        >
          Compare
        </button>
        <button 
          className={`tab-button ${activeTab === 'messages' ? 'active' : ''}`}
          onClick={() => setActiveTab('messages')}
        >
          Messages
        </button>
        <button 
          className={`tab-button ${activeTab === 'handoff' ? 'active' : ''}`}
          onClick={() => setActiveTab('handoff')}
        >
          Handoff
        </button>
      </div>
      
      <div className="multi-driver-content">
        {activeTab === 'drivers' && (
          <DriverSelector 
            drivers={drivers} 
            activeDriverId={activeDriverId}
            onDriverSelect={handleDriverSelect}
          />
        )}
        
        {activeTab === 'comparison' && (
          <DriverComparison />
        )}
        
        {activeTab === 'messages' && (
          <TeamMessages />
        )}
        
        {activeTab === 'handoff' && (
          <HandoffManager />
        )}
      </div>
    </div>
  );
};

export default MultiDriverPanel;
