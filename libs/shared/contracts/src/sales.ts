import { z } from 'zod';
import { currencySchema, isoDateSchema, uuidSchema } from './common.js';
import { moneySchema, quantitySchema, taxRateSchema } from './decimal.js';

export const salesLineInputSchema = z.object({ productId: uuidSchema, description: z.string().min(1).max(300), quantity: quantitySchema, unitPrice: moneySchema, taxRate: taxRateSchema.default('14') });
export const salesPostingInputSchema = z.object({ customerId: uuidSchema.optional(), customerName: z.string().max(160).optional(), warehouseId: uuidSchema.optional(), invoiceDate: isoDateSchema, dueDate: isoDateSchema.optional(), currency: currencySchema, discountAmount: moneySchema.default('0'), initialPayment: moneySchema.default('0'), paymentMethod: z.enum(['cash', 'card', 'bank_transfer', 'wallet']).default('cash'), source: z.enum(['erp', 'pos']).default('erp'), items: z.array(salesLineInputSchema).min(1) });
export const paymentInputSchema = z.object({ amount: moneySchema.refine((value) => Number(value) > 0, 'Amount must be positive'), businessDate: isoDateSchema, method: z.enum(['cash', 'card', 'bank_transfer', 'wallet']), reference: z.string().max(120).optional() });
export const salesReturnInputSchema = z.object({ businessDate: isoDateSchema, reason: z.string().min(3).max(500), items: z.array(z.object({ invoiceItemId: uuidSchema, quantity: quantitySchema })).min(1) });

const templateLineSchema = z.object({ productId: uuidSchema.optional(), description: z.string().min(1).max(300), quantity: quantitySchema, unitPrice: moneySchema, taxRate: taxRateSchema.default('14') });

export const salesQuoteInputSchema = z.object({
  customerId: uuidSchema.optional(), customerName: z.string().max(160).optional(), quoteDate: isoDateSchema, validUntil: isoDateSchema.optional(),
  discountAmount: moneySchema.default('0'), notes: z.string().max(1000).default(''), items: z.array(templateLineSchema).min(1),
});
export const salesQuoteActionSchema = z.object({ action: z.enum(['send', 'accept', 'reject']) });

export const recurringInvoiceTemplateInputSchema = z.object({
  name: z.string().min(2).max(160), customerId: uuidSchema.optional(), warehouseId: uuidSchema.optional(),
  frequency: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']), nextRunDate: isoDateSchema, notes: z.string().max(1000).default(''),
  items: z.array(templateLineSchema).min(1),
});
export const recurringInvoiceActionSchema = z.object({ action: z.enum(['pause', 'resume', 'cancel']) });

export const invoiceTemplateInputSchema = z.object({
  name: z.string().min(2).max(160), notes: z.string().max(1000).default(''), isActive: z.boolean().default(true),
  items: z.array(templateLineSchema).min(1),
});
export const createInvoiceFromTemplateSchema = z.object({ customerId: uuidSchema.optional(), warehouseId: uuidSchema.optional(), invoiceDate: isoDateSchema, paymentMethod: z.enum(['cash', 'card', 'bank_transfer', 'wallet']).default('cash') });

export const deliveryNoteInputSchema = z.object({
  invoiceId: uuidSchema.optional(), warehouseId: uuidSchema.optional(), deliveryDate: isoDateSchema, recipientName: z.string().max(160).default(''),
  notes: z.string().max(1000).default(''), items: z.array(z.object({ productId: uuidSchema.optional(), description: z.string().min(1).max(300), quantity: quantitySchema })).min(1),
});
export const deliveryNoteActionSchema = z.object({ action: z.enum(['deliver', 'cancel']) });

export type SalesPostingInput = z.infer<typeof salesPostingInputSchema>;
export type PaymentInput = z.infer<typeof paymentInputSchema>;
export type SalesReturnInput = z.infer<typeof salesReturnInputSchema>;
export type SalesQuoteInput = z.infer<typeof salesQuoteInputSchema>;
export type RecurringInvoiceTemplateInput = z.infer<typeof recurringInvoiceTemplateInputSchema>;
export type InvoiceTemplateInput = z.infer<typeof invoiceTemplateInputSchema>;
export type CreateInvoiceFromTemplateInput = z.infer<typeof createInvoiceFromTemplateSchema>;
export type DeliveryNoteInput = z.infer<typeof deliveryNoteInputSchema>;
