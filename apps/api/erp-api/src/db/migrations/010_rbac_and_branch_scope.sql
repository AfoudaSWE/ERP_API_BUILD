CREATE TABLE IF NOT EXISTS default_roles (
  code text PRIMARY KEY,
  name text NOT NULL,
  name_ar text NOT NULL,
  description text NOT NULL,
  description_ar text NOT NULL,
  access_rank integer NOT NULL CHECK (access_rank >= 0),
  scope_level text NOT NULL CHECK (scope_level IN ('system','company','branch','self'))
);

INSERT INTO default_roles(code,name,name_ar,description,description_ar,access_rank,scope_level) VALUES
('super_admin','Super Admin','المشرف العام','Full system and company control','تحكم كامل بالنظام وجميع الشركات',0,'system'),
('company_owner','Company Owner','مالك الشركة','Company and all-branch oversight','إدارة الشركة ومتابعة جميع الفروع',10,'company'),
('system_admin','System Admin','مدير النظام','Users, roles, permissions, and settings','إدارة المستخدمين والأدوار والإعدادات',20,'company'),
('branch_manager','Branch Manager','مدير الفرع','Assigned branch operations and monitoring','إدارة ومتابعة الفروع المسندة',30,'branch'),
('accountant','Accountant','محاسب','Accounts, journals, invoices, and payments','إدارة الحسابات والقيود والفواتير والمدفوعات',40,'branch'),
('finance_manager','Finance Manager','مدير المالية','Financial approvals and period close','اعتماد العمليات المالية وإغلاق الفترات',30,'branch'),
('sales_manager','Sales Manager','مدير المبيعات','Sales, pricing, and customer management','إدارة المبيعات والتسعير والعملاء',40,'branch'),
('sales_rep','Sales Representative','مندوب مبيعات','Quotations and sales orders','إنشاء عروض الأسعار وأوامر البيع',50,'branch'),
('cashier','Cashier','أمين الصندوق','POS and payment collection','استخدام نقطة البيع وتحصيل المدفوعات',50,'branch'),
('purchase_manager','Purchase Manager','مدير المشتريات','Purchasing management and approval','إدارة واعتماد عمليات الشراء',40,'branch'),
('purchase_officer','Purchase Officer','مسؤول مشتريات','Purchase requests and orders','إنشاء طلبات وأوامر الشراء',50,'branch'),
('warehouse_manager','Warehouse Manager','مدير المستودع','Inventory and warehouse management','إدارة المخزون والمستودعات',40,'branch'),
('storekeeper','Storekeeper','أمين المخزن','Receiving, issuing, and movements','تنفيذ الاستلام والصرف وحركات المخزون',50,'branch'),
('hr_manager','HR Manager','مدير الموارد البشرية','Employees, attendance, leave, and payroll','إدارة الموظفين والحضور والإجازات والرواتب',40,'company'),
('hr_officer','HR Officer','مسؤول الموارد البشرية','Employee, attendance, and leave records','تسجيل بيانات الموظفين والحضور والإجازات',50,'company'),
('auditor','Auditor','مدقق','Read-only operations, reports, and audit','قراءة العمليات والتقارير وسجل التدقيق فقط',80,'company'),
('employee','Employee','موظف','Personal self-service only','الخدمة الذاتية للسجلات الشخصية فقط',90,'self'),
('viewer','Viewer','مشاهد','Explicitly permitted read-only data','قراءة البيانات والتقارير المصرح بها فقط',90,'branch')
ON CONFLICT(code) DO UPDATE SET name=excluded.name,name_ar=excluded.name_ar,description=excluded.description,description_ar=excluded.description_ar,access_rank=excluded.access_rank,scope_level=excluded.scope_level;

-- Metadata aliases preserve existing role codes and users.
INSERT INTO default_roles(code,name,name_ar,description,description_ar,access_rank,scope_level) VALUES
('business_owner','Company Owner (legacy)','مالك الشركة','Legacy company owner role','دور مالك الشركة المتوافق',10,'company'),
('company_admin','System Admin (legacy)','مدير النظام','Legacy company administrator role','دور مدير النظام المتوافق',20,'company'),
('pos_cashier','Cashier (legacy)','أمين الصندوق','Legacy cashier role','دور أمين الصندوق المتوافق',50,'branch'),
('purchasing_manager','Purchase Manager (legacy)','مدير المشتريات','Legacy purchase manager role','دور مدير المشتريات المتوافق',40,'branch'),
('inventory_manager','Warehouse Manager (legacy)','مدير المستودع','Legacy warehouse manager role','دور مدير المستودع المتوافق',40,'branch'),
('warehouse_employee','Storekeeper (legacy)','أمين المخزن','Legacy storekeeper role','دور أمين المخزن المتوافق',50,'branch')
ON CONFLICT(code) DO UPDATE SET name=excluded.name,name_ar=excluded.name_ar,description=excluded.description,description_ar=excluded.description_ar,access_rank=excluded.access_rank,scope_level=excluded.scope_level;

