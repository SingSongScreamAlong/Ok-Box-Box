
import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * DriverRadar - Situational Awareness Widget
 * 
 * A modular, driver-centered radar that shows nearby cars relative to the player.
 * Oriented to driver's heading (forward = up), rotates with the car.
 * 
 * Design principles:
 * - Accessibility first: beginners benefit without understanding
 * - Calm when stable, expressive when risk increases
 * - Visual weighting by relevance (proximity, closure rate, instability)
 * - No numbers, no names - just spatial awareness
 */

// ============================================================================
// Types
// ============================================================================

export interface NearbyCarData {
  id: string;
  /** Relative X position in meters (positive = right of player) */
  relativeX: number;
  /** Relative Y position in meters (positive = ahead of player) */
  relativeY: number;
  /** Closure rate in m/s (positive = approaching, negative = pulling away) */
  closureRate: number;
  /** Is this car currently unstable (weaving, braking hard, off-line)? */
  isUnstable?: boolean;
  /** Optional class color for multi-class awareness */
  classColor?: string;
}

export interface DriverRadarProps {
  /** Array of nearby cars with relative positions */
  nearbyCars: NearbyCarData[];
  /** Radar radius in meters (default: 30m - about 2 car lengths ahead/behind) */
  radiusMeters?: number;
  /** Widget size in pixels (default: 200) */
  size?: number;
  /** Show range rings for depth perception */
  showRangeRings?: boolean;
  /** Opacity when no cars nearby (0-1, default: 0.3) */
  idleOpacity?: number;
  /** Custom className for positioning */
  className?: string;
  /** Is the widget currently hidden? */
  hidden?: boolean;
}

// ============================================================================
// Utility Functions
// ============================================================================

/** Calculate threat level (0-1) based on proximity and closure */
function calculateThreatLevel(car: NearbyCarData, radiusMeters: number): number {
  const distance = Math.sqrt(car.relativeX ** 2 + car.relativeY ** 2);
  const proximityThreat = 1 - Math.min(distance / radiusMeters, 1);
  
  // Closure rate threat: approaching cars are more threatening
  const closureThreat = car.closureRate > 0 
    ? Math.min(car.closureRate / 15, 1) // 15 m/s (~54 km/h) closure = max threat
    : 0;
  
  // Instability adds threat
  const instabilityThreat = car.isUnstable ? 0.3 : 0;
  
  // Combine: proximity is primary, closure and instability are modifiers
  return Math.min(proximityThreat * 0.6 + closureThreat * 0.3 + instabilityThreat, 1);
}

/** Get color based on threat level - calm blues to warning oranges */
function getThreatColor(threat: number, classColor?: string): string {
  if (classColor) {
    // Use class color but modulate opacity based on threat
    return classColor;
  }
  
  // Calm (low threat) = cyan/blue, Alert (high threat) = orange/red
  if (threat < 0.3) return '#38bdf8'; // sky-400
  if (threat < 0.5) return '#fbbf24'; // amber-400
  if (threat < 0.7) return '#f97316'; // orange-500
  return '#ef4444'; // red-500
}

/** Get pulse animation intensity based on threat */
function getPulseIntensity(threat: number): number {
  if (threat < 0.3) return 0;
  if (threat < 0.5) return 0.3;
  if (threat < 0.7) return 0.6;
  return 1;
}

// ============================================================================
// Sub-Components
// ============================================================================

interface CarBlipProps {
  car: NearbyCarData;
  radiusMeters: number;
  radarSize: number;
}

