# AI-Powered SME ERP

An Nx workspace for an Arabic/English SME ERP, retail operations interface, automation gateway, computer-vision tracking service, and BullMQ workers backed by PostgreSQL and Redis.

## Workspace

```text
apps/
  web/
    erp-interface/        React 19 + Vite ERP frontend
    ecom-interface/       Customer-facing commerce storefront
    retail-ms-interface/  Retail management and digital-twin frontend
  api/
    erp-api/              Express 5 ERP API
  automation/
    automation-api/       n8n automation gateway
  services/
    vision-service/       NestJS tracking, reporting, and WebSocket API
    vision-camera-agent/  Python/OpenCV camera-side publisher
  workers/
    jobs-worker/          Server-side BullMQ processors (no HTTP API)
libs/
  shared/contracts/       ERP-facing Zod schemas and commerce contract exports
  frontend/               Shared frontend auth and data access
  backend/                Shared database and job infrastructure
  domains/commerce/       Commerce contracts, UI, and application ports
```

Nx manages builds, serving, type checking, linting, tests, caching, and the project graph.

Architecture references:

- [Architecture plan](docs/architecture-plan.md): current topology, domain ownership, security boundaries, risks, and delivery roadmap.
- [Access control](docs/access-control.md): roles, permissions, route guards, and tenant/branch scope.
- [Commerce and background jobs](docs/commerce-and-jobs-architecture.md): dependency rules, Redis/worker setup, idempotency, and current limitations.
- [Production readiness](docs/production-readiness-report.md) and [VPS deployment](docs/vps-deployment.md): operational checks and deployment guidance.

## Current ERP capabilities

- Tenant-scoped sales, purchasing, inventory, products, customers, suppliers, finance, accounting, CRM, and audit trails.
- Human resources with employee, department, and shift management. In-use departments and shifts are protected from unsafe deletion.
- Attendance portal for employee self-service. Users with the Employee role are restricted to `/attendance-portal` after login.
- Payroll runs linked to employees and attendance, with draft, approval, payment, allowances, deductions, and financial movement posting.
- Thirty API-backed operational reports with filters, search, and CSV export.
- Built-in and company-specific custom roles. Authorized administrators can create, edit, and delete unused custom roles from `/settings/roles`.
- Arabic/English UI, RTL/LTR support, and application-wide success/error toast notifications for API operations.

## Specification-Driven Development

This repository uses GitHub Spec Kit with Codex skills and PowerShell scripts. Business changes follow:

```text
$speckit-constitution  # Project integrity and governance rules
$speckit-specify       # Business requirements and independent user stories
$speckit-plan          # Technical decisions, data model, contracts, and validation guide
$speckit-tasks         # Dependency-ordered implementation backlog
$speckit-analyze       # Cross-artifact consistency check
$speckit-implement     # Execute the approved tasks
```

The active business improvement is `specs/001-business-operations-core`. Start with its Foundation and
procure-to-stock MVP before implementing later stories. The specification deliberately separates HR,
payroll, CRM automation, foreign currency, and external commerce into future specifications.

## Prerequisites

