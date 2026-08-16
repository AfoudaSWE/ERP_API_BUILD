import { Router } from 'express';
import { query } from '../../db/client.js';
import { authorize } from '../auth/middleware.js';
import { warehouseScopeSql } from '../auth/data-scope.js';

export const dashboardRouter = Router();

dashboardRouter.get('/summary', authorize('dashboard.read'), async (request, response) => {
  const companyId = request.auth!.companyId;
  const values: unknown[] = [companyId];
  const salesScope = warehouseScopeSql(request.auth!, 'warehouse_id', values);
  const purchaseScope = warehouseScopeSql(request.auth!, 'warehouse_id', values);
  const inventoryScope = warehouseScopeSql(request.auth!, 'b.warehouse_id', values);
  let expenseScope = '';
  if (request.auth!.branchIds !== null) { values.push(request.auth!.branchIds); expenseScope = ` AND branch_id=ANY($${values.length}::uuid[])`; }
  const result = await query<{
    sales_today: string; sales_this_month: string; sales_last_month: string; receivables: string; expenses_this_month: string;
    inventory_value: string; low_stock_count: string; out_of_stock_count: string; total_customers: string; total_products: string;
    payables: string; pending_purchases: string; overdue_invoices: string; overdue_amount: string;
  }>(`SELECT
    COALESCE((SELECT sum(total) FROM sales_invoices WHERE company_id=$1 AND invoice_date=current_date${salesScope}),0) sales_today,
    COALESCE((SELECT sum(total) FROM sales_invoices WHERE company_id=$1 AND date_trunc('month',invoice_date)=date_trunc('month',current_date)${salesScope}),0) sales_this_month,
    COALESCE((SELECT sum(total) FROM sales_invoices WHERE company_id=$1 AND date_trunc('month',invoice_date)=date_trunc('month',current_date-interval '1 month')${salesScope}),0) sales_last_month,
    COALESCE((SELECT sum(remaining_amount) FROM sales_invoices WHERE company_id=$1${salesScope}),0) receivables,
    COALESCE((SELECT sum(total) FROM expenses WHERE company_id=$1 AND date_trunc('month',expense_date)=date_trunc('month',current_date)${expenseScope}),0) expenses_this_month,
    COALESCE((SELECT sum(b.on_hand*b.average_cost) FROM inventory_balances b WHERE b.company_id=$1${inventoryScope}),0) inventory_value,
    (SELECT count(*) FROM inventory_balances b JOIN products p ON p.id=b.product_id WHERE b.company_id=$1 AND b.available<=p.reorder_level${inventoryScope}) low_stock_count,
    (SELECT count(*) FROM inventory_balances b WHERE b.company_id=$1 AND b.available=0${inventoryScope}) out_of_stock_count,
    (SELECT count(*) FROM customers WHERE company_id=$1) total_customers,
    (SELECT count(*) FROM products WHERE company_id=$1) total_products,
    COALESCE((SELECT sum(sa.amount) FROM supplier_accruals sa JOIN goods_receipts gr ON gr.id=sa.goods_receipt_id WHERE sa.company_id=$1 AND sa.status='open'${warehouseScopeSql(request.auth!, 'gr.warehouse_id', values)}),0) payables,
    (SELECT count(*) FROM purchase_orders WHERE company_id=$1 AND status IN ('draft','submitted','approved','partially_received')${purchaseScope}) pending_purchases,
    (SELECT count(*) FROM sales_invoices WHERE company_id=$1 AND remaining_amount>0 AND due_date<current_date${salesScope}) overdue_invoices,
    COALESCE((SELECT sum(remaining_amount) FROM sales_invoices WHERE company_id=$1 AND remaining_amount>0 AND due_date<current_date${salesScope}),0) overdue_amount`, values);
  const row = result.rows[0];
  const data = Object.fromEntries(Object.entries(row).map(([key, value]) => [key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()), Number(value)]));
  const current = Number(row.sales_this_month); const previous = Number(row.sales_last_month);
  response.json({ data: { ...data, salesGrowth: previous ? ((current - previous) / previous) * 100 : current ? 100 : 0 } });
});

