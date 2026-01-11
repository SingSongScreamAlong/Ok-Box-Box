/**
 * AI Coaching Service
 * Analyzes telemetry data and generates actionable insights for drivers
 */

interface TelemetryPacket {
  driverId?: string;
  speed: number;
  throttle: number;
  brake: number;
  steering?: number;
  gear?: number;
  rpm?: number;
  trackPosition?: number;
  gapAhead?: number;
  gapBehind?: number;
  tires?: {
    frontLeft?: { temp: number; wear: number; pressure: number };
    frontRight?: { temp: number; wear: number; pressure: number };
    rearLeft?: { temp: number; wear: number; pressure: number };
    rearRight?: { temp: number; wear: number; pressure: number };
  };
}

export interface CoachingInsight {
  priority: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  title: string;
  description: string;
  impact: string;
  category: string;
  location?: string;
}

export interface DriverSkillAnalysis {
  strengths: Array<{ skill: string; rating: number }>;
  focusAreas: Array<{ skill: string; rating: number }>;
  overallRating: number;
}

export interface StrategyData {
  pitWindow: string;
  optimalPit: string;
  tireStrategy: string;
  fuelStrategy: string;
  paceTarget: string;
  positionPrediction: string;
  undercutRisk: string;
  tireLife: number;
}

interface CornerData {
  id: number;
  entrySpeed: number;
  minSpeed: number;
  exitSpeed: number;
  brakingPoint: number;
  throttlePoint: number;
  apexPosition: number;
}

interface TelemetryHistory {
  packets: TelemetryPacket[];
  lapTimes: number[];
  brakingPoints: number[];
  throttleApplications: number[];
  maxSpeeds: number[];
  corners: Map<number, CornerData[]>;
  currentCorner: number;
  inCorner: boolean;
  cornerEntrySpeed: number;
  cornerMinSpeed: number;
}

const sessionHistory: Map<string, TelemetryHistory> = new Map();

export function analyzeTelemetry(
  sessionId: string,
  packets: TelemetryPacket[]
): { insights: CoachingInsight[]; skillAnalysis: DriverSkillAnalysis | null } {
  // Get or create history for this session
  let history = sessionHistory.get(sessionId);
  if (!history) {
    history = {
      packets: [],
      lapTimes: [],
      brakingPoints: [],
      throttleApplications: [],
      maxSpeeds: [],
      corners: new Map(),
      currentCorner: 0,
      inCorner: false,
      cornerEntrySpeed: 0,
      cornerMinSpeed: 999,
    };
    sessionHistory.set(sessionId, history);
  }

  // Add new packets to history (keep last 1000)
  history.packets.push(...packets);
  if (history.packets.length > 1000) {
    history.packets = history.packets.slice(-1000);
  }

  const insights: CoachingInsight[] = [];
  const playerPacket = packets[0]; // First packet is typically the player

  if (!playerPacket) {
    return { insights: [], skillAnalysis: null };
  }

  // Analyze braking
  if (playerPacket.brake > 0.9) {
    history.brakingPoints.push(playerPacket.trackPosition || 0);
  }

  // Analyze throttle
  if (playerPacket.throttle > 0.95) {
    history.throttleApplications.push(playerPacket.trackPosition || 0);
  }

  // Track max speeds
  if (playerPacket.speed > (history.maxSpeeds[history.maxSpeeds.length - 1] || 0)) {
    history.maxSpeeds.push(playerPacket.speed);
  }

  // Track corner data
  trackCornerData(playerPacket, history);

  // Generate insights based on telemetry patterns
  insights.push(...generateBrakingInsights(playerPacket, history));
  insights.push(...generateThrottleInsights(playerPacket, history));
  insights.push(...generateTireInsights(playerPacket));
  insights.push(...generateRacecraftInsights(playerPacket));
  insights.push(...generateCornerInsights(history));

  // Generate skill analysis periodically (every ~100 packets)
  let skillAnalysis: DriverSkillAnalysis | null = null;
  if (history.packets.length % 100 < packets.length) {
    skillAnalysis = generateSkillAnalysis(history);
  }

  return { insights, skillAnalysis };
}

