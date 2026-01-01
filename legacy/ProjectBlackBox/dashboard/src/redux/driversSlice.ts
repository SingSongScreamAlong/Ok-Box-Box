import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';

export interface Driver {
  id: string;
  name: string;
  status: 'active' | 'standby' | 'offline';
  role: 'primary' | 'secondary' | 'reserve';
  team: string;
  joinedAt: string;
  lastActive?: string;
  telemetryEnabled: boolean;
  profileData?: {
    consistency: number;
    aggression: number;
    fuelEfficiency: number;
    tireManagement: number;
    wetPerformance: number;
  };
}

export interface HandoffRequest {
  id: string;
  fromDriverId: string;
  toDriverId: string;
  requestedAt: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  message?: string;
  notes?: string;
}

export interface TeamMessage {
  id: string;
  senderId: string;
  senderName: string;
  recipientId?: string;
  recipientName?: string;
  content: string;
  sentAt: string;
  priority: 'normal' | 'high';
  read: boolean;
}

export interface DriverComparison {
  driverId1: string;
  driverId2: string;
  metrics: {
    lapTime: {
      driver1: number;
      driver2: number;
    };
    sectors: {
      sector1: { driver1: number; driver2: number };
      sector2: { driver1: number; driver2: number };
      sector3: { driver1: number; driver2: number };
    };
    fuelUsage: {
      driver1: number;
      driver2: number;
    };
    tireWear: {
      driver1: { fl: number; fr: number; rl: number; rr: number };
      driver2: { fl: number; fr: number; rl: number; rr: number };
    };
  };
}

interface DriversState {
  drivers: Driver[];
  activeDriverId: string | null;
  pendingHandoffs: HandoffRequest[];
  teamMessages: TeamMessage[];
  driverComparisons: DriverComparison[];
  loading: boolean;
  error: string | null;
}

const initialState: DriversState = {
  drivers: [],
  activeDriverId: null,
  pendingHandoffs: [],
  teamMessages: [],
  driverComparisons: [],
  loading: false,
  error: null
};

const driversSlice = createSlice({
  name: 'drivers',
  initialState,
  reducers: {
    // Driver management
    addDriver: (state, action: PayloadAction<Omit<Driver, 'id' | 'joinedAt'>>) => {
      const newDriver: Driver = {
        ...action.payload,
        id: uuidv4(),
        joinedAt: new Date().toISOString(),
      };
      state.drivers.push(newDriver);
      
      // If this is the first driver, set as active
      if (state.drivers.length === 1) {
        state.activeDriverId = newDriver.id;
      }
    },
    
    updateDriver: (state, action: PayloadAction<Partial<Driver> & { id: string }>) => {
      const index = state.drivers.findIndex(driver => driver.id === action.payload.id);
      if (index !== -1) {
        state.drivers[index] = {
          ...state.drivers[index],
          ...action.payload,
          lastActive: new Date().toISOString()
        };
      }
    },
    
    removeDriver: (state, action: PayloadAction<string>) => {
      state.drivers = state.drivers.filter(driver => driver.id !== action.payload);
      
      // If active driver is removed, set another driver as active if available
      if (state.activeDriverId === action.payload && state.drivers.length > 0) {
        state.activeDriverId = state.drivers[0].id;
      } else if (state.drivers.length === 0) {
        state.activeDriverId = null;
      }
    },
    
    setActiveDriver: (state, action: PayloadAction<string>) => {
      const driverExists = state.drivers.some(driver => driver.id === action.payload);
      if (driverExists) {
        state.activeDriverId = action.payload;
      }
    },
    
    // Handoff management
    requestHandoff: (state, action: PayloadAction<Omit<HandoffRequest, 'id' | 'requestedAt' | 'status'>>) => {
      const newHandoff: HandoffRequest = {
        ...action.payload,
        id: uuidv4(),
        requestedAt: new Date().toISOString(),
        status: 'pending'
      };
      state.pendingHandoffs.push(newHandoff);
    },
    
    updateHandoffStatus: (state, action: PayloadAction<{ id: string; status: HandoffRequest['status'] }>) => {
      const index = state.pendingHandoffs.findIndex(handoff => handoff.id === action.payload.id);
      if (index !== -1) {
        state.pendingHandoffs[index].status = action.payload.status;
        
        // If handoff is accepted, update active driver
        if (action.payload.status === 'accepted') {
          const handoff = state.pendingHandoffs[index];
          state.activeDriverId = handoff.toDriverId;
          
          // Update driver statuses
          const fromDriverIndex = state.drivers.findIndex(driver => driver.id === handoff.fromDriverId);
          const toDriverIndex = state.drivers.findIndex(driver => driver.id === handoff.toDriverId);
          
          if (fromDriverIndex !== -1) {
            state.drivers[fromDriverIndex].status = 'standby';
          }
          
          if (toDriverIndex !== -1) {
            state.drivers[toDriverIndex].status = 'active';
          }
        }
      }
    },
    
    // Team messaging
    sendTeamMessage: (state, action: PayloadAction<Omit<TeamMessage, 'id' | 'sentAt' | 'read'>>) => {
      const newMessage: TeamMessage = {
        ...action.payload,
        id: uuidv4(),
        sentAt: new Date().toISOString(),
        read: false
      };
      state.teamMessages.push(newMessage);
    },
    
    markMessageAsRead: (state, action: PayloadAction<string>) => {
      const index = state.teamMessages.findIndex(message => message.id === action.payload);
      if (index !== -1) {
        state.teamMessages[index].read = true;
      }
    },
    
    markAllMessagesAsRead: (state) => {
      state.teamMessages = state.teamMessages.map(message => ({
        ...message,
        read: true
      }));
    },
    
    // Driver comparison
    addDriverComparison: (state, action: PayloadAction<DriverComparison>) => {
      // Check if comparison already exists (in either direction)
      const existingIndex = state.driverComparisons.findIndex(
        comp => (comp.driverId1 === action.payload.driverId1 && comp.driverId2 === action.payload.driverId2) ||
               (comp.driverId1 === action.payload.driverId2 && comp.driverId2 === action.payload.driverId1)
      );
      
      if (existingIndex !== -1) {
        state.driverComparisons[existingIndex] = action.payload;
      } else {
        state.driverComparisons.push(action.payload);
      }
    },
    
    removeDriverComparison: (state, action: PayloadAction<{ driverId1: string; driverId2: string }>) => {
      state.driverComparisons = state.driverComparisons.filter(
        comp => !((comp.driverId1 === action.payload.driverId1 && comp.driverId2 === action.payload.driverId2) ||
                (comp.driverId1 === action.payload.driverId2 && comp.driverId2 === action.payload.driverId1))
      );
    },
    
    // Error handling
    setDriversError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    
    clearDriversError: (state) => {
      state.error = null;
    }
  }
});

export const { 
  addDriver, 
  updateDriver, 
  removeDriver, 
  setActiveDriver,
  requestHandoff,
  updateHandoffStatus,
  sendTeamMessage,
  markMessageAsRead,
  markAllMessagesAsRead,
  addDriverComparison,
  removeDriverComparison,
  setDriversError,
  clearDriversError
} = driversSlice.actions;

export default driversSlice.reducer;
