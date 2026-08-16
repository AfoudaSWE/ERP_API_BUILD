import fs from 'node:fs/promises';
import path from 'node:path';
import { pool } from './client.js';
import { env } from '../config/env.js';

export async function migrate() {
  const lockClient = await pool.connect();
  try {
  await lockClient.query("SELECT pg_advisory_lock(hashtext('erp-schema-migrations'))");
  await lockClient.query(`CREATE SCHEMA IF NOT EXISTS ${env.DB_SCHEMA}`);
  await lockClient.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);

  const migrationDirectory = path.resolve(process.cwd(), 'apps/api/erp-api/src/db/migrations');
  const files = (await fs.readdir(migrationDirectory)).filter((file) => file.endsWith('.sql')).sort();

  for (const file of files) {
    const exists = await lockClient.query('SELECT 1 FROM schema_migrations WHERE name = $1', [file]);
    if (exists.rowCount) continue;
    const sql = await fs.readFile(path.join(migrationDirectory, file), 'utf8');
    try {
      await lockClient.query('BEGIN');
      await lockClient.query(sql);
      await lockClient.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await lockClient.query('COMMIT');
      console.log(`Applied migration ${file}`);
    } catch (error) {
      await lockClient.query('ROLLBACK');
      throw error;
    }
  }
  } finally {
    await lockClient.query("SELECT pg_advisory_unlock(hashtext('erp-schema-migrations'))").catch(() => undefined);
    lockClient.release();
  }
}

if (require.main === module) {
  migrate().then(() => pool.end()).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
