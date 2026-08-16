import { afterAll, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pool } from '../../db/client.js';
import { databaseAvailable } from '../../test/db.js';

const mutationPattern = /\.(?:write|create|update|delete|approve|post|close|reopen|manage|adjust|receive|issue|transfer|process|refund|cancel|use)$/;

describe('default RBAC matrix', () => {
  it('defines every required default role with its responsibility permissions', async () => {
    if (!(await databaseAvailable())) return;
    const expected: Record<string, string[]> = {
      super_admin: ['companies.manage','roles.manage'], company_owner: ['dashboard.read','roles.manage'], system_admin: ['roles.manage','settings.manage'],
      branch_manager: ['branches.view','sales.view'], accountant: ['accounting.post','payments.receive'], finance_manager: ['accounting.close','expenses.approve'],
      sales_manager: ['sales.approve','customers.update'], sales_rep: ['sales.create'], cashier: ['pos.use'], purchase_manager: ['purchases.approve'],
      purchase_officer: ['purchases.create'], warehouse_manager: ['inventory.adjust','inventory.count'], storekeeper: ['inventory.receive','inventory.issue'],
      hr_manager: ['payroll.process','payroll.approve'], hr_officer: ['attendance.manage','hr.update'], auditor: ['audit.view'], employee: ['self_service.view'], viewer: ['reports.view'],
    };
    for (const [role, permissions] of Object.entries(expected)) {
      const result = await pool.query<{ permission_code: string }>('SELECT permission_code FROM role_permissions WHERE role=$1', [role]);
      expect(result.rows.map((item) => item.permission_code), role).toEqual(expect.arrayContaining(permissions));
    }
  });

  it('never grants mutation permissions to auditor or viewer', async () => {
    if (!(await databaseAvailable())) return;
    const result = await pool.query<{ role: string; permission_code: string }>(`SELECT role,permission_code FROM role_permissions WHERE role IN('auditor','viewer')`);
    expect(result.rows.filter((item) => mutationPattern.test(item.permission_code))).toEqual([]);
  });

  it.each(['cashier','pos_cashier'])('grants %s only POS access', async (role) => {
    if (!(await databaseAvailable())) return;
    const result = await pool.query<{ permission_code: string }>('SELECT permission_code FROM role_permissions WHERE role=$1 ORDER BY permission_code', [role]);
    expect(result.rows.map((item) => item.permission_code)).toEqual(['pos.use']);
  });

  it('can execute the permission migration repeatedly without changing assignments', async () => {
    if (!(await databaseAvailable())) return;
    const sql = await fs.readFile(path.resolve(process.cwd(), 'apps/api/erp-api/src/db/migrations/010_rbac_and_branch_scope.sql'), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      const first = await client.query<{ count: string }>('SELECT count(*) FROM role_permissions');
      await client.query(sql);
      const second = await client.query<{ count: string }>('SELECT count(*) FROM role_permissions');
      expect(second.rows[0].count).toBe(first.rows[0].count);
      const duplicates = await client.query(`SELECT role,permission_code,count(*) FROM role_permissions GROUP BY role,permission_code HAVING count(*)>1`);
      expect(duplicates.rows).toEqual([]);
    } finally { await client.query('ROLLBACK'); client.release(); }
  });
});

afterAll(async () => { await pool.end(); });
