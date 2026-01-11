import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { query } from '../db/index.js';
import type { 
  LicenseValidationRequest, 
  LicenseValidationResponse,
  LicenseInfo,
  FREE_TIER_LICENSE 
} from '@okboxbox/shared';

export const licenseRoutes = Router();

/**
 * POST /api/license/validate
 * Validates a license and returns connection info for Relay
 * Free tier is always allowed (no license key required)
 */
licenseRoutes.post('/validate', async (req, res) => {
  try {
    const body = req.body as LicenseValidationRequest;
    const { licenseKey, machineId, version } = body;

    logger.info(`License validation request: machineId=${machineId}, version=${version}`);

    let userId: string;
    let license: LicenseInfo;

    if (licenseKey) {
      // Paid tier - look up license
      const result = await query<{ user_id: string; tier: string; modules: string[]; expires_at: Date | null }>(
        `SELECT l.user_id, l.tier, l.modules, l.expires_at, l.is_active, 
                l.max_concurrent_sessions, l.max_stored_sessions,
                u.email, l.created_at, l.updated_at
         FROM licenses l
         JOIN users u ON l.user_id = u.id
         WHERE l.id = $1 AND l.is_active = true`,
        [licenseKey]
      );

      if (result.rowCount === 0) {
        return res.status(401).json({
          valid: false,
          license: null,
          error: 'Invalid or inactive license key',
        } satisfies LicenseValidationResponse);
      }

      const row = result.rows[0] as any;
      
      // Check expiration
      if (row.expires_at && new Date(row.expires_at) < new Date()) {
        return res.status(401).json({
          valid: false,
          license: null,
          error: 'License has expired',
        } satisfies LicenseValidationResponse);
      }

      userId = row.user_id;
      license = {
        userId: row.user_id,
        email: row.email,
        tier: row.tier,
        modules: row.modules,
        expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : null,
        isActive: row.is_active,
        maxConcurrentSessions: row.max_concurrent_sessions,
        maxStoredSessions: row.max_stored_sessions,
        createdAt: new Date(row.created_at).getTime(),
        updatedAt: new Date(row.updated_at).getTime(),
      };
    } else {
      // Free tier - create or get anonymous user by machineId
      let userResult = await query<{ id: string }>(
        'SELECT id FROM users WHERE machine_id = $1',
        [machineId]
      );

      if (userResult.rowCount === 0) {
        // Create new anonymous user
        userId = uuidv4();
        await query(
          'INSERT INTO users (id, machine_id) VALUES ($1, $2)',
          [userId, machineId]
        );
        
        // Create free tier license
        await query(
          `INSERT INTO licenses (user_id, tier, modules, max_concurrent_sessions, max_stored_sessions)
           VALUES ($1, 'FREE', ARRAY['RACEBOX'], 1, 10)`,
          [userId]
        );
        
        logger.info(`Created new free tier user: ${userId}`);
      } else {
        userId = userResult.rows[0].id;
      }

      license = {
        userId,
        email: '',
        tier: 'FREE',
        modules: ['RACEBOX'],
        expiresAt: null,
        isActive: true,
        maxConcurrentSessions: 1,
        maxStoredSessions: 10,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    }

    // Generate relay token
    const relayToken = jwt.sign(
      { 
        userId, 
        machineId,
        modules: license.modules,
        type: 'relay' 
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    const response: LicenseValidationResponse = {
      valid: true,
      license,
      relayToken,
      apiEndpoint: `http://localhost:${config.port}`,
      wsEndpoint: `ws://localhost:${config.port}`,
    };

    logger.info(`License validated for user ${userId}, tier: ${license.tier}`);
    return res.json(response);

  } catch (err) {
    logger.error('License validation error:', err);
    return res.status(500).json({
      valid: false,
      license: null,
      error: 'Internal server error',
    } satisfies LicenseValidationResponse);
  }
});
