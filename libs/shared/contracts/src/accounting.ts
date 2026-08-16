import{z}from'zod';import{isoDateSchema,uuidSchema}from'./common.js';import{moneySchema}from'./decimal.js';
export const manualJournalInputSchema=z.object({businessDate:isoDateSchema,description:z.string().min(3).max(500),lines:z.array(z.object({accountId:uuidSchema,description:z.string().max(300).optional(),debit:moneySchema.default('0'),credit:moneySchema.default('0')})).min(2)});
export const journalActionSchema=z.object({action:z.enum(['post','reverse']),reason:z.string().min(3).max(500).optional()});
export const accountingPeriodInputSchema=z.object({startDate:isoDateSchema,endDate:isoDateSchema,note:z.string().max(500).optional()}).refine(v=>v.startDate<=v.endDate,'Invalid period range');
export const periodActionSchema=z.object({action:z.enum(['close','reopen']),reason:z.string().min(3).max(500)});
export type ManualJournalInput=z.infer<typeof manualJournalInputSchema>;
