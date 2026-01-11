/**
 * Penalty & Championship Tracker
 * Track penalties, time to serve, championship points, and what-if scenarios
 */

export interface Penalty {
  id: string;
  type: 'time' | 'position' | 'drive_through' | 'stop_go' | 'disqualification' | 'warning';
  reason: string;
  timeAmount?: number; // seconds for time penalty
  positionAmount?: number; // positions for position penalty
  served: boolean;
  lapIssued: number;
  lapToServe?: number; // For pit lane penalties
  timestamp: number;
}

export interface PenaltyState {
  activePenalties: Penalty[];
  servedPenalties: Penalty[];
  totalTimePenalty: number;
  warningCount: number;
  incidentPoints: number;
  licenseLevel: string;
}

export interface ChampionshipStanding {
  position: number;
  driver: string;
  team: string;
  points: number;
  wins: number;
  podiums: number;
  poles: number;
  fastestLaps: number;
  dnfs: number;
  gapToLeader: number;
  gapToNext: number;
}

export interface ChampionshipState {
  standings: ChampionshipStanding[];
  playerPosition: number;
  playerPoints: number;
  racesRemaining: number;
  maxPointsAvailable: number;
  canWinChampionship: boolean;
  mathematicallyEliminated: boolean;
}

export interface WhatIfScenario {
  name: string;
  description: string;
  playerFinish: number;
  competitorFinishes: Map<string, number>;
  resultingPoints: number;
  resultingPosition: number;
  championshipImpact: string;
}

export interface PointsSystem {
  positions: number[]; // Points for each position [25, 18, 15, ...]
  fastestLap: number;
  polePosition: number;
  sprintRace?: number[];
}

const DEFAULT_POINTS_SYSTEM: PointsSystem = {
  positions: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
  fastestLap: 1,
  polePosition: 0,
};

class PenaltyTrackerClass {
  private penaltyState: PenaltyState = {
    activePenalties: [],
    servedPenalties: [],
    totalTimePenalty: 0,
    warningCount: 0,
    incidentPoints: 0,
    licenseLevel: 'A',
  };

  private championshipState: ChampionshipState = {
    standings: [],
    playerPosition: 0,
    playerPoints: 0,
    racesRemaining: 0,
    maxPointsAvailable: 0,
    canWinChampionship: true,
    mathematicallyEliminated: false,
  };

  private pointsSystem: PointsSystem = DEFAULT_POINTS_SYSTEM;
  private playerName = 'Player';

  private penaltyListeners: Set<(state: PenaltyState) => void> = new Set();
  private championshipListeners: Set<(state: ChampionshipState) => void> = new Set();

  // ============================================================================
  // PENALTY TRACKING
  // ============================================================================

  addPenalty(penalty: Omit<Penalty, 'id' | 'served' | 'timestamp'>): Penalty {
    const newPenalty: Penalty = {
      ...penalty,
      id: `penalty-${Date.now()}`,
      served: false,
      timestamp: Date.now(),
    };

    this.penaltyState.activePenalties.push(newPenalty);

    // Update totals
    if (penalty.type === 'time' && penalty.timeAmount) {
      this.penaltyState.totalTimePenalty += penalty.timeAmount;
    }
    if (penalty.type === 'warning') {
      this.penaltyState.warningCount++;
    }

    this.notifyPenaltyListeners();
    return newPenalty;
  }

  servePenalty(penaltyId: string): void {
    const penalty = this.penaltyState.activePenalties.find(p => p.id === penaltyId);
    if (penalty) {
      penalty.served = true;
      this.penaltyState.activePenalties = this.penaltyState.activePenalties.filter(p => p.id !== penaltyId);
      this.penaltyState.servedPenalties.push(penalty);
      this.notifyPenaltyListeners();
    }
  }

  clearPenalty(penaltyId: string): void {
    const penalty = this.penaltyState.activePenalties.find(p => p.id === penaltyId);
    if (penalty) {
      if (penalty.type === 'time' && penalty.timeAmount) {
        this.penaltyState.totalTimePenalty -= penalty.timeAmount;
      }
      this.penaltyState.activePenalties = this.penaltyState.activePenalties.filter(p => p.id !== penaltyId);
      this.notifyPenaltyListeners();
    }
  }

  addIncidentPoints(points: number, reason: string): void {
    this.penaltyState.incidentPoints += points;
    
    // Check for license level changes
    this.updateLicenseLevel();
    
    // Add warning if approaching limit
    if (this.penaltyState.incidentPoints >= 8) {
      this.addPenalty({
        type: 'warning',
        reason: `High incident points (${this.penaltyState.incidentPoints}) - ${reason}`,
        lapIssued: 0,
      });
    }

    this.notifyPenaltyListeners();
  }

