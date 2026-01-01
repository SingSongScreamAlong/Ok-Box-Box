import { store } from '../redux/store';
import webSocketService, {
  DriverUpdateEvent,
  DriverListEvent,
  HandoffRequestEvent,
  HandoffResponseEvent,
  TeamMessageEvent,
  ComparisonResultEvent
} from './WebSocketService';
import {
  setDrivers,
  setActiveDriver,
  updateDriver,
  requestHandoff,
  updateHandoffStatus,
  sendTeamMessage,
  addTeamMessage,
  setLoading,
  setError,
  resetDriversState
} from '../redux/slices/driversSlice';
import { TeamMessage, TeamMessageUtils } from '../types/TeamMessage';

/**
 * MultiDriverService connects WebSocketService events to Redux actions
 * for multi-driver functionality
 */
class MultiDriverService {
  private initialized: boolean = false;

  /**
   * Initialize the service by setting up WebSocket event listeners
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    // Set up WebSocket event listeners for multi-driver events
    webSocketService.onDriverUpdate(this.handleDriverUpdate);
    webSocketService.onDriverList(this.handleDriverList);
    webSocketService.onHandoffRequest(this.handleHandoffRequest);
    webSocketService.onHandoffResponse(this.handleHandoffResponse);
    webSocketService.onTeamMessage(this.handleTeamMessage);
    webSocketService.onComparisonResult(this.handleComparisonResult);

    this.initialized = true;
    console.log('MultiDriverService initialized');
  }

  /**
   * Handle driver update events
   */
  private handleDriverUpdate = (event: DriverUpdateEvent): void => {
    const { driver } = event;
    
    // Check if driver exists in store
    const state = store.getState();
    const existingDriver = state.drivers.drivers.find(d => d.id === driver.id);
    
    if (existingDriver) {
      // Update existing driver
      const { id, status } = driver;
      store.dispatch(updateDriver({
        id,
        name: driver.name,
        team: existingDriver.team,
        role: existingDriver.role,
        status: status as 'active' | 'standby' | 'offline'
        // Other properties are handled by the specific fields above
      }));
    } else {
      // Add new driver - we'll update the drivers array instead of using addDriver
      const currentDrivers = [...state.drivers.drivers];
      currentDrivers.push({
        id: driver.id,
        name: driver.name,
        team: 'Default Team', // Default team
        role: 'primary', // Default role
        status: driver.status as 'active' | 'standby' | 'offline'
      });
      store.dispatch(setDrivers(currentDrivers));
    }
  };

  /**
   * Handle driver list events
   */
  private handleDriverList = (event: DriverListEvent): void => {
    const { drivers, activeDriverId } = event;
    
    // Create a new array of drivers with the correct interface
    const updatedDrivers = drivers.map(driver => {
      const { id, name, status, role, team } = driver;
      return {
        id,
        name,
        status: status as 'active' | 'standby' | 'offline',
        role: (role as 'primary' | 'secondary' | 'reserve') || 'primary',
        team: team || 'Default Team',
        joinedAt: driver.joinedAt || new Date().toISOString(), // Required by Driver interface as string
        telemetryEnabled: driver.telemetryEnabled !== undefined ? driver.telemetryEnabled : true // Required by Driver interface
      };
    });
    
    // Update all drivers at once
    store.dispatch(setDrivers(updatedDrivers));
    
    // Set active driver
    if (activeDriverId) {
      store.dispatch(setActiveDriver(activeDriverId));
    }
  };

  /**
   * Handle handoff request events
   */
  private handleHandoffRequest = (event: HandoffRequestEvent): void => {
    const { handoff } = event;
    
    store.dispatch(requestHandoff({
      fromDriverId: handoff.fromDriverId,
      toDriverId: handoff.toDriverId,
      notes: handoff.notes
    }));
  };

  /**
   * Handle handoff response events
   */
  private handleHandoffResponse = (event: HandoffResponseEvent): void => {
    const { handoffId, status } = event;
    
    // Use the status directly since it matches the expected values in the new interface
    store.dispatch(updateHandoffStatus({
      id: handoffId,
      status: status
    }));
  };

  /**
   * Handle team message events
   */
  private handleTeamMessage = (event: TeamMessageEvent): void => {
    const { message } = event;
    
    // Create a TeamMessage object using the unified interface
    const teamMessage: TeamMessage = {
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      senderName: message.senderName,
      priority: message.priority,
      read: false,
      timestamp: Date.now()
    };
    
    // Normalize the timestamp to ensure both formats are populated
    const normalizedMessage = TeamMessageUtils.normalizeTimestamp(teamMessage);
    
    store.dispatch(addTeamMessage(normalizedMessage));
  };

  /**
   * Handle comparison result events
   */
  private handleComparisonResult = (event: ComparisonResultEvent): void => {
    const { comparisonId, metrics } = event;
    
    // Extract driver IDs from the comparison ID (format: "driverId1-driverId2")
    const [driverAId, driverBId] = comparisonId.split('-');
    
    if (!driverAId || !driverBId) {
      console.error('Invalid comparison ID format:', comparisonId);
      return;
    }
    
    // Create a DriverComparison object that matches the interface in driversSlice.ts
    const comparison = {
      id: comparisonId,
      driverAId,
      driverBId,
      timestamp: Date.now(),
      metrics: metrics.map(metric => ({
        name: metric.name,
        driverA: {
          value: metric.driverA.value,
          delta: metric.driverA.delta
        },
        driverB: {
          value: metric.driverB.value,
          delta: metric.driverB.delta
        }
      }))
    };
    
    // Dispatch the comparison to the store
    store.dispatch({
      type: 'drivers/addComparison',
      payload: comparison
    });
  };

