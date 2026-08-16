import { Router } from 'express';
import type { PoolClient, QueryResultRow } from 'pg';
import { pageQuerySchema } from '@erp/contracts';
import { query } from '../../db/client.js';
import { validate } from '../../lib/http.js';
import { serializeRows } from '../../lib/rows.js';
import { authorize } from '../auth/middleware.js';

export async function appendAuditEvent(client: PoolClient, input: { tenantId: string; companyId: string; actorUserId?: string; action: string; entityType: string; entityId?: string; operationKey?: string; before?: unknown; after?: unknown; metadata?: Record<string, unknown> }) {
  await client.query(`INSERT INTO audit_events (tenant_id,company_id,actor_user_id,action,entity_type,entity_id,operation_key,before_data,after_data,metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [input.tenantId, input.companyId, input.actorUserId ?? null, input.action, input.entityType, input.entityId ?? null, input.operationKey ?? null, input.before ? JSON.stringify(input.before) : null, input.after ? JSON.stringify(input.after) : null, JSON.stringify(input.metadata ?? {})]);
}

export const auditRouter = Router();
type AuditQueryExecutor = { query<T extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]): Promise<{ rows: T[] }> };
export async function listAuditEvents(executor: AuditQueryExecutor, companyId: string, page: number, pageSize: number) {
  const [events, count] = await Promise.all([
    executor.query(`SELECT * FROM audit_events WHERE company_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`, [companyId, pageSize, (page - 1) * pageSize]),
    executor.query<{ count: string }>('SELECT count(*) FROM audit_events WHERE company_id=$1', [companyId]),
  ]);
  return { events: events.rows, total: Number(count.rows[0].count) };
}
auditRouter.get('/', authorize('audit.read'), async (request, response) => {
  const { page, pageSize } = validate(pageQuerySchema, request.query);
  const result = await listAuditEvents({ query }, request.auth!.companyId, page, pageSize);
  response.json({ data: serializeRows(result.events), meta: { page, pageSize, total: result.total } });
});
