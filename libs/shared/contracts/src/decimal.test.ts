import { describe, expect, it } from 'vitest';
import { formatDecimal, moneySchema, parseDecimal, roundHalfAwayFromZero } from './decimal.js';

describe('decimal helpers', () => {
  it('parses and serializes exact decimal values', () => {
    expect(parseDecimal('123.45', 2)).toBe(12345n);
    expect(formatDecimal(123450n, 3)).toBe('123.45');
    expect(formatDecimal(-5n, 2)).toBe('-0.05');
  });

  it('rejects numbers and excess precision', () => {
    expect(moneySchema.safeParse(1.25).success).toBe(false);
    expect(moneySchema.safeParse('1.251').success).toBe(false);
  });

  it('rounds halves away from zero', () => {
    expect(roundHalfAwayFromZero(105n, 10n)).toBe(11n);
    expect(roundHalfAwayFromZero(-105n, 10n)).toBe(-11n);
  });
});