INSERT INTO permissions(code,description) VALUES
('companies.manage','Manage all companies'),('roles.create','Create roles and users'),('roles.update','Update roles and users'),('roles.delete','Delete roles and users'),
('sales.view','View sales'),('sales.create','Create quotations and sales orders'),('sales.update','Update sales documents'),('sales.delete','Delete eligible sales documents'),('sales.approve','Approve sales operations'),('sales.refund','Post refunds and returns'),('sales.export','Export sales'),
('payments.view','View payments'),('payments.receive','Receive customer payments'),('payments.cancel','Cancel or reverse payments'),
('purchases.view','View purchasing'),('purchases.create','Create purchase requests and orders'),('purchases.update','Update purchasing documents'),('purchases.delete','Delete eligible purchasing documents'),('purchases.approve','Approve purchasing'),('purchases.export','Export purchasing'),
('inventory.view','View inventory'),('inventory.receive','Receive stock'),('inventory.issue','Issue stock'),('inventory.transfer','Transfer stock'),('inventory.count','Perform stock counts'),('inventory.adjust','Adjust stock'),('inventory.export','Export inventory'),
('accounting.view','View accounts and journals'),('accounting.create','Create journal drafts'),('accounting.post','Post and reverse journals'),('accounting.export','Export accounting'),('accounting.close','Close accounting periods'),('accounting.reopen','Reopen accounting periods'),
('expenses.view','View expenses'),('expenses.create','Create expenses'),('expenses.update','Update expenses'),('expenses.delete','Delete eligible expenses'),('expenses.approve','Approve expenses'),('expenses.export','Export expenses'),
('cash.view','View cash and bank accounts'),('cash.manage','Manage cash and bank operations'),
('customers.view','View customers'),('customers.create','Create customers'),('customers.update','Update customers'),('customers.delete','Delete customers'),('customers.export','Export customers'),
('products.view','View products'),('products.create','Create products'),('products.update','Update products'),('products.delete','Delete products'),('products.export','Export products'),
('suppliers.view','View suppliers'),('suppliers.create','Create suppliers'),('suppliers.update','Update suppliers'),('suppliers.delete','Delete suppliers'),('suppliers.export','Export suppliers'),
('hr.view','View HR records'),('hr.create','Create HR records'),('hr.update','Update HR records'),('hr.delete','Delete HR records'),
('attendance.view','View attendance'),('attendance.manage','Manage attendance and leave'),
('payroll.view','View payroll'),('payroll.process','Process payroll'),('payroll.approve','Approve payroll'),
('reports.view','View reports'),('reports.export','Export reports'),('audit.view','View audit log'),
('branches.view','View branches'),('branches.manage','Manage branches'),('settings.view','View settings'),('settings.manage','Manage settings'),
('pos.use','Use point of sale'),('self_service.view','View own employee records'),('self_service.leave','Manage own leave requests'),('self_service.payslip','View own payslips')
ON CONFLICT(code) DO NOTHING;

