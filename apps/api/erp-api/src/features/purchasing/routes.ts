import { Router } from 'express';
import { goodsReceiptInputSchema, purchaseActionSchema, purchaseOrderInputSchema, uuidSchema, warehouseInputSchema } from '@erp/contracts';
import { query, transaction } from '../../db/client.js';
import { HttpError, validate } from '../../lib/http.js';
import { serializeDecimalRow, serializeDecimalRows } from '../../lib/rows.js';
import { authorize, authorizeAny } from '../auth/middleware.js';
import { createPurchaseOrder, transitionPurchaseOrder } from './service.js';
import { postGoodsReceipt } from './receipt-service.js';
import { beginIdempotent, completeIdempotent } from '../../lib/idempotency.js';
import { requireDocumentWarehouseAccess, requireWarehouseAccess, warehouseScopeSql } from '../auth/data-scope.js';

export const purchasingRouter = Router();
purchasingRouter.get('/warehouses', authorize('inventory.read'), async (request, response) => { const values:unknown[]=[request.auth!.companyId];const scope=warehouseScopeSql(request.auth!,'id',values);response.json({ data: serializeDecimalRows((await query(`SELECT * FROM warehouses WHERE company_id=$1${scope} ORDER BY code`, values)).rows) }); });
purchasingRouter.post('/warehouses', authorize('inventory.write'), async (request, response) => {
  const input = validate(warehouseInputSchema, request.body);
  const result = await query(`INSERT INTO warehouses(company_id,code,name,name_ar,warehouse_type,is_active) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`, [request.auth!.companyId, input.code, input.name, input.nameAr, input.warehouseType, input.isActive]);
  response.status(201).json({ data: serializeDecimalRow(result.rows[0]) });
});
purchasingRouter.get('/purchase-orders', authorizeAny('purchases.view', 'purchases.read'), async (request, response) => {
  const values: unknown[]=[request.auth!.companyId];const scope=warehouseScopeSql(request.auth!,'po.warehouse_id',values);
  const result = await query(`SELECT po.*,s.name supplier_name,w.name warehouse_name FROM purchase_orders po JOIN suppliers s ON s.id=po.supplier_id JOIN warehouses w ON w.id=po.warehouse_id WHERE po.company_id=$1${scope} ORDER BY po.order_date DESC,po.created_at DESC LIMIT 100`, values);
  response.json({ data: serializeDecimalRows(result.rows) });
});
purchasingRouter.get('/purchase-orders/:id', authorizeAny('purchases.view', 'purchases.read'), async (request, response) => {
  const id = validate(uuidSchema, request.params.id);
  await requireDocumentWarehouseAccess({query},request.auth!,'purchase_orders',id);
  const order = await query('SELECT * FROM purchase_orders WHERE id=$1 AND company_id=$2', [id, request.auth!.companyId]);
  if (!order.rows[0]) throw new HttpError(404, 'PURCHASE_ORDER_NOT_FOUND', 'Purchase order not found');
  const items = await query('SELECT * FROM purchase_order_items WHERE purchase_order_id=$1 ORDER BY created_at', [id]);
  response.json({ data: { ...serializeDecimalRow(order.rows[0]), items: serializeDecimalRows(items.rows) } });
});
purchasingRouter.post('/purchase-orders', authorizeAny('purchases.create', 'purchases.write'), async (request, response) => {
  const key = request.header('Idempotency-Key');
  if (!key) throw new HttpError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key header is required');
  const input = validate(purchaseOrderInputSchema, request.body);
  await requireWarehouseAccess({query},request.auth!,input.warehouseId);
  const result = await transaction(async (client) => {
    const attempt = await beginIdempotent(client, { companyId: request.auth!.companyId, key, action: 'purchase_order.create', body: input });
    if (attempt.kind === 'replay') return attempt;
    const order = await createPurchaseOrder(client, request.auth!, input);
    const body = { data: serializeDecimalRow(order) };
    await completeIdempotent(client, { companyId: request.auth!.companyId, key, resourceType: 'purchase_order', resourceId: order.id, statusCode: 201, body });
    return { kind: 'created' as const, statusCode: 201, body };
  });
  response.status(result.statusCode).json(result.body);
});
purchasingRouter.post('/purchase-orders/:id/actions', authorize('purchases.read'), async (request, response) => {
  const id = validate(uuidSchema, request.params.id);
  await requireDocumentWarehouseAccess({query},request.auth!,'purchase_orders',id);
  const input = validate(purchaseActionSchema, request.body);
  if (input.action === 'approve' && !request.auth!.permissions.includes('purchases.approve')) throw new HttpError(403, 'FORBIDDEN', 'Missing permission: purchases.approve');
  if (input.action !== 'approve' && input.action !== 'reject' && !request.auth!.permissions.includes('purchases.write')) throw new HttpError(403, 'FORBIDDEN', 'Missing permission: purchases.write');
  if (input.action === 'reject' && !request.auth!.permissions.includes('purchases.approve')) throw new HttpError(403, 'FORBIDDEN', 'Missing permission: purchases.approve');
  const result = await transaction((client) => transitionPurchaseOrder(client, request.auth!, id, input.action, input.reason));
  response.json({ data: serializeDecimalRow(result) });
});
purchasingRouter.post('/purchase-orders/:id/receipts', authorize('inventory.receive'), async (request, response) => {
  const id = validate(uuidSchema, request.params.id);
  await requireDocumentWarehouseAccess({query},request.auth!,'purchase_orders',id);
  const key = request.header('Idempotency-Key');
  if (!key) throw new HttpError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key header is required');
  const input = validate(goodsReceiptInputSchema, request.body);
  const result = await transaction((client) => postGoodsReceipt(client, request.auth!, id, key, input));
  response.status(result.kind === 'replay' ? result.statusCode : 201).json(result.kind === 'replay' ? result.body : result.body);
});
purchasingRouter.get('/inventory/availability', authorize('inventory.read'), async (request, response) => {
  const values: unknown[] = [request.auth!.companyId]; let filter = warehouseScopeSql(request.auth!,'b.warehouse_id',values);
  if (request.query.warehouseId) { values.push(request.query.warehouseId); filter += ` AND b.warehouse_id=$${values.length}`; }
  if (request.query.productId) { values.push(request.query.productId); filter += ` AND b.product_id=$${values.length}`; }
  const result = await query(`SELECT b.*,p.sku,p.name product_name,w.code warehouse_code,w.name warehouse_name FROM inventory_balances b JOIN products p ON p.id=b.product_id JOIN warehouses w ON w.id=b.warehouse_id WHERE b.company_id=$1${filter} ORDER BY p.name,w.code LIMIT 100`, values);
  response.json({ data: serializeDecimalRows(result.rows) });
});
purchasingRouter.get('/inventory/movements', authorize('inventory.read'), async (request, response) => {
  const values:unknown[]=[request.auth!.companyId];const scope=warehouseScopeSql(request.auth!,'m.warehouse_id',values);const result = await query(`SELECT m.*,p.sku,p.name product_name,w.code warehouse_code FROM stock_movements m JOIN products p ON p.id=m.product_id JOIN warehouses w ON w.id=m.warehouse_id WHERE m.company_id=$1${scope} ORDER BY m.created_at DESC LIMIT 100`, values);
  response.json({ data: serializeDecimalRows(result.rows) });
});