function generateBrakingInsights(packet: TelemetryPacket, history: TelemetryHistory): CoachingInsight[] {
  const insights: CoachingInsight[] = [];

  // Late braking detection
  if (packet.brake > 0.8 && packet.speed > 200) {
    insights.push({
      priority: 'medium',
      confidence: 75,
      title: 'Heavy Braking Detected',
      description: 'You\'re applying heavy brake pressure at high speed. Consider trail braking to maintain better balance.',
      impact: 'Could improve corner entry speed by 2-3 km/h',
      category: 'BRAKING',
      location: `Track position ${((packet.trackPosition || 0) * 100).toFixed(0)}%`,
    });
  }

  // Brake and throttle overlap (heel-toe or mistake)
  if (packet.brake > 0.3 && packet.throttle > 0.3) {
    insights.push({
      priority: 'low',
      confidence: 60,
      title: 'Brake/Throttle Overlap',
      description: 'Simultaneous brake and throttle input detected. This could indicate heel-toe downshifting or potential pedal confusion.',
      impact: 'Monitor for consistency',
      category: 'TECHNIQUE',
    });
  }

  return insights;
}

function generateThrottleInsights(packet: TelemetryPacket, history: TelemetryHistory): CoachingInsight[] {
  const insights: CoachingInsight[] = [];

  // Wheelspin detection (high throttle, low speed increase)
  if (packet.throttle > 0.9 && packet.speed < 100 && (packet.gear || 0) <= 3) {
    insights.push({
      priority: 'high',
      confidence: 80,
      title: 'Potential Wheelspin',
      description: 'High throttle application in low gear at moderate speed. Consider smoother throttle application on corner exit.',
      impact: 'Could gain 0.1-0.2s per corner',
      category: 'TRACTION',
    });
  }

  // Lift-off detection mid-corner
  if (packet.throttle < 0.5 && packet.throttle > 0.1 && Math.abs(packet.steering || 0) > 0.3) {
    insights.push({
      priority: 'low',
      confidence: 65,
      title: 'Partial Throttle Mid-Corner',
      description: 'Maintaining partial throttle through corner. Good technique for weight transfer management.',
      impact: 'Positive - maintaining balance',
      category: 'TECHNIQUE',
    });
  }

  return insights;
}

