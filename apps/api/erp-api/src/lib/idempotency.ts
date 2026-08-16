import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import { HttpError } from './http.js';

export type IdempotencyResult = { kind: 'started' } | { kind: 'replay'; statusCode: number; body: unknown };

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(',')}}`;
  return JSON.stringify(value);
}

export function requestHash(value: unknown) { return createHash('sha256').update(stable(value)).digest('hex'); }

export async function beginIdempotent(client: PoolClient, input: { companyId: string; key: string; action: string; body: unknown }): Promise<IdempotencyResult> {
  if (!/^[\w.:/-]{16,128}$/.test(input.key)) throw new HttpError(400, 'INVALID_IDEMPOTENCY_KEY', 'Idempotency-Key must contain 16-128 safe characters');
  const hash = requestHash(input.body);
  const inserted = await client.query(
    `INSERT INTO idempotency_records (company_id, operation_key, action, request_hash)
     VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING id`,
    [input.companyId, input.key, input.action, hash],
  );
  if (inserted.rowCount) return { kind: 'started' };
  const existing = await client.query<{ action: string; request_hash: string; status: string; response_code: number | null; response_body: unknown }>(
    `SELECT action, request_hash, status, response_code, response_body FROM idempotency_records
     WHERE company_id=$1 AND operation_key=$2 FOR UPDATE`, [input.companyId, input.key],
  );
  const row = existing.rows[0];
  if (!row || row.action !== input.action || row.request_hash !== hash) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT', 'This idempotency key was used for a different request');
  if (row.status === 'completed') return { kind: 'replay', statusCode: row.response_code ?? 200, body: row.response_body };
  throw new HttpError(409, 'REQUEST_IN_PROGRESS', 'A request with this idempotency key is already processing');
}

export async function completeIdempotent(client: PoolClient, input: { companyId: string; key: string; resourceType: string; resourceId: string; statusCode: number; body: unknown }) {
  await client.query(`UPDATE idempotency_records SET status='completed', resource_type=$3, resource_id=$4, response_code=$5, response_body=$6, completed_at=now() WHERE company_id=$1 AND operation_key=$2`, [input.companyId, input.key, input.resourceType, input.resourceId, input.statusCode, JSON.stringify(input.body)]);
}
