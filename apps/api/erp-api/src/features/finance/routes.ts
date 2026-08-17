import{Router}from'express';import{budgetInputSchema,expenseActionSchema,expenseCategoryInputSchema,expenseInputSchema,financialAccountInputSchema,reconciliationActionSchema,reconciliationInputSchema,taxRateInputSchema,transferInputSchema,uuidSchema}from'@erp/contracts';import{query,transaction}from'../../db/client.js';import{HttpError,validate}from'../../lib/http.js';import{serializeDecimalRow,serializeDecimalRows}from'../../lib/rows.js';import{authorize,authorizeAny}from'../auth/middleware.js';import{nextDocumentNumber}from'../../lib/document-number.js';import{postTransfer}from'./account-service.js';import{actOnExpense}from'./expense-service.js';import{actOnReconciliation,createReconciliation}from'./reconciliation-service.js';import{beginIdempotent,completeIdempotent}from'../../lib/idempotency.js';
import{branchScopeSql,requireExpenseAccess,selectedBranchId}from'../auth/data-scope.js';
import{createCrudRouter}from'../shared/crud-router.js';
export const financeRouter=Router();
financeRouter.use('/expense-categories',createCrudRouter({table:'expense_categories',permissionBase:'expenses',schema:expenseCategoryInputSchema,searchColumns:['name','name_ar'],columns:{name:'name',nameAr:'name_ar',isActive:'is_active'}}));
financeRouter.use('/tax-rates',createCrudRouter({table:'tax_rates',permissionBase:'accounting',schema:taxRateInputSchema,searchColumns:['name'],columns:{name:'name',rate:'rate',isDefault:'is_default',isActive:'is_active'}}));
financeRouter.get('/accounts',authorize('cash.read'),async(req,res)=>res.json({data:serializeDecimalRows((await query(`SELECT * FROM financial_accounts WHERE company_id=$1 ORDER BY name`,[req.auth!.companyId])).rows)}));
financeRouter.post('/accounts',authorize('cash.manage'),async(req,res)=>{const i=validate(financialAccountInputSchema,req.body);const row=(await query(`INSERT INTO financial_accounts(company_id,name,account_type,currency,balance)VALUES($1,$2,$3,$4,$5)RETURNING *`,[req.auth!.companyId,i.name,i.type,i.currency,i.openingBalance])).rows[0];res.status(201).json({data:serializeDecimalRow(row)});});
financeRouter.get('/movements',authorize('cash.read'),async(req,res)=>res.json({data:serializeDecimalRows((await query(`SELECT m.*,a.name account_name FROM financial_movements m JOIN financial_accounts a ON a.id=m.account_id WHERE m.company_id=$1 ORDER BY business_date DESC,created_at DESC LIMIT 200`,[req.auth!.companyId])).rows)}));
financeRouter.post('/transfers',authorize('cash.manage'),async(req,res)=>{const key=req.header('Idempotency-Key');if(!key)throw new HttpError(400,'IDEMPOTENCY_KEY_REQUIRED','Idempotency-Key header is required');const input=validate(transferInputSchema,req.body);const result=await transaction(async c=>{const attempt=await beginIdempotent(c,{companyId:req.auth!.companyId,key,action:'transfer.create',body:input});if(attempt.kind==='replay')return attempt;const data=await postTransfer(c,req.auth!.companyId,req.auth!.userId,key,input);const body={data};await completeIdempotent(c,{companyId:req.auth!.companyId,key,resourceType:'financial_transfer',resourceId:data.id,statusCode:201,body});return{kind:'created' as const,statusCode:201,body};});res.status(result.statusCode).json(result.body);});
financeRouter.get('/expenses',authorize('expenses.read'),async(req,res)=>{const values:unknown[]=[req.auth!.companyId],scope=branchScopeSql(req.auth!,'branch_id',values);res.json({data:serializeDecimalRows((await query(`SELECT * FROM expenses WHERE company_id=$1${scope} ORDER BY expense_date DESC,created_at DESC`,values)).rows)});});
financeRouter.post('/expenses',authorize('expenses.create'),async(req,res)=>{const i=validate(expenseInputSchema,req.body),branchId=selectedBranchId(req.auth!,req.header('x-branch-id'));const data=await transaction(async c=>{const n=await nextDocumentNumber(c,{companyId:req.auth!.companyId,documentType:'expense',prefix:'EXP',businessDate:i.expenseDate});return(await c.query(`INSERT INTO expenses(company_id,branch_id,expense_number,description,amount,tax_amount,total,expense_date,payment_method,status,category_id)VALUES($1,$2,$3,$4,$5,$6,$5::numeric+$6::numeric,$7,$8,'draft',$9)RETURNING *`,[req.auth!.companyId,branchId,n,i.description,i.amount,i.taxAmount,i.expenseDate,i.paymentMethod,i.categoryId??null])).rows[0];});res.status(201).json({data:serializeDecimalRow(data)});});
financeRouter.post('/expenses/:id/actions',authorize('expenses.approve'),async(req,res)=>{const id=validate(uuidSchema,req.params.id),i=validate(expenseActionSchema,req.body);await requireExpenseAccess({query},req.auth!,id);const data=await transaction(c=>actOnExpense(c,req.auth!.companyId,req.auth!.userId,id,i.action,i.accountId));res.json({data:serializeDecimalRow(data)});});
financeRouter.get('/reconciliations',authorize('reconciliation.manage'),async(req,res)=>res.json({data:serializeDecimalRows((await query(`SELECT * FROM reconciliations WHERE company_id=$1 ORDER BY created_at DESC`,[req.auth!.companyId])).rows)}));
financeRouter.post('/reconciliations',authorize('reconciliation.manage'),async(req,res)=>{const i=validate(reconciliationInputSchema,req.body);res.status(201).json({data:await transaction(c=>createReconciliation(c,req.auth!.companyId,req.auth!.userId,i))});});
financeRouter.post('/reconciliations/:id/actions',authorize('reconciliation.manage'),async(req,res)=>{const id=validate(uuidSchema,req.params.id),i=validate(reconciliationActionSchema,req.body);res.json({data:serializeDecimalRow(await transaction(c=>actOnReconciliation(c,req.auth!.companyId,id,i.action,i.lineId,i.movementId)))});});

