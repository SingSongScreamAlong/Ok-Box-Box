import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DriverProfile } from '../../services/WebSocketService';
import { TeamMessage, TeamMessageUtils } from '../../types/TeamMessage';

export interface HandoffRequest {
  id: string;
  fromDriverId: string;
  toDriverId: string;
  notes: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
}

export interface DriverComparison {
  id: string;
  driverAId: string;
  driverBId: string;
  timestamp: number;
  metrics: Array<{
    name: string;
    driverA: {
      value: string | number;
      delta: number;
    };
    driverB: {
      value: string | number;
      delta: number;
    };
  }>;
}

interface DriversState {
  drivers: DriverProfile[];
  activeDriverId: string | null;
  pendingHandoffs: HandoffRequest[];
  teamMessages: TeamMessage[];
  activeComparisons: DriverComparison[];
  loading: boolean;
  error: string | null;
}

const initialState: DriversState = {
  drivers: [],
  activeDriverId: null,
  pendingHandoffs: [],
  teamMessages: [],
  activeComparisons: [],
  loading: false,
  error: null,
};

const driversSlice = createSlice({
  name: 'drivers',
  initialState,
  reducers: {
    // Driver list actions
    setDrivers: (state, action: PayloadAction<DriverProfile[]>) => {
      state.drivers = action.payload;
      state.loading = false;
      state.error = null;
    },
    
    // Active driver actions
    setActiveDriver: (state, action: PayloadAction<string>) => {
      state.activeDriverId = action.payload;
    },
    
    // Single driver update
    updateDriver: (state, action: PayloadAction<DriverProfile>) => {
      const index = state.drivers.findIndex(driver => driver.id === action.payload.id);
      if (index !== -1) {
        state.drivers[index] = action.payload;
      } else {
        state.drivers.push(action.payload);
      }
    },
    
    // Handoff actions
    requestHandoff: (state, action: PayloadAction<{ fromDriverId: string; toDriverId: string; notes: string }>) => {
      // This action is used to initiate a handoff request but doesn't modify state
      // The actual handoff request will be added via WebSocket event
      state.loading = true;
    },
    
    addHandoffRequest: (state, action: PayloadAction<HandoffRequest>) => {
      state.pendingHandoffs.push(action.payload);
      state.loading = false;
    },
    
    updateHandoffStatus: (state, action: PayloadAction<{ id: string; status: 'confirmed' | 'cancelled' | 'completed' }>) => {
      const index = state.pendingHandoffs.findIndex(handoff => handoff.id === action.payload.id);
      if (index !== -1) {
        state.pendingHandoffs[index].status = action.payload.status;
        
        // Remove completed or cancelled handoffs after updating status
        if (action.payload.status === 'completed' || action.payload.status === 'cancelled') {
          state.pendingHandoffs = state.pendingHandoffs.filter(handoff => handoff.id !== action.payload.id);
        }
      }
    },
    
    // Team message actions
    sendTeamMessage: (state, action: PayloadAction<{ content: string; senderId: string; senderName: string; priority?: 'normal' | 'high' | 'critical' }>) => {
      // This action is used to send a team message but doesn't modify state
      // The actual message will be added via WebSocket event
      state.loading = true;
    },
    
    addTeamMessage: (state, action: PayloadAction<TeamMessage>) => {
      state.teamMessages.unshift(action.payload); // Add to the beginning for newest first
      state.loading = false;
    },
    
    markMessageRead: (state, action: PayloadAction<string>) => {
      const index = state.teamMessages.findIndex(message => message.id === action.payload);
      if (index !== -1) {
        state.teamMessages[index].read = true;
      }
    },
    
    markAllMessagesRead: (state) => {
      state.teamMessages.forEach(message => {
        message.read = true;
      });
    },
    
    // Comparison actions
    addComparison: (state, action: PayloadAction<DriverComparison>) => {
      state.activeComparisons.push(action.payload);
    },
    
    updateComparison: (state, action: PayloadAction<DriverComparison>) => {
      const index = state.activeComparisons.findIndex(comparison => comparison.id === action.payload.id);
      if (index !== -1) {
        state.activeComparisons[index] = action.payload;
      } else {
        state.activeComparisons.push(action.payload);
      }
    },
    
    removeComparison: (state, action: PayloadAction<string>) => {
      state.activeComparisons = state.activeComparisons.filter(comparison => comparison.id !== action.payload);
    },
    
    // Loading state actions
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    // Error state actions
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    
    // Reset state
    resetDriversState: () => initialState,
  },
});

export const {
  setDrivers,
  setActiveDriver,
  updateDriver,
  requestHandoff,
  addHandoffRequest,
  updateHandoffStatus,
  sendTeamMessage,
  addTeamMessage,
  markMessageRead,
  markAllMessagesRead,
  addComparison,
  updateComparison,
  removeComparison,
  setLoading,
  setError,
  resetDriversState,
} = driversSlice.actions;

export default driversSlice.reducer;