  /**
   * Send a team message
   */
  sendTeamMessage(content: string, senderId: string, senderName: string, priority: 'normal' | 'high' | 'critical' = 'normal'): boolean {
    try {
      // Convert priority to the format expected by WebSocketService
      const wsMessagePriority: 'normal' | 'critical' = priority === 'normal' ? 'normal' : 'critical';
      
      // Send the message via WebSocket
      // WebSocketService.sendTeamMessage parameter order: (content, priority, senderId, senderName)
      webSocketService.sendTeamMessage(
        content,
        wsMessagePriority,
        senderId,
        senderName
      );
      
      // Create a TeamMessage object using the unified interface
      const teamMessage: TeamMessage = {
        id: `msg-${Date.now()}`,
        senderId,
        senderName,
        content,
        priority,
        read: false,
        timestamp: Date.now()
      };
      
      // Normalize the timestamp to ensure both formats are populated
      const normalizedMessage = TeamMessageUtils.normalizeTimestamp(teamMessage);
      
      // Dispatch the action to update Redux
      store.dispatch(sendTeamMessage(normalizedMessage));
      
      return true;
    } catch (error: any) {
      console.error('Error sending team message:', error);
      store.dispatch(setError(`Failed to send team message: ${error.message || 'Unknown error'}`));
      return false;
    }
  }

  /**
   * Request a driver comparison
   */
  requestDriverComparison(driverAId: string, driverBId: string): string | null {
    try {
      // Validate driver IDs
      if (!driverAId || !driverBId) {
        console.error('Invalid driver IDs for comparison:', { driverAId, driverBId });
        store.dispatch(setError('Invalid driver IDs for comparison'));
        return null;
      }
      
      // Generate a comparison ID
      const comparisonId = `${driverAId}-${driverBId}`;
      
      // Send the request via WebSocket
      webSocketService.requestDriverComparison(driverAId, driverBId);
      
      return comparisonId;
    } catch (error: any) {
      console.error('Error requesting driver comparison:', error);
      store.dispatch(setError(`Failed to request driver comparison: ${error.message || 'Unknown error'}`));
      return null;
    }
  }

  /**
   * Initiate a driver handoff
   */
  initiateHandoff(fromDriverId: string, toDriverId: string, notes: string): string | null {
    try {
      // Validate driver IDs
      if (!fromDriverId || !toDriverId) {
        console.error('Invalid driver IDs for handoff:', { fromDriverId, toDriverId });
        store.dispatch(setError('Invalid driver IDs for handoff'));
        return null;
      }
      
      // Generate a handoff ID
      const handoffId = `handoff-${Date.now()}`;
      
      // Dispatch the handoff request action
      store.dispatch(requestHandoff({
        fromDriverId,
        toDriverId,
        notes
      }));
      
      // Send the request via WebSocket
      webSocketService.requestHandoff(fromDriverId, toDriverId, notes);
      
      return handoffId;
    } catch (error: any) {
      console.error('Error initiating handoff:', error);
      store.dispatch(setError(`Failed to initiate handoff: ${error.message || 'Unknown error'}`));
      return null;
    }
  }

  /**
   * Respond to a handoff request
   */
  respondToHandoff(handoffId: string, status: 'confirmed' | 'cancelled' | 'completed'): boolean {
    try {
      // Validate handoff ID
      if (!handoffId) {
        console.error('Invalid handoff ID for response:', handoffId);
        store.dispatch(setError('Invalid handoff ID for response'));
        return false;
      }
      
      webSocketService.respondToHandoff(handoffId, status);
      return true;
    } catch (error: any) {
      console.error('Error responding to handoff:', error);
      store.dispatch(setError(`Failed to respond to handoff: ${error.message || 'Unknown error'}`));
      return false;
    }
  }

  /**
   * Switch the active driver
   */
  switchDriver(driverId: string): boolean {
    try {
      // Validate driver ID
      if (!driverId) {
        console.error('Invalid driver ID for switch:', driverId);
        store.dispatch(setError('Invalid driver ID for switch'));
        return false;
      }
      
      webSocketService.switchDriver(driverId);
      return true;
    } catch (error: any) {
      console.error('Error switching driver:', error);
      store.dispatch(setError(`Failed to switch driver: ${error.message || 'Unknown error'}`));
      return false;
    }
  }
  
  /**
   * Handle connection status changes
   */
  handleConnectionStatusChange(isConnected: boolean, errorMessage?: string): void {
    if (isConnected) {
      store.dispatch(setError(null as any)); // Clear any previous connection errors
    } else if (errorMessage) {
      store.dispatch(setError(errorMessage));
    }
  }
}

// Create and export singleton instance
export const multiDriverService = new MultiDriverService();
export default multiDriverService;
