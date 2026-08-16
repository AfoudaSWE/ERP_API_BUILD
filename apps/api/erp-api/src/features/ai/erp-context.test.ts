import { describe, expect, it } from 'vitest';
import type { QueryResultRow } from 'pg';
import { buildAuthorizedErpContext, serializeErpContext, type ContextQuery } from './erp-context.js';

function recorder() {
  const calls: { sql: string; values: unknown[] }[] = [];
  const execute: ContextQuery = async <T extends QueryResultRow>(sql: string, values: unknown[] = []) => {
    calls.push({ sql, values });
    return { rows: [{}] as T[] };
  };
  return { calls, execute };
}

describe('authorized ERP chat context', () => {
  it('does not retrieve modules the user cannot read', async () => {
    const { calls, execute } = recorder();
    const context = await buildAuthorizedErpContext(execute, { userId: 'user', companyId: 'company', permissions: ['ai.read'] });
    expect(Object.keys(context)).toEqual(['company']);
    expect(calls.every((call) => call.values[0] === 'company')).toBe(true);
    expect(calls.some((call) => call.sql.includes('sales_invoices'))).toBe(false);
  });

  it('retrieves every authorized module with company and assigned-branch filters', async () => {
    const { calls, execute } = recorder();
    const branchId = '30000000-0000-4000-8000-000000000001';
    const permissions = ['branches.view','sales.view','payments.view','purchases.view','inventory.view','customers.view','suppliers.view','expenses.view','accounting.view','cash.view','audit.view','roles.read'];
    const context = await buildAuthorizedErpContext(execute, { userId: 'user', companyId: 'company', permissions, branchIds: [branchId] });
    expect(Object.keys(context)).toEqual(expect.arrayContaining(['company','branches','sales','payments','purchases','inventory','customers','suppliers','expenses','accounting','cash','audit','usersAndRoles']));
    expect(calls.every((call) => call.values.includes('company'))).toBe(true);
    const operational = calls.filter((call) => /sales_invoices|purchase_orders|inventory_balances|customer_payments|FROM expenses/.test(call.sql));
    expect(operational.length).toBeGreaterThan(0);
    expect(operational.every((call) => call.sql.includes('branch_id=ANY') && call.values.some((value) => Array.isArray(value) && value.includes(branchId)))).toBe(true);
  });

  it('caps serialized context before it reaches Ollama', () => {
    expect(serializeErpContext({ records: ['x'.repeat(100)] }, 30)).toContain('context truncated');
  });
});
