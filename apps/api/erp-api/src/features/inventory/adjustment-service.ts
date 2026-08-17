import type { PoolClient } from 'pg';
import type { InventoryAdjustmentInput } from '@erp/contracts';
import { parseDecimal } from '@erp/contracts';
import { beginIdempotent, completeIdempotent } from '../../lib/idempotency.js';
import { appendAuditEvent } from '../audit/routes.js';
import { lockInventoryBalance, receiveInventory, issueInventory } from './service.js';

export async function postStockAdjustment(
  client: PoolClient,
  auth: Express.Request['auth'] & {},
  operationKey: string,
  input: InventoryAdjustmentInput,
) {
  const replay = await beginIdempotent(client, { companyId: auth.companyId, key: operationKey, action: 'stock_adjustment.post', body: input });
  if (replay.kind === 'replay') return replay;
  const balance = await lockInventoryBalance(client, { companyId: auth.companyId, warehouseId: input.warehouseId, productId: input.productId });
  const quantity = parseDecimal(input.quantity, 3);
  if (quantity > 0) {
    await receiveInventory(client, { companyId: auth.companyId, warehouseId: input.warehouseId, productId: input.productId, quantity: input.quantity, unitCost: balance.average_cost });
  } else {
    await issueInventory(client, { companyId: auth.companyId, warehouseId: input.warehouseId, productId: input.productId, quantity: String(-quantity) });
  }
  const movement = await client.query<{ id: string }>(
    `INSERT INTO stock_movements(company_id,warehouse_id,product_id,movement_type,quantity,unit_cost,source_type,source_id,reason,operation_key,business_date,created_by)
     VALUES($1,$2,$3,'adjustment',$4,$5,'manual_adjustment',gen_random_uuid(),$6,$7,$8,$9) RETURNING id`,
    [auth.companyId, input.warehouseId, input.productId, input.quantity, balance.average_cost, input.reason, operationKey, input.businessDate, auth.userId],
  );
  const responseBody = { data: { id: movement.rows[0].id, warehouseId: input.warehouseId, productId: input.productId, quantity: input.quantity, reason: input.reason } };
  await appendAuditEvent(client, { tenantId: auth.tenantId, companyId: auth.companyId, actorUserId: auth.userId, action: 'inventory.adjustment_posted', entityType: 'stock_movement', entityId: movement.rows[0].id, operationKey, after: responseBody.data });
  await completeIdempotent(client, { companyId: auth.companyId, key: operationKey, resourceType: 'stock_movement', resourceId: movement.rows[0].id, statusCode: 201, body: responseBody });
  return { kind: 'created' as const, statusCode: 201, body: responseBody };
}
