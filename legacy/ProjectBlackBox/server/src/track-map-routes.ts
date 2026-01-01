/**
 * Track Map Routes
 * Provides track layout data, corner information, and SVG visualizations
 */

import express from 'express';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Track data cache
const trackCache = new Map<string, any>();

/**
 * Load track data from JSON file
 */
function loadTrackData(trackId: string): any | null {
  // Check cache first
  if (trackCache.has(trackId)) {
    return trackCache.get(trackId);
  }

  try {
    const trackPath = join(__dirname, 'data', 'tracks', `${trackId}.json`);
    const trackData = JSON.parse(readFileSync(trackPath, 'utf-8'));

    // Cache the data
    trackCache.set(trackId, trackData);

    return trackData;
  } catch (error) {
    console.error(`Error loading track data for ${trackId}:`, error);
    return null;
  }
}

/**
 * List all available tracks
 * GET /api/tracks
 */
router.get('/', (req, res) => {
  const tracks = [
    {
      id: 'spa-francorchamps',
      name: 'Circuit de Spa-Francorchamps',
      country: 'Belgium',
      length: 7004,
      lengthUnit: 'meters',
      preview: '/api/tracks/spa-francorchamps/svg'
    },
    {
      id: 'watkins-glen',
      name: 'Watkins Glen International',
      country: 'USA',
      length: 5430,
      lengthUnit: 'meters',
      preview: '/api/tracks/watkins-glen/svg'
    },
    {
      id: 'road-atlanta',
      name: 'Road Atlanta',
      country: 'USA',
      length: 4088,
      lengthUnit: 'meters',
      preview: '/api/tracks/road-atlanta/svg'
    }
  ];

  return res.json({ tracks, count: tracks.length });
});

/**
 * Get track details
 * GET /api/tracks/:trackId
 */
router.get('/:trackId', (req, res) => {
  const { trackId } = req.params;
  const trackData = loadTrackData(trackId);

  if (!trackData) {
    return res.status(404).json({ error: 'Track not found' });
  }

  return res.json(trackData);
});

/**
 * Get track corners only
 * GET /api/tracks/:trackId/corners
 */
router.get('/:trackId/corners', (req, res) => {
  const { trackId } = req.params;
  const trackData = loadTrackData(trackId);

  if (!trackData) {
    return res.status(404).json({ error: 'Track not found' });
  }

  return res.json({
    trackId,
    trackName: trackData.name,
    corners: trackData.corners,
    count: trackData.corners.length
  });
});

/**
 * Get track sectors
 * GET /api/tracks/:trackId/sectors
 */
router.get('/:trackId/sectors', (req, res) => {
  const { trackId } = req.params;
  const trackData = loadTrackData(trackId);

  if (!trackData) {
    return res.status(404).json({ error: 'Track not found' });
  }

  return res.json({
    trackId,
    trackName: trackData.name,
    sectors: trackData.sectors,
    count: trackData.sectors.length
  });
});

/**
 * Get track SVG visualization
 * GET /api/tracks/:trackId/svg
 */
