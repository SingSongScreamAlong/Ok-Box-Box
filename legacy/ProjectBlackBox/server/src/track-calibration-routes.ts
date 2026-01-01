/**
 * Track Map Calibration Routes
 * Upload telemetry to generate production-quality track maps
 */

import express from 'express';
import { authenticateToken } from './auth.js';
import { spawn } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Upload telemetry CSV and generate accurate track map
 * POST /api/calibrate/track
 * Body: { telemetryData: [...], trackName: "...", carClass: "..." }
 */
router.post('/track', authenticateToken, async (req, res) => {
  try {
    const { telemetryData, trackName, carClass } = req.body;

    if (!telemetryData || !Array.isArray(telemetryData) || telemetryData.length < 100) {
      return res.status(400).json({
        error: 'Invalid telemetry data',
        detail: 'Minimum 100 samples required for track calibration'
      });
    }

    // Validate telemetry format
    const requiredFields = ['timestamp', 'distance', 'speed', 'brake', 'throttle', 'pos_x', 'pos_y'];
    const firstSample = telemetryData[0];

    for (const field of requiredFields) {
      if (!(field in firstSample)) {
        return res.status(400).json({
          error: 'Missing required telemetry field',
          detail: `Field '${field}' is required in telemetry data`
        });
      }
    }

    // Generate unique calibration ID
    const calibrationId = uuidv4();

    // Save telemetry to temp CSV file
    const tempCsvPath = join('/tmp', `calibration_${calibrationId}.csv`);
    const csvContent = convertTelemetryToCSV(telemetryData, trackName, carClass);
    writeFileSync(tempCsvPath, csvContent);

    // Call Python track analyzer
    const pythonScript = join(__dirname, '../../relay_agent/track_analyzer.py');
    const outputPath = join('/tmp', `track_${calibrationId}.json`);

    const result = await runPythonAnalyzer(pythonScript, tempCsvPath, outputPath);

    if (!result.success) {
      // Cleanup
      try {
        unlinkSync(tempCsvPath);
      } catch (e) {
        /* ignore */
      }

      return res.status(500).json({
        error: 'Track analysis failed',
        detail: result.error
      });
    }

    // Read generated track map
    const trackMapData = JSON.parse(readFileSync(outputPath, 'utf-8'));

    // Save to track data directory
    const trackId = trackMapData.id || trackName.toLowerCase().replace(/\s+/g, '-');
    const finalPath = join(__dirname, 'data', 'tracks', `${trackId}.json`);
    writeFileSync(finalPath, JSON.stringify(trackMapData, null, 2));

    // Cleanup temp files
    try {
      unlinkSync(tempCsvPath);
      unlinkSync(outputPath);
    } catch (e) {
      /* ignore cleanup errors */
    }

    return res.json({
      success: true,
      trackId,
      trackName: trackMapData.name,
      corners: trackMapData.corners.length,
      length: trackMapData.length,
      calibrationInfo: trackMapData.calibration_info,
      message: 'Track map generated successfully from telemetry',
      endpoints: {
        trackData: `/api/tracks/${trackId}`,
        svg: `/api/tracks/${trackId}/svg`,
        corners: `/api/tracks/${trackId}/corners`
      }
    });

  } catch (error) {
    console.error('Track calibration error:', error);
    return res.status(500).json({
      error: 'Internal error during track calibration',
      detail: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get calibration status and quality metrics
 * GET /api/calibrate/status/:trackId
 */
router.get('/status/:trackId', authenticateToken, async (req, res) => {
  try {
    const { trackId } = req.params;
    const trackPath = join(__dirname, 'data', 'tracks', `${trackId}.json`);

    const trackData = JSON.parse(readFileSync(trackPath, 'utf-8'));

    const calibrationInfo = trackData.calibration_info || {};

    return res.json({
      trackId,
      trackName: trackData.name,
      calibrationStatus: {
        source: calibrationInfo.source || 'unknown',
        confidence: calibrationInfo.confidence || 'unknown',
        validated: calibrationInfo.validated || false,
        sampleCount: calibrationInfo.sample_count || 0,
        cornerCount: trackData.corners.length,
        calibrationDate: calibrationInfo.calibration_date
      },
      quality: assessTrackQuality(trackData),
      recommendations: generateRecommendations(trackData)
    });

  } catch (error) {
    return res.status(404).json({
      error: 'Track not found or not calibrated',
      detail: 'Upload telemetry data to calibrate this track'
    });
  }
});

/**
 * Validate track map accuracy
 * POST /api/calibrate/validate/:trackId
 * Body: { telemetryData: [...] }
 */
router.post('/validate/:trackId', authenticateToken, async (req, res) => {
  try {
    const { trackId } = req.params;
    const { telemetryData } = req.body;

    if (!telemetryData || !Array.isArray(telemetryData)) {
      return res.status(400).json({ error: 'Telemetry data required for validation' });
    }

    // Load track map
    const trackPath = join(__dirname, 'data', 'tracks', `${trackId}.json`);
    const trackData = JSON.parse(readFileSync(trackPath, 'utf-8'));

    // Validate telemetry against track map
    const validationResults = validateTelemetryAgainstTrack(telemetryData, trackData);

    return res.json({
      trackId,
      valid: validationResults.accuracy > 0.85,
      accuracy: validationResults.accuracy,
      cornerMatchRate: validationResults.cornerMatchRate,
      lengthDifference: validationResults.lengthDifference,
      issues: validationResults.issues,
      recommendation: validationResults.accuracy > 0.95
        ? 'Track map is highly accurate'
        : validationResults.accuracy > 0.85
        ? 'Track map is acceptable but could be improved'
        : 'Consider recalibrating track map with better telemetry data'
    });

  } catch (error) {
    return res.status(404).json({ error: 'Track not found' });
  }
});

/**
 * Helper: Convert telemetry to CSV format
 */
function convertTelemetryToCSV(telemetryData: any[], trackName?: string, carClass?: string): string {
  const headers = [
    'timestamp', 'distance', 'speed', 'rpm', 'gear', 'throttle', 'brake',
    'pos_x', 'pos_y', 'pos_z', 'g_lat', 'g_long', 'lap', 'sector',
    'track_name', 'car_class'
  ];

  const rows = telemetryData.map(sample => [
    sample.timestamp || 0,
    sample.distance || 0,
    sample.speed || 0,
    sample.rpm || 0,
    sample.gear || 0,
    sample.throttle || 0,
    sample.brake || 0,
    sample.pos_x || sample.position?.x || 0,
    sample.pos_y || sample.position?.y || 0,
    sample.pos_z || sample.position?.z || 0,
    sample.g_lat || sample.gForce?.lateral || 0,
    sample.g_long || sample.gForce?.longitudinal || 0,
    sample.lap || 0,
    sample.sector || 0,
    trackName || 'Unknown',
    carClass || 'GT3'
  ]);

  const csvLines = [headers.join(','), ...rows.map(row => row.join(','))];
  return csvLines.join('\n');
}

/**
 * Helper: Run Python track analyzer
 */
function runPythonAnalyzer(scriptPath: string, csvPath: string, outputPath: string): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const python = spawn('python3', [scriptPath, csvPath, outputPath]);

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({ success: false, error: stderr || 'Python script failed' });
      }
    });

    python.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      python.kill();
      resolve({ success: false, error: 'Analysis timeout' });
    }, 30000);
  });
}

