/**
 * Track Map Service
 * Handles track data loading, car positioning, and rendering helpers
 */

import { 
  tracks, 
  getTrackById, 
  getTrackByName, 
  getTrackCoordinateAtPosition,
  getTurnAtPosition,
  getSectorAtPosition,
  generateSVGPath,
  type TrackData,
  type TrackTurn,
  type TrackSector,
} from '../data/tracks';

export interface CarPosition {
  driverId: string;
  driverName: string;
  position: number; // 0-1 track position
  x: number;
  y: number;
  isPlayer: boolean;
  carNumber?: string;
  classColor?: string;
  gap?: number;
  speed?: number;
}

export interface TrackMapState {
  currentTrack: TrackData | null;
  carPositions: CarPosition[];
  playerPosition: number;
  currentTurn: TrackTurn | null;
  currentSector: TrackSector | null;
  svgPath: string;
  viewBox: string;
  isLoaded: boolean;
}

class TrackMapServiceClass {
  private state: TrackMapState = {
    currentTrack: null,
    carPositions: [],
    playerPosition: 0,
    currentTurn: null,
    currentSector: null,
    svgPath: '',
    viewBox: '0 0 400 300',
    isLoaded: false,
  };

  private listeners: Set<(state: TrackMapState) => void> = new Set();

  // ============================================================================
  // TRACK LOADING
  // ============================================================================

  loadTrack(trackNameOrId: string): boolean {
    // Try by ID first
    let track = getTrackById(trackNameOrId.toLowerCase().replace(/\s+/g, '-'));
    
    // Try by name
    if (!track) {
      track = getTrackByName(trackNameOrId);
    }

    if (!track) {
      console.warn(`Track not found: ${trackNameOrId}`);
      this.state.isLoaded = false;
      return false;
    }

    this.state.currentTrack = track;
    this.state.svgPath = generateSVGPath(track);
    this.state.viewBox = `${track.bounds.minX - 20} ${track.bounds.minY - 20} ${track.bounds.maxX - track.bounds.minX + 40} ${track.bounds.maxY - track.bounds.minY + 40}`;
    this.state.isLoaded = true;
    
    this.notifyListeners();
    return true;
  }

  getAvailableTracks(): { id: string; name: string; country: string }[] {
    return Object.values(tracks).map(t => ({
      id: t.id,
      name: t.name,
      country: t.country,
    }));
  }

  // ============================================================================
  // CAR POSITION UPDATES
  // ============================================================================

  updatePlayerPosition(position: number): void {
    if (!this.state.currentTrack) return;

    this.state.playerPosition = position;
    this.state.currentTurn = getTurnAtPosition(this.state.currentTrack, position);
    this.state.currentSector = getSectorAtPosition(this.state.currentTrack, position);
    
    // Update player car in positions array
    const playerIndex = this.state.carPositions.findIndex(c => c.isPlayer);
    const coords = getTrackCoordinateAtPosition(this.state.currentTrack, position);
    
    if (playerIndex >= 0) {
      this.state.carPositions[playerIndex].position = position;
      this.state.carPositions[playerIndex].x = coords.x;
      this.state.carPositions[playerIndex].y = coords.y;
    } else {
      this.state.carPositions.push({
        driverId: 'player',
        driverName: 'You',
        position,
        x: coords.x,
        y: coords.y,
        isPlayer: true,
      });
    }

    this.notifyListeners();
  }

  updateCompetitorPositions(competitors: Array<{
    driverId: string;
    driverName: string;
    position: number;
    carNumber?: string;
    classColor?: string;
    gap?: number;
    speed?: number;
  }>): void {
    if (!this.state.currentTrack) return;

    // Keep player, update/add competitors
    const playerCar = this.state.carPositions.find(c => c.isPlayer);
    
    this.state.carPositions = competitors.map(comp => {
      const coords = getTrackCoordinateAtPosition(this.state.currentTrack!, comp.position);
      return {
        ...comp,
        x: coords.x,
        y: coords.y,
        isPlayer: false,
      };
    });

    if (playerCar) {
      this.state.carPositions.push(playerCar);
    }

    this.notifyListeners();
  }

  // ============================================================================
  // RENDERING HELPERS
  // ============================================================================

  getSectorColors(): { start: number; end: number; color: string }[] {
    if (!this.state.currentTrack) return [];

    const sectors = this.state.currentTrack.sectors;
    const result: { start: number; end: number; color: string }[] = [];

    for (let i = 0; i < sectors.length; i++) {
      const start = sectors[i].marker;
      const end = i < sectors.length - 1 ? sectors[i + 1].marker : 100;
      result.push({
        start: start / 100,
        end: end / 100,
        color: sectors[i].color || '#666',
      });
    }

    return result;
  }

  getTurnMarkers(): Array<{
    x: number;
    y: number;
    number: number;
    name: string;
    direction: 'left' | 'right';
  }> {
    if (!this.state.currentTrack) return [];

    return this.state.currentTrack.turns.map(turn => {
      const coords = getTrackCoordinateAtPosition(this.state.currentTrack!, turn.marker / 100);
      return {
        x: coords.x,
        y: coords.y,
        number: turn.number || 0,
        name: turn.name || `Turn ${turn.number}`,
        direction: turn.direction === 0 ? 'left' : 'right',
      };
    });
  }

  getPitLaneMarkers(): { entry: { x: number; y: number }; exit: { x: number; y: number } } | null {
    if (!this.state.currentTrack) return null;

    const entry = getTrackCoordinateAtPosition(this.state.currentTrack, this.state.currentTrack.pitEntry / 100);
    const exit = getTrackCoordinateAtPosition(this.state.currentTrack, this.state.currentTrack.pitExit / 100);

    return { entry, exit };
  }

  getStartFinishLine(): { x: number; y: number } | null {
    if (!this.state.currentTrack) return null;
    return getTrackCoordinateAtPosition(this.state.currentTrack, this.state.currentTrack.startFinishPct / 100);
  }

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  getState(): TrackMapState {
    return { ...this.state };
  }

  subscribe(listener: (state: TrackMapState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const stateCopy = { ...this.state };
    this.listeners.forEach(listener => listener(stateCopy));
  }

  reset(): void {
    this.state = {
      currentTrack: null,
      carPositions: [],
      playerPosition: 0,
      currentTurn: null,
      currentSector: null,
      svgPath: '',
      viewBox: '0 0 400 300',
      isLoaded: false,
    };
    this.notifyListeners();
  }
}

// Export singleton
export const TrackMapService = new TrackMapServiceClass();
export default TrackMapService;
