import { Router } from 'express';
import { accountingPeriodInputSchema, journalActionSchema, manualJournalInputSchema, periodActionSchema, uuidSchema } from '@erp/contracts';
import { query, transaction } from '../../db/client.js';
import { HttpError, validate } from '../../lib/http.js';
import { beginIdempotent, completeIdempotent } from '../../lib/idempotency.js';
import { serializeDecimalRow, serializeDecimalRows } from '../../lib/rows.js';
import { authorize, authorizeAny } from '../auth/middleware.js';
import { appendAuditEvent } from '../audit/routes.js';
import { actOnJournal, createManualJournal } from './journal-service.js';
import { changePeriod, createPeriod } from './period-service.js';

export const accountingRouter = Router();

accountingRouter.get('/accounts', authorize('accounting.read'), async (request, response) => {
  const result = await query('SELECT * FROM ledger_accounts WHERE company_id=$1 ORDER BY code', [request.auth!.companyId]);
  response.json({ data: serializeDecimalRows(result.rows) });
});

accountingRouter.get('/journals', authorize('accounting.read'), async (request, response) => {
  const result = await query(`SELECT j.*,COALESCE(SUM(l.debit),0) total_debit,COALESCE(SUM(l.credit),0) total_credit FROM journal_entries j LEFT JOIN journal_lines l ON l.journal_entry_id=j.id WHERE j.company_id=$1 GROUP BY j.id ORDER BY j.business_date DESC,j.created_at DESC LIMIT 200`, [request.auth!.companyId]);
  response.json({ data: serializeDecimalRows(result.rows) });
});

accountingRouter.get('/journals/:id', authorize('accounting.read'), async (request, response) => {
  const id = validate(uuidSchema, request.params.id);
  const entry = await query('SELECT * FROM journal_entries WHERE id=$1 AND company_id=$2', [id, request.auth!.companyId]);
  if (!entry.rows[0]) throw new HttpError(404, 'JOURNAL_NOT_FOUND', 'Journal not found');
  const lines = await query(`SELECT l.*,a.code account_code,a.name account_name FROM journal_lines l JOIN ledger_accounts a ON a.id=l.ledger_account_id WHERE l.journal_entry_id=$1 ORDER BY l.created_at`, [id]);
  response.json({ data: { ...serializeDecimalRow(entry.rows[0]), lines: serializeDecimalRows(lines.rows) } });
});

accountingRouter.post('/journals', authorizeAny('accounting.create', 'accounting.post'), async (request, response) => {
  const key = request.header('Idempotency-Key');
  if (!key) throw new HttpError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key header is required');
  const input = validate(manualJournalInputSchema, request.body);
  const result = await transaction(async (client) => {
    const attempt = await beginIdempotent(client, { companyId: request.auth!.companyId, key, action: 'journal.create', body: input });
    if (attempt.kind === 'replay') return attempt;
    const journal = await createManualJournal(client, request.auth!.companyId, request.auth!.userId, input);
    const body = { data: journal };
    await appendAuditEvent(client, { tenantId: request.auth!.tenantId, companyId: request.auth!.companyId, actorUserId: request.auth!.userId, action: 'journal.created', entityType: 'journal_entry', entityId: journal.id, operationKey: key, after: journal });
    await completeIdempotent(client, { companyId: request.auth!.companyId, key, resourceType: 'journal_entry', resourceId: journal.id, statusCode: 201, body });
    return { kind: 'created' as const, statusCode: 201, body };
  });
  response.status(result.statusCode).json(result.body);
});

accountingRouter.post('/journals/:id/actions', authorize('accounting.post'), async (request, response) => {
  const id = validate(uuidSchema, request.params.id);
  const input = validate(journalActionSchema, request.body);
  const data = await transaction(async (client) => {
    const before = (await client.query('SELECT * FROM journal_entries WHERE id=$1 AND company_id=$2', [id, request.auth!.companyId])).rows[0];
    const changed = await actOnJournal(client, request.auth!.companyId, request.auth!.userId, id, input.action);
    await appendAuditEvent(client, { tenantId: request.auth!.tenantId, companyId: request.auth!.companyId, actorUserId: request.auth!.userId, action: `journal.${input.action}`, entityType: 'journal_entry', entityId: id, before, after: changed, metadata: input.reason ? { reason: input.reason } : {} });
    return changed;
  });
  response.json({ data: serializeDecimalRow(data) });
});

accountingRouter.get('/periods', authorize('accounting.read'), async (request, response) => response.json({ data: serializeDecimalRows((await query('SELECT * FROM accounting_periods WHERE company_id=$1 ORDER BY start_date DESC', [request.auth!.companyId])).rows) }));
accountingRouter.post('/periods', authorize('accounting.close'), async (request, response) => {
  const input = validate(accountingPeriodInputSchema, request.body);
  const data = await transaction(async (client) => {
    const row = await createPeriod(client, request.auth!.companyId, input);
    await appendAuditEvent(client, { tenantId: request.auth!.tenantId, companyId: request.auth!.companyId, actorUserId: request.auth!.userId, action: 'accounting_period.created', entityType: 'accounting_period', entityId: row.id, after: row });
    return row;
  });
  response.status(201).json({ data: serializeDecimalRow(data) });
});
accountingRouter.post('/periods/:id/actions', authorize('accounting.close'), async (request, response) => {
  const id = validate(uuidSchema, request.params.id); const input = validate(periodActionSchema, request.body);
  const data = await transaction(async (client) => {
    const row = await changePeriod(client, request.auth!.companyId, request.auth!.userId, id, input.action, input.reason);
    await appendAuditEvent(client, { tenantId: request.auth!.tenantId, companyId: request.auth!.companyId, actorUserId: request.auth!.userId, action: `accounting_period.${input.action}`, entityType: 'accounting_period', entityId: id, after: row, metadata: { reason: input.reason } });
    return row;
  });
  response.json({ data: serializeDecimalRow(data) });
});
