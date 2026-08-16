ALTER TABLE companies ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Africa/Cairo';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS attendance_location_required boolean NOT NULL DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS attendance_max_accuracy_m integer NOT NULL DEFAULT 200 CHECK(attendance_max_accuracy_m BETWEEN 10 AND 5000);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS attendance_location_max_age_seconds integer NOT NULL DEFAULT 120 CHECK(attendance_location_max_age_seconds BETWEEN 10 AND 3600);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS timezone text;

CREATE TABLE attendance_shifts(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL, name_ar text NOT NULL DEFAULT '', start_time time NOT NULL, end_time time NOT NULL,
  grace_minutes integer NOT NULL DEFAULT 15 CHECK(grace_minutes BETWEEN 0 AND 240),
  work_days smallint[] NOT NULL DEFAULT ARRAY[1,2,3,4,5]::smallint[], is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(company_id,name)
);
CREATE TABLE attendance_shift_assignments(
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, shift_id uuid NOT NULL REFERENCES attendance_shifts(id) ON DELETE RESTRICT,
  effective_from date NOT NULL DEFAULT current_date, effective_to date, created_at timestamptz NOT NULL DEFAULT now(), CHECK(effective_to IS NULL OR effective_to>=effective_from)
);
CREATE TABLE attendance_holidays(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  holiday_date date NOT NULL, name text NOT NULL, name_ar text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(company_id,holiday_date)
);
CREATE TABLE attendance_workplaces(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE RESTRICT, name text NOT NULL, address text NOT NULL DEFAULT '',
  latitude numeric(9,6) NOT NULL CHECK(latitude BETWEEN -90 AND 90), longitude numeric(9,6) NOT NULL CHECK(longitude BETWEEN -180 AND 180),
  radius_m integer NOT NULL CHECK(radius_m BETWEEN 10 AND 10000), is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id,name)
);
CREATE TABLE attendance_workplace_assignments(
  workplace_id uuid NOT NULL REFERENCES attendance_workplaces(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(workplace_id,user_id)
);
CREATE TABLE attendance_records(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT, user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  branch_id uuid REFERENCES branches(id) ON DELETE RESTRICT, shift_id uuid REFERENCES attendance_shifts(id) ON DELETE SET NULL,
  business_date date NOT NULL, timezone text NOT NULL, check_in_at timestamptz NOT NULL, check_out_at timestamptz,
  status text NOT NULL CHECK(status IN('present','late','completed','incomplete','manual')),
  late_minutes integer NOT NULL DEFAULT 0 CHECK(late_minutes>=0), early_leave_minutes integer NOT NULL DEFAULT 0 CHECK(early_leave_minutes>=0),
  worked_minutes integer CHECK(worked_minutes>=0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id,user_id,business_date), CHECK(check_out_at IS NULL OR check_out_at>=check_in_at)
);
CREATE TABLE attendance_events(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), record_id uuid NOT NULL REFERENCES attendance_records(id) ON DELETE RESTRICT,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT, company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT, branch_id uuid REFERENCES branches(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK(event_type IN('check_in','check_out','manual_edit')), occurred_at timestamptz NOT NULL DEFAULT now(),
  business_date date NOT NULL, timezone text NOT NULL, latitude numeric(9,6), longitude numeric(9,6), accuracy_m numeric(8,2),
  location_timestamp timestamptz, workplace_id uuid REFERENCES attendance_workplaces(id) ON DELETE RESTRICT, distance_m numeric(10,2),
  location_status text NOT NULL CHECK(location_status IN('verified','not_required','manual')),
  ip_address inet, user_agent text, source text NOT NULL DEFAULT 'web' CHECK(source IN('web','mobile','admin')),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL, reason text, metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_attendance_event_kind ON attendance_events(record_id,event_type) WHERE event_type IN('check_in','check_out');
CREATE INDEX idx_attendance_records_company_date ON attendance_records(company_id,business_date DESC,user_id);
CREATE INDEX idx_attendance_records_user_date ON attendance_records(user_id,business_date DESC);
CREATE INDEX idx_attendance_events_company_time ON attendance_events(company_id,occurred_at DESC);
CREATE INDEX idx_attendance_workplaces_company ON attendance_workplaces(company_id,is_active);

INSERT INTO permissions(code,description) VALUES
('attendance.punch','Record own attendance'),('attendance.locations','Manage attendance workplaces') ON CONFLICT(code) DO NOTHING;
INSERT INTO role_permissions(role,permission_code)
SELECT code,'attendance.punch' FROM default_roles WHERE code='employee' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(role,permission_code)
SELECT code,'attendance.locations' FROM default_roles WHERE code IN('super_admin','company_owner','business_owner','system_admin','hr_manager') ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(role,permission_code)
SELECT code,'attendance.punch' FROM default_roles WHERE code NOT IN('auditor','viewer','cashier','pos_cashier') ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(role,permission_code) VALUES('employee','attendance.read') ON CONFLICT DO NOTHING;
