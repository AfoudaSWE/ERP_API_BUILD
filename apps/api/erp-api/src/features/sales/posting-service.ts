import type { PoolClient } from 'pg';
import type { SalesPostingInput } from '@erp/contracts';
import { formatDecimal, parseDecimal, roundHalfAwayFromZero } from '@erp/contracts';
import { HttpError } from '../../lib/http.js';
import { nextDocumentNumber } from '../../lib/document-number.js';
import { beginIdempotent, completeIdempotent } from '../../lib/idempotency.js';
import { appendAuditEvent } from '../audit/routes.js';
import { issueInventory } from '../inventory/service.js';
import { postJournal } from '../accounting/posting-service.js';

export async function postSalesInvoice(client: PoolClient, auth: Express.Request['auth'] & {}, operationKey: string, input: SalesPostingInput) {
  const attempt = await beginIdempotent(client, { companyId: auth.companyId, key: operationKey, action: 'sales_invoice.post', body: input });
  if (attempt.kind === 'replay') return attempt;
  if (input.customerId) {
    const customer = await client.query('SELECT id FROM customers WHERE id=$1 AND company_id=$2 AND is_active=true FOR UPDATE', [input.customerId, auth.companyId]);
    if (!customer.rows[0]) throw new HttpError(422, 'INVALID_CUSTOMER', 'Customer is not active in this company');
  }
  const warehouseId = input.warehouseId ?? (await client.query<{ id: string }>('SELECT id FROM warehouses WHERE company_id=$1 AND is_active=true ORDER BY created_at LIMIT 1', [auth.companyId])).rows[0]?.id;
  if (!warehouseId) throw new HttpError(422, 'WAREHOUSE_REQUIRED', 'Create or select an active warehouse');
  const warehouse = await client.query('SELECT id FROM warehouses WHERE id=$1 AND company_id=$2 AND is_active=true', [warehouseId, auth.companyId]);
  if (!warehouse.rows[0]) throw new HttpError(422, 'INVALID_WAREHOUSE', 'Warehouse is not active in this company');

  const calculated = input.items.map((item) => {
    const quantity = parseDecimal(item.quantity, 3); const price = parseDecimal(item.unitPrice, 2);
    const base = roundHalfAwayFromZero(quantity * price, 1000n);
    const tax = roundHalfAwayFromZero(base * parseDecimal(item.taxRate, 4), 1_000_000n);
    return { item, base, tax, total: base + tax };
  });
  const grossSubtotal = calculated.reduce((sum, row) => sum + row.base, 0n);
  const discount = parseDecimal(input.discountAmount, 2);
  if (discount >= grossSubtotal) throw new HttpError(422, 'INVALID_DISCOUNT', 'Discount must be less than subtotal');
  const tax = calculated.reduce((sum, row) => sum + row.tax, 0n);
  const total = grossSubtotal - discount + tax;
  const initialPayment = parseDecimal(input.initialPayment, 2);
  if (initialPayment > total) throw new HttpError(409, 'OVERPAYMENT', 'Initial payment cannot exceed invoice total');
  const invoiceNumber = await nextDocumentNumber(client, { companyId: auth.companyId, documentType: 'sales_invoice', prefix: 'INV', businessDate: input.invoiceDate });
  const invoice = await client.query<{ id: string }>(`INSERT INTO sales_invoices(company_id,customer_id,warehouse_id,invoice_number,customer_name,invoice_date,due_date,subtotal,discount_amount,tax_amount,total,paid_amount,remaining_amount,payment_status,currency,operation_key,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id`, [auth.companyId,input.customerId??null,warehouseId,invoiceNumber,input.customerName??null,input.invoiceDate,input.dueDate??null,formatDecimal(grossSubtotal,2),input.discountAmount,formatDecimal(tax,2),formatDecimal(total,2),formatDecimal(initialPayment,2),formatDecimal(total-initialPayment,2),initialPayment===total?'paid':initialPayment>0n?'partial':'unpaid',input.currency,operationKey,auth.userId]);
  let costTotal = 0n;
  for (const row of calculated) {
    const averageCost = await issueInventory(client, { companyId: auth.companyId, warehouseId, productId: row.item.productId, quantity: row.item.quantity });
    const item = await client.query<{ id: string }>(`INSERT INTO sales_invoice_items(invoice_id,product_id,description,quantity,unit_price,cost_price,tax_rate,tax_amount,total) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`, [invoice.rows[0].id,row.item.productId,row.item.description,row.item.quantity,row.item.unitPrice,averageCost,row.item.taxRate,formatDecimal(row.tax,2),formatDecimal(row.total,2)]);
    const cost = roundHalfAwayFromZero(parseDecimal(row.item.quantity,3)*parseDecimal(averageCost,2),1000n); costTotal += cost;
    await client.query(`INSERT INTO stock_movements(company_id,warehouse_id,product_id,movement_type,quantity,unit_cost,source_type,source_id,source_line_id,operation_key,business_date,created_by) VALUES($1,$2,$3,'issue',$4::numeric * -1,$5,'sales_invoice',$6,$7,$8,$9,$10)`, [auth.companyId,warehouseId,row.item.productId,row.item.quantity,averageCost,invoice.rows[0].id,item.rows[0].id,operationKey,input.invoiceDate,auth.userId]);
  }
  const revenue = grossSubtotal-discount;
  const saleLines=[{accountRole:'receivable',debit:formatDecimal(total,2),credit:'0',partyType:input.customerId?'customer':undefined,partyId:input.customerId},{accountRole:'sales_revenue',debit:'0',credit:formatDecimal(revenue,2)}];
  if(tax>0n) saleLines.push({accountRole:'tax_payable',debit:'0',credit:formatDecimal(tax,2)});
  await postJournal(client,{companyId:auth.companyId,userId:auth.userId,businessDate:input.invoiceDate,description:`Sales invoice ${invoiceNumber}`,sourceType:'sales_invoice',sourceId:invoice.rows[0].id,postingType:'sale',operationKey,lines:saleLines});
  if(costTotal>0n) await postJournal(client,{companyId:auth.companyId,userId:auth.userId,businessDate:input.invoiceDate,description:`COGS ${invoiceNumber}`,sourceType:'sales_invoice',sourceId:invoice.rows[0].id,postingType:'cogs',operationKey:`${operationKey}:cogs`,lines:[{accountRole:'cogs',debit:formatDecimal(costTotal,2),credit:'0'},{accountRole:'inventory',debit:'0',credit:formatDecimal(costTotal,2)}]});
  if(input.customerId) await client.query(`UPDATE customers SET total_sales=total_sales+$1::numeric,total_paid=total_paid+$2::numeric,balance=balance+$3::numeric,updated_at=now() WHERE id=$4 AND company_id=$5`,[formatDecimal(total,2),formatDecimal(initialPayment,2),formatDecimal(total-initialPayment,2),input.customerId,auth.companyId]);
  if(initialPayment>0n){
    const paymentNumber=await nextDocumentNumber(client,{companyId:auth.companyId,documentType:'customer_payment',prefix:'PAY',businessDate:input.invoiceDate});
    const payment=await client.query<{id:string}>(`INSERT INTO customer_payments(company_id,payment_number,customer_id,amount,method,business_date,operation_key,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,[auth.companyId,paymentNumber,input.customerId??null,formatDecimal(initialPayment,2),input.paymentMethod,input.invoiceDate,`${operationKey}:payment`,auth.userId]);
    await client.query(`INSERT INTO payment_allocations(payment_id,invoice_id,amount) VALUES($1,$2,$3)`,[payment.rows[0].id,invoice.rows[0].id,formatDecimal(initialPayment,2)]);
    await postJournal(client,{companyId:auth.companyId,userId:auth.userId,businessDate:input.invoiceDate,description:`Payment ${paymentNumber}`,sourceType:'customer_payment',sourceId:payment.rows[0].id,postingType:'receipt',operationKey:`${operationKey}:payment`,lines:[{accountRole:'cash',debit:formatDecimal(initialPayment,2),credit:'0'},{accountRole:'receivable',debit:'0',credit:formatDecimal(initialPayment,2),partyType:input.customerId?'customer':undefined,partyId:input.customerId}]});
  }
  const body={data:{id:invoice.rows[0].id,invoiceNumber,total:formatDecimal(total,2),paidAmount:formatDecimal(initialPayment,2),remainingAmount:formatDecimal(total-initialPayment,2)}};
  await appendAuditEvent(client,{tenantId:auth.tenantId,companyId:auth.companyId,actorUserId:auth.userId,action:'sales_invoice.posted',entityType:'sales_invoice',entityId:invoice.rows[0].id,operationKey,after:body.data});
  await completeIdempotent(client,{companyId:auth.companyId,key:operationKey,resourceType:'sales_invoice',resourceId:invoice.rows[0].id,statusCode:201,body});
  return {kind:'created' as const,statusCode:201,body};
}
