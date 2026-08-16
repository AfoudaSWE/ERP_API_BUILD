import { pool, transaction } from './client.js';

const businessTables = [
  'ecommerce_payments',
  'ecommerce_order_items',
  'ecommerce_orders',
  'storefront_wishlist_items',
  'customer_addresses',
  'storefront_cart_items',
  'storefront_carts',
  'product_reviews',
  'product_variants',
  'product_media',
  'storefront_navigation_items',
  'cms_homepage_sections',
  'storefront_settings',
  'shipping_methods',
  'payment_methods',
  'job_executions',
  'leads',
  'reconciliation_lines',
  'reconciliations',
  'financial_movements',
  'financial_transfers',
  'payment_allocations',
  'customer_payments',
  'sales_return_items',
  'sales_returns',
  'journal_lines',
  'supplier_accruals',
  'journal_entries',
  'accounting_periods',
  'stock_movements',
  'goods_receipt_items',
  'goods_receipts',
  'purchase_order_items',
  'purchase_orders',
  'inventory_balances',
  'warehouses',
  'financial_accounts',
  'idempotency_records',
  'document_sequences',
  'audit_events',
  'ledger_accounts',
  'tax_rules',
  'units',
  'sales_invoice_items',
  'sales_invoices',
  'expenses',
  'products',
  'categories',
  'customers',
  'suppliers',
] as const;

export async function resetBusinessData() {
  const preservedBefore = await pool.query<{ users: string; permissions: string; role_permissions: string }>(
    `SELECT
      (SELECT count(*) FROM users)::text AS users,
      (SELECT count(*) FROM permissions)::text AS permissions,
      (SELECT count(*) FROM role_permissions)::text AS role_permissions`,
  );

  await transaction(async (client) => {
    await client.query(`TRUNCATE TABLE ${businessTables.join(', ')} RESTART IDENTITY`);
  });

  const remaining = await pool.query<{ table_name: string; row_count: string }>(
    `SELECT table_name, (xpath('/row/count/text()', query_to_xml(format('SELECT count(*) AS count FROM %I', table_name), false, true, '')))[1]::text AS row_count
     FROM unnest($1::text[]) AS table_name`,
    [businessTables],
  );

  const preserved = preservedBefore.rows[0];
  console.log(`Business data cleared from schema. Preserved ${preserved.users} users, ${preserved.permissions} permissions, and ${preserved.role_permissions} role assignments.`);
  for (const row of remaining.rows) console.log(`${row.table_name}: ${row.row_count}`);
}

if (require.main === module) {
  resetBusinessData().then(() => pool.end()).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