router.get('/:trackId/svg', (req, res) => {
  const { trackId } = req.params;
  const trackData = loadTrackData(trackId);

  if (!trackData) {
    return res.status(404).json({ error: 'Track not found' });
  }

  if (!trackData.svg) {
    return res.status(404).json({ error: 'SVG not available for this track' });
  }

  // Generate complete SVG
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${trackData.svg.viewBox}" width="100%" height="100%">
  <defs>
    <style>
      .track-outline { fill: none; stroke: #333; stroke-width: 20; }
      .track-center { fill: none; stroke: #666; stroke-width: 2; stroke-dasharray: 10,5; }
      .corner-marker { fill: #FF6B6B; stroke: #C92A2A; stroke-width: 2; }
      .corner-label { font-family: Arial, sans-serif; font-size: 24px; fill: #fff; text-anchor: middle; }
      .start-finish { fill: #4ECDC4; stroke: #0B7285; stroke-width: 3; }
    </style>
  </defs>

  <!-- Track outline -->
  <path class="track-outline" d="${trackData.svg.path}" />

  <!-- Center line -->
  <path class="track-center" d="${trackData.svg.path}" />

  <!-- Start/Finish line -->
  <rect class="start-finish" x="80" y="90" width="40" height="20" />
  <text x="100" y="75" style="font-size: 20px; fill: #0B7285; font-weight: bold; text-anchor: middle;">S/F</text>

  <!-- Corner markers -->
  ${trackData.corners.map((corner: any) => `
  <circle class="corner-marker" cx="${corner.apex.x}" cy="${Math.abs(corner.apex.y)}" r="15" />
  <text class="corner-label" x="${corner.apex.x}" y="${Math.abs(corner.apex.y) + 6}">${corner.number}</text>
  `).join('')}
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  return res.send(svg);
});

/**
 * Find corner at specific track distance
 * GET /api/tracks/:trackId/corner-at/:distance
 */
router.get('/:trackId/corner-at/:distance', (req, res) => {
  const { trackId, distance } = req.params;
  const trackData = loadTrackData(trackId);

  if (!trackData) {
    return res.status(404).json({ error: 'Track not found' });
  }

  const trackDistance = parseFloat(distance);
  if (isNaN(trackDistance)) {
    return res.status(400).json({ error: 'Invalid distance parameter' });
  }

  // Find nearest corner
  let nearestCorner = null;
  let minDistance = Infinity;

  for (const corner of trackData.corners) {
    const dist = Math.abs(corner.apex.distance - trackDistance);
    if (dist < minDistance) {
      minDistance = dist;
      nearestCorner = corner;
    }
  }

  if (!nearestCorner) {
    return res.status(404).json({ error: 'No corner found' });
  }

  return res.json({
    trackId,
    trackDistance,
    nearestCorner,
    distanceToCorner: minDistance,
    approaching: trackDistance < nearestCorner.apex.distance
  });
});

/**
 * Get reference lap data (ideal line with corner info)
 * GET /api/tracks/:trackId/reference-lap
 */
router.get('/:trackId/reference-lap', (req, res) => {
  const { trackId } = req.params;
  const trackData = loadTrackData(trackId);

  if (!trackData) {
    return res.status(404).json({ error: 'Track not found' });
  }

  // Generate reference lap data with ideal speeds and gears
  const referenceLap = {
    trackId,
    trackName: trackData.name,
    totalLength: trackData.length,
    sectors: trackData.sectors,
    cornerApproaches: trackData.corners.map((corner: any) => ({
      cornerNumber: corner.number,
      cornerName: corner.name,
      approachSpeed: corner.braking ? calculateApproachSpeed(corner) : corner.apexSpeed + 30,
      brakingPoint: corner.braking?.distance || corner.apex.distance - 100,
      turnInPoint: corner.entry?.distance || corner.apex.distance - 50,
      apexPoint: corner.apex.distance,
      apexSpeed: corner.apexSpeed,
      apexGear: corner.gear,
      exitPoint: corner.exit?.distance || corner.apex.distance + 50,
      difficulty: corner.difficulty,
      notes: corner.notes || ''
    }))
  };

  return res.json(referenceLap);
});

/**
 * Calculate approach speed based on corner data
 */
function calculateApproachSpeed(corner: any): number {
  // Estimate approach speed based on apex speed and corner type
  const speedMultipliers: Record<string, number> = {
    'hairpin': 3.0,
    'right': 1.8,
    'left': 1.8,
    'chicane': 2.2,
    'left-kink': 1.2,
    'right-kink': 1.2,
    'left-right-left': 1.9,
    'right-left': 1.9,
    'double-left': 1.5
  };

  const multiplier = speedMultipliers[corner.type] || 2.0;
  return Math.round(corner.apexSpeed * multiplier);
}

/**
 * Map telemetry position to track distance
 * POST /api/tracks/:trackId/map-position
 */
router.post('/:trackId/map-position', (req, res) => {
  const { trackId } = req.params;
  const { x, y, z } = req.body;

  const trackData = loadTrackData(trackId);

  if (!trackData) {
    return res.status(404).json({ error: 'Track not found' });
  }

  if (x === undefined || y === undefined) {
    return res.status(400).json({ error: 'x and y coordinates are required' });
  }

  // Simple distance estimation (in production, use proper track mapping)
  // This is a placeholder algorithm
  const estimatedDistance = Math.sqrt(x * x + y * y) % trackData.length;
  const normalizedDistance = estimatedDistance / trackData.length;

  // Find current sector
  const currentSector = trackData.sectors.find((sector: any) =>
    estimatedDistance >= sector.startDistance && estimatedDistance <= sector.endDistance
  ) || trackData.sectors[0];

  return res.json({
    position: { x, y, z },
    trackDistance: Math.round(estimatedDistance),
    normalizedDistance: normalizedDistance.toFixed(4),
    sector: currentSector.number,
    sectorName: currentSector.name
  });
});

export default router;
