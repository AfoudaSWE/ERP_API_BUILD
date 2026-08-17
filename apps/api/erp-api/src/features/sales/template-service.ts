import type { PoolClient } from 'pg';
import type { CreateInvoiceFromTemplateInput, InvoiceTemplateInput, SalesPostingInput } from '@erp/contracts';
import { HttpError } from '../../lib/http.js';
import { appendAuditEvent } from '../audit/routes.js';
import { postSalesInvoice } from './posting-service.js';

export async function createInvoiceTemplate(client: PoolClient, auth: Express.Request['auth'] & {}, input: InvoiceTemplateInput) {
  const template = await client.query<{ id: string }>(
    `INSERT INTO invoice_templates(company_id,name,notes,is_active,created_by) VALUES($1,$2,$3,$4,$5) RETURNING *`,
    [auth.companyId, input.name, input.notes, input.isActive, auth.userId],
  );
  for (const item of input.items) {
    await client.query(
      `INSERT INTO invoice_template_items(template_id,product_id,description,quantity,unit_price,tax_rate) VALUES($1,$2,$3,$4,$5,$6)`,
      [template.rows[0].id, item.productId ?? null, item.description, item.quantity, item.unitPrice, item.taxRate],
    );
  }
  await appendAuditEvent(client, { tenantId: auth.tenantId, companyId: auth.companyId, actorUserId: auth.userId, action: 'invoice_template.created', entityType: 'invoice_template', entityId: template.rows[0].id, after: template.rows[0] });
  return template.rows[0];
}

export async function archiveInvoiceTemplate(client: PoolClient, auth: Express.Request['auth'] & {}, templateId: string) {
  const before = (await client.query('SELECT * FROM invoice_templates WHERE id=$1 AND company_id=$2 FOR UPDATE', [templateId, auth.companyId])).rows[0];
  if (!before) throw new HttpError(404, 'TEMPLATE_NOT_FOUND', 'Invoice template not found');
  const updated = (await client.query('UPDATE invoice_templates SET is_active=false,updated_at=now() WHERE id=$1 RETURNING *', [templateId])).rows[0];
  await appendAuditEvent(client, { tenantId: auth.tenantId, companyId: auth.companyId, actorUserId: auth.userId, action: 'invoice_template.archived', entityType: 'invoice_template', entityId: templateId, before, after: updated });
  return updated;
}

export async function createInvoiceFromTemplate(client: PoolClient, auth: Express.Request['auth'] & {}, templateId: string, operationKey: string, input: CreateInvoiceFromTemplateInput) {
  const template = (await client.query('SELECT id,is_active FROM invoice_templates WHERE id=$1 AND company_id=$2', [templateId, auth.companyId])).rows[0];
  if (!template) throw new HttpError(404, 'TEMPLATE_NOT_FOUND', 'Invoice template not found');
  const items = (await client.query<{ product_id: string | null; description: string; quantity: string; unit_price: string; tax_rate: string }>('SELECT product_id,description,quantity,unit_price,tax_rate FROM invoice_template_items WHERE template_id=$1', [templateId])).rows;
  const missingProduct = items.find((item) => !item.product_id);
  if (missingProduct) throw new HttpError(422, 'TEMPLATE_ITEM_MISSING_PRODUCT', 'All template lines must reference a product to create an invoice');
  const invoiceInput: SalesPostingInput = {
    customerId: input.customerId,
    warehouseId: input.warehouseId,
    invoiceDate: input.invoiceDate,
    currency: 'EGP',
    discountAmount: '0',
    initialPayment: '0',
    paymentMethod: input.paymentMethod,
    source: 'erp',
    items: items.map((item) => ({ productId: item.product_id as string, description: item.description, quantity: item.quantity, unitPrice: item.unit_price, taxRate: item.tax_rate })),
  };
  return postSalesInvoice(client, auth, operationKey, invoiceInput);
}