function generateTireInsights(packet: TelemetryPacket): CoachingInsight[] {
  const insights: CoachingInsight[] = [];
  const tires = packet.tires;

  if (!tires) return insights;

  // Check tire temperatures
  const temps = [
    tires.frontLeft?.temp || 0,
    tires.frontRight?.temp || 0,
    tires.rearLeft?.temp || 0,
    tires.rearRight?.temp || 0,
  ];

  const wears = [
    tires.frontLeft?.wear || 0,
    tires.frontRight?.wear || 0,
    tires.rearLeft?.wear || 0,
    tires.rearRight?.wear || 0,
  ];

  const pressures = [
    tires.frontLeft?.pressure || 0,
    tires.frontRight?.pressure || 0,
    tires.rearLeft?.pressure || 0,
    tires.rearRight?.pressure || 0,
  ];

  const avgTemp = temps.reduce((a, b) => a + b, 0) / 4;
  const maxTemp = Math.max(...temps);
  const minTemp = Math.min(...temps);
  const avgWear = wears.reduce((a, b) => a + b, 0) / 4;
  const maxWear = Math.max(...wears);

  // Overheating warning
  if (maxTemp > 100) {
    insights.push({
      priority: 'critical',
      confidence: 95,
      title: 'Tire Overheating',
      description: `Tire temperature exceeding optimal range (${maxTemp.toFixed(0)}°C). Reduce aggression to preserve tire life.`,
      impact: 'Risk of significant grip loss and increased wear',
      category: 'TIRES',
    });
  }

  // Cold tires warning
  if (minTemp < 70 && avgTemp < 75) {
    insights.push({
      priority: 'high',
      confidence: 85,
      title: 'Tires Below Optimal Temperature',
      description: 'Tires are cold and not in optimal operating window. Be cautious with aggressive inputs.',
      impact: 'Reduced grip until tires warm up',
      category: 'TIRES',
    });
  }

  // Temperature imbalance
  if (maxTemp - minTemp > 15) {
    insights.push({
      priority: 'medium',
      confidence: 70,
      title: 'Tire Temperature Imbalance',
      description: `Significant temperature difference across tires (${(maxTemp - minTemp).toFixed(0)}°C spread). May indicate setup issue or driving style.`,
      impact: 'Could affect handling balance',
      category: 'SETUP',
    });
  }

  // Tire wear warnings
  if (maxWear > 80) {
    insights.push({
      priority: 'critical',
      confidence: 95,
      title: 'Critical Tire Wear',
      description: `Tire wear at ${maxWear.toFixed(0)}%. Pit stop recommended immediately.`,
      impact: 'High risk of puncture or significant grip loss',
      category: 'TIRES',
    });
  } else if (maxWear > 60) {
    insights.push({
      priority: 'high',
      confidence: 85,
      title: 'High Tire Wear',
      description: `Tire wear at ${maxWear.toFixed(0)}%. Consider pit window timing.`,
      impact: 'Grip degradation increasing',
      category: 'TIRES',
    });
  } else if (avgWear > 40) {
    insights.push({
      priority: 'medium',
      confidence: 75,
      title: 'Moderate Tire Wear',
      description: `Average tire wear at ${avgWear.toFixed(0)}%. Monitor degradation rate.`,
      impact: 'Plan pit strategy accordingly',
      category: 'TIRES',
    });
  }

  // Front vs rear wear imbalance
  const frontWear = (wears[0] + wears[1]) / 2;
  const rearWear = (wears[2] + wears[3]) / 2;
  if (Math.abs(frontWear - rearWear) > 15) {
    const heavierEnd = frontWear > rearWear ? 'front' : 'rear';
    insights.push({
      priority: 'medium',
      confidence: 70,
      title: 'Tire Wear Imbalance',
      description: `${heavierEnd.charAt(0).toUpperCase() + heavierEnd.slice(1)} tires wearing faster. Consider adjusting driving style or setup.`,
      impact: 'May affect handling balance over stint',
      category: 'SETUP',
    });
  }

  // Pressure warnings
  const avgPressure = pressures.filter(p => p > 0).reduce((a, b) => a + b, 0) / pressures.filter(p => p > 0).length;
  if (avgPressure > 0) {
    if (avgPressure > 28) {
      insights.push({
        priority: 'medium',
        confidence: 65,
        title: 'High Tire Pressure',
        description: `Tire pressures running high (${avgPressure.toFixed(1)} psi). May reduce grip.`,
        impact: 'Reduced contact patch',
        category: 'TIRES',
      });
    } else if (avgPressure < 22) {
      insights.push({
        priority: 'medium',
        confidence: 65,
        title: 'Low Tire Pressure',
        description: `Tire pressures running low (${avgPressure.toFixed(1)} psi). May cause overheating.`,
        impact: 'Increased tire temperature and wear',
        category: 'TIRES',
      });
    }
  }

  return insights;
}

