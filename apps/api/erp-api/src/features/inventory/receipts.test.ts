import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool, transaction } from '../../db/client.js';
import { databaseAvailable } from '../../test/db.js';
import { postGoodsReceipt } from '../purchasing/receipt-service.js';

type Fixture = { tenantId: string; companyId: string; userId: string; orderId: string; itemId: string; productId: string };

async function fixture(quantity = '5.000'): Promise<Fixture> {
  const tenantId = randomUUID(); const companyId = randomUUID(); const userId = randomUUID();
  const supplierId = randomUUID(); const productId = randomUUID(); const warehouseId = randomUUID();
  const orderId = randomUUID(); const itemId = randomUUID();
  await pool.query(`INSERT INTO tenants(id,name,slug) VALUES($1,'Receipt Test',$2)`, [tenantId, `receipt-${tenantId}`]);
  await pool.query(`INSERT INTO companies(id,tenant_id,name) VALUES($1,$2,'Receipt Test')`, [companyId, tenantId]);
  await pool.query(`INSERT INTO users(id,tenant_id,company_id,email,password_hash,name,role) VALUES($1,$2,$3,$4,'test','Tester','business_owner')`, [userId, tenantId, companyId, `${userId}@test.local`]);
  await pool.query(`INSERT INTO suppliers(id,company_id,code,name) VALUES($1,$2,'SUP','Supplier')`, [supplierId, companyId]);
  await pool.query(`INSERT INTO products(id,company_id,sku,name,cost_price,selling_price,total_stock) VALUES($1,$2,'SKU','Product',10,20,0)`, [productId, companyId]);
  await pool.query(`INSERT INTO warehouses(id,company_id,code,name) VALUES($1,$2,'MAIN','Main')`, [warehouseId, companyId]);
  await pool.query(`INSERT INTO ledger_accounts(company_id,code,name,account_type,system_role) VALUES($1,'1300','Inventory','asset','inventory'),($1,'2100','GRNI','liability','grni')`, [companyId]);
  await pool.query(`INSERT INTO purchase_orders(id,company_id,order_number,supplier_id,warehouse_id,status,order_date,subtotal,tax_amount,total,created_by) VALUES($1,$2,'PO-TEST',$3,$4,'approved',current_date,50,7,57,$5)`, [orderId, companyId, supplierId, warehouseId, userId]);
  await pool.query(`INSERT INTO purchase_order_items(id,purchase_order_id,product_id,description,ordered_quantity,unit_price,tax_rate,tax_amount,total) VALUES($1,$2,$3,'Product',$4,10,14,7,57)`, [itemId, orderId, productId, quantity]);
  return { tenantId, companyId, userId, orderId, itemId, productId };
}

async function cleanup(tenantId: string) {
  const company = await pool.query<{ id: string }>('SELECT id FROM companies WHERE tenant_id=$1', [tenantId]);
  for (const { id: companyId } of company.rows) {
    await transaction(async (client) => {
      await client.query(`SET LOCAL session_replication_role = 'replica'`);
      await client.query(`DELETE FROM journal_lines WHERE journal_entry_id IN (SELECT id FROM journal_entries WHERE company_id=$1)`, [companyId]);
      await client.query('DELETE FROM supplier_accruals WHERE company_id=$1', [companyId]);
      await client.query('DELETE FROM journal_entries WHERE company_id=$1', [companyId]);
      await client.query('DELETE FROM stock_movements WHERE company_id=$1', [companyId]);
      await client.query(`DELETE FROM goods_receipt_items WHERE goods_receipt_id IN (SELECT id FROM goods_receipts WHERE company_id=$1)`, [companyId]);
      await client.query('DELETE FROM goods_receipts WHERE company_id=$1', [companyId]);
      await client.query(`DELETE FROM purchase_order_items WHERE purchase_order_id IN (SELECT id FROM purchase_orders WHERE company_id=$1)`, [companyId]);
      await client.query('DELETE FROM purchase_orders WHERE company_id=$1', [companyId]);
      for (const table of ['inventory_balances', 'idempotency_records', 'document_sequences', 'audit_events', 'ledger_accounts', 'warehouses', 'products', 'suppliers']) await client.query(`DELETE FROM ${table} WHERE company_id=$1`, [companyId]);
      await client.query('DELETE FROM users WHERE company_id=$1', [companyId]);
      await client.query('DELETE FROM companies WHERE id=$1', [companyId]);
    });
  }
  await pool.query('DELETE FROM tenants WHERE id=$1', [tenantId]);
}
function auth(row: Fixture) { return { tenantId: row.tenantId, companyId: row.companyId, userId: row.userId, role: 'business_owner', permissions: ['inventory.write'] }; }

describe('goods receipt transaction integrity', () => {
  it('replays the same operation without duplicating stock', async () => {
    if (!(await databaseAvailable())) return;
    const row = await fixture();
    try {
      const key = `receipt-${randomUUID()}`;
      const input = { receiptDate: '2026-07-15', items: [{ purchaseOrderItemId: row.itemId, acceptedQuantity: '2.000' }] };
      const first = await transaction((client) => postGoodsReceipt(client, auth(row), row.orderId, key, input));
      const replay = await transaction((client) => postGoodsReceipt(client, auth(row), row.orderId, key, input));
      expect(first.kind).toBe('created'); expect(replay.kind).toBe('replay');
      const count = await pool.query<{ count: string }>(`SELECT count(*) FROM stock_movements WHERE company_id=$1`, [row.companyId]);
      expect(Number(count.rows[0].count)).toBe(1);
    } finally { await cleanup(row.tenantId); }
  });

  it('serializes competing receipts and rejects the excess writer', async () => {
    if (!(await databaseAvailable())) return;
    const row = await fixture('1.000');
    try {
      const input = { receiptDate: '2026-07-15', items: [{ purchaseOrderItemId: row.itemId, acceptedQuantity: '1.000' }] };
      const results = await Promise.allSettled([
        transaction((client) => postGoodsReceipt(client, auth(row), row.orderId, `receipt-${randomUUID()}`, input)),
        transaction((client) => postGoodsReceipt(client, auth(row), row.orderId, `receipt-${randomUUID()}`, input)),
      ]);
      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
      const stock = await pool.query<{ total: string }>(`SELECT COALESCE(sum(quantity),0)::text total FROM stock_movements WHERE company_id=$1 AND product_id=$2`, [row.companyId, row.productId]);
      expect(Number(stock.rows[0].total)).toBe(1);
    } finally { await cleanup(row.tenantId); }
  });

  it('rolls back every effect when accepted quantity exceeds the remainder', async () => {
    if (!(await databaseAvailable())) return;
    const row = await fixture('1.000');
    try {
      await expect(transaction((client) => postGoodsReceipt(client, auth(row), row.orderId, `receipt-${randomUUID()}`, { receiptDate: '2026-07-15', items: [{ purchaseOrderItemId: row.itemId, acceptedQuantity: '2.000' }] }))).rejects.toMatchObject({ code: 'EXCESS_RECEIPT' });
      const count = await pool.query<{ count: string }>(`SELECT count(*) FROM goods_receipts WHERE company_id=$1`, [row.companyId]);
      expect(Number(count.rows[0].count)).toBe(0);
    } finally { await cleanup(row.tenantId); }
  });
});

beforeAll(async () => {
  if (!(await databaseAvailable())) return;
  const stale = await pool.query<{ id: string }>(`SELECT id FROM tenants WHERE slug LIKE 'receipt-%'`);
  for (const row of stale.rows) await cleanup(row.id);
});

afterAll(async () => { await pool.end(); });
