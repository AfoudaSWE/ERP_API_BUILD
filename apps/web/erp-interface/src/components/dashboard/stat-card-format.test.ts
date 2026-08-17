import { describe, expect, it } from 'vitest';
import { formatStatCardValue, STAT_CARD_LAYOUT_CLASS } from './stat-card-format';

describe('StatCard presentation formatting', () => {
  it.each([[12.345, '12.35'], [0, '0.00'], [-2.5, '-2.50']])('formats decimal %s with exactly two places', (value, expected) => {
    expect(formatStatCardValue({ value, format: 'decimal', locale: 'en-US' })).toBe(expected);
  });
  it.each([null, undefined, Number.NaN, 'invalid'])('safely falls back for %s', (value) => {
    expect(formatStatCardValue({ value, format: 'decimal', locale: 'en-US' })).toBe('—');
  });
  it('keeps item counters as integers and preserves raw units', () => {
    expect(formatStatCardValue({ value: 12, format: 'integer', locale: 'en-US' })).toBe('12');
    expect(formatStatCardValue({ value: '12 items', format: 'raw' })).toBe('12 items');
  });
  it('uses a shared compact equal-height card contract', () => {
    expect(STAT_CARD_LAYOUT_CLASS).toContain('h-full');
    expect(STAT_CARD_LAYOUT_CLASS).toContain('min-h-32');
    expect(STAT_CARD_LAYOUT_CLASS).toContain('overflow-hidden');
  });
});
