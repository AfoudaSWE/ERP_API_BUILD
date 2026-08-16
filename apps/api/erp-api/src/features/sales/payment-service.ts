import type { PoolClient } from 'pg';
import type { PaymentInput } from '@erp/contracts';
import { parseDecimal, formatDecimal } from '@erp/contracts';
import { HttpError } from '../../lib/http.js';
import { beginIdempotent, completeIdempotent } from '../../lib/idempotency.js';
import { nextDocumentNumber } from '../../lib/document-number.js';
import { postJournal } from '../accounting/posting-service.js';
import { appendAuditEvent } from '../audit/routes.js';

export async function postCustomerPayment(client:PoolClient,auth:Express.Request['auth']&{},invoiceId:string,key:string,input:PaymentInput){
  const attempt=await beginIdempotent(client,{companyId:auth.companyId,key,action:'customer_payment.post',body:{invoiceId,...input}}); if(attempt.kind==='replay')return attempt;
  const result=await client.query<{id:string;customer_id:string|null;remaining_amount:string}>(`SELECT id,customer_id,remaining_amount FROM sales_invoices WHERE id=$1 AND company_id=$2 FOR UPDATE`,[invoiceId,auth.companyId]);
  const invoice=result.rows[0]; if(!invoice)throw new HttpError(404,'INVOICE_NOT_FOUND','Invoice not found');
  const amount=parseDecimal(input.amount,2); if(amount>parseDecimal(invoice.remaining_amount,2))throw new HttpError(409,'OVER_ALLOCATION','Payment exceeds invoice outstanding amount');
  const number=await nextDocumentNumber(client,{companyId:auth.companyId,documentType:'customer_payment',prefix:'PAY',businessDate:input.businessDate});
  const payment=await client.query<{id:string}>(`INSERT INTO customer_payments(company_id,payment_number,customer_id,amount,method,reference,business_date,operation_key,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,[auth.companyId,number,invoice.customer_id,input.amount,input.method,input.reference??null,input.businessDate,key,auth.userId]);
  await client.query(`INSERT INTO payment_allocations(payment_id,invoice_id,amount) VALUES($1,$2,$3)`,[payment.rows[0].id,invoiceId,input.amount]);
  const remaining=parseDecimal(invoice.remaining_amount,2)-amount;
  await client.query(`UPDATE sales_invoices SET paid_amount=paid_amount+$1::numeric,remaining_amount=$2,payment_status=$3,updated_at=now() WHERE id=$4`,[input.amount,formatDecimal(remaining,2),remaining===0n?'paid':'partial',invoiceId]);
  if(invoice.customer_id)await client.query(`UPDATE customers SET total_paid=total_paid+$1::numeric,balance=balance-$1::numeric,updated_at=now() WHERE id=$2 AND company_id=$3`,[input.amount,invoice.customer_id,auth.companyId]);
  await postJournal(client,{companyId:auth.companyId,userId:auth.userId,businessDate:input.businessDate,description:`Customer payment ${number}`,sourceType:'customer_payment',sourceId:payment.rows[0].id,postingType:'receipt',operationKey:key,lines:[{accountRole:'cash',debit:input.amount,credit:'0'},{accountRole:'receivable',debit:'0',credit:input.amount,partyType:invoice.customer_id?'customer':undefined,partyId:invoice.customer_id??undefined}]});
  const body={data:{id:payment.rows[0].id,paymentNumber:number,amount:input.amount,remainingAmount:formatDecimal(remaining,2)}};
  await appendAuditEvent(client,{tenantId:auth.tenantId,companyId:auth.companyId,actorUserId:auth.userId,action:'customer_payment.posted',entityType:'customer_payment',entityId:payment.rows[0].id,operationKey:key,after:body.data});
  await completeIdempotent(client,{companyId:auth.companyId,key,resourceType:'customer_payment',resourceId:payment.rows[0].id,statusCode:201,body}); return {kind:'created' as const,statusCode:201,body};
}
