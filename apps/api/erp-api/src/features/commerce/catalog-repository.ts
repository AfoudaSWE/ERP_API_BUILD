import type { CommerceProduct, CommerceProductInput, CommerceProductQuery } from '@erp/commerce-catalog-contracts';
import type { Page, ProductRepository } from '@erp/commerce-catalog-application';
import { query } from '../../db/client.js';
import { serializeRow, serializeRows } from '../../lib/rows.js';
import { randomUUID } from 'node:crypto';

const productColumns: Record<keyof CommerceProductInput, string> = {
  sku: 'sku', barcode: 'barcode', name: 'name', nameAr: 'name_ar', categoryId: 'category_id',
  brand: 'brand', unit: 'unit', type: 'type', costPrice: 'cost_price', sellingPrice: 'selling_price',
  taxRate: 'tax_rate', minStockLevel: 'min_stock_level', reorderLevel: 'reorder_level',
  isActive: 'is_active', status: 'commerce_status',
  slug:'slug',description:'description',descriptionAr:'description_ar',compareAtPrice:'compare_at_price',storefrontVisible:'storefront_visible',publishedAt:'published_at',seoTitle:'seo_title',seoDescription:'seo_description',
};

const select = `SELECT p.*, p.commerce_status status, c.name category_name FROM products p
  LEFT JOIN categories c ON c.id=p.category_id AND c.company_id=p.company_id`;

export class PgProductRepository implements ProductRepository {
  async list(companyId: string, input: CommerceProductQuery): Promise<Page<CommerceProduct>> {
    const values: unknown[] = [companyId];
    const filters = ['p.company_id=$1'];
    if (input.search) {
      values.push(`%${input.search}%`);
      filters.push(`(p.sku ILIKE $${values.length} OR p.name ILIKE $${values.length} OR p.name_ar ILIKE $${values.length} OR p.barcode ILIKE $${values.length})`);
    }
    if (input.status) {
      values.push(input.status);
      filters.push(`p.commerce_status=$${values.length}`);
    }
    if (input.categoryId) {
      values.push(input.categoryId);
      filters.push(`p.category_id=$${values.length}`);
    }
    const where = filters.join(' AND ');
    const total = await query<{ count: string }>(`SELECT count(*) FROM products p WHERE ${where}`, values);
    values.push(input.pageSize, (input.page - 1) * input.pageSize);
    const result = await query(`${select} WHERE ${where} ORDER BY p.updated_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
    return { items: serializeRows<CommerceProduct>(result.rows), page: input.page, pageSize: input.pageSize, total: Number(total.rows[0].count) };
  }

  async findById(companyId: string, id: string) {
    const result = await query(`${select} WHERE p.id=$1 AND p.company_id=$2`, [id, companyId]);
    return result.rows[0] ? serializeRow<CommerceProduct>(result.rows[0]) : null;
  }

  async create(companyId: string, input: CommerceProductInput) {
    const withSlug={...input,slug:input.slug??`${input.sku.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'product'}-${randomUUID().slice(0,8)}`};
    const entries = Object.entries(withSlug) as [keyof CommerceProductInput, unknown][];
    const columns = ['company_id', ...entries.map(([key]) => productColumns[key])];
    const values = [companyId, ...entries.map(([, value]) => value)];
    const result = await query(`INSERT INTO products (${columns.join(',')}) VALUES (${values.map((_, index) => `$${index + 1}`).join(',')}) RETURNING id`, values);
    return (await this.findById(companyId, String(result.rows[0].id)))!;
  }

  async update(companyId: string, id: string, input: Partial<CommerceProductInput>) {
    const entries = Object.entries(input) as [keyof CommerceProductInput, unknown][];
    if (!entries.length) return this.findById(companyId, id);
    const values = entries.map(([, value]) => value);
    values.push(id, companyId);
    const set = entries.map(([key], index) => `${productColumns[key]}=$${index + 1}`);
    const result = await query(`UPDATE products SET ${set.join(',')},updated_at=now() WHERE id=$${values.length - 1} AND company_id=$${values.length} RETURNING id`, values);
    return result.rows[0] ? this.findById(companyId, id) : null;
  }
}
