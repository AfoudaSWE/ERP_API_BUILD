import { z } from 'zod';

export * from './common.js';
export * from './decimal.js';
export * from './inventory.js';
export * from './purchasing.js';
export * from './sales.js';
export * from './accounting.js';
export * from './finance.js';
export {
  commerceProductInputSchema,
  commerceProductQuerySchema,
  productInputSchema,
  categoryInputSchema,
  type CommerceProduct,
  type CommerceProductInput,
  type CommerceProductQuery,
  type ProductInput,
  type CategoryInput,
} from '@erp/commerce-catalog-contracts';

export interface ApiResponse<T> {
  data: T;
  meta?: { page?: number; pageSize?: number; total?: number };
}

export interface ApiError {
  error: { code: string; message: string; details?: unknown };
}

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  tenantId: z.uuid().optional(),
});

export const signupSchema = z.object({
  companyName: z.string().trim().min(2).max(120),
  companyNameAr: z.string().trim().max(120).default(''),
  name: z.string().trim().min(2).max(120),
  email: z.email(),
  password: z.string().min(8).max(200),
});

export const customerInputSchema = z.object({
  code: z.string().min(1).max(30),
  name: z.string().min(2).max(160),
  nameAr: z.string().max(160).default(''),
  type: z.enum(['retail', 'wholesale', 'distributor', 'corporate']).default('retail'),
  phone: z.string().max(30).optional(),
  email: z.email().optional(),
  address: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  creditLimit: z.number().nonnegative().default(0),
  paymentTerms: z.number().int().nonnegative().default(0),
  tags: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

export const supplierInputSchema = z.object({
  code: z.string().min(1).max(30),
  name: z.string().min(2).max(160),
  nameAr: z.string().max(160).default(''),
  type: z.enum(['supplier', 'manufacturer', 'distributor']).default('supplier'),
  phone: z.string().max(30).optional(),
  email: z.email().optional(),
  address: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  paymentTerms: z.number().int().nonnegative().default(0),
  leadTime: z.number().int().nonnegative().default(0),
  rating: z.number().min(0).max(5).default(0),
  tags: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});


export const leadInputSchema = z.object({
  name: z.string().min(2).max(160),
  nameAr: z.string().max(160).default(''),
  company: z.string().max(160).optional(),
  phone: z.string().max(30).optional(),
  email: z.email().optional(),
  source: z.enum(['website', 'referral', 'social_media', 'cold_call', 'exhibition', 'other']).default('other'),
  status: z.enum(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']).default('new'),
  value: z.number().nonnegative().default(0),
  probability: z.number().int().min(0).max(100).default(0),
  expectedCloseDate: z.iso.date().optional(),
  notes: z.string().max(4000).optional(),
  tags: z.array(z.string().max(50)).max(20).default([]),
});

export const salesInvoiceInputSchema = z.object({
  customerId: z.uuid().optional(),
  customerName: z.string().max(160).optional(),
  invoiceDate: z.iso.date(),
  dueDate: z.iso.date().optional(),
  discountAmount: z.number().nonnegative().default(0),
  paidAmount: z.number().nonnegative().default(0),
  items: z.array(z.object({
    productId: z.uuid(),
    description: z.string().min(1),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
    taxRate: z.number().min(0).max(100).default(14),
  })).min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type CustomerInput = z.infer<typeof customerInputSchema>;
export type SupplierInput = z.infer<typeof supplierInputSchema>;
export type LeadInput = z.infer<typeof leadInputSchema>;
export type SalesInvoiceInput = z.infer<typeof salesInvoiceInputSchema>;
