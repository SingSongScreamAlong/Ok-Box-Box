/**
 * Race Strategy API Routes
 * Real-time fuel, tire, and pit stop strategy calculations
 */

import express from 'express';
import { authenticateToken } from './auth.js';
import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Active strategy sessions
 * Maps sessionId -> { strategy data, calculations }
 */
const strategySessions = new Map<string, {
  sessionId: string;
  raceLaps: number;
  fuelCapacity: number;
  avgPitTime: number;
  lastUpdate: number;
}>();

/**
 * Initialize strategy session
 * POST /api/strategy/init
 * Body: { sessionId, raceLaps?, fuelCapacity?, avgPitTime? }
 */
router.post('/init', authenticateToken, async (req, res) => {
  try {
    const { sessionId, raceLaps, fuelCapacity, avgPitTime } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId required' });
    }

    strategySessions.set(sessionId, {
      sessionId,
      raceLaps: raceLaps || 50,
      fuelCapacity: fuelCapacity || 100,
      avgPitTime: avgPitTime || 45,
      lastUpdate: Date.now()
    });

    return res.json({
      success: true,
      sessionId,
      parameters: {
        raceLaps: raceLaps || 50,
        fuelCapacity: fuelCapacity || 100,
        avgPitTime: avgPitTime || 45
      }
    });

  } catch (error) {
    console.error('Strategy init error:', error);
    return res.status(500).json({ error: 'Failed to initialize strategy' });
  }
});

/**
 * Get real-time strategy recommendation
 * POST /api/strategy/recommend
 * Body: { sessionId, telemetry }
 */
router.post('/recommend', authenticateToken, async (req, res) => {
  try {
    const { sessionId, telemetry } = req.body;

    if (!sessionId || !telemetry) {
      return res.status(400).json({ error: 'sessionId and telemetry required' });
    }

    const session = strategySessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Strategy session not found - call /init first' });
    }

    // Call Python strategy engine
    const recommendation = await calculateStrategy(sessionId, telemetry, session);

    return res.json({
      success: true,
      recommendation,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Strategy recommendation error:', error);
    return res.status(500).json({ error: 'Failed to calculate strategy' });
  }
});

/**
 * Get fuel strategy
 * POST /api/strategy/fuel
 * Body: { sessionId, currentFuel, currentLap }
 */
router.post('/fuel', authenticateToken, async (req, res) => {
  try {
    const { sessionId, currentFuel, currentLap } = req.body;

    if (!sessionId || currentFuel === undefined || !currentLap) {
      return res.status(400).json({ error: 'sessionId, currentFuel, and currentLap required' });
    }

    const session = strategySessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Strategy session not found' });
    }

    // Get fuel history from database
    const fuelHistory = await getFuelHistory(sessionId);

    // Calculate fuel per lap
    const fuelPerLap = calculateFuelPerLap(fuelHistory);

    // Remaining laps on current fuel
    const remainingLaps = fuelPerLap > 0 ? currentFuel / fuelPerLap : 999;

    // Race laps remaining
    const raceLapsToGo = session.raceLaps - currentLap;

    // Can finish?
    const canFinish = remainingLaps >= raceLapsToGo;

    // Fuel to add if pitting
    const fuelNeeded = raceLapsToGo * fuelPerLap - currentFuel;
    const recommendedFuelAdd = canFinish ? 0 : Math.min(fuelNeeded, session.fuelCapacity);

    // Fuel saving required
    const fuelSavingRequired = canFinish ? 0 : ((raceLapsToGo - remainingLaps) / raceLapsToGo) * 100;

    return res.json({
      currentFuel,
      fuelPerLap: Number(fuelPerLap.toFixed(2)),
      remainingLaps: Number(remainingLaps.toFixed(1)),
      totalLapsToGo: raceLapsToGo,
      needToPit: !canFinish,
      recommendedFuelAdd: Number(recommendedFuelAdd.toFixed(1)),
      fuelSavingRequired: Number(Math.max(0, fuelSavingRequired).toFixed(1)),
      canFinish
    });

  } catch (error) {
    console.error('Fuel strategy error:', error);
    return res.status(500).json({ error: 'Failed to calculate fuel strategy' });
  }
});

/**
 * Get tire strategy
 * POST /api/strategy/tires
 * Body: { sessionId, currentLap, tireTemps }
 */
