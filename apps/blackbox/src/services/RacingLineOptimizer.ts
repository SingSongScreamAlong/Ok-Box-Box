/**
 * Racing Line Optimizer
 * Compares your line to theoretical optimal, shows where you're losing time
 */

import type { TelemetryData } from '../types';

export interface LinePoint {
  trackPosition: number; // 0-1
  x: number;
  y: number;
  speed: number;
  throttle: number;
  brake: number;
  steering: number;
  gear: number;
}

export interface OptimalLine {
  trackId: string;
  points: LinePoint[];
  sectorSplits: number[];
  lapTime: number;
  source: 'ai_generated' | 'best_lap' | 'pro_driver' | 'community';
}

export interface LineComparison {
  trackPosition: number;
  playerPoint: LinePoint;
  optimalPoint: LinePoint;
  lateralDeviation: number; // meters off optimal line
  speedDelta: number; // km/h difference
  timeLoss: number; // estimated time loss at this point
  issue: LineIssue | null;
}

export interface LineIssue {
  type: 'early_apex' | 'late_apex' | 'wide_entry' | 'tight_entry' | 'early_throttle' | 'late_throttle' | 'over_braking' | 'under_braking' | 'wrong_gear';
  severity: 'minor' | 'moderate' | 'major';
  description: string;
  suggestion: string;
  timeCost: number; // estimated ms lost
}

export interface CornerLineAnalysis {
  cornerNumber: number;
  cornerName: string;
  entryLine: 'optimal' | 'wide' | 'tight';
  apexHit: boolean;
  apexTiming: 'early' | 'optimal' | 'late';
  exitLine: 'optimal' | 'wide' | 'tight';
  minSpeed: number;
  optimalMinSpeed: number;
  speedDelta: number;
  timeLoss: number;
  issues: LineIssue[];
  overallRating: number; // 0-100
}

export interface LapLineAnalysis {
  lapTime: number;
  optimalLapTime: number;
  totalTimeLoss: number;
  cornerAnalyses: CornerLineAnalysis[];
  biggestTimeLoss: CornerLineAnalysis;
  overallLineRating: number;
  recommendations: string[];
}

interface RecordedPoint {
  timestamp: number;
  trackPosition: number;
  x: number;
  y: number;
  speed: number;
  throttle: number;
  brake: number;
  steering: number;
  gear: number;
}

class RacingLineOptimizerClass {
  private optimalLine: OptimalLine | null = null;
  private currentLapPoints: RecordedPoint[] = [];
  private bestLapPoints: RecordedPoint[] = [];
  private cornerDefinitions: Array<{ number: number; name: string; start: number; apex: number; end: number }> = [];
  
  private lastTrackPosition = 0;
  private lapStartTime = 0;

  private listeners: Set<(comparison: LineComparison) => void> = new Set();
  private analysisListeners: Set<(analysis: LapLineAnalysis) => void> = new Set();

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  setOptimalLine(line: OptimalLine): void {
    this.optimalLine = line;
  }

  setCornerDefinitions(corners: Array<{ number: number; name: string; start: number; apex: number; end: number }>): void {
    this.cornerDefinitions = corners;
  }

  generateOptimalLineFromBestLap(): void {
    if (this.bestLapPoints.length < 100) return;

    this.optimalLine = {
      trackId: 'current',
      points: this.bestLapPoints.map(p => ({
        trackPosition: p.trackPosition,
        x: p.x,
        y: p.y,
        speed: p.speed,
        throttle: p.throttle,
        brake: p.brake,
        steering: p.steering,
        gear: p.gear,
      })),
      sectorSplits: [],
      lapTime: this.bestLapPoints[this.bestLapPoints.length - 1].timestamp - this.bestLapPoints[0].timestamp,
      source: 'best_lap',
    };
  }

  // ============================================================================
  // REAL-TIME TRACKING
  // ============================================================================

