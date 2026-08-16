import { Router } from 'express';
import { paymentInputSchema, salesPostingInputSchema, salesReturnInputSchema, uuidSchema } from '@erp/contracts';
import { query, transaction } from '../../db/client.js';
import { HttpError, validate } from '../../lib/http.js';
import { serializeRow, serializeRows } from '../../lib/rows.js';
import { authorizeAny } from '../auth/middleware.js';
import { postSalesInvoice } from './posting-service.js';
import { postCustomerPayment } from './payment-service.js';
import { postSalesReturn } from './return-service.js';
import { requireDocumentWarehouseAccess, requireWarehouseAccess, warehouseScopeSql } from '../auth/data-scope.js';

export const salesRouter = Router();

salesRouter.get('/invoices', authorizeAny('sales.view', 'sales.read'), async (request, response) => {
  const values: unknown[] = [request.auth!.companyId];
  const scope = warehouseScopeSql(request.auth!, 'i.warehouse_id', values);
  const result = await query(
    `SELECT i.*, c.name AS customer_name
     FROM sales_invoices i LEFT JOIN customers c ON c.id = i.customer_id
     WHERE i.company_id = $1${scope} ORDER BY i.invoice_date DESC, i.created_at DESC LIMIT 100`, values,
  );
  response.json({ data: serializeRows(result.rows) });
});

salesRouter.get('/invoices/:id', authorizeAny('sales.view', 'sales.read'), async (request, response) => {
  await requireDocumentWarehouseAccess({ query }, request.auth!, 'sales_invoices', String(request.params.id));
  const invoice = await query('SELECT * FROM sales_invoices WHERE id = $1 AND company_id = $2', [request.params.id, request.auth!.companyId]);
  if (!invoice.rows[0]) throw new HttpError(404, 'NOT_FOUND', 'Invoice not found');
  const items = await query('SELECT * FROM sales_invoice_items WHERE invoice_id = $1 ORDER BY created_at', [request.params.id]);
  response.json({ data: { ...serializeRow(invoice.rows[0]), items: serializeRows(items.rows) } });
});

salesRouter.post('/invoices', authorizeAny('sales.create', 'sales.write', 'pos.use'), async (request, response) => {
  const key=request.header('Idempotency-Key');if(!key)throw new HttpError(400,'IDEMPOTENCY_KEY_REQUIRED','Idempotency-Key header is required');
  const input=validate(salesPostingInputSchema,request.body);let warehouseId=input.warehouseId;if(!warehouseId&&request.auth!.permissions.includes('pos.use'))warehouseId=(await query<{id:string}>(`SELECT id FROM warehouses WHERE company_id=$1 AND branch_id=ANY($2::uuid[]) AND is_active=true ORDER BY code LIMIT 1`,[request.auth!.companyId,request.auth!.branchIds??[]])).rows[0]?.id;await requireWarehouseAccess({ query },request.auth!,warehouseId);const result=await transaction(client=>postSalesInvoice(client,request.auth!,key,{...input,warehouseId}));response.status(result.statusCode).json(result.body);
});

salesRouter.post('/invoices/:id/payments',authorizeAny('payments.receive'),async(request,response)=>{const id=validate(uuidSchema,request.params.id);await requireDocumentWarehouseAccess({query},request.auth!,'sales_invoices',id);const key=request.header('Idempotency-Key');if(!key)throw new HttpError(400,'IDEMPOTENCY_KEY_REQUIRED','Idempotency-Key header is required');const input=validate(paymentInputSchema,request.body);const result=await transaction(client=>postCustomerPayment(client,request.auth!,id,key,input));response.status(result.statusCode).json(result.body);});
salesRouter.post('/invoices/:id/returns',authorizeAny('sales.refund'),async(request,response)=>{const id=validate(uuidSchema,request.params.id);await requireDocumentWarehouseAccess({query},request.auth!,'sales_invoices',id);const key=request.header('Idempotency-Key');if(!key)throw new HttpError(400,'IDEMPOTENCY_KEY_REQUIRED','Idempotency-Key header is required');const input=validate(salesReturnInputSchema,request.body);const result=await transaction(client=>postSalesReturn(client,request.auth!,id,key,input));response.status(result.statusCode).json(result.body);});
