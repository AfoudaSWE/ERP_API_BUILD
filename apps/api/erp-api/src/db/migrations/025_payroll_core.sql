CREATE TABLE payroll_runs(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  year integer NOT NULL CHECK(year BETWEEN 2000 AND 2200), month smallint NOT NULL CHECK(month BETWEEN 1 AND 12),
  status text NOT NULL DEFAULT 'draft' CHECK(status IN('draft','approved','paid')),
  employee_count integer NOT NULL DEFAULT 0, total_gross numeric(18,2) NOT NULL DEFAULT 0,
  total_deductions numeric(18,2) NOT NULL DEFAULT 0, total_net numeric(18,2) NOT NULL DEFAULT 0,
  created_by uuid REFERENCES users(id), approved_by uuid REFERENCES users(id), approved_at timestamptz,
  paid_by uuid REFERENCES users(id), paid_at timestamptz, payment_account_id uuid REFERENCES financial_accounts(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(company_id,year,month)
);
CREATE TABLE payroll_payslips(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payroll_run_id uuid NOT NULL REFERENCES payroll_runs(id) ON DELETE RESTRICT,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT, employee_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  employee_code text NOT NULL, employee_name text NOT NULL, base_salary numeric(18,2) NOT NULL CHECK(base_salary>=0),
  working_days integer NOT NULL DEFAULT 0, absent_days integer NOT NULL DEFAULT 0, overtime_hours numeric(10,2) NOT NULL DEFAULT 0,
  overtime_pay numeric(18,2) NOT NULL DEFAULT 0, allowances numeric(18,2) NOT NULL DEFAULT 0,
  deductions numeric(18,2) NOT NULL DEFAULT 0, gross_salary numeric(18,2) NOT NULL DEFAULT 0,
  net_salary numeric(18,2) NOT NULL DEFAULT 0 CHECK(net_salary>=0), notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(payroll_run_id,employee_id)
);
CREATE INDEX idx_payroll_runs_company_period ON payroll_runs(company_id,year DESC,month DESC);
CREATE INDEX idx_payroll_payslips_run ON payroll_payslips(payroll_run_id,employee_code);