  update(telemetry: TelemetryData): LineComparison | null {
    const trackPos = telemetry.trackPosition;

    // Detect lap start
    if (this.lastTrackPosition > 0.95 && trackPos < 0.05) {
      this.completeLap();
    }

    // Record current point
    const point: RecordedPoint = {
      timestamp: Date.now(),
      trackPosition: trackPos,
      x: telemetry.position.x,
      y: telemetry.position.y,
      speed: telemetry.speed,
      throttle: telemetry.throttle,
      brake: telemetry.brake,
      steering: telemetry.steering,
      gear: telemetry.gear,
    };

    this.currentLapPoints.push(point);

    // Keep reasonable size
    if (this.currentLapPoints.length > 5000) {
      this.currentLapPoints = this.currentLapPoints.slice(-4000);
    }

    this.lastTrackPosition = trackPos;

    // Compare to optimal if available
    if (this.optimalLine) {
      const comparison = this.compareToOptimal(point);
      this.notifyListeners(comparison);
      return comparison;
    }

    return null;
  }

  private completeLap(): void {
    if (this.currentLapPoints.length < 100) {
      this.currentLapPoints = [];
      this.lapStartTime = Date.now();
      return;
    }

    const lapTime = Date.now() - this.lapStartTime;

    // Check if this is best lap
    if (this.bestLapPoints.length === 0 || lapTime < this.getBestLapTime()) {
      this.bestLapPoints = [...this.currentLapPoints];
      this.generateOptimalLineFromBestLap();
    }

    // Analyze completed lap
    const analysis = this.analyzeLap(this.currentLapPoints, lapTime);
    this.notifyAnalysis(analysis);

    // Reset for next lap
    this.currentLapPoints = [];
    this.lapStartTime = Date.now();
  }

  private getBestLapTime(): number {
    if (this.bestLapPoints.length < 2) return Infinity;
    return this.bestLapPoints[this.bestLapPoints.length - 1].timestamp - this.bestLapPoints[0].timestamp;
  }

  // ============================================================================
  // LINE COMPARISON
  // ============================================================================

  private compareToOptimal(point: RecordedPoint): LineComparison {
    if (!this.optimalLine) {
      return this.createEmptyComparison(point);
    }

    // Find closest optimal point by track position
    const optimalPoint = this.findOptimalPointAtPosition(point.trackPosition);
    
    if (!optimalPoint) {
      return this.createEmptyComparison(point);
    }

    // Calculate lateral deviation
    const lateralDeviation = Math.sqrt(
      Math.pow(point.x - optimalPoint.x, 2) + 
      Math.pow(point.y - optimalPoint.y, 2)
    );

    // Calculate speed delta
    const speedDelta = point.speed - optimalPoint.speed;

    // Estimate time loss
    const timeLoss = this.estimateTimeLoss(lateralDeviation, speedDelta, point.speed);

    // Detect issues
    const issue = this.detectIssue(point, optimalPoint, lateralDeviation, speedDelta);

    return {
      trackPosition: point.trackPosition,
      playerPoint: {
        trackPosition: point.trackPosition,
        x: point.x,
        y: point.y,
        speed: point.speed,
        throttle: point.throttle,
        brake: point.brake,
        steering: point.steering,
        gear: point.gear,
      },
      optimalPoint,
      lateralDeviation,
      speedDelta,
      timeLoss,
      issue,
    };
  }

  private findOptimalPointAtPosition(trackPosition: number): LinePoint | null {
    if (!this.optimalLine || this.optimalLine.points.length === 0) return null;

    let closest = this.optimalLine.points[0];
    let minDiff = Math.abs(closest.trackPosition - trackPosition);

    for (const point of this.optimalLine.points) {
      const diff = Math.abs(point.trackPosition - trackPosition);
      if (diff < minDiff) {
        minDiff = diff;
        closest = point;
      }
    }

    return closest;
  }

  private createEmptyComparison(point: RecordedPoint): LineComparison {
    return {
      trackPosition: point.trackPosition,
      playerPoint: {
        trackPosition: point.trackPosition,
        x: point.x,
        y: point.y,
        speed: point.speed,
        throttle: point.throttle,
        brake: point.brake,
        steering: point.steering,
        gear: point.gear,
      },
      optimalPoint: {
        trackPosition: point.trackPosition,
        x: point.x,
        y: point.y,
        speed: point.speed,
        throttle: point.throttle,
        brake: point.brake,
        steering: point.steering,
        gear: point.gear,
      },
      lateralDeviation: 0,
      speedDelta: 0,
      timeLoss: 0,
      issue: null,
    };
  }

