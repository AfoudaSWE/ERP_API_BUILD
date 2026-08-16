import type { PoolClient } from 'pg';
import type { PurchaseOrderInput } from '@erp/contracts';
import { formatDecimal, parseDecimal, roundHalfAwayFromZero } from '@erp/contracts';
import { nextDocumentNumber } from '../../lib/document-number.js';
import { HttpError } from '../../lib/http.js';
import { appendAuditEvent } from '../audit/routes.js';

export function calculatePurchaseTotals(input: PurchaseOrderInput) {
  const items = input.items.map((item) => {
    const base = roundHalfAwayFromZero(parseDecimal(item.quantity, 3) * parseDecimal(item.unitPrice, 2), 1000n);
    const tax = roundHalfAwayFromZero(base * parseDecimal(item.taxRate, 4), 1_000_000n);
    return { ...item, taxAmount: formatDecimal(tax, 2), total: formatDecimal(base + tax, 2), base };
  });
  const subtotal = items.reduce((sum, item) => sum + item.base, 0n);
  const tax = items.reduce((sum, item) => sum + parseDecimal(item.taxAmount, 2), 0n);
  const discount = parseDecimal(input.discountAmount, 2);
  if (discount > subtotal + tax) throw new HttpError(422, 'INVALID_DISCOUNT', 'Discount cannot exceed order value');
  return { items, subtotal: formatDecimal(subtotal, 2), taxAmount: formatDecimal(tax, 2), total: formatDecimal(subtotal + tax - discount, 2) };
}

export async function createPurchaseOrder(client: PoolClient, auth: Express.Request['auth'] & {}, input: PurchaseOrderInput) {
  const refs = await client.query(`SELECT (EXISTS(SELECT 1 FROM suppliers WHERE id=$2 AND company_id=$1 AND is_active)) supplier_ok,(EXISTS(SELECT 1 FROM warehouses WHERE id=$3 AND company_id=$1 AND is_active)) warehouse_ok,(SELECT count(*)::int FROM products WHERE company_id=$1 AND id=ANY($4::uuid[]) AND is_active) product_count`, [auth.companyId, input.supplierId, input.warehouseId, input.items.map((item) => item.productId)]);
  const ref = refs.rows[0];
  if (!ref.supplier_ok || !ref.warehouse_ok || ref.product_count !== new Set(input.items.map((item) => item.productId)).size) throw new HttpError(422, 'INVALID_REFERENCE', 'Supplier, warehouse, or product is outside this company or inactive');
  const totals = calculatePurchaseTotals(input);
  const orderNumber = await nextDocumentNumber(client, { companyId: auth.companyId, documentType: 'purchase_order', prefix: 'PO', businessDate: input.orderDate });
  const order = await client.query<{ id: string }>(`INSERT INTO purchase_orders(company_id,order_number,supplier_id,warehouse_id,order_date,expected_date,currency,subtotal,discount_amount,tax_amount,total,notes,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`, [auth.companyId, orderNumber, input.supplierId, input.warehouseId, input.orderDate, input.expectedDate ?? null, input.currency, totals.subtotal, input.discountAmount, totals.taxAmount, totals.total, input.notes ?? null, auth.userId]);
  for (const item of totals.items) await client.query(`INSERT INTO purchase_order_items(purchase_order_id,product_id,description,ordered_quantity,unit,unit_price,tax_rate,tax_amount,total) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [order.rows[0].id, item.productId, item.description, item.quantity, item.unit, item.unitPrice, item.taxRate, item.taxAmount, item.total]);
  await appendAuditEvent(client, { tenantId: auth.tenantId, companyId: auth.companyId, actorUserId: auth.userId, action: 'purchase_order.created', entityType: 'purchase_order', entityId: order.rows[0].id, after: input });
  return order.rows[0];
}

const transitions: Record<string, Partial<Record<string, string>>> = { draft: { submit: 'submitted', cancel: 'cancelled' }, submitted: { approve: 'approved', reject: 'rejected', cancel: 'cancelled' }, approved: { close: 'closed', cancel: 'cancelled' }, partially_received: { close: 'closed' } };
export async function transitionPurchaseOrder(client: PoolClient, auth: Express.Request['auth'] & {}, id: string, action: string, reason?: string) {
  const current = await client.query<{ status: string }>('SELECT status FROM purchase_orders WHERE id=$1 AND company_id=$2 FOR UPDATE', [id, auth.companyId]);
  if (!current.rows[0]) throw new HttpError(404, 'PURCHASE_ORDER_NOT_FOUND', 'Purchase order not found');
  const next = transitions[current.rows[0].status]?.[action];
  if (!next) throw new HttpError(409, 'INVALID_STATE_TRANSITION', `Cannot ${action} a ${current.rows[0].status} purchase order`);
  const updated = await client.query(`UPDATE purchase_orders SET status=$3,approved_by=CASE WHEN $4='approve' THEN $5 ELSE approved_by END,approved_at=CASE WHEN $4='approve' THEN now() ELSE approved_at END,updated_at=now() WHERE id=$1 AND company_id=$2 RETURNING *`, [id, auth.companyId, next, action, auth.userId]);
  await appendAuditEvent(client, { tenantId: auth.tenantId, companyId: auth.companyId, actorUserId: auth.userId, action: `purchase_order.${action}`, entityType: 'purchase_order', entityId: id, before: current.rows[0], after: updated.rows[0], metadata: reason ? { reason } : {} });
  return updated.rows[0];
}
