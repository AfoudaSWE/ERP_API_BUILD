import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

let input = '';
for await (const chunk of process.stdin) input += chunk;
const rows = JSON.parse(input);
if (!Array.isArray(rows) || !rows.length) throw new Error('No workbook product rows received');

const normalized = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');
const slugify = (value) => normalized(value).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 72) || 'product';
const number = (value) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
const attributeObject = (values) => Object.fromEntries((values || []).map((entry) => {
  const [key, ...rest] = normalized(entry).split(':');
  return [key || 'Option', rest.join(':').trim() || normalized(entry)];
}));

const products = new Map();
for (const row of rows) {
  const name = normalized(row.name);
  if (!name) continue;
  const key = `${name.toLocaleLowerCase()}|${normalized(row.category).toLocaleLowerCase()}`;
  if (!products.has(key)) products.set(key, { name, category: normalized(row.category), rows: [] });
  products.get(key).rows.push({ ...row, name, attributes: row.attributes || [] });
}
if (!products.size) throw new Error('Workbook did not contain named products');

const client = new Client({ connectionString: databaseUrl });
await client.connect();
await client.query('SET search_path TO erp,public');

try {
  await client.query('BEGIN');
  const store = (await client.query(`SELECT c.id,c.tax_rate FROM companies c JOIN storefront_settings s ON s.company_id=c.id WHERE s.is_default=true LIMIT 1 FOR UPDATE`)).rows[0];
  if (!store) throw new Error('No default storefront company found');

  const oldProducts = (await client.query(`SELECT * FROM products WHERE company_id=$1 ORDER BY created_at,id`, [store.id])).rows;
  const oldIds = oldProducts.map((item) => item.id);
  const backup = { createdAt: new Date().toISOString(), companyId: store.id, products: oldProducts };
  for (const table of ['product_variants', 'product_media', 'inventory_balances', 'stock_movements']) {
    backup[table] = oldIds.length ? (await client.query(`SELECT * FROM ${table} WHERE company_id=$1 AND product_id=ANY($2::uuid[])`, [store.id, oldIds])).rows : [];
  }
  await mkdir('.local-backups', { recursive: true });
  const backupPath = `.local-backups/storefront-products-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  await writeFile(backupPath, JSON.stringify(backup, null, 2), 'utf8');

  if (oldIds.length) {
    await client.query(`DELETE FROM storefront_cart_items WHERE product_id=ANY($1::uuid[])`, [oldIds]);
    await client.query(`UPDATE products SET is_active=false,storefront_visible=false,commerce_status='archived',updated_at=now() WHERE company_id=$1`, [store.id]);
  }

  let category = (await client.query(`SELECT id FROM categories WHERE company_id=$1 AND lower(name)=lower('Mobiles') LIMIT 1`, [store.id])).rows[0];
  if (!category) category = (await client.query(`INSERT INTO categories(company_id,name,name_ar,type,is_active,slug) VALUES($1,'Mobiles','هواتف محمولة','product',true,$2) RETURNING id`, [store.id, `mobiles-${randomUUID().slice(0, 8)}`])).rows[0];

  const usedSkus = new Set((await client.query(`SELECT sku FROM products WHERE company_id=$1 UNION SELECT sku FROM product_variants WHERE company_id=$1`, [store.id])).rows.map((item) => item.sku.toLocaleLowerCase()));
  const usedSlugs = new Set((await client.query(`SELECT slug FROM products WHERE company_id=$1`, [store.id])).rows.map((item) => item.slug));
  const uniqueSku = (preferred, fallback) => {
    let base = normalized(preferred || fallback).replace(/\s+/g, '-').slice(0, 90) || `MLK-${randomUUID().slice(0, 8)}`;
    let candidate = base; let suffix = 2;
    while (usedSkus.has(candidate.toLocaleLowerCase())) candidate = `${base.slice(0, 84)}-${suffix++}`;
    usedSkus.add(candidate.toLocaleLowerCase()); return candidate;
  };
  const uniqueSlug = (name) => {
    const base = slugify(name); let candidate = base; let suffix = 2;
    while (usedSlugs.has(candidate)) candidate = `${base.slice(0, 66)}-${suffix++}`;
    usedSlugs.add(candidate); return candidate;
  };

  let productCount = 0; let variantCount = 0;
  for (const product of products.values()) {
    const priced = product.rows.find((row) => number(row.sale) > 0);
    const costed = product.rows.find((row) => number(row.cost) > 0);
    const firstBarcode = product.rows.find((row) => normalized(row.barcode))?.barcode;
    const sku = uniqueSku(firstBarcode, `MLK-${String(productCount + 1).padStart(5, '0')}`);
    const sellingPrice = number(priced?.sale);
    const costPrice = number(costed?.cost);
    const totalStock = product.rows.reduce((sum, row) => sum + number(row.stock), 0);
    const productId = randomUUID();
    await client.query(`INSERT INTO products(id,company_id,category_id,sku,barcode,name,name_ar,brand,unit,type,cost_price,selling_price,tax_rate,min_stock_level,reorder_level,total_stock,is_active,commerce_status,slug,description,description_ar,storefront_visible,published_at,seo_title,seo_description) VALUES($1,$2,$3,$4,$5,$6,'',NULL,'piece','product',$7,$8,$9,0,0,$10,true,'active',$11,'','',true,now(),$6,NULL)`, [productId, store.id, category.id, sku, normalized(firstBarcode) || null, product.name, costPrice, sellingPrice, number(store.tax_rate), totalStock, uniqueSlug(product.name)]);
    productCount += 1;

    for (let index = 0; index < product.rows.length; index += 1) {
      const variant = product.rows[index];
      const attributes = attributeObject(variant.attributes);
      const optionName = Object.values(attributes).join(' / ') || `Option ${index + 1}`;
      await client.query(`INSERT INTO product_variants(id,company_id,product_id,sku,name,attributes,selling_price,compare_at_price,stock_quantity,image_url,is_active) VALUES($1,$2,$3,$4,$5,$6,$7,NULL,$8,NULL,true)`, [randomUUID(), store.id, productId, uniqueSku(variant.barcode, `${sku}-V${String(index + 1).padStart(3, '0')}`), optionName, attributes, number(variant.sale) || sellingPrice, number(variant.stock)]);
      variantCount += 1;
    }
  }

  await client.query('COMMIT');
  console.log(JSON.stringify({ backupPath, archivedProducts: oldProducts.length, importedProducts: productCount, importedVariants: variantCount, clearedCartItemsForArchivedProducts: oldIds.length ? true : false }, null, 2));
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}
