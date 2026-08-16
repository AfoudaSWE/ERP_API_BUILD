# Tasks: Business Operations Core

**Input**: Design documents from `specs/001-business-operations-core/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/openapi.yaml`,
`quickstart.md`

**Tests**: Required by the project constitution for all business mutations, authorization boundaries,
tenant isolation, decimal calculations, state transitions, rollback, and idempotent retries.

**Organization**: Tasks are grouped by independently testable user story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish feature-level test and contract structure without changing business behavior.

- [X] T001 Add feature test directories and PostgreSQL integration-test bootstrap in `apps/api/erp-api/src/test/db.ts`
- [X] T002 [P] Add browser E2E project and critical-role fixtures in `apps/web/erp-interface/e2e/fixtures/auth.ts`
- [X] T003 [P] Export feature contract modules from `libs/shared/contracts/src/index.ts`
- [X] T004 Document business-operations environment and validation commands in `README.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared integrity controls that block every business story.

**⚠️ CRITICAL**: No user-story implementation begins until this phase passes.

- [X] T005 Write decimal parsing, rounding, and serialization tests in `libs/shared/contracts/src/decimal.test.ts`
- [X] T006 Implement decimal-string schemas and helpers in `libs/shared/contracts/src/decimal.ts`
- [X] T007 [P] Write document-number concurrency tests in `apps/api/erp-api/src/lib/document-number.test.ts`
- [X] T008 Implement locked company document sequences in `apps/api/erp-api/src/lib/document-number.ts`
- [X] T009 [P] Write idempotency replay/conflict tests in `apps/api/erp-api/src/lib/idempotency.test.ts`
- [X] T010 Implement idempotency middleware and record service in `apps/api/erp-api/src/lib/idempotency.ts`
- [X] T011 [P] Write audit append/query and tenant-isolation tests in `apps/api/erp-api/src/features/audit/audit.test.ts`
- [X] T012 Implement immutable audit event service and router in `apps/api/erp-api/src/features/audit/routes.ts`
- [X] T013 [P] Define shared document, money, tax/unit master-data, error, and concrete OpenAPI request/response contracts in `libs/shared/contracts/src/common.ts`
- [X] T014 Add tax/unit master data, document sequence, idempotency, audit, ledger accounts, journals, and lines in `apps/api/erp-api/src/db/migrations/004_business_foundation.sql`
- [X] T015 Add new granular inventory/accounting/cash/audit permissions and role assignments in `apps/api/erp-api/src/db/migrations/005_business_permissions.sql`
- [X] T016 Add request correlation and structured operational logging in `apps/api/erp-api/src/lib/observability.ts`
- [X] T017 Implement master-data routes, minimum automatic journal posting, foundation routers, and error-safe transaction composition in `apps/api/erp-api/src/app.ts`

**Checkpoint**: Decimal integrity, numbering, retry safety, auditing, permissions, and transaction support pass.

---

## Phase 3: User Story 1 - Procure and Receive Stock (Priority: P1) 🎯 MVP

**Goal**: Approved purchase orders can be partially received into an authoritative stock ledger exactly once.

**Independent Test**: Create, approve, partially receive twice, retry one receipt, and reject an excess receipt;
verify purchase state, stock, supplier payable source, balanced journal, tenant boundary, and audit trail.

### Tests for User Story 1

- [X] T018 [P] [US1] Add purchase-order contract and state-transition tests in `apps/api/erp-api/src/features/purchasing/purchasing.test.ts`
- [X] T019 [P] [US1] Add receipt concurrency, rollback, excess, and retry tests in `apps/api/erp-api/src/features/inventory/receipts.test.ts`
- [X] T020 [P] [US1] Add purchasing/inventory authorization and cross-company tests in `apps/api/erp-api/src/features/purchasing/authorization.test.ts`
- [X] T021 [P] [US1] Add procure-to-stock browser journey in `apps/web/erp-interface/e2e/procure-to-stock.spec.ts`

### Implementation for User Story 1

- [X] T022 [P] [US1] Define warehouse, purchase order, receipt, and inventory contracts in `libs/shared/contracts/src/purchasing.ts`
- [X] T023 [P] [US1] Define stock availability/movement contracts in `libs/shared/contracts/src/inventory.ts`
- [X] T024 [US1] Add warehouses, purchase orders/items, receipts/items, movements, and balances in `apps/api/erp-api/src/db/migrations/006_procure_to_stock.sql`
- [X] T025 [US1] Implement warehouse and locked inventory-balance services in `apps/api/erp-api/src/features/inventory/service.ts`
- [X] T026 [US1] Implement purchase order state machine and approval rules in `apps/api/erp-api/src/features/purchasing/service.ts`
- [X] T027 [US1] Implement idempotent receipt posting, stock movement, GRNI supplier accrual, journal, and audit unit-of-work in `apps/api/erp-api/src/features/purchasing/receipt-service.ts`
- [X] T028 [US1] Expose warehouse, order action, receipt, availability, and movement routes in `apps/api/erp-api/src/features/purchasing/routes.ts`
- [X] T029 [US1] Replace purchasing mock/empty views with API-backed orders and receipt forms in `apps/web/erp-interface/src/app/purchases/page.tsx`
- [X] T030 [US1] Replace inventory mock/empty views with warehouse availability and movement drill-down in `apps/web/erp-interface/src/app/inventory/page.tsx`

**Checkpoint**: Procure-to-stock works as a deployable MVP with no direct stock editing.

---

## Phase 4: User Story 2 - Sell, Return, and Collect (Priority: P2)

**Goal**: Sales, payment allocation, and returns keep stock and customer balances synchronized.

**Independent Test**: Create a partially paid sale, collect it, return one unit, retry the return, and reject
overselling/over-allocation while all ledgers reconcile.

### Tests for User Story 2

- [X] T031 [P] [US2] Extend sales tests for locked availability, decimal totals, rollback, and retry in `apps/api/erp-api/src/features/sales/sales.test.ts`
- [X] T032 [P] [US2] Add payment allocation and over-allocation tests in `apps/api/erp-api/src/features/sales/payments.test.ts`
- [X] T033 [P] [US2] Add return eligibility, retry, stock, credit, and tax tests in `apps/api/erp-api/src/features/sales/returns.test.ts`
- [X] T034 [P] [US2] Add bilingual sale-payment-return browser journey in `apps/web/erp-interface/e2e/order-to-cash.spec.ts`

### Implementation for User Story 2

- [X] T035 [P] [US2] Extend invoice, payment, allocation, and return contracts in `libs/shared/contracts/src/sales.ts`
- [X] T036 [US2] Add payment, allocation, return, invoice posting, and reversal fields in `apps/api/erp-api/src/db/migrations/007_order_to_cash.sql`
- [X] T037 [US2] Refactor invoice creation into locked stock/customer/journal/audit unit-of-work in `apps/api/erp-api/src/features/sales/posting-service.ts`
- [X] T038 [US2] Implement idempotent payment posting and allocation in `apps/api/erp-api/src/features/sales/payment-service.ts`
- [X] T039 [US2] Implement return eligibility and reversal posting in `apps/api/erp-api/src/features/sales/return-service.ts`
- [X] T040 [US2] Add payment, return, and source-drill routes in `apps/api/erp-api/src/features/sales/routes.ts`
- [X] T041 [US2] Add API-backed payment/return actions and conflict recovery in `apps/web/erp-interface/src/app/sales/page.tsx`
- [X] T042 [US2] Make POS use live inventory, customers, invoice posting, and idempotent checkout in `apps/web/erp-interface/src/app/pos/page.tsx`

**Checkpoint**: Order-to-cash works independently and reconciles to stock/customer ledgers.

---

## Phase 5: User Story 3 - Close Books with Traceable Journals (Priority: P3)

**Goal**: Automatic and manual postings balance, remain immutable, reverse safely, and obey period close.

**Independent Test**: Trace source postings, reject an unbalanced journal, post/reverse a balanced journal,
close a period, and block unauthorized backdated postings.

### Tests for User Story 3

- [X] T043 [P] [US3] Add posting balance, unique source, and reversal tests in `apps/api/erp-api/src/features/accounting/posting.test.ts`
- [X] T044 [P] [US3] Add manual journal state/immutability tests in `apps/api/erp-api/src/features/accounting/journals.test.ts`
- [X] T045 [P] [US3] Add period overlap, close, reopen, and backdated-operation tests in `apps/api/erp-api/src/features/accounting/periods.test.ts`
- [X] T046 [P] [US3] Add accountant/auditor authorization and trace browser journey in `apps/web/erp-interface/e2e/accounting-close.spec.ts`

### Implementation for User Story 3

- [X] T047 [P] [US3] Define account, journal, line, reversal, and period contracts in `libs/shared/contracts/src/accounting.ts`
- [X] T048 [US3] Extend foundation ledger with manual-journal, reversal, source-mapping, and accounting-period controls in `apps/api/erp-api/src/db/migrations/008_accounting_core.sql`
- [X] T049 [US3] Seed company chart-of-account templates and required system mappings in `apps/api/erp-api/src/db/seed-accounting.ts`
- [X] T050 [US3] Extend automatic posting with manual source rules, controlled reversal, and source trace in `apps/api/erp-api/src/features/accounting/posting-service.ts`
- [X] T051 [US3] Implement manual journal validation/state actions in `apps/api/erp-api/src/features/accounting/journal-service.ts`
- [X] T052 [US3] Implement period close/reopen guard shared by all posting services in `apps/api/erp-api/src/features/accounting/period-service.ts`
- [X] T053 [US3] Expose account, journal, source trace, and period action routes in `apps/api/erp-api/src/features/accounting/routes.ts`
- [X] T054 [US3] Replace accounting empty states with API-backed accounts, journals, source trace, and periods in `apps/web/erp-interface/src/app/accounting/page.tsx`

**Checkpoint**: Books balance, posted history is immutable, and closed periods are enforced globally.

---

## Phase 6: User Story 4 - Manage Cash and Business Expenses (Priority: P4)

**Goal**: Cash/bank accounts, expense approval/payment, transfers, and reconciliation remain balanced.

**Independent Test**: Pay an approved expense, transfer funds, reconcile statement lines, and verify account
movements, journals, permissions, and immutable completion.

### Tests for User Story 4

- [ ] T055 [P] [US4] Add expense approval/payment separation and rollback tests in `apps/api/erp-api/src/features/finance/expenses.test.ts`
- [ ] T056 [P] [US4] Add linked transfer, insufficient-funds, and retry tests in `apps/api/erp-api/src/features/finance/transfers.test.ts`
- [ ] T057 [P] [US4] Add statement import/match/difference/completion tests in `apps/api/erp-api/src/features/finance/reconciliation.test.ts`
- [ ] T058 [P] [US4] Add finance authorization and bilingual browser journey in `apps/web/erp-interface/e2e/cash-expense-reconciliation.spec.ts`

### Implementation for User Story 4

- [ ] T059 [P] [US4] Define account, movement, expense action, transfer, and reconciliation contracts in `libs/shared/contracts/src/finance.ts`
- [ ] T060 [US4] Add financial accounts/movements, transfers, reconciliation tables, and expense fields in `apps/api/erp-api/src/db/migrations/009_finance_core.sql`
- [ ] T061 [US4] Implement financial account balance and transfer posting in `apps/api/erp-api/src/features/finance/account-service.ts`
- [ ] T062 [US4] Implement expense approval/payment state machine in `apps/api/erp-api/src/features/finance/expense-service.ts`
- [ ] T063 [US4] Implement statement identity, matching, adjustment, and completion in `apps/api/erp-api/src/features/finance/reconciliation-service.ts`
- [ ] T064 [US4] Expose accounts, movements, expense actions, transfers, and reconciliation routes in `apps/api/erp-api/src/features/finance/routes.ts`
- [ ] T065 [US4] Replace cash, expense, and reconciliation empty/mock views with API workflows in `apps/web/erp-interface/src/app/expenses/page.tsx` and `apps/web/erp-interface/src/components/shared/OperationsPage.tsx`

**Checkpoint**: Finance users can explain every account balance and reconciliation difference.

---

## Phase 7: User Story 5 - Act on Reliable Business Reports (Priority: P5)

**Goal**: Managers consume authorized summaries that reconcile and drill to persisted sources.

**Independent Test**: Run every scoped report for a controlled period, reconcile totals, drill to sources,
export the same result, and verify empty-period and cross-company behavior.

### Tests for User Story 5

- [ ] T066 [P] [US5] Add operational report reconciliation and drill-down tests in `apps/api/erp-api/src/features/reports/operations.test.ts`
- [ ] T067 [P] [US5] Add financial statement balance and period tests in `apps/api/erp-api/src/features/reports/financial.test.ts`
- [ ] T068 [P] [US5] Add export parity, tenant isolation, and empty-period tests in `apps/api/erp-api/src/features/reports/export.test.ts`
- [ ] T069 [P] [US5] Add manager report drill-down browser journey in `apps/web/erp-interface/e2e/reports.spec.ts`

### Implementation for User Story 5

- [ ] T070 [P] [US5] Define report filter, summary, drill-down, and export contracts in `libs/shared/contracts/src/reports.ts`
- [ ] T071 [US5] Add report indexes and source-drill database views in `apps/api/erp-api/src/db/migrations/010_reporting.sql`
- [ ] T072 [US5] Implement inventory, purchasing, sales, receivable, and payable queries in `apps/api/erp-api/src/features/reports/operations-service.ts`
- [ ] T073 [US5] Implement trial balance, income statement, balance sheet, cash flow, and tax queries in `apps/api/erp-api/src/features/reports/financial-service.ts`
- [ ] T074 [US5] Expose scoped report, drill-down, and streaming export routes in `apps/api/erp-api/src/features/reports/routes.ts`
- [ ] T075 [US5] Replace report empty states and dashboard placeholders with API summaries/drill-down in `apps/web/erp-interface/src/app/reports/page.tsx`

**Checkpoint**: Every displayed/exported material total reconciles to source business records.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Validate the whole feature and remove transitional compatibility behavior.

- [ ] T076 [P] Add Arabic/English strings and RTL/LTR visual checks for all new workflows in `apps/web/erp-interface/src/lib/i18n-config.ts`
- [ ] T077 [P] Update Postman collection for all business-core endpoints in `docs/postman/SME-ERP.postman_collection.json`
- [ ] T078 Validate operation IDs, permission notes, and concrete request/response schemas in `specs/001-business-operations-core/contracts/openapi.yaml`
- [ ] T079 Add migration/backfill verification and reconciliation command in `apps/api/erp-api/src/db/verify-business-core.ts`
- [ ] T080 Remove remaining direct `products.total_stock` writes after balance migration in `apps/api/erp-api/src/features/catalog/routes.ts`
- [ ] T081 Run and record all acceptance scenarios from `specs/001-business-operations-core/quickstart.md`
- [ ] T082 Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` and resolve all failures
- [ ] T083 Run Spec Kit cross-artifact analysis and close every CRITICAL/HIGH finding in `specs/001-business-operations-core/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup** has no dependencies.
- **Foundational** depends on Setup and blocks every story.
- **US1 Procure-to-stock** starts after Foundational and is the MVP.
- **US2 Order-to-cash** starts after inventory balance/posting foundations; it does not require US1 UI.
- **US3 Accounting close** starts after posting foundations and completes source accounting used by US1/US2.
- **US4 Finance** depends on accounting posting/period services from US3.
- **US5 Reports** depends on the source ledgers of the stories selected for release.
- **Polish** follows all stories included in the release.

## Requirement Coverage Matrix

| Requirement IDs | Tasks |
|---|---|
| FR-001, FR-018, FR-021 | T011-T017, T020, T046, T069 |
| FR-002 | T013-T017, T022-T026, T047-T049, T059-T061 |
| FR-003-FR-006, FR-023 | T018-T030 |
| FR-007 | T009-T010, T019, T031-T033, T055-T057 |
| FR-008-FR-010 | T031-T042 |
| FR-011-FR-013 | T014, T017, T043-T054 |
| FR-014-FR-016 | T055-T065 |
| FR-017, FR-020 | T066-T075 |
| FR-019 | T021, T034, T046, T058, T069, T076 |
| FR-022 | Existing reset implementation, T004, T079 |
| SC-001-SC-009 | T021, T034, T046, T058, T069, T081-T083 |

### User Story Dependency Graph

```text
Foundation
├── US1 Procure-to-stock (MVP) ──┐
├── US2 Order-to-cash ───────────┼── US5 Reports
└── US3 Accounting ── US4 Finance┘
```

### Parallel Opportunities

- Schema/contract/test tasks marked `[P]` can run concurrently when they touch different files.
- After Foundation, US1 contract/UI work and US2 contract/test work can overlap with accounting model work.
- Within every story, contract and browser test scaffolds can run in parallel before service implementation.
- Report operational and financial query work can run in parallel after source schemas stabilize.

## Parallel Example: User Story 1

```text
T018 Purchase state/contract tests
T019 Receipt concurrency/rollback tests
T020 Authorization/tenant tests
T021 Browser journey scaffold
T022 Purchasing contracts
T023 Inventory contracts
```

## Implementation Strategy

### MVP First

1. Complete T001-T017 (Setup + Foundation).
2. Complete T018-T030 (US1).
3. Stop and execute procure-to-stock quickstart scenario independently.
4. Demonstrate reliable partial receipts, exact retry behavior, stock trace, payable source, and audit.

### Incremental Delivery

1. Foundation + US1: inventory acquisition and stock truth.
2. Add US2: revenue and customer settlement.
3. Add US3: controlled books and period close.
4. Add US4: liquidity, expenses, and reconciliation.
5. Add US5: management reporting over trustworthy ledgers.

## Task Summary

- Total tasks: 83
- Setup/Foundation: 17
- US1: 13
- US2: 12
- US3: 12
- US4: 11
- US5: 10
- Polish: 8
- Suggested MVP: T001-T030 (Foundation plus US1)
- Format validation: every task uses checkbox, sequential ID, optional `[P]`, required story label,
  action, and exact file path.

## Phase 9: Convergence

- [ ] T084 CRITICAL Recheck active user, tenant, and company membership during authenticated requests and add inactive-user negative tests in `apps/api/erp-api/src/features/auth/middleware.ts` per Constitution II and FR-001 (contradicts)
- [ ] T085 CRITICAL Add database immutability enforcement and mutation tests for posted goods-receipt headers in `apps/api/erp-api/src/db/migrations/006_procure_to_stock.sql` and `apps/api/erp-api/src/features/inventory/receipts.test.ts` per FR-012 and US1/AC2 (partial)
- [ ] T086 CRITICAL Make master-data mutations and purchase-order actions transactionally idempotent and audit actor/company/before-after/operation references in `apps/api/erp-api/src/features/master-data/routes.ts` and `apps/api/erp-api/src/features/purchasing/routes.ts` per FR-007 and FR-018 (partial)
- [ ] T087 Preserve decimal strings in master-data responses and add response-contract tests in `apps/api/erp-api/src/features/master-data/routes.ts` per plan: decimal-string contracts (contradicts)
- [ ] T088 [US1] Support selectable multi-line partial receipt quantities and per-line remaining validation in `apps/web/erp-interface/src/app/purchases/page.tsx` per FR-004 and SC-001 (partial)
- [ ] T089 [US1] Validate inventory availability filters and return pagination metadata in `apps/api/erp-api/src/features/purchasing/routes.ts` per FR-019 and plan: contract validation (partial)