-- Default-role grants are additive and idempotent. Custom roles are untouched.
INSERT INTO role_permissions(role,permission_code)
SELECT r.code,p.code FROM default_roles r CROSS JOIN permissions p WHERE r.code='super_admin' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(role,permission_code)
SELECT r.code,p.code FROM default_roles r CROSS JOIN permissions p WHERE r.code IN('company_owner','business_owner') AND p.code<>'companies.manage' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(role,permission_code) VALUES
('system_admin','dashboard.read'),('system_admin','roles.read'),('system_admin','roles.manage'),('system_admin','roles.create'),('system_admin','roles.update'),('system_admin','roles.delete'),('system_admin','settings.read'),('system_admin','settings.view'),('system_admin','settings.manage'),('system_admin','branches.read'),('system_admin','branches.view'),('system_admin','branches.manage'),('system_admin','audit.read'),('system_admin','audit.view'),
('branch_manager','dashboard.read'),('branch_manager','sales.read'),('branch_manager','sales.view'),('branch_manager','sales.write'),('branch_manager','sales.create'),('branch_manager','sales.update'),('branch_manager','payments.view'),('branch_manager','purchases.read'),('branch_manager','purchases.view'),('branch_manager','inventory.read'),('branch_manager','inventory.view'),('branch_manager','products.read'),('branch_manager','products.view'),('branch_manager','customers.read'),('branch_manager','customers.view'),('branch_manager','expenses.read'),('branch_manager','expenses.view'),('branch_manager','reports.read'),('branch_manager','reports.view'),('branch_manager','branches.read'),('branch_manager','branches.view'),
('accountant','dashboard.read'),('accountant','accounting.read'),('accountant','accounting.view'),('accountant','accounting.write'),('accountant','accounting.create'),('accountant','accounting.post'),('accountant','sales.read'),('accountant','sales.view'),('accountant','payments.view'),('accountant','payments.receive'),('accountant','purchases.read'),('accountant','purchases.view'),('accountant','expenses.read'),('accountant','expenses.view'),('accountant','expenses.create'),('accountant','cash.read'),('accountant','cash.view'),('accountant','reports.read'),('accountant','reports.view'),
('finance_manager','dashboard.read'),('finance_manager','accounting.read'),('finance_manager','accounting.view'),('finance_manager','accounting.write'),('finance_manager','accounting.post'),('finance_manager','accounting.close'),('finance_manager','accounting.reopen'),('finance_manager','expenses.read'),('finance_manager','expenses.view'),('finance_manager','expenses.approve'),('finance_manager','cash.read'),('finance_manager','cash.view'),('finance_manager','cash.manage'),('finance_manager','payments.view'),('finance_manager','payments.cancel'),('finance_manager','reports.read'),('finance_manager','reports.view'),
('sales_manager','dashboard.read'),('sales_manager','sales.read'),('sales_manager','sales.view'),('sales_manager','sales.write'),('sales_manager','sales.create'),('sales_manager','sales.update'),('sales_manager','sales.approve'),('sales_manager','sales.refund'),('sales_manager','sales.export'),('sales_manager','customers.read'),('sales_manager','customers.view'),('sales_manager','customers.write'),('sales_manager','customers.create'),('sales_manager','customers.update'),('sales_manager','products.read'),('sales_manager','products.view'),('sales_manager','reports.read'),('sales_manager','reports.view'),
('sales_rep','dashboard.read'),('sales_rep','sales.read'),('sales_rep','sales.view'),('sales_rep','sales.write'),('sales_rep','sales.create'),('sales_rep','sales.update'),('sales_rep','customers.read'),('sales_rep','customers.view'),('sales_rep','customers.write'),('sales_rep','customers.create'),('sales_rep','products.read'),('sales_rep','products.view'),
('cashier','dashboard.read'),('cashier','pos.use'),('cashier','sales.read'),('cashier','sales.view'),('cashier','payments.view'),('cashier','payments.receive'),('cashier','products.read'),('cashier','products.view'),('cashier','customers.read'),('cashier','customers.view'),
('purchase_manager','dashboard.read'),('purchase_manager','purchases.read'),('purchase_manager','purchases.view'),('purchase_manager','purchases.write'),('purchase_manager','purchases.create'),('purchase_manager','purchases.update'),('purchase_manager','purchases.approve'),('purchase_manager','purchases.export'),('purchase_manager','suppliers.read'),('purchase_manager','suppliers.view'),('purchase_manager','inventory.read'),('purchase_manager','inventory.view'),('purchase_manager','reports.read'),('purchase_manager','reports.view'),
('purchase_officer','dashboard.read'),('purchase_officer','purchases.read'),('purchase_officer','purchases.view'),('purchase_officer','purchases.write'),('purchase_officer','purchases.create'),('purchase_officer','purchases.update'),('purchase_officer','suppliers.read'),('purchase_officer','suppliers.view'),('purchase_officer','inventory.read'),('purchase_officer','inventory.view'),
('warehouse_manager','dashboard.read'),('warehouse_manager','inventory.read'),('warehouse_manager','inventory.view'),('warehouse_manager','inventory.write'),('warehouse_manager','inventory.receive'),('warehouse_manager','inventory.issue'),('warehouse_manager','inventory.transfer'),('warehouse_manager','inventory.count'),('warehouse_manager','inventory.adjust'),('warehouse_manager','inventory.export'),('warehouse_manager','products.read'),('warehouse_manager','products.view'),('warehouse_manager','purchases.read'),('warehouse_manager','purchases.view'),('warehouse_manager','reports.read'),('warehouse_manager','reports.view'),
('storekeeper','dashboard.read'),('storekeeper','inventory.read'),('storekeeper','inventory.view'),('storekeeper','inventory.write'),('storekeeper','inventory.receive'),('storekeeper','inventory.issue'),('storekeeper','inventory.transfer'),('storekeeper','products.read'),('storekeeper','products.view'),('storekeeper','purchases.read'),('storekeeper','purchases.view'),
('hr_manager','dashboard.read'),('hr_manager','hr.read'),('hr_manager','hr.view'),('hr_manager','hr.write'),('hr_manager','hr.create'),('hr_manager','hr.update'),('hr_manager','hr.delete'),('hr_manager','attendance.read'),('hr_manager','attendance.view'),('hr_manager','attendance.write'),('hr_manager','attendance.manage'),('hr_manager','payroll.read'),('hr_manager','payroll.view'),('hr_manager','payroll.process'),('hr_manager','payroll.approve'),('hr_manager','reports.read'),('hr_manager','reports.view'),
('hr_officer','dashboard.read'),('hr_officer','hr.read'),('hr_officer','hr.view'),('hr_officer','hr.write'),('hr_officer','hr.create'),('hr_officer','hr.update'),('hr_officer','attendance.read'),('hr_officer','attendance.view'),('hr_officer','attendance.write'),('hr_officer','attendance.manage'),
('employee','self_service.view'),('employee','self_service.leave'),('employee','self_service.payslip'),('employee','notifications.read'),('employee','help.read'),
('viewer','dashboard.read'),('viewer','reports.read'),('viewer','reports.view')
ON CONFLICT DO NOTHING;

