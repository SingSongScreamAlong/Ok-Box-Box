import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Eye, AlertTriangle, ChevronUp, ChevronDown, Car, 
  Volume2, VolumeX, Radio, Shield
} from 'lucide-react';
import { useRelay, CarMapPosition } from '../hooks/useRelay';

// Spotter callout types
type CalloutType = 
  | 'clear' 
  | 'car_left' 
  | 'car_right' 
  | 'cars_both' 
  | 'closing_fast'
  | 'gap_ahead'
  | 'gap_behind'
  | 'position_gained'
  | 'position_lost'
  | 'pit_window'
  | 'yellow_flag'
  | 'green_flag'
  | 'white_flag'
  | 'checkered';

interface SpotterCallout {
  id: string;
  type: CalloutType;
  message: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  timestamp: Date;
  audioPlayed: boolean;
}

interface ProximityData {
  carLeft: boolean;
  carRight: boolean;
  carAhead: { distance: number; closing: boolean } | null;
  carBehind: { distance: number; closing: boolean } | null;
  nearestCar: CarMapPosition | null;
}

interface LiveSpotterProps {
  compact?: boolean;
  showHistory?: boolean;
  audioEnabled?: boolean;
  onCallout?: (callout: SpotterCallout) => void;
}

// Proximity thresholds (in track percentage, ~1% = ~50m on a 5km track)
const PROXIMITY_THRESHOLD = 0.02; // ~100m
const CLOSE_THRESHOLD = 0.01; // ~50m
const DANGER_THRESHOLD = 0.005; // ~25m

// Callout messages
const CALLOUT_MESSAGES: Record<CalloutType, string[]> = {
  clear: ['Clear all around', 'You\'re clear', 'All clear'],
  car_left: ['Car left', 'Inside', 'Left side'],
  car_right: ['Car right', 'Outside', 'Right side'],
  cars_both: ['Cars both sides', 'Squeeze', 'Hold your line'],
  closing_fast: ['Closing fast', 'Car coming', 'Watch behind'],
  gap_ahead: ['Gap ahead {gap}', '{gap} to car ahead'],
  gap_behind: ['Gap behind {gap}', '{gap} behind'],
  position_gained: ['Position! P{pos}', 'Up one, P{pos}', 'Nice move, P{pos}'],
  position_lost: ['Lost position, P{pos}', 'Down one, P{pos}'],
  pit_window: ['Pit window open', 'Box this lap', 'Pit now'],
  yellow_flag: ['Yellow flag', 'Caution', 'Yellow yellow yellow'],
  green_flag: ['Green flag', 'Go go go', 'Green'],
  white_flag: ['White flag', 'Last lap', 'One to go'],
  checkered: ['Checkered flag', 'That\'s it', 'Race over'],
};

const getRandomMessage = (type: CalloutType, data?: Record<string, string>): string => {
  const messages = CALLOUT_MESSAGES[type];
  let message = messages[Math.floor(Math.random() * messages.length)];
  if (data) {
    Object.entries(data).forEach(([key, value]) => {
      message = message.replace(`{${key}}`, value);
    });
  }
  return message;
};

const getPriorityColor = (priority: SpotterCallout['priority']): string => {
  switch (priority) {
    case 'critical': return 'bg-red-500/20 border-red-500/50 text-red-400';
    case 'high': return 'bg-orange-500/20 border-orange-500/50 text-orange-400';
    case 'medium': return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400';
    case 'low': return 'bg-white/10 border-white/20 text-white/70';
  }
};

const getCalloutIcon = (type: CalloutType) => {
  switch (type) {
    case 'car_left':
    case 'car_right':
    case 'cars_both':
      return <Car className="w-4 h-4" />;
    case 'closing_fast':
      return <AlertTriangle className="w-4 h-4" />;
    case 'position_gained':
      return <ChevronUp className="w-4 h-4" />;
    case 'position_lost':
      return <ChevronDown className="w-4 h-4" />;
    case 'clear':
      return <Shield className="w-4 h-4" />;
    default:
      return <Eye className="w-4 h-4" />;
  }
};

