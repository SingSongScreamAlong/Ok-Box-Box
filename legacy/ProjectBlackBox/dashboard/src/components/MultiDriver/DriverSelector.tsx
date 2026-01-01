import React from 'react';
import { DriverProfile as Driver } from '../../services/WebSocketService';
import multiDriverService from '../../services/MultiDriverService';

interface DriverSelectorProps {
  drivers: Driver[];
  activeDriverId: string | null;
  onDriverSelect: (driverId: string) => void;
}

/**
 * DriverSelector component for displaying and selecting drivers
 */
const DriverSelector: React.FC<DriverSelectorProps> = ({ 
  drivers, 
  activeDriverId,
  onDriverSelect 
}) => {
  // Handle driver selection and switch active driver
  const handleDriverClick = (driverId: string) => {
    onDriverSelect(driverId);
    multiDriverService.switchDriver(driverId);
  };

  // Get first letter of driver name for avatar
  const getDriverInitial = (name: string): string => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  // Get status class based on driver status
  const getStatusClass = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'status-active';
      case 'inactive':
        return 'status-inactive';
      case 'standby':
        return 'status-standby';
      default:
        return '';
    }
  };

  return (
    <div className="driver-selector">
      {drivers.length === 0 ? (
        <div className="no-drivers-message">No drivers connected</div>
      ) : (
        drivers.map(driver => (
          <div
            key={driver.id}
            className={`driver-card ${driver.id === activeDriverId ? 'active' : ''}`}
            onClick={() => handleDriverClick(driver.id)}
          >
            <div className="driver-avatar">
              {getDriverInitial(driver.name)}
            </div>
            <div className="driver-info">
              <div className="driver-name">{driver.name}</div>
              <div className="driver-role">{driver.role}</div>
            </div>
            <div className={`driver-status ${getStatusClass(driver.status)}`}>
              {driver.status}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default DriverSelector;
