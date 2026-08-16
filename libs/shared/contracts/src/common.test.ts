import { describe, expect, it } from 'vitest';
import { apiErrorSchema, dateRangeSchema, moneyValueSchema, operationKeySchema } from './common.js';

describe('shared ERP contracts', () => {
  it('requires retry-safe operation keys', () => {
    expect(operationKeySchema.safeParse('short').success).toBe(false);
    expect(operationKeySchema.parse('operation-1234567890')).toBe('operation-1234567890');
  });

  it('preserves decimal money as strings', () => {
    expect(moneyValueSchema.parse({ amount: '1250.50', currency: 'EGP' })).toEqual({ amount: '1250.50', currency: 'EGP' });
    expect(moneyValueSchema.safeParse({ amount: 1250.5, currency: 'EGP' }).success).toBe(false);
  });

  it('rejects reversed reporting ranges and validates errors', () => {
    expect(dateRangeSchema.safeParse({ from: '2026-07-16', to: '2026-07-15' }).success).toBe(false);
    expect(apiErrorSchema.parse({ error: { code: 'FORBIDDEN', message: 'Denied' } }).error.code).toBe('FORBIDDEN');
  });
});
