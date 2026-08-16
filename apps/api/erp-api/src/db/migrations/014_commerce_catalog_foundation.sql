ALTER TABLE products
  ADD COLUMN commerce_status text NOT NULL DEFAULT 'active'
  CHECK (commerce_status IN ('draft', 'active', 'archived'));

CREATE INDEX idx_products_company_status_updated
  ON products(company_id, commerce_status, updated_at DESC);
CREATE INDEX idx_products_company_category
  ON products(company_id, category_id) WHERE category_id IS NOT NULL;
CREATE INDEX idx_products_company_name_search
  ON products(company_id, lower(name));

INSERT INTO permissions(code, description) VALUES
  ('commerce.products.read', 'View commerce products'),
  ('commerce.products.create', 'Create commerce products'),
  ('commerce.products.update', 'Update commerce products'),
  ('commerce.products.delete', 'Delete commerce products'),
  ('commerce.orders.read', 'View commerce orders'),
  ('commerce.orders.update', 'Update commerce orders'),
  ('cms.pages.manage', 'Manage CMS pages'),
  ('cms.media.manage', 'Manage CMS media'),
  ('cms.settings.manage', 'Manage CMS settings')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions(role, permission_code)
SELECT role, permission FROM
  (VALUES ('super_admin'), ('company_owner'), ('business_owner'), ('system_admin'), ('company_admin'), ('general_manager'), ('inventory_manager'), ('warehouse_manager')) roles(role)
CROSS JOIN
  (VALUES ('commerce.products.read'), ('commerce.products.create'), ('commerce.products.update'), ('commerce.products.delete')) permissions(permission)
ON CONFLICT DO NOTHING;
