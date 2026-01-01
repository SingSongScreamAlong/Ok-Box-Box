import { readdir } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, setStatementTimeout, ping } from './db.js';

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function getApplied(): Promise<Set<string>> {
  const res = await pool.query('SELECT filename FROM _migrations');
  return new Set(res.rows.map((r: any) => r.filename));
}

async function run() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const dir = path.resolve(here, '..', 'migrations');

  process.stdout.write('[migrate] Checking DB connectivity... ');
  const ok = await ping();
  if (!ok) {
    console.error('\n[migrate] Database is not reachable. Check PG_CONNECTION_STRING and Postgres service.');
    process.exit(2);
  }
  console.log('ok');

  // Avoid long-running statements
  await setStatementTimeout(Number(process.env.PG_STMT_TIMEOUT_MS ?? 15000));

  await ensureMigrationsTable();
  const applied = await getApplied();
  const files = (await readdir(dir)).filter(f => f.endsWith('.sql')).sort();

  for (const f of files) {
    if (applied.has(f)) continue;
    const sql = await readFile(path.join(dir, f), 'utf8');
    process.stdout.write(`[migrate] Applying ${f}... `);
    await pool.query('BEGIN');
    try {
      await pool.query(sql);
      await pool.query('INSERT INTO _migrations (filename) VALUES ($1)', [f]);
      await pool.query('COMMIT');
      process.stdout.write('done\n');
    } catch (e) {
      await pool.query('ROLLBACK');
      console.error(`\n[migrate] Failed to apply ${f}:`, e);
      process.exit(1);
    }
  }
  process.stdout.write('[migrate] Migrations complete.\n');
  await pool.end();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
