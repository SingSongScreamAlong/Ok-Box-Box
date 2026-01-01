import { v4 as uuidv4 } from 'uuid';
import { pool } from './db.js';

async function seed() {
  const sessionId = uuidv4();
  const name = 'Dev Session (seed)';
  const track = 'TestTrack';

  console.log('Creating session', sessionId);
  await pool.query('INSERT INTO sessions (id, name, track) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING', [sessionId, name, track]);

  const now = Date.now();
  const rows: any[] = [];
  for (let i = 0; i < 20; i++) {
    const ts = now + i * 1000;
    const pos_x = 100 + i * 5;
    const pos_y = 50 + i * 2;
    rows.push({
      session_id: sessionId,
      driver_id: 'driver-seed-1',
      ts,
      pos_x,
      pos_y,
      pos_z: 0,
      speed: 80 + i,
      throttle: 0.7,
      brake: 0,
      gear: 3 + (i % 2),
      rpm: 7000 + i * 50,
      lap: 1,
      sector: 1 + (i % 3),
      tire_fl_temp: 85,
      tire_fl_wear: 0.02,
      tire_fl_pressure: 26.2,
      tire_fr_temp: 86,
      tire_fr_wear: 0.02,
      tire_fr_pressure: 26.3,
      tire_rl_temp: 90,
      tire_rl_wear: 0.03,
      tire_rl_pressure: 25.9,
      tire_rr_temp: 91,
      tire_rr_wear: 0.03,
      tire_rr_pressure: 26.0,
      g_lat: 1.0,
      g_long: 0.2,
      g_vert: 0.9,
      track_position: i / 20,
      race_position: 3,
      gap_ahead: 1.2,
      gap_behind: 0.8,
    });
  }

  const cols = [
    'session_id','driver_id','ts','pos_x','pos_y','pos_z','speed','throttle','brake','gear','rpm','lap','sector',
    'tire_fl_temp','tire_fl_wear','tire_fl_pressure','tire_fr_temp','tire_fr_wear','tire_fr_pressure','tire_rl_temp','tire_rl_wear','tire_rl_pressure','tire_rr_temp','tire_rr_wear','tire_rr_pressure',
    'g_lat','g_long','g_vert','track_position','race_position','gap_ahead','gap_behind'
  ];
  const values: any[] = [];
  const placeholders: string[] = [];
  let idx = 1;
  for (const r of rows) {
    placeholders.push(`($${idx++}, $${idx++}, to_timestamp($${idx++} / 1000.0), $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`);
    values.push(
      r.session_id, r.driver_id, r.ts, r.pos_x, r.pos_y, r.pos_z, r.speed, r.throttle, r.brake, r.gear, r.rpm, r.lap, r.sector,
      r.tire_fl_temp, r.tire_fl_wear, r.tire_fl_pressure, r.tire_fr_temp, r.tire_fr_wear, r.tire_fr_pressure,
      r.tire_rl_temp, r.tire_rl_wear, r.tire_rl_pressure, r.tire_rr_temp, r.tire_rr_wear, r.tire_rr_pressure,
      r.g_lat, r.g_long, r.g_vert, r.track_position, r.race_position, r.gap_ahead, r.gap_behind
    );
  }

  const sql = `INSERT INTO telemetry (${cols.join(',')}) VALUES ${placeholders.join(',')}`;
  await pool.query(sql, values);

  console.log('Seed complete. Session ID:', sessionId);
  await pool.end();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
