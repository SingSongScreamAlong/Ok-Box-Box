import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../redux/store';
import { addHandoffRequest, updateHandoffStatus, HandoffRequest } from '../../redux/slices/driversSlice';
import DriverManager from '../../services/DriverManager';
import { DriverProfile } from '../../services/WebSocketService';
import './HandoffManager.css';
import { v4 as uuidv4 } from 'uuid';

interface HandoffManagerProps {
  onClose?: () => void;
  compact?: boolean;
}

const HandoffManager: React.FC<HandoffManagerProps> = ({ 
  onClose,
  compact = false 
}) => {
  const dispatch = useDispatch();
  const { drivers, activeDriverId, pendingHandoffs } = useSelector((state: RootState) => state.drivers);
  const [toDriverId, setToDriverId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const driverManager = DriverManager.getInstance();

  // Reset form when active driver changes
  useEffect(() => {
    setToDriverId('');
    setNotes('');
    setError(null);
    setSuccess(null);
  }, [activeDriverId]);

  const handleRequestHandoff = () => {
    if (!activeDriverId) {
      setError('No active driver selected');
      return;
    }

    if (!toDriverId) {
      setError('Please select a driver to hand off to');
      return;
    }

    if (activeDriverId === toDriverId) {
      setError('Cannot hand off to the same driver');
      return;
    }

    try {
      const handoffRequest: HandoffRequest = {
        id: uuidv4(),
        fromDriverId: activeDriverId,
        toDriverId,
        notes,
        timestamp: Date.now(),
        status: 'pending'
      };

      // Add to Redux store
      dispatch(addHandoffRequest(handoffRequest));
      
      // Send via DriverManager
      driverManager.requestHandoff(handoffRequest);
      
      setSuccess('Handoff request sent successfully');
      setNotes('');
      setToDriverId('');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError('Failed to request handoff: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleAcceptHandoff = (handoffId: string) => {
    try {
      // Find the handoff request
      const handoff = pendingHandoffs.find(h => h.id === handoffId);
      if (!handoff) {
        setError('Handoff request not found');
        return;
      }

      // Update status in Redux
      dispatch(updateHandoffStatus({ id: handoffId, status: 'confirmed' }));
      
      // Process via DriverManager
      driverManager.acceptHandoff(handoffId);
      
      setSuccess('Handoff accepted');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError('Failed to accept handoff: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleRejectHandoff = (handoffId: string) => {
    try {
      // Update status in Redux
      dispatch(updateHandoffStatus({ id: handoffId, status: 'cancelled' }));
      
      // Process via DriverManager
      driverManager.rejectHandoff(handoffId);
      
      setSuccess('Handoff rejected');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError('Failed to reject handoff: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const getDriverName = (driverId: string): string => {
    const driver = drivers.find(d => d.id === driverId);
    return driver ? driver.name : 'Unknown Driver';
  };

  const renderDriverSelect = () => {
    const availableDrivers = drivers.filter(driver => 
      driver.id !== activeDriverId && driver.status !== 'offline'
    );

    return (
      <select 
        className="driver-select"
        value={toDriverId}
        onChange={(e) => setToDriverId(e.target.value)}
      >
        <option value="">Select Driver</option>
        {availableDrivers.map(driver => (
          <option key={driver.id} value={driver.id}>
            {driver.name} ({driver.team})
          </option>
        ))}
      </select>
    );
  };

  const renderIncomingHandoffs = () => {
    const incomingHandoffs = pendingHandoffs.filter(
      handoff => handoff.toDriverId === activeDriverId && handoff.status === 'pending'
    );

    if (incomingHandoffs.length === 0) {
      return null;
    }

    return (
      <div className="handoff-section">
        <h4>Incoming Handoff Requests</h4>
        <div className="handoff-list">
          {incomingHandoffs.map(handoff => (
            <div key={handoff.id} className="handoff-item incoming">
              <div className="handoff-info">
                <div className="handoff-from">
                  From: <span>{getDriverName(handoff.fromDriverId)}</span>
                </div>
                {handoff.notes && (
                  <div className="handoff-notes">{handoff.notes}</div>
                )}
                <div className="handoff-time">
                  {new Date(handoff.timestamp).toLocaleTimeString()}
                </div>
              </div>
              <div className="handoff-actions">
                <button 
                  className="accept-button"
                  onClick={() => handleAcceptHandoff(handoff.id)}
                >
                  Accept
                </button>
                <button 
                  className="reject-button"
                  onClick={() => handleRejectHandoff(handoff.id)}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderOutgoingHandoffs = () => {
    const outgoingHandoffs = pendingHandoffs.filter(
      handoff => handoff.fromDriverId === activeDriverId && handoff.status === 'pending'
    );

    if (outgoingHandoffs.length === 0) {
      return null;
    }

    return (
      <div className="handoff-section">
        <h4>Outgoing Handoff Requests</h4>
        <div className="handoff-list">
          {outgoingHandoffs.map(handoff => (
            <div key={handoff.id} className="handoff-item outgoing">
              <div className="handoff-info">
                <div className="handoff-to">
                  To: <span>{getDriverName(handoff.toDriverId)}</span>
                </div>
                {handoff.notes && (
                  <div className="handoff-notes">{handoff.notes}</div>
                )}
                <div className="handoff-time">
                  {new Date(handoff.timestamp).toLocaleTimeString()}
                </div>
              </div>
              <div className="handoff-status pending">Pending</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (compact) {
    return (
      <div className="handoff-manager compact">
        {renderIncomingHandoffs()}
      </div>
    );
  }

  return (
    <div className="handoff-manager">
      <div className="handoff-header">
        <h3>Driver Handoff</h3>
        {onClose && (
          <button className="close-button" onClick={onClose}>×</button>
        )}
      </div>

      {activeDriverId ? (
        <div className="handoff-content">
          <div className="request-handoff">
            <h4>Request Handoff</h4>
            <div className="form-group">
              <label>Current Driver</label>
              <div className="current-driver">{getDriverName(activeDriverId)}</div>
            </div>
            <div className="form-group">
              <label>Hand Off To</label>
              {renderDriverSelect()}
            </div>
            <div className="form-group">
              <label>Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes for the next driver..."
              />
            </div>
            <button 
              className="request-button"
              onClick={handleRequestHandoff}
              disabled={!toDriverId}
            >
              Request Handoff
            </button>
          </div>

          {error && (
            <div className="error-message">{error}</div>
          )}

          {success && (
            <div className="success-message">{success}</div>
          )}

          {renderIncomingHandoffs()}
          {renderOutgoingHandoffs()}
        </div>
      ) : (
        <div className="no-active-driver">
          Please select an active driver to manage handoffs
        </div>
      )}
    </div>
  );
};

export default HandoffManager;
