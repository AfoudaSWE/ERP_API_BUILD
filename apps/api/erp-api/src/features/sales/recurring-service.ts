import type { PoolClient } from 'pg';
import type { RecurringInvoiceTemplateInput, SalesPostingInput } from '@erp/contracts';
import { HttpError } from '../../lib/http.js';
import { appendAuditEvent } from '../audit/routes.js';
import { postSalesInvoice } from './posting-service.js';

const INTERVAL_BY_FREQUENCY: Record<string, string> = { weekly: '7 days', monthly: '1 month', quarterly: '3 months', yearly: '1 year' };

export async function createRecurringTemplate(client: PoolClient, auth: Express.Request['auth'] & {}, input: RecurringInvoiceTemplateInput) {
  const template = await client.query<{ id: string }>(
    `INSERT INTO recurring_invoice_templates(company_id,name,customer_id,warehouse_id,frequency,next_run_date,notes,created_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [auth.companyId, input.name, input.customerId ?? null, input.warehouseId ?? null, input.frequency, input.nextRunDate, input.notes, auth.userId],
  );
  for (const item of input.items) {
    await client.query(
      `INSERT INTO recurring_invoice_items(template_id,product_id,description,quantity,unit_price,tax_rate) VALUES($1,$2,$3,$4,$5,$6)`,
      [template.rows[0].id, item.productId ?? null, item.description, item.quantity, item.unitPrice, item.taxRate],
    );
  }
  await appendAuditEvent(client, { tenantId: auth.tenantId, companyId: auth.companyId, actorUserId: auth.userId, action: 'recurring_invoice.created', entityType: 'recurring_invoice_template', entityId: template.rows[0].id, after: template.rows[0] });
  return template.rows[0];
}

export async function actOnRecurringTemplate(client: PoolClient, auth: Express.Request['auth'] & {}, templateId: string, action: 'pause' | 'resume' | 'cancel') {
  const before = (await client.query('SELECT * FROM recurring_invoice_templates WHERE id=$1 AND company_id=$2 FOR UPDATE', [templateId, auth.companyId])).rows[0];
  if (!before) throw new HttpError(404, 'TEMPLATE_NOT_FOUND', 'Recurring invoice template not found');
  const nextStatus = { pause: 'paused', resume: 'active', cancel: 'canceled' }[action];
  const updated = (await client.query('UPDATE recurring_invoice_templates SET status=$2,updated_at=now() WHERE id=$1 RETURNING *', [templateId, nextStatus])).rows[0];
  await appendAuditEvent(client, { tenantId: auth.tenantId, companyId: auth.companyId, actorUserId: auth.userId, action: `recurring_invoice.${action}`, entityType: 'recurring_invoice_template', entityId: templateId, before, after: updated });
  return updated;
}

export async function generateInvoiceFromRecurringTemplate(client: PoolClient, auth: Express.Request['auth'] & {}, templateId: string, operationKey: string) {
  const template = (await client.query<{ id: string; status: string; customer_id: string | null; warehouse_id: string | null; frequency: string; next_run_date: string }>('SELECT * FROM recurring_invoice_templates WHERE id=$1 AND company_id=$2 FOR UPDATE', [templateId, auth.companyId])).rows[0];
  if (!template) throw new HttpError(404, 'TEMPLATE_NOT_FOUND', 'Recurring invoice template not found');
  if (template.status !== 'active') throw new HttpError(409, 'TEMPLATE_NOT_ACTIVE', 'Only active templates can generate invoices');
  const items = (await client.query<{ product_id: string | null; description: string; quantity: string; unit_price: string; tax_rate: string }>('SELECT product_id,description,quantity,unit_price,tax_rate FROM recurring_invoice_items WHERE template_id=$1', [templateId])).rows;
  const missingProduct = items.find((item) => !item.product_id);
  if (missingProduct) throw new HttpError(422, 'TEMPLATE_ITEM_MISSING_PRODUCT', 'All template lines must reference a product to generate an invoice');
  const today = new Date().toISOString().slice(0, 10);
  const invoiceInput: SalesPostingInput = {
    customerId: template.customer_id ?? undefined,
    warehouseId: template.warehouse_id ?? undefined,
    invoiceDate: today,
    currency: 'EGP',
    discountAmount: '0',
    initialPayment: '0',
    paymentMethod: 'cash',
    source: 'erp',
    items: items.map((item) => ({ productId: item.product_id as string, description: item.description, quantity: item.quantity, unitPrice: item.unit_price, taxRate: item.tax_rate })),
  };
  const result = await postSalesInvoice(client, auth, operationKey, invoiceInput);
  const interval = INTERVAL_BY_FREQUENCY[template.frequency];
  await client.query(`UPDATE recurring_invoice_templates SET last_generated_at=now(),next_run_date=(next_run_date + $2::interval),updated_at=now() WHERE id=$1`, [templateId, interval]);
  return result;
}
