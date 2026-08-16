import { describe, expect, it } from 'vitest';
import { commerceProductInputSchema } from './index.js';

const valid = { sku: 'SKU-1', name: 'Product', costPrice: 10, sellingPrice: 15 };

describe('commerce product validation', () => {
  it('applies safe product defaults', () => {
    expect(commerceProductInputSchema.parse(valid)).toMatchObject({ status: 'active', unit: 'piece', isActive: true });
  });

  it('rejects a price below cost', () => {
    expect(() => commerceProductInputSchema.parse({ ...valid, sellingPrice: 9 })).toThrow(/Selling price/);
  });
});
