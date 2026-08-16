# Implementation Plan: Business Operations Core

**Branch**: `001-business-operations-core` | **Date**: 2026-07-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-business-operations-core/spec.md`

## Summary

Extend the existing Nx web/API/PostgreSQL workspace into a dependable operational ERP core. Deliver
procure-to-stock first, then order-to-cash, accounting posting and period close, cash/expense controls,
and source-drillable reports. Use append-only stock, payment, journal, and audit records; transactional
posting services; decimal-string contracts; idempotent mutation references; and server-side tenant/RBAC
guards. Replace remaining empty frontend-only modules story by story with authenticated API state.

## Technical Context

**Language/Version**: TypeScript 5.9; Node.js 22; React 19

**Primary Dependencies**: Nx 23, Express 5, Zod 4, `pg`, React Router 7, i18next/react-i18next,
Vitest, Supertest, Vite

**Storage**: PostgreSQL 14+ in the configured `erp` schema; forward-only SQL migrations

**Testing**: Vitest unit/contract/integration tests, Supertest HTTP tests, PostgreSQL-backed transaction
tests, and browser E2E validation for critical bilingual journeys

**Target Platform**: Modern desktop/mobile web browser plus Node.js API on Windows/Linux deployment

**Project Type**: Nx full-stack monorepo with web application, REST API, and shared contracts library

**Performance Goals**: Common lists and document views p95 under 1 second for 100,000 documents per
company; standard business mutations p95 under 2 seconds excluding exports; report summaries p95 under
5 seconds for a one-year period

**Constraints**: Strict tenant isolation; server-enforced RBAC; decimal-safe money; transactional stock
and financial posting; immutable posted records; Arabic/English parity; no client business fallbacks;
idempotent retries; existing users/roles and current API compatibility migrated safely

**Scale/Scope**: Initial target of 100 companies, 100 users/company, 100 warehouses/company, 100,000
products/company, 1,000,000 movements/company/year, and five independently deployable user stories

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Gate | Pre-design | Post-design evidence |
|---|---|---|
| PostgreSQL is the sole business source of truth | PASS | Contracts expose persisted records only; UI work consumes APIs |
| Stock and financial changes are atomic and auditable | PASS | Posting unit-of-work, ledgers, operation references, audit events |
| Tenant and permissions enforced on server | PASS | Every contract declares permission and company scope |
| Requirements trace to stories, contracts, and tests | PASS | FR identifiers mapped in contracts and task phases |
| Financial and stock risk has automated tests | PASS | Quickstart and tasks require rollback, retry, balance, isolation tests |
| Arabic/English and operational states are delivered | PASS | Each story includes bilingual empty/error/success acceptance work |
| AI remains read-only | PASS | No AI mutation capability is introduced |

No constitution exceptions are required.

## Project Structure

### Documentation (this feature)

```text
specs/001-business-operations-core/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi.yaml
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/api/erp-api/src/
├── db/migrations/             # Forward-only schema changes
├── features/
│   ├── purchasing/            # Orders, approvals, receipts
│   ├── inventory/             # Warehouses, movements, availability
│   ├── sales/                 # Existing invoices plus payments and returns
│   ├── accounting/            # Accounts, journals, periods, posting
│   ├── finance/               # Cash/bank accounts, expenses, transfers, reconciliation
│   ├── reports/               # Source-drillable report queries and exports
│   └── audit/                 # Immutable audit query/write support
└── lib/                       # Decimal, idempotency, transaction, numbering helpers

apps/web/erp-interface/src/
├── app/                       # Role-specific business pages and routes
├── components/                # Shared document, state, money, and audit UI
└── lib/                       # Authenticated API hooks; no business fallbacks

libs/shared/contracts/src/
├── purchasing.ts
├── inventory.ts
├── sales.ts
├── accounting.ts
├── finance.ts
└── reports.ts

apps/api/erp-api/src/**/*.test.ts      # Unit, HTTP contract, authorization, transaction tests
apps/web/erp-interface/e2e/                  # Critical bilingual end-to-end journeys
```

**Structure Decision**: Extend the existing three-project Nx layout. Domain routers/services remain in
`apps/api/erp-api`, UI slices remain in `apps/web/erp-interface`, and request/response validation belongs in `libs/shared/contracts`.
No new deployable service is justified for the initial scale.

## Delivery Sequence

1. Foundation: decimal contracts, master data, numbering, idempotency, audit, minimum journal ledger and
   automatic posting unit.
2. MVP: purchase order approval and partial receipt into stock/payables.
3. Sales: availability, payment allocation, return and customer balance corrections.
4. Accounting: automatic/manual journals, posting, reversal, period close, audit trace.
5. Finance: accounts, expenses, transfers and reconciliation.
6. Reporting: operational and financial summaries with source drill-down and exports.

## Migration and Compatibility Strategy

- Add new tables and nullable source references before switching write paths.
- Backfill one opening stock movement per existing non-zero product balance; the reset database currently
  contains no business rows, but migration remains safe for other environments.
- Introduce decimal-string API fields and update shared/web consumers in the same deployable change.
- Preserve current invoice identifiers and create source events for new postings only; historical posting
  backfill requires an explicit operator command and reconciliation report.
- Retain `products.total_stock` temporarily as a transactionally maintained compatibility projection,
  then remove direct writes after all consumers use inventory balances.

## Complexity Tracking

No constitution violations or additional deployable services are introduced.

## Requirement Traceability

| Requirements | Plan components | Task coverage |
|---|---|---|
| FR-001, FR-018, FR-021 | Tenant/RBAC gates, immutable audit | T011-T017, T020, T046, T069 |
| FR-002 | Company master data, tax/unit/account mappings | T013-T017, T022-T026, T047-T049, T059-T061 |
| FR-003, FR-004 | Purchase order state machine and partial receipts | T018-T030 |
| FR-005, FR-006 | Stock movement authority and locked balance projection | T019, T023-T030, T080 |
| FR-007 | Company-scoped operation references | T009-T010 and every story retry test |
| FR-008-FR-010 | Atomic sales, payments, and returns | T031-T042 |
| FR-011-FR-013 | Balanced posting, reversal, and period close | T014, T017, T043-T054 |
| FR-014-FR-016 | Expenses, transfers, and reconciliation | T055-T065 |
| FR-017, FR-020 | Reports, drill-down, and export parity | T066-T075 |
| FR-019 | Bilingual operational states | T021, T034, T046, T058, T069, T076 |
| FR-022 | Auth-preserving explicit maintenance | Existing `db:reset`, T004, T079 |
| FR-023 | GRNI supplier accrual at receipt | T018, T019, T024, T027, T066 |
| SC-001-SC-009 | Quickstart and acceptance gates | T021, T034, T046, T058, T069, T081-T083 |
