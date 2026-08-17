import type { PoolClient } from 'pg';
import type { StockTransferInput } from '@erp/contracts';
import { beginIdempotent, completeIdempotent } from '../../lib/idempotency.js';
import { appendAuditEvent } from '../audit/routes.js';
import { lockInventoryBalance, receiveInventory, issueInventory } from './service.js';

export async function postStockTransfer(
  client: PoolClient,
  auth: Express.Request['auth'] & {},
  operationKey: string,
  input: StockTransferInput,
) {
  const replay = await beginIdempotent(client, { companyId: auth.companyId, key: operationKey, action: 'stock_transfer.post', body: input });
  if (replay.kind === 'replay') return replay;
  const source = await lockInventoryBalance(client, { companyId: auth.companyId, warehouseId: input.fromWarehouseId, productId: input.productId });
  await issueInventory(client, { companyId: auth.companyId, warehouseId: input.fromWarehouseId, productId: input.productId, quantity: input.quantity });
  await receiveInventory(client, { companyId: auth.companyId, warehouseId: input.toWarehouseId, productId: input.productId, quantity: input.quantity, unitCost: source.average_cost });
  const transferGroupId = (await client.query<{ id: string }>('SELECT gen_random_uuid() id')).rows[0].id;
  const outMovement = await client.query<{ id: string }>(
    `INSERT INTO stock_movements(company_id,warehouse_id,product_id,movement_type,quantity,unit_cost,source_type,source_id,reason,operation_key,business_date,created_by)
     VALUES($1,$2,$3,'transfer_out',$4,$5,'manual_transfer',$6,$7,$8,$9,$10) RETURNING id`,
    [auth.companyId, input.fromWarehouseId, input.productId, `-${input.quantity}`, source.average_cost, transferGroupId, input.reason, operationKey, input.businessDate, auth.userId],
  );
  const inMovement = await client.query<{ id: string }>(
    `INSERT INTO stock_movements(company_id,warehouse_id,product_id,movement_type,quantity,unit_cost,source_type,source_id,reason,operation_key,business_date,created_by)
     VALUES($1,$2,$3,'transfer_in',$4,$5,'manual_transfer',$6,$7,$8,$9,$10) RETURNING id`,
    [auth.companyId, input.toWarehouseId, input.productId, input.quantity, source.average_cost, transferGroupId, input.reason, operationKey, input.businessDate, auth.userId],
  );
  const responseBody = { data: { id: transferGroupId, fromWarehouseId: input.fromWarehouseId, toWarehouseId: input.toWarehouseId, productId: input.productId, quantity: input.quantity, outMovementId: outMovement.rows[0].id, inMovementId: inMovement.rows[0].id } };
  await appendAuditEvent(client, { tenantId: auth.tenantId, companyId: auth.companyId, actorUserId: auth.userId, action: 'inventory.transfer_posted', entityType: 'stock_movement', entityId: transferGroupId, operationKey, after: responseBody.data });
  await completeIdempotent(client, { companyId: auth.companyId, key: operationKey, resourceType: 'stock_movement', resourceId: transferGroupId, statusCode: 201, body: responseBody });
  return { kind: 'created' as const, statusCode: 201, body: responseBody };
}