- Node.js 22+
- npm 10+
- Python 3.12+ for the camera publisher and people-counter scripts
- Docker Desktop (recommended), or PostgreSQL 14+
- [Ollama](https://ollama.com/download) with the `qwen2.5-coder:7b` model
- Optional: n8n on port `5678` for automation workflows

## First run

```bash
npm install
copy .env.example .env
ollama pull qwen2.5-coder:7b
npm run db:setup
npm run dev
```

On macOS/Linux use `cp .env.example .env` instead of `copy`. This starts the core ERP interface and API. Configure the Automation API and Vision Service as described below before using `npm run dev:all`.

| Application | Port | Local address |
| --- | ---: | --- |
| ERP interface | 5173 | `http://localhost:5173` |
| ERP API | 3333 | `http://localhost:3333/api` |
| Automation API | 3334 | `http://localhost:3334/api/automation` |
| Vision Service | 3335 | `http://localhost:3335/api/v1` |
| Retail management interface | 4200 | `http://localhost:4200` |
| Worker | None | Background BullMQ processor |

Health endpoints:

- ERP API: `http://localhost:3333/api/health`
- Vision Service: `http://localhost:3335/api/v1/health`

The Live Digital Twin subscribes to the Vision Service at `ws://localhost:3335/ws/retail-tracking` and defaults to tracking store `store-01`.

Demo login seeded by `npm run db:seed`:

```text
owner@demo.erp
Demo1234!
```

Every built-in role also has a development test account using the password `Demo1234!`:

| Role | Email |
| --- | --- |
| Business owner | `owner@demo.erp` |
| Company admin | `company_admin@demo.erp` |
| General manager | `general_manager@demo.erp` |
| Sales manager | `sales_manager@demo.erp` |
| Sales representative | `sales_rep@demo.erp` |
| Inventory manager | `inventory_manager@demo.erp` |
| Warehouse employee | `warehouse_employee@demo.erp` |
| Purchasing manager | `purchasing_manager@demo.erp` |
| Accountant | `accountant@demo.erp` |
| Finance manager | `finance_manager@demo.erp` |
| HR manager | `hr_manager@demo.erp` |
| Payroll officer | `payroll_officer@demo.erp` |
| Branch manager | `branch_manager@demo.erp` |
| POS cashier | `pos_cashier@demo.erp` |
| CRM agent | `crm_agent@demo.erp` |
| Auditor | `auditor@demo.erp` |
| Employee | `employee@demo.erp` |

Change the demo password and `JWT_SECRET` before deploying.

Ollama must be running while using the AI Assistant. The default configuration is:

```env
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5-coder:7b
OLLAMA_TIMEOUT_MS=120000
```

Open `/ai-assistant` after signing in. The API sends the conversation and authenticated, tenant-scoped ERP summary data to the local model; the browser never calls Ollama directly.

## Database without Docker

Create a PostgreSQL database/user, set its connection string in `.env`, then run:

```bash
npm run db:migrate
npm run db:seed
```

The default local URL is:

```text
postgresql://erp:erp@localhost:5432/erp
```

Migrations are transactional and tracked in `schema_migrations`. Seeding is idempotent, so it is safe to run more than once.

`DB_SCHEMA=erp` isolates the ERP tables from other applications that share the same PostgreSQL database, such as an existing POS application using the `public` schema.

## Commands

```bash
npm run dev               # Serve ERP interface and API in parallel
npm run dev:all           # Serve all interfaces, APIs, Vision Service, and worker
npm run dev:erp_interface # Frontend only
npm run dev:erp_api       # API only
npm run dev:ecommerce     # Commerce storefront and ERP API
npm run dev:retail_ms_interface # Retail frontend only
npm run serve:automation-api    # Automation gateway only
npm run serve:vision-service    # Vision tracking API only
npm run start:cam-api           # Prepare and start the camera/Vision API on Windows
npm run start:cameras           # Start the Python camera agent through Nx
npm run vision:probe-cameras    # Diagnose OpenCV indices and black camera streams
npm run vision:smoke            # Verify Vision API ingestion and WebSocket events
npm run serve:worker            # BullMQ worker only
npm run build             # Production builds through Nx
npm test                  # All workspace tests
npm run typecheck         # All workspace projects
npm run lint              # All workspace projects
npm run graph             # Nx dependency graph
npm run db:up             # Start PostgreSQL container
npm run db:down           # Stop containers
npm run db:migrate        # Apply ERP migrations
npm run db:seed           # Load authentication users and roles only
npm run db:seed:business # Load repeatable PostgreSQL demo business records
npm run db:reset          # Delete business data while preserving users and roles
```

Use `npx nx ...` instead of a globally installed `nx` command so the workspace uses its local Nx 23 version.

## Access from another device on the local network

Connect the computer and mobile device to the same trusted Wi-Fi network. Start the API normally and expose the Vite frontend on all network interfaces:

```powershell
npm run serve:erp_api
npm run dev:erp_interface -- --host 0.0.0.0
```

Find the computer's Wi-Fi IPv4 address with `Get-NetIPAddress -AddressFamily IPv4`, then open `http://<PC-IP>:5173` on the mobile device. For example: `http://192.168.1.9:5173`.

Run PowerShell as Administrator once to allow the development ports on a Private network:

```powershell
New-NetFirewallRule -DisplayName "SME ERP Frontend" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow -Profile Private
New-NetFirewallRule -DisplayName "SME ERP API" -Direction Inbound -Protocol TCP -LocalPort 3333 -Action Allow -Profile Private
```

Ensure the Wi-Fi profile is `Private` and configure `CORS_ORIGIN`/the frontend API URL for the LAN address if the browser reports an API connection or CORS error. These commands expose development servers only to the local network; use the production deployment guide for internet access.

The camera launcher selects USB camera index `0` by default. On the tested Windows machine, this is the working Razer Kiyo color stream; index `1` opens a black auxiliary endpoint. If Windows assigns a different OpenCV index, pass it explicitly:

```powershell
npm run start:cameras -- -CameraIndex 0
npm run start:cameras -- -CameraIndex 2
```

Press `Q` in the camera window to stop it or `R` to reset the counters.

If the camera opens with no usable image, stop the camera agent and run `npm run vision:probe-cameras`. Choose an index whose output has meaningful `mean` and `std` values, then pass it using `-CameraIndex` as shown above. The launcher rejects black camera endpoints during startup.

## Retail management and automation

The `retail_ms_interface` application runs on port `4200` and calls the Automation API on port `3334`. Copy the app-specific examples when separate environment files are needed:

```powershell
Copy-Item apps/web/retail-ms-interface/.env.example apps/web/retail-ms-interface/.env
Copy-Item apps/automation/automation-api/.env.example apps/automation/automation-api/.env
```

Set `N8N_API_KEY` and the n8n URLs in `apps/automation/automation-api/.env` to enable live workflows. Without n8n credentials, the Automation API still starts but reports `AUTOMATION_UNCONFIGURED` from its status endpoint.

## Vision Service and Python camera publisher

`vision-service` is a NestJS/TypeScript API. `vision-camera-agent` is a separate Python application that sends tracking summaries to it; video frames are not sent to the API.

Configure these values in the root `.env` using `apps/services/vision-service/.env.example` as a guide:

```env
VISION_SERVICE_PORT=3335
VISION_DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/DATABASE?schema=vision
CAMERA_API_KEY_PEPPER=replace-with-a-long-random-secret
CAMERA_API_KEY=replace-with-the-seeded-camera-key
VISION_API_URL=http://localhost:3335/api/v1
```

The dedicated `vision` PostgreSQL schema prevents Vision Service migrations from modifying ERP or POS tables. Initialize and run it with:

```bash
npm run vision:generate
npm run vision:migrate
npm run vision:seed
npm run serve:vision-service
```

Verify it with `http://localhost:3335/api/v1/health`. To run the Python camera client, install its Python dependencies and then run:

```bash
python -m pip install -r apps/services/vision-camera-agent/requirements.txt
npm run serve:vision-camera-agent
```

## Business operations foundation

New business APIs accept decimal strings such as `"1250.50"` so financial values are exact. Receipt mutations require an `Idempotency-Key` header. Purchase orders must be submitted and approved before receipt. Configure units, tax rules, warehouses, and the `inventory` and `grni` ledger mappings before posting receipts.

```bash
npm run db:migrate
npm run typecheck
npm test
npm run lint
npm run build
```

## Implemented backend behavior

- Login/session UI with JWT authentication and tenant/company identity in the token
- Database-backed role permissions enforced by API middleware
- Role administration for listing roles, creating users, and changing user roles
- Company-isolated custom role creation, editing, permission assignment, and safe deletion
- Permission-filtered navigation, quick actions, write buttons, and guarded direct URLs for every ERP module
- Employee-only attendance portal routing
- Human-resources setup CRUD for departments and shifts
- Attendance-linked payroll runs with approval and payment lifecycle
- Thirty authenticated, tenant-scoped reports with CSV export
- Shared success/error toasts that display API response messages
- i18next/react-i18next localization with Arabic and English resources, persisted language choice, and automatic RTL/LTR document direction
- Tenant-scoped CRUD APIs for products, customers, and suppliers
- Sales invoice reads and transactional creation
- Atomic inventory deduction and customer balance updates during invoice creation
- Database-derived dashboard summary
- Local Ollama AI assistant using `qwen2.5-coder:7b`, authenticated ERP context, and Arabic/English prompts
- Zod validation, consistent errors, Helmet security headers, CORS configuration, and graceful shutdown
- PostgreSQL constraints, indexes, migration runner, and repeatable seed data

Main API routes:

```text
POST   /api/auth/login
GET    /api/auth/me
GET    /api/roles
GET    /api/roles/permissions
POST|PATCH|DELETE /api/roles/custom
GET|POST /api/roles/users
PATCH  /api/roles/users/:id/role
DELETE /api/roles/users/:id
GET    /api/dashboard/summary
GET|POST|PATCH|DELETE /api/products
GET|POST|PATCH|DELETE /api/customers
GET|POST|PATCH|DELETE /api/suppliers
GET|POST /api/sales/invoices
GET|POST|PATCH|DELETE /api/hr/*
GET|POST|PATCH|DELETE /api/attendance/*
GET|POST /api/payroll/*
GET    /api/reports/*
GET    /api/ai/status
POST   /api/ai/chat
```

## Postman

Import both files from `docs/postman` into Postman, select the **SME ERP - Local** environment, and run **Authentication / Login** first. The collection automatically stores the access token and generated resource IDs.

The dashboard and ERP module pages use authenticated API data. Mutations write to PostgreSQL through the API and refresh the web state after successful operations. API errors and backend messages appear in the shared toast host. Authorized administrators can manage users, built-in role assignments, and custom roles at `/settings/roles`.

## Production notes

- Use a managed PostgreSQL database with backups and TLS.
- Set a long random `JWT_SECRET`, explicit `CORS_ORIGIN`, and production `DATABASE_URL`.
- Serve `dist/apps/web/erp-interface` from a static host with SPA fallback to `index.html`.
- Run `dist/apps/api/erp-api/main.js` behind a TLS reverse proxy.
- Add refresh-token rotation and secure cookie-based sessions before exposing the application publicly.
- Run migrations as a deployment step before starting the API.
