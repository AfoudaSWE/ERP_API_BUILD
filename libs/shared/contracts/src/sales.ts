import { z } from 'zod';
import { currencySchema, isoDateSchema, uuidSchema } from './common.js';
import { moneySchema, quantitySchema, taxRateSchema } from './decimal.js';

export const salesLineInputSchema = z.object({ productId: uuidSchema, description: z.string().min(1).max(300), quantity: quantitySchema, unitPrice: moneySchema, taxRate: taxRateSchema.default('14') });
export const salesPostingInputSchema = z.object({ customerId: uuidSchema.optional(), customerName: z.string().max(160).optional(), warehouseId: uuidSchema.optional(), invoiceDate: isoDateSchema, dueDate: isoDateSchema.optional(), currency: currencySchema, discountAmount: moneySchema.default('0'), initialPayment: moneySchema.default('0'), paymentMethod: z.enum(['cash', 'card', 'bank_transfer', 'wallet']).default('cash'), items: z.array(salesLineInputSchema).min(1) });
export const paymentInputSchema = z.object({ amount: moneySchema.refine((value) => Number(value) > 0, 'Amount must be positive'), businessDate: isoDateSchema, method: z.enum(['cash', 'card', 'bank_transfer', 'wallet']), reference: z.string().max(120).optional() });
export const salesReturnInputSchema = z.object({ businessDate: isoDateSchema, reason: z.string().min(3).max(500), items: z.array(z.object({ invoiceItemId: uuidSchema, quantity: quantitySchema })).min(1) });

export type SalesPostingInput = z.infer<typeof salesPostingInputSchema>;
export type PaymentInput = z.infer<typeof paymentInputSchema>;
export type SalesReturnInput = z.infer<typeof salesReturnInputSchema>;
