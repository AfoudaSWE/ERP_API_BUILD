import { z } from 'zod';

const decimalPattern = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;

export function decimalString(options: { scale: number; nonnegative?: boolean; positive?: boolean }) {
  return z.string().regex(decimalPattern, 'Must be a decimal string').superRefine((value, context) => {
    const [, fraction = ''] = value.split('.');
    if (fraction.length > options.scale) {
      context.addIssue({ code: 'custom', message: `Maximum ${options.scale} decimal places` });
      return;
    }
    const scaled = parseDecimal(value, options.scale);
    if (options.positive && scaled <= 0n) context.addIssue({ code: 'custom', message: 'Must be greater than zero' });
    if (options.nonnegative && scaled < 0n) context.addIssue({ code: 'custom', message: 'Must be zero or greater' });
  });
}

export const moneySchema = decimalString({ scale: 2, nonnegative: true });
export const signedMoneySchema = decimalString({ scale: 2 });
export const quantitySchema = decimalString({ scale: 3, positive: true });
export const nonnegativeQuantitySchema = decimalString({ scale: 3, nonnegative: true });
export const taxRateSchema = decimalString({ scale: 4, nonnegative: true }).refine((value) => parseDecimal(value, 4) <= 1_000_000n, 'Must not exceed 100');

export function parseDecimal(value: string, scale: number): bigint {
  if (!decimalPattern.test(value)) throw new Error('Invalid decimal string');
  const negative = value.startsWith('-');
  const unsigned = negative ? value.slice(1) : value;
  const [whole, fraction = ''] = unsigned.split('.');
  if (fraction.length > scale) throw new Error(`Maximum ${scale} decimal places`);
  const result = BigInt(whole) * 10n ** BigInt(scale) + BigInt((fraction + '0'.repeat(scale)).slice(0, scale) || '0');
  return negative ? -result : result;
}

export function formatDecimal(value: bigint, scale: number): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  if (scale === 0) return `${negative ? '-' : ''}${absolute}`;
  const digits = absolute.toString().padStart(scale + 1, '0');
  const whole = digits.slice(0, -scale);
  const fraction = digits.slice(-scale).replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
}

export function roundHalfAwayFromZero(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new Error('Denominator must be positive');
  const negative = numerator < 0n;
  const absolute = negative ? -numerator : numerator;
  const rounded = (absolute + denominator / 2n) / denominator;
  return negative ? -rounded : rounded;
}