/**
 * Helper: Assess track quality
 */
function assessTrackQuality(trackData: any): any {
  const corners = trackData.corners || [];
  const calibrationInfo = trackData.calibration_info || {};

  const quality = {
    overall: 'unknown',
    cornerCoverage: corners.length > 0 ? 'good' : 'poor',
    dataSource: calibrationInfo.source || 'unknown',
    sampleSize: calibrationInfo.sample_count || 0,
    confidence: calibrationInfo.confidence || 'low'
  };

  // Calculate overall quality
  if (calibrationInfo.source === 'real_telemetry' && calibrationInfo.sample_count > 500) {
    quality.overall = 'excellent';
  } else if (calibrationInfo.source === 'real_telemetry') {
    quality.overall = 'good';
  } else {
    quality.overall = 'estimated';
  }

  return quality;
}

/**
 * Helper: Generate recommendations
 */
function generateRecommendations(trackData: any): string[] {
  const recommendations = [];
  const calibrationInfo = trackData.calibration_info || {};

  if (calibrationInfo.source !== 'real_telemetry') {
    recommendations.push('Upload real telemetry data to improve accuracy');
  }

  if (calibrationInfo.sample_count < 500) {
    recommendations.push('Drive a longer lap for better corner detection');
  }

  if (!trackData.corners || trackData.corners.length < 5) {
    recommendations.push('Track has few corners detected - verify telemetry quality');
  }

  if (recommendations.length === 0) {
    recommendations.push('Track map quality is excellent - no improvements needed');
  }

  return recommendations;
}

/**
 * Helper: Validate telemetry against track
 */
function validateTelemetryAgainstTrack(telemetry: any[], trackData: any): any {
  const issues = [];
  let cornerMatches = 0;
  const trackCorners = trackData.corners || [];

  // Check track length
  const telemetryLength = Math.max(...telemetry.map(s => s.distance || 0));
  const trackLength = trackData.length || 0;
  const lengthDiff = Math.abs(telemetryLength - trackLength) / trackLength;

  if (lengthDiff > 0.1) {
    issues.push(`Track length mismatch: ${(lengthDiff * 100).toFixed(1)}% difference`);
  }

  // Check corner detection
  for (const corner of trackCorners) {
    const cornerDistance = corner.apex?.distance || 0;

    // Find if telemetry has braking near this corner
    const nearbyBraking = telemetry.find(s => {
      const dist = Math.abs((s.distance || 0) - cornerDistance);
      return dist < 100 && (s.brake || 0) > 0.3;
    });

    if (nearbyBraking) {
      cornerMatches++;
    }
  }

  const cornerMatchRate = trackCorners.length > 0 ? cornerMatches / trackCorners.length : 0;

  if (cornerMatchRate < 0.8) {
    issues.push(`Only ${(cornerMatchRate * 100).toFixed(0)}% of corners matched`);
  }

  // Calculate overall accuracy
  const accuracy = (1 - lengthDiff * 0.5) * (0.5 + cornerMatchRate * 0.5);

  return {
    accuracy: Math.max(0, Math.min(1, accuracy)),
    cornerMatchRate,
    lengthDifference: lengthDiff,
    issues
  };
}

export default router;
