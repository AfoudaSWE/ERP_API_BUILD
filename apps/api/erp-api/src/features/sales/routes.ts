import { Router } from 'express';
import {
  createInvoiceFromTemplateSchema, deliveryNoteActionSchema, deliveryNoteInputSchema, invoiceTemplateInputSchema,
  paymentInputSchema, recurringInvoiceActionSchema, recurringInvoiceTemplateInputSchema, salesPostingInputSchema,
  salesQuoteActionSchema, salesQuoteInputSchema, salesReturnInputSchema, uuidSchema,
} from '@erp/contracts';
import { query, transaction } from '../../db/client.js';
import { HttpError, validate } from '../../lib/http.js';
import { serializeRow, serializeRows } from '../../lib/rows.js';
import { authorizeAny } from '../auth/middleware.js';
import { postSalesInvoice } from './posting-service.js';
import { postCustomerPayment } from './payment-service.js';
import { postSalesReturn } from './return-service.js';
import { createSalesQuote, actOnSalesQuote, convertQuoteToInvoice } from './quote-service.js';
import { createRecurringTemplate, actOnRecurringTemplate, generateInvoiceFromRecurringTemplate } from './recurring-service.js';
import { createInvoiceTemplate, archiveInvoiceTemplate, createInvoiceFromTemplate } from './template-service.js';
import { createDeliveryNote, actOnDeliveryNote } from './delivery-service.js';
import { requireDocumentWarehouseAccess, requireWarehouseAccess, warehouseScopeSql } from '../auth/data-scope.js';

export const salesRouter = Router();

salesRouter.get('/invoices', authorizeAny('sales.view', 'sales.read', 'pos.use'), async (request, response) => {
  const values: unknown[] = [request.auth!.companyId];
  let scope = warehouseScopeSql(request.auth!, 'i.warehouse_id', values);
  if (request.query.paymentMethod) { values.push(request.query.paymentMethod); scope += ` AND EXISTS (SELECT 1 FROM payment_allocations a JOIN customer_payments p ON p.id=a.payment_id WHERE a.invoice_id=i.id AND p.method=$${values.length})`; }
  if (request.query.source) { values.push(request.query.source); scope += ` AND i.source = $${values.length}`; }
  const result = await query(
    `SELECT i.*, c.name AS customer_name
     FROM sales_invoices i LEFT JOIN customers c ON c.id = i.customer_id
     WHERE i.company_id = $1${scope} ORDER BY i.invoice_date DESC, i.created_at DESC LIMIT 100`, values,
  );
  response.json({ data: serializeRows(result.rows) });
});

