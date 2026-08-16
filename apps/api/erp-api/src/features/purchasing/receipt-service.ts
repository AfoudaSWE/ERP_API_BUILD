import type { PoolClient } from 'pg';
import type { GoodsReceiptInput } from '@erp/contracts';
import { formatDecimal, parseDecimal, roundHalfAwayFromZero } from '@erp/contracts';
import { appendAuditEvent } from '../audit/routes.js';
import { postJournal } from '../accounting/posting-service.js';
import { receiveInventory } from '../inventory/service.js';
import { nextDocumentNumber } from '../../lib/document-number.js';
import { beginIdempotent, completeIdempotent } from '../../lib/idempotency.js';
import { HttpError } from '../../lib/http.js';

type OrderRow = { id: string; supplier_id: string; warehouse_id: string; status: string };
type ItemRow = { id: string; product_id: string; ordered_quantity: string; received_quantity: string; unit_price: string; tax_rate: string };

export async function postGoodsReceipt(client: PoolClient, auth: Express.Request['auth'] & {}, purchaseOrderId: string, operationKey: string, input: GoodsReceiptInput) {
  const replay = await beginIdempotent(client, { companyId: auth.companyId, key: operationKey, action: 'goods_receipt.post', body: { purchaseOrderId, ...input } });
  if (replay.kind === 'replay') return replay;
  const orderResult = await client.query<OrderRow>('SELECT id,supplier_id,warehouse_id,status FROM purchase_orders WHERE id=$1 AND company_id=$2 FOR UPDATE', [purchaseOrderId, auth.companyId]);
  const order = orderResult.rows[0];
  if (!order) throw new HttpError(404, 'PURCHASE_ORDER_NOT_FOUND', 'Purchase order not found');
  if (!['approved', 'partially_received'].includes(order.status)) throw new HttpError(409, 'ORDER_NOT_RECEIVABLE', `Purchase order status ${order.status} cannot be received`);
  const ids = input.items.map((item) => item.purchaseOrderItemId);
  const itemResult = await client.query<ItemRow>(`SELECT id,product_id,ordered_quantity,received_quantity,unit_price,tax_rate FROM purchase_order_items WHERE purchase_order_id=$1 AND id=ANY($2::uuid[]) FOR UPDATE`, [purchaseOrderId, ids]);
  if (itemResult.rows.length !== ids.length) throw new HttpError(422, 'INVALID_RECEIPT_ITEM', 'A receipt line does not belong to this purchase order');
  const itemById = new Map(itemResult.rows.map((row) => [row.id, row]));
  const calculated = input.items.map((requested) => {
    const row = itemById.get(requested.purchaseOrderItemId)!;
    const quantity = parseDecimal(requested.acceptedQuantity, 3);
    if (parseDecimal(row.received_quantity, 3) + quantity > parseDecimal(row.ordered_quantity, 3)) throw new HttpError(409, 'EXCESS_RECEIPT', 'Accepted quantity exceeds the purchase order remainder');
    const base = roundHalfAwayFromZero(quantity * parseDecimal(row.unit_price, 2), 1000n);
    const tax = roundHalfAwayFromZero(base * parseDecimal(row.tax_rate, 4), 1_000_000n);
    return { requested, row, base, tax, total: base + tax };
  });
  const receiptNumber = await nextDocumentNumber(client, { companyId: auth.companyId, documentType: 'goods_receipt', prefix: 'GRN', businessDate: input.receiptDate });
  const receipt = await client.query<{ id: string }>(`INSERT INTO goods_receipts(company_id,receipt_number,purchase_order_id,supplier_id,warehouse_id,receipt_date,supplier_reference,operation_key,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [auth.companyId, receiptNumber, purchaseOrderId, order.supplier_id, order.warehouse_id, input.receiptDate, input.supplierReference ?? null, operationKey, auth.userId]);
  for (const line of calculated) {
    const inserted = await client.query<{ id: string }>(`INSERT INTO goods_receipt_items(goods_receipt_id,purchase_order_item_id,product_id,accepted_quantity,unit_cost,tax_amount,total) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`, [receipt.rows[0].id, line.row.id, line.row.product_id, line.requested.acceptedQuantity, line.row.unit_price, formatDecimal(line.tax, 2), formatDecimal(line.total, 2)]);
    await client.query('UPDATE purchase_order_items SET received_quantity=received_quantity+$2::numeric WHERE id=$1', [line.row.id, line.requested.acceptedQuantity]);
    await receiveInventory(client, { companyId: auth.companyId, warehouseId: order.warehouse_id, productId: line.row.product_id, quantity: line.requested.acceptedQuantity, unitCost: line.row.unit_price });
    await client.query(`INSERT INTO stock_movements(company_id,warehouse_id,product_id,movement_type,quantity,unit_cost,source_type,source_id,source_line_id,operation_key,business_date,created_by) VALUES($1,$2,$3,'receipt',$4,$5,'goods_receipt',$6,$7,$8,$9,$10)`, [auth.companyId, order.warehouse_id, line.row.product_id, line.requested.acceptedQuantity, line.row.unit_price, receipt.rows[0].id, inserted.rows[0].id, operationKey, input.receiptDate, auth.userId]);
  }
  const total = calculated.reduce((sum, line) => sum + line.total, 0n);
  const totalString = formatDecimal(total, 2);
  const journalId = await postJournal(client, { companyId: auth.companyId, userId: auth.userId, businessDate: input.receiptDate, description: `Goods receipt ${receiptNumber}`, sourceType: 'goods_receipt', sourceId: receipt.rows[0].id, postingType: 'receipt', operationKey, lines: [{ accountRole: 'inventory', debit: totalString, credit: '0' }, { accountRole: 'grni', debit: '0', credit: totalString, partyType: 'supplier', partyId: order.supplier_id }] });
  await client.query(`INSERT INTO supplier_accruals(company_id,supplier_id,goods_receipt_id,business_date,amount,journal_entry_id,operation_key) VALUES($1,$2,$3,$4,$5,$6,$7)`, [auth.companyId, order.supplier_id, receipt.rows[0].id, input.receiptDate, totalString, journalId, operationKey]);
  const remaining = await client.query<{ remaining: string }>('SELECT count(*) FILTER (WHERE received_quantity < ordered_quantity)::text remaining FROM purchase_order_items WHERE purchase_order_id=$1', [purchaseOrderId]);
  await client.query(`UPDATE purchase_orders SET status=$2,updated_at=now() WHERE id=$1`, [purchaseOrderId, remaining.rows[0].remaining === '0' ? 'received' : 'partially_received']);
  const responseBody = { data: { ...receipt.rows[0], receiptNumber, total: totalString, journalEntryId: journalId } };
  await appendAuditEvent(client, { tenantId: auth.tenantId, companyId: auth.companyId, actorUserId: auth.userId, action: 'goods_receipt.posted', entityType: 'goods_receipt', entityId: receipt.rows[0].id, operationKey, after: responseBody.data });
  await completeIdempotent(client, { companyId: auth.companyId, key: operationKey, resourceType: 'goods_receipt', resourceId: receipt.rows[0].id, statusCode: 201, body: responseBody });
  return { kind: 'created' as const, statusCode: 201, body: responseBody };
}
