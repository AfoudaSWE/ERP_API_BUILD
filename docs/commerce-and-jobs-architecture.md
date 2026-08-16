# Commerce and background jobs

## Architecture

This workspace remains a modular monolith. `apps/web/erp-interface` is the ERP UI, `apps/api/erp-api` is the synchronous Express composition root, and `apps/workers/jobs-worker` is a server-only BullMQ composition root with no HTTP business routes.

The existing PostgreSQL `products`, `categories`, and inventory tables remain authoritative. Catalog contracts live in `libs/domains/commerce/catalog/contracts`; the catalog application port lives in `libs/domains/commerce/catalog/backend/application`. ERP's legacy `/api/products` contract is unchanged.

Shared browser authentication and HTTP primitives live under `libs/frontend`. Backend PostgreSQL pool construction lives under `libs/backend/database`. Nx tags and ESLint module-boundary rules prevent frontend-to-backend imports and keep isomorphic contracts framework-independent.

The implemented bounded-domain foundation is Catalog with Pricing and Inventory fields exposed through explicit ownership boundaries. Orders, Promotions, Cart, Checkout, Customers, Payments, Shipping, Reviews, and editorial CMS remain follow-up domains; no empty placeholder libraries were generated.

## Run locally

```bash
npm run db:up
npm run redis:up
npm run db:migrate
npm run serve:erp_api
npm run serve:worker
```

The API and worker are independent processes. `docker compose up -d postgres redis` starts both local dependencies.

Required Redis settings are `REDIS_HOST`, `REDIS_PORT`, `REDIS_USERNAME`, `REDIS_PASSWORD`, `REDIS_TLS`, `REDIS_DB`, and `REDIS_PREFIX`. Per-queue concurrency settings are documented in `.env.example`. Secrets must be supplied by the deployment environment.

## Jobs

Queue and job names and payloads are defined only in `libs/backend/jobs/contracts`. The API uses `libs/backend/jobs/producers`; it never imports processors. To enqueue the implemented job, call authenticated endpoint `POST /api/jobs/inventory/check-low-stock`, or inject `InventoryJobsProducer` into an application use case.

To add a processor:

1. Add its typed payload and queue mapping to jobs contracts.
2. Add a producer method with a deterministic ID when the operation must be unique.
3. Implement an idempotent handler in jobs processors against database state.
4. Register that handler in the worker composition root and configure bounded concurrency.
5. Add success, retry/failure, and idempotency tests.

Jobs retry four times with exponential backoff. Completed and failed jobs have bounded retention. `job_executions` provides database-backed claims for the implemented low-stock check, and PostgreSQL—not Redis—is the source of truth. Logs include queue/name/job ID and lifecycle state, never payloads or credentials.

The producer interface is an outbox-compatible boundary, but publication currently happens after the caller's database transaction. A transactional outbox and relay are recommended before using jobs for correctness-critical dual writes. Email, media, order synchronization, reservation release, and report jobs are typed but deliberately listed as unregistered until their provider/application services exist.

## Verification commands

```bash
npm run test:commerce
npm run test:jobs
npm run lint
npm run typecheck
npm run build:worker
```