salesRouter.get('/invoices/:id', authorizeAny('sales.view', 'sales.read', 'pos.use'), async (request, response) => {
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

salesRouter.get('/returns', authorizeAny('sales.view', 'sales.read'), async (request, response) => {
  const values: unknown[] = [request.auth!.companyId];
  const scope = warehouseScopeSql(request.auth!, 'r.warehouse_id', values);
  const result = await query(
    `SELECT r.*, c.name AS customer_name, i.invoice_number
     FROM sales_returns r LEFT JOIN customers c ON c.id = r.customer_id LEFT JOIN sales_invoices i ON i.id = r.invoice_id
     WHERE r.company_id = $1${scope} ORDER BY r.business_date DESC, r.created_at DESC LIMIT 100`, values,
  );
  response.json({ data: serializeRows(result.rows) });
});

// Sales quotes
salesRouter.get('/quotes', authorizeAny('sales.view', 'sales.read'), async (request, response) => {
  const result = await query('SELECT * FROM sales_quotes WHERE company_id=$1 ORDER BY quote_date DESC, created_at DESC LIMIT 100', [request.auth!.companyId]);
  response.json({ data: serializeRows(result.rows) });
});
salesRouter.get('/quotes/:id', authorizeAny('sales.view', 'sales.read'), async (request, response) => {
  const id = validate(uuidSchema, request.params.id);
  const quote = await query('SELECT * FROM sales_quotes WHERE id=$1 AND company_id=$2', [id, request.auth!.companyId]);
  if (!quote.rows[0]) throw new HttpError(404, 'QUOTE_NOT_FOUND', 'Quote not found');
  const items = await query('SELECT * FROM sales_quote_items WHERE quote_id=$1 ORDER BY created_at', [id]);
  response.json({ data: { ...serializeRow(quote.rows[0]), items: serializeRows(items.rows) } });
});
salesRouter.post('/quotes', authorizeAny('sales.create', 'sales.write'), async (request, response) => {
  const input = validate(salesQuoteInputSchema, request.body);
  const result = await transaction((client) => createSalesQuote(client, request.auth!, input));
  response.status(201).json({ data: serializeRow(result) });
});
salesRouter.post('/quotes/:id/actions', authorizeAny('sales.create', 'sales.write'), async (request, response) => {
  const id = validate(uuidSchema, request.params.id);
  const input = validate(salesQuoteActionSchema, request.body);
  const result = await transaction((client) => actOnSalesQuote(client, request.auth!, id, input.action));
  response.json({ data: serializeRow(result) });
});
salesRouter.post('/quotes/:id/convert', authorizeAny('sales.create', 'sales.write'), async (request, response) => {
  const id = validate(uuidSchema, request.params.id);
  const key = request.header('Idempotency-Key');
  if (!key) throw new HttpError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key header is required');
  const input = validate(createInvoiceFromTemplateSchema, request.body);
  await requireWarehouseAccess({ query }, request.auth!, input.warehouseId);
  const result = await transaction((client) => convertQuoteToInvoice(client, request.auth!, id, key, input.warehouseId, input.paymentMethod));
  response.status(result.statusCode).json(result.body);
});

// Recurring invoice templates
salesRouter.get('/recurring-invoices', authorizeAny('sales.view', 'sales.read'), async (request, response) => {
  const result = await query('SELECT * FROM recurring_invoice_templates WHERE company_id=$1 ORDER BY next_run_date, created_at DESC LIMIT 100', [request.auth!.companyId]);
  response.json({ data: serializeRows(result.rows) });
});
salesRouter.get('/recurring-invoices/:id', authorizeAny('sales.view', 'sales.read'), async (request, response) => {
  const id = validate(uuidSchema, request.params.id);
  const template = await query('SELECT * FROM recurring_invoice_templates WHERE id=$1 AND company_id=$2', [id, request.auth!.companyId]);
  if (!template.rows[0]) throw new HttpError(404, 'TEMPLATE_NOT_FOUND', 'Recurring invoice template not found');
  const items = await query('SELECT * FROM recurring_invoice_items WHERE template_id=$1 ORDER BY created_at', [id]);
  response.json({ data: { ...serializeRow(template.rows[0]), items: serializeRows(items.rows) } });
});
salesRouter.post('/recurring-invoices', authorizeAny('sales.create', 'sales.write'), async (request, response) => {
  const input = validate(recurringInvoiceTemplateInputSchema, request.body);
  const result = await transaction((client) => createRecurringTemplate(client, request.auth!, input));
  response.status(201).json({ data: serializeRow(result) });
});
salesRouter.post('/recurring-invoices/:id/actions', authorizeAny('sales.create', 'sales.write'), async (request, response) => {
  const id = validate(uuidSchema, request.params.id);
  const input = validate(recurringInvoiceActionSchema, request.body);
  const result = await transaction((client) => actOnRecurringTemplate(client, request.auth!, id, input.action));
  response.json({ data: serializeRow(result) });
});
salesRouter.post('/recurring-invoices/:id/generate', authorizeAny('sales.create', 'sales.write'), async (request, response) => {
  const id = validate(uuidSchema, request.params.id);
  const key = request.header('Idempotency-Key');
  if (!key) throw new HttpError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key header is required');
  const result = await transaction((client) => generateInvoiceFromRecurringTemplate(client, request.auth!, id, key));
  response.status(result.statusCode).json(result.body);
});

// Invoice templates
salesRouter.get('/invoice-templates', authorizeAny('sales.view', 'sales.read'), async (request, response) => {
  const result = await query('SELECT * FROM invoice_templates WHERE company_id=$1 AND is_active=true ORDER BY created_at DESC LIMIT 100', [request.auth!.companyId]);
  response.json({ data: serializeRows(result.rows) });
});
salesRouter.get('/invoice-templates/:id', authorizeAny('sales.view', 'sales.read'), async (request, response) => {
  const id = validate(uuidSchema, request.params.id);
  const template = await query('SELECT * FROM invoice_templates WHERE id=$1 AND company_id=$2', [id, request.auth!.companyId]);
  if (!template.rows[0]) throw new HttpError(404, 'TEMPLATE_NOT_FOUND', 'Invoice template not found');
  const items = await query('SELECT * FROM invoice_template_items WHERE template_id=$1 ORDER BY created_at', [id]);
  response.json({ data: { ...serializeRow(template.rows[0]), items: serializeRows(items.rows) } });
});
salesRouter.post('/invoice-templates', authorizeAny('sales.create', 'sales.write'), async (request, response) => {
  const input = validate(invoiceTemplateInputSchema, request.body);
  const result = await transaction((client) => createInvoiceTemplate(client, request.auth!, input));
  response.status(201).json({ data: serializeRow(result) });
});
salesRouter.delete('/invoice-templates/:id', authorizeAny('sales.create', 'sales.write'), async (request, response) => {
  const id = validate(uuidSchema, request.params.id);
  await transaction((client) => archiveInvoiceTemplate(client, request.auth!, id));
  response.status(204).send();
});
salesRouter.post('/invoice-templates/:id/create-invoice', authorizeAny('sales.create', 'sales.write'), async (request, response) => {
  const id = validate(uuidSchema, request.params.id);
  const key = request.header('Idempotency-Key');
  if (!key) throw new HttpError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key header is required');
  const input = validate(createInvoiceFromTemplateSchema, request.body);
  await requireWarehouseAccess({ query }, request.auth!, input.warehouseId);
  const result = await transaction((client) => createInvoiceFromTemplate(client, request.auth!, id, key, input));
  response.status(result.statusCode).json(result.body);
});

// Delivery notes
salesRouter.get('/delivery-notes', authorizeAny('sales.view', 'sales.read'), async (request, response) => {
  const values: unknown[] = [request.auth!.companyId];
  const scope = warehouseScopeSql(request.auth!, 'd.warehouse_id', values);
  const result = await query(
    `SELECT d.*, i.invoice_number FROM delivery_notes d LEFT JOIN sales_invoices i ON i.id = d.invoice_id
     WHERE d.company_id=$1${scope} ORDER BY d.delivery_date DESC, d.created_at DESC LIMIT 100`, values,
  );
  response.json({ data: serializeRows(result.rows) });
});
salesRouter.get('/delivery-notes/:id', authorizeAny('sales.view', 'sales.read'), async (request, response) => {
  const id = validate(uuidSchema, request.params.id);
  const note = await query('SELECT * FROM delivery_notes WHERE id=$1 AND company_id=$2', [id, request.auth!.companyId]);
  if (!note.rows[0]) throw new HttpError(404, 'DELIVERY_NOTE_NOT_FOUND', 'Delivery note not found');
  const items = await query('SELECT * FROM delivery_note_items WHERE delivery_note_id=$1 ORDER BY created_at', [id]);
  response.json({ data: { ...serializeRow(note.rows[0]), items: serializeRows(items.rows) } });
});
salesRouter.post('/delivery-notes', authorizeAny('sales.create', 'sales.write'), async (request, response) => {
  const input = validate(deliveryNoteInputSchema, request.body);
  if (input.warehouseId) await requireWarehouseAccess({ query }, request.auth!, input.warehouseId);
  const result = await transaction((client) => createDeliveryNote(client, request.auth!, input));
  response.status(201).json({ data: serializeRow(result) });
});
salesRouter.post('/delivery-notes/:id/actions', authorizeAny('sales.create', 'sales.write'), async (request, response) => {
  const id = validate(uuidSchema, request.params.id);
  const input = validate(deliveryNoteActionSchema, request.body);
  const result = await transaction((client) => actOnDeliveryNote(client, request.auth!, id, input.action));
  response.json({ data: serializeRow(result) });
});
