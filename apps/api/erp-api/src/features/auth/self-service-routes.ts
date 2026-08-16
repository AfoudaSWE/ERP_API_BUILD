import { Router } from 'express';
import { query } from '../../db/client.js';
import { serializeRow } from '../../lib/rows.js';
import { authorize } from './middleware.js';

export const selfServiceRouter = Router();

selfServiceRouter.get('/profile', authorize('self_service.view'), async (request, response) => {
  const row = (await query('SELECT id,email,name,company_id,role FROM users WHERE id=$1 AND tenant_id=$2 AND company_id=$3 AND is_active=true', [request.auth!.userId, request.auth!.tenantId, request.auth!.companyId])).rows[0];
  response.json({ data: row ? serializeRow(row) : null });
});
