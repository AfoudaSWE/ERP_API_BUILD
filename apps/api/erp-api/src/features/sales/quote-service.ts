import type { PoolClient } from 'pg';
import type { SalesQuoteInput, SalesPostingInput } from '@erp/contracts';
import { formatDecimal, parseDecimal, roundHalfAwayFromZero } from '@erp/contracts';
import { HttpError } from '../../lib/http.js';
import { nextDocumentNumber } from '../../lib/document-number.js';
import { appendAuditEvent } from '../audit/routes.js';
import { postSalesInvoice } from './posting-service.js';

export async function createSalesQuote(client: PoolClient, auth: Express.Request['auth'] & {}, input: SalesQuoteInput) {
  const calculated = input.items.map((item) => {
    const quantity = parseDecimal(item.quantity, 3);
    const price = parseDecimal(item.unitPrice, 2);
    const base = roundHalfAwayFromZero(quantity * price, 1000n);
    const tax = roundHalfAwayFromZero(base * parseDecimal(item.taxRate, 4), 1_000_000n);
    return { item, base, tax, total: base + tax };
  });
  const grossSubtotal = calculated.reduce((sum, row) => sum + row.base, 0n);
  const discount = parseDecimal(input.discountAmount, 2);
  const tax = calculated.reduce((sum, row) => sum + row.tax, 0n);
  const total = grossSubtotal - discount + tax;
  const quoteNumber = await nextDocumentNumber(client, { companyId: auth.companyId, documentType: 'sales_quote', prefix: 'QUO', businessDate: input.quoteDate });
  const quote = await client.query<{ id: string }>(
    `INSERT INTO sales_quotes(company_id,quote_number,customer_id,customer_name,quote_date,valid_until,subtotal,discount_amount,tax_amount,total,notes,created_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [auth.companyId, quoteNumber, input.customerId ?? null, input.customerName ?? null, input.quoteDate, input.validUntil ?? null, formatDecimal(grossSubtotal, 2), input.discountAmount, formatDecimal(tax, 2), formatDecimal(total, 2), input.notes, auth.userId],
  );
  for (const row of calculated) {
    await client.query(
      `INSERT INTO sales_quote_items(quote_id,product_id,description,quantity,unit_price,tax_rate,total) VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [quote.rows[0].id, row.item.productId ?? null, row.item.description, row.item.quantity, row.item.unitPrice, row.item.taxRate, formatDecimal(row.total, 2)],
    );
  }
  await appendAuditEvent(client, { tenantId: auth.tenantId, companyId: auth.companyId, actorUserId: auth.userId, action: 'sales_quote.created', entityType: 'sales_quote', entityId: quote.rows[0].id, after: quote.rows[0] });
  return quote.rows[0];
}

export async function actOnSalesQuote(client: PoolClient, auth: Express.Request['auth'] & {}, quoteId: string, action: 'send' | 'accept' | 'reject') {
  const before = (await client.query('SELECT * FROM sales_quotes WHERE id=$1 AND company_id=$2 FOR UPDATE', [quoteId, auth.companyId])).rows[0];
  if (!before) throw new HttpError(404, 'QUOTE_NOT_FOUND', 'Quote not found');
  const nextStatus = { send: 'sent', accept: 'accepted', reject: 'rejected' }[action];
  const allowedFrom: Record<string, string[]> = { send: ['draft'], accept: ['draft', 'sent'], reject: ['draft', 'sent'] };
  if (!allowedFrom[action].includes(before.status)) throw new HttpError(409, 'INVALID_QUOTE_STATE', `Cannot ${action} a quote in status ${before.status}`);
  const updated = (await client.query('UPDATE sales_quotes SET status=$2,updated_at=now() WHERE id=$1 RETURNING *', [quoteId, nextStatus])).rows[0];
  await appendAuditEvent(client, { tenantId: auth.tenantId, companyId: auth.companyId, actorUserId: auth.userId, action: `sales_quote.${action}`, entityType: 'sales_quote', entityId: quoteId, before, after: updated });
  return updated;
}

export async function convertQuoteToInvoice(client: PoolClient, auth: Express.Request['auth'] & {}, quoteId: string, operationKey: string, warehouseId: string | undefined, paymentMethod: SalesPostingInput['paymentMethod']) {
  const quote = (await client.query<{ id: string; status: string; customer_id: string | null; customer_name: string | null; discount_amount: string }>('SELECT * FROM sales_quotes WHERE id=$1 AND company_id=$2 FOR UPDATE', [quoteId, auth.companyId])).rows[0];
  if (!quote) throw new HttpError(404, 'QUOTE_NOT_FOUND', 'Quote not found');
  if (!['draft', 'sent', 'accepted'].includes((quote as { status: string }).status)) throw new HttpError(409, 'INVALID_QUOTE_STATE', 'Quote cannot be converted from its current status');
  const items = (await client.query<{ product_id: string | null; description: string; quantity: string; unit_price: string; tax_rate: string }>('SELECT product_id,description,quantity,unit_price,tax_rate FROM sales_quote_items WHERE quote_id=$1', [quoteId])).rows;
  if (!items.length) throw new HttpError(422, 'EMPTY_QUOTE', 'Quote has no items');
  const missingProduct = items.find((item) => !item.product_id);
  if (missingProduct) throw new HttpError(422, 'QUOTE_ITEM_MISSING_PRODUCT', 'All quote lines must reference a product to convert to an invoice');
  const invoiceInput: SalesPostingInput = {
    customerId: quote.customer_id ?? undefined,
    customerName: quote.customer_name ?? undefined,
    warehouseId,
    invoiceDate: new Date().toISOString().slice(0, 10),
    currency: 'EGP',
    discountAmount: quote.discount_amount,
    initialPayment: '0',
    paymentMethod,
    source: 'erp',
    items: items.map((item) => ({ productId: item.product_id as string, description: item.description, quantity: item.quantity, unitPrice: item.unit_price, taxRate: item.tax_rate })),
  };
  const result = await postSalesInvoice(client, auth, operationKey, invoiceInput);
  const invoiceId = (result.body as { data: { id: string } }).data.id;
  await client.query('UPDATE sales_quotes SET status=\'converted\',converted_invoice_id=$2,updated_at=now() WHERE id=$1', [quoteId, invoiceId]);
  return result;
}
