import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import DriverManager from '../../services/DriverManager';
import { DriverProfile } from '../../services/WebSocketService';
import './DriverSelector.css';

interface DriverSelectorProps {
  onDriverSelect?: (driverId: string) => void;
  compact?: boolean;
}

const DriverSelector: React.FC<DriverSelectorProps> = ({ 
  onDriverSelect,
  compact = false 
}) => {
  const dispatch = useDispatch();
  const { drivers, activeDriverId } = useSelector((state: RootState) => state.drivers);
  const [isOpen, setIsOpen] = useState(false);
  const driverManager = DriverManager.getInstance();

  useEffect(() => {
    // This effect will run when the component mounts
    // If we have drivers but no active driver, set the first driver as active
    if (drivers.length > 0 && !activeDriverId) {
      handleDriverSelect(drivers[0].id);
    }
  }, [drivers, activeDriverId]);

  const handleDriverSelect = (driverId: string) => {
    if (driverId !== activeDriverId) {
      driverManager.switchDriver(driverId);
      if (onDriverSelect) {
        onDriverSelect(driverId);
      }
    }
    setIsOpen(false);
  };

  const getActiveDriver = (): DriverProfile | undefined => {
    return drivers.find(driver => driver.id === activeDriverId);
  };

  const renderDriverStatus = (status: string) => {
    const statusClass = `driver-status ${status.toLowerCase()}`;
    return <span className={statusClass}>{status}</span>;
  };

  const renderDriverItem = (driver: DriverProfile) => {
    const isActive = driver.id === activeDriverId;
    const driverItemClass = `driver-item ${isActive ? 'active' : ''}`;
    
    return (
      <div 
        key={driver.id} 
        className={driverItemClass}
        onClick={() => handleDriverSelect(driver.id)}
      >
        {driver.avatar && (
          <div className="driver-avatar">
            <img src={driver.avatar} alt={driver.name} />
          </div>
        )}
        <div className="driver-info">
          <div className="driver-name">{driver.name}</div>
          <div className="driver-details">
            <span className="driver-team">{driver.team}</span>
            <span className="driver-role">{driver.role}</span>
            {renderDriverStatus(driver.status)}
          </div>
        </div>
      </div>
    );
  };

  const activeDriver = getActiveDriver();

  if (compact) {
    return (
      <div className="driver-selector compact">
        <div className="selected-driver" onClick={() => setIsOpen(!isOpen)}>
          {activeDriver ? (
            <>
              {activeDriver.avatar && (
                <div className="driver-avatar small">
                  <img src={activeDriver.avatar} alt={activeDriver.name} />
                </div>
              )}
              <span className="driver-name">{activeDriver.name}</span>
              {renderDriverStatus(activeDriver.status)}
            </>
          ) : (
            <span className="no-driver">No Driver</span>
          )}
          <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
        </div>
        
        {isOpen && (
          <div className="driver-dropdown">
            {drivers.map(driver => renderDriverItem(driver))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="driver-selector">
      <h3>Drivers</h3>
      <div className="driver-list">
        {drivers.length > 0 ? (
          drivers.map(driver => renderDriverItem(driver))
        ) : (
          <div className="no-drivers">No drivers available</div>
        )}
      </div>
    </div>
  );
};

export default DriverSelector;