router.post('/tires', authenticateToken, async (req, res) => {
  try {
    const { sessionId, currentLap, tireTemps } = req.body;

    if (!sessionId || !currentLap || !tireTemps) {
      return res.status(400).json({ error: 'sessionId, currentLap, and tireTemps required' });
    }

    const { LF, RF, LR, RR } = tireTemps;
    const avgTemp = (LF + RF + LR + RR) / 4;

    // Optimal temp window
    const optimalMin = 85;
    const optimalMax = 95;
    const optimalWindow = avgTemp >= optimalMin && avgTemp <= optimalMax;

    // Overheating check
    const overheating = LF > optimalMax + 10 || RF > optimalMax + 10 ||
                        LR > optimalMax + 10 || RR > optimalMax + 10;

    // Get stint info
    const stintLaps = await getStintLaps(sessionId, currentLap);

    // Degradation estimate
    const baseRate = 0.5;
    const tempMultiplier = avgTemp > optimalMax ? 1 + ((avgTemp - optimalMax) / 50) : 1;
    const wearMultiplier = 1 + (stintLaps * 0.01);
    const degradationRate = baseRate * tempMultiplier * wearMultiplier;

    // Grip remaining
    const gripRemaining = Math.max(0, 100 - (stintLaps * degradationRate));

    // Recommended change lap
    let recommendedChangeLap = null;
    if (gripRemaining < 40) {
      recommendedChangeLap = currentLap + 1;
    } else if (gripRemaining < 60) {
      recommendedChangeLap = currentLap + 3;
    }

    return res.json({
      lapsOnTires: stintLaps,
      temps: { LF, RF, LR, RR },
      avgTemp: Number(avgTemp.toFixed(1)),
      optimalWindow,
      overheating,
      degradationRate: Number(degradationRate.toFixed(2)),
      gripRemaining: Number(gripRemaining.toFixed(0)),
      recommendedChangeLap
    });

  } catch (error) {
    console.error('Tire strategy error:', error);
    return res.status(500).json({ error: 'Failed to calculate tire strategy' });
  }
});

/**
 * Get pit window recommendation
 * POST /api/strategy/pit-window
 * Body: { sessionId, currentLap, fuelData, tireData, gaps }
 */
router.post('/pit-window', authenticateToken, async (req, res) => {
  try {
    const { sessionId, currentLap, fuelData, tireData, gaps } = req.body;

    if (!sessionId || !currentLap) {
      return res.status(400).json({ error: 'sessionId and currentLap required' });
    }

    const session = strategySessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Strategy session not found' });
    }

    const raceLapsRemaining = session.raceLaps - currentLap;

    // Determine optimal pit lap
    const fuelPitLap = fuelData?.needToPit ?
      currentLap + Math.floor(fuelData.remainingLaps) - 2 : 999;

    const tirePitLap = tireData?.recommendedChangeLap || 999;

    const optimalLap = Math.min(fuelPitLap, tirePitLap, currentLap + raceLapsRemaining);

    // Window bounds
    const windowStart = Math.max(currentLap + 1, optimalLap - 3);
    const windowEnd = Math.min(optimalLap + 5, currentLap + raceLapsRemaining - 1);

    // Undercut/overcut analysis
    const gapAhead = gaps?.gapAhead || 999;
    const gapBehind = gaps?.gapBehind || 999;

    const undercutOpportunity = gapAhead > 0 && gapAhead < (session.avgPitTime + 3);
    const overcutOpportunity = false; // Simplified

    // Positions at risk
    const positionsAtRisk = Math.floor(gapBehind / session.avgPitTime);

    return res.json({
      optimalLap,
      windowStart,
      windowEnd,
      undercutOpportunity,
      overcutOpportunity,
      timeLostInPit: session.avgPitTime,
      positionsAtRisk,
      reasons: {
        fuel: fuelPitLap < 999,
        tires: tirePitLap < 999,
        strategy: undercutOpportunity
      }
    });

  } catch (error) {
    console.error('Pit window error:', error);
    return res.status(500).json({ error: 'Failed to calculate pit window' });
  }
});

/**
 * Get strategy dashboard data
 * GET /api/strategy/dashboard/:sessionId
 */