financeRouter.get('/budgets',authorizeAny('accounting.read','accounting.write'),async(req,res)=>{
  const rows=(await query(`SELECT b.*,c.name category_name,COALESCE((SELECT sum(e.amount+e.tax_amount) FROM expenses e WHERE e.company_id=b.company_id AND e.status<>'rejected' AND (b.category_id IS NULL OR e.category_id=b.category_id) AND e.expense_date BETWEEN b.period_start AND b.period_end),0) actual_spend
    FROM budgets b LEFT JOIN expense_categories c ON c.id=b.category_id WHERE b.company_id=$1 ORDER BY b.period_start DESC`,[req.auth!.companyId])).rows;
  res.json({data:serializeDecimalRows(rows)});
});
financeRouter.post('/budgets',authorizeAny('accounting.write'),async(req,res)=>{
  const i=validate(budgetInputSchema,req.body);
  const row=(await query(`INSERT INTO budgets(company_id,name,category_id,period_start,period_end,amount,notes,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[req.auth!.companyId,i.name,i.categoryId??null,i.periodStart,i.periodEnd,i.amount,i.notes,req.auth!.userId])).rows[0];
  res.status(201).json({data:serializeDecimalRow(row)});
});
financeRouter.delete('/budgets/:id',authorizeAny('accounting.write'),async(req,res)=>{
  const row=(await query('DELETE FROM budgets WHERE id=$1 AND company_id=$2 RETURNING id',[req.params.id,req.auth!.companyId])).rows[0];
  if(!row)throw new HttpError(404,'NOT_FOUND','Budget not found');
  res.status(204).send();
});

financeRouter.get('/payments',authorizeAny('expenses.read','accounting.read'),async(req,res)=>{
  const rows=(await query(`
    SELECT id,'in' AS direction,amount,business_date,method,reference,'customer_payment' AS source FROM customer_payments WHERE company_id=$1
    UNION ALL
    SELECT id,'out' AS direction,(amount+tax_amount) AS amount,expense_date AS business_date,payment_method AS method,description AS reference,'expense' AS source FROM expenses WHERE company_id=$1 AND status='paid'
    ORDER BY business_date DESC LIMIT 100`,[req.auth!.companyId])).rows;
  res.json({data:serializeDecimalRows(rows)});
});

financeRouter.get('/cashflow',authorizeAny('accounting.read','cash.read'),async(req,res)=>{
  const rows=(await query(`
    SELECT to_char(date_trunc('month',business_date),'YYYY-MM') AS month,
      COALESCE(sum(amount) FILTER (WHERE amount>0),0) AS cash_in,
      COALESCE(-sum(amount) FILTER (WHERE amount<0),0) AS cash_out
    FROM financial_movements WHERE company_id=$1 AND business_date>=(current_date-interval '12 months')
    GROUP BY 1 ORDER BY 1`,[req.auth!.companyId])).rows;
  res.json({data:serializeDecimalRows(rows)});
});
