import React, { useState, useEffect, useCallback } from 'react';
import './NotificationSystem.css';

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'critical' | 'success';
  title: string;
  message: string;
  timestamp: number;
  duration?: number; // ms, 0 = persistent
  icon?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationSystemProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

export const NotificationSystem: React.FC<NotificationSystemProps> = ({ 
  notifications, 
  onDismiss 
}) => {
  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <NotificationItem 
          key={notification.id} 
          notification={notification} 
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
};

const NotificationItem: React.FC<{ 
  notification: Notification; 
  onDismiss: (id: string) => void;
}> = ({ notification, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, notification.duration);
      return () => clearTimeout(timer);
    }
  }, [notification.duration, notification.id]);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onDismiss(notification.id), 300);
  }, [notification.id, onDismiss]);

  const getIcon = () => {
    if (notification.icon) return notification.icon;
    switch (notification.type) {
      case 'critical': return '🚨';
      case 'warning': return '⚠️';
      case 'success': return '✅';
      default: return 'ℹ️';
    }
  };

  return (
    <div className={`notification ${notification.type} ${isExiting ? 'exiting' : ''}`}>
      <div className="notification-icon">{getIcon()}</div>
      <div className="notification-content">
        <div className="notification-title">{notification.title}</div>
        <div className="notification-message">{notification.message}</div>
        {notification.action && (
          <button 
            className="notification-action"
            onClick={notification.action.onClick}
          >
            {notification.action.label}
          </button>
        )}
      </div>
      <button className="notification-close" onClick={handleDismiss}>×</button>
    </div>
  );
};

// Hook for managing notifications
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      duration: notification.duration ?? 5000, // Default 5 seconds
    };
    setNotifications(prev => [...prev, newNotification]);
    return newNotification.id;
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Predefined notification helpers
  const notifyPitWindow = useCallback((lapsRemaining: number) => {
    addNotification({
      type: 'warning',
      title: 'Pit Window Open',
      message: `Optimal pit window in ${lapsRemaining} laps. Prepare for pit stop.`,
      icon: '🏁',
      duration: 10000,
    });
  }, [addNotification]);

  const notifyWeatherChange = useCallback((condition: string, eta: number) => {
    addNotification({
      type: 'warning',
      title: 'Weather Alert',
      message: `${condition} expected in ${eta} minutes. Consider strategy change.`,
      icon: '🌧️',
      duration: 15000,
    });
  }, [addNotification]);

  const notifyIncident = useCallback((description: string) => {
    addNotification({
      type: 'critical',
      title: 'Incident Detected',
      message: description,
      icon: '⚠️',
      duration: 8000,
    });
  }, [addNotification]);

  const notifyPositionChange = useCallback((newPosition: number, direction: 'up' | 'down') => {
    addNotification({
      type: direction === 'up' ? 'success' : 'info',
      title: direction === 'up' ? 'Position Gained!' : 'Position Lost',
      message: `You are now P${newPosition}`,
      icon: direction === 'up' ? '🔼' : '🔽',
      duration: 4000,
    });
  }, [addNotification]);

  const notifyFuelWarning = useCallback((lapsRemaining: number) => {
    addNotification({
      type: 'critical',
      title: 'Low Fuel Warning',
      message: `Only ${lapsRemaining} laps of fuel remaining!`,
      icon: '⛽',
      duration: 0, // Persistent
    });
  }, [addNotification]);

  const notifyTireWarning = useCallback((tire: string, wear: number) => {
    addNotification({
      type: 'warning',
      title: 'Tire Wear Critical',
      message: `${tire} tire at ${wear}% wear. Consider pitting soon.`,
      icon: '🛞',
      duration: 10000,
    });
  }, [addNotification]);

  const notifyFastestLap = useCallback((lapTime: string) => {
    addNotification({
      type: 'success',
      title: 'Fastest Lap! 🏆',
      message: `New personal best: ${lapTime}`,
      icon: '⏱️',
      duration: 6000,
    });
  }, [addNotification]);

  return {
    notifications,
    addNotification,
    dismissNotification,
    clearAll,
    // Helpers
    notifyPitWindow,
    notifyWeatherChange,
    notifyIncident,
    notifyPositionChange,
    notifyFuelWarning,
    notifyTireWarning,
    notifyFastestLap,
  };
};

export default NotificationSystem;