  private estimateTimeLoss(lateralDeviation: number, speedDelta: number, currentSpeed: number): number {
    // Time loss from being off-line (longer distance)
    const distanceLoss = lateralDeviation * 0.001; // Rough estimate
    
    // Time loss from speed difference
    const speedLoss = speedDelta < 0 ? Math.abs(speedDelta) * 0.01 : 0;
    
    return distanceLoss + speedLoss;
  }

  private detectIssue(point: RecordedPoint, optimal: LinePoint, lateralDev: number, speedDelta: number): LineIssue | null {
    // Check for significant deviations
    if (lateralDev < 1 && Math.abs(speedDelta) < 5) {
      return null; // On line
    }

    // Determine corner phase
    const corner = this.getCornerAtPosition(point.trackPosition);
    if (!corner) return null;

    const cornerProgress = (point.trackPosition - corner.start) / (corner.end - corner.start);

    // Entry phase (0-0.3)
    if (cornerProgress < 0.3) {
      if (lateralDev > 2) {
        const isWide = point.steering < optimal.steering;
        return {
          type: isWide ? 'wide_entry' : 'tight_entry',
          severity: lateralDev > 4 ? 'major' : 'moderate',
          description: isWide ? 'Entry too wide' : 'Entry too tight',
          suggestion: isWide ? 'Turn in earlier' : 'Turn in later, use more track',
          timeCost: lateralDev * 10,
        };
      }
      if (speedDelta < -10) {
        return {
          type: 'over_braking',
          severity: speedDelta < -20 ? 'major' : 'moderate',
          description: 'Braking too much on entry',
          suggestion: 'Brake later or lighter',
          timeCost: Math.abs(speedDelta) * 5,
        };
      }
    }

    // Apex phase (0.3-0.6)
    if (cornerProgress >= 0.3 && cornerProgress < 0.6) {
      if (lateralDev > 1.5) {
        const isEarly = cornerProgress < 0.45;
        return {
          type: isEarly ? 'early_apex' : 'late_apex',
          severity: lateralDev > 3 ? 'major' : 'moderate',
          description: isEarly ? 'Apex too early' : 'Apex too late',
          suggestion: isEarly ? 'Delay turn-in, apex later' : 'Turn in earlier',
          timeCost: lateralDev * 15,
        };
      }
    }

    // Exit phase (0.6-1.0)
    if (cornerProgress >= 0.6) {
      if (point.throttle < optimal.throttle - 0.2) {
        return {
          type: 'late_throttle',
          severity: 'moderate',
          description: 'Getting on throttle too late',
          suggestion: 'Apply throttle earlier, unwind steering',
          timeCost: (optimal.throttle - point.throttle) * 50,
        };
      }
      if (speedDelta < -15) {
        return {
          type: 'under_braking',
          severity: 'moderate',
          description: 'Exit speed too low',
          suggestion: 'Carry more speed through apex',
          timeCost: Math.abs(speedDelta) * 5,
        };
      }
    }

    // Gear check
    if (point.gear !== optimal.gear) {
      return {
        type: 'wrong_gear',
        severity: 'minor',
        description: `In gear ${point.gear}, optimal is ${optimal.gear}`,
        suggestion: point.gear < optimal.gear ? 'Upshift earlier' : 'Downshift more',
        timeCost: 20,
      };
    }

    return null;
  }

  private getCornerAtPosition(trackPosition: number): { number: number; name: string; start: number; apex: number; end: number } | null {
    for (const corner of this.cornerDefinitions) {
      if (trackPosition >= corner.start && trackPosition <= corner.end) {
        return corner;
      }
    }
    return null;
  }

  // ============================================================================
  // LAP ANALYSIS
  // ============================================================================

