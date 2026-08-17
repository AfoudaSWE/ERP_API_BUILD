import { z } from 'zod';
import { currencySchema, isoDateSchema, uuidSchema } from './common.js';
import { moneySchema, quantitySchema, taxRateSchema } from './decimal.js';

export const warehouseInputSchema = z.object({ code: z.string().min(1).max(30), name: z.string().min(1).max(120), nameAr: z.string().max(120).default(''), warehouseType: z.enum(['main', 'transit', 'returns', 'damaged']).default('main'), isActive: z.boolean().default(true) });
export const purchaseOrderInputSchema = z.object({
  supplierId: uuidSchema, warehouseId: uuidSchema, orderDate: isoDateSchema, expectedDate: isoDateSchema.optional(), currency: currencySchema,
  discountAmount: moneySchema.default('0'), notes: z.string().max(1000).optional(),
  items: z.array(z.object({ productId: uuidSchema, description: z.string().min(1).max(300), quantity: quantitySchema, unit: z.string().min(1).max(30).default('piece'), unitPrice: moneySchema, taxRate: taxRateSchema.default('0') })).min(1),
});
export const purchaseActionSchema = z.object({ action: z.enum(['submit', 'approve', 'reject', 'cancel', 'close']), reason: z.string().max(500).optional() });
export const goodsReceiptInputSchema = z.object({ receiptDate: isoDateSchema, supplierReference: z.string().max(100).optional(), items: z.array(z.object({ purchaseOrderItemId: uuidSchema, acceptedQuantity: quantitySchema })).min(1) }).refine((value) => new Set(value.items.map((item) => item.purchaseOrderItemId)).size === value.items.length, { message: 'Receipt items must be unique', path: ['items'] });

export const purchaseReturnInputSchema = z.object({
  supplierId: uuidSchema, warehouseId: uuidSchema, businessDate: isoDateSchema, reason: z.string().min(3).max(500),
  items: z.array(z.object({ productId: uuidSchema, quantity: quantitySchema, unitCost: moneySchema, taxRate: taxRateSchema.default('0') })).min(1),
});

export type WarehouseInput = z.infer<typeof warehouseInputSchema>;
export type PurchaseOrderInput = z.infer<typeof purchaseOrderInputSchema>;
export type GoodsReceiptInput = z.infer<typeof goodsReceiptInputSchema>;
export type PurchaseReturnInput = z.infer<typeof purchaseReturnInputSchema>;
