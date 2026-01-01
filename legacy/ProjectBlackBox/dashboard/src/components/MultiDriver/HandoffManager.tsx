import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { HandoffRequest } from '../../redux/slices/driversSlice';
import multiDriverService from '../../services/MultiDriverService';

/**
 * HandoffManager component for managing driver handoffs
 */
const HandoffManager: React.FC = () => {
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [handoffNotes, setHandoffNotes] = useState<string>('');

  // Get drivers and handoffs from Redux store
  const drivers = useSelector((state: RootState) => state.drivers.drivers);
  const pendingHandoffs = useSelector((state: RootState) => state.drivers.pendingHandoffs);
  const activeDriverId = useSelector((state: RootState) => state.drivers.activeDriverId);

  // Get active driver
  const activeDriver = drivers.find(driver => driver.id === activeDriverId);

  // Format time for display
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  // Get driver name by ID
  const getDriverName = (driverId: string): string => {
    const driver = drivers.find(d => d.id === driverId);
    return driver ? driver.name : 'Unknown Driver';
  };

  // Get CSS class for status display
  const getStatusClass = (status: string): string => {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'confirmed': return 'status-accepted';
      case 'cancelled': return 'status-rejected';
      case 'completed': return 'status-completed';
      default: return '';
    }
  };

  // Handle driver selection
  const handleDriverSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDriverId(e.target.value);
  };

  // Handle notes input
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setHandoffNotes(e.target.value);
  };

  // Handle handoff request submission
  const handleHandoffRequest = () => {
    if (!activeDriverId || !selectedDriverId) return;
    
    multiDriverService.initiateHandoff(activeDriverId, selectedDriverId, handoffNotes);
    setSelectedDriverId('');
    setHandoffNotes('');
  };

  // Handle handoff response (accept/reject)
  const handleHandoffResponse = (handoffId: string, status: 'confirmed' | 'cancelled') => {
    multiDriverService.respondToHandoff(handoffId, status);
  };

  // Handle handoff completion
  const handleCompleteHandoff = (handoffId: string) => {
    multiDriverService.respondToHandoff(handoffId, 'completed');
  };

  // Check if the active driver is involved in a handoff
  const isInvolvedInHandoff = (handoff: HandoffRequest): boolean => {
    return handoff.fromDriverId === activeDriverId || handoff.toDriverId === activeDriverId;
  };

  // Check if the active driver can respond to a handoff
  const canRespondToHandoff = (handoff: HandoffRequest): boolean => {
    return handoff.toDriverId === activeDriverId && handoff.status === 'pending';
  };

  // Check if the active driver can complete a handoff
  const canCompleteHandoff = (handoff: HandoffRequest): boolean => {
    return handoff.fromDriverId === activeDriverId && handoff.status === 'confirmed';
  };

  return (
    <div className="handoff-manager">
      {/* Handoff Request Form */}
      <div className="handoff-form">
        <h3>Request Driver Handoff</h3>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">From Driver</label>
            <input 
              type="text" 
              className="handoff-select" 
              value={activeDriver?.name || 'Select a driver'} 
              disabled 
            />
          </div>
          <div className="form-group">
            <label className="form-label">To Driver</label>
            <select 
              className="handoff-select" 
              value={selectedDriverId} 
              onChange={handleDriverSelect}
            >
              <option value="">Select a driver</option>
              {drivers
                .filter(driver => driver.id !== activeDriverId)
                .map(driver => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name}
                  </option>
                ))
              }
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group full-width">
            <label className="form-label">Notes</label>
            <textarea 
              className="handoff-message" 
              value={handoffNotes} 
              onChange={handleNotesChange}
              placeholder="Add notes for the receiving driver..."
            />
          </div>
        </div>
        <button 
          className="handoff-button" 
          onClick={handleHandoffRequest}
          disabled={!selectedDriverId}
        >
          Request Handoff
        </button>
      </div>
      
      {/* Active Handoffs List */}
      <div className="handoff-list">
        <h3>Active Handoffs</h3>
        {pendingHandoffs.length === 0 ? (
          <div className="no-handoffs">No active handoffs</div>
        ) : (
          pendingHandoffs
            .filter(isInvolvedInHandoff)
            .map(handoff => (
              <div key={handoff.id} className="handoff-item">
                <div className="handoff-header">
                  <div className="handoff-drivers">
                    {getDriverName(handoff.fromDriverId)} → {getDriverName(handoff.toDriverId)}
                  </div>
                  <div className={`handoff-status ${getStatusClass(handoff.status)}`}>
                    {handoff.status}
                  </div>
                </div>
                <div className="handoff-time">
                  {formatTime(handoff.timestamp)}
                </div>
                <div className="handoff-notes">
                  {handoff.notes}
                </div>
                {canRespondToHandoff(handoff) && (
                  <div className="handoff-actions">
                    <button
                      className="action-button accept-button"
                      onClick={() => handleHandoffResponse(handoff.id, 'confirmed')}
                    >
                      Accept
                    </button>
                    <button
                      className="action-button reject-button"
                      onClick={() => handleHandoffResponse(handoff.id, 'cancelled')}
                    >
                      Reject
                    </button>
                  </div>
                )}
                {canCompleteHandoff(handoff) && (
                  <div className="handoff-actions">
                    <button
                      className="action-button complete-button"
                      onClick={() => handleCompleteHandoff(handoff.id)}
                    >
                      Complete Handoff
                    </button>
                  </div>
                )}
              </div>
            ))
        )}
      </div>
    </div>
  );
};

export default HandoffManager;