  private analyzeLap(points: RecordedPoint[], lapTime: number): LapLineAnalysis {
    const cornerAnalyses: CornerLineAnalysis[] = [];
    let totalTimeLoss = 0;

    for (const corner of this.cornerDefinitions) {
      const analysis = this.analyzeCorner(points, corner);
      cornerAnalyses.push(analysis);
      totalTimeLoss += analysis.timeLoss;
    }

    // Find biggest time loss
    const biggestTimeLoss = cornerAnalyses.reduce((max, c) => 
      c.timeLoss > max.timeLoss ? c : max, cornerAnalyses[0]);

    // Calculate overall rating
    const maxPossibleLoss = cornerAnalyses.length * 500; // 500ms max per corner
    const overallLineRating = Math.max(0, 100 - (totalTimeLoss / maxPossibleLoss) * 100);

    // Generate recommendations
    const recommendations = this.generateRecommendations(cornerAnalyses);

    return {
      lapTime,
      optimalLapTime: this.optimalLine?.lapTime || lapTime,
      totalTimeLoss,
      cornerAnalyses,
      biggestTimeLoss,
      overallLineRating,
      recommendations,
    };
  }

  private analyzeCorner(points: RecordedPoint[], corner: { number: number; name: string; start: number; apex: number; end: number }): CornerLineAnalysis {
    // Get points in this corner
    const cornerPoints = points.filter(p => 
      p.trackPosition >= corner.start && p.trackPosition <= corner.end
    );

    if (cornerPoints.length === 0) {
      return this.createEmptyCornerAnalysis(corner);
    }

    // Find minimum speed (apex speed)
    const minSpeedPoint = cornerPoints.reduce((min, p) => 
      p.speed < min.speed ? p : min, cornerPoints[0]);

    // Get optimal data for comparison
    const optimalMinSpeed = this.getOptimalMinSpeedForCorner(corner);

    // Analyze entry
    const entryPoints = cornerPoints.filter(p => 
      p.trackPosition < corner.start + (corner.apex - corner.start) * 0.5
    );
    const entryLine = this.analyzeEntryLine(entryPoints, corner);

    // Analyze apex
    const apexHit = Math.abs(minSpeedPoint.trackPosition - corner.apex) < 0.02;
    const apexTiming: 'early' | 'optimal' | 'late' = 
      minSpeedPoint.trackPosition < corner.apex - 0.01 ? 'early' :
      minSpeedPoint.trackPosition > corner.apex + 0.01 ? 'late' : 'optimal';

    // Analyze exit
    const exitPoints = cornerPoints.filter(p => 
      p.trackPosition > corner.apex + (corner.end - corner.apex) * 0.5
    );
    const exitLine = this.analyzeExitLine(exitPoints, corner);

    // Calculate time loss
    const speedDelta = minSpeedPoint.speed - optimalMinSpeed;
    const timeLoss = Math.max(0, -speedDelta * 5); // 5ms per km/h slower

    // Collect issues
    const issues: LineIssue[] = [];
    if (!apexHit) {
      issues.push({
        type: apexTiming === 'early' ? 'early_apex' : 'late_apex',
        severity: 'moderate',
        description: `Apex ${apexTiming}`,
        suggestion: apexTiming === 'early' ? 'Delay turn-in' : 'Turn in earlier',
        timeCost: 30,
      });
    }

    // Calculate overall rating
    const overallRating = Math.max(0, 100 - timeLoss / 5 - issues.length * 10);

    return {
      cornerNumber: corner.number,
      cornerName: corner.name,
      entryLine,
      apexHit,
      apexTiming,
      exitLine,
      minSpeed: minSpeedPoint.speed,
      optimalMinSpeed,
      speedDelta,
      timeLoss,
      issues,
      overallRating,
    };
  }

  private createEmptyCornerAnalysis(corner: { number: number; name: string; start: number; apex: number; end: number }): CornerLineAnalysis {
    return {
      cornerNumber: corner.number,
      cornerName: corner.name,
      entryLine: 'optimal',
      apexHit: true,
      apexTiming: 'optimal',
      exitLine: 'optimal',
      minSpeed: 0,
      optimalMinSpeed: 0,
      speedDelta: 0,
      timeLoss: 0,
      issues: [],
      overallRating: 100,
    };
  }

  private getOptimalMinSpeedForCorner(corner: { number: number; name: string; start: number; apex: number; end: number }): number {
    if (!this.optimalLine) return 100;

    const optimalCornerPoints = this.optimalLine.points.filter(p =>
      p.trackPosition >= corner.start && p.trackPosition <= corner.end
    );

    if (optimalCornerPoints.length === 0) return 100;

    return Math.min(...optimalCornerPoints.map(p => p.speed));
  }

