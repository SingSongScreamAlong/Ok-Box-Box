/**
 * Track Data System
 * Based on the lovely-track-data format with our own enhancements
 * Contains track metadata, turn data, sectors, and SVG path coordinates
 */

export interface TrackTurn {
  name?: string;
  number?: number;
  marker: number; // Percentage point of apex (0-100)
  scale?: 1 | 2 | 3 | 4 | 5 | 6; // 1=Hairpin, 6=Wide/Fast
  direction: 0 | 1; // 0=Left, 1=Right
  start: number; // Percentage point of turn start
  end: number; // Percentage point of turn end
}

export interface TrackStraight {
  name: string;
  start: number;
  end: number;
}

export interface TrackSector {
  name: string;
  marker: number; // Percentage point where sector starts
  color?: string;
}

export interface TrackCoordinate {
  x: number;
  y: number;
  pct: number; // Track percentage (0-100)
}

export interface TrackData {
  id: string;
  name: string;
  trackId: string; // iRacing track ID
  country: string; // ISO 3166 Alpha 2
  year?: number;
  length: number; // meters
  pitEntry: number; // percentage
  pitExit: number; // percentage
  turns: TrackTurn[];
  straights: TrackStraight[];
  sectors: TrackSector[];
  coordinates: TrackCoordinate[]; // SVG path points
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  startFinishPct: number; // Where start/finish line is
  drsZones?: { start: number; end: number }[];
}

// ============================================================================
// TRACK DATABASE
// ============================================================================

