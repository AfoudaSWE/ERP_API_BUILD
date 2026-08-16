import { Router } from 'express';
import { authorizeAny } from '../auth/middleware.js';
import { query } from '../../db/client.js';

export async function closeJobPublisher() { return undefined; }

export const jobsRouter = Router();
jobsRouter.post('/inventory/check-low-stock', authorizeAny('inventory.read', 'inventory.view'), async (request, response) => {
  const payload = { companyId: request.auth!.companyId, requestedBy: request.auth!.userId };
  const jobId = `low-stock-${payload.companyId}-${Date.now()}`;
  const result = await query<{ id: string }>(
    `INSERT INTO job_outbox(company_id,queue_name,job_name,job_id,payload)
     VALUES($1,'inventory','check-low-stock',$2,$3::jsonb) RETURNING id`,
    [payload.companyId, jobId, JSON.stringify(payload)],
  );
  response.status(202).json({ data: { outboxId: result.rows[0].id, jobId, queue: 'inventory', name: 'check-low-stock' } });
});
