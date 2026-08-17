import { z } from 'zod';

export const productInputSchema = z.object({
  sku: z.string().trim().min(1).max(60),
  barcode: z.string().trim().max(80).optional(),
  name: z.string().trim().min(2).max(180),
  nameAr: z.string().trim().max(180).default(''),
  categoryId: z.uuid().optional(),
  brand: z.string().trim().max(100).optional(),
  unit: z.string().trim().min(1).max(30).default('piece'),
  type: z.enum(['product', 'service', 'bundle']).default('product'),
  costPrice: z.number().nonnegative(),
  sellingPrice: z.number().nonnegative(),
  taxRate: z.number().min(0).max(100).default(14),
  minStockLevel: z.number().nonnegative().default(0),
  reorderLevel: z.number().nonnegative().default(0),
  isActive: z.boolean().default(true),
});

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  nameAr: z.string().trim().max(120).default(''),
  type: z.enum(['product', 'expense']).default('product'),
  isActive: z.boolean().default(true),
});

export const brandInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  nameAr: z.string().trim().max(120).default(''),
  isActive: z.boolean().default(true),
});

export const commerceProductStatusSchema = z.enum(['draft', 'active', 'archived']);
export const commerceProductFieldsSchema = productInputSchema.extend({
  status: commerceProductStatusSchema.default('active'),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180).optional(),
  description: z.string().max(10000).default(''),
  descriptionAr: z.string().max(10000).default(''),
  compareAtPrice: z.number().nonnegative().nullable().optional(),
  storefrontVisible: z.boolean().default(true),
  publishedAt: z.iso.datetime().nullable().optional(),
  seoTitle: z.string().max(180).nullable().optional(),
  seoDescription: z.string().max(500).nullable().optional(),
});
export const commerceProductPatchSchema = commerceProductFieldsSchema.partial();
export const commerceProductInputSchema = commerceProductFieldsSchema.superRefine((product, context) => {
  if (product.sellingPrice < product.costPrice) {
    context.addIssue({ code: 'custom', path: ['sellingPrice'], message: 'Selling price must not be below cost price' });
  }
  if (product.type === 'service' && (product.minStockLevel > 0 || product.reorderLevel > 0)) {
    context.addIssue({ code: 'custom', path: ['minStockLevel'], message: 'Services cannot have stock thresholds' });
  }
});

export const commerceProductQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(100).default(''),
  status: commerceProductStatusSchema.optional(),
  categoryId: z.uuid().optional(),
});

export interface CommerceProduct {
  id: string;
  sku: string;
  barcode?: string | null;
  name: string;
  nameAr: string;
  categoryId?: string | null;
  categoryName?: string | null;
  brand?: string | null;
  unit: string;
  type: 'product' | 'service' | 'bundle';
  costPrice: number;
  sellingPrice: number;
  taxRate: number;
  minStockLevel: number;
  reorderLevel: number;
  totalStock: number;
  status: z.infer<typeof commerceProductStatusSchema>;
  slug: string;
  description: string;
  descriptionAr: string;
  compareAtPrice?: number | null;
  storefrontVisible: boolean;
  publishedAt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ProductInput = z.infer<typeof productInputSchema>;
export type CategoryInput = z.infer<typeof categoryInputSchema>;
export type BrandInput = z.infer<typeof brandInputSchema>;
export type CommerceProductInput = z.infer<typeof commerceProductInputSchema>;
export type CommerceProductQuery = z.infer<typeof commerceProductQuerySchema>;
