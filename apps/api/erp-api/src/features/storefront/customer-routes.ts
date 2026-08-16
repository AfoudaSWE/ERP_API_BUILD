import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { query, transaction } from '../../db/client.js';
import { HttpError, validate } from '../../lib/http.js';
import { nextDocumentNumber } from '../../lib/document-number.js';
import { postSalesInvoice } from '../sales/posting-service.js';
import { getActiveStore } from './store.js';
import { authenticateCustomer, signCustomerToken } from './customer-auth.js';
import { getPublicProductRow, mapPublicProduct, publicWhere } from './catalog-service.js';

const credentials = z.object({ email: z.email(), password: z.string().min(8).max(128) });
const registerSchema = credentials.extend({ name: z.string().trim().min(2).max(160), phone: z.string().trim().min(7).max(30).optional() });
const addressSchema = z.object({ label: z.string().trim().min(1).max(40).default('Home'), recipientName: z.string().trim().min(2).max(160), phone: z.string().trim().min(7).max(30), addressLine1: z.string().trim().min(3).max(300), addressLine2: z.string().trim().max(300).default(''), city: z.string().trim().min(2).max(100), area: z.string().trim().max(100).default(''), postalCode: z.string().trim().max(30).default(''), deliveryNotes: z.string().trim().max(500).default(''), isDefault: z.boolean().default(false) });
const checkoutSchema = z.object({ cartToken: z.uuid(), shippingMethodId: z.uuid(), paymentMethodId: z.uuid(), address: addressSchema.omit({ label: true, isDefault: true }), notes: z.string().trim().max(500).default('') });
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const customerView = (row: Record<string, unknown>) => ({ id: row.id, name: row.name, nameAr: row.name_ar, email: row.email, phone: row.phone, createdAt: row.created_at });

export const customerAuthRouter = Router();
customerAuthRouter.post('/register', async (request, response) => {
  const store = await getActiveStore(), input = validate(registerSchema, request.body);
  const exists = await query('SELECT 1 FROM customers WHERE company_id=$1 AND lower(email)=lower($2)', [store.company_id, input.email]);
  if (exists.rowCount) throw new HttpError(409, 'EMAIL_ALREADY_REGISTERED', 'An account already uses this email');
  const passwordHash = await bcrypt.hash(input.password, 12), code = `WEB-${randomUUID().slice(0, 8).toUpperCase()}`;
  const row = (await query(`INSERT INTO customers(company_id,code,name,email,phone,password_hash,tags) VALUES($1,$2,$3,lower($4),$5,$6,ARRAY['ecommerce']) RETURNING id,name,name_ar,email,phone,created_at`, [store.company_id, code, input.name, input.email, input.phone ?? null, passwordHash])).rows[0];
  response.status(201).json({ data: { accessToken: signCustomerToken(String(row.id), store.company_id), customer: customerView(row) } });
});
customerAuthRouter.post('/login', async (request, response) => {
  const store = await getActiveStore(), input = validate(credentials, request.body);
  const row = (await query<Record<string, unknown> & { password_hash: string }>('SELECT id,name,name_ar,email,phone,password_hash,created_at FROM customers WHERE company_id=$1 AND lower(email)=lower($2) AND is_active=true', [store.company_id, input.email])).rows[0];
  if (!row || !row.password_hash || !(await bcrypt.compare(input.password, row.password_hash))) throw new HttpError(401, 'INVALID_CUSTOMER_CREDENTIALS', 'Email or password is incorrect');
  await query('UPDATE customers SET last_login_at=now(),updated_at=now() WHERE id=$1', [row.id]);
  response.json({ data: { accessToken: signCustomerToken(String(row.id), store.company_id), customer: customerView(row) } });
});
customerAuthRouter.post('/forgot-password', async (request, response) => {
  const store = await getActiveStore(), email = validate(z.object({ email: z.email() }), request.body).email;
  const raw = randomBytes(32).toString('hex');
  await query(`UPDATE customers SET password_reset_token_hash=$3,password_reset_expires_at=now()+interval '30 minutes',updated_at=now() WHERE company_id=$1 AND lower(email)=lower($2) AND password_hash IS NOT NULL`, [store.company_id, email, hashToken(raw)]);
  response.status(202).json({ data: { accepted: true, ...(env.NODE_ENV === 'development' ? { resetToken: raw } : {}) } });
});
customerAuthRouter.post('/reset-password', async (request, response) => {
  const input = validate(z.object({ token: z.string().length(64), password: z.string().min(8).max(128) }), request.body), passwordHash = await bcrypt.hash(input.password, 12);
  const updated = await query(`UPDATE customers SET password_hash=$2,password_reset_token_hash=NULL,password_reset_expires_at=NULL,updated_at=now() WHERE password_reset_token_hash=$1 AND password_reset_expires_at>now() RETURNING id`, [hashToken(input.token), passwordHash]);
  if (!updated.rowCount) throw new HttpError(400, 'INVALID_RESET_TOKEN', 'Reset token is invalid or expired');
  response.json({ data: { reset: true } });
});