  private updateLicenseLevel(): void {
    const points = this.penaltyState.incidentPoints;
    if (points >= 12) this.penaltyState.licenseLevel = 'D';
    else if (points >= 8) this.penaltyState.licenseLevel = 'C';
    else if (points >= 4) this.penaltyState.licenseLevel = 'B';
    else this.penaltyState.licenseLevel = 'A';
  }

  getPenaltyState(): PenaltyState {
    return { ...this.penaltyState };
  }

  getActivePenalties(): Penalty[] {
    return [...this.penaltyState.activePenalties];
  }

  getTimeToServe(): number {
    return this.penaltyState.activePenalties
      .filter(p => p.type === 'time' && !p.served)
      .reduce((sum, p) => sum + (p.timeAmount || 0), 0);
  }

  hasPitLanePenalty(): boolean {
    return this.penaltyState.activePenalties.some(
      p => (p.type === 'drive_through' || p.type === 'stop_go') && !p.served
    );
  }

  // ============================================================================
  // CHAMPIONSHIP TRACKING
  // ============================================================================

  setPointsSystem(system: PointsSystem): void {
    this.pointsSystem = system;
  }

  setPlayerName(name: string): void {
    this.playerName = name;
  }

  updateStandings(standings: ChampionshipStanding[], racesRemaining: number): void {
    this.championshipState.standings = standings;
    this.championshipState.racesRemaining = racesRemaining;

    // Find player position
    const playerStanding = standings.find(s => s.driver === this.playerName);
    if (playerStanding) {
      this.championshipState.playerPosition = playerStanding.position;
      this.championshipState.playerPoints = playerStanding.points;
    }

    // Calculate max points available
    const maxPerRace = this.pointsSystem.positions[0] + this.pointsSystem.fastestLap;
    this.championshipState.maxPointsAvailable = racesRemaining * maxPerRace;

    // Check championship status
    this.updateChampionshipStatus();

    this.notifyChampionshipListeners();
  }

  private updateChampionshipStatus(): void {
    const { standings, playerPoints, maxPointsAvailable } = this.championshipState;
    
    if (standings.length === 0) return;

    const leader = standings[0];
    const playerMaxPossible = playerPoints + maxPointsAvailable;

    // Can win championship?
    this.championshipState.canWinChampionship = playerMaxPossible >= leader.points;

    // Mathematically eliminated?
    this.championshipState.mathematicallyEliminated = playerMaxPossible < leader.points;
  }

  addRaceResult(position: number, hasFastestLap: boolean, hasPole: boolean): void {
    const points = this.calculatePoints(position, hasFastestLap, hasPole);
    
    // Update player standing
    const playerStanding = this.championshipState.standings.find(s => s.driver === this.playerName);
    if (playerStanding) {
      playerStanding.points += points;
      if (position === 1) playerStanding.wins++;
      if (position <= 3) playerStanding.podiums++;
      if (hasPole) playerStanding.poles++;
      if (hasFastestLap) playerStanding.fastestLaps++;
    }

    // Re-sort standings
    this.championshipState.standings.sort((a, b) => b.points - a.points);
    
    // Update positions
    this.championshipState.standings.forEach((s, i) => {
      s.position = i + 1;
      s.gapToLeader = this.championshipState.standings[0].points - s.points;
      s.gapToNext = i > 0 ? this.championshipState.standings[i - 1].points - s.points : 0;
    });

    this.championshipState.racesRemaining--;
    this.updateChampionshipStatus();
    this.notifyChampionshipListeners();
  }

  private calculatePoints(position: number, hasFastestLap: boolean, hasPole: boolean): number {
    let points = 0;
    
    if (position <= this.pointsSystem.positions.length) {
      points += this.pointsSystem.positions[position - 1];
    }
    
    if (hasFastestLap && position <= 10) {
      points += this.pointsSystem.fastestLap;
    }
    
    if (hasPole) {
      points += this.pointsSystem.polePosition;
    }

    return points;
  }

  // ============================================================================
  // WHAT-IF SCENARIOS
  // ============================================================================

