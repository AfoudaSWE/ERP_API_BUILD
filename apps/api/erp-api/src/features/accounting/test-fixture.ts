import { randomUUID } from 'node:crypto';
import { pool, transaction } from '../../db/client.js';

export async function createAccountingFixture() {
  const tenantId=randomUUID(),companyId=randomUUID(),userId=randomUUID(),companyName=`Accounting Test ${tenantId}`;
  await pool.query(`INSERT INTO tenants(id,name,slug)VALUES($1,$2,$3)`,[tenantId,companyName,`accounting-${tenantId}`]);
  await pool.query(`INSERT INTO companies(id,tenant_id,name)VALUES($1,$2,$3)`,[companyId,tenantId,companyName]);
  await pool.query(`INSERT INTO users(id,tenant_id,company_id,email,password_hash,name,role)VALUES($1,$2,$3,$4,'test','Accountant','accountant')`,[userId,tenantId,companyId,`${userId}@test.local`]);
  const ids:string[]=[]; for(const [code,name,type,role] of [['1000','Cash','asset','cash'],['3000','Equity','equity','equity']]){const id=randomUUID();ids.push(id);await pool.query(`INSERT INTO ledger_accounts(id,company_id,code,name,account_type,system_role,allow_manual_posting)VALUES($1,$2,$3,$4,$5,$6,true)`,[id,companyId,code,name,type,role]);}
  return{tenantId,companyId,userId,accountIds:ids};
}
export async function cleanupAccountingFixture(tenantId:string){const company=(await pool.query<{id:string}>('SELECT id FROM companies WHERE tenant_id=$1',[tenantId])).rows[0];if(!company)return;await transaction(async c=>{await c.query(`SET LOCAL session_replication_role='replica'`);for(const sql of [`DELETE FROM journal_lines WHERE journal_entry_id IN(SELECT id FROM journal_entries WHERE company_id=$1)`,`DELETE FROM journal_entries WHERE company_id=$1`,`DELETE FROM accounting_periods WHERE company_id=$1`,`DELETE FROM document_sequences WHERE company_id=$1`,`DELETE FROM audit_events WHERE company_id=$1`,`DELETE FROM ledger_accounts WHERE company_id=$1`,`DELETE FROM users WHERE company_id=$1`,`DELETE FROM companies WHERE id=$1`])await c.query(sql,[company.id]);});await pool.query('DELETE FROM tenants WHERE id=$1',[tenantId]);}