  private analyzeEntryLine(points: RecordedPoint[], corner: { number: number; name: string; start: number; apex: number; end: number }): 'optimal' | 'wide' | 'tight' {
    if (points.length === 0 || !this.optimalLine) return 'optimal';

    // Compare average steering angle to optimal
    const avgSteering = points.reduce((sum, p) => sum + Math.abs(p.steering), 0) / points.length;
    const optimalPoints = this.optimalLine.points.filter(p =>
      p.trackPosition >= corner.start && p.trackPosition < corner.apex
    );
    
    if (optimalPoints.length === 0) return 'optimal';
    
    const optimalAvgSteering = optimalPoints.reduce((sum, p) => sum + Math.abs(p.steering), 0) / optimalPoints.length;

    if (avgSteering < optimalAvgSteering - 0.1) return 'wide';
    if (avgSteering > optimalAvgSteering + 0.1) return 'tight';
    return 'optimal';
  }

  private analyzeExitLine(points: RecordedPoint[], corner: { number: number; name: string; start: number; apex: number; end: number }): 'optimal' | 'wide' | 'tight' {
    if (points.length === 0) return 'optimal';

    // Check throttle application
    const avgThrottle = points.reduce((sum, p) => sum + p.throttle, 0) / points.length;
    
    if (avgThrottle < 0.6) return 'tight'; // Not getting on power = tight exit
    return 'optimal';
  }

  private generateRecommendations(analyses: CornerLineAnalysis[]): string[] {
    const recommendations: string[] = [];

    // Find patterns
    const earlyApexCount = analyses.filter(a => a.apexTiming === 'early').length;
    const lateApexCount = analyses.filter(a => a.apexTiming === 'late').length;
    const lowSpeedCorners = analyses.filter(a => a.speedDelta < -10);

    if (earlyApexCount > analyses.length / 3) {
      recommendations.push('Pattern: Apexing too early in many corners - focus on patience at turn-in');
    }

    if (lateApexCount > analyses.length / 3) {
      recommendations.push('Pattern: Apexing too late - try turning in slightly earlier');
    }

    if (lowSpeedCorners.length > 0) {
      const worstCorner = lowSpeedCorners.reduce((w, c) => c.speedDelta < w.speedDelta ? c : w);
      recommendations.push(`Focus area: ${worstCorner.cornerName} - losing ${Math.abs(worstCorner.speedDelta).toFixed(0)} km/h vs optimal`);
    }

    // Add top 3 corner-specific recommendations
    const sortedByLoss = [...analyses].sort((a, b) => b.timeLoss - a.timeLoss);
    for (let i = 0; i < Math.min(3, sortedByLoss.length); i++) {
      const corner = sortedByLoss[i];
      if (corner.timeLoss > 50 && corner.issues.length > 0) {
        recommendations.push(`${corner.cornerName}: ${corner.issues[0].suggestion}`);
      }
    }

    return recommendations;
  }

  // ============================================================================
  // STATE
  // ============================================================================

  getOptimalLine(): OptimalLine | null {
    return this.optimalLine;
  }

  getCurrentLapPoints(): LinePoint[] {
    return this.currentLapPoints.map(p => ({
      trackPosition: p.trackPosition,
      x: p.x,
      y: p.y,
      speed: p.speed,
      throttle: p.throttle,
      brake: p.brake,
      steering: p.steering,
      gear: p.gear,
    }));
  }

  subscribe(listener: (comparison: LineComparison) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeToAnalysis(listener: (analysis: LapLineAnalysis) => void): () => void {
    this.analysisListeners.add(listener);
    return () => this.analysisListeners.delete(listener);
  }

  private notifyListeners(comparison: LineComparison): void {
    this.listeners.forEach(l => l(comparison));
  }

  private notifyAnalysis(analysis: LapLineAnalysis): void {
    this.analysisListeners.forEach(l => l(analysis));
  }

  reset(): void {
    this.currentLapPoints = [];
    this.bestLapPoints = [];
    this.lastTrackPosition = 0;
    this.lapStartTime = 0;
  }
}

export const RacingLineOptimizer = new RacingLineOptimizerClass();
export default RacingLineOptimizer;
