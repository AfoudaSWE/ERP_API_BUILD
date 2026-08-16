-- Correct legacy broad grants without touching custom roles.
DELETE FROM role_permissions WHERE role='employee' AND permission_code NOT IN('self_service.view','self_service.leave','self_service.payslip','notifications.read','help.read');
DELETE FROM role_permissions WHERE role='sales_rep' AND permission_code='customers.write';
DELETE FROM role_permissions WHERE role IN('storekeeper','warehouse_employee') AND permission_code='inventory.write';
DELETE FROM role_permissions WHERE role IN('cashier','pos_cashier') AND permission_code IN('sales.write','customers.write');
DELETE FROM role_permissions WHERE role IN('cashier','pos_cashier') AND permission_code<>'pos.use';
