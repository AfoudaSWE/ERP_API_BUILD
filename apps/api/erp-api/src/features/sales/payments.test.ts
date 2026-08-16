import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { pool, transaction } from '../../db/client.js';
import { postSalesInvoice } from './posting-service.js'; import { postCustomerPayment } from './payment-service.js';
import { cleanupSalesFixture, createSalesFixture, saleInput, salesAuth } from './test-fixture.js';

describe('payment allocation', () => {
  it('allocates once and rejects over-allocation', async () => {
    const row = await createSalesFixture();
    try {
      const sale = await transaction((client) => postSalesInvoice(client, salesAuth(row), `sale-${randomUUID()}`, saleInput(row)));
      const invoiceId = (sale.body as { data: { id: string } }).data.id;
      const input = { amount: '20.00', businessDate: '2026-07-15', method: 'cash' as const };
      const payment = await transaction((client) => postCustomerPayment(client, salesAuth(row), invoiceId, `pay-${randomUUID()}`, input));
      expect((payment.body as { data: { remainingAmount: string } }).data.remainingAmount).toBe('25.6');
      await expect(transaction((client) => postCustomerPayment(client, salesAuth(row), invoiceId, `pay-${randomUUID()}`, { ...input, amount: '30.00' }))).rejects.toMatchObject({ code: 'OVER_ALLOCATION' });
    } finally { await cleanupSalesFixture(row.tenantId); }
  });
});
afterAll(() => pool.end());
