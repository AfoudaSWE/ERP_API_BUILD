import bcrypt from 'bcryptjs';
import { pool, transaction } from './client.js';

const ids = {
  tenant: '10000000-0000-4000-8000-000000000001',
  company: '20000000-0000-4000-8000-000000000001',
  user: '30000000-0000-4000-8000-000000000001',
};

const roles = [
  'super_admin', 'company_owner', 'system_admin', 'cashier', 'purchase_manager', 'purchase_officer',
  'warehouse_manager', 'storekeeper', 'hr_officer', 'viewer',
  'company_admin', 'general_manager', 'sales_manager', 'sales_rep', 'inventory_manager',
  'warehouse_employee', 'purchasing_manager', 'accountant', 'finance_manager', 'hr_manager',
  'payroll_officer', 'branch_manager', 'pos_cashier', 'crm_agent', 'auditor', 'employee',
] as const;

export async function seed() {
  const passwordHash = await bcrypt.hash('Demo1234!', 12);
  await transaction(async (client) => {
    await client.query(
      `INSERT INTO tenants (id,name,slug) VALUES ($1,'Demo SME','demo-sme')
       ON CONFLICT (id) DO UPDATE SET name=excluded.name`,
      [ids.tenant],
    );
    await client.query(
      `INSERT INTO companies (id,tenant_id,name,name_ar,currency) VALUES ($1,$2,'SME ERP','','EGP')
       ON CONFLICT (id) DO UPDATE SET name=excluded.name`,
      [ids.company, ids.tenant],
    );
    await client.query(
      `INSERT INTO users (id,tenant_id,company_id,email,password_hash,name,role)
       VALUES ($1,$2,$3,'owner@demo.erp',$4,'Business Owner','business_owner')
       ON CONFLICT (tenant_id,email) DO UPDATE
       SET password_hash=excluded.password_hash,name=excluded.name,role=excluded.role,is_active=true,updated_at=now()`,
      [ids.user, ids.tenant, ids.company, passwordHash],
    );

    for (const role of roles) {
      const displayName = role.split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ');
      await client.query(
        `INSERT INTO users (tenant_id,company_id,email,password_hash,name,role)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (tenant_id,email) DO UPDATE
         SET password_hash=excluded.password_hash,name=excluded.name,role=excluded.role,is_active=true,updated_at=now()`,
        [ids.tenant, ids.company, `${role}@demo.erp`, passwordHash, displayName, role],
      );
    }
    await client.query(`INSERT INTO user_branch_assignments(user_id,branch_id)
      SELECT u.id,b.id FROM users u JOIN default_roles r ON r.code=u.role AND r.scope_level='branch'
      JOIN branches b ON b.company_id=u.company_id AND b.code='MAIN' WHERE u.tenant_id=$1 AND u.company_id=$2
      ON CONFLICT DO NOTHING`, [ids.tenant, ids.company]);
  });
  console.log('Seeded authentication users and roles only. Login: owner@demo.erp / Demo1234!');
}

if (require.main === module) {
  seed().then(() => pool.end()).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