dashboardRouter.get('/analytics', authorize('dashboard.read'), async (request, response) => {
  const companyId = request.auth!.companyId;
  const [salesTrend, payment, products, customers, purchases, inventory, categorySales, bestSellers] = await Promise.all([
    query<{ month_key: string; label: string; sales: string; invoices: string }>(`SELECT to_char(series.month_start,'YYYY-MM') AS month_key,to_char(series.month_start,'Mon') AS label,COALESCE(sum(i.total),0)::text AS sales,count(i.id)::text AS invoices FROM generate_series(date_trunc('month',current_date)-interval '5 months',date_trunc('month',current_date),interval '1 month') AS series(month_start) LEFT JOIN sales_invoices i ON i.company_id=$1 AND date_trunc('month',i.invoice_date)=series.month_start GROUP BY series.month_start ORDER BY series.month_start`, [companyId]),
    query<{ paid: string; outstanding: string }>(`SELECT COALESCE(sum(paid_amount),0)::text paid,COALESCE(sum(remaining_amount),0)::text outstanding FROM sales_invoices WHERE company_id=$1`, [companyId]),
    query<{ id: string; name: string; name_ar: string; sku: string; stock: string; value: string }>(`SELECT id,name,name_ar,sku,total_stock::text stock,(total_stock*cost_price)::text value FROM products WHERE company_id=$1 AND is_active=true ORDER BY total_stock*cost_price DESC LIMIT 6`, [companyId]),
    query<{ id: string; name: string; name_ar: string; sales: string; balance: string }>(`SELECT id,name,name_ar,total_sales::text sales,balance::text balance FROM customers WHERE company_id=$1 AND is_active=true ORDER BY total_sales DESC LIMIT 6`, [companyId]),
    query<{ status: string; count: string; value: string }>(`SELECT status,count(*)::text count,COALESCE(sum(total),0)::text value FROM purchase_orders WHERE company_id=$1 GROUP BY status ORDER BY status`, [companyId]),
    query<{ healthy: string; low_stock: string; out_of_stock: string }>(`SELECT count(*) FILTER(WHERE total_stock>reorder_level)::text AS healthy,count(*) FILTER(WHERE total_stock>0 AND total_stock<=reorder_level)::text AS low_stock,count(*) FILTER(WHERE total_stock=0)::text AS out_of_stock FROM products WHERE company_id=$1 AND is_active=true`, [companyId]),
    query<{ id: string; name: string; name_ar: string; sales: string; quantity: string }>(`SELECT COALESCE(c.id::text,'uncategorized') AS id,COALESCE(c.name,'Uncategorized') AS name,COALESCE(NULLIF(c.name_ar,''),'غير مصنف') AS name_ar,COALESCE(sum(ii.total),0)::text AS sales,COALESCE(sum(ii.quantity),0)::text AS quantity FROM sales_invoice_items ii JOIN sales_invoices i ON i.id=ii.invoice_id LEFT JOIN products p ON p.id=ii.product_id AND p.company_id=i.company_id LEFT JOIN categories c ON c.id=p.category_id AND c.company_id=i.company_id WHERE i.company_id=$1 GROUP BY c.id,c.name,c.name_ar ORDER BY sum(ii.total) DESC LIMIT 8`, [companyId]),
    query<{ id: string; name: string; name_ar: string; sku: string; sales: string; quantity: string; invoice_count: string }>(`SELECT COALESCE(p.id::text,ii.id::text) AS id,COALESCE(p.name,ii.description) AS name,COALESCE(NULLIF(p.name_ar,''),COALESCE(p.name,ii.description)) AS name_ar,COALESCE(p.sku,'-') AS sku,COALESCE(sum(ii.total),0)::text AS sales,COALESCE(sum(ii.quantity),0)::text AS quantity,count(DISTINCT i.id)::text AS invoice_count FROM sales_invoice_items ii JOIN sales_invoices i ON i.id=ii.invoice_id LEFT JOIN products p ON p.id=ii.product_id AND p.company_id=i.company_id WHERE i.company_id=$1 GROUP BY 1,2,3,4 ORDER BY sum(ii.quantity) DESC,sum(ii.total) DESC LIMIT 6`, [companyId]),
  ]);
  response.json({ data: {
    salesTrend: salesTrend.rows.map((row) => ({ month: row.month_key, label: row.label, sales: Number(row.sales), invoices: Number(row.invoices) })),
    payment: { paid: Number(payment.rows[0].paid), outstanding: Number(payment.rows[0].outstanding) },
    topProducts: products.rows.map((row) => ({ id: row.id, name: row.name, nameAr: row.name_ar, sku: row.sku, stock: Number(row.stock), value: Number(row.value) })),
    topCustomers: customers.rows.map((row) => ({ id: row.id, name: row.name, nameAr: row.name_ar, sales: Number(row.sales), balance: Number(row.balance) })),
    purchaseStatus: purchases.rows.map((row) => ({ status: row.status, count: Number(row.count), value: Number(row.value) })),
    inventoryHealth: { healthy: Number(inventory.rows[0].healthy), low: Number(inventory.rows[0].low_stock), out: Number(inventory.rows[0].out_of_stock) },
    categorySales: categorySales.rows.map((row) => ({ id: row.id, name: row.name, nameAr: row.name_ar, sales: Number(row.sales), quantity: Number(row.quantity) })),
    bestSellers: bestSellers.rows.map((row) => ({ id: row.id, name: row.name, nameAr: row.name_ar, sku: row.sku, sales: Number(row.sales), quantity: Number(row.quantity), invoiceCount: Number(row.invoice_count) })),
  } });
});
