import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { pool, transaction } from '../../db/client.js';
import { postSalesInvoice } from './posting-service.js'; import { postSalesReturn } from './return-service.js';
import { cleanupSalesFixture, createSalesFixture, saleInput, salesAuth } from './test-fixture.js';

describe('sales returns', () => {
  it('restores stock once and rejects excess return', async () => {
    const row = await createSalesFixture();
    try {
      const sale = await transaction((client) => postSalesInvoice(client, salesAuth(row), `sale-${randomUUID()}`, saleInput(row)));
      const invoiceId = (sale.body as { data: { id: string } }).data.id;
      const item = (await pool.query<{ id: string }>('SELECT id FROM sales_invoice_items WHERE invoice_id=$1', [invoiceId])).rows[0];
      const key = `return-${randomUUID()}`; const input = { businessDate: '2026-07-15', reason: 'Customer return', items: [{ invoiceItemId: item.id, quantity: '1.000' }] };
      expect((await transaction((client) => postSalesReturn(client, salesAuth(row), invoiceId, key, input))).kind).toBe('created');
      expect((await transaction((client) => postSalesReturn(client, salesAuth(row), invoiceId, key, input))).kind).toBe('replay');
      await expect(transaction((client) => postSalesReturn(client, salesAuth(row), invoiceId, `return-${randomUUID()}`, { ...input, items: [{ ...input.items[0], quantity: '2.000' }] }))).rejects.toMatchObject({ code: 'EXCESS_RETURN' });
      expect(Number((await pool.query<{ on_hand: string }>('SELECT on_hand FROM inventory_balances WHERE company_id=$1', [row.companyId])).rows[0].on_hand)).toBe(9);
    } finally { await cleanupSalesFixture(row.tenantId); }
  });
});
afterAll(() => pool.end());