function trackCornerData(packet: TelemetryPacket, history: TelemetryHistory): void {
  const steering = Math.abs(packet.steering || 0);
  const isCorner = steering > 0.15; // Significant steering input
  
  if (isCorner && !history.inCorner) {
    // Entering a corner
    history.inCorner = true;
    history.currentCorner++;
    history.cornerEntrySpeed = packet.speed;
    history.cornerMinSpeed = packet.speed;
  } else if (isCorner && history.inCorner) {
    // In corner - track minimum speed
    if (packet.speed < history.cornerMinSpeed) {
      history.cornerMinSpeed = packet.speed;
    }
  } else if (!isCorner && history.inCorner) {
    // Exiting corner - save data
    history.inCorner = false;
    const cornerId = history.currentCorner % 20; // Assume max 20 corners per lap
    
    const cornerData: CornerData = {
      id: cornerId,
      entrySpeed: history.cornerEntrySpeed,
      minSpeed: history.cornerMinSpeed,
      exitSpeed: packet.speed,
      brakingPoint: packet.trackPosition || 0,
      throttlePoint: packet.trackPosition || 0,
      apexPosition: packet.trackPosition || 0,
    };
    
    if (!history.corners.has(cornerId)) {
      history.corners.set(cornerId, []);
    }
    history.corners.get(cornerId)!.push(cornerData);
    
    // Keep only last 5 passes through each corner
    const cornerHistory = history.corners.get(cornerId)!;
    if (cornerHistory.length > 5) {
      history.corners.set(cornerId, cornerHistory.slice(-5));
    }
    
    history.cornerMinSpeed = 999;
  }
}

function generateCornerInsights(history: TelemetryHistory): CoachingInsight[] {
  const insights: CoachingInsight[] = [];
  
  // Analyze corners with enough data
  history.corners.forEach((cornerHistory, cornerId) => {
    if (cornerHistory.length < 2) return;
    
    const latest = cornerHistory[cornerHistory.length - 1];
    const previous = cornerHistory[cornerHistory.length - 2];
    
    // Compare entry speeds
    const entryDiff = latest.entrySpeed - previous.entrySpeed;
    if (entryDiff < -5) {
      insights.push({
        priority: 'medium',
        confidence: 70,
        title: `Corner ${cornerId}: Entry Speed Drop`,
        description: `Entry speed dropped ${Math.abs(entryDiff).toFixed(0)} km/h compared to previous lap. Check braking point.`,
        impact: 'Potential time loss',
        category: 'CORNER',
        location: `Corner ${cornerId}`,
      });
    }
    
    // Compare exit speeds
    const exitDiff = latest.exitSpeed - previous.exitSpeed;
    if (exitDiff < -5) {
      insights.push({
        priority: 'medium',
        confidence: 75,
        title: `Corner ${cornerId}: Exit Speed Drop`,
        description: `Exit speed dropped ${Math.abs(exitDiff).toFixed(0)} km/h. Focus on earlier throttle application.`,
        impact: 'Affects straight-line speed',
        category: 'CORNER',
        location: `Corner ${cornerId}`,
      });
    }
    
    // Check for improvement
    if (exitDiff > 3 && entryDiff >= 0) {
      insights.push({
        priority: 'low',
        confidence: 80,
        title: `Corner ${cornerId}: Improvement!`,
        description: `Exit speed improved by ${exitDiff.toFixed(0)} km/h. Good execution!`,
        impact: 'Positive progress',
        category: 'CORNER',
        location: `Corner ${cornerId}`,
      });
    }
    
    // Analyze consistency across multiple laps
    if (cornerHistory.length >= 3) {
      const exitSpeeds = cornerHistory.map(c => c.exitSpeed);
      const avgExit = exitSpeeds.reduce((a, b) => a + b, 0) / exitSpeeds.length;
      const variance = exitSpeeds.reduce((sum, s) => sum + Math.pow(s - avgExit, 2), 0) / exitSpeeds.length;
      
      if (variance > 25) { // High variance
        insights.push({
          priority: 'high',
          confidence: 85,
          title: `Corner ${cornerId}: Inconsistent`,
          description: `Exit speed varies significantly (±${Math.sqrt(variance).toFixed(1)} km/h). Focus on consistent technique.`,
          impact: 'Affects lap time consistency',
          category: 'CONSISTENCY',
          location: `Corner ${cornerId}`,
        });
      }
    }
  });
  
  return insights;
}

