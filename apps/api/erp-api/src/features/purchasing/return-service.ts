import type { PoolClient } from 'pg';
import type { PurchaseReturnInput } from '@erp/contracts';
import { formatDecimal, parseDecimal, roundHalfAwayFromZero } from '@erp/contracts';
import { appendAuditEvent } from '../audit/routes.js';
import { postJournal } from '../accounting/posting-service.js';
import { issueInventory } from '../inventory/service.js';
import { nextDocumentNumber } from '../../lib/document-number.js';
import { beginIdempotent, completeIdempotent } from '../../lib/idempotency.js';

export async function postPurchaseReturn(client: PoolClient, auth: Express.Request['auth'] & {}, operationKey: string, input: PurchaseReturnInput) {
  const replay = await beginIdempotent(client, { companyId: auth.companyId, key: operationKey, action: 'purchase_return.post', body: input });
  if (replay.kind === 'replay') return replay;
  const calculated = input.items.map((item) => {
    const quantity = parseDecimal(item.quantity, 3);
    const base = roundHalfAwayFromZero(quantity * parseDecimal(item.unitCost, 2), 1000n);
    const tax = roundHalfAwayFromZero(base * parseDecimal(item.taxRate, 4), 1_000_000n);
    return { item, base, tax, total: base + tax };
  });
  const subtotal = calculated.reduce((sum, row) => sum + row.base, 0n);
  const taxAmount = calculated.reduce((sum, row) => sum + row.tax, 0n);
  const total = subtotal + taxAmount;
  const returnNumber = await nextDocumentNumber(client, { companyId: auth.companyId, documentType: 'purchase_return', prefix: 'PRT', businessDate: input.businessDate });
  const purchaseReturn = await client.query<{ id: string }>(
    `INSERT INTO purchase_returns(company_id,return_number,supplier_id,warehouse_id,business_date,reason,subtotal,tax_amount,total,status,operation_key,created_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'posted',$10,$11) RETURNING *`,
    [auth.companyId, returnNumber, input.supplierId, input.warehouseId, input.businessDate, input.reason, formatDecimal(subtotal, 2), formatDecimal(taxAmount, 2), formatDecimal(total, 2), operationKey, auth.userId],
  );
  for (const row of calculated) {
    const insertedItem = await client.query<{ id: string }>(
      `INSERT INTO purchase_return_items(purchase_return_id,product_id,quantity,unit_cost,tax_rate,tax_amount,total) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [purchaseReturn.rows[0].id, row.item.productId, row.item.quantity, row.item.unitCost, row.item.taxRate, formatDecimal(row.tax, 2), formatDecimal(row.total, 2)],
    );
    await issueInventory(client, { companyId: auth.companyId, warehouseId: input.warehouseId, productId: row.item.productId, quantity: row.item.quantity });
    await client.query(
      `INSERT INTO stock_movements(company_id,warehouse_id,product_id,movement_type,quantity,unit_cost,source_type,source_id,source_line_id,operation_key,business_date,created_by) VALUES($1,$2,$3,'issue',$4,$5,'purchase_return',$6,$7,$8,$9,$10)`,
      [auth.companyId, input.warehouseId, row.item.productId, row.item.quantity, row.item.unitCost, purchaseReturn.rows[0].id, insertedItem.rows[0].id, operationKey, input.businessDate, auth.userId],
    );
  }
  const totalString = formatDecimal(total, 2);
  const journalId = await postJournal(client, {
    companyId: auth.companyId,
    userId: auth.userId,
    businessDate: input.businessDate,
    description: `Purchase return ${returnNumber}`,
    sourceType: 'purchase_return',
    sourceId: purchaseReturn.rows[0].id,
    postingType: 'issue',
    operationKey,
    lines: [
      { accountRole: 'grni', debit: totalString, credit: '0', partyType: 'supplier', partyId: input.supplierId },
      { accountRole: 'inventory', debit: '0', credit: totalString },
    ],
  });
  const responseBody = { data: { ...purchaseReturn.rows[0], returnNumber, total: totalString, journalEntryId: journalId } };
  await appendAuditEvent(client, { tenantId: auth.tenantId, companyId: auth.companyId, actorUserId: auth.userId, action: 'purchase_return.posted', entityType: 'purchase_return', entityId: purchaseReturn.rows[0].id, operationKey, after: responseBody.data });
  await completeIdempotent(client, { companyId: auth.companyId, key: operationKey, resourceType: 'purchase_return', resourceId: purchaseReturn.rows[0].id, statusCode: 201, body: responseBody });
  return { kind: 'created' as const, statusCode: 201, body: responseBody };
}
