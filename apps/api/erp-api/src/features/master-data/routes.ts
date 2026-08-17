import { Router } from 'express';
import { ledgerAccountInputSchema, taxRuleInputSchema, unitInputSchema } from '@erp/contracts';
import { query } from '../../db/client.js';
import { HttpError, validate } from '../../lib/http.js';
import { serializeRows, serializeRow } from '../../lib/rows.js';
import { authorize } from '../auth/middleware.js';

export const masterDataRouter = Router();
masterDataRouter.get('/units', authorize('products.read'), async (request, response) => response.json({ data: serializeRows((await query('SELECT * FROM units WHERE company_id=$1 ORDER BY code', [request.auth!.companyId])).rows) }));
masterDataRouter.post('/units', authorize('products.write'), async (request, response) => {
  const input = validate(unitInputSchema, request.body);
  const row = await query(`INSERT INTO units(company_id,code,name,name_ar,decimal_places,is_active) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`, [request.auth!.companyId, input.code, input.name, input.nameAr, input.decimalPlaces, input.isActive]);
  response.status(201).json({ data: serializeRow(row.rows[0]) });
});
masterDataRouter.patch('/units/:id', authorize('products.write'), async (request, response) => {
  const input = validate(unitInputSchema.partial(), request.body);
  const columns: Record<string, unknown> = { code: input.code, name: input.name, name_ar: input.nameAr, decimal_places: input.decimalPlaces, is_active: input.isActive };
  const entries = Object.entries(columns).filter(([, value]) => value !== undefined);
  if (!entries.length) throw new HttpError(400, 'EMPTY_UPDATE', 'No update fields were provided');
  const set = entries.map(([key], index) => `${key}=$${index + 1}`);
  const values = [...entries.map(([, value]) => value), request.params.id, request.auth!.companyId];
  const row = await query(`UPDATE units SET ${set.join(',')},updated_at=now() WHERE id=$${values.length - 1} AND company_id=$${values.length} RETURNING *`, values);
  if (!row.rows[0]) throw new HttpError(404, 'UNIT_NOT_FOUND', 'Unit not found');
  response.json({ data: serializeRow(row.rows[0]) });
});
masterDataRouter.delete('/units/:id', authorize('products.write'), async (request, response) => {
  const inUse = await query('SELECT 1 FROM products WHERE company_id=$1 AND unit=(SELECT code FROM units WHERE id=$2) LIMIT 1', [request.auth!.companyId, request.params.id]);
  if (inUse.rowCount) throw new HttpError(409, 'UNIT_IN_USE', 'Reassign products before archiving this unit');
  const row = await query('UPDATE units SET is_active=false,updated_at=now() WHERE id=$1 AND company_id=$2 RETURNING id', [request.params.id, request.auth!.companyId]);
  if (!row.rows[0]) throw new HttpError(404, 'UNIT_NOT_FOUND', 'Unit not found');
  response.status(204).send();
});
masterDataRouter.get('/tax-rules', authorize('products.read'), async (request, response) => response.json({ data: serializeRows((await query('SELECT * FROM tax_rules WHERE company_id=$1 ORDER BY code', [request.auth!.companyId])).rows) }));
masterDataRouter.post('/tax-rules', authorize('products.write'), async (request, response) => {
  const input = validate(taxRuleInputSchema, request.body);
  const row = await query(`INSERT INTO tax_rules(company_id,code,name,rate,is_active) VALUES($1,$2,$3,$4,$5) RETURNING *`, [request.auth!.companyId, input.code, input.name, input.rate, input.isActive]);
  response.status(201).json({ data: serializeRow(row.rows[0]) });
});
masterDataRouter.get('/ledger-accounts', authorize('accounting.read'), async (request, response) => response.json({ data: serializeRows((await query('SELECT * FROM ledger_accounts WHERE company_id=$1 ORDER BY code', [request.auth!.companyId])).rows) }));
masterDataRouter.post('/ledger-accounts', authorize('accounting.write'), async (request, response) => {
  const input = validate(ledgerAccountInputSchema, request.body);
  const row = await query(`INSERT INTO ledger_accounts(company_id,code,name,name_ar,account_type,system_role,allow_manual_posting,is_active) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [request.auth!.companyId, input.code, input.name, input.nameAr, input.accountType, input.systemRole ?? null, input.allowManualPosting, input.isActive]);
  response.status(201).json({ data: serializeRow(row.rows[0]) });
});
