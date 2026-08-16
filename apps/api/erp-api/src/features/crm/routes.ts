import { Router } from 'express';
import { leadInputSchema } from '@erp/contracts';
import { z } from 'zod';
import { query } from '../../db/client.js';
import { HttpError, validate } from '../../lib/http.js';
import { serializeRow, serializeRows } from '../../lib/rows.js';
import { authorizeAny } from '../auth/middleware.js';

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

const columns: Record<string, string> = {
  name: 'name', nameAr: 'name_ar', company: 'company', phone: 'phone', email: 'email', source: 'source',
  status: 'status', value: 'value', probability: 'probability', expectedCloseDate: 'expected_close_date', notes: 'notes', tags: 'tags',
};

export const crmRouter = Router();

crmRouter.get('/leads', authorizeAny('crm.read', 'crm.write'), async (request, response) => {
  const { page, pageSize } = validate(paginationSchema, request.query);
  const companyId = request.auth!.companyId;
  const count = await query<{ count: string }>('SELECT count(*) FROM leads WHERE company_id=$1', [companyId]);
  const rows = await query('SELECT * FROM leads WHERE company_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3', [companyId, pageSize, (page - 1) * pageSize]);
  response.json({ data: serializeRows(rows.rows), meta: { page, pageSize, total: Number(count.rows[0].count) } });
});

crmRouter.get('/leads/:id', authorizeAny('crm.read', 'crm.write'), async (request, response) => {
  const result = await query('SELECT * FROM leads WHERE id=$1 AND company_id=$2', [request.params.id, request.auth!.companyId]);
  if (!result.rows[0]) throw new HttpError(404, 'NOT_FOUND', 'Lead not found');
  response.json({ data: serializeRow(result.rows[0]) });
});

crmRouter.post('/leads', authorizeAny('crm.write'), async (request, response) => {
  const input = validate(leadInputSchema, request.body) as Record<string, unknown>;
  const entries = Object.entries(input).filter(([key]) => columns[key]);
  const dbColumns = ['company_id', 'created_by', ...entries.map(([key]) => columns[key])];
  const values = [request.auth!.companyId, request.auth!.userId, ...entries.map(([, value]) => value)];
  const placeholders = values.map((_, index) => `$${index + 1}`);
  const result = await query(`INSERT INTO leads (${dbColumns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`, values);
  response.status(201).json({ data: serializeRow(result.rows[0]) });
});

crmRouter.patch('/leads/:id', authorizeAny('crm.write'), async (request, response) => {
  const input = validate(leadInputSchema.partial(), request.body) as Record<string, unknown>;
  const entries = Object.entries(input).filter(([key]) => columns[key]);
  if (!entries.length) throw new HttpError(400, 'EMPTY_UPDATE', 'No update fields were provided');
  const values = entries.map(([, value]) => value);
  const set = entries.map(([key], index) => `${columns[key]}=$${index + 1}`);
  values.push(request.params.id, request.auth!.companyId);
  const result = await query(`UPDATE leads SET ${set.join(', ')}, updated_at=now() WHERE id=$${values.length - 1} AND company_id=$${values.length} RETURNING *`, values);
  if (!result.rows[0]) throw new HttpError(404, 'NOT_FOUND', 'Lead not found');
  response.json({ data: serializeRow(result.rows[0]) });
});
