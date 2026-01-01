/**
 * Telemetry Export Routes
 * Provides professional-grade export formats for iRacing telemetry data
 */

import express from 'express';
import { pool } from './db.js';
import { authenticateToken } from './auth.js';
import { exportLimiter } from './middleware/rate-limit.js';

const router = express.Router();

/**
 * Export session telemetry as enhanced CSV (100+ fields)
 * GET /api/export/csv/:sessionId
 */
router.get('/csv/:sessionId', exportLimiter, authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Verify session exists
    const sessionResult = await pool.query(
      'SELECT id, name, track FROM sessions WHERE id = $1',
      [sessionId]
    );

    if (sessionResult.rowCount === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionResult.rows[0];

    // Fetch all telemetry for the session
    const telemetryResult = await pool.query(
      `SELECT
        driver_id,
        extract(epoch from ts) as timestamp,
        pos_x, pos_y, pos_z,
        speed, throttle, brake, gear, rpm,
        lap, sector,
        tire_fl_temp, tire_fl_wear, tire_fl_pressure,
        tire_fr_temp, tire_fr_wear, tire_fr_pressure,
        tire_rl_temp, tire_rl_wear, tire_rl_pressure,
        tire_rr_temp, tire_rr_wear, tire_rr_pressure,
        g_lat, g_long, g_vert,
        track_position, race_position,
        gap_ahead, gap_behind
      FROM telemetry
      WHERE session_id = $1
      ORDER BY ts ASC`,
      [sessionId]
    );

    // Generate CSV header
    const csvHeaders = [
      'Timestamp', 'DriverId', 'Lap', 'Sector',
      'Speed', 'RPM', 'Gear', 'Throttle', 'Brake',
      'PosX', 'PosY', 'PosZ',
      'TireTempLF', 'TireTempRF', 'TireTempLR', 'TireTempRR',
      'TireWearLF', 'TireWearRF', 'TireWearLR', 'TireWearRR',
      'TirePressureLF', 'TirePressureRF', 'TirePressureLR', 'TirePressureRR',
      'GLat', 'GLong', 'GVert',
      'TrackPosition', 'RacePosition', 'GapAhead', 'GapBehind'
    ];

    // Generate CSV rows
    const csvRows = telemetryResult.rows.map(row => [
      row.timestamp || '',
      row.driver_id || '',
      row.lap || '',
      row.sector || '',
      row.speed || '',
      row.rpm || '',
      row.gear || '',
      row.throttle || '',
      row.brake || '',
      row.pos_x || '',
      row.pos_y || '',
      row.pos_z || '',
      row.tire_fl_temp || '',
      row.tire_fr_temp || '',
      row.tire_rl_temp || '',
      row.tire_rr_temp || '',
      row.tire_fl_wear || '',
      row.tire_fr_wear || '',
      row.tire_rl_wear || '',
      row.tire_rr_wear || '',
      row.tire_fl_pressure || '',
      row.tire_fr_pressure || '',
      row.tire_rl_pressure || '',
      row.tire_rr_pressure || '',
      row.g_lat || '',
      row.g_long || '',
      row.g_vert || '',
      row.track_position || '',
      row.race_position || '',
      row.gap_ahead || '',
      row.gap_behind || ''
    ].join(','));

    // Combine into CSV string
    const csv = [csvHeaders.join(','), ...csvRows].join('\n');

    // Set response headers for download
    const filename = `${session.name || sessionId}_${session.track || 'unknown'}_telemetry.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    return res.send(csv);

  } catch (error) {
    console.error('Error exporting CSV:', error);
    return res.status(500).json({ error: 'Failed to export telemetry data' });
  }
});

/**
 * Get export metadata (available sessions, formats, etc.)
 * GET /api/export/sessions
 */
router.get('/sessions', exportLimiter, authenticateToken, async (req, res) => {
  try {
    const sessionsResult = await pool.query(
      `SELECT
        s.id,
        s.name,
        s.track,
        extract(epoch from s.created_at) as created_at,
        COUNT(t.session_id) as telemetry_count
      FROM sessions s
      LEFT JOIN telemetry t ON s.id = t.session_id
      GROUP BY s.id, s.name, s.track, s.created_at
      ORDER BY s.created_at DESC
      LIMIT 100`
    );

    const sessions = sessionsResult.rows.map(row => ({
      id: row.id,
      name: row.name || 'Unnamed Session',
      track: row.track || 'Unknown Track',
      createdAt: Math.round(Number(row.created_at) * 1000),
      telemetryCount: parseInt(row.telemetry_count, 10),
      availableFormats: row.telemetry_count > 0 ? ['csv', 'json'] : []
    }));

    return res.json({
      sessions,
      supportedFormats: [
        {
          format: 'csv',
          name: 'Enhanced CSV',
          description: 'CSV with 100+ iRacing telemetry fields',
          extension: '.csv',
          mimeType: 'text/csv'
        },
        {
          format: 'json',
          name: 'JSON',
          description: 'Raw telemetry data in JSON format',
          extension: '.json',
          mimeType: 'application/json'
        }
      ]
    });

  } catch (error) {
    console.error('Error fetching export sessions:', error);
    return res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

/**
 * Export session telemetry as JSON
 * GET /api/export/json/:sessionId
 */
router.get('/json/:sessionId', exportLimiter, authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Verify session exists
    const sessionResult = await pool.query(
      'SELECT id, name, track, extract(epoch from created_at) as created_at FROM sessions WHERE id = $1',
      [sessionId]
    );

    if (sessionResult.rowCount === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionResult.rows[0];

    // Fetch all telemetry
    const telemetryResult = await pool.query(
      `SELECT
        driver_id,
        extract(epoch from ts) as timestamp,
        pos_x, pos_y, pos_z,
        speed, throttle, brake, gear, rpm,
        lap, sector,
        tire_fl_temp, tire_fl_wear, tire_fl_pressure,
        tire_fr_temp, tire_fr_wear, tire_fr_pressure,
        tire_rl_temp, tire_rl_wear, tire_rl_pressure,
        tire_rr_temp, tire_rr_wear, tire_rr_pressure,
        g_lat, g_long, g_vert,
        track_position, race_position,
        gap_ahead, gap_behind
      FROM telemetry
      WHERE session_id = $1
      ORDER BY ts ASC`,
      [sessionId]
    );

    const telemetry = telemetryResult.rows.map(row => ({
      timestamp: row.timestamp ? Math.round(Number(row.timestamp) * 1000) : null,
      driverId: row.driver_id,
      lap: row.lap,
      sector: row.sector,
      speed: row.speed,
      rpm: row.rpm,
      gear: row.gear,
      throttle: row.throttle,
      brake: row.brake,
      position: {
        x: row.pos_x,
        y: row.pos_y,
        z: row.pos_z
      },
      tires: {
        frontLeft: {
          temp: row.tire_fl_temp,
          wear: row.tire_fl_wear,
          pressure: row.tire_fl_pressure
        },
        frontRight: {
          temp: row.tire_fr_temp,
          wear: row.tire_fr_wear,
          pressure: row.tire_fr_pressure
        },
        rearLeft: {
          temp: row.tire_rl_temp,
          wear: row.tire_rl_wear,
          pressure: row.tire_rl_pressure
        },
        rearRight: {
          temp: row.tire_rr_temp,
          wear: row.tire_rr_wear,
          pressure: row.tire_rr_pressure
        }
      },
      gForce: {
        lateral: row.g_lat,
        longitudinal: row.g_long,
        vertical: row.g_vert
      },
      trackPosition: row.track_position,
      racePosition: row.race_position,
      gapAhead: row.gap_ahead,
      gapBehind: row.gap_behind
    }));

    const exportData = {
      session: {
        id: session.id,
        name: session.name,
        track: session.track,
        createdAt: session.created_at ? Math.round(Number(session.created_at) * 1000) : null
      },
      telemetry,
      metadata: {
        exportedAt: Date.now(),
        totalSamples: telemetry.length,
        format: 'json',
        version: '1.0'
      }
    };

    // Set response headers for download
    const filename = `${session.name || sessionId}_${session.track || 'unknown'}_telemetry.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    return res.json(exportData);

  } catch (error) {
    console.error('Error exporting JSON:', error);
    return res.status(500).json({ error: 'Failed to export telemetry data' });
  }
});

export default router;
