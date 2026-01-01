import { store } from '../redux/store';
import { addDriver, setActiveDriver, sendTeamMessage, addDriverComparison } from '../redux/driversSlice';

/**
 * Initialize mock driver data for development and testing
 */
export const initializeMockDriverData = () => {
  console.log('Initializing mock driver data for development...');
  
  // Add mock drivers
  const drivers = [
    {
      name: 'John Smith',
      status: 'active' as const,
      role: 'primary' as const,
      team: 'Team Alpha',
      telemetryEnabled: true,
      profileData: {
        consistency: 85,
        aggression: 70,
        fuelEfficiency: 80,
        tireManagement: 75,
        wetPerformance: 65
      }
    },
    {
      name: 'Sarah Johnson',
      status: 'standby' as const,
      role: 'secondary' as const,
      team: 'Team Alpha',
      telemetryEnabled: true,
      profileData: {
        consistency: 90,
        aggression: 60,
        fuelEfficiency: 85,
        tireManagement: 90,
        wetPerformance: 75
      }
    },
    {
      name: 'Michael Chen',
      status: 'standby' as const,
      role: 'reserve' as const,
      team: 'Team Beta',
      telemetryEnabled: true,
      profileData: {
        consistency: 75,
        aggression: 85,
        fuelEfficiency: 70,
        tireManagement: 65,
        wetPerformance: 80
      }
    }
  ];
  
  // Add drivers to store
  drivers.forEach(driver => {
    store.dispatch(addDriver(driver));
  });
  
  // Get the added drivers with their generated IDs
  const state = store.getState();
  const storeDrivers = state.drivers.drivers;
  
  // Set the first driver as active
  if (storeDrivers.length > 0) {
    store.dispatch(setActiveDriver(storeDrivers[0].id));
  }
  
  // Add mock team messages
  if (storeDrivers.length >= 2) {
    const mockMessages = [
      {
        senderId: storeDrivers[0].id,
        senderName: storeDrivers[0].name,
        content: 'Starting my stint now. Track conditions are good.',
        priority: 'normal' as const
      },
      {
        senderId: storeDrivers[1].id,
        senderName: storeDrivers[1].name,
        content: 'I noticed the car was understeering in sector 2.',
        priority: 'normal' as const
      },
      {
        senderId: storeDrivers[0].id,
        senderName: storeDrivers[0].name,
        content: 'Fuel consumption is higher than expected. We might need to adjust strategy.',
        priority: 'high' as const
      }
    ];
    
    mockMessages.forEach(message => {
      store.dispatch(sendTeamMessage(message));
    });
  }
  
  // Add mock driver comparison data
  if (storeDrivers.length >= 2) {
    const mockComparison = {
      driverId1: storeDrivers[0].id,
      driverId2: storeDrivers[1].id,
      metrics: {
        lapTime: {
          driver1: 92.456,
          driver2: 93.123
        },
        sectors: {
          sector1: { driver1: 28.123, driver2: 28.456 },
          sector2: { driver1: 32.456, driver2: 32.123 },
          sector3: { driver1: 31.877, driver2: 32.544 }
        },
        fuelUsage: {
          driver1: 2.8,
          driver2: 2.5
        },
        tireWear: {
          driver1: { fl: 12.5, fr: 13.2, rl: 11.8, rr: 12.1 },
          driver2: { fl: 10.8, fr: 11.5, rl: 10.2, rr: 10.5 }
        }
      }
    };
    
    store.dispatch(addDriverComparison(mockComparison));
  }
  
  console.log('Mock driver data initialized!');
};

export default initializeMockDriverData;
