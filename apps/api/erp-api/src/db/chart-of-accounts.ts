import { transaction } from './client.js';

export const chartOfAccountsTemplate = [
  ['1000', 'Cash', 'النقدية', 'asset', 'cash'],
  ['1010', 'Bank', 'البنك', 'asset', 'bank'],
  ['1200', 'Accounts receivable', 'العملاء', 'asset', 'receivable'],
  ['1100', 'Inventory', 'المخزون', 'asset', 'inventory'],
  ['1300', 'Input VAT', 'ضريبة مدخلات', 'asset', 'input_tax'],
  ['2000', 'Accounts payable', 'الموردون', 'liability', 'payable'],
  ['2100', 'Goods received not invoiced', 'بضاعة مستلمة غير مفوترة', 'liability', 'grni'],
  ['2200', 'Output VAT', 'ضريبة مخرجات', 'liability', 'tax_payable'],
  ['3000', 'Owner equity', 'حقوق الملكية', 'equity', 'equity'],
  ['4000', 'Sales revenue', 'إيرادات المبيعات', 'revenue', 'sales_revenue'],
  ['5000', 'Cost of goods sold', 'تكلفة البضاعة المباعة', 'expense', 'cogs'],
  ['6000', 'Operating expenses', 'مصروفات التشغيل', 'expense', 'expense'],
  ['6100', 'Bank fees', 'رسوم بنكية', 'expense', 'bank_fee'],
] as const;

export async function seedAccounting() {
  await transaction(async (client) => {
    const companies = await client.query<{ id: string }>('SELECT id FROM companies');
    for (const company of companies.rows) for (const account of chartOfAccountsTemplate) {
      await client.query(`INSERT INTO ledger_accounts(company_id,code,name,name_ar,account_type,system_role,allow_manual_posting,is_active) VALUES($1,$2,$3,$4,$5,$6,true,true) ON CONFLICT(company_id,code) DO UPDATE SET name=excluded.name,name_ar=excluded.name_ar,account_type=excluded.account_type,system_role=excluded.system_role,allow_manual_posting=true,is_active=true`, [company.id, ...account]);
    }
  });
  console.log('Accounting templates ready');
}
