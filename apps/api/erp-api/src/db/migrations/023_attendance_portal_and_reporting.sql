ALTER TABLE attendance_events ADD COLUMN IF NOT EXISTS idempotency_key varchar(100);
ALTER TABLE attendance_events DROP CONSTRAINT IF EXISTS attendance_events_source_check;
ALTER TABLE attendance_events ADD CONSTRAINT attendance_events_source_check
  CHECK(source IN('web','mobile','admin','employee_attendance_portal'));
CREATE UNIQUE INDEX IF NOT EXISTS uq_attendance_event_idempotency
  ON attendance_events(company_id,user_id,idempotency_key)
  WHERE idempotency_key IS NOT NULL;

INSERT INTO permissions(code,description) VALUES
('attendance.self.check_in','Record own attendance check-in'),
('attendance.self.check_out','Record own attendance check-out'),
('attendance.self.view','View own attendance'),
('attendance.records.view','View attendance records'),
('attendance.records.view_all','View company attendance records'),
('attendance.records.view_branch','View assigned branch attendance records'),
('attendance.records.create_manual','Create manual attendance records'),
('attendance.records.edit','Edit attendance records'),
('attendance.records.approve','Approve attendance corrections'),
('attendance.records.export','Export filtered attendance records'),
('attendance.locations.view','View attendance workplaces'),
('attendance.locations.manage','Manage attendance workplaces'),
('attendance.reports.view','View attendance reports'),
('attendance.audit.view','View attendance audit history')
ON CONFLICT(code) DO NOTHING;

INSERT INTO role_permissions(role,permission_code)
SELECT 'employee',code FROM permissions WHERE code IN('attendance.self.check_in','attendance.self.check_out','attendance.self.view')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role,permission_code)
SELECT r.code,p.code FROM default_roles r CROSS JOIN permissions p
WHERE r.code IN('super_admin','system_admin','business_owner','company_owner','company_admin','hr_manager')
  AND p.code LIKE 'attendance.%'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role,permission_code)
SELECT r.code,p.code FROM default_roles r CROSS JOIN permissions p
WHERE r.code='branch_manager' AND p.code IN(
  'attendance.records.view','attendance.records.view_branch','attendance.reports.view',
  'attendance.locations.view','attendance.audit.view')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role,permission_code)
SELECT r.code,p.code FROM default_roles r CROSS JOIN permissions p
WHERE r.code IN('auditor','general_manager') AND p.code IN(
  'attendance.records.view','attendance.reports.view','attendance.audit.view','attendance.locations.view')
ON CONFLICT DO NOTHING;