-- Equivalent legacy operational roles receive only their canonical role's defaults.
INSERT INTO role_permissions(role,permission_code)
SELECT alias.role,rp.permission_code FROM (VALUES('pos_cashier','cashier'),('purchasing_manager','purchase_manager'),('inventory_manager','warehouse_manager'),('warehouse_employee','storekeeper'),('company_admin','system_admin')) alias(role,canonical)
JOIN role_permissions rp ON rp.role=alias.canonical ON CONFLICT DO NOTHING;

-- Read-only roles are backend-read-only even if an earlier deployment assigned a mutation.
DELETE FROM role_permissions WHERE role IN ('auditor','viewer') AND permission_code ~ '(write|create|update|delete|approve|post|close|reopen|manage|adjust|receive|issue|transfer|process|refund|cancel|use)$';
INSERT INTO role_permissions(role,permission_code)
SELECT 'auditor',code FROM permissions WHERE code ~ '(read|view)$' OR code IN('dashboard.read','reports.read','audit.read','settings.read','branches.read') ON CONFLICT DO NOTHING;
DELETE FROM role_permissions WHERE role='employee' AND permission_code NOT IN('self_service.view','self_service.leave','self_service.payslip','notifications.read','help.read');
DELETE FROM role_permissions WHERE role='sales_rep' AND permission_code='customers.write';
DELETE FROM role_permissions WHERE role IN('storekeeper','warehouse_employee') AND permission_code='inventory.write';
DELETE FROM role_permissions WHERE role IN('cashier','pos_cashier') AND permission_code IN('sales.write','customers.write');
DELETE FROM role_permissions WHERE role IN('cashier','pos_cashier') AND permission_code<>'pos.use';

CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code text NOT NULL, name text NOT NULL, name_ar text NOT NULL DEFAULT '', is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(company_id,code)
);
CREATE TABLE IF NOT EXISTS user_branch_assignments (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,branch_id)
);
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches(id) ON DELETE RESTRICT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches(id) ON DELETE RESTRICT;

INSERT INTO branches(company_id,code,name,name_ar)
SELECT id,'MAIN','Main Branch','الفرع الرئيسي' FROM companies ON CONFLICT(company_id,code) DO NOTHING;
UPDATE warehouses w SET branch_id=b.id FROM branches b WHERE b.company_id=w.company_id AND b.code='MAIN' AND w.branch_id IS NULL;
UPDATE expenses e SET branch_id=b.id FROM branches b WHERE b.company_id=e.company_id AND b.code='MAIN' AND e.branch_id IS NULL;
INSERT INTO user_branch_assignments(user_id,branch_id)
SELECT u.id,b.id FROM users u JOIN default_roles r ON r.code=u.role AND r.scope_level='branch' JOIN branches b ON b.company_id=u.company_id AND b.code='MAIN'
ON CONFLICT DO NOTHING;
CREATE INDEX IF NOT EXISTS idx_user_branch_user ON user_branch_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_branch ON warehouses(company_id,branch_id);
