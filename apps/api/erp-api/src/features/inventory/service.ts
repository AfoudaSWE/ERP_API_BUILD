import type { PoolClient } from 'pg';
import { HttpError } from '../../lib/http.js';
import { parseDecimal } from '@erp/contracts';

export async function lockInventoryBalance(client: PoolClient, input: { companyId: string; warehouseId: string; productId: string }) {
  await client.query(`INSERT INTO inventory_balances(company_id,warehouse_id,product_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING`, [input.companyId, input.warehouseId, input.productId]);
  const result = await client.query<{ on_hand: string; reserved: string; average_cost: string }>(`SELECT on_hand,reserved,average_cost FROM inventory_balances WHERE company_id=$1 AND warehouse_id=$2 AND product_id=$3 FOR UPDATE`, [input.companyId, input.warehouseId, input.productId]);
  if (!result.rows[0]) throw new HttpError(404, 'INVENTORY_BALANCE_NOT_FOUND', 'Inventory balance not found');
  return result.rows[0];
}

export async function receiveInventory(client: PoolClient, input: { companyId: string; warehouseId: string; productId: string; quantity: string; unitCost: string }) {
  await lockInventoryBalance(client, input);
  await client.query(`UPDATE inventory_balances SET average_cost=CASE WHEN on_hand+$4::numeric=0 THEN 0 ELSE round(((on_hand*average_cost)+($4::numeric*$5::numeric))/(on_hand+$4::numeric),2) END,on_hand=on_hand+$4::numeric,updated_at=now() WHERE company_id=$1 AND warehouse_id=$2 AND product_id=$3`, [input.companyId, input.warehouseId, input.productId, input.quantity, input.unitCost]);
  await client.query(`UPDATE products SET total_stock=(SELECT COALESCE(sum(on_hand),0) FROM inventory_balances WHERE company_id=$1 AND product_id=$2),updated_at=now() WHERE company_id=$1 AND id=$2`, [input.companyId, input.productId]);
}

export async function issueInventory(client: PoolClient, input: { companyId: string; warehouseId: string; productId: string; quantity: string }) {
  const balance = await lockInventoryBalance(client, input);
  const available = parseDecimal(balance.on_hand, 3) - parseDecimal(balance.reserved, 3);
  if (available < parseDecimal(input.quantity, 3)) throw new HttpError(409, 'INSUFFICIENT_STOCK', 'Insufficient warehouse availability');
  await client.query(`UPDATE inventory_balances SET on_hand=on_hand-$4::numeric,updated_at=now() WHERE company_id=$1 AND warehouse_id=$2 AND product_id=$3`, [input.companyId, input.warehouseId, input.productId, input.quantity]);
  await client.query(`UPDATE products SET total_stock=(SELECT COALESCE(sum(on_hand),0) FROM inventory_balances WHERE company_id=$1 AND product_id=$2),updated_at=now() WHERE company_id=$1 AND id=$2`, [input.companyId, input.productId]);
  return balance.average_cost;
}