  simulateScenario(playerFinish: number, competitorFinishes: Map<string, number>): WhatIfScenario {
    // Clone current standings
    const simStandings = this.championshipState.standings.map(s => ({ ...s }));

    // Apply player result
    const playerStanding = simStandings.find(s => s.driver === this.playerName);
    if (playerStanding) {
      playerStanding.points += this.calculatePoints(playerFinish, false, false);
    }

    // Apply competitor results
    for (const [driver, finish] of competitorFinishes) {
      const standing = simStandings.find(s => s.driver === driver);
      if (standing) {
        standing.points += this.calculatePoints(finish, false, false);
      }
    }

    // Sort by points
    simStandings.sort((a, b) => b.points - a.points);

    // Find new player position
    const newPlayerStanding = simStandings.find(s => s.driver === this.playerName);
    const newPosition = newPlayerStanding ? simStandings.indexOf(newPlayerStanding) + 1 : 0;
    const newPoints = newPlayerStanding?.points || 0;

    // Determine impact
    let impact = '';
    const currentPos = this.championshipState.playerPosition;
    if (newPosition < currentPos) {
      impact = `Gain ${currentPos - newPosition} position(s) in championship`;
    } else if (newPosition > currentPos) {
      impact = `Lose ${newPosition - currentPos} position(s) in championship`;
    } else {
      impact = 'Championship position unchanged';
    }

    return {
      name: `P${playerFinish} Finish`,
      description: `Finishing P${playerFinish} in this race`,
      playerFinish,
      competitorFinishes,
      resultingPoints: newPoints,
      resultingPosition: newPosition,
      championshipImpact: impact,
    };
  }

  getWinScenarios(): WhatIfScenario[] {
    const scenarios: WhatIfScenario[] = [];
    const { standings, playerPosition, racesRemaining } = this.championshipState;

    if (standings.length === 0 || racesRemaining === 0) return scenarios;

    // Scenario: Win every remaining race
    const maxPoints = this.pointsSystem.positions[0] + this.pointsSystem.fastestLap;
    const playerMaxPoints = this.championshipState.playerPoints + (racesRemaining * maxPoints);
    
    // Find who we need to beat
    const leader = standings[0];
    
    if (playerPosition > 1) {
      // Calculate what leader needs to score for us to win
      const leaderMinPoints = playerMaxPoints - leader.points;
      const leaderAvgNeeded = leaderMinPoints / racesRemaining;
      
      let description = '';
      if (leaderAvgNeeded <= 0) {
        description = 'Win all remaining races to take the championship';
      } else {
        const leaderPosition = this.pointsSystem.positions.findIndex(p => p <= leaderAvgNeeded) + 1;
        description = `Win all races while ${leader.driver} averages P${leaderPosition || 'DNF'} or worse`;
      }

      scenarios.push({
        name: 'Championship Win',
        description,
        playerFinish: 1,
        competitorFinishes: new Map(),
        resultingPoints: playerMaxPoints,
        resultingPosition: 1,
        championshipImpact: 'Win the championship!',
      });
    }

    // Scenario: Maintain position
    scenarios.push(this.simulateScenario(playerPosition, new Map()));

    // Scenario: Best case (win)
    scenarios.push(this.simulateScenario(1, new Map()));

    // Scenario: Worst case (DNF)
    scenarios.push(this.simulateScenario(20, new Map()));

    return scenarios;
  }

  getChampionshipState(): ChampionshipState {
    return { ...this.championshipState };
  }

  getStandings(): ChampionshipStanding[] {
    return [...this.championshipState.standings];
  }

  // ============================================================================
  // STATE
  // ============================================================================

  subscribe(listener: (state: PenaltyState) => void): () => void {
    this.penaltyListeners.add(listener);
    return () => this.penaltyListeners.delete(listener);
  }

  subscribeToChampionship(listener: (state: ChampionshipState) => void): () => void {
    this.championshipListeners.add(listener);
    return () => this.championshipListeners.delete(listener);
  }

  private notifyPenaltyListeners(): void {
    this.penaltyListeners.forEach(l => l(this.penaltyState));
  }

  private notifyChampionshipListeners(): void {
    this.championshipListeners.forEach(l => l(this.championshipState));
  }

  resetPenalties(): void {
    this.penaltyState = {
      activePenalties: [],
      servedPenalties: [],
      totalTimePenalty: 0,
      warningCount: 0,
      incidentPoints: 0,
      licenseLevel: 'A',
    };
    this.notifyPenaltyListeners();
  }

  resetChampionship(): void {
    this.championshipState = {
      standings: [],
      playerPosition: 0,
      playerPoints: 0,
      racesRemaining: 0,
      maxPointsAvailable: 0,
      canWinChampionship: true,
      mathematicallyEliminated: false,
    };
    this.notifyChampionshipListeners();
  }
}

export const PenaltyTracker = new PenaltyTrackerClass();
export default PenaltyTracker;
