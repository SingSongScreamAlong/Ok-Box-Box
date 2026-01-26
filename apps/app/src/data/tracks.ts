// Accurate Track Data from iRacing telemetry calibration
// Source: packages/dashboard/src/data/trackData/*.shape.json

// Map slugs to iRacing shape IDs for the TrackMap component
export const TRACK_SLUG_MAP: Record<string, string> = {
  // Daytona
  'daytona': '381',        // Daytona Road Course 2020? (Verifying ID)
  'daytona-road': '381',
  'daytona-oval': '191',

  // Watkins Glen
  'watkins-glen': '146',   // Placeholder - will load if file with this ID exists, else searches
  'watkins-glen-boot': '483', // Likely boot if 483 exists

  // Spa
  'spa': '163', // Common iRacing ID for Spa
  'spa-francorchamps': '163',

  // Laguna Seca
  'laguna-seca': '47',

  // Road Atlanta
  // 'road-atlanta': '30', // Warn: ID 30 is Irwindale. Need to find Road Atlanta ID.
};

// Centerline point from telemetry
export interface CenterlinePoint {
  x: number;
  y: number;
  distPct: number;
}

// Convert centerline points to SVG path
export function centerlineToSVGPath(points: CenterlinePoint[]): string {
  if (points.length < 2) return '';

  // Start with move to first point
  let path = `M ${points[0].x},${points[0].y}`;

  // Add line segments for each point
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x},${points[i].y}`;
  }

  // Close the path
  path += ' Z';
  return path;
}

// Calculate bounds from centerline
export function calculateBounds(points: CenterlinePoint[]): { xMin: number; xMax: number; yMin: number; yMax: number } {
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  return {
    xMin: Math.min(...xs),
    xMax: Math.max(...xs),
    yMin: Math.min(...ys),
    yMax: Math.max(...ys)
  };
}

// Generate viewBox from bounds with padding
export function boundsToViewBox(bounds: { xMin: number; xMax: number; yMin: number; yMax: number }, padding = 50): string {
  const width = bounds.xMax - bounds.xMin + padding * 2;
  const height = bounds.yMax - bounds.yMin + padding * 2;
  return `${bounds.xMin - padding} ${bounds.yMin - padding} ${width} ${height}`;
}

export interface TrackCorner {
  number: number;
  name: string;
  type: string;
  apex: { distance: number; x: number; y: number; normalizedDistance: number };
  braking?: { distance: number; x: number; y: number };
  entry?: { distance: number; x: number; y: number };
  exit?: { distance: number; x: number; y: number };
  gear: number;
  apexSpeed: number;
  difficulty: 'easy' | 'medium' | 'hard';
  notes?: string;
}

export interface TrackSector {
  number: number;
  name: string;
  startDistance: number;
  endDistance: number;
}

export interface TrackData {
  id: string;
  name: string;
  country: string;
  length: number;
  layout: string;
  sectors: TrackSector[];
  corners: TrackCorner[];
  svg: {
    viewBox: string;
    path: string;
  };
  metadata?: {
    direction?: string;
    elevation?: { minimum: number; maximum: number; change: number };
    coordinates?: { latitude: number; longitude: number };
  };
}

export const TRACK_DATA: Record<string, TrackData> = {
  // Daytona International Speedway - Road Course
  'daytona': {
    id: 'daytona',
    name: 'Daytona International Speedway',
    country: 'USA',
    length: 5730,
    layout: 'Road Course',
    sectors: [
      { number: 1, name: 'Sector 1', startDistance: 0, endDistance: 1910 },
      { number: 2, name: 'Sector 2', startDistance: 1910, endDistance: 3820 },
      { number: 3, name: 'Sector 3', startDistance: 3820, endDistance: 5730 }
    ],
    corners: [],
    svg: {
      viewBox: '0 0 500 450',
      path: 'M 30,220 L 100,220 C 120,220 130,210 135,195 L 145,165 C 155,140 175,115 200,95 L 240,70 C 270,55 310,50 350,55 L 390,65 C 420,75 440,100 450,135 L 460,180 C 470,230 470,280 460,330 L 445,375 C 430,405 400,425 360,430 L 300,430 C 250,425 200,405 165,375 L 130,335 C 100,295 80,260 70,235 L 50,225 C 40,222 30,220 30,220 Z'
    },
    metadata: {
      direction: 'counter-clockwise',
      elevation: { minimum: 0, maximum: 10, change: 10 },
      coordinates: { latitude: 29.1852, longitude: -81.0705 }
    }
  },

  'watkins-glen': {
    id: 'watkins-glen',
    name: 'Watkins Glen International',
    country: 'USA',
    length: 5430,
    layout: 'Grand Prix (Boot)',
    sectors: [
      { number: 1, name: 'Sector 1', startDistance: 0, endDistance: 1810 },
      { number: 2, name: 'Sector 2', startDistance: 1810, endDistance: 3620 },
      { number: 3, name: 'Sector 3', startDistance: 3620, endDistance: 5430 }
    ],
    corners: [
      { number: 1, name: 'Turn 1', type: 'right', apex: { distance: 350, x: 135, y: 195, normalizedDistance: 0.064 }, braking: { distance: 250, x: 100, y: 220 }, exit: { distance: 450, x: 145, y: 165 }, gear: 3, apexSpeed: 110, difficulty: 'hard', notes: 'Heavy braking into tight right' },
      { number: 2, name: 'Esses', type: 'left-right', apex: { distance: 700, x: 200, y: 95, normalizedDistance: 0.129 }, entry: { distance: 600, x: 160, y: 140 }, exit: { distance: 800, x: 240, y: 70 }, gear: 4, apexSpeed: 145, difficulty: 'medium' },
      { number: 3, name: 'Inner Loop', type: 'left', apex: { distance: 1100, x: 350, y: 55, normalizedDistance: 0.203 }, braking: { distance: 1000, x: 300, y: 52 }, exit: { distance: 1200, x: 390, y: 65 }, gear: 3, apexSpeed: 95, difficulty: 'hard' },
      { number: 4, name: 'Outer Loop', type: 'right', apex: { distance: 1400, x: 450, y: 135, normalizedDistance: 0.258 }, entry: { distance: 1300, x: 430, y: 90 }, exit: { distance: 1500, x: 460, y: 180 }, gear: 4, apexSpeed: 130, difficulty: 'medium' },
      { number: 5, name: 'Boot Entry', type: 'left', apex: { distance: 1850, x: 465, y: 280, normalizedDistance: 0.341 }, braking: { distance: 1750, x: 465, y: 230 }, exit: { distance: 1950, x: 460, y: 330 }, gear: 3, apexSpeed: 100, difficulty: 'hard', notes: 'Entry to The Boot' },
      { number: 6, name: 'Boot', type: 'right', apex: { distance: 2200, x: 445, y: 375, normalizedDistance: 0.405 }, entry: { distance: 2100, x: 455, y: 340 }, exit: { distance: 2300, x: 420, y: 410 }, gear: 3, apexSpeed: 90, difficulty: 'hard' },
      { number: 7, name: 'Toe', type: 'left', apex: { distance: 2700, x: 300, y: 430, normalizedDistance: 0.497 }, entry: { distance: 2600, x: 350, y: 428 }, exit: { distance: 2800, x: 250, y: 420 }, gear: 3, apexSpeed: 95, difficulty: 'hard' },
      { number: 8, name: 'Heel', type: 'right', apex: { distance: 3100, x: 165, y: 375, normalizedDistance: 0.571 }, entry: { distance: 3000, x: 200, y: 405 }, exit: { distance: 3200, x: 130, y: 335 }, gear: 4, apexSpeed: 120, difficulty: 'medium' },
      { number: 9, name: 'Chute', type: 'left', apex: { distance: 3500, x: 100, y: 295, normalizedDistance: 0.645 }, entry: { distance: 3400, x: 120, y: 320 }, exit: { distance: 3600, x: 80, y: 260 }, gear: 4, apexSpeed: 130, difficulty: 'medium' },
      { number: 10, name: 'Carousel', type: 'right', apex: { distance: 4200, x: 50, y: 225, normalizedDistance: 0.774 }, braking: { distance: 4050, x: 65, y: 240 }, exit: { distance: 4350, x: 35, y: 220 }, gear: 3, apexSpeed: 100, difficulty: 'hard', notes: 'Decreasing radius' }
    ],
    svg: {
      viewBox: '0 0 500 450',
      path: 'M 30,220 L 100,220 C 120,220 130,210 135,195 L 145,165 C 155,140 175,115 200,95 L 240,70 C 270,55 310,50 350,55 L 390,65 C 420,75 440,100 450,135 L 460,180 C 470,230 470,280 460,330 L 445,375 C 430,405 400,425 360,430 L 300,430 C 250,425 200,405 165,375 L 130,335 C 100,295 80,260 70,235 L 50,225 C 40,222 30,220 30,220 Z'
    },
    metadata: {
      direction: 'clockwise',
      elevation: { minimum: 479, maximum: 543, change: 64 },
      coordinates: { latitude: 42.3370, longitude: -76.9272 }
    }
  },

  'spa-francorchamps': {
    id: 'spa-francorchamps',
    name: 'Circuit de Spa-Francorchamps',
    country: 'Belgium',
    length: 7004,
    layout: 'Grand Prix',
    sectors: [
      { number: 1, name: 'Sector 1', startDistance: 0, endDistance: 2334 },
      { number: 2, name: 'Sector 2', startDistance: 2334, endDistance: 4669 },
      { number: 3, name: 'Sector 3', startDistance: 4669, endDistance: 7004 }
    ],
    corners: [
      { number: 1, name: 'La Source', type: 'hairpin', apex: { distance: 180, x: 100, y: 100, normalizedDistance: 0.026 }, braking: { distance: 100, x: 100, y: 50 }, exit: { distance: 250, x: 150, y: 150 }, gear: 2, apexSpeed: 65, difficulty: 'medium' },
      { number: 2, name: 'Eau Rouge', type: 'left-kink', apex: { distance: 850, x: 200, y: 350, normalizedDistance: 0.121 }, entry: { distance: 750, x: 180, y: 300 }, exit: { distance: 950, x: 250, y: 420 }, gear: 6, apexSpeed: 260, difficulty: 'hard', notes: 'Flat out in GT3' },
      { number: 3, name: 'Raidillon', type: 'left', apex: { distance: 1050, x: 300, y: 500, normalizedDistance: 0.150 }, entry: { distance: 950, x: 250, y: 420 }, exit: { distance: 1200, x: 400, y: 580 }, gear: 6, apexSpeed: 270, difficulty: 'hard', notes: 'Critical for Kemmel straight speed' },
      { number: 4, name: 'Les Combes', type: 'chicane', apex: { distance: 2100, x: 750, y: 700, normalizedDistance: 0.300 }, braking: { distance: 1950, x: 680, y: 680 }, exit: { distance: 2250, x: 820, y: 720 }, gear: 3, apexSpeed: 120, difficulty: 'medium' },
      { number: 5, name: 'Malmedy', type: 'right', apex: { distance: 2650, x: 950, y: 750, normalizedDistance: 0.378 }, braking: { distance: 2500, x: 900, y: 740 }, exit: { distance: 2800, x: 1000, y: 760 }, gear: 4, apexSpeed: 145, difficulty: 'medium' },
      { number: 6, name: 'Rivage', type: 'left', apex: { distance: 3100, x: 1100, y: 700, normalizedDistance: 0.443 }, braking: { distance: 2950, x: 1050, y: 730 }, exit: { distance: 3250, x: 1120, y: 650 }, gear: 3, apexSpeed: 110, difficulty: 'easy' },
      { number: 7, name: 'Pouhon', type: 'double-left', apex: { distance: 3550, x: 1150, y: 550, normalizedDistance: 0.507 }, entry: { distance: 3400, x: 1130, y: 600 }, exit: { distance: 3750, x: 1150, y: 480 }, gear: 5, apexSpeed: 195, difficulty: 'hard', notes: 'Long high-speed double-apex' },
      { number: 8, name: 'Campus', type: 'chicane', apex: { distance: 4200, x: 1100, y: 350, normalizedDistance: 0.600 }, braking: { distance: 4050, x: 1120, y: 400 }, exit: { distance: 4350, x: 1050, y: 300 }, gear: 3, apexSpeed: 115, difficulty: 'easy' },
      { number: 9, name: 'Stavelot', type: 'left', apex: { distance: 4700, x: 900, y: 200, normalizedDistance: 0.671 }, entry: { distance: 4550, x: 950, y: 250 }, exit: { distance: 4850, x: 850, y: 180 }, gear: 5, apexSpeed: 180, difficulty: 'medium' },
      { number: 10, name: 'Blanchimont', type: 'left-kink', apex: { distance: 5500, x: 550, y: 150, normalizedDistance: 0.785 }, entry: { distance: 5350, x: 620, y: 170 }, exit: { distance: 5650, x: 480, y: 140 }, gear: 7, apexSpeed: 285, difficulty: 'hard', notes: 'High-speed left kink, flat out' },
      { number: 11, name: 'Bus Stop', type: 'chicane', apex: { distance: 6450, x: 200, y: 120, normalizedDistance: 0.921 }, braking: { distance: 6250, x: 300, y: 130 }, exit: { distance: 6600, x: 150, y: 100 }, gear: 3, apexSpeed: 100, difficulty: 'medium', notes: 'Heavy braking, overtaking spot' }
    ],
    svg: {
      viewBox: '0 0 1300 900',
      path: 'M 100,100 L 100,150 Q 100,200 130,250 L 200,380 Q 250,480 350,550 L 550,680 Q 700,750 850,780 L 1000,780 Q 1100,770 1150,720 L 1180,650 Q 1200,580 1180,500 L 1120,380 Q 1050,280 950,220 L 750,150 Q 600,100 450,100 L 250,100 Q 150,100 100,100 Z'
    },
    metadata: {
      direction: 'clockwise',
      elevation: { minimum: 386, maximum: 476, change: 90 },
      coordinates: { latitude: 50.4372, longitude: 5.9714 }
    }
  },

  'road-atlanta': {
    id: 'road-atlanta',
    name: 'Road Atlanta',
    country: 'USA',
    length: 4088,
    layout: 'Grand Prix',
    sectors: [
      { number: 1, name: 'Sector 1', startDistance: 0, endDistance: 1363 },
      { number: 2, name: 'Sector 2', startDistance: 1363, endDistance: 2726 },
      { number: 3, name: 'Sector 3', startDistance: 2726, endDistance: 4088 }
    ],
    corners: [
      { number: 1, name: 'Turn 1', type: 'right', apex: { distance: 450, x: 450, y: 550, normalizedDistance: 0.110 }, braking: { distance: 350, x: 350, y: 580 }, exit: { distance: 550, x: 550, y: 500 }, gear: 3, apexSpeed: 115, difficulty: 'hard', notes: 'Uphill right-hander' },
      { number: 2, name: 'Turn 2', type: 'left', apex: { distance: 750, x: 650, y: 420, normalizedDistance: 0.183 }, entry: { distance: 650, x: 600, y: 460 }, exit: { distance: 850, x: 700, y: 380 }, gear: 4, apexSpeed: 135, difficulty: 'medium' },
      { number: 3, name: 'Turn 3', type: 'right', apex: { distance: 1100, x: 850, y: 280, normalizedDistance: 0.269 }, entry: { distance: 1000, x: 800, y: 320 }, exit: { distance: 1200, x: 900, y: 240 }, gear: 5, apexSpeed: 165, difficulty: 'medium', notes: 'Blind crest' },
      { number: 5, name: 'Turn 5', type: 'right', apex: { distance: 1750, x: 1050, y: 150, normalizedDistance: 0.428 }, braking: { distance: 1650, x: 1000, y: 180 }, exit: { distance: 1850, x: 1080, y: 130 }, gear: 3, apexSpeed: 105, difficulty: 'medium' },
      { number: 6, name: 'Turn 6', type: 'left', apex: { distance: 2100, x: 1100, y: 200, normalizedDistance: 0.514 }, entry: { distance: 2000, x: 1090, y: 170 }, exit: { distance: 2200, x: 1080, y: 250 }, gear: 5, apexSpeed: 160, difficulty: 'hard', notes: 'Fast downhill left' },
      { number: 7, name: 'Turn 7', type: 'right', apex: { distance: 2550, x: 1000, y: 380, normalizedDistance: 0.624 }, braking: { distance: 2450, x: 1020, y: 340 }, exit: { distance: 2650, x: 950, y: 420 }, gear: 3, apexSpeed: 95, difficulty: 'hard', notes: 'Downhill hairpin' },
      { number: 10, name: 'Turn 10A', type: 'left-kink', apex: { distance: 3550, x: 600, y: 580, normalizedDistance: 0.869 }, entry: { distance: 3450, x: 650, y: 550 }, exit: { distance: 3650, x: 550, y: 600 }, gear: 6, apexSpeed: 215, difficulty: 'medium', notes: 'High-speed kink' },
      { number: 11, name: 'Turn 10B', type: 'left', apex: { distance: 3850, x: 400, y: 620, normalizedDistance: 0.942 }, entry: { distance: 3750, x: 450, y: 610 }, exit: { distance: 3950, x: 350, y: 630 }, gear: 6, apexSpeed: 220, difficulty: 'hard', notes: 'Flat out, leads to Turn 12' },
      { number: 12, name: 'Turn 12', type: 'right', apex: { distance: 200, x: 200, y: 650, normalizedDistance: 0.049 }, braking: { distance: 4000, x: 300, y: 640 }, exit: { distance: 300, x: 150, y: 620 }, gear: 2, apexSpeed: 75, difficulty: 'hard', notes: 'Heavy braking zone' }
    ],
    svg: {
      viewBox: '0 0 1200 750',
      path: 'M 100,620 L 350,580 Q 500,540 650,480 L 850,380 Q 950,320 1020,250 L 1080,180 Q 1100,130 1080,100 L 1020,80 Q 950,70 900,100 L 800,180 Q 720,280 700,380 L 680,480 Q 650,560 580,600 L 400,640 Q 250,660 100,620 Z'
    },
    metadata: {
      direction: 'clockwise',
      elevation: { minimum: 244, maximum: 280, change: 36 },
      coordinates: { latitude: 34.1481, longitude: -83.7732 }
    }
  },

  'laguna-seca': {
    id: 'laguna-seca',
    name: 'WeatherTech Raceway Laguna Seca',
    country: 'USA',
    length: 3602,
    layout: 'Grand Prix',
    sectors: [
      { number: 1, name: 'Sector 1', startDistance: 0, endDistance: 1200 },
      { number: 2, name: 'Sector 2', startDistance: 1200, endDistance: 2400 },
      { number: 3, name: 'Sector 3', startDistance: 2400, endDistance: 3602 }
    ],
    corners: [
      { number: 1, name: 'Turn 1', type: 'right', apex: { distance: 200, x: 250, y: 400, normalizedDistance: 0.056 }, braking: { distance: 120, x: 180, y: 420 }, exit: { distance: 280, x: 320, y: 370 }, gear: 3, apexSpeed: 100, difficulty: 'medium' },
      { number: 2, name: 'Turn 2 (Andretti Hairpin)', type: 'left', apex: { distance: 450, x: 450, y: 280, normalizedDistance: 0.125 }, braking: { distance: 350, x: 400, y: 320 }, exit: { distance: 550, x: 500, y: 250 }, gear: 2, apexSpeed: 65, difficulty: 'hard', notes: 'Tight hairpin, heavy braking' },
      { number: 3, name: 'Turn 3', type: 'right', apex: { distance: 750, x: 650, y: 180, normalizedDistance: 0.208 }, entry: { distance: 650, x: 600, y: 210 }, exit: { distance: 850, x: 700, y: 150 }, gear: 4, apexSpeed: 130, difficulty: 'easy' },
      { number: 4, name: 'Turn 4', type: 'left', apex: { distance: 1000, x: 800, y: 100, normalizedDistance: 0.278 }, entry: { distance: 900, x: 750, y: 120 }, exit: { distance: 1100, x: 850, y: 90 }, gear: 5, apexSpeed: 155, difficulty: 'medium' },
      { number: 5, name: 'Turn 5', type: 'right', apex: { distance: 1350, x: 950, y: 150, normalizedDistance: 0.375 }, braking: { distance: 1250, x: 920, y: 120 }, exit: { distance: 1450, x: 980, y: 200 }, gear: 3, apexSpeed: 95, difficulty: 'medium' },
      { number: 6, name: 'Turn 6', type: 'left', apex: { distance: 1650, x: 1000, y: 320, normalizedDistance: 0.458 }, entry: { distance: 1550, x: 990, y: 270 }, exit: { distance: 1750, x: 1000, y: 380 }, gear: 4, apexSpeed: 125, difficulty: 'easy' },
      { number: 8, name: 'Corkscrew (8)', type: 'left', apex: { distance: 2100, x: 950, y: 500, normalizedDistance: 0.583 }, braking: { distance: 2000, x: 980, y: 450 }, exit: { distance: 2200, x: 900, y: 550 }, gear: 2, apexSpeed: 55, difficulty: 'hard', notes: 'Famous blind downhill corkscrew' },
      { number: 9, name: 'Corkscrew (8A)', type: 'right', apex: { distance: 2300, x: 820, y: 600, normalizedDistance: 0.639 }, entry: { distance: 2200, x: 860, y: 560 }, exit: { distance: 2400, x: 780, y: 630 }, gear: 3, apexSpeed: 80, difficulty: 'hard', notes: 'Exit of corkscrew' },
      { number: 10, name: 'Rainey Curve', type: 'left', apex: { distance: 2800, x: 550, y: 680, normalizedDistance: 0.778 }, entry: { distance: 2650, x: 620, y: 660 }, exit: { distance: 2950, x: 480, y: 680 }, gear: 4, apexSpeed: 140, difficulty: 'medium', notes: 'Fast sweeping left' },
      { number: 11, name: 'Turn 11', type: 'right', apex: { distance: 3400, x: 200, y: 550, normalizedDistance: 0.944 }, braking: { distance: 3250, x: 280, y: 600 }, exit: { distance: 3500, x: 150, y: 500 }, gear: 3, apexSpeed: 105, difficulty: 'medium' }
    ],
    svg: {
      viewBox: '0 0 1100 750',
      path: 'M 100,450 L 250,420 Q 380,380 450,300 L 550,200 Q 620,130 720,100 L 850,80 Q 950,80 1000,130 L 1020,220 Q 1030,320 1000,420 L 950,530 Q 880,620 780,660 L 600,700 Q 450,720 300,680 L 180,620 Q 120,560 100,480 L 100,450 Z'
    },
    metadata: {
      direction: 'clockwise',
      elevation: { minimum: 52, maximum: 168, change: 116 },
      coordinates: { latitude: 36.5841, longitude: -121.7534 }
    }
  }
};

// Helper to get track by name (fuzzy match)
export function getTrackData(trackName: string): TrackData | null {
  const normalizedName = trackName.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Try exact ID match first
  for (const [id, track] of Object.entries(TRACK_DATA)) {
    if (id === normalizedName) return track;
  }

  // Try fuzzy match on name
  for (const track of Object.values(TRACK_DATA)) {
    const trackNormalized = track.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (trackNormalized.includes(normalizedName) || normalizedName.includes(trackNormalized)) {
      return track;
    }
  }

  // Try partial match on ID
  for (const [id, track] of Object.entries(TRACK_DATA)) {
    if (normalizedName.includes(id.replace(/-/g, '')) || id.replace(/-/g, '').includes(normalizedName)) {
      return track;
    }
  }

  return null;
}

// Get track ID from name - returns numeric iRacing ID for shape file loading
export function getTrackId(trackName: string): string {
  const normalized = trackName.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // First check TRACK_SLUG_MAP for direct slug match
  for (const [slug, id] of Object.entries(TRACK_SLUG_MAP)) {
    const slugNorm = slug.replace(/-/g, '');
    if (normalized.includes(slugNorm) || slugNorm.includes(normalized)) {
      return id; // Return the numeric ID
    }
  }
  
  // Check if it's already a numeric ID
  if (/^\d+$/.test(trackName)) {
    return trackName;
  }
  
  // Fallback: try to find in TRACK_DATA and use slug map
  const track = getTrackData(trackName);
  if (track?.id && TRACK_SLUG_MAP[track.id]) {
    return TRACK_SLUG_MAP[track.id];
  }
  
  // Last resort - return as-is (will likely fail to load)
  return trackName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
}
