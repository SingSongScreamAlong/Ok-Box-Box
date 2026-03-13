// Accurate Track Data from iRacing telemetry calibration
// Source: apps/app/src/data/trackShapes/*.shape.json

// Map slugs to iRacing shape IDs for the TrackMap component
// NOTE: Shape files are from iRacing telemetry. Some may be outdated.
// To update: capture new telemetry data from iRacing and regenerate shape files.
export const TRACK_SLUG_MAP: Record<string, string> = {
  // Daytona
  'daytona': '381',
  'daytona-road': '381',
  'daytona-24h': '381',
  'daytona-oval': '191',

  // Watkins Glen
  'watkins-glen': '146',
  'watkins-glen-boot': '483',

  // Spa
  'spa': '163',
  'spa-francorchamps': '163',

  // Laguna Seca
  'laguna-seca': '47',

  // Phoenix Raceway
  'phoenix-raceway': '419',
  'phoenix': '419',
  'ism-raceway': '419',
  'phoenix-oval': '419',

  // Road Atlanta
  'road-atlanta': 'road-atlanta',

  // Monza
  'monza': 'monza',
  'monza-combined': 'monza',
  'autodromo-nazionale-monza': 'monza',

  // Silverstone
  'silverstone': 'silverstone',
  'silverstone-gp': 'silverstone',

  // Nurburgring
  'nurburgring': 'nurburgring',
  'nurburgring-gp': 'nurburgring',
  'nordschleife': 'nordschleife',
  'nurburgring-nordschleife': 'nordschleife',

  // Suzuka
  'suzuka': 'suzuka',
  'suzuka-international': 'suzuka',

  // Imola
  'imola': 'imola',
  'autodromo-enzo-e-dino-ferrari': 'imola',

  // COTA
  'cota': 'cota',
  'circuit-of-the-americas': 'cota',

  // Mount Panorama (Bathurst)
  'mount-panorama': 'mount-panorama',
  'bathurst': 'mount-panorama',

  // Interlagos
  'interlagos': 'interlagos',
  'autodromo-jose-carlos-pace': 'interlagos',

  // Brands Hatch
  'brands-hatch': 'brands-hatch',
  'brands-hatch-gp': 'brands-hatch',

  // Okayama
  'okayama': 'okayama',
  'okayama-international': 'okayama',

  // Oulton Park
  'oulton-park': 'oulton-park',

  // Lime Rock
  'lime-rock': 'lime-rock',
  'lime-rock-park': 'lime-rock',

  // Tsukuba
  'tsukuba': 'tsukuba',

  // Sebring
  'sebring': 'sebring',
  'sebring-international': 'sebring',

  // Long Beach
  'long-beach': 'long-beach',
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
    corners: [
      // Shape 381: Geometrically verified with Shape Analysis
      // T3 (Horseshoe) Apex at xMin (0.325) | T5 Apex at yMax (0.503) | Bus Stop Apex at 0.675
      { number: 1, name: 'Turn 1 Tunnel', type: 'hairpin', apex: { distance: 1000, x: 800, y: 170, normalizedDistance: 0.175 }, braking: { distance: 900, x: 850, y: 145 }, exit: { distance: 1100, x: 750, y: 185 }, gear: 1, apexSpeed: 60, difficulty: 'hard', notes: 'Heavy braking into infield' },
      { number: 2, name: 'Turn 2', type: 'right', apex: { distance: 1375, x: 710, y: 175, normalizedDistance: 0.240 }, entry: { distance: 1300, x: 750, y: 185 }, exit: { distance: 1450, x: 650, y: 140 }, gear: 3, apexSpeed: 95, difficulty: 'medium' },
      { number: 3, name: 'Intl Horseshoe', type: 'right', apex: { distance: 1860, x: 500, y: 137, normalizedDistance: 0.325 }, entry: { distance: 1800, x: 600, y: 138 }, exit: { distance: 1950, x: 400, y: 150 }, gear: 3, apexSpeed: 85, difficulty: 'medium', notes: 'International Horseshoe' },
      { number: 4, name: 'Turn 4 (Kink)', type: 'left', apex: { distance: 2350, x: 260, y: 220, normalizedDistance: 0.410 }, braking: { distance: 2300, x: 330, y: 175 }, exit: { distance: 2400, x: 200, y: 280 }, gear: 5, apexSpeed: 140, difficulty: 'easy' },
      { number: 5, name: 'Turn 5', type: 'right', apex: { distance: 2880, x: 160, y: 420, normalizedDistance: 0.503 }, entry: { distance: 2800, x: 175, y: 350 }, exit: { distance: 2950, x: 165, y: 500 }, gear: 3, apexSpeed: 100, difficulty: 'medium', notes: 'Exit to banking' },
      { number: 6, name: 'Turn 6', type: 'left-kink', apex: { distance: 3200, x: 200, y: 750, normalizedDistance: 0.560 }, entry: { distance: 3100, x: 175, y: 600 }, exit: { distance: 3300, x: 250, y: 850 }, gear: 6, apexSpeed: 180, difficulty: 'easy', notes: 'Banking entry' },
      { number: 9, name: 'Bus Stop', type: 'chicane', apex: { distance: 3870, x: 600, y: 940, normalizedDistance: 0.675 }, braking: { distance: 3800, x: 500, y: 930 }, exit: { distance: 3950, x: 700, y: 920 }, gear: 3, apexSpeed: 90, difficulty: 'hard', notes: 'Le Mans Chicane' },
      { number: 10, name: 'Bus Stop Exit', type: 'chicane', apex: { distance: 3950, x: 850, y: 880, normalizedDistance: 0.690 }, entry: { distance: 3900, x: 750, y: 900 }, exit: { distance: 4000, x: 950, y: 850 }, gear: 3, apexSpeed: 100, difficulty: 'hard' },
      { number: 11, name: 'NASCAR 3', type: 'left-kink', apex: { distance: 4700, x: 1400, y: 540, normalizedDistance: 0.820 }, entry: { distance: 4600, x: 1300, y: 620 }, exit: { distance: 4800, x: 1500, y: 450 }, gear: 6, apexSpeed: 190, difficulty: 'easy' },
      { number: 12, name: 'NASCAR 4', type: 'left-kink', apex: { distance: 5200, x: 1600, y: 400, normalizedDistance: 0.910 }, entry: { distance: 5100, x: 1550, y: 420 }, exit: { distance: 5300, x: 1700, y: 500 }, gear: 6, apexSpeed: 195, difficulty: 'easy', notes: 'Start/Finish' },
    ],
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
  },

  'monza': {
    id: 'monza',
    name: 'Autodromo Nazionale Monza',
    country: 'Italy',
    length: 5793,
    layout: 'Grand Prix',
    sectors: [
      { number: 1, name: 'Sector 1', startDistance: 0, endDistance: 1931 },
      { number: 2, name: 'Sector 2', startDistance: 1931, endDistance: 3862 },
      { number: 3, name: 'Sector 3', startDistance: 3862, endDistance: 5793 }
    ],
    corners: [
      { number: 1, name: 'Variante del Rettifilo', type: 'chicane', apex: { distance: 700, x: 400, y: 100, normalizedDistance: 0.121 }, braking: { distance: 550, x: 350, y: 80 }, exit: { distance: 850, x: 450, y: 130 }, gear: 2, apexSpeed: 80, difficulty: 'hard', notes: 'Heavy braking from top speed' },
      { number: 2, name: 'Curva Grande', type: 'right', apex: { distance: 1400, x: 700, y: 250, normalizedDistance: 0.242 }, entry: { distance: 1200, x: 600, y: 200 }, exit: { distance: 1600, x: 800, y: 300 }, gear: 7, apexSpeed: 260, difficulty: 'medium' },
      { number: 3, name: 'Variante della Roggia', type: 'chicane', apex: { distance: 2200, x: 900, y: 450, normalizedDistance: 0.380 }, braking: { distance: 2050, x: 850, y: 400 }, exit: { distance: 2350, x: 920, y: 500 }, gear: 2, apexSpeed: 75, difficulty: 'hard' },
      { number: 4, name: 'Lesmo 1', type: 'right', apex: { distance: 2800, x: 950, y: 600, normalizedDistance: 0.483 }, braking: { distance: 2650, x: 940, y: 560 }, exit: { distance: 2950, x: 930, y: 640 }, gear: 4, apexSpeed: 155, difficulty: 'hard' },
      { number: 5, name: 'Lesmo 2', type: 'right', apex: { distance: 3200, x: 880, y: 700, normalizedDistance: 0.552 }, braking: { distance: 3050, x: 910, y: 670 }, exit: { distance: 3350, x: 840, y: 730 }, gear: 4, apexSpeed: 145, difficulty: 'hard' },
      { number: 6, name: 'Ascari', type: 'chicane', apex: { distance: 4200, x: 600, y: 800, normalizedDistance: 0.725 }, braking: { distance: 4050, x: 650, y: 780 }, exit: { distance: 4350, x: 550, y: 810 }, gear: 4, apexSpeed: 140, difficulty: 'medium' },
      { number: 7, name: 'Parabolica', type: 'right', apex: { distance: 5200, x: 250, y: 600, normalizedDistance: 0.897 }, braking: { distance: 5050, x: 300, y: 650 }, exit: { distance: 5400, x: 200, y: 500 }, gear: 4, apexSpeed: 165, difficulty: 'hard', notes: 'Long fast right, critical for lap time' }
    ],
    svg: {
      viewBox: '0 0 1000 900',
      path: 'M 200,50 L 350,50 Q 500,60 600,120 L 750,250 Q 850,350 900,500 L 920,650 Q 930,750 880,820 L 750,850 Q 600,860 450,830 L 300,770 Q 200,700 180,580 L 170,400 Q 170,250 200,150 L 200,50 Z'
    },
    metadata: {
      direction: 'clockwise',
      elevation: { minimum: 138, maximum: 168, change: 30 },
      coordinates: { latitude: 45.6156, longitude: 9.2811 }
    }
  },

  'silverstone': {
    id: 'silverstone',
    name: 'Silverstone Circuit',
    country: 'UK',
    length: 5891,
    layout: 'Grand Prix',
    sectors: [
      { number: 1, name: 'Sector 1', startDistance: 0, endDistance: 1964 },
      { number: 2, name: 'Sector 2', startDistance: 1964, endDistance: 3927 },
      { number: 3, name: 'Sector 3', startDistance: 3927, endDistance: 5891 }
    ],
    corners: [
      { number: 1, name: 'Abbey', type: 'right', apex: { distance: 300, x: 400, y: 500, normalizedDistance: 0.051 }, braking: { distance: 200, x: 350, y: 520 }, exit: { distance: 400, x: 450, y: 470 }, gear: 4, apexSpeed: 160, difficulty: 'medium' },
      { number: 2, name: 'Farm', type: 'right', apex: { distance: 650, x: 550, y: 380, normalizedDistance: 0.110 }, entry: { distance: 550, x: 500, y: 420 }, exit: { distance: 750, x: 600, y: 340 }, gear: 3, apexSpeed: 120, difficulty: 'easy' },
      { number: 3, name: 'Village', type: 'left', apex: { distance: 1100, x: 750, y: 250, normalizedDistance: 0.187 }, braking: { distance: 950, x: 700, y: 290 }, exit: { distance: 1250, x: 800, y: 210 }, gear: 3, apexSpeed: 110, difficulty: 'medium' },
      { number: 6, name: 'Copse', type: 'right', apex: { distance: 2100, x: 1000, y: 100, normalizedDistance: 0.356 }, entry: { distance: 2000, x: 950, y: 120 }, exit: { distance: 2200, x: 1050, y: 90 }, gear: 6, apexSpeed: 245, difficulty: 'hard', notes: 'Flat out in GT3' },
      { number: 7, name: 'Maggots', type: 'left', apex: { distance: 2600, x: 1100, y: 200, normalizedDistance: 0.441 }, entry: { distance: 2500, x: 1080, y: 160 }, exit: { distance: 2700, x: 1110, y: 250 }, gear: 6, apexSpeed: 240, difficulty: 'hard' },
      { number: 8, name: 'Becketts', type: 'right', apex: { distance: 2900, x: 1080, y: 350, normalizedDistance: 0.492 }, entry: { distance: 2800, x: 1100, y: 300 }, exit: { distance: 3000, x: 1050, y: 400 }, gear: 5, apexSpeed: 200, difficulty: 'hard', notes: 'Famous high-speed complex' },
      { number: 10, name: 'Stowe', type: 'right', apex: { distance: 3600, x: 900, y: 550, normalizedDistance: 0.611 }, braking: { distance: 3450, x: 950, y: 500 }, exit: { distance: 3750, x: 850, y: 600 }, gear: 4, apexSpeed: 155, difficulty: 'hard' },
      { number: 12, name: 'Club', type: 'right', apex: { distance: 4400, x: 600, y: 650, normalizedDistance: 0.747 }, braking: { distance: 4250, x: 650, y: 630 }, exit: { distance: 4550, x: 550, y: 660 }, gear: 3, apexSpeed: 120, difficulty: 'medium' }
    ],
    svg: {
      viewBox: '0 0 1200 750',
      path: 'M 300,550 L 450,500 Q 600,430 750,350 L 900,250 Q 1000,170 1080,130 L 1100,150 Q 1120,200 1100,300 L 1050,450 Q 980,570 880,630 L 700,680 Q 500,700 350,660 L 250,600 Q 280,580 300,550 Z'
    },
    metadata: {
      direction: 'clockwise',
      elevation: { minimum: 150, maximum: 170, change: 20 },
      coordinates: { latitude: 52.0786, longitude: -1.0169 }
    }
  },

  'nurburgring': {
    id: 'nurburgring',
    name: 'Nürburgring Grand Prix',
    country: 'Germany',
    length: 5148,
    layout: 'Grand Prix',
    sectors: [
      { number: 1, name: 'Sector 1', startDistance: 0, endDistance: 1716 },
      { number: 2, name: 'Sector 2', startDistance: 1716, endDistance: 3432 },
      { number: 3, name: 'Sector 3', startDistance: 3432, endDistance: 5148 }
    ],
    corners: [
      { number: 1, name: 'Turn 1', type: 'right', apex: { distance: 300, x: 300, y: 200, normalizedDistance: 0.058 }, braking: { distance: 200, x: 250, y: 210 }, exit: { distance: 400, x: 350, y: 180 }, gear: 3, apexSpeed: 110, difficulty: 'medium' },
      { number: 4, name: 'Mercedes Arena', type: 'chicane', apex: { distance: 1400, x: 700, y: 100, normalizedDistance: 0.272 }, braking: { distance: 1250, x: 650, y: 110 }, exit: { distance: 1550, x: 750, y: 95 }, gear: 3, apexSpeed: 100, difficulty: 'medium' },
      { number: 7, name: 'Dunlop', type: 'hairpin', apex: { distance: 2400, x: 900, y: 300, normalizedDistance: 0.466 }, braking: { distance: 2250, x: 880, y: 260 }, exit: { distance: 2550, x: 910, y: 350 }, gear: 2, apexSpeed: 70, difficulty: 'hard' },
      { number: 10, name: 'Schumacher S', type: 'chicane', apex: { distance: 3500, x: 800, y: 550, normalizedDistance: 0.680 }, braking: { distance: 3350, x: 830, y: 510 }, exit: { distance: 3650, x: 760, y: 580 }, gear: 3, apexSpeed: 105, difficulty: 'medium' },
      { number: 13, name: 'Veedol Chicane', type: 'chicane', apex: { distance: 4600, x: 400, y: 500, normalizedDistance: 0.894 }, braking: { distance: 4450, x: 450, y: 490 }, exit: { distance: 4750, x: 350, y: 480 }, gear: 2, apexSpeed: 75, difficulty: 'hard', notes: 'Last corner before main straight' }
    ],
    svg: {
      viewBox: '0 0 1000 650',
      path: 'M 200,250 L 350,200 Q 500,150 650,120 L 800,100 Q 900,100 950,180 L 950,300 Q 940,420 880,500 L 750,560 Q 600,590 450,570 L 300,520 Q 200,460 180,350 L 200,250 Z'
    },
    metadata: {
      direction: 'clockwise',
      elevation: { minimum: 320, maximum: 380, change: 60 },
      coordinates: { latitude: 50.3356, longitude: 6.9475 }
    }
  },

  'suzuka': {
    id: 'suzuka',
    name: 'Suzuka International Racing Course',
    country: 'Japan',
    length: 5807,
    layout: 'Grand Prix',
    sectors: [
      { number: 1, name: 'Sector 1', startDistance: 0, endDistance: 1936 },
      { number: 2, name: 'Sector 2', startDistance: 1936, endDistance: 3871 },
      { number: 3, name: 'Sector 3', startDistance: 3871, endDistance: 5807 }
    ],
    corners: [
      { number: 1, name: 'Turn 1', type: 'right', apex: { distance: 300, x: 350, y: 300, normalizedDistance: 0.052 }, braking: { distance: 200, x: 300, y: 310 }, exit: { distance: 400, x: 400, y: 280 }, gear: 4, apexSpeed: 150, difficulty: 'medium' },
      { number: 2, name: 'S Curves (1)', type: 'left-right', apex: { distance: 800, x: 550, y: 180, normalizedDistance: 0.138 }, entry: { distance: 700, x: 500, y: 220 }, exit: { distance: 900, x: 600, y: 150 }, gear: 4, apexSpeed: 155, difficulty: 'hard', notes: 'Famous S curves' },
      { number: 5, name: 'Dunlop', type: 'left', apex: { distance: 1600, x: 800, y: 100, normalizedDistance: 0.276 }, braking: { distance: 1500, x: 750, y: 110 }, exit: { distance: 1700, x: 850, y: 100 }, gear: 3, apexSpeed: 120, difficulty: 'medium' },
      { number: 7, name: 'Degner 1', type: 'right', apex: { distance: 2200, x: 950, y: 200, normalizedDistance: 0.379 }, braking: { distance: 2100, x: 920, y: 170 }, exit: { distance: 2300, x: 970, y: 240 }, gear: 3, apexSpeed: 110, difficulty: 'hard' },
      { number: 8, name: 'Degner 2', type: 'right', apex: { distance: 2500, x: 980, y: 330, normalizedDistance: 0.431 }, entry: { distance: 2400, x: 975, y: 280 }, exit: { distance: 2600, x: 970, y: 380 }, gear: 3, apexSpeed: 100, difficulty: 'medium' },
      { number: 10, name: 'Hairpin', type: 'hairpin', apex: { distance: 3200, x: 850, y: 550, normalizedDistance: 0.551 }, braking: { distance: 3050, x: 880, y: 500 }, exit: { distance: 3350, x: 810, y: 580 }, gear: 2, apexSpeed: 60, difficulty: 'hard', notes: 'Tight hairpin' },
      { number: 11, name: 'Spoon Curve', type: 'left', apex: { distance: 3900, x: 600, y: 650, normalizedDistance: 0.672 }, entry: { distance: 3750, x: 680, y: 620 }, exit: { distance: 4050, x: 520, y: 660 }, gear: 4, apexSpeed: 145, difficulty: 'hard', notes: 'Long sweeping double-apex' },
      { number: 13, name: '130R', type: 'left', apex: { distance: 4800, x: 250, y: 550, normalizedDistance: 0.827 }, entry: { distance: 4700, x: 300, y: 570 }, exit: { distance: 4900, x: 200, y: 520 }, gear: 7, apexSpeed: 280, difficulty: 'hard', notes: 'Famous high-speed corner' },
      { number: 14, name: 'Casio Triangle', type: 'chicane', apex: { distance: 5400, x: 200, y: 400, normalizedDistance: 0.930 }, braking: { distance: 5250, x: 210, y: 450 }, exit: { distance: 5550, x: 220, y: 350 }, gear: 2, apexSpeed: 65, difficulty: 'medium' }
    ],
    svg: {
      viewBox: '0 0 1050 700',
      path: 'M 200,350 L 300,300 Q 420,220 550,180 L 700,140 Q 850,110 950,180 L 980,300 Q 990,430 930,530 L 800,600 Q 650,650 500,650 L 350,630 Q 220,590 180,480 L 200,350 Z'
    },
    metadata: {
      direction: 'clockwise',
      elevation: { minimum: 40, maximum: 80, change: 40 },
      coordinates: { latitude: 34.8431, longitude: 136.5406 }
    }
  },

  'imola': {
    id: 'imola',
    name: 'Autodromo Enzo e Dino Ferrari',
    country: 'Italy',
    length: 4909,
    layout: 'Grand Prix',
    sectors: [
      { number: 1, name: 'Sector 1', startDistance: 0, endDistance: 1636 },
      { number: 2, name: 'Sector 2', startDistance: 1636, endDistance: 3273 },
      { number: 3, name: 'Sector 3', startDistance: 3273, endDistance: 4909 }
    ],
    corners: [
      { number: 1, name: 'Tamburello', type: 'left', apex: { distance: 600, x: 400, y: 200, normalizedDistance: 0.122 }, entry: { distance: 500, x: 350, y: 220 }, exit: { distance: 700, x: 450, y: 180 }, gear: 5, apexSpeed: 200, difficulty: 'medium' },
      { number: 3, name: 'Tosa', type: 'left', apex: { distance: 1300, x: 700, y: 100, normalizedDistance: 0.265 }, braking: { distance: 1150, x: 650, y: 120 }, exit: { distance: 1450, x: 750, y: 90 }, gear: 2, apexSpeed: 80, difficulty: 'hard' },
      { number: 6, name: 'Piratella', type: 'right', apex: { distance: 2200, x: 900, y: 300, normalizedDistance: 0.448 }, braking: { distance: 2050, x: 870, y: 260 }, exit: { distance: 2350, x: 920, y: 350 }, gear: 3, apexSpeed: 120, difficulty: 'medium' },
      { number: 8, name: 'Acque Minerali', type: 'chicane', apex: { distance: 2800, x: 850, y: 500, normalizedDistance: 0.570 }, braking: { distance: 2650, x: 880, y: 460 }, exit: { distance: 2950, x: 810, y: 530 }, gear: 3, apexSpeed: 100, difficulty: 'hard' },
      { number: 10, name: 'Variante Alta', type: 'chicane', apex: { distance: 3600, x: 600, y: 600, normalizedDistance: 0.733 }, braking: { distance: 3450, x: 650, y: 580 }, exit: { distance: 3750, x: 550, y: 610 }, gear: 3, apexSpeed: 95, difficulty: 'medium' },
      { number: 12, name: 'Rivazza 1', type: 'left', apex: { distance: 4200, x: 350, y: 550, normalizedDistance: 0.856 }, braking: { distance: 4050, x: 400, y: 570 }, exit: { distance: 4350, x: 300, y: 520 }, gear: 3, apexSpeed: 115, difficulty: 'medium' },
      { number: 13, name: 'Rivazza 2', type: 'left', apex: { distance: 4600, x: 200, y: 450, normalizedDistance: 0.937 }, entry: { distance: 4500, x: 250, y: 480 }, exit: { distance: 4700, x: 180, y: 400 }, gear: 3, apexSpeed: 110, difficulty: 'medium' }
    ],
    svg: {
      viewBox: '0 0 1000 700',
      path: 'M 150,350 L 300,250 Q 450,150 600,120 L 780,100 Q 900,110 950,220 L 950,380 Q 930,500 850,570 L 680,620 Q 500,650 350,600 L 200,520 Q 140,450 150,350 Z'
    },
    metadata: {
      direction: 'counter-clockwise',
      elevation: { minimum: 30, maximum: 75, change: 45 },
      coordinates: { latitude: 44.3439, longitude: 11.7167 }
    }
  },

  'cota': {
    id: 'cota',
    name: 'Circuit of the Americas',
    country: 'USA',
    length: 5513,
    layout: 'Grand Prix',
    sectors: [
      { number: 1, name: 'Sector 1', startDistance: 0, endDistance: 1838 },
      { number: 2, name: 'Sector 2', startDistance: 1838, endDistance: 3675 },
      { number: 3, name: 'Sector 3', startDistance: 3675, endDistance: 5513 }
    ],
    corners: [
      { number: 1, name: 'Turn 1', type: 'left', apex: { distance: 400, x: 350, y: 200, normalizedDistance: 0.073 }, braking: { distance: 300, x: 300, y: 230 }, exit: { distance: 500, x: 400, y: 170 }, gear: 2, apexSpeed: 75, difficulty: 'hard', notes: 'Uphill hairpin, famous overtaking spot' },
      { number: 3, name: 'Turn 3-4 (S Curves)', type: 'left-right', apex: { distance: 1000, x: 600, y: 100, normalizedDistance: 0.181 }, entry: { distance: 900, x: 550, y: 130 }, exit: { distance: 1100, x: 650, y: 80 }, gear: 5, apexSpeed: 190, difficulty: 'hard' },
      { number: 11, name: 'Turn 11', type: 'hairpin', apex: { distance: 2700, x: 950, y: 400, normalizedDistance: 0.490 }, braking: { distance: 2550, x: 920, y: 360 }, exit: { distance: 2850, x: 960, y: 440 }, gear: 2, apexSpeed: 70, difficulty: 'medium' },
      { number: 12, name: 'Turn 12', type: 'left', apex: { distance: 3200, x: 900, y: 550, normalizedDistance: 0.581 }, braking: { distance: 3050, x: 930, y: 510 }, exit: { distance: 3350, x: 860, y: 580 }, gear: 2, apexSpeed: 65, difficulty: 'hard', notes: 'Heavy braking' },
      { number: 15, name: 'Turn 15', type: 'left', apex: { distance: 4000, x: 650, y: 650, normalizedDistance: 0.726 }, entry: { distance: 3900, x: 700, y: 630 }, exit: { distance: 4100, x: 600, y: 660 }, gear: 5, apexSpeed: 190, difficulty: 'medium' },
      { number: 19, name: 'Turn 19', type: 'left', apex: { distance: 5100, x: 250, y: 500, normalizedDistance: 0.925 }, braking: { distance: 4950, x: 300, y: 520 }, exit: { distance: 5250, x: 220, y: 470 }, gear: 3, apexSpeed: 105, difficulty: 'medium' }
    ],
    svg: {
      viewBox: '0 0 1050 700',
      path: 'M 200,400 L 300,280 Q 400,160 550,100 L 750,80 Q 900,90 980,200 L 1000,350 Q 1000,480 940,570 L 800,640 Q 650,680 480,660 L 300,600 Q 200,540 180,450 L 200,400 Z'
    },
    metadata: {
      direction: 'counter-clockwise',
      elevation: { minimum: 131, maximum: 172, change: 41 },
      coordinates: { latitude: 30.1328, longitude: -97.6411 }
    }
  },

  'mount-panorama': {
    id: 'mount-panorama',
    name: 'Mount Panorama Circuit',
    country: 'Australia',
    length: 6213,
    layout: 'Grand Prix',
    sectors: [
      { number: 1, name: 'Sector 1', startDistance: 0, endDistance: 2071 },
      { number: 2, name: 'Sector 2', startDistance: 2071, endDistance: 4142 },
      { number: 3, name: 'Sector 3', startDistance: 4142, endDistance: 6213 }
    ],
    corners: [
      { number: 1, name: 'Hell Corner', type: 'right', apex: { distance: 400, x: 300, y: 500, normalizedDistance: 0.064 }, braking: { distance: 300, x: 250, y: 520 }, exit: { distance: 500, x: 350, y: 470 }, gear: 2, apexSpeed: 65, difficulty: 'hard' },
      { number: 2, name: 'Mountain Straight Chicane', type: 'chicane', apex: { distance: 1000, x: 500, y: 350, normalizedDistance: 0.161 }, braking: { distance: 850, x: 450, y: 380 }, exit: { distance: 1150, x: 550, y: 320 }, gear: 3, apexSpeed: 100, difficulty: 'medium' },
      { number: 5, name: 'The Cutting', type: 'left-right', apex: { distance: 2200, x: 750, y: 100, normalizedDistance: 0.354 }, entry: { distance: 2100, x: 700, y: 130 }, exit: { distance: 2300, x: 800, y: 80 }, gear: 3, apexSpeed: 110, difficulty: 'hard', notes: 'Narrow mountain section' },
      { number: 8, name: 'The Dipper', type: 'right', apex: { distance: 3200, x: 900, y: 250, normalizedDistance: 0.515 }, braking: { distance: 3050, x: 870, y: 220 }, exit: { distance: 3350, x: 920, y: 300 }, gear: 3, apexSpeed: 95, difficulty: 'hard', notes: 'Blind entry, steep descent' },
      { number: 11, name: 'Forrest Elbow', type: 'left', apex: { distance: 4000, x: 850, y: 450, normalizedDistance: 0.644 }, braking: { distance: 3850, x: 870, y: 400 }, exit: { distance: 4150, x: 820, y: 500 }, gear: 2, apexSpeed: 70, difficulty: 'hard', notes: 'Critical for Conrod exit speed' },
      { number: 18, name: 'The Chase', type: 'left-right', apex: { distance: 5500, x: 400, y: 600, normalizedDistance: 0.885 }, entry: { distance: 5400, x: 450, y: 580 }, exit: { distance: 5600, x: 350, y: 610 }, gear: 4, apexSpeed: 150, difficulty: 'hard' },
      { number: 19, name: 'Murray Corner', type: 'right', apex: { distance: 5900, x: 200, y: 550, normalizedDistance: 0.950 }, braking: { distance: 5750, x: 250, y: 570 }, exit: { distance: 6050, x: 180, y: 520 }, gear: 2, apexSpeed: 65, difficulty: 'hard', notes: 'Last corner, leads to main straight' }
    ],
    svg: {
      viewBox: '0 0 1000 650',
      path: 'M 150,550 L 300,500 Q 450,420 600,300 L 750,180 Q 850,100 930,150 L 950,280 Q 960,400 900,500 L 780,580 Q 600,630 400,620 L 250,590 Q 160,570 150,550 Z'
    },
    metadata: {
      direction: 'counter-clockwise',
      elevation: { minimum: 462, maximum: 632, change: 170 },
      coordinates: { latitude: -33.4464, longitude: 149.5583 }
    }
  },

  'interlagos': {
    id: 'interlagos',
    name: 'Autódromo José Carlos Pace',
    country: 'Brazil',
    length: 4309,
    layout: 'Grand Prix',
    sectors: [
      { number: 1, name: 'Sector 1', startDistance: 0, endDistance: 1436 },
      { number: 2, name: 'Sector 2', startDistance: 1436, endDistance: 2873 },
      { number: 3, name: 'Sector 3', startDistance: 2873, endDistance: 4309 }
    ],
    corners: [
      { number: 1, name: 'Senna S (Turn 1)', type: 'left', apex: { distance: 250, x: 350, y: 300, normalizedDistance: 0.058 }, braking: { distance: 150, x: 300, y: 320 }, exit: { distance: 350, x: 400, y: 270 }, gear: 3, apexSpeed: 110, difficulty: 'hard', notes: 'Famous downhill braking into S' },
      { number: 4, name: 'Descida do Lago', type: 'left', apex: { distance: 1200, x: 700, y: 100, normalizedDistance: 0.278 }, braking: { distance: 1050, x: 650, y: 120 }, exit: { distance: 1350, x: 750, y: 90 }, gear: 3, apexSpeed: 115, difficulty: 'medium' },
      { number: 7, name: 'Laranjinha', type: 'left', apex: { distance: 2100, x: 900, y: 300, normalizedDistance: 0.487 }, entry: { distance: 2000, x: 870, y: 260 }, exit: { distance: 2200, x: 920, y: 350 }, gear: 4, apexSpeed: 150, difficulty: 'medium' },
      { number: 8, name: 'Pinheirinho', type: 'left', apex: { distance: 2600, x: 850, y: 480, normalizedDistance: 0.603 }, entry: { distance: 2500, x: 870, y: 430 }, exit: { distance: 2700, x: 820, y: 520 }, gear: 4, apexSpeed: 140, difficulty: 'medium' },
      { number: 10, name: 'Mergulho', type: 'left', apex: { distance: 3200, x: 650, y: 600, normalizedDistance: 0.743 }, braking: { distance: 3050, x: 700, y: 570 }, exit: { distance: 3350, x: 600, y: 620 }, gear: 3, apexSpeed: 100, difficulty: 'hard' },
      { number: 12, name: 'Juncao', type: 'left', apex: { distance: 3900, x: 350, y: 550, normalizedDistance: 0.905 }, braking: { distance: 3750, x: 400, y: 570 }, exit: { distance: 4050, x: 300, y: 520 }, gear: 3, apexSpeed: 120, difficulty: 'hard', notes: 'Critical for main straight speed' }
    ],
    svg: {
      viewBox: '0 0 1000 700',
      path: 'M 200,380 L 350,300 Q 500,200 650,130 L 800,100 Q 920,110 960,220 L 950,380 Q 920,500 830,580 L 650,630 Q 450,660 300,600 L 200,520 Q 170,450 200,380 Z'
    },
    metadata: {
      direction: 'counter-clockwise',
      elevation: { minimum: 720, maximum: 798, change: 78 },
      coordinates: { latitude: -23.7036, longitude: -46.6975 }
    }
  },

  'brands-hatch': {
    id: 'brands-hatch',
    name: 'Brands Hatch',
    country: 'UK',
    length: 3908,
    layout: 'Grand Prix',
    sectors: [
      { number: 1, name: 'Sector 1', startDistance: 0, endDistance: 1303 },
      { number: 2, name: 'Sector 2', startDistance: 1303, endDistance: 2605 },
      { number: 3, name: 'Sector 3', startDistance: 2605, endDistance: 3908 }
    ],
    corners: [
      { number: 1, name: 'Paddock Hill Bend', type: 'right', apex: { distance: 300, x: 350, y: 400, normalizedDistance: 0.077 }, braking: { distance: 200, x: 300, y: 420 }, exit: { distance: 400, x: 400, y: 370 }, gear: 3, apexSpeed: 105, difficulty: 'hard', notes: 'Famous blind downhill right' },
      { number: 2, name: 'Druids', type: 'hairpin', apex: { distance: 800, x: 600, y: 250, normalizedDistance: 0.205 }, braking: { distance: 650, x: 550, y: 300 }, exit: { distance: 950, x: 630, y: 210 }, gear: 2, apexSpeed: 55, difficulty: 'hard' },
      { number: 4, name: 'Surtees', type: 'right', apex: { distance: 1400, x: 800, y: 150, normalizedDistance: 0.358 }, entry: { distance: 1300, x: 750, y: 170 }, exit: { distance: 1500, x: 850, y: 140 }, gear: 5, apexSpeed: 170, difficulty: 'medium' },
      { number: 6, name: 'Hawthorn Bend', type: 'right', apex: { distance: 2200, x: 950, y: 350, normalizedDistance: 0.563 }, entry: { distance: 2100, x: 920, y: 300 }, exit: { distance: 2300, x: 960, y: 400 }, gear: 3, apexSpeed: 110, difficulty: 'medium' },
      { number: 8, name: 'Westfield', type: 'left', apex: { distance: 2800, x: 850, y: 550, normalizedDistance: 0.716 }, entry: { distance: 2700, x: 880, y: 500 }, exit: { distance: 2900, x: 810, y: 580 }, gear: 2, apexSpeed: 70, difficulty: 'medium' },
      { number: 10, name: 'Clearways', type: 'right', apex: { distance: 3500, x: 500, y: 550, normalizedDistance: 0.896 }, entry: { distance: 3400, x: 550, y: 560 }, exit: { distance: 3600, x: 450, y: 530 }, gear: 4, apexSpeed: 140, difficulty: 'hard', notes: 'Key for pit straight speed' }
    ],
    svg: {
      viewBox: '0 0 1050 650',
      path: 'M 200,450 L 350,380 Q 500,290 650,220 L 800,160 Q 920,130 980,220 L 980,380 Q 960,500 880,570 L 700,610 Q 500,630 350,580 L 220,510 Q 190,480 200,450 Z'
    },
    metadata: {
      direction: 'clockwise',
      elevation: { minimum: 50, maximum: 110, change: 60 },
      coordinates: { latitude: 51.3569, longitude: 0.2628 }
    }
  },

  'okayama': {
    id: 'okayama',
    name: 'Okayama International Circuit',
    country: 'Japan',
    length: 3703,
    layout: 'Grand Prix',
    sectors: [
      { number: 1, name: 'Sector 1', startDistance: 0, endDistance: 1234 },
      { number: 2, name: 'Sector 2', startDistance: 1234, endDistance: 2469 },
      { number: 3, name: 'Sector 3', startDistance: 2469, endDistance: 3703 }
    ],
    corners: [
      { number: 1, name: 'First Corner', type: 'left', apex: { distance: 300, x: 350, y: 300, normalizedDistance: 0.081 }, braking: { distance: 200, x: 300, y: 320 }, exit: { distance: 400, x: 400, y: 270 }, gear: 3, apexSpeed: 100, difficulty: 'medium' },
      { number: 3, name: 'Moss Corner', type: 'right', apex: { distance: 1000, x: 600, y: 150, normalizedDistance: 0.270 }, braking: { distance: 850, x: 550, y: 180 }, exit: { distance: 1150, x: 650, y: 130 }, gear: 2, apexSpeed: 70, difficulty: 'hard' },
      { number: 5, name: 'Attwood Curve', type: 'left', apex: { distance: 1800, x: 850, y: 280, normalizedDistance: 0.486 }, entry: { distance: 1700, x: 800, y: 250 }, exit: { distance: 1900, x: 880, y: 320 }, gear: 4, apexSpeed: 130, difficulty: 'medium' },
      { number: 8, name: 'Revolver', type: 'right', apex: { distance: 2600, x: 800, y: 500, normalizedDistance: 0.702 }, braking: { distance: 2450, x: 830, y: 460 }, exit: { distance: 2750, x: 760, y: 530 }, gear: 3, apexSpeed: 90, difficulty: 'hard' },
      { number: 10, name: 'Last Corner', type: 'right', apex: { distance: 3400, x: 400, y: 500, normalizedDistance: 0.919 }, braking: { distance: 3250, x: 450, y: 510 }, exit: { distance: 3550, x: 350, y: 480 }, gear: 3, apexSpeed: 95, difficulty: 'medium' }
    ],
    svg: {
      viewBox: '0 0 950 600',
      path: 'M 200,350 L 350,280 Q 500,200 650,160 L 800,150 Q 890,160 920,250 L 900,380 Q 870,480 780,530 L 600,560 Q 400,570 280,500 L 210,420 Q 190,380 200,350 Z'
    },
    metadata: {
      direction: 'clockwise',
      elevation: { minimum: 240, maximum: 285, change: 45 },
      coordinates: { latitude: 34.9150, longitude: 134.2217 }
    }
  },

  'lime-rock': {
    id: 'lime-rock',
    name: 'Lime Rock Park',
    country: 'USA',
    length: 2414,
    layout: 'Full Course',
    sectors: [
      { number: 1, name: 'Sector 1', startDistance: 0, endDistance: 805 },
      { number: 2, name: 'Sector 2', startDistance: 805, endDistance: 1609 },
      { number: 3, name: 'Sector 3', startDistance: 1609, endDistance: 2414 }
    ],
    corners: [
      { number: 1, name: 'Big Bend', type: 'right', apex: { distance: 200, x: 350, y: 350, normalizedDistance: 0.083 }, entry: { distance: 150, x: 300, y: 370 }, exit: { distance: 300, x: 400, y: 320 }, gear: 4, apexSpeed: 140, difficulty: 'medium', notes: 'Fast sweeping right' },
      { number: 3, name: 'Right Hander', type: 'right', apex: { distance: 800, x: 700, y: 150, normalizedDistance: 0.331 }, braking: { distance: 700, x: 650, y: 180 }, exit: { distance: 900, x: 730, y: 130 }, gear: 3, apexSpeed: 100, difficulty: 'hard' },
      { number: 5, name: 'The Uphill', type: 'left', apex: { distance: 1400, x: 850, y: 300, normalizedDistance: 0.580 }, entry: { distance: 1300, x: 820, y: 260 }, exit: { distance: 1500, x: 870, y: 350 }, gear: 4, apexSpeed: 145, difficulty: 'hard', notes: 'Blind uphill left' },
      { number: 6, name: 'West Bend', type: 'left', apex: { distance: 1800, x: 750, y: 450, normalizedDistance: 0.746 }, entry: { distance: 1700, x: 800, y: 410 }, exit: { distance: 1900, x: 680, y: 480 }, gear: 5, apexSpeed: 165, difficulty: 'medium' },
      { number: 7, name: 'The Downhill', type: 'right', apex: { distance: 2200, x: 450, y: 480, normalizedDistance: 0.911 }, entry: { distance: 2100, x: 520, y: 490 }, exit: { distance: 2300, x: 380, y: 460 }, gear: 5, apexSpeed: 170, difficulty: 'medium', notes: 'Fast downhill right to main straight' }
    ],
    svg: {
      viewBox: '0 0 950 550',
      path: 'M 200,400 L 350,350 Q 500,270 650,200 L 780,160 Q 870,160 900,230 L 890,350 Q 870,440 790,490 L 600,510 Q 400,520 280,470 L 210,420 Q 195,410 200,400 Z'
    },
    metadata: {
      direction: 'clockwise',
      elevation: { minimum: 220, maximum: 280, change: 60 },
      coordinates: { latitude: 41.9281, longitude: -73.3833 }
    }
  },

  'sebring': {
    id: 'sebring',
    name: 'Sebring International Raceway',
    country: 'USA',
    length: 6019,
    layout: 'Full Course',
    sectors: [
      { number: 1, name: 'Sector 1', startDistance: 0, endDistance: 2006 },
      { number: 2, name: 'Sector 2', startDistance: 2006, endDistance: 4013 },
      { number: 3, name: 'Sector 3', startDistance: 4013, endDistance: 6019 }
    ],
    corners: [
      { number: 1, name: 'Turn 1', type: 'right', apex: { distance: 350, x: 350, y: 400, normalizedDistance: 0.058 }, braking: { distance: 250, x: 300, y: 420 }, exit: { distance: 450, x: 400, y: 370 }, gear: 3, apexSpeed: 110, difficulty: 'medium' },
      { number: 3, name: 'Turn 3 Hairpin', type: 'left', apex: { distance: 1100, x: 600, y: 200, normalizedDistance: 0.183 }, braking: { distance: 950, x: 550, y: 230 }, exit: { distance: 1250, x: 650, y: 180 }, gear: 2, apexSpeed: 60, difficulty: 'hard' },
      { number: 7, name: 'Turn 7', type: 'right', apex: { distance: 2500, x: 900, y: 300, normalizedDistance: 0.415 }, entry: { distance: 2400, x: 870, y: 260 }, exit: { distance: 2600, x: 920, y: 350 }, gear: 4, apexSpeed: 140, difficulty: 'medium', notes: 'Bumpy surface' },
      { number: 10, name: 'Turn 10', type: 'hairpin', apex: { distance: 3500, x: 850, y: 550, normalizedDistance: 0.582 }, braking: { distance: 3350, x: 870, y: 510 }, exit: { distance: 3650, x: 820, y: 580 }, gear: 2, apexSpeed: 55, difficulty: 'hard', notes: 'Tight hairpin' },
      { number: 13, name: 'Turn 13', type: 'left', apex: { distance: 4500, x: 600, y: 600, normalizedDistance: 0.748 }, entry: { distance: 4400, x: 640, y: 590 }, exit: { distance: 4600, x: 560, y: 600 }, gear: 5, apexSpeed: 170, difficulty: 'medium' },
      { number: 17, name: 'Turn 17', type: 'right', apex: { distance: 5600, x: 250, y: 500, normalizedDistance: 0.930 }, braking: { distance: 5450, x: 300, y: 520 }, exit: { distance: 5750, x: 220, y: 470 }, gear: 3, apexSpeed: 100, difficulty: 'hard', notes: 'Key for main straight speed' }
    ],
    svg: {
      viewBox: '0 0 1000 700',
      path: 'M 150,450 L 300,380 Q 480,270 650,200 L 830,150 Q 950,160 980,270 L 960,420 Q 930,540 840,610 L 650,650 Q 450,670 300,620 L 180,540 Q 140,490 150,450 Z'
    },
    metadata: {
      direction: 'clockwise',
      elevation: { minimum: 15, maximum: 25, change: 10 },
      coordinates: { latitude: 27.4544, longitude: -81.3483 }
    }
  },

  'long-beach': {
    id: 'long-beach',
    name: 'Long Beach Street Circuit',
    country: 'USA',
    length: 3167,
    layout: 'Street Circuit',
    sectors: [
      { number: 1, name: 'Sector 1', startDistance: 0, endDistance: 1056 },
      { number: 2, name: 'Sector 2', startDistance: 1056, endDistance: 2111 },
      { number: 3, name: 'Sector 3', startDistance: 2111, endDistance: 3167 }
    ],
    corners: [
      { number: 1, name: 'Turn 1', type: 'right', apex: { distance: 300, x: 350, y: 350, normalizedDistance: 0.095 }, braking: { distance: 200, x: 300, y: 370 }, exit: { distance: 400, x: 400, y: 320 }, gear: 2, apexSpeed: 70, difficulty: 'hard', notes: 'Tight right into harbour section' },
      { number: 4, name: 'Fountain Turn', type: 'hairpin', apex: { distance: 1000, x: 700, y: 150, normalizedDistance: 0.316 }, braking: { distance: 850, x: 650, y: 180 }, exit: { distance: 1150, x: 730, y: 130 }, gear: 1, apexSpeed: 45, difficulty: 'hard', notes: 'Slowest point, tight hairpin' },
      { number: 6, name: 'Turn 6', type: 'right', apex: { distance: 1600, x: 900, y: 300, normalizedDistance: 0.505 }, entry: { distance: 1500, x: 850, y: 270 }, exit: { distance: 1700, x: 920, y: 340 }, gear: 3, apexSpeed: 110, difficulty: 'medium' },
      { number: 8, name: 'Turn 8', type: 'left', apex: { distance: 2200, x: 800, y: 500, normalizedDistance: 0.695 }, braking: { distance: 2100, x: 830, y: 460 }, exit: { distance: 2300, x: 760, y: 530 }, gear: 2, apexSpeed: 65, difficulty: 'hard' },
      { number: 11, name: 'Turn 11', type: 'right', apex: { distance: 2900, x: 400, y: 500, normalizedDistance: 0.916 }, braking: { distance: 2750, x: 450, y: 510 }, exit: { distance: 3050, x: 350, y: 480 }, gear: 2, apexSpeed: 60, difficulty: 'hard', notes: 'Final corner, no runoff' }
    ],
    svg: {
      viewBox: '0 0 1000 600',
      path: 'M 200,400 L 350,350 Q 500,280 650,220 L 800,170 Q 910,160 940,240 L 920,370 Q 890,470 800,520 L 600,550 Q 400,560 280,510 L 210,440 Q 195,420 200,400 Z'
    },
    metadata: {
      direction: 'clockwise',
      elevation: { minimum: 5, maximum: 15, change: 10 },
      coordinates: { latitude: 33.7627, longitude: -118.1896 }
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

// Strip year suffixes and version numbers from iRacing track names
// e.g. 'daytona 2011 oval' -> 'daytonaoval', 'spa 2024' -> 'spa'
function stripTrackYear(name: string): string {
  return name.replace(/\b(19|20)\d{2}\b/g, '').replace(/[^a-z0-9]/g, '');
}

// Get track ID from name - returns numeric iRacing ID for shape file loading
export function getTrackId(trackName: string): string {
  const normalized = trackName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalizedNoYear = stripTrackYear(trackName.toLowerCase());

  // Two-pass matching: first find slugs the input CONTAINS (input is more specific),
  // then fall back to slugs that CONTAIN the input (input is less specific).
  // Within each pass, prefer the longest matching slug for specificity.
  // This ensures 'daytona 2011 oval' → 'daytona-oval' (191) not 'daytona' (381).
  let bestContains: { id: string; len: number } | null = null;   // input contains slug
  let bestContainedBy: { id: string; len: number } | null = null; // slug contains input
  for (const [slug, id] of Object.entries(TRACK_SLUG_MAP)) {
    const slugNorm = slug.replace(/-/g, '');
    // Pass 1: input contains slug (e.g. "daytonaoval" contains "daytonaoval" or "daytona")
    if (normalized.includes(slugNorm) || normalizedNoYear.includes(slugNorm)) {
      if (!bestContains || slugNorm.length > bestContains.len) {
        bestContains = { id, len: slugNorm.length };
      }
    }
    // Pass 2: slug contains input (e.g. "daytonaroad" contains "daytona")
    else if (slugNorm.includes(normalized) || slugNorm.includes(normalizedNoYear)) {
      if (!bestContainedBy || slugNorm.length < bestContainedBy.len) {
        // Prefer SHORTEST slug that contains input (closest match)
        bestContainedBy = { id, len: slugNorm.length };
      }
    }
  }
  // Prefer "input contains slug" matches (more precise)
  if (bestContains) {
    return bestContains.id;
  }
  if (bestContainedBy) {
    return bestContainedBy.id;
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
