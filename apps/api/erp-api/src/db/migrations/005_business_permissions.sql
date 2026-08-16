INSERT INTO permissions (code, description) VALUES
  ('audit.read', 'View immutable audit events'),
  ('purchases.approve', 'Approve and reject purchase orders'),
  ('inventory.adjust', 'Post reasoned inventory adjustments'),
  ('accounting.close', 'Close or reopen accounting periods'),
  ('expenses.approve', 'Approve or reject expenses'),
  ('reconciliation.manage', 'Manage account reconciliation')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role, permission_code)
SELECT 'business_owner', code FROM permissions ON CONFLICT DO NOTHING;
INSERT INTO role_permissions (role, permission_code)
SELECT 'company_admin', code FROM permissions WHERE code <> 'roles.manage' ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_code) VALUES
  ('general_manager','audit.read'), ('general_manager','purchases.approve'),
  ('purchasing_manager','purchases.approve'),
  ('inventory_manager','inventory.adjust'),
  ('accountant','audit.read'), ('accountant','reconciliation.manage'),
  ('finance_manager','audit.read'), ('finance_manager','accounting.close'),
  ('finance_manager','expenses.approve'), ('finance_manager','reconciliation.manage'),
  ('auditor','audit.read')
ON CONFLICT DO NOTHING;
