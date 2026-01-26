
import { useState, useEffect, useRef } from 'react';
import { NearbyCarData } from '../components/driver/DriverRadar';

/**
 * useNearbyCars - Provides nearby car data for the DriverRadar widget
 * 
 * In production, this would consume data from the relay (iRacing telemetry).
 * For demo/development, it simulates realistic racing scenarios.
 */

interface UseNearbyCarsConfig {
  /** Enable demo simulation mode */
  demoMode?: boolean;
  /** Maximum distance to track cars (meters) */
  maxDistance?: number;
  /** Update rate in ms */
  updateRate?: number;
}

interface UseNearbyCarsResult {
  nearbyCars: NearbyCarData[];
  isActive: boolean;
}

// Demo scenarios for simulation
type DemoScenario = 'clear' | 'side_by_side' | 'being_passed' | 'passing' | 'pack' | 'chaos';

const DEMO_SCENARIOS: DemoScenario[] = ['clear', 'side_by_side', 'being_passed', 'passing', 'pack', 'chaos'];

function generateDemoScenario(scenario: DemoScenario, time: number): NearbyCarData[] {
  const t = time / 1000; // Convert to seconds for smoother animation
  
  switch (scenario) {
    case 'clear':
      return [];
      
    case 'side_by_side':
      // Car alongside, slightly ahead
      return [{
        id: 'car1',
        relativeX: -3.5, // One lane to the left
        relativeY: 2 + Math.sin(t * 0.5) * 0.5, // Slight drift
        closureRate: 0.5,
        isUnstable: false
      }];
      
    case 'being_passed':
      // Car approaching from behind on the right
      return [{
        id: 'car1',
        relativeX: 3 + Math.sin(t) * 0.3,
        relativeY: -15 + t * 3, // Approaching
        closureRate: 8,
        isUnstable: false
      }];
      
    case 'passing':
      // We're passing a slower car
      return [{
        id: 'car1',
        relativeX: -2,
        relativeY: 10 - t * 2, // Moving backward relative to us
        closureRate: -5,
        isUnstable: false
      }];
      
    case 'pack':
      // Multiple cars around us
      return [
        { id: 'car1', relativeX: -3.5, relativeY: 5, closureRate: 1, isUnstable: false },
        { id: 'car2', relativeX: 3.5, relativeY: -3, closureRate: 2, isUnstable: false },
        { id: 'car3', relativeX: 0, relativeY: 20, closureRate: -1, isUnstable: false },
        { id: 'car4', relativeX: -3, relativeY: -8, closureRate: 3, isUnstable: false },
      ];
      
    case 'chaos':
      // Unstable cars, high closure rates
      return [
        { id: 'car1', relativeX: -2 + Math.sin(t * 3) * 1.5, relativeY: 8, closureRate: 12, isUnstable: true },
        { id: 'car2', relativeX: 4, relativeY: -5 + t * 2, closureRate: 10, isUnstable: false },
        { id: 'car3', relativeX: Math.sin(t * 2) * 3, relativeY: 3, closureRate: 5, isUnstable: true },
      ];
      
    default:
      return [];
  }
}

export function useNearbyCars({
  demoMode = true,
  maxDistance = 30,
  updateRate = 50
}: UseNearbyCarsConfig = {}): UseNearbyCarsResult {
  const [nearbyCars, setNearbyCars] = useState<NearbyCarData[]>([]);
  const [isActive, setIsActive] = useState(false);
  
  const scenarioRef = useRef<DemoScenario>('clear');
  const scenarioStartRef = useRef<number>(Date.now());
  const scenarioIndexRef = useRef<number>(0);
  
  useEffect(() => {
    if (!demoMode) {
      // In production, this would subscribe to relay data
      // For now, just return empty
      setNearbyCars([]);
      setIsActive(false);
      return;
    }
    
    setIsActive(true);
    
    // Cycle through demo scenarios
    const scenarioInterval = setInterval(() => {
      scenarioIndexRef.current = (scenarioIndexRef.current + 1) % DEMO_SCENARIOS.length;
      scenarioRef.current = DEMO_SCENARIOS[scenarioIndexRef.current];
      scenarioStartRef.current = Date.now();
    }, 8000); // Change scenario every 8 seconds
    
    // Update car positions
    const updateInterval = setInterval(() => {
      const elapsed = Date.now() - scenarioStartRef.current;
      const cars = generateDemoScenario(scenarioRef.current, elapsed);
      
      // Filter to max distance
      const filtered = cars.filter(car => {
        const dist = Math.sqrt(car.relativeX ** 2 + car.relativeY ** 2);
        return dist <= maxDistance;
      });
      
      setNearbyCars(filtered);
    }, updateRate);
    
    return () => {
      clearInterval(scenarioInterval);
      clearInterval(updateInterval);
    };
  }, [demoMode, maxDistance, updateRate]);
  
  return { nearbyCars, isActive };
}

export default useNearbyCars;
