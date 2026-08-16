import { formatCurrency, formatNumber } from '@/lib/utils';

export type StatCardFormat = 'auto' | 'currency' | 'decimal' | 'integer' | 'raw';
export const STAT_CARD_LAYOUT_CLASS = 'stat-card group flex h-full min-h-44 flex-col justify-between overflow-hidden';

export function formatStatCardValue(input: { value: unknown; format?: StatCardFormat; locale?: string; currency?: string; fallback?: string }) {
  const { value, format = 'auto', locale = 'en-EG', currency = 'EGP', fallback = '—' } = input;
  if (format === 'raw') return value === null || value === undefined || value === '' ? fallback : String(value);
  const numericValue = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : Number.NaN;
  if (!Number.isFinite(numericValue)) return fallback;
  if (format === 'currency') return formatCurrency(numericValue, currency, locale);
  if (format === 'decimal' || (format === 'auto' && !Number.isInteger(numericValue))) return formatNumber(numericValue, locale, 2);
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(numericValue);
}