export function LiveSpotter({ compact = false, showHistory = true, audioEnabled = true, onCallout }: LiveSpotterProps) {
  const { telemetry, status } = useRelay();
  const [callouts, setCallouts] = useState<SpotterCallout[]>([]);
  const [proximity, setProximity] = useState<ProximityData>({
    carLeft: false,
    carRight: false,
    carAhead: null,
    carBehind: null,
    nearestCar: null,
  });
  const [audioOn, setAudioOn] = useState(audioEnabled);
  const [lastPosition, setLastPosition] = useState<number | null>(null);
  const [lastCalloutTime, setLastCalloutTime] = useState<Record<CalloutType, number>>({} as Record<CalloutType, number>);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Calculate proximity from telemetry
  const calculateProximity = useCallback((): ProximityData => {
    const playerPos = telemetry.trackPosition;
    const otherCars = telemetry.otherCars || [];
    
    if (playerPos === null || otherCars.length === 0) {
      return { carLeft: false, carRight: false, carAhead: null, carBehind: null, nearestCar: null };
    }

    let carLeft = false;
    let carRight = false;
    let carAhead: { distance: number; closing: boolean } | null = null;
    let carBehind: { distance: number; closing: boolean } | null = null;
    let nearestCar: CarMapPosition | null = null;
    let nearestDistance = Infinity;

    otherCars.forEach(car => {
      // Calculate distance (accounting for track wrap-around)
      let distance = car.trackPercentage - playerPos;
      if (distance > 0.5) distance -= 1;
      if (distance < -0.5) distance += 1;
      
      const absDistance = Math.abs(distance);
      
      // Check if car is alongside (within danger threshold)
      if (absDistance < DANGER_THRESHOLD) {
        // Determine left/right based on position number (simplified)
        // In reality, this would use lateral position data
        if ((car.position || 0) < (telemetry.position || 0)) {
          carLeft = true;
        } else {
          carRight = true;
        }
      }
      
      // Track nearest car
      if (absDistance < nearestDistance) {
        nearestDistance = absDistance;
        nearestCar = car;
      }
      
      // Car ahead
      if (distance > 0 && distance < PROXIMITY_THRESHOLD) {
        if (!carAhead || distance < carAhead.distance) {
          carAhead = { distance, closing: true }; // Would need delta data for accurate closing
        }
      }
      
      // Car behind
      if (distance < 0 && Math.abs(distance) < PROXIMITY_THRESHOLD) {
        if (!carBehind || Math.abs(distance) < carBehind.distance) {
          carBehind = { distance: Math.abs(distance), closing: true };
        }
      }
    });

    return { carLeft, carRight, carAhead, carBehind, nearestCar };
  }, [telemetry]);

  // Add a callout with cooldown
  const addCallout = useCallback((type: CalloutType, priority: SpotterCallout['priority'], data?: Record<string, string>) => {
    const now = Date.now();
    const cooldown = priority === 'critical' ? 1000 : priority === 'high' ? 2000 : 3000;
    
    if (lastCalloutTime[type] && now - lastCalloutTime[type] < cooldown) {
      return; // Still in cooldown
    }

    const callout: SpotterCallout = {
      id: `${type}-${now}`,
      type,
      message: getRandomMessage(type, data),
      priority,
      timestamp: new Date(),
      audioPlayed: false,
    };

    setCallouts(prev => [callout, ...prev.slice(0, 19)]); // Keep last 20
    setLastCalloutTime(prev => ({ ...prev, [type]: now }));
    onCallout?.(callout);

    // Play audio (would integrate with TTS in production)
    if (audioOn && audioRef.current) {
      // Placeholder for audio playback
      console.log(`[Spotter] ${callout.message}`);
    }
  }, [audioOn, lastCalloutTime, onCallout]);

  // Monitor proximity and generate callouts
  useEffect(() => {
    if (status !== 'in_session') return;

    const newProximity = calculateProximity();
    
    // Car alongside callouts
    if (newProximity.carLeft && newProximity.carRight) {
      addCallout('cars_both', 'critical');
    } else if (newProximity.carLeft && !proximity.carLeft) {
      addCallout('car_left', 'critical');
    } else if (newProximity.carRight && !proximity.carRight) {
      addCallout('car_right', 'critical');
    } else if (!newProximity.carLeft && !newProximity.carRight && (proximity.carLeft || proximity.carRight)) {
      addCallout('clear', 'medium');
    }

    // Closing fast callout
    if (newProximity.carBehind && newProximity.carBehind.distance < CLOSE_THRESHOLD && newProximity.carBehind.closing) {
      addCallout('closing_fast', 'high');
    }

    setProximity(newProximity);
  }, [telemetry.trackPosition, telemetry.otherCars, status, calculateProximity, addCallout, proximity.carLeft, proximity.carRight]);

  // Monitor position changes
  useEffect(() => {
    if (telemetry.position === null) return;
    
    if (lastPosition !== null && telemetry.position !== lastPosition) {
      if (telemetry.position < lastPosition) {
        addCallout('position_gained', 'high', { pos: telemetry.position.toString() });
      } else {
        addCallout('position_lost', 'medium', { pos: telemetry.position.toString() });
      }
    }
    setLastPosition(telemetry.position);
  }, [telemetry.position, lastPosition, addCallout]);

  // Format gap time
  const formatGap = (distance: number): string => {
    // Rough conversion: 1% track = ~1 second at racing speed
    const seconds = distance * 100;
    if (seconds < 1) return `${(seconds * 10).toFixed(0)} tenths`;
    return `${seconds.toFixed(1)}s`;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {/* Proximity Indicator */}
        <div className="flex items-center gap-1">
          <div className={`w-6 h-6 flex items-center justify-center rounded ${proximity.carLeft ? 'bg-red-500/30 text-red-400' : 'bg-white/5 text-white/20'}`}>
            <ChevronUp className="w-4 h-4 -rotate-90" />
          </div>
          <div className={`w-8 h-8 flex items-center justify-center rounded border ${
            proximity.carLeft || proximity.carRight ? 'border-red-500/50 bg-red-500/20' : 'border-white/10 bg-white/5'
          }`}>
            <Car className="w-4 h-4 text-white/70" />
          </div>
          <div className={`w-6 h-6 flex items-center justify-center rounded ${proximity.carRight ? 'bg-red-500/30 text-red-400' : 'bg-white/5 text-white/20'}`}>
            <ChevronUp className="w-4 h-4 rotate-90" />
          </div>
        </div>
        
        {/* Latest Callout */}
        {callouts[0] && (
          <div className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(callouts[0].priority)}`}>
            {callouts[0].message}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-white/70">Live Spotter</span>
          {status === 'in_session' && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px] rounded">
              <Radio className="w-3 h-3" />
              ACTIVE
            </span>
          )}
        </div>
        <button
          onClick={() => setAudioOn(!audioOn)}
          className={`p-1.5 rounded transition-colors ${audioOn ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-white/30'}`}
        >
          {audioOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {/* Proximity Display */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-center gap-4">
          {/* Left indicator */}
          <div className={`flex flex-col items-center gap-1 p-3 rounded transition-all ${
            proximity.carLeft ? 'bg-red-500/20 border border-red-500/50' : 'bg-white/5 border border-white/10'
          }`}>
            <ChevronUp className={`w-6 h-6 -rotate-90 ${proximity.carLeft ? 'text-red-400' : 'text-white/20'}`} />
            <span className={`text-[10px] uppercase font-semibold ${proximity.carLeft ? 'text-red-400' : 'text-white/30'}`}>
              {proximity.carLeft ? 'CAR LEFT' : 'Clear'}
            </span>
          </div>

          {/* Center - Car with gaps */}
          <div className="flex flex-col items-center gap-2">
            {/* Gap ahead */}
            <div className={`text-center ${proximity.carAhead ? 'text-yellow-400' : 'text-white/30'}`}>
              <div className="text-xs font-mono">
                {proximity.carAhead ? formatGap(proximity.carAhead.distance) : '—'}
              </div>
              <ChevronUp className="w-4 h-4 mx-auto" />
            </div>
            
            {/* Player car */}
            <div className={`w-16 h-16 flex items-center justify-center rounded-lg border-2 transition-all ${
              proximity.carLeft || proximity.carRight 
                ? 'border-red-500 bg-red-500/20' 
                : 'border-white/20 bg-white/5'
            }`}>
              <Car className={`w-8 h-8 ${proximity.carLeft || proximity.carRight ? 'text-red-400' : 'text-white/50'}`} />
            </div>
            
            {/* Gap behind */}
            <div className={`text-center ${proximity.carBehind ? 'text-orange-400' : 'text-white/30'}`}>
              <ChevronDown className="w-4 h-4 mx-auto" />
              <div className="text-xs font-mono">
                {proximity.carBehind ? formatGap(proximity.carBehind.distance) : '—'}
              </div>
            </div>
          </div>

          {/* Right indicator */}
          <div className={`flex flex-col items-center gap-1 p-3 rounded transition-all ${
            proximity.carRight ? 'bg-red-500/20 border border-red-500/50' : 'bg-white/5 border border-white/10'
          }`}>
            <ChevronUp className={`w-6 h-6 rotate-90 ${proximity.carRight ? 'text-red-400' : 'text-white/20'}`} />
            <span className={`text-[10px] uppercase font-semibold ${proximity.carRight ? 'text-red-400' : 'text-white/30'}`}>
              {proximity.carRight ? 'CAR RIGHT' : 'Clear'}
            </span>
          </div>
        </div>

        {/* Status message */}
        <div className="text-center mt-3">
          <span className={`text-sm font-semibold uppercase tracking-wider ${
            proximity.carLeft && proximity.carRight ? 'text-red-400' :
            proximity.carLeft || proximity.carRight ? 'text-orange-400' :
            'text-green-400'
          }`}>
            {proximity.carLeft && proximity.carRight ? 'SQUEEZE - HOLD LINE' :
             proximity.carLeft ? 'CAR LEFT' :
             proximity.carRight ? 'CAR RIGHT' :
             'CLEAR ALL AROUND'}
          </span>
        </div>
      </div>

      {/* Callout History */}
      {showHistory && (
        <div className="p-3 max-h-48 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-wider text-white/30 mb-2">Recent Callouts</div>
          <div className="space-y-1.5">
            {callouts.length === 0 ? (
              <div className="text-xs text-white/30 text-center py-2">No callouts yet</div>
            ) : (
              callouts.slice(0, 8).map(callout => (
                <div 
                  key={callout.id}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded border ${getPriorityColor(callout.priority)}`}
                >
                  {getCalloutIcon(callout.type)}
                  <span className="flex-1 text-xs font-medium">{callout.message}</span>
                  <span className="text-[10px] opacity-50">
                    {callout.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-px bg-white/10">
        <div className="bg-[#0a0a0a] p-2 text-center">
          <div className="text-lg font-bold text-white">P{telemetry.position || '—'}</div>
          <div className="text-[10px] text-white/40 uppercase">Position</div>
        </div>
        <div className="bg-[#0a0a0a] p-2 text-center">
          <div className="text-lg font-bold text-white">{telemetry.lap || '—'}</div>
          <div className="text-[10px] text-white/40 uppercase">Lap</div>
        </div>
        <div className="bg-[#0a0a0a] p-2 text-center">
          <div className="text-lg font-bold text-white">{proximity.nearestCar?.carNumber || '—'}</div>
          <div className="text-[10px] text-white/40 uppercase">Nearest</div>
        </div>
      </div>

      {/* Hidden audio element for TTS */}
      <audio ref={audioRef} />
    </div>
  );
}

// Export a hook for using spotter data elsewhere
export function useSpotterData() {
  const { telemetry, status } = useRelay();
  const [proximity, setProximity] = useState<ProximityData>({
    carLeft: false,
    carRight: false,
    carAhead: null,
    carBehind: null,
    nearestCar: null,
  });

  useEffect(() => {
    if (status !== 'in_session') return;

    const playerPos = telemetry.trackPosition;
    const otherCars = telemetry.otherCars || [];
    
    if (playerPos === null || otherCars.length === 0) {
      setProximity({ carLeft: false, carRight: false, carAhead: null, carBehind: null, nearestCar: null });
      return;
    }

    let carLeft = false;
    let carRight = false;
    let carAhead: { distance: number; closing: boolean } | null = null;
    let carBehind: { distance: number; closing: boolean } | null = null;
    let nearestCar: CarMapPosition | null = null;
    let nearestDistance = Infinity;

    otherCars.forEach(car => {
      let distance = car.trackPercentage - playerPos;
      if (distance > 0.5) distance -= 1;
      if (distance < -0.5) distance += 1;
      
      const absDistance = Math.abs(distance);
      
      if (absDistance < DANGER_THRESHOLD) {
        if ((car.position || 0) < (telemetry.position || 0)) {
          carLeft = true;
        } else {
          carRight = true;
        }
      }
      
      if (absDistance < nearestDistance) {
        nearestDistance = absDistance;
        nearestCar = car;
      }
      
      if (distance > 0 && distance < PROXIMITY_THRESHOLD) {
        if (!carAhead || distance < carAhead.distance) {
          carAhead = { distance, closing: true };
        }
      }
      
      if (distance < 0 && Math.abs(distance) < PROXIMITY_THRESHOLD) {
        if (!carBehind || Math.abs(distance) < carBehind.distance) {
          carBehind = { distance: Math.abs(distance), closing: true };
        }
      }
    });

    setProximity({ carLeft, carRight, carAhead, carBehind, nearestCar });
  }, [telemetry, status]);

  return { proximity, isActive: status === 'in_session' };
}
