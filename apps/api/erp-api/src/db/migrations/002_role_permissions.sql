CREATE TABLE permissions (
  code text PRIMARY KEY,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE role_permissions (
  role text NOT NULL,
  permission_code text NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_code)
);

INSERT INTO permissions (code, description) VALUES
  ('dashboard.read', 'View business dashboard'),
  ('products.read', 'View products and inventory'),
  ('products.write', 'Create, update, and delete products'),
  ('customers.read', 'View customers'),
  ('customers.write', 'Create, update, and delete customers'),
  ('suppliers.read', 'View suppliers'),
  ('suppliers.write', 'Create, update, and delete suppliers'),
  ('sales.read', 'View sales invoices'),
  ('sales.write', 'Create sales invoices'),
  ('roles.read', 'View roles and permission assignments'),
  ('roles.manage', 'Change user roles and permission assignments')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role, permission_code)
SELECT 'business_owner', code FROM permissions
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_code) VALUES
  ('company_admin', 'dashboard.read'), ('company_admin', 'products.read'), ('company_admin', 'products.write'),
  ('company_admin', 'customers.read'), ('company_admin', 'customers.write'), ('company_admin', 'suppliers.read'),
  ('company_admin', 'suppliers.write'), ('company_admin', 'sales.read'), ('company_admin', 'sales.write'), ('company_admin', 'roles.read'),
  ('general_manager', 'dashboard.read'), ('general_manager', 'products.read'), ('general_manager', 'customers.read'),
  ('general_manager', 'suppliers.read'), ('general_manager', 'sales.read'),
  ('sales_manager', 'dashboard.read'), ('sales_manager', 'products.read'), ('sales_manager', 'customers.read'),
  ('sales_manager', 'customers.write'), ('sales_manager', 'sales.read'), ('sales_manager', 'sales.write'),
  ('sales_rep', 'dashboard.read'), ('sales_rep', 'products.read'), ('sales_rep', 'customers.read'),
  ('sales_rep', 'customers.write'), ('sales_rep', 'sales.read'), ('sales_rep', 'sales.write'),
  ('inventory_manager', 'dashboard.read'), ('inventory_manager', 'products.read'), ('inventory_manager', 'products.write'),
  ('purchasing_manager', 'dashboard.read'), ('purchasing_manager', 'products.read'), ('purchasing_manager', 'suppliers.read'), ('purchasing_manager', 'suppliers.write'),
  ('accountant', 'dashboard.read'), ('accountant', 'customers.read'), ('accountant', 'suppliers.read'), ('accountant', 'sales.read'),
  ('finance_manager', 'dashboard.read'), ('finance_manager', 'customers.read'), ('finance_manager', 'suppliers.read'), ('finance_manager', 'sales.read'),
  ('employee', 'dashboard.read')
ON CONFLICT DO NOTHING;
