# ClubGenies ERP UI/UX audit

## Scope and technical baseline

- Nx 23 monorepo; scope is `apps/web/erp-interface` with contract checks against `apps/api/erp-api` and shared libraries.
- React 19, React Router 7, TypeScript 5.9, Vite 8, Tailwind CSS 4, Lucide icons, Recharts, i18next, Vitest and Playwright.
- Application state is split between authentication context, API data context, URL state and local form/component state. No Redux dependency is used by this frontend.
- RBAC is enforced by backend permission middleware and frontend `PermissionRoute`; employee users are redirected exclusively to `/attendance-portal`, and super administrators to `/platform-admin`.
- English/Arabic and RTL are supported through i18next and logical CSS properties, but some inline source strings require encoding verification.

## Cross-route findings

1. The theme is a generic Tailwind blue/slate system and does not implement the confirmed ClubGenies palette.
2. The shell uses a decorative gradient Sparkles mark and generic “ERP” label instead of the product name.
3. Page headings, toolbars, feedback states and permission-denied screens are repeatedly hand-built, producing inconsistent spacing and semantics.
4. Several placeholder operational pages show four identical zero metrics. These are unsupported and reduce trust.
5. Tables provide horizontal scrolling but lack a consistent sticky header, numeric alignment, compact density options, and mobile edge treatment.
6. Focus styling uses an invalid CSS `ring` declaration on `.btn`; keyboard visibility depends on browser defaults.
7. Motion lacks a global `prefers-reduced-motion` override.
8. Mobile navigation works as an off-canvas drawer, but its transition is slower than necessary and focus/scroll locking needs verification.
9. Status, error, empty and permission states exist but are implemented inconsistently across routes.
10. Shared CRUD routes cover many module variants; improving these shared surfaces yields consistent changes without duplicating page code.

## Route and page inventory

The “states” column records states visible in the current implementation or required by the underlying API flow. Every listed route remains permission-gated by `App.tsx` and backend middleware.

