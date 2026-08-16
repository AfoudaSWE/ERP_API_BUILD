import { randomUUID } from 'node:crypto';
import { pool } from '../db/client.js';

export async function databaseAvailable(): Promise<boolean> {
  try { await pool.query('SELECT 1'); return true; } catch { return false; }
}

export function testOperationKey(prefix = 'test') { return `${prefix}-${randomUUID()}`; }

export async function closeTestDatabase() { await pool.end(); }