function generateRacecraftInsights(packet: TelemetryPacket): CoachingInsight[] {
  const insights: CoachingInsight[] = [];

  // Gap management
  const gapAhead = packet.gapAhead || 0;
  const gapBehind = packet.gapBehind || 0;

  if (gapAhead > 0 && gapAhead < 1.0) {
    insights.push({
      priority: 'high',
      confidence: 85,
      title: 'Overtaking Opportunity',
      description: `Car ahead is within ${gapAhead.toFixed(2)}s. Look for overtaking opportunities in upcoming braking zones.`,
      impact: 'Potential position gain',
      category: 'RACECRAFT',
    });
  }

  if (gapBehind > 0 && gapBehind < 0.5) {
    insights.push({
      priority: 'high',
      confidence: 90,
      title: 'Defensive Alert',
      description: `Car behind is within ${gapBehind.toFixed(2)}s. Defend your position in braking zones.`,
      impact: 'Risk of losing position',
      category: 'RACECRAFT',
    });
  }

  return insights;
}

function generateSkillAnalysis(history: TelemetryHistory): DriverSkillAnalysis {
  // Calculate skill ratings based on telemetry history
  const recentPackets = history.packets.slice(-500);
  
  // Consistency rating (based on throttle/brake smoothness)
  let throttleVariance = 0;
  let brakeVariance = 0;
  for (let i = 1; i < recentPackets.length; i++) {
    throttleVariance += Math.abs((recentPackets[i].throttle || 0) - (recentPackets[i-1].throttle || 0));
    brakeVariance += Math.abs((recentPackets[i].brake || 0) - (recentPackets[i-1].brake || 0));
  }
  const smoothnessRating = Math.max(50, 100 - (throttleVariance + brakeVariance) / recentPackets.length * 100);

  // Speed management (based on max speeds achieved)
  const avgMaxSpeed = history.maxSpeeds.length > 0 
    ? history.maxSpeeds.reduce((a, b) => a + b, 0) / history.maxSpeeds.length 
    : 200;
  const speedRating = Math.min(100, (avgMaxSpeed / 300) * 100);

  // Braking consistency
  const brakingRating = Math.max(60, 100 - history.brakingPoints.length * 0.5);

  // Throttle control
  const throttleRating = Math.max(55, 100 - history.throttleApplications.length * 0.3);

  const overallRating = Math.round((smoothnessRating + speedRating + brakingRating + throttleRating) / 4);

  return {
    strengths: [
      { skill: 'Input Smoothness', rating: Math.round(smoothnessRating) },
      { skill: 'Speed Management', rating: Math.round(speedRating) },
    ],
    focusAreas: [
      { skill: 'Braking Consistency', rating: Math.round(brakingRating) },
      { skill: 'Throttle Control', rating: Math.round(throttleRating) },
    ],
    overallRating,
  };
}

export function generateStrategyData(
  sessionId: string,
  currentLap: number,
  totalLaps: number,
  tireWear: number,
  fuelLevel: number,
  position: number
): StrategyData {
  const remainingLaps = totalLaps - currentLap;
  const pitWindowStart = Math.max(1, Math.floor(totalLaps * 0.3));
  const pitWindowEnd = Math.floor(totalLaps * 0.7);
  
  // Calculate optimal pit lap based on tire wear and fuel
  const tireLifeLaps = Math.floor((100 - tireWear) / 2);
  const fuelLaps = Math.floor(fuelLevel / 2.5);
  const optimalPitLap = Math.min(currentLap + Math.min(tireLifeLaps, fuelLaps), pitWindowEnd);

  // Undercut risk based on position and gaps
  const undercutRisk = position > 1 && position < 5 ? 'HIGH' : position < 10 ? 'MEDIUM' : 'LOW';

  return {
    pitWindow: `Lap ${pitWindowStart} - ${pitWindowEnd}`,
    optimalPit: `Lap ${optimalPitLap}`,
    tireStrategy: tireWear > 50 ? 'Consider pit soon' : 'Tires OK',
    fuelStrategy: fuelLevel < 30 ? 'Fuel critical' : 'Fuel OK',
    paceTarget: '1:45.500',
    positionPrediction: `P${Math.max(1, position - 1)} - P${position + 2}`,
    undercutRisk,
    tireLife: Math.round(100 - tireWear),
  };
}

export function clearSessionHistory(sessionId: string): void {
  sessionHistory.delete(sessionId);
}