| Routes | Module / intended users | Main workflow and actions | States / permissions | Audit decision |
|---|---|---|---|---|
| `/`, `/login`, `/signup` | Dashboard and authentication; all eligible users | Sign in/up, review operational dashboard | session loading/error; `dashboard.read`; role redirects | Improve auth hierarchy, shell entry, real dashboard hierarchy and recovery states |
| `/attendance-portal` | Employee self-service; employees and authorised staff | Check-in/out and attendance history | logged-out portal, device/request errors; employee redirect | Preserve exclusive employee routing; strengthen state clarity and mobile touch use |
| `/platform-admin` | Platform administration; super admin | Manage tenant/platform records | super-admin-only redirect | Preserve isolation; apply shared foundation and dense admin layout |
| `/accounting`, `/accounting/*` | Accounting; finance roles | Journals, periods, posting and account workflows | loading/error/empty; `accounting.read` plus action permissions | Standardise page header, ledger tables, amounts, dates and posting status |
| `/attendance` | Attendance management; HR/managers | View/manage attendance records | three compatible attendance permissions | Consolidate filters, table density and permission feedback |
| `/branches`, `/warehouses`, `/units`, `/categories`, `/brands` | Master data; authorised admins/operators | List/create/edit business reference data | CRUD loading/error/empty; module read/write permissions | Improve shared catalog CRUD, responsive table and form states |
| `/cash-banks`, `/expenses`, `/expenses/categories`, `/expenses/*` | Finance operations | Review cash/banks, expense records and categories | read/write permissions; some placeholder surfaces | Remove unsupported repeated metrics; provide honest empty operational state |
| `/finance/tax-rates`, `/finance/budgets`, `/finance/payments`, `/finance/cashflow` | Finance; finance roles | Configure tax/budgets, process payments, review cash flow | API loading/error/empty; finance permissions | Use compact finance-specific toolbars, numeric alignment and semantic statuses |
| `/crm`, `/crm/*`, `/crm/contacts`, `/crm/pipeline`, `/crm/campaigns`, `/crm/feedback`, `/crm/analytics` | CRM; sales/CRM roles | Manage leads/contacts, pipeline, campaigns, feedback and analytics | `crm.read`/write; list/form/chart states | Keep module-specific views while unifying header, filters, tables and feedback |
| `/customers`, `/customers/*`, `/suppliers`, `/suppliers/*` | Parties; sales/purchasing users | Search, create, view and edit parties | shared EntityRoute states; granular create/update permissions | Improve shared record list/detail/form layout and mobile overflow |
| `/hr`, `/hr/*` | HR; HR/admin/manager roles | Employees, departments, shifts, branches, workplaces and onboarding | loading/error/empty, CSV import, create/edit; HR permissions | Retain rich workflow; standardise tabs, tables, dialogs and form grouping |
| `/hr/designations`, `/hr/leaves`, `/hr/leave-types`, `/hr/holidays`, `/hr/recruitment`, `/hr/performance`, `/hr/training`, `/hr/analytics` | HR specialist workflows | Maintain setup and process workforce records | HR read/manage permissions; mixed implemented/empty states | Give each workflow appropriate density; no mechanical dashboard template |
| `/payroll` | Payroll; authorised HR/finance | Review and process payroll | payroll permission; loading/error/empty | Prioritise period/status context, amounts and safe actions |
| `/inventory`, `/inventory/*`, `/inventory/stock-adjustment`, `/inventory/stock-transfer` | Inventory; warehouse users/managers | View stock, movements, adjustments and transfers | inventory read/write; async API states | Improve stock hierarchy, quantity alignment, transfer/adjustment forms and overflow |
| `/products`, `/products/*` | Catalog; inventory/sales users | Search, create, view and edit products | granular product permissions; categories dependency | Improve shared list/form, supported fields, validation and state recovery |
| `/purchases`, `/purchases/*`, `/purchases/returns`, `/purchasing/suppliers` | Procurement; purchasing roles | Purchase orders, receiving and returns | purchasing read/write/approve depending route | Clarify document status and primary actions; dense tables and safe forms |
| `/sales`, `/sales/*`, `/sales/new`, `/sales/quotes`, `/sales/recurring`, `/sales/templates`, `/sales/delivery-notes`, `/sales/returns`, `/sales/cash-sales` | Sales/order-to-cash; sales roles | Invoices, quotes, recurring documents, delivery, returns and cash sale | granular sales permissions; form and posting states | Standardise document workbench patterns without flattening route differences |
| `/pos` | Cashier; POS users | Fast point-of-sale transaction | `pos.use`; cashier role constraints | Preserve task-focused shell, touch targets and restricted navigation |
| `/reports`, `/reports/*` | Reporting; managers and authorised staff | Select/run/export supported reports | report permissions; parameter/loading/error/empty states | Improve report selection, parameter hierarchy and result table readability |
| `/settings`, `/settings/:section`, `/settings/roles` | Configuration/RBAC; admins | Manage settings, users, custom roles and permission matrix | settings/roles permissions; dirty/save/error states | Separate role editing from user assignment visually; improve matrix scanning and unsaved state |
| `/notifications`, `/help` | Support utilities; authorised users | Review notifications and help content | read/empty states | Apply shared foundation; keep utility pages compact and direct |
| `*`, global error/loading | System states; all users | Recover from missing route, application error or initial loading | 404, error boundary, loading, 403 | Replace ad-hoc cards with consistent semantic full-page states and recovery actions |

## Backend and security alignment

- Route permissions originate in migrations `002`, `003`, `005`, `010`, `011`, `012`, `022`–`027`, `032`, and `033`, and are exercised by API RBAC tests and Playwright role tests.
- Frontend navigation filters links with `can(permission)`; hidden navigation is not treated as security because API middleware remains authoritative.
- Employee-only routing is explicit before the main application route tree. It must remain unchanged except for presentation and accessibility improvements.
- Role assignment constrains assignable roles by access rank or permission subset; the redesign must not loosen this calculation.
- No API, schema, permission, or payload change is justified by the visual audit.

## Design contract inputs

- Product: ClubGenies.
- Visitor mode: Operate.
- Palette authority: `#e0e1dd`, `#778da9`, `#415a77`, `#1b263b`, `#0d1b2a`.
- Character: disciplined operational workspace; crisp dividers, compact controls, calm surfaces, restrained semantic colour.
- Avoid: gradients, glows, glass effects, oversized cards, repeated metric tiles, pills as default containers, ornamental motion, and unsupported data.