export const customerRouter = Router();
customerRouter.use(authenticateCustomer);
customerRouter.get('/me', async (request, response) => {
  const row = (await query('SELECT id,name,name_ar,email,phone,created_at FROM customers WHERE id=$1 AND company_id=$2', [request.customerAuth!.customerId, request.customerAuth!.companyId])).rows[0];
  response.json({ data: customerView(row) });
});
customerRouter.patch('/me', async (request, response) => {
  const input = validate(z.object({ name: z.string().trim().min(2).max(160).optional(), phone: z.string().trim().min(7).max(30).nullable().optional() }), request.body);
  const row = (await query(`UPDATE customers SET name=COALESCE($3,name),phone=CASE WHEN $4::boolean THEN $5 ELSE phone END,updated_at=now() WHERE id=$1 AND company_id=$2 RETURNING id,name,name_ar,email,phone,created_at`, [request.customerAuth!.customerId, request.customerAuth!.companyId, input.name ?? null, Object.hasOwn(input, 'phone'), input.phone ?? null])).rows[0];
  response.json({ data: customerView(row) });
});

customerRouter.get('/addresses', async (request, response) => response.json({ data: (await query(`SELECT id,label,recipient_name "recipientName",phone,address_line1 "addressLine1",address_line2 "addressLine2",city,area,postal_code "postalCode",delivery_notes "deliveryNotes",is_default "isDefault" FROM customer_addresses WHERE company_id=$1 AND customer_id=$2 ORDER BY is_default DESC,created_at`, [request.customerAuth!.companyId, request.customerAuth!.customerId])).rows }));
customerRouter.post('/addresses', async (request, response) => {
  const input = validate(addressSchema, request.body), auth = request.customerAuth!;
  const row = await transaction(async (client) => { if (input.isDefault) await client.query('UPDATE customer_addresses SET is_default=false WHERE company_id=$1 AND customer_id=$2', [auth.companyId, auth.customerId]); return (await client.query(`INSERT INTO customer_addresses(company_id,customer_id,label,recipient_name,phone,address_line1,address_line2,city,area,postal_code,delivery_notes,is_default) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id,label,recipient_name "recipientName",phone,address_line1 "addressLine1",address_line2 "addressLine2",city,area,postal_code "postalCode",delivery_notes "deliveryNotes",is_default "isDefault"`, [auth.companyId, auth.customerId, input.label, input.recipientName, input.phone, input.addressLine1, input.addressLine2, input.city, input.area, input.postalCode, input.deliveryNotes, input.isDefault])).rows[0]; });
  response.status(201).json({ data: row });
});
customerRouter.delete('/addresses/:id', async (request, response) => { const result = await query('DELETE FROM customer_addresses WHERE id=$1 AND company_id=$2 AND customer_id=$3 RETURNING id', [request.params.id, request.customerAuth!.companyId, request.customerAuth!.customerId]); if (!result.rowCount) throw new HttpError(404, 'ADDRESS_NOT_FOUND', 'Address not found'); response.status(204).send(); });

