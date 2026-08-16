import { describe, expect, it } from 'vitest';
import { purchaseOrderInputSchema } from '@erp/contracts';
import { calculatePurchaseTotals } from './service.js';

const input = { supplierId: '5d4d8bde-bafd-4cd2-8e57-12bbf14ad61f', warehouseId: '35e0c019-5084-41e6-9ad7-6e05044b2521', orderDate: '2026-07-15', currency: 'EGP' as const, discountAmount: '0', items: [{ productId: '4d68462c-6524-4381-b706-b2de3902db89', description: 'Item', quantity: '3.125', unit: 'piece', unitPrice: '10.20', taxRate: '14' }] };

describe('purchase order contracts and totals', () => {
  it('calculates exact rounded totals from decimal strings', () => {
    const parsed = purchaseOrderInputSchema.parse(input);
    expect(calculatePurchaseTotals(parsed)).toMatchObject({ subtotal: '31.88', taxAmount: '4.46', total: '36.34' });
  });
  it('rejects numeric money inputs', () => expect(purchaseOrderInputSchema.safeParse({ ...input, items: [{ ...input.items[0], unitPrice: 10.2 }] }).success).toBe(false));
});
