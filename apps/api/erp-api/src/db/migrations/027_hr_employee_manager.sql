ALTER TABLE hr_employee_profiles ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES hr_employee_profiles(user_id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_hr_employee_manager ON hr_employee_profiles(company_id, manager_id);