export const tracks: Record<string, TrackData> = {
  // Spa-Francorchamps
  'spa': {
    id: 'spa',
    name: 'Circuit de Spa-Francorchamps',
    trackId: 'spa francorchamps',
    country: 'BE',
    year: 1921,
    length: 7004,
    pitEntry: 96,
    pitExit: 3,
    startFinishPct: 0,
    turns: [
      { number: 1, name: 'La Source', marker: 2, scale: 1, direction: 1, start: 1, end: 4 },
      { number: 2, name: 'Eau Rouge', marker: 8, scale: 4, direction: 0, start: 7, end: 10 },
      { number: 3, name: 'Raidillon', marker: 11, scale: 3, direction: 1, start: 10, end: 13 },
      { number: 4, name: 'Kemmel', marker: 20, scale: 5, direction: 0, start: 19, end: 22 },
      { number: 5, name: 'Les Combes', marker: 28, scale: 2, direction: 1, start: 26, end: 32 },
      { number: 6, name: 'Malmedy', marker: 35, scale: 3, direction: 1, start: 33, end: 37 },
      { number: 7, name: 'Rivage', marker: 42, scale: 1, direction: 1, start: 40, end: 45 },
      { number: 8, name: 'Pouhon', marker: 55, scale: 4, direction: 0, start: 52, end: 60 },
      { number: 9, name: 'Fagnes', marker: 65, scale: 3, direction: 0, start: 63, end: 68 },
      { number: 10, name: 'Stavelot', marker: 72, scale: 2, direction: 1, start: 70, end: 75 },
      { number: 11, name: 'Paul Frère', marker: 78, scale: 4, direction: 1, start: 76, end: 80 },
      { number: 12, name: 'Blanchimont', marker: 85, scale: 5, direction: 0, start: 83, end: 88 },
      { number: 13, name: 'Bus Stop', marker: 94, scale: 1, direction: 1, start: 92, end: 98 },
    ],
    straights: [
      { name: 'Kemmel Straight', start: 13, end: 26 },
      { name: 'Blanchimont Straight', start: 88, end: 92 },
    ],
    sectors: [
      { name: 'Sector 1', marker: 0, color: '#EF4444' },
      { name: 'Sector 2', marker: 33, color: '#3B82F6' },
      { name: 'Sector 3', marker: 66, color: '#F59E0B' },
    ],
    coordinates: generateTrackCoordinates('spa'),
    bounds: { minX: 0, maxX: 400, minY: 0, maxY: 300 },
  },

  // Monza
  'monza': {
    id: 'monza',
    name: 'Autodromo Nazionale Monza',
    trackId: 'monza',
    country: 'IT',
    year: 1922,
    length: 5793,
    pitEntry: 95,
    pitExit: 5,
    startFinishPct: 0,
    turns: [
      { number: 1, name: 'Variante del Rettifilo', marker: 8, scale: 1, direction: 1, start: 6, end: 12 },
      { number: 2, name: 'Curva Grande', marker: 22, scale: 5, direction: 1, start: 18, end: 28 },
      { number: 3, name: 'Variante della Roggia', marker: 35, scale: 1, direction: 0, start: 32, end: 40 },
      { number: 4, name: 'Lesmo 1', marker: 48, scale: 3, direction: 1, start: 45, end: 52 },
      { number: 5, name: 'Lesmo 2', marker: 56, scale: 3, direction: 1, start: 53, end: 60 },
      { number: 6, name: 'Ascari', marker: 72, scale: 2, direction: 0, start: 68, end: 78 },
      { number: 7, name: 'Parabolica', marker: 92, scale: 4, direction: 1, start: 88, end: 98 },
    ],
    straights: [
      { name: 'Main Straight', start: 98, end: 6 },
      { name: 'Back Straight', start: 60, end: 68 },
    ],
    sectors: [
      { name: 'Sector 1', marker: 0, color: '#EF4444' },
      { name: 'Sector 2', marker: 33, color: '#3B82F6' },
      { name: 'Sector 3', marker: 66, color: '#F59E0B' },
    ],
    coordinates: generateTrackCoordinates('monza'),
    bounds: { minX: 0, maxX: 350, minY: 0, maxY: 400 },
  },

  // Silverstone
  'silverstone': {
    id: 'silverstone',
    name: 'Silverstone Circuit',
    trackId: 'silverstone',
    country: 'GB',
    year: 1948,
    length: 5891,
    pitEntry: 94,
    pitExit: 4,
    startFinishPct: 0,
    turns: [
      { number: 1, name: 'Abbey', marker: 3, scale: 4, direction: 1, start: 1, end: 6 },
      { number: 2, name: 'Farm', marker: 10, scale: 3, direction: 0, start: 8, end: 13 },
      { number: 3, name: 'Village', marker: 18, scale: 2, direction: 1, start: 15, end: 22 },
      { number: 4, name: 'The Loop', marker: 26, scale: 2, direction: 0, start: 23, end: 30 },
      { number: 5, name: 'Aintree', marker: 34, scale: 3, direction: 1, start: 31, end: 38 },
      { number: 6, name: 'Wellington Straight', marker: 42, scale: 5, direction: 1, start: 40, end: 45 },
      { number: 7, name: 'Brooklands', marker: 50, scale: 2, direction: 0, start: 47, end: 54 },
      { number: 8, name: 'Luffield', marker: 58, scale: 2, direction: 0, start: 55, end: 62 },
      { number: 9, name: 'Woodcote', marker: 66, scale: 4, direction: 1, start: 63, end: 70 },
      { number: 10, name: 'Copse', marker: 75, scale: 4, direction: 1, start: 72, end: 78 },
      { number: 11, name: 'Maggotts', marker: 82, scale: 4, direction: 0, start: 79, end: 85 },
      { number: 12, name: 'Becketts', marker: 87, scale: 3, direction: 1, start: 85, end: 90 },
      { number: 13, name: 'Chapel', marker: 92, scale: 4, direction: 0, start: 90, end: 95 },
    ],
    straights: [
      { name: 'Hangar Straight', start: 95, end: 1 },
      { name: 'Wellington Straight', start: 38, end: 47 },
    ],
    sectors: [
      { name: 'Sector 1', marker: 0, color: '#EF4444' },
      { name: 'Sector 2', marker: 33, color: '#3B82F6' },
      { name: 'Sector 3', marker: 66, color: '#F59E0B' },
    ],
    coordinates: generateTrackCoordinates('silverstone'),
    bounds: { minX: 0, maxX: 400, minY: 0, maxY: 350 },
  },

  // Nürburgring GP
  'nurburgring-gp': {
    id: 'nurburgring-gp',
    name: 'Nürburgring Grand Prix',
    trackId: 'nuerburgring gp',
    country: 'DE',
    year: 1984,
    length: 5148,
    pitEntry: 93,
    pitExit: 5,
    startFinishPct: 0,
    turns: [
      { number: 1, name: 'Yokohama-S', marker: 5, scale: 2, direction: 1, start: 3, end: 10 },
      { number: 2, name: 'Mercedes Arena', marker: 18, scale: 3, direction: 0, start: 14, end: 24 },
      { number: 3, name: 'Dunlop Kehre', marker: 35, scale: 1, direction: 1, start: 32, end: 40 },
      { number: 4, name: 'Michael Schumacher S', marker: 50, scale: 2, direction: 0, start: 45, end: 58 },
      { number: 5, name: 'Bit Kurve', marker: 65, scale: 3, direction: 1, start: 62, end: 70 },
      { number: 6, name: 'Coca-Cola Kurve', marker: 80, scale: 2, direction: 1, start: 76, end: 85 },
      { number: 7, name: 'NGK Schikane', marker: 92, scale: 1, direction: 0, start: 88, end: 97 },
    ],
    straights: [
      { name: 'Start/Finish Straight', start: 97, end: 3 },
      { name: 'Döttinger Höhe', start: 70, end: 76 },
    ],
    sectors: [
      { name: 'Sector 1', marker: 0, color: '#EF4444' },
      { name: 'Sector 2', marker: 33, color: '#3B82F6' },
      { name: 'Sector 3', marker: 66, color: '#F59E0B' },
    ],
    coordinates: generateTrackCoordinates('nurburgring-gp'),
    bounds: { minX: 0, maxX: 400, minY: 0, maxY: 280 },
  },

  // Daytona Road Course
  'daytona-road': {
    id: 'daytona-road',
    name: 'Daytona International Speedway Road Course',
    trackId: 'daytona road',
    country: 'US',
    year: 1959,
    length: 5729,
    pitEntry: 90,
    pitExit: 8,
    startFinishPct: 0,
    turns: [
      { number: 1, name: 'Turn 1', marker: 12, scale: 4, direction: 0, start: 8, end: 18 },
      { number: 2, name: 'International Horseshoe', marker: 28, scale: 1, direction: 1, start: 22, end: 35 },
      { number: 3, name: 'Infield Turn 3', marker: 42, scale: 3, direction: 0, start: 38, end: 48 },
      { number: 4, name: 'Infield Turn 4', marker: 52, scale: 3, direction: 1, start: 48, end: 58 },
      { number: 5, name: 'Infield Turn 5', marker: 62, scale: 2, direction: 0, start: 58, end: 68 },
      { number: 6, name: 'Bus Stop', marker: 78, scale: 1, direction: 1, start: 72, end: 85 },
    ],
    straights: [
      { name: 'Tri-Oval', start: 85, end: 8 },
      { name: 'Back Straight', start: 35, end: 38 },
    ],
    sectors: [
      { name: 'Sector 1', marker: 0, color: '#EF4444' },
      { name: 'Sector 2', marker: 33, color: '#3B82F6' },
      { name: 'Sector 3', marker: 66, color: '#F59E0B' },
    ],
    coordinates: generateTrackCoordinates('daytona-road'),
    bounds: { minX: 0, maxX: 450, minY: 0, maxY: 250 },
  },

  // Suzuka
  'suzuka': {
    id: 'suzuka',
    name: 'Suzuka International Racing Course',
    trackId: 'suzuka',
    country: 'JP',
    year: 1962,
    length: 5807,
    pitEntry: 95,
    pitExit: 3,
    startFinishPct: 0,
    turns: [
      { number: 1, name: 'First Curve', marker: 5, scale: 3, direction: 1, start: 3, end: 8 },
      { number: 2, name: 'S Curves', marker: 14, scale: 3, direction: 0, start: 10, end: 22 },
      { number: 3, name: 'Dunlop', marker: 28, scale: 2, direction: 0, start: 25, end: 32 },
      { number: 4, name: 'Degner 1', marker: 38, scale: 2, direction: 1, start: 35, end: 42 },
      { number: 5, name: 'Degner 2', marker: 45, scale: 2, direction: 1, start: 42, end: 48 },
      { number: 6, name: 'Hairpin', marker: 55, scale: 1, direction: 1, start: 52, end: 60 },
      { number: 7, name: 'Spoon', marker: 68, scale: 3, direction: 0, start: 64, end: 75 },
      { number: 8, name: '130R', marker: 85, scale: 5, direction: 0, start: 82, end: 88 },
      { number: 9, name: 'Casio Triangle', marker: 94, scale: 1, direction: 1, start: 90, end: 98 },
    ],
    straights: [
      { name: 'Main Straight', start: 98, end: 3 },
      { name: 'Back Straight', start: 75, end: 82 },
    ],
    sectors: [
      { name: 'Sector 1', marker: 0, color: '#EF4444' },
      { name: 'Sector 2', marker: 33, color: '#3B82F6' },
      { name: 'Sector 3', marker: 66, color: '#F59E0B' },
    ],
    coordinates: generateTrackCoordinates('suzuka'),
    bounds: { minX: 0, maxX: 400, minY: 0, maxY: 350 },
  },

  // Laguna Seca
  'laguna-seca': {
    id: 'laguna-seca',
    name: 'WeatherTech Raceway Laguna Seca',
    trackId: 'laguna seca',
    country: 'US',
    year: 1957,
    length: 3602,
    pitEntry: 92,
    pitExit: 5,
    startFinishPct: 0,
    turns: [
      { number: 1, name: 'Andretti Hairpin', marker: 8, scale: 1, direction: 1, start: 5, end: 15 },
      { number: 2, name: 'Turn 2', marker: 22, scale: 3, direction: 0, start: 18, end: 28 },
      { number: 3, name: 'Turn 3', marker: 35, scale: 2, direction: 1, start: 30, end: 40 },
      { number: 4, name: 'Turn 4', marker: 45, scale: 3, direction: 0, start: 42, end: 50 },
      { number: 5, name: 'Turn 5', marker: 55, scale: 3, direction: 1, start: 52, end: 60 },
      { number: 6, name: 'Turn 6', marker: 65, scale: 2, direction: 0, start: 62, end: 70 },
      { number: 7, name: 'Rahal Straight', marker: 75, scale: 5, direction: 1, start: 72, end: 78 },
      { number: 8, name: 'Corkscrew', marker: 82, scale: 1, direction: 0, start: 78, end: 88 },
      { number: 9, name: 'Rainey Curve', marker: 92, scale: 3, direction: 1, start: 88, end: 96 },
    ],
    straights: [
      { name: 'Main Straight', start: 96, end: 5 },
    ],
    sectors: [
      { name: 'Sector 1', marker: 0, color: '#EF4444' },
      { name: 'Sector 2', marker: 33, color: '#3B82F6' },
      { name: 'Sector 3', marker: 66, color: '#F59E0B' },
    ],
    coordinates: generateTrackCoordinates('laguna-seca'),
    bounds: { minX: 0, maxX: 350, minY: 0, maxY: 300 },
  },

  // Road America
  'road-america': {
    id: 'road-america',
    name: 'Road America',
    trackId: 'road america',
    country: 'US',
    year: 1955,
    length: 6515,
    pitEntry: 94,
    pitExit: 4,
    startFinishPct: 0,
    turns: [
      { number: 1, name: 'Turn 1', marker: 5, scale: 3, direction: 1, start: 3, end: 10 },
      { number: 2, name: 'Turn 2', marker: 12, scale: 3, direction: 0, start: 10, end: 16 },
      { number: 3, name: 'Turn 3', marker: 20, scale: 2, direction: 1, start: 17, end: 25 },
      { number: 4, name: 'Turn 4', marker: 28, scale: 3, direction: 0, start: 25, end: 32 },
      { number: 5, name: 'Turn 5', marker: 38, scale: 4, direction: 1, start: 35, end: 42 },
      { number: 6, name: 'Carousel', marker: 52, scale: 4, direction: 1, start: 48, end: 58 },
      { number: 7, name: 'Kink', marker: 65, scale: 5, direction: 0, start: 62, end: 70 },
      { number: 8, name: 'Turn 8', marker: 75, scale: 3, direction: 1, start: 72, end: 80 },
      { number: 9, name: 'Canada Corner', marker: 85, scale: 2, direction: 0, start: 82, end: 90 },
      { number: 10, name: 'Thunder Valley', marker: 92, scale: 3, direction: 1, start: 90, end: 95 },
      { number: 11, name: 'Turn 14', marker: 97, scale: 2, direction: 0, start: 95, end: 99 },
    ],
    straights: [
      { name: 'Main Straight', start: 99, end: 3 },
      { name: 'Kettle Bottoms', start: 42, end: 48 },
    ],
    sectors: [
      { name: 'Sector 1', marker: 0, color: '#EF4444' },
      { name: 'Sector 2', marker: 33, color: '#3B82F6' },
      { name: 'Sector 3', marker: 66, color: '#F59E0B' },
    ],
    coordinates: generateTrackCoordinates('road-america'),
    bounds: { minX: 0, maxX: 450, minY: 0, maxY: 350 },
  },
};

