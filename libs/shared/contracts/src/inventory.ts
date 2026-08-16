import { z } from 'zod';
import { isoDateSchema, uuidSchema } from './common.js';
import { decimalString } from './decimal.js';

export const inventoryAvailabilityQuerySchema = z.object({ warehouseId: uuidSchema.optional(), productId: uuidSchema.optional(), page: z.coerce.number().int().positive().default(1), pageSize: z.coerce.number().int().min(1).max(100).default(25) });
export const inventoryAdjustmentSchema = z.object({ warehouseId: uuidSchema, productId: uuidSchema, quantity: decimalString({ scale: 3 }).refine((value) => !/^[-+]?0(?:\.0+)?$/.test(value), 'Must not be zero'), businessDate: isoDateSchema, reason: z.string().min(3).max(500) });
