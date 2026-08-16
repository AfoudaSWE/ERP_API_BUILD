# Quickstart Validation: Business Operations Core

This guide defines the acceptance path for the feature. It is not implementation documentation.

## Prerequisites

- Node.js 22+, npm 10+, PostgreSQL 14+
- `.env` configured for a disposable validation database/schema
- Existing migrations and authentication users/roles loaded
- Owner, purchasing manager, inventory manager, sales representative, accountant, finance manager, and
  auditor test logins available

## Setup

```powershell
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Run validation commands in a separate terminal:

```powershell
npm run typecheck
npm run lint
npm test
```

## Scenario 1: Procure-to-stock MVP

1. As owner, create an active warehouse and verify an unauthorized employee cannot create one.
2. As purchasing manager, create and submit an order with two items; approve it with an authorized role.
3. As inventory manager, receive half of item one using a unique idempotency key.
4. Repeat the identical request with the same key and confirm no quantities or journal totals change.
5. Receive the remainder in a second receipt and verify order status, stock movement drill-down, inventory
   availability, supplier payable, journal balance, and audit actor.
6. Attempt an excess receipt and confirm the entire request rolls back.

Expected: quantities reconcile exactly, every journal balances, and all cross-role denials are enforced.

## Scenario 2: Order-to-cash

1. Sell an in-stock item with a partial payment.
2. Verify invoice, stock issue, customer balance, payment allocation, journal, and audit event.
3. Collect the remainder; verify over-allocation is rejected.
4. Return one eligible unit, retry the return key, and verify one stock return and one customer credit.
5. Attempt a sale above availability and confirm no partial invoice or movement remains.

Expected: inventory and customer outstanding balances reconcile to their ledgers after every step.

## Scenario 3: Accounting close

1. Review source-linked journals from scenarios 1 and 2.
2. Try posting an unbalanced manual journal; confirm rejection.
3. Post a balanced manual journal and reverse it; confirm original history is unchanged.
4. Close the period and attempt a backdated sale, receipt, payment, and journal.
5. As auditor, trace sources and actors but confirm mutation endpoints are forbidden.

Expected: posted journals remain immutable and closed-period rules apply consistently.

## Scenario 4: Cash, expense, and reconciliation

1. Create cash and bank accounts, submit and approve an expense, and pay it.
2. Transfer funds between accounts and verify equal linked movements.
3. Enter/import statement lines, match transactions, complete reconciliation, and verify the difference.
4. Confirm a second user cannot silently edit completed reconciliation data.

Expected: account balances, movements, expenses, and journals reconcile exactly.

## Scenario 5: Reports and language parity

1. Run inventory, purchasing, sales, receivable, payable, trial balance, income statement, cash, and tax
   reports over the validation period.
2. Drill each material total to source documents and verify the detail sum.
3. Repeat critical workflows in Arabic RTL and English LTR.
4. Run reports for an empty period and confirm no demo/fabricated rows appear.

Expected: report totals agree with source ledgers and business behavior is identical in both languages.

## Final gates

- All automated suites and production builds pass.
- No unresolved Spec Kit checklist or constitution violation remains.
- Every task for the selected story is checked and its independent acceptance test passes.