// ============================================================================
// TRACK COORDINATE GENERATION
// ============================================================================

function generateTrackCoordinates(trackId: string): TrackCoordinate[] {
  // Generate approximate track coordinates based on track layout
  // These are simplified representations for SVG rendering
  const coords: TrackCoordinate[] = [];
  
  switch (trackId) {
    case 'spa':
      // Spa-Francorchamps - figure-8 style with elevation
      for (let i = 0; i <= 100; i++) {
        const pct = i;
        let x, y;
        
        if (pct < 5) { // Start/La Source
          x = 200 + pct * 8;
          y = 280 - pct * 10;
        } else if (pct < 15) { // Eau Rouge/Raidillon
          x = 240 + (pct - 5) * 12;
          y = 230 - (pct - 5) * 15;
        } else if (pct < 30) { // Kemmel Straight
          x = 360 - (pct - 15) * 2;
          y = 80 + (pct - 15) * 2;
        } else if (pct < 45) { // Les Combes to Rivage
          x = 330 - (pct - 30) * 8;
          y = 110 + (pct - 30) * 6;
        } else if (pct < 60) { // Pouhon
          x = 210 - (pct - 45) * 6;
          y = 200 + Math.sin((pct - 45) / 15 * Math.PI) * 40;
        } else if (pct < 75) { // Fagnes/Stavelot
          x = 120 + (pct - 60) * 2;
          y = 200 - (pct - 60) * 4;
        } else if (pct < 90) { // Blanchimont
          x = 150 + (pct - 75) * 4;
          y = 140 + (pct - 75) * 8;
        } else { // Bus Stop to Start
          x = 210 - (pct - 90) * 1;
          y = 260 + (pct - 90) * 2;
        }
        
        coords.push({ x, y, pct });
      }
      break;
      
    case 'monza':
      // Monza - fast flowing circuit
      for (let i = 0; i <= 100; i++) {
        const pct = i;
        const angle = (pct / 100) * Math.PI * 2;
        let x = 175 + Math.cos(angle) * 120 + Math.cos(angle * 2) * 40;
        let y = 200 + Math.sin(angle) * 150 + Math.sin(angle * 3) * 20;
        coords.push({ x, y, pct });
      }
      break;
      
    case 'silverstone':
      // Silverstone - complex flowing layout
      for (let i = 0; i <= 100; i++) {
        const pct = i;
        const angle = (pct / 100) * Math.PI * 2;
        let x = 200 + Math.cos(angle) * 140 + Math.cos(angle * 2) * 50;
        let y = 175 + Math.sin(angle) * 120 + Math.sin(angle * 3) * 30;
        coords.push({ x, y, pct });
      }
      break;
      
    case 'nurburgring-gp':
      // Nürburgring GP - technical layout
      for (let i = 0; i <= 100; i++) {
        const pct = i;
        const angle = (pct / 100) * Math.PI * 2;
        let x = 200 + Math.cos(angle) * 150 + Math.cos(angle * 2) * 30;
        let y = 140 + Math.sin(angle) * 100 + Math.sin(angle * 2) * 25;
        coords.push({ x, y, pct });
      }
      break;
      
    case 'daytona-road':
      // Daytona - oval with infield
      for (let i = 0; i <= 100; i++) {
        const pct = i;
        let x, y;
        
        if (pct < 20) { // Tri-oval
          x = 50 + pct * 18;
          y = 200 - Math.sin(pct / 20 * Math.PI) * 30;
        } else if (pct < 50) { // Infield section
          x = 410 - (pct - 20) * 8;
          y = 200 - (pct - 20) * 4;
        } else if (pct < 80) { // Back section
          x = 170 + (pct - 50) * 4;
          y = 80 + (pct - 50) * 3;
        } else { // Return to tri-oval
          x = 290 - (pct - 80) * 12;
          y = 170 + (pct - 80) * 1.5;
        }
        
        coords.push({ x, y, pct });
      }
      break;
      
    case 'suzuka':
      // Suzuka - figure-8 crossover
      for (let i = 0; i <= 100; i++) {
        const pct = i;
        const angle = (pct / 100) * Math.PI * 2;
        // Figure-8 pattern
        let x = 200 + Math.sin(angle) * 150;
        let y = 175 + Math.sin(angle * 2) * 100;
        coords.push({ x, y, pct });
      }
      break;
      
    case 'laguna-seca':
      // Laguna Seca - elevation changes
      for (let i = 0; i <= 100; i++) {
        const pct = i;
        const angle = (pct / 100) * Math.PI * 2;
        let x = 175 + Math.cos(angle) * 120 + Math.cos(angle * 3) * 25;
        let y = 150 + Math.sin(angle) * 100 + Math.sin(angle * 2) * 30;
        coords.push({ x, y, pct });
      }
      break;
      
    case 'road-america':
      // Road America - long flowing circuit
      for (let i = 0; i <= 100; i++) {
        const pct = i;
        const angle = (pct / 100) * Math.PI * 2;
        let x = 225 + Math.cos(angle) * 170 + Math.cos(angle * 2) * 40;
        let y = 175 + Math.sin(angle) * 130 + Math.sin(angle * 3) * 25;
        coords.push({ x, y, pct });
      }
      break;
      
    default:
      // Generic oval
      for (let i = 0; i <= 100; i++) {
        const pct = i;
        const angle = (pct / 100) * Math.PI * 2;
        let x = 200 + Math.cos(angle) * 150;
        let y = 150 + Math.sin(angle) * 100;
        coords.push({ x, y, pct });
      }
  }
  
  return coords;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getTrackById(id: string): TrackData | null {
  return tracks[id] || null;
}

export function getTrackByName(name: string): TrackData | null {
  const lowerName = name.toLowerCase();
  for (const track of Object.values(tracks)) {
    if (track.name.toLowerCase().includes(lowerName) || 
        track.trackId.toLowerCase().includes(lowerName)) {
      return track;
    }
  }
  return null;
}

export function getAllTracks(): TrackData[] {
  return Object.values(tracks);
}

export function getTrackCoordinateAtPosition(track: TrackData, position: number): { x: number; y: number } {
  // Position is 0-1, find the closest coordinate
  const pct = position * 100;
  
  let closest = track.coordinates[0];
  let minDiff = Math.abs(closest.pct - pct);
  
  for (const coord of track.coordinates) {
    const diff = Math.abs(coord.pct - pct);
    if (diff < minDiff) {
      minDiff = diff;
      closest = coord;
    }
  }
  
  return { x: closest.x, y: closest.y };
}

export function getTurnAtPosition(track: TrackData, position: number): TrackTurn | null {
  const pct = position * 100;
  
  for (const turn of track.turns) {
    if (pct >= turn.start && pct <= turn.end) {
      return turn;
    }
  }
  
  return null;
}

export function getSectorAtPosition(track: TrackData, position: number): TrackSector | null {
  const pct = position * 100;
  
  let currentSector = track.sectors[0];
  
  for (const sector of track.sectors) {
    if (pct >= sector.marker) {
      currentSector = sector;
    }
  }
  
  return currentSector;
}

export function generateSVGPath(track: TrackData): string {
  if (track.coordinates.length === 0) return '';
  
  const coords = track.coordinates;
  let path = `M ${coords[0].x} ${coords[0].y}`;
  
  for (let i = 1; i < coords.length; i++) {
    path += ` L ${coords[i].x} ${coords[i].y}`;
  }
  
  path += ' Z'; // Close the path
  
  return path;
}
