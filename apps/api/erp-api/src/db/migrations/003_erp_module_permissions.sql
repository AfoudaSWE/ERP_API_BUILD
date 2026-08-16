INSERT INTO permissions (code, description) VALUES
  ('ai.read', 'Use the AI assistant'),
  ('pos.use', 'Use point of sale'),
  ('purchases.read', 'View purchase orders'),
  ('purchases.write', 'Create and manage purchase orders'),
  ('inventory.read', 'View inventory and stock movements'),
  ('inventory.write', 'Adjust and transfer inventory'),
  ('crm.read', 'View CRM leads and opportunities'),
  ('crm.write', 'Create and manage CRM leads'),
  ('accounting.read', 'View accounts and journal entries'),
  ('accounting.write', 'Post and manage accounting entries'),
  ('expenses.read', 'View expenses'),
  ('expenses.write', 'Create and approve expenses'),
  ('cash.read', 'View cash and bank accounts'),
  ('cash.write', 'Manage cash and bank transactions'),
  ('hr.read', 'View employees and HR data'),
  ('hr.write', 'Manage employees and HR data'),
  ('attendance.read', 'View attendance'),
  ('attendance.write', 'Manage attendance'),
  ('payroll.read', 'View payroll'),
  ('payroll.write', 'Process and approve payroll'),
  ('reports.read', 'View ERP reports'),
  ('branches.read', 'View branches'),
  ('branches.manage', 'Manage branches'),
  ('settings.read', 'View company settings'),
  ('settings.manage', 'Manage company settings'),
  ('notifications.read', 'View notifications'),
  ('help.read', 'View help content')
ON CONFLICT (code) DO NOTHING;

-- The owner is the tenant authority and receives every permission.
INSERT INTO role_permissions (role, permission_code)
SELECT 'business_owner', code FROM permissions ON CONFLICT DO NOTHING;

-- Company administrators operate all modules but cannot grant owner-level role management.
INSERT INTO role_permissions (role, permission_code)
SELECT 'company_admin', code FROM permissions WHERE code <> 'roles.manage' ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_code) VALUES
  ('general_manager','ai.read'), ('general_manager','pos.use'), ('general_manager','purchases.read'),
  ('general_manager','inventory.read'), ('general_manager','crm.read'), ('general_manager','accounting.read'),
  ('general_manager','expenses.read'), ('general_manager','cash.read'), ('general_manager','hr.read'),
  ('general_manager','attendance.read'), ('general_manager','payroll.read'), ('general_manager','reports.read'),
  ('general_manager','branches.read'), ('general_manager','settings.read'), ('general_manager','notifications.read'), ('general_manager','help.read'),

  ('sales_manager','pos.use'), ('sales_manager','crm.read'), ('sales_manager','crm.write'),
  ('sales_manager','inventory.read'), ('sales_manager','reports.read'), ('sales_manager','notifications.read'), ('sales_manager','help.read'),
  ('sales_rep','pos.use'), ('sales_rep','crm.read'), ('sales_rep','crm.write'), ('sales_rep','inventory.read'),
  ('sales_rep','notifications.read'), ('sales_rep','help.read'),

  ('inventory_manager','inventory.read'), ('inventory_manager','inventory.write'), ('inventory_manager','suppliers.read'),
  ('inventory_manager','purchases.read'), ('inventory_manager','reports.read'), ('inventory_manager','notifications.read'), ('inventory_manager','help.read'),
  ('warehouse_employee','dashboard.read'), ('warehouse_employee','products.read'), ('warehouse_employee','inventory.read'),
  ('warehouse_employee','inventory.write'), ('warehouse_employee','notifications.read'), ('warehouse_employee','help.read'),

  ('purchasing_manager','purchases.read'), ('purchasing_manager','purchases.write'), ('purchasing_manager','inventory.read'),
  ('purchasing_manager','reports.read'), ('purchasing_manager','notifications.read'), ('purchasing_manager','help.read'),

  ('accountant','accounting.read'), ('accountant','accounting.write'), ('accountant','expenses.read'), ('accountant','expenses.write'),
  ('accountant','cash.read'), ('accountant','cash.write'), ('accountant','purchases.read'), ('accountant','payroll.read'),
  ('accountant','reports.read'), ('accountant','notifications.read'), ('accountant','help.read'),
  ('finance_manager','accounting.read'), ('finance_manager','accounting.write'), ('finance_manager','expenses.read'), ('finance_manager','expenses.write'),
  ('finance_manager','cash.read'), ('finance_manager','cash.write'), ('finance_manager','purchases.read'), ('finance_manager','payroll.read'),
  ('finance_manager','payroll.write'), ('finance_manager','reports.read'), ('finance_manager','notifications.read'), ('finance_manager','help.read'),

  ('hr_manager','dashboard.read'), ('hr_manager','hr.read'), ('hr_manager','hr.write'), ('hr_manager','attendance.read'),
  ('hr_manager','attendance.write'), ('hr_manager','payroll.read'), ('hr_manager','reports.read'), ('hr_manager','notifications.read'), ('hr_manager','help.read'),
  ('payroll_officer','dashboard.read'), ('payroll_officer','hr.read'), ('payroll_officer','attendance.read'),
  ('payroll_officer','payroll.read'), ('payroll_officer','payroll.write'), ('payroll_officer','reports.read'), ('payroll_officer','notifications.read'), ('payroll_officer','help.read'),

  ('branch_manager','dashboard.read'), ('branch_manager','pos.use'), ('branch_manager','sales.read'), ('branch_manager','sales.write'),
  ('branch_manager','products.read'), ('branch_manager','customers.read'), ('branch_manager','customers.write'),
  ('branch_manager','inventory.read'), ('branch_manager','expenses.read'), ('branch_manager','expenses.write'),
  ('branch_manager','attendance.read'), ('branch_manager','reports.read'), ('branch_manager','branches.read'), ('branch_manager','notifications.read'), ('branch_manager','help.read'),
  ('pos_cashier','dashboard.read'), ('pos_cashier','pos.use'), ('pos_cashier','sales.read'), ('pos_cashier','sales.write'),
  ('pos_cashier','products.read'), ('pos_cashier','customers.read'), ('pos_cashier','customers.write'), ('pos_cashier','notifications.read'), ('pos_cashier','help.read'),
  ('crm_agent','dashboard.read'), ('crm_agent','crm.read'), ('crm_agent','crm.write'), ('crm_agent','customers.read'),
  ('crm_agent','customers.write'), ('crm_agent','sales.read'), ('crm_agent','notifications.read'), ('crm_agent','help.read'),
  ('auditor','dashboard.read'), ('auditor','products.read'), ('auditor','customers.read'), ('auditor','suppliers.read'),
  ('auditor','sales.read'), ('auditor','purchases.read'), ('auditor','inventory.read'), ('auditor','accounting.read'),
  ('auditor','expenses.read'), ('auditor','cash.read'), ('auditor','hr.read'), ('auditor','attendance.read'),
  ('auditor','payroll.read'), ('auditor','reports.read'), ('auditor','branches.read'), ('auditor','settings.read'), ('auditor','notifications.read'), ('auditor','help.read'),

  ('employee','attendance.read'), ('employee','notifications.read'), ('employee','help.read')
ON CONFLICT DO NOTHING;
