import type { PoolClient, QueryResultRow } from 'pg';
import { createDatabasePool } from '@erp/shared-backend-database';
import { env } from '../config/env.js';

export const pool = createDatabasePool({
  connectionString: env.DATABASE_URL,
  schema: env.DB_SCHEMA,
  max: env.NODE_ENV === 'test' ? 2 : env.DB_POOL_MAX,
  connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS,
  idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
  statementTimeout: env.DB_STATEMENT_TIMEOUT_MS,
});

export async function query<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  return pool.query<T>(text, values);
}

export async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
