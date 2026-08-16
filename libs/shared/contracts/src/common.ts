import { z } from 'zod';
import { moneySchema, taxRateSchema } from './decimal.js';

export const uuidSchema = z.uuid();
export const isoDateSchema = z.iso.date();
export const currencySchema = z.string().regex(/^[A-Z]{3}$/).default('EGP');
export const pageQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export const paginationMetaSchema = z.object({ page: z.number().int().positive(), pageSize: z.number().int().positive(), total: z.number().int().nonnegative() });
export const operationKeySchema = z.string().trim().min(16).max(128);
export const documentNumberSchema = z.string().trim().min(1).max(60);
export const apiErrorSchema = z.object({ error: z.object({ code: z.string().min(1), message: z.string().min(1), details: z.unknown().optional(), requestId: z.string().optional() }) });
export const actionResultSchema = z.object({ id: uuidSchema, status: z.string().min(1), operationKey: operationKeySchema.optional() });
export const partyReferenceSchema = z.object({ partyType: z.enum(['customer', 'supplier']), partyId: uuidSchema });
export const moneyValueSchema = z.object({ amount: moneySchema, currency: currencySchema });
export const documentReferenceSchema = z.object({ documentType: z.string().min(1).max(60), documentId: uuidSchema, documentNumber: documentNumberSchema });
export const dateRangeSchema = z.object({ from: isoDateSchema, to: isoDateSchema }).refine((value) => value.from <= value.to, { message: 'from must be on or before to' });
export const documentActionSchema = z.object({ action: z.enum(['submit', 'approve', 'reject', 'cancel', 'close']), reason: z.string().max(500).optional() });
export const unitInputSchema = z.object({ code: z.string().min(1).max(30), name: z.string().min(1).max(100), nameAr: z.string().max(100).default(''), decimalPlaces: z.number().int().min(0).max(6).default(3), isActive: z.boolean().default(true) });
export const taxRuleInputSchema = z.object({ code: z.string().min(1).max(30), name: z.string().min(1).max(100), rate: taxRateSchema, isActive: z.boolean().default(true) });
export const ledgerAccountInputSchema = z.object({ code: z.string().min(1).max(30), name: z.string().min(1).max(160), nameAr: z.string().max(160).default(''), accountType: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']), systemRole: z.enum(['inventory', 'grni']).optional(), allowManualPosting: z.boolean().default(false), isActive: z.boolean().default(true) });
export const journalPostingSchema = z.object({ businessDate: isoDateSchema, description: z.string().min(1).max(500), sourceType: z.string().min(1).max(60), sourceId: uuidSchema, postingType: z.string().min(1).max(60), lines: z.array(z.object({ accountRole: z.string().min(1), debit: moneySchema, credit: moneySchema })).min(2) });

export type UnitInput = z.infer<typeof unitInputSchema>;
export type TaxRuleInput = z.infer<typeof taxRuleInputSchema>;
export type LedgerAccountInput = z.infer<typeof ledgerAccountInputSchema>;
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
export type ActionResult = z.infer<typeof actionResultSchema>;
export type MoneyValue = z.infer<typeof moneyValueSchema>;
export type DocumentReference = z.infer<typeof documentReferenceSchema>;
