import { pool, transaction } from './client.js';

const companyId = '20000000-0000-4000-8000-000000000001';
const userId = '30000000-0000-4000-8000-000000000001';
const tenantId = '10000000-0000-4000-8000-000000000001';

const ids = {
  categories: ['41000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-000000000002', '41000000-0000-4000-8000-000000000003'],
  products: ['42000000-0000-4000-8000-000000000001', '42000000-0000-4000-8000-000000000002', '42000000-0000-4000-8000-000000000003', '42000000-0000-4000-8000-000000000004', '42000000-0000-4000-8000-000000000005', '42000000-0000-4000-8000-000000000006'],
  customers: ['43000000-0000-4000-8000-000000000001', '43000000-0000-4000-8000-000000000002', '43000000-0000-4000-8000-000000000003', '43000000-0000-4000-8000-000000000004'],
  suppliers: ['44000000-0000-4000-8000-000000000001', '44000000-0000-4000-8000-000000000002', '44000000-0000-4000-8000-000000000003'],
  warehouses: ['45000000-0000-4000-8000-000000000001', '45000000-0000-4000-8000-000000000002'],
};

export async function seedBusinessData() {
  await transaction(async (client) => {
    const company = await client.query('SELECT id FROM companies WHERE id=$1', [companyId]);
    if (!company.rowCount) throw new Error('Run npm run db:seed before db:seed:business');

    const categories = [
      [ids.categories[0], 'Electronics', 'إلكترونيات'], [ids.categories[1], 'Office supplies', 'مستلزمات مكتبية'], [ids.categories[2], 'Home appliances', 'أجهزة منزلية'],
    ];
    for (const row of categories) await client.query(`INSERT INTO categories(id,company_id,name,name_ar,type,is_active,slug) VALUES($1::uuid,$2::uuid,$3,$4,'product',true,lower(regexp_replace($3,'[^a-zA-Z0-9]+','-','g')) || '-' || left(($1::uuid)::text,8)) ON CONFLICT(id) DO UPDATE SET name=excluded.name,name_ar=excluded.name_ar,is_active=true`, [row[0], companyId, row[1], row[2]]);

    const products = [
      [ids.products[0], ids.categories[0], 'EL-LAP-001', 'Business Laptop 15', 'حاسوب أعمال 15 بوصة', 24500, 28900, 6, 12],
      [ids.products[1], ids.categories[0], 'EL-MON-002', '24-inch Monitor', 'شاشة 24 بوصة', 4800, 5900, 8, 10],
      [ids.products[2], ids.categories[0], 'EL-KBD-003', 'Wireless Keyboard', 'لوحة مفاتيح لاسلكية', 620, 850, 20, 30],
      [ids.products[3], ids.categories[1], 'OF-PAP-001', 'A4 Copy Paper Box', 'كرتونة ورق تصوير A4', 920, 1150, 15, 20],
      [ids.products[4], ids.categories[1], 'OF-CHR-002', 'Ergonomic Office Chair', 'كرسي مكتب مريح', 3850, 4900, 5, 8],
      [ids.products[5], ids.categories[2], 'HA-CFM-001', 'Coffee Maker', 'ماكينة قهوة', 2100, 2750, 7, 10],
    ];
    for (const row of products) await client.query(`INSERT INTO products(id,company_id,category_id,sku,name,name_ar,unit,type,cost_price,selling_price,tax_rate,min_stock_level,reorder_level,total_stock,is_active) VALUES($1,$2,$3,$4,$5,$6,'piece','product',$7,$8,14,$9,$10,0,true) ON CONFLICT(id) DO UPDATE SET category_id=excluded.category_id,name=excluded.name,name_ar=excluded.name_ar,cost_price=excluded.cost_price,selling_price=excluded.selling_price,min_stock_level=excluded.min_stock_level,reorder_level=excluded.reorder_level,is_active=true`, [row[0], companyId, row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8]]);

    const customers = [
      [ids.customers[0], 'CUS-001', 'Nile Retail', 'متاجر النيل', 'retail', '01010001001', 'Cairo'],
      [ids.customers[1], 'CUS-002', 'Delta Trading', 'دلتا للتجارة', 'wholesale', '01010001002', 'Alexandria'],
      [ids.customers[2], 'CUS-003', 'Future Offices', 'مكاتب المستقبل', 'corporate', '01010001003', 'Giza'],
      [ids.customers[3], 'CUS-004', 'Smart Home Store', 'متجر المنزل الذكي', 'distributor', '01010001004', 'Mansoura'],
    ];
    for (const row of customers) await client.query(`INSERT INTO customers(id,company_id,code,name,name_ar,type,phone,city,credit_limit,payment_terms,is_active) VALUES($1,$2,$3,$4,$5,$6,$7,$8,100000,30,true) ON CONFLICT(id) DO UPDATE SET name=excluded.name,name_ar=excluded.name_ar,phone=excluded.phone,city=excluded.city,is_active=true`, [row[0], companyId, row[1], row[2], row[3], row[4], row[5], row[6]]);

    const suppliers = [
      [ids.suppliers[0], 'SUP-001', 'Tech Distribution Egypt', 'تكنولوجيا للتوزيع', 'distributor', 14, 4.8],
      [ids.suppliers[1], 'SUP-002', 'Office Source', 'مصدر للمكاتب', 'supplier', 7, 4.5],
      [ids.suppliers[2], 'SUP-003', 'Home Systems Factory', 'مصنع أنظمة المنزل', 'manufacturer', 21, 4.2],
    ];
    for (const row of suppliers) await client.query(`INSERT INTO suppliers(id,company_id,code,name,name_ar,type,payment_terms,lead_time,rating,is_active) VALUES($1,$2,$3,$4,$5,$6,30,$7,$8,true) ON CONFLICT(id) DO UPDATE SET name=excluded.name,name_ar=excluded.name_ar,lead_time=excluded.lead_time,rating=excluded.rating,is_active=true`, [row[0], companyId, row[1], row[2], row[3], row[4], row[5], row[6]]);

    await client.query(`INSERT INTO units(id,company_id,code,name,name_ar,decimal_places) VALUES('45100000-0000-4000-8000-000000000001',$1,'piece','Piece','قطعة',0),('45100000-0000-4000-8000-000000000002',$1,'box','Box','صندوق',0) ON CONFLICT(id) DO UPDATE SET name=excluded.name,name_ar=excluded.name_ar`, [companyId]);
    await client.query(`INSERT INTO tax_rules(id,company_id,code,name,rate) VALUES('45200000-0000-4000-8000-000000000001',$1,'VAT14','VAT 14%',14) ON CONFLICT(id) DO UPDATE SET rate=excluded.rate`, [companyId]);
    await client.query(`INSERT INTO ledger_accounts(id,company_id,code,name,name_ar,account_type,system_role) VALUES('45300000-0000-4000-8000-000000000001',$1,'1100','Inventory','المخزون','asset','inventory'),('45300000-0000-4000-8000-000000000002',$1,'2100','Goods received not invoiced','بضاعة مستلمة غير مفوترة','liability','grni') ON CONFLICT(id) DO UPDATE SET name=excluded.name,name_ar=excluded.name_ar`, [companyId]);
    await client.query(`INSERT INTO warehouses(id,company_id,code,name,name_ar,warehouse_type,is_active) VALUES($1,$3,'MAIN','Main warehouse','المخزن الرئيسي','main',true),($2,$3,'WEST','West branch warehouse','مخزن فرع الغرب','main',true) ON CONFLICT(id) DO UPDATE SET name=excluded.name,name_ar=excluded.name_ar,is_active=true`, [ids.warehouses[0], ids.warehouses[1], companyId]);

    const stock = [35, 18, 75, 42, 9, 24];
    for (let index = 0; index < ids.products.length; index += 1) {
      const productId = ids.products[index]; const movementId = `49000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
      await client.query(`INSERT INTO inventory_balances(company_id,warehouse_id,product_id,on_hand,reserved,average_cost) VALUES($1,$2,$3,$4,0,(SELECT cost_price FROM products WHERE id=$3)) ON CONFLICT(company_id,warehouse_id,product_id) DO UPDATE SET on_hand=excluded.on_hand,reserved=0,average_cost=excluded.average_cost,updated_at=now()`, [companyId, ids.warehouses[0], productId, stock[index]]);
      await client.query(`INSERT INTO stock_movements(id,company_id,warehouse_id,product_id,movement_type,quantity,unit_cost,source_type,source_id,reason,operation_key,business_date,created_by) VALUES($1,$2,$3,$4,'receipt',$5,(SELECT cost_price FROM products WHERE id=$4),'demo_seed',$1,'Opening demo balance',$6,current_date-interval '30 days',$7) ON CONFLICT(id) DO NOTHING`, [movementId, companyId, ids.warehouses[0], productId, stock[index], `demo-stock-${index + 1}`, userId]);
      await client.query(`UPDATE products SET total_stock=$2,updated_at=now() WHERE id=$1`, [productId, stock[index]]);
    }

    await client.query(`INSERT INTO purchase_orders(id,company_id,order_number,supplier_id,warehouse_id,status,order_date,expected_date,currency,subtotal,tax_amount,total,notes,created_by,approved_by,approved_at) VALUES('46000000-0000-4000-8000-000000000001',$1,'PO-DEMO-001',$2,$4,'approved',current_date-5,current_date+7,'EGP',98000,13720,111720,'Laptop replenishment',$5,$5,now()),('46000000-0000-4000-8000-000000000002',$1,'PO-DEMO-002',$3,$4,'draft',current_date,current_date+10,'EGP',18400,2576,20976,'Office paper order',$5,null,null) ON CONFLICT(id) DO UPDATE SET status=excluded.status,expected_date=excluded.expected_date,updated_at=now()`, [companyId, ids.suppliers[0], ids.suppliers[1], ids.warehouses[0], userId]);
    await client.query(`INSERT INTO purchase_order_items(id,purchase_order_id,product_id,description,ordered_quantity,unit_price,tax_rate,tax_amount,total) VALUES('46100000-0000-4000-8000-000000000001','46000000-0000-4000-8000-000000000001',$1,'Business Laptop 15',4,24500,14,13720,111720),('46100000-0000-4000-8000-000000000002','46000000-0000-4000-8000-000000000002',$2,'A4 Copy Paper Box',20,920,14,2576,20976) ON CONFLICT(id) DO UPDATE SET ordered_quantity=excluded.ordered_quantity,unit_price=excluded.unit_price,tax_amount=excluded.tax_amount,total=excluded.total`, [ids.products[0], ids.products[3]]);

    const invoices = [
      ['47000000-0000-4000-8000-000000000001', 'INV-DEMO-001', ids.customers[0], ids.products[1], 2, 5900, 1652, 13452, 13452],
      ['47000000-0000-4000-8000-000000000002', 'INV-DEMO-002', ids.customers[2], ids.products[4], 3, 4900, 2058, 16758, 8000],
      ['47000000-0000-4000-8000-000000000003', 'INV-DEMO-003', ids.customers[1], ids.products[3], 10, 1150, 1610, 13110, 0],
    ];
    for (let index = 0; index < invoices.length; index += 1) {
      const row = invoices[index]; const remaining = Number(row[7]) - Number(row[8]);
      await client.query(`INSERT INTO sales_invoices(id,company_id,customer_id,invoice_number,status,invoice_date,due_date,subtotal,tax_amount,total,paid_amount,remaining_amount,payment_status,created_by) VALUES($1,$2,$3,$4,'confirmed',current_date-$10::int,current_date-$10::int+30,$5,$6,$7,$8,$9,$11,$12) ON CONFLICT(id) DO UPDATE SET paid_amount=excluded.paid_amount,remaining_amount=excluded.remaining_amount,payment_status=excluded.payment_status,updated_at=now()`, [row[0], companyId, row[2], row[1], Number(row[4]) * Number(row[5]), row[6], row[7], row[8], remaining, 3 + index * 4, remaining === 0 ? 'paid' : Number(row[8]) > 0 ? 'partial' : 'unpaid', userId]);
      await client.query(`INSERT INTO sales_invoice_items(id,invoice_id,product_id,description,quantity,unit_price,tax_rate,tax_amount,total) VALUES($1,$2,$3,(SELECT name FROM products WHERE id=$3),$4,$5,14,$6,$7) ON CONFLICT(id) DO UPDATE SET quantity=excluded.quantity,unit_price=excluded.unit_price,tax_amount=excluded.tax_amount,total=excluded.total`, [`47100000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`, row[0], row[3], row[4], row[5], row[6], row[7]]);
    }
    await client.query(`UPDATE customers c SET total_sales=s.sales,total_paid=s.paid,balance=s.balance,updated_at=now() FROM (SELECT customer_id,sum(total) sales,sum(paid_amount) paid,sum(remaining_amount) balance FROM sales_invoices WHERE company_id=$1 GROUP BY customer_id) s WHERE c.id=s.customer_id`, [companyId]);

    await client.query(`INSERT INTO expenses(id,company_id,expense_number,description,amount,tax_amount,total,expense_date,payment_method,status) VALUES('48000000-0000-4000-8000-000000000001',$1,'EXP-DEMO-001','Office internet subscription',1800,252,2052,current_date-8,'bank_transfer','paid'),('48000000-0000-4000-8000-000000000002',$1,'EXP-DEMO-002','Warehouse utilities',2400,336,2736,current_date-4,'cash','approved'),('48000000-0000-4000-8000-000000000003',$1,'EXP-DEMO-003','Local delivery costs',950,0,950,current_date-1,'cash','draft') ON CONFLICT(id) DO UPDATE SET amount=excluded.amount,tax_amount=excluded.tax_amount,total=excluded.total,status=excluded.status,updated_at=now()`, [companyId]);
    await client.query(`INSERT INTO audit_events(id,tenant_id,company_id,actor_user_id,action,entity_type,metadata) VALUES('4a000000-0000-4000-8000-000000000001',$1,$2,$3,'demo_data.seeded','company','{"source":"db:seed:business"}') ON CONFLICT(id) DO NOTHING`, [tenantId, companyId, userId]);
  });

  const counts = await pool.query<{ products: string; customers: string; suppliers: string; invoices: string }>(`SELECT (SELECT count(*) FROM products WHERE company_id=$1)::text products,(SELECT count(*) FROM customers WHERE company_id=$1)::text customers,(SELECT count(*) FROM suppliers WHERE company_id=$1)::text suppliers,(SELECT count(*) FROM sales_invoices WHERE company_id=$1)::text invoices`, [companyId]);
  console.log('Demo business data ready:', counts.rows[0]);
}

if (require.main === module) {
  seedBusinessData().then(() => pool.end()).catch((error) => { console.error(error); process.exitCode = 1; });
}
