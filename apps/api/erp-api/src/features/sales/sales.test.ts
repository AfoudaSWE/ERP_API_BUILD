import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { pool, transaction } from '../../db/client.js';
import { postSalesInvoice } from './posting-service.js';
import { cleanupSalesFixture, createSalesFixture, saleInput, salesAuth } from './test-fixture.js';

describe('sales posting', () => {
  it('posts exact totals once and rolls back overselling', async () => {
    const row = await createSalesFixture();
    try {
      const key = `sale-${randomUUID()}`;
      const first = await transaction((client) => postSalesInvoice(client, salesAuth(row), key, saleInput(row)));
      const replay = await transaction((client) => postSalesInvoice(client, salesAuth(row), key, saleInput(row)));
      expect(first.kind).toBe('created'); expect(replay.kind).toBe('replay');
      expect((first.body as { data: { total: string } }).data.total).toBe('45.6');
      await expect(transaction((client) => postSalesInvoice(client, salesAuth(row), `sale-${randomUUID()}`, saleInput(row, '20.000')))).rejects.toMatchObject({ code: 'INSUFFICIENT_STOCK' });
      expect(Number((await pool.query<{ count: string }>('SELECT count(*) FROM sales_invoices WHERE company_id=$1', [row.companyId])).rows[0].count)).toBe(1);
    } finally { await cleanupSalesFixture(row.tenantId); }
  });
  it('serializes competing sales for the final stock', async () => {
    const row = await createSalesFixture('2.000');
    try {
      const attempts = await Promise.allSettled([
        transaction((client) => postSalesInvoice(client, salesAuth(row), `sale-${randomUUID()}`, saleInput(row))),
        transaction((client) => postSalesInvoice(client, salesAuth(row), `sale-${randomUUID()}`, saleInput(row))),
      ]);
      expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1);
      const rejected = attempts.find((attempt) => attempt.status === 'rejected');
      expect(rejected).toMatchObject({ reason: { code: 'INSUFFICIENT_STOCK' } });
      const balance = await pool.query<{ on_hand: string }>(
        'SELECT on_hand FROM inventory_balances WHERE company_id=$1 AND warehouse_id=$2 AND product_id=$3',
        [row.companyId, row.warehouseId, row.productId],
      );
      expect(Number(balance.rows[0].on_hand)).toBe(0);
    } finally { await cleanupSalesFixture(row.tenantId); }
  });
});
afterAll(() => pool.end());
