# Access control reference

The database remains the source of truth (`default_roles`, `permissions`, and `role_permissions`). Legacy role and permission codes remain compatibility aliases. Custom roles are neither deleted nor granted new sensitive permissions.

## Default role-permission matrix

| Role | Scope | Permissions / responsibility |
|---|---|---|
| Super Admin | System | Every permission, including `companies.manage` |
| Company Owner | Company and all branches | Every company permission except `companies.manage` |
| System Admin | Company | `roles.*`, `settings.*`, `branches.*`, `audit.view`, Dashboard |
| Branch Manager | Assigned branches | View/manage branch sales and customers; view purchases, inventory, expenses, reports, and branches |
| Accountant | Assigned branches | `accounting.view/create/post`, invoices, `payments.view/receive`, expense creation, cash/report views |
| Finance Manager | Assigned branches | `accounting.post/close/reopen`, `expenses.approve`, `cash.manage`, `payments.cancel`, finance reports |
| Sales Manager | Assigned branches | `sales.view/create/update/approve/refund/export`, customer create/update, product/report views |
| Sales Representative | Assigned branches | `sales.view/create/update`, customer view/create, product view |
| Cashier | Assigned branches | `pos.use` only; POS backend authorizes its internal catalog/customer/checkout calls through this permission |
| Purchase Manager | Assigned branches | `purchases.view/create/update/approve/export`, supplier/inventory/report views |
| Purchase Officer | Assigned branches | `purchases.view/create/update`, supplier and inventory views |
| Warehouse Manager | Assigned branches | `inventory.view/receive/issue/transfer/count/adjust/export`, product/purchase/report views |
| Storekeeper | Assigned branches | `inventory.view/receive/issue/transfer`, product and purchase views |
| HR Manager | Company | `hr.view/create/update/delete`, `attendance.view/manage`, `payroll.view/process/approve`, HR reports |
| HR Officer | Company | `hr.view/create/update`, `attendance.view/manage` |
| Auditor | Company | Every available `*.read`/`*.view`; no mutation permission |
| Employee | Self | `self_service.view/leave/payslip`, own notifications/help |
| Viewer | Assigned branches | Dashboard and explicitly granted report views only; no mutation permission |

## Frontend routes and pages

| Route | Required permission |
|---|---|
| `/` | `dashboard.read` |
| `/ai-assistant` | `ai.read` |
| `/sales`, `/sales/*` | `sales.read` (`sales.create`/legacy `sales.write` for `/sales/new`) |
| `/pos` | `pos.use` |
| `/purchases`, `/purchases/*` | `purchases.read` |
| `/inventory`, `/inventory/*` | `inventory.read` |
| `/products`, `/products/*` | `products.read` |
| `/customers`, `/customers/*` | `customers.read` |
| `/suppliers`, `/suppliers/*` | `suppliers.read` |
| `/crm`, `/crm/*` | `crm.read` |
| `/accounting`, `/accounting/*` | `accounting.read` |
| `/expenses`, `/expenses/*` | `expenses.read` |
| `/cash-banks` | `cash.read` |
| `/hr`, `/hr/*` | `hr.read` |
| `/attendance` | `attendance.read` |
| `/payroll` | `payroll.read` |
| `/reports`, `/reports/*` | `reports.read` |
| `/branches` | `branches.read` |
| `/settings`, `/settings/*` | `settings.read` |
| `/settings/roles` | `roles.read`; mutations require `roles.create/update/delete` or legacy `roles.manage` |
| `/notifications` | `notifications.read` |
| `/help` | `help.read` |

Sidebar items use the same page permissions. Page actions additionally require their action permission: payment collection `payments.receive`, returns `sales.refund`, purchase approval `purchases.approve`, stock receipt `inventory.receive`, journal posting `accounting.post`, period close/reopen `accounting.close`, expenses `expenses.create/approve`, and cash mutations `cash.manage`.

## API permission map

| API | Method | Permission |
|---|---|---|
| `/api/ai/daily-summary` | GET | `dashboard.read`; facts are further filtered by module permissions |
| `/api/ai/status`, `/api/ai/chat` | GET/POST | `ai.read`; chat retrieves allowlisted data only from modules the user may read, always within company/branch scope |
| `/api/dashboard/summary`, `/api/dashboard/analytics` | GET | `dashboard.read` |
| `/api/products`, `/api/categories` | GET | `products.read`; POST/PATCH/DELETE: `products.write` |
| `/api/customers` | GET | `customers.read`; POST/PATCH/DELETE: `customers.write` |
| `/api/suppliers` | GET | `suppliers.read`; POST/PATCH/DELETE: `suppliers.write` |
| `/api/sales/invoices` | GET | `sales.view` or `sales.read`; POST: `sales.create` or legacy `sales.write` |
| `/api/sales/invoices/:id/payments` | POST | `payments.receive` |
| `/api/sales/invoices/:id/returns` | POST | `sales.refund` |
| `/api/purchase-orders` | GET | `purchases.view` or `purchases.read`; POST: `purchases.create` or legacy `purchases.write` |
| `/api/purchase-orders/:id/actions` | POST | submit/update: `purchases.write`; approve/reject: `purchases.approve` |
| `/api/purchase-orders/:id/receipts` | POST | `inventory.receive` |
| `/api/warehouses`, `/api/inventory/*` | GET | `inventory.read`; warehouse create: `inventory.write` |
| `/api/accounting/accounts`, `/journals`, `/periods` | GET | `accounting.read` |
| `/api/accounting/journals` | POST | `accounting.create` or `accounting.post` |
| `/api/accounting/journals/:id/actions` | POST | `accounting.post` |
| `/api/accounting/periods*` | POST | `accounting.close` |
| `/api/finance/accounts`, `/movements` | GET | `cash.read`; POST accounts/transfers: `cash.manage` |
| `/api/finance/expenses` | GET | `expenses.read`; POST: `expenses.create`; actions: `expenses.approve` |
| `/api/finance/reconciliations*` | GET/POST | `reconciliation.manage` |
| `/api/audit` | GET | `audit.read` |
| `/api/roles`, `/permissions`, `/users` | GET | `roles.read` |
| `/api/roles/users` | POST | `roles.create` or legacy `roles.manage` |
| `/api/roles/users/:id/role` | PATCH | `roles.update` or legacy `roles.manage`, delegation scope, explicit confirmation |
| `/api/roles/users/:id` | DELETE | `roles.delete` or legacy `roles.manage` |
| `/api/self-service/profile` | GET | `self_service.view`; query is always constrained to the authenticated user |

All business queries include `company_id`. Super Admin may explicitly select a company with `x-company-id`; other roles receive 403 for a different company. Branch-scoped roles are constrained through `user_branch_assignments` and warehouse-to-branch relationships; out-of-scope warehouse documents receive 403 and list endpoints omit them.
