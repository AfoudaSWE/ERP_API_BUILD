CREATE TABLE custom_roles(
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code text NOT NULL CHECK(code ~ '^[a-z][a-z0-9_]{1,49}$'),
  name text NOT NULL, name_ar text NOT NULL DEFAULT '', description text NOT NULL DEFAULT '', description_ar text NOT NULL DEFAULT '',
  scope_level text NOT NULL DEFAULT 'company' CHECK(scope_level IN('company','branch','self')),
  is_active boolean NOT NULL DEFAULT true, created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(company_id,code)
);
CREATE TABLE custom_role_permissions(
  company_id uuid NOT NULL, role text NOT NULL, permission_code text NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(company_id,role,permission_code),
  FOREIGN KEY(company_id,role) REFERENCES custom_roles(company_id,code) ON DELETE CASCADE
);
CREATE INDEX idx_custom_role_permissions_role ON custom_role_permissions(company_id,role);
