import express from 'express';
import { pool } from './db.js';
import { authenticateToken, AuthRequest } from './auth.js';
import { logApiRequest, logUserAction, logError } from './logger.js';

const router = express.Router();

// Multi-driver session management
interface MultiDriverSession {
  id: string;
  name: string;
  track: string;
  status: 'active' | 'paused' | 'completed';
  createdAt: number;
  drivers: MultiDriver[];
  currentDriverId?: string;
}

interface MultiDriver {
  id: string;
  name: string;
  status: 'active' | 'standby' | 'offline';
  role: 'driver' | 'co-driver' | 'reserve';
  joinedAt: number;
  lastActivity: number;
  telemetryCount: number;
}

// Create multi-driver session
router.post('/sessions', authenticateToken, async (req: AuthRequest, res) => {
  const startTime = Date.now();

  try {
    const { name, track, driverIds } = req.body;

    if (!name || !track || !Array.isArray(driverIds) || driverIds.length === 0) {
      logApiRequest('POST', '/api/multi-driver/sessions', 400, Date.now() - startTime, req.user?.id);
      return res.status(400).json({
        error: 'Name, track, and driver IDs are required'
      });
    }

    // Create session
    const sessionId = `md_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await pool.query(
      'INSERT INTO multi_driver_sessions (id, name, track, status, created_by, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
      [sessionId, name, track, 'active', req.user!.id]
    );

    // Add drivers to session
    for (let i = 0; i < driverIds.length; i++) {
      const driverId = driverIds[i];
      const role = i === 0 ? 'driver' : 'co-driver';

      await pool.query(
        'INSERT INTO multi_driver_participants (session_id, driver_id, role, status, joined_at) VALUES ($1, $2, $3, $4, NOW())',
        [sessionId, driverId, role, 'standby']
      );
    }

    // Set first driver as active
    if (driverIds.length > 0) {
      await pool.query(
        'UPDATE multi_driver_participants SET status = $1 WHERE session_id = $2 AND driver_id = $3',
        ['active', sessionId, driverIds[0]]
      );
    }

    logUserAction(req.user!.id, 'create_multi_driver_session', sessionId, true, {
      driverCount: driverIds.length
    });

    logApiRequest('POST', '/api/multi-driver/sessions', 201, Date.now() - startTime, req.user?.id);
    res.status(201).json({
      sessionId,
      message: 'Multi-driver session created successfully'
    });

  } catch (error) {
    logError('Error creating multi-driver session', error instanceof Error ? error : new Error(String(error)), {
      userId: req.user?.id,
      body: req.body
    });
    logApiRequest('POST', '/api/multi-driver/sessions', 500, Date.now() - startTime, req.user?.id);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get multi-driver sessions
router.get('/sessions', authenticateToken, async (req: AuthRequest, res) => {
  const startTime = Date.now();

  try {
    const sessions = await pool.query(`
      SELECT
        mds.id,
        mds.name,
        mds.track,
        mds.status,
        mds.created_at,
        COUNT(mdp.driver_id) as driver_count,
        STRING_AGG(u.name, ', ') as driver_names
      FROM multi_driver_sessions mds
      LEFT JOIN multi_driver_participants mdp ON mds.id = mdp.session_id
      LEFT JOIN users u ON mdp.driver_id = u.id
      WHERE mds.created_by = $1 OR mdp.driver_id = $1
      GROUP BY mds.id, mds.name, mds.track, mds.status, mds.created_at
      ORDER BY mds.created_at DESC
    `, [req.user!.id]);

    const result = sessions.rows.map(row => ({
      id: row.id,
      name: row.name,
      track: row.track,
      status: row.status,
      createdAt: Math.floor(new Date(row.created_at).getTime() / 1000),
      driverCount: parseInt(row.driver_count),
      driverNames: row.driver_names
    }));

    logApiRequest('GET', '/api/multi-driver/sessions', 200, Date.now() - startTime, req.user?.id);
    res.json({ sessions: result });

  } catch (error) {
    logError('Error fetching multi-driver sessions', error instanceof Error ? error : new Error(String(error)), {
      userId: req.user?.id
    });
    logApiRequest('GET', '/api/multi-driver/sessions', 500, Date.now() - startTime, req.user?.id);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific multi-driver session
router.get('/sessions/:sessionId', authenticateToken, async (req: AuthRequest, res) => {
  const startTime = Date.now();

  try {
    const { sessionId } = req.params;

    // Get session info
    const sessionResult = await pool.query(`
      SELECT
        mds.id,
        mds.name,
        mds.track,
        mds.status,
        mds.created_at,
        mds.created_by,
        u.name as created_by_name
      FROM multi_driver_sessions mds
      JOIN users u ON mds.created_by = u.id
      WHERE mds.id = $1
    `, [sessionId]);

    if (sessionResult.rows.length === 0) {
      logApiRequest('GET', `/api/multi-driver/sessions/${sessionId}`, 404, Date.now() - startTime, req.user?.id);
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get participants
    const participantsResult = await pool.query(`
      SELECT
        mdp.driver_id,
        u.name as driver_name,
        mdp.role,
        mdp.status,
        mdp.joined_at,
        mdp.last_activity,
        COUNT(t.id) as telemetry_count
      FROM multi_driver_participants mdp
      JOIN users u ON mdp.driver_id = u.id
      LEFT JOIN telemetry t ON t.driver_id = mdp.driver_id AND t.session_id = $1
      WHERE mdp.session_id = $1
      GROUP BY mdp.driver_id, u.name, mdp.role, mdp.status, mdp.joined_at, mdp.last_activity
    `, [sessionId]);

    const session = sessionResult.rows[0];
    const participants = participantsResult.rows.map(row => ({
      id: row.driver_id,
      name: row.driver_name,
      role: row.role,
      status: row.status,
      joinedAt: Math.floor(new Date(row.joined_at).getTime() / 1000),
      lastActivity: row.last_activity ? Math.floor(new Date(row.last_activity).getTime() / 1000) : null,
      telemetryCount: parseInt(row.telemetry_count)
    }));

    const result = {
      id: session.id,
      name: session.name,
      track: session.track,
      status: session.status,
      createdAt: Math.floor(new Date(session.created_at).getTime() / 1000),
      createdBy: {
        id: session.created_by,
        name: session.created_by_name
      },
      drivers: participants,
      currentDriverId: participants.find((p: any) => p.status === 'active')?.id
    };

    logApiRequest('GET', `/api/multi-driver/sessions/${sessionId}`, 200, Date.now() - startTime, req.user?.id);
    res.json({ session: result });

  } catch (error) {
    logError('Error fetching multi-driver session', error instanceof Error ? error : new Error(String(error)), {
      userId: req.user?.id,
      sessionId: req.params.sessionId
    });
    logApiRequest('GET', `/api/multi-driver/sessions/${req.params.sessionId}`, 500, Date.now() - startTime, req.user?.id);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Switch active driver
router.post('/sessions/:sessionId/switch', authenticateToken, async (req: AuthRequest, res) => {
  const startTime = Date.now();

  try {
    const { sessionId } = req.params;
    const { newDriverId, reason } = req.body;

    if (!newDriverId) {
      logApiRequest('POST', `/api/multi-driver/sessions/${sessionId}/switch`, 400, Date.now() - startTime, req.user?.id);
      return res.status(400).json({ error: 'New driver ID is required' });
    }

    // Verify session exists and user is participant
    const sessionCheck = await pool.query(`
      SELECT mds.id FROM multi_driver_sessions mds
      JOIN multi_driver_participants mdp ON mds.id = mdp.session_id
      WHERE mds.id = $1 AND mdp.driver_id = $2
    `, [sessionId, req.user!.id]);

    if (sessionCheck.rows.length === 0) {
      logApiRequest('POST', `/api/multi-driver/sessions/${sessionId}/switch`, 403, Date.now() - startTime, req.user?.id);
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update driver statuses
    await pool.query('UPDATE multi_driver_participants SET status = $1 WHERE session_id = $2 AND status = $3',
      ['standby', sessionId, 'active']);
    await pool.query('UPDATE multi_driver_participants SET status = $1 WHERE session_id = $2 AND driver_id = $3',
      ['active', sessionId, newDriverId]);

    // Log the switch
    await pool.query(`
      INSERT INTO multi_driver_switches (session_id, from_driver_id, to_driver_id, reason, switched_at)
      SELECT $1, driver_id, $2, $3, NOW()
      FROM multi_driver_participants
      WHERE session_id = $1 AND status = $4
      LIMIT 1
    `, [sessionId, newDriverId, reason || 'Manual switch', 'standby']);

    logUserAction(req.user!.id, 'switch_driver', sessionId, true, {
      newDriverId,
      reason: reason || 'Manual switch'
    });

    logApiRequest('POST', `/api/multi-driver/sessions/${sessionId}/switch`, 200, Date.now() - startTime, req.user?.id);
    res.json({
      message: 'Driver switched successfully',
      newDriverId
    });

  } catch (error) {
    logError('Error switching driver', error instanceof Error ? error : new Error(String(error)), {
      userId: req.user?.id,
      sessionId: req.params.sessionId,
      body: req.body
    });
    logApiRequest('POST', `/api/multi-driver/sessions/${req.params.sessionId}/switch`, 500, Date.now() - startTime, req.user?.id);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update driver status
router.patch('/sessions/:sessionId/drivers/:driverId', authenticateToken, async (req: AuthRequest, res) => {
  const startTime = Date.now();

  try {
    const { sessionId, driverId } = req.params;
    const { status } = req.body;

    if (!['active', 'standby', 'offline'].includes(status)) {
      logApiRequest('PATCH', `/api/multi-driver/sessions/${sessionId}/drivers/${driverId}`, 400, Date.now() - startTime, req.user?.id);
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Verify session and driver
    const checkResult = await pool.query(`
      SELECT mdp.driver_id FROM multi_driver_participants mdp
      WHERE mdp.session_id = $1 AND mdp.driver_id = $2
    `, [sessionId, driverId]);

    if (checkResult.rows.length === 0) {
      logApiRequest('PATCH', `/api/multi-driver/sessions/${sessionId}/drivers/${driverId}`, 404, Date.now() - startTime, req.user?.id);
      return res.status(404).json({ error: 'Driver not found in session' });
    }

    // Update status and last activity
    await pool.query(`
      UPDATE multi_driver_participants
      SET status = $1, last_activity = NOW()
      WHERE session_id = $2 AND driver_id = $3
    `, [status, sessionId, driverId]);

    logUserAction(req.user!.id, 'update_driver_status', sessionId, true, {
      driverId,
      status
    });

    logApiRequest('PATCH', `/api/multi-driver/sessions/${sessionId}/drivers/${driverId}`, 200, Date.now() - startTime, req.user?.id);
    res.json({
      message: 'Driver status updated successfully'
    });

  } catch (error) {
    logError('Error updating driver status', error instanceof Error ? error : new Error(String(error)), {
      userId: req.user?.id,
      sessionId: req.params.sessionId,
      driverId: req.params.driverId,
      body: req.body
    });
    logApiRequest('PATCH', `/api/multi-driver/sessions/${req.params.sessionId}/drivers/${req.params.driverId}`, 500, Date.now() - startTime, req.user?.id);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