router.get('/dashboard/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = strategySessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Strategy session not found' });
    }

    // Get latest telemetry
    const telemetryResult = await pool.query(
      `SELECT * FROM telemetry
       WHERE session_id = $1
       ORDER BY ts DESC
       LIMIT 1`,
      [sessionId]
    );

    if (telemetryResult.rows.length === 0) {
      return res.status(404).json({ error: 'No telemetry data found' });
    }

    const latest = telemetryResult.rows[0];
    const currentLap = latest.lap || 0;

    // Calculate all strategy components
    const fuelHistory = await getFuelHistory(sessionId);
    const fuelPerLap = calculateFuelPerLap(fuelHistory);

    const dashboardData = {
      session: {
        raceLaps: session.raceLaps,
        currentLap,
        lapsRemaining: session.raceLaps - currentLap
      },
      fuel: {
        current: latest.fuel || 0,
        perLap: Number(fuelPerLap.toFixed(2)),
        remainingLaps: Number(((latest.fuel || 0) / fuelPerLap).toFixed(1)),
        status: (latest.fuel || 0) / fuelPerLap >= session.raceLaps - currentLap ? 'ok' : 'low'
      },
      tires: {
        temps: {
          LF: latest.tire_fl_temp || 0,
          RF: latest.tire_fr_temp || 0,
          LR: latest.tire_rl_temp || 0,
          RR: latest.tire_rr_temp || 0
        },
        avgTemp: Number((
          ((latest.tire_fl_temp || 0) + (latest.tire_fr_temp || 0) +
           (latest.tire_rl_temp || 0) + (latest.tire_rr_temp || 0)) / 4
        ).toFixed(1)),
        status: 'optimal' // Simplified
      },
      position: {
        current: latest.race_position || 0,
        gapAhead: latest.gap_ahead || 0,
        gapBehind: latest.gap_behind || 0
      },
      lastUpdate: Date.now()
    };

    return res.json(dashboardData);

  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

/**
 * Helper: Calculate strategy using Python engine
 */
async function calculateStrategy(sessionId: string, telemetry: any, session: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonScript = join(__dirname, '../../relay_agent/race_strategy.py');

    // Simplified: Return calculated strategy
    // In production, call Python script
    const fuelHistory = [];
    const fuelPerLap = 2.5; // Estimate

    const remainingLaps = telemetry.fuel / fuelPerLap;
    const raceLapsToGo = session.raceLaps - telemetry.lap;

    const recommendation = {
      action: remainingLaps < 3 ? 'pit_now' :
              remainingLaps < raceLapsToGo ? 'pit_soon' : 'stay_out',
      reason: remainingLaps < 3 ? 'Critical fuel - pit immediately' :
              remainingLaps < raceLapsToGo ? `Fuel for ${remainingLaps.toFixed(1)} laps, need ${raceLapsToGo}` :
              'Fuel sufficient to finish',
      priority: remainingLaps < 3 ? 'critical' : remainingLaps < raceLapsToGo ? 'high' : 'low',
      data: {
        fuel: {
          current: telemetry.fuel,
          perLap: fuelPerLap,
          remainingLaps,
          raceLapsToGo
        }
      }
    };

    resolve(recommendation);
  });
}

/**
 * Helper: Get fuel history from database
 */
async function getFuelHistory(sessionId: string): Promise<any[]> {
  const result = await pool.query(
    `SELECT lap, fuel, extract(epoch from ts) as timestamp
     FROM telemetry
     WHERE session_id = $1 AND fuel IS NOT NULL
     ORDER BY ts ASC`,
    [sessionId]
  );

  return result.rows.map(r => ({
    lap: r.lap,
    fuel: r.fuel,
    timestamp: r.timestamp
  }));
}

/**
 * Helper: Calculate fuel per lap
 */
function calculateFuelPerLap(fuelHistory: any[]): number {
  if (fuelHistory.length < 5) {
    return 2.5; // Default estimate
  }

  const recent = fuelHistory.slice(-10);
  const consumptions: number[] = [];

  for (let i = 1; i < recent.length; i++) {
    const fuelDelta = recent[i - 1].fuel - recent[i].fuel;
    const lapDelta = recent[i].lap - recent[i - 1].lap;

    if (fuelDelta > 0 && fuelDelta < 10 && lapDelta === 1) {
      consumptions.push(fuelDelta);
    }
  }

  if (consumptions.length === 0) {
    return 2.5;
  }

  // Return median to avoid outliers
  consumptions.sort((a, b) => a - b);
  const mid = Math.floor(consumptions.length / 2);
  return consumptions.length % 2 === 0 ?
    (consumptions[mid - 1] + consumptions[mid]) / 2 :
    consumptions[mid];
}

/**
 * Helper: Get stint laps
 */
async function getStintLaps(sessionId: string, currentLap: number): Promise<number> {
  // Find last pit stop (fuel increase)
  const result = await pool.query(
    `SELECT lap, fuel,
            LAG(fuel) OVER (ORDER BY ts) as prev_fuel
     FROM telemetry
     WHERE session_id = $1 AND lap <= $2
     ORDER BY ts DESC
     LIMIT 100`,
    [sessionId, currentLap]
  );

  // Find last refuel
  for (const row of result.rows) {
    if (row.prev_fuel && row.fuel - row.prev_fuel > 5) {
      return currentLap - row.lap;
    }
  }

  // No pit stop found, full stint
  return currentLap;
}

export default router;
