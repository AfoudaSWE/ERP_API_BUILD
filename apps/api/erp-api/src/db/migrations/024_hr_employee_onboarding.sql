ALTER TABLE branches ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '';
ALTER TABLE branches ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '';

CREATE TABLE hr_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code text NOT NULL, name text NOT NULL, name_ar text NOT NULL DEFAULT '', is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(company_id,code)
);

CREATE TABLE hr_employee_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_code text NOT NULL, name_ar text NOT NULL DEFAULT '', national_id text,
  phone text NOT NULL DEFAULT '', job_title text NOT NULL DEFAULT '', department_id uuid REFERENCES hr_departments(id) ON DELETE SET NULL,
  hire_date date NOT NULL DEFAULT current_date, base_salary numeric(18,2) NOT NULL DEFAULT 0 CHECK(base_salary>=0),
  employment_status text NOT NULL DEFAULT 'active' CHECK(employment_status IN('active','suspended','terminated')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(company_id,employee_code)
);
CREATE INDEX idx_hr_employee_company_status ON hr_employee_profiles(company_id,employment_status,employee_code);
CREATE INDEX idx_hr_department_company ON hr_departments(company_id,is_active);

INSERT INTO permissions(code,description) VALUES
('hr.employees.view','View employee profiles'),('hr.employees.manage','Manage employee profiles and onboarding'),
('hr.departments.view','View departments'),('hr.departments.manage','Manage departments')
ON CONFLICT(code) DO NOTHING;

INSERT INTO role_permissions(role,permission_code)
SELECT r.code,p.code FROM default_roles r CROSS JOIN permissions p
WHERE r.code IN('super_admin','system_admin','business_owner','company_owner','company_admin','hr_manager')
AND p.code IN('hr.employees.view','hr.employees.manage','hr.departments.view','hr.departments.manage')
ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(role,permission_code)
SELECT r.code,p.code FROM default_roles r CROSS JOIN permissions p
WHERE r.code IN('general_manager','auditor') AND p.code IN('hr.employees.view','hr.departments.view')
ON CONFLICT DO NOTHING;
