import { categoryInputSchema, productInputSchema } from '@erp/contracts';
import { createCrudRouter } from '../shared/crud-router.js';

export const productsRouter = createCrudRouter({
  table: 'products',
  permissionBase: 'products',
  schema: productInputSchema,
  searchColumns: ['sku', 'name', 'name_ar', 'barcode'],
  columns: {
    sku: 'sku', barcode: 'barcode', name: 'name', nameAr: 'name_ar', categoryId: 'category_id',
    brand: 'brand', unit: 'unit', type: 'type', costPrice: 'cost_price', sellingPrice: 'selling_price',
    taxRate: 'tax_rate', minStockLevel: 'min_stock_level', reorderLevel: 'reorder_level', isActive: 'is_active',
  },
});

export const categoriesRouter = createCrudRouter({
  table: 'categories',
  permissionBase: 'products',
  schema: categoryInputSchema,
  searchColumns: ['name', 'name_ar'],
  columns: { name: 'name', nameAr: 'name_ar', type: 'type', isActive: 'is_active' },
});