function CarBlip({ car, radiusMeters, radarSize }: CarBlipProps) {
  const threat = calculateThreatLevel(car, radiusMeters);
  const color = getThreatColor(threat, car.classColor);
  const pulseIntensity = getPulseIntensity(threat);
  
  // Convert meters to pixel position (center = 0,0)
  const scale = (radarSize / 2) / radiusMeters;
  const pixelX = car.relativeX * scale;
  const pixelY = -car.relativeY * scale; // Invert Y so forward = up
  
  // Clamp to radar bounds
  const distance = Math.sqrt(pixelX ** 2 + pixelY ** 2);
  const maxRadius = radarSize / 2 - 8;
  const clampedX = distance > maxRadius ? (pixelX / distance) * maxRadius : pixelX;
  const clampedY = distance > maxRadius ? (pixelY / distance) * maxRadius : pixelY;
  
  // Size based on proximity (closer = larger)
  const baseSize = 8 + threat * 8; // 8-16px
  
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0 }}
      animate={{ 
        opacity: 0.7 + threat * 0.3,
        scale: 1,
        x: clampedX,
        y: clampedY
      }}
      exit={{ opacity: 0, scale: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
    >
      {/* Threat pulse ring */}
      {pulseIntensity > 0 && (
        <motion.circle
          r={baseSize + 4}
          fill="none"
          stroke={color}
          strokeWidth={1}
          initial={{ opacity: 0, scale: 1 }}
          animate={{ 
            opacity: [pulseIntensity * 0.5, 0],
            scale: [1, 1.5]
          }}
          transition={{ 
            duration: 0.8,
            repeat: Infinity,
            ease: 'easeOut'
          }}
        />
      )}
      
      {/* Main blip */}
      <circle
        r={baseSize}
        fill={color}
        fillOpacity={0.3 + threat * 0.4}
        stroke={color}
        strokeWidth={2}
      />
      
      {/* Core dot */}
      <circle
        r={3}
        fill={color}
      />
      
      {/* Closure indicator (approaching = arrow toward center) */}
      {car.closureRate > 3 && (
        <motion.path
          d="M 0 -6 L 3 -12 L -3 -12 Z"
          fill={color}
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      )}
      
      {/* Instability indicator (wobble) */}
      {car.isUnstable && (
        <motion.circle
          r={baseSize + 2}
          fill="none"
          stroke="#fbbf24"
          strokeWidth={1}
          strokeDasharray="4 4"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
      )}
    </motion.g>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DriverRadar({
  nearbyCars,
  radiusMeters = 30,
  size = 200,
  showRangeRings = true,
  idleOpacity = 0.3,
  className = '',
  hidden = false
}: DriverRadarProps) {
  
  // Calculate overall threat level for widget state
  const overallThreat = useMemo(() => {
    if (nearbyCars.length === 0) return 0;
    const threats = nearbyCars.map(car => calculateThreatLevel(car, radiusMeters));
    return Math.max(...threats);
  }, [nearbyCars, radiusMeters]);
  
  // Widget opacity based on activity
  const widgetOpacity = nearbyCars.length === 0 ? idleOpacity : 0.9 + overallThreat * 0.1;
  
  // Background color shifts with threat
  const bgColor = overallThreat > 0.5 
    ? `rgba(249, 115, 22, ${0.05 + overallThreat * 0.1})` // Orange tint
    : 'rgba(0, 0, 0, 0.6)';
  
  // Border color
  const borderColor = overallThreat > 0.7 
    ? '#f97316' 
    : overallThreat > 0.4 
      ? '#fbbf24' 
      : 'rgba(255, 255, 255, 0.1)';
  
  if (hidden) return null;
  
  const center = size / 2;
  
  return (
    <motion.div
      className={`relative select-none ${className}`}
      style={{
        width: size,
        height: size,
        opacity: widgetOpacity,
        transition: 'opacity 0.3s ease'
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: widgetOpacity, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rounded-full overflow-hidden"
        style={{
          background: bgColor,
          border: `2px solid ${borderColor}`,
          boxShadow: overallThreat > 0.5 
            ? `0 0 20px rgba(249, 115, 22, ${overallThreat * 0.3})` 
            : 'none',
          transition: 'all 0.3s ease'
        }}
      >
        {/* Range rings */}
        {showRangeRings && (
          <g opacity={0.2}>
            <circle cx={center} cy={center} r={size * 0.25} fill="none" stroke="white" strokeWidth={1} />
            <circle cx={center} cy={center} r={size * 0.5 - 4} fill="none" stroke="white" strokeWidth={1} />
          </g>
        )}
        
        {/* Center cross (heading indicator) */}
        <g opacity={0.3}>
          <line x1={center} y1={center - 15} x2={center} y2={center - 8} stroke="white" strokeWidth={2} />
          <line x1={center - 6} y1={center} x2={center + 6} y2={center} stroke="white" strokeWidth={1} />
        </g>
        
        {/* Player car indicator */}
        <g transform={`translate(${center}, ${center})`}>
          <polygon
            points="0,-8 5,6 -5,6"
            fill="#38bdf8"
            fillOpacity={0.8}
            stroke="#38bdf8"
            strokeWidth={1}
          />
        </g>
        
        {/* Nearby cars */}
        <g transform={`translate(${center}, ${center})`}>
          <AnimatePresence>
            {nearbyCars.map(car => (
              <CarBlip
                key={car.id}
                car={car}
                radiusMeters={radiusMeters}
                radarSize={size}
              />
            ))}
          </AnimatePresence>
        </g>
        
        {/* Threat level indicator arc */}
        {overallThreat > 0.3 && (
          <motion.circle
            cx={center}
            cy={center}
            r={size / 2 - 4}
            fill="none"
            stroke={getThreatColor(overallThreat)}
            strokeWidth={3}
            strokeDasharray={`${overallThreat * Math.PI * size} ${Math.PI * size}`}
            strokeLinecap="round"
            initial={{ rotate: -90 }}
            animate={{ rotate: -90 }}
            style={{ transformOrigin: 'center' }}
            opacity={0.6}
          />
        )}
      </svg>
      
      {/* Status label (only when high threat) */}
      <AnimatePresence>
        {overallThreat > 0.7 && (
          <motion.div
            className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-wider font-bold text-orange-400"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
          >
            TRAFFIC
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default DriverRadar;