customerRouter.get('/wishlist', async (request, response) => {
  const rows = await query(`SELECT p.id,p.slug FROM storefront_wishlist_items w JOIN products p ON p.id=w.product_id WHERE w.company_id=$1 AND w.customer_id=$2 AND ${publicWhere} ORDER BY w.created_at DESC`, [request.customerAuth!.companyId, request.customerAuth!.customerId]);
  const products = []; for (const row of rows.rows) { const found = await getPublicProductRow(request.customerAuth!.companyId, String(row.slug)); if (found) products.push(mapPublicProduct(found)); }
  response.json({ data: products });
});
customerRouter.post('/wishlist/:productId', async (request, response) => { const auth=request.customerAuth!; const product=await query(`SELECT id FROM products p WHERE ${publicWhere} AND p.id=$2`,[auth.companyId,request.params.productId]); if(!product.rowCount)throw new HttpError(404,'PRODUCT_NOT_FOUND','Product not found'); await query(`INSERT INTO storefront_wishlist_items(company_id,customer_id,product_id)VALUES($1,$2,$3)ON CONFLICT DO NOTHING`,[auth.companyId,auth.customerId,request.params.productId]); response.status(201).json({data:{productId:request.params.productId}}); });
customerRouter.delete('/wishlist/:productId', async (request, response) => { await query('DELETE FROM storefront_wishlist_items WHERE company_id=$1 AND customer_id=$2 AND product_id=$3',[request.customerAuth!.companyId,request.customerAuth!.customerId,request.params.productId]); response.status(204).send(); });

