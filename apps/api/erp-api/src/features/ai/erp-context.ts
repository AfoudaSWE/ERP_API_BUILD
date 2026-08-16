import type { QueryResultRow } from 'pg';

export type ContextAuth = { userId: string; companyId: string; permissions: string[]; branchIds?: string[] | null };
export type ContextQuery = <T extends QueryResultRow>(text: string, values?: unknown[]) => Promise<{ rows: T[] }>;

function can(auth: ContextAuth, ...permissions: string[]) {
  return permissions.some((permission) => auth.permissions.includes(permission));
}

function warehouseScope(auth: ContextAuth, column: string, values: unknown[]) {
  if (auth.branchIds === null || auth.branchIds === undefined) return '';
  values.push(auth.branchIds);
  return ` AND ${column} IN (SELECT id FROM warehouses WHERE company_id=$1 AND branch_id=ANY($${values.length}::uuid[]))`;
}

function branchScope(auth: ContextAuth, column: string, values: unknown[]) {
  if (auth.branchIds === null || auth.branchIds === undefined) return '';
  values.push(auth.branchIds);
  return ` AND ${column}=ANY($${values.length}::uuid[])`;
}

export async function buildAuthorizedErpContext(execute: ContextQuery, auth: ContextAuth) {
  const context: Record<string, unknown> = {};
  context.company = (await execute(`SELECT id,name,name_ar,currency,tax_rate,current_date::text AS as_of_date FROM companies WHERE id=$1`, [auth.companyId])).rows[0];

  if (can(auth, 'branches.view', 'branches.read')) {
    const values: unknown[] = [auth.companyId]; const scope = branchScope(auth, 'id', values);
    context.branches = (await execute(`SELECT id,code,name,name_ar,is_active FROM branches WHERE company_id=$1${scope} ORDER BY code`, values)).rows;
  }

  if (can(auth, 'sales.view', 'sales.read')) {
    const values: unknown[] = [auth.companyId]; const scope = warehouseScope(auth, 'i.warehouse_id', values);
    context.sales = {
      totals: (await execute(`SELECT COALESCE(sum(i.total) FILTER(WHERE i.invoice_date=current_date),0)::text today,COALESCE(sum(i.total) FILTER(WHERE date_trunc('month',i.invoice_date)=date_trunc('month',current_date)),0)::text this_month,COALESCE(sum(i.total) FILTER(WHERE date_trunc('month',i.invoice_date)=date_trunc('month',current_date-interval '1 month')),0)::text previous_month,COALESCE(sum(i.paid_amount),0)::text paid,COALESCE(sum(i.remaining_amount),0)::text outstanding,count(*)::text invoice_count FROM sales_invoices i WHERE i.company_id=$1${scope}`, values)).rows[0],
      recentInvoices: (await execute(`SELECT i.invoice_number,i.invoice_date::text,i.due_date::text,i.customer_name,i.status,i.payment_status,i.total::text,i.paid_amount::text,i.remaining_amount::text FROM sales_invoices i WHERE i.company_id=$1${scope} ORDER BY i.invoice_date DESC,i.created_at DESC LIMIT 30`, values)).rows,
      bestSellers: (await execute(`SELECT p.sku,p.name,p.name_ar,sum(ii.quantity)::text quantity,sum(ii.total)::text sales FROM sales_invoice_items ii JOIN sales_invoices i ON i.id=ii.invoice_id LEFT JOIN products p ON p.id=ii.product_id WHERE i.company_id=$1${scope} GROUP BY p.id,p.sku,p.name,p.name_ar ORDER BY sum(ii.total) DESC LIMIT 20`, values)).rows,
    };
  }

  if (can(auth, 'payments.view', 'payments.receive', 'cash.view', 'cash.read')) {
    const values: unknown[] = [auth.companyId]; const scope = warehouseScope(auth, 'i.warehouse_id', values);
    context.payments = (await execute(`SELECT cp.payment_number,cp.business_date::text,cp.amount::text,cp.unallocated_amount::text,cp.method,cp.status FROM customer_payments cp LEFT JOIN payment_allocations pa ON pa.payment_id=cp.id LEFT JOIN sales_invoices i ON i.id=pa.invoice_id WHERE cp.company_id=$1${scope} ORDER BY cp.business_date DESC LIMIT 30`, values)).rows;
  }

  if (can(auth, 'purchases.view', 'purchases.read')) {
    const values: unknown[] = [auth.companyId]; const scope = warehouseScope(auth, 'po.warehouse_id', values);
    context.purchases = {
      totals: (await execute(`SELECT COALESCE(sum(po.total) FILTER(WHERE date_trunc('month',po.order_date)=date_trunc('month',current_date)),0)::text this_month,count(*) FILTER(WHERE po.status IN('draft','submitted','approved','partially_received'))::text open_orders FROM purchase_orders po WHERE po.company_id=$1${scope}`, values)).rows[0],
      recentOrders: (await execute(`SELECT po.order_number,po.order_date::text,po.expected_date::text,po.status,po.total::text,s.name supplier,w.name warehouse FROM purchase_orders po JOIN suppliers s ON s.id=po.supplier_id JOIN warehouses w ON w.id=po.warehouse_id WHERE po.company_id=$1${scope} ORDER BY po.order_date DESC,po.created_at DESC LIMIT 30`, values)).rows,
    };
  }

  if (can(auth, 'inventory.view', 'inventory.read', 'products.view', 'products.read')) {
    const values: unknown[] = [auth.companyId]; const scope = warehouseScope(auth, 'b.warehouse_id', values);
    context.inventory = {
      summary: (await execute(`SELECT count(DISTINCT b.product_id)::text stocked_products,COALESCE(sum(b.on_hand*b.average_cost),0)::text stock_value,count(*) FILTER(WHERE b.available<=p.reorder_level)::text low_stock,count(*) FILTER(WHERE b.available=0)::text out_of_stock FROM inventory_balances b JOIN products p ON p.id=b.product_id WHERE b.company_id=$1${scope}`, values)).rows[0],
      attention: (await execute(`SELECT p.sku,p.name,p.name_ar,w.name warehouse,b.on_hand::text,b.reserved::text,b.available::text,p.reorder_level::text,b.average_cost::text FROM inventory_balances b JOIN products p ON p.id=b.product_id JOIN warehouses w ON w.id=b.warehouse_id WHERE b.company_id=$1 AND b.available<=p.reorder_level${scope} ORDER BY b.available ASC,p.name LIMIT 40`, values)).rows,
      productCatalog: (await execute(`SELECT DISTINCT p.sku,p.barcode,p.name,p.name_ar,p.brand,p.unit,p.cost_price::text,p.selling_price::text,p.tax_rate::text,p.reorder_level::text,p.is_active FROM products p LEFT JOIN inventory_balances b ON b.product_id=p.id AND b.company_id=p.company_id WHERE p.company_id=$1${scope} ORDER BY p.name LIMIT 100`, values)).rows,
    };
  }

  if (can(auth, 'customers.view', 'customers.read')) context.customers = (await execute(`SELECT code,name,name_ar,phone,email,address,city,credit_limit::text,payment_terms,total_sales::text,total_paid::text,balance::text,is_active FROM customers WHERE company_id=$1 ORDER BY balance DESC,total_sales DESC LIMIT 100`, [auth.companyId])).rows;
  if (can(auth, 'suppliers.view', 'suppliers.read')) context.suppliers = (await execute(`SELECT code,name,name_ar,phone,email,address,city,payment_terms,lead_time,total_purchases::text,total_paid::text,balance::text,rating::text,is_active FROM suppliers WHERE company_id=$1 ORDER BY balance DESC,total_purchases DESC LIMIT 100`, [auth.companyId])).rows;

  if (can(auth, 'expenses.view', 'expenses.read')) {
    const values: unknown[] = [auth.companyId]; const scope = branchScope(auth, 'branch_id', values);
    context.expenses = {
      thisMonth: (await execute(`SELECT COALESCE(sum(total),0)::text total,count(*)::text count FROM expenses WHERE company_id=$1 AND date_trunc('month',expense_date)=date_trunc('month',current_date)${scope}`, values)).rows[0],
      recent: (await execute(`SELECT expense_number,expense_date::text,description,amount::text,tax_amount::text,total::text,payment_method,status FROM expenses WHERE company_id=$1${scope} ORDER BY expense_date DESC,created_at DESC LIMIT 30`, values)).rows,
    };
  }

  if (can(auth, 'accounting.view', 'accounting.read')) context.accounting = {
    periods: (await execute(`SELECT start_date::text,end_date::text,status,close_note FROM accounting_periods WHERE company_id=$1 ORDER BY start_date DESC LIMIT 12`, [auth.companyId])).rows,
    recentJournals: (await execute(`SELECT entry_number,business_date::text,description,status,source_type,posting_type FROM journal_entries WHERE company_id=$1 ORDER BY business_date DESC,created_at DESC LIMIT 30`, [auth.companyId])).rows,
  };

  if (can(auth, 'cash.view', 'cash.read')) context.cash = {
    accounts: (await execute(`SELECT name,account_type,currency,balance::text,is_active FROM financial_accounts WHERE company_id=$1 ORDER BY name`, [auth.companyId])).rows,
    recentMovements: (await execute(`SELECT business_date::text,movement_type,amount::text,description,source_type FROM financial_movements WHERE company_id=$1 ORDER BY business_date DESC,created_at DESC LIMIT 30`, [auth.companyId])).rows,
  };

  if (can(auth, 'audit.view', 'audit.read')) context.audit = (await execute(`SELECT created_at::text,action,entity_type,metadata FROM audit_events WHERE company_id=$1 ORDER BY created_at DESC LIMIT 30`, [auth.companyId])).rows;
  if (can(auth, 'roles.read')) context.usersAndRoles = (await execute(`SELECT role,count(*)::text active_users FROM users WHERE company_id=$1 AND is_active=true GROUP BY role ORDER BY role`, [auth.companyId])).rows;
  if (can(auth, 'self_service.view')) context.myProfile = (await execute(`SELECT id,name,email,role FROM users WHERE id=$1 AND company_id=$2 AND is_active=true`, [auth.userId, auth.companyId])).rows[0];

  return context;
}

export function serializeErpContext(context: Record<string, unknown>, maxCharacters = 60000) {
  const serialized = JSON.stringify(context);
  return serialized.length <= maxCharacters ? serialized : `${serialized.slice(0, maxCharacters)}\n[context truncated at safe size]`;
}