customerRouter.get('/orders', async (request, response) => { const rows=await query(`SELECT id,order_number "orderNumber",status,payment_status "paymentStatus",currency,subtotal,discount_amount "discountAmount",tax_amount "taxAmount",shipping_amount "shippingAmount",total,created_at "createdAt" FROM ecommerce_orders WHERE company_id=$1 AND customer_id=$2 ORDER BY created_at DESC`,[request.customerAuth!.companyId,request.customerAuth!.customerId]); response.json({data:rows.rows.map(numericOrder)}); });
customerRouter.get('/orders/:id', async (request, response) => { const auth=request.customerAuth!; const order=(await query(`SELECT id,order_number "orderNumber",status,payment_status "paymentStatus",currency,customer_snapshot "customerSnapshot",shipping_address "shippingAddress",subtotal,discount_amount "discountAmount",tax_amount "taxAmount",shipping_amount "shippingAmount",total,created_at "createdAt" FROM ecommerce_orders WHERE id=$1 AND company_id=$2 AND customer_id=$3`,[request.params.id,auth.companyId,auth.customerId])).rows[0]; if(!order)throw new HttpError(404,'ORDER_NOT_FOUND','Order not found'); const items=(await query(`SELECT id,product_id "productId",variant_id "variantId",sku,product_name "productName",product_name_ar "productNameAr",variant_snapshot "variant",quantity,unit_price "unitPrice",discount_amount "discountAmount",tax_rate "taxRate",tax_amount "taxAmount",total FROM ecommerce_order_items WHERE order_id=$1 ORDER BY created_at`,[request.params.id])).rows; response.json({data:{...numericOrder(order),items:items.map(numericOrder)}}); });
customerRouter.post('/orders', async (request, response) => {
  const input=validate(checkoutSchema,request.body), key=request.header('Idempotency-Key'); if(!key)throw new HttpError(400,'IDEMPOTENCY_KEY_REQUIRED','Idempotency-Key header is required'); const auth=request.customerAuth!,store=await getActiveStore(); if(store.company_id!==auth.companyId)throw new HttpError(403,'STORE_SCOPE_MISMATCH','Customer does not belong to this store');
  const result=await transaction(async(client)=>{
    const replay=(await client.query('SELECT id,order_number "orderNumber" FROM ecommerce_orders WHERE company_id=$1 AND idempotency_key=$2',[auth.companyId,key])).rows[0]; if(replay)return{statusCode:200,order:replay};
    const cart=(await client.query<{id:string;currency:string}>(`SELECT id,currency FROM storefront_carts WHERE company_id=$1 AND token=$2 AND status='active' AND expires_at>now() FOR UPDATE`,[auth.companyId,input.cartToken])).rows[0]; if(!cart)throw new HttpError(404,'CART_NOT_FOUND','Cart not found or expired');
    const customer=(await client.query(`SELECT id,name,name_ar,email,phone FROM customers WHERE id=$1 AND company_id=$2 AND is_active=true FOR UPDATE`,[auth.customerId,auth.companyId])).rows[0];
    const shipping=(await client.query<{id:string;fee:string}>(`SELECT id,fee FROM shipping_methods WHERE id=$1 AND company_id=$2 AND is_enabled=true`,[input.shippingMethodId,auth.companyId])).rows[0], payment=(await client.query<{id:string;code:string}>(`SELECT id,code FROM payment_methods WHERE id=$1 AND company_id=$2 AND is_enabled=true`,[input.paymentMethodId,auth.companyId])).rows[0]; if(!shipping||!payment)throw new HttpError(422,'CHECKOUT_METHOD_UNAVAILABLE','Shipping or payment method is unavailable');
    // Database row shape is validated by the checkout calculations below.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lines=(await client.query<any>(`SELECT ci.product_id,ci.variant_id,ci.quantity,p.sku product_sku,p.name,p.name_ar,p.tax_rate,p.type,p.total_stock,p.is_active,p.storefront_visible,p.commerce_status,COALESCE(v.sku,p.sku)sku,COALESCE(v.selling_price,p.selling_price)price,v.attributes,COALESCE(v.stock_quantity,p.total_stock)variant_stock FROM storefront_cart_items ci JOIN products p ON p.id=ci.product_id AND p.company_id=$1 LEFT JOIN product_variants v ON v.id=ci.variant_id AND v.company_id=$1 WHERE ci.cart_id=$2 ORDER BY ci.created_at FOR UPDATE OF p`,[auth.companyId,cart.id])).rows; if(!lines.length)throw new HttpError(422,'EMPTY_CART','Cart is empty');
    const warehouse=(await client.query<{id:string}>(`SELECT w.id FROM warehouses w WHERE w.company_id=$1 AND w.is_active=true AND NOT EXISTS(SELECT 1 FROM unnest($2::uuid[],$3::numeric[])x(product_id,quantity) LEFT JOIN inventory_balances b ON b.company_id=$1 AND b.warehouse_id=w.id AND b.product_id=x.product_id WHERE COALESCE(b.available,0)<x.quantity) ORDER BY w.created_at LIMIT 1`,[auth.companyId,lines.map(l=>l.product_id),lines.map(l=>l.quantity)])).rows[0]; if(!warehouse)throw new HttpError(409,'INSUFFICIENT_STOCK','No warehouse can fulfill this order');
    for(const line of lines){if(!line.is_active||!line.storefront_visible||line.commerce_status!=='active')throw new HttpError(409,'PRODUCT_NOT_AVAILABLE',`${line.name} is no longer available`);if(line.variant_id&&Number(line.variant_stock)<Number(line.quantity))throw new HttpError(409,'INSUFFICIENT_STOCK',`${line.name} option is unavailable`);}
    const subtotal=lines.reduce((s,l)=>s+Number(l.price)*Number(l.quantity),0),tax=lines.reduce((s,l)=>s+Number(l.price)*Number(l.quantity)*Number(l.tax_rate)/100,0),shippingAmount=Number(shipping.fee),total=subtotal+tax+shippingAmount,orderNumber=await nextDocumentNumber(client,{companyId:auth.companyId,documentType:'ecommerce_order',prefix:'WEB',businessDate:new Date().toISOString().slice(0,10)});
    const order=(await client.query<{id:string}>(`INSERT INTO ecommerce_orders(company_id,customer_id,cart_id,shipping_method_id,payment_method_id,order_number,currency,customer_snapshot,shipping_address,subtotal,tax_amount,shipping_amount,total,idempotency_key,notes)VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)RETURNING id`,[auth.companyId,auth.customerId,cart.id,shipping.id,payment.id,orderNumber,cart.currency,customer,input.address,subtotal.toFixed(2),tax.toFixed(2),shippingAmount.toFixed(2),total.toFixed(2),key,input.notes])).rows[0];
    for(const line of lines){const lineSubtotal=Number(line.price)*Number(line.quantity),lineTax=lineSubtotal*Number(line.tax_rate)/100;await client.query(`INSERT INTO ecommerce_order_items(order_id,product_id,variant_id,sku,product_name,product_name_ar,variant_snapshot,quantity,unit_price,tax_rate,tax_amount,total)VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,[order.id,line.product_id,line.variant_id,line.sku,line.name,line.name_ar,line.attributes??{},line.quantity,line.price,line.tax_rate,lineTax.toFixed(2),(lineSubtotal+lineTax).toFixed(2)]);if(line.variant_id){const updated=await client.query(`UPDATE product_variants SET stock_quantity=stock_quantity-$2::numeric,updated_at=now() WHERE id=$1 AND stock_quantity>=$2::numeric RETURNING id`,[line.variant_id,line.quantity]);if(!updated.rowCount)throw new HttpError(409,'INSUFFICIENT_STOCK',`${line.name} option is unavailable`);}}
    const system=await client.query<{id:string;tenant_id:string}>(`SELECT u.id,u.tenant_id FROM users u WHERE u.company_id=$1 AND u.is_active=true ORDER BY CASE WHEN u.role IN('company_owner','business_owner')THEN 0 ELSE 1 END,u.created_at LIMIT 1`,[auth.companyId]); if(!system.rows[0])throw new HttpError(422,'ERP_POSTING_USER_REQUIRED','No active ERP user can post the order');
    const invoiceResult=await postSalesInvoice(client,{userId:system.rows[0].id,tenantId:system.rows[0].tenant_id,companyId:auth.companyId,role:'business_owner',permissions:[],branchIds:null},`ecommerce:${order.id}`,{customerId:auth.customerId,warehouseId:warehouse.id,invoiceDate:new Date().toISOString().slice(0,10),currency:cart.currency as 'EGP',discountAmount:'0',initialPayment:'0',paymentMethod:'cash',items:lines.map(l=>({productId:l.product_id,description:l.name,quantity:String(l.quantity),unitPrice:String(l.price),taxRate:String(l.tax_rate)}))});
    // Idempotency replay bodies are runtime JSON envelopes.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoiceId=String((invoiceResult.body as any).data.id);await client.query(`UPDATE sales_invoices SET source='ecommerce' WHERE id=$1`,[invoiceId]);await client.query(`UPDATE ecommerce_orders SET sales_invoice_id=$2 WHERE id=$1`,[order.id,invoiceId]);await client.query(`INSERT INTO ecommerce_payments(company_id,order_id,payment_method_id,amount,status)VALUES($1,$2,$3,$4,'pending')`,[auth.companyId,order.id,payment.id,total.toFixed(2)]);await client.query(`UPDATE storefront_carts SET customer_id=$2,status='converted',updated_at=now() WHERE id=$1`,[cart.id,auth.customerId]);return{statusCode:201,order:{id:order.id,orderNumber,total:Number(total.toFixed(2)),status:'confirmed',paymentStatus:'pending'}};
  }); response.status(result.statusCode).json({data:result.order});
});

function numericOrder(row:Record<string, unknown>){const next:Record<string,unknown>={...row};for(const key of ['subtotal','discountAmount','taxAmount','shippingAmount','total','unitPrice','taxRate'])if(next[key]!==undefined)next[key]=Number(next[key]);return next;}
