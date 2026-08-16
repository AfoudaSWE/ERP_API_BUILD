# Feature Specification: Business Operations Core

**Feature Branch**: `001-business-operations-core`

**Created**: 2026-07-15

**Status**: Ready for planning

**Input**: User description: "Use Specification-Driven Development with Spec Kit to improve the ERP business system."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Procure and Receive Stock (Priority: P1)

A purchasing manager creates a purchase order, obtains approval when required, and a warehouse user
receives some or all ordered quantities. The business can see ordered, received, and outstanding
quantities and an accurate stock position without editing product balances directly.

**Why this priority**: Reliable inbound stock is the prerequisite for sales availability, supplier
liabilities, inventory valuation, and operational planning.

**Independent Test**: Create and approve a purchase order for an existing supplier and product, receive
   it in two partial receipts, and verify stock, order status, receipt history, and accrued supplier
   liability totals.

**Acceptance Scenarios**:

1. **Given** an active supplier, product, and warehouse, **When** an authorized purchaser submits a
   valid order, **Then** the order receives a unique number and records ordered quantities and totals.
2. **Given** an approved order with outstanding quantity, **When** an authorized warehouse user records
   a partial receipt, **Then** received and remaining quantities, stock, and payable source records update
   together exactly once.
3. **Given** a receipt request repeated with the same operation reference, **When** it is processed again,
   **Then** no duplicate stock or payable movement is created.
4. **Given** a cancelled, closed, or fully received order, **When** another receipt is attempted,
   **Then** the operation is rejected with no business data changes.

---

### User Story 2 - Sell, Return, and Collect (Priority: P2)

A sales representative or cashier creates a sale from available stock, records one or more payments,
and processes authorized returns. The customer balance, inventory, payment status, and source documents
remain synchronized.

**Why this priority**: Order-to-cash is the primary revenue workflow and must be trustworthy before the
system can replace spreadsheets or a separate POS process.

**Independent Test**: Sell an in-stock product on partial credit, collect the remainder, return one item,
and verify stock movements, customer balance, payment allocation, and document totals at every step.

**Acceptance Scenarios**:

1. **Given** sufficient available stock, **When** an authorized user confirms a sale, **Then** the system
   creates the invoice, issues stock, and updates the customer balance atomically.
2. **Given** insufficient available stock and negative stock disabled, **When** a sale is confirmed,
   **Then** it is rejected and neither invoice nor stock movement is persisted.
3. **Given** an unpaid or partially paid invoice, **When** a payment is recorded, **Then** it is allocated
   without exceeding the outstanding amount and the payment status is recalculated.
4. **Given** an eligible invoice line, **When** an authorized return is approved, **Then** returned stock,
   customer credit, tax, and invoice return totals update exactly once.

---

### User Story 3 - Close Books with Traceable Journals (Priority: P3)

An accountant reviews automatically generated journal entries from receipts, sales, returns, payments,
and expenses; creates controlled manual journals; and closes an accounting period so posted history is
balanced and protected from silent changes.

**Why this priority**: Operational workflows become business-ready only when their financial impact is
complete, balanced, explainable, and reviewable by auditors.

**Independent Test**: Complete one purchase receipt, sale, payment, return, and expense; verify balanced
source-linked journals; close the period; and confirm backdated mutations are blocked or follow an
authorized adjustment flow.

**Acceptance Scenarios**:

1. **Given** a posting-enabled business transaction, **When** it completes, **Then** a balanced journal
   linked to the source document is available to authorized accounting users.
2. **Given** a manual journal whose debits and credits differ, **When** posting is attempted, **Then** it
   is rejected and remains unposted.
3. **Given** a closed accounting period, **When** a user attempts to post or alter a dated transaction in
   that period, **Then** the system blocks it and records the failed attempt.
4. **Given** an auditor, **When** source-to-journal traceability is reviewed, **Then** the original actor,
   timestamps, source document, adjustments, and current state are visible without mutation access.

---

### User Story 4 - Manage Cash and Business Expenses (Priority: P4)

A finance user manages cash or bank accounts, records expenses and transfers, and reconciles recorded
balances to a statement while managers see current liquidity and unmatched differences.

**Why this priority**: Cash visibility and controlled expenses are needed for daily management and make
financial reports actionable.

**Independent Test**: Create a cash account and bank account, pay an approved expense, transfer funds,
import or enter statement lines, and reconcile them without changing posted source records.

**Acceptance Scenarios**:

1. **Given** an approved expense, **When** it is paid from an active account, **Then** the expense,
   account movement, and journal update atomically.
2. **Given** two active accounts in the same company, **When** a transfer is posted, **Then** equal linked
   outgoing and incoming movements are recorded.
3. **Given** statement and system transactions, **When** a finance user reconciles them, **Then** matches,
   unmatched items, and the reconciliation difference remain reviewable and auditable.

---

### User Story 5 - Act on Reliable Business Reports (Priority: P5)

An owner or manager views sales, purchasing, inventory, receivables, payables, profitability, cash, and
tax summaries derived from posted records and can drill from a total to its source documents.

**Why this priority**: Decision support is valuable only after operational and accounting sources are
reliable; this story turns trustworthy records into management action.

**Independent Test**: Run a controlled set of operational transactions, open each report for the same
date range, reconcile totals to source records, and drill from every summary to its components.

**Acceptance Scenarios**:

1. **Given** posted transactions in a selected period, **When** an authorized manager opens a report,
   **Then** totals use the company currency, timezone, and selected business dates consistently.
2. **Given** a report total, **When** the user drills into it, **Then** the contributing source documents
   are listed and sum to the displayed amount.
3. **Given** no transactions for a period, **When** a report is opened, **Then** it shows a clear empty
   state with zero totals rather than sample data.

### Edge Cases

- Concurrent receipts or sales for the same product must not create lost updates or negative stock.
- Quantities with fractional units, tax-inclusive pricing, discounts, rounding, and credit notes must
  produce deterministic totals.
- Deactivated suppliers, customers, products, warehouses, accounts, or users cannot be used for new
  transactions but remain visible on historical documents.
- Document numbers remain unique when requests are retried or multiple users create documents at once.
- A transaction failure at any posting step rolls back every related operational and financial change.
- Users changing roles during a session lose unauthorized capabilities on the next verified request.
- Cross-company identifiers return no data and never reveal whether another company's record exists.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST enforce company-scoped access and named permissions for every operation.
- **FR-002**: The system MUST maintain products, warehouses, units, tax rules, customers, suppliers,
  financial accounts, and document sequences as company-scoped master data.
- **FR-003**: The system MUST support draft, submitted, approved, partially received, received, cancelled,
  and closed purchase-order states with validated transitions.
- **FR-004**: The system MUST support partial goods receipts without allowing cumulative receipt quantity
  to exceed the approved order quantity unless an explicitly permitted tolerance applies.
- **FR-005**: Every receipt, issue, return, transfer, and adjustment MUST create an immutable stock movement.
- **FR-006**: Available stock MUST be calculated from stock movements and reservations, not arbitrary
  product balance edits.
- **FR-007**: The system MUST prevent duplicate effects for retried business mutations using an operation
  reference unique within the company.
- **FR-008**: Sales confirmation MUST atomically persist the invoice, items, stock issue, customer balance,
  tax result, and accounting source event.
- **FR-009**: Payments MUST identify account, amount, currency, business date, payer/payee, method, and
  allocations and MUST NOT over-allocate a document.
- **FR-010**: Returns MUST reference original document lines and MUST NOT exceed the net quantity eligible
  for return.
- **FR-011**: Financial postings MUST balance total debits and credits and retain links to their source.
- **FR-012**: Posted documents and journals MUST be immutable; corrections MUST use authorized reversal or
  adjustment documents.
- **FR-013**: Accounting periods MUST support open and closed states, and closed periods MUST block
  unauthorized dated postings.
- **FR-014**: Expenses MUST support draft, submitted, approved, rejected, paid, and cancelled states with
  separation between approval and payment permissions.
- **FR-015**: Transfers MUST create linked equal-value movements and balanced financial postings.
- **FR-016**: Reconciliation MUST preserve statement entries, proposed matches, confirmed matches,
  unmatched items, and adjustment references.
- **FR-017**: Reports MUST derive only from persisted company records and support business-date ranges and
  drill-down to source documents.
- **FR-018**: Every business mutation MUST record actor, company, action, entity, before/after state or
  immutable event data, timestamp, and operation reference.
- **FR-019**: The system MUST present loading, empty, success, validation, conflict, and recovery states in
  Arabic and English for every delivered workflow.
- **FR-020**: Exports MUST apply the same company scope, permissions, date rules, and totals as the screen.
- **FR-021**: Owners and auditors MUST be able to trace operational documents through stock, payment, and
  journal effects without being able to alter posted history solely because they can view it.
- **FR-022**: Destructive reset or maintenance operations MUST require explicit operator action, list the
  affected business tables, and preserve authentication/RBAC data unless separately authorized.
- **FR-023**: Receipt posting MUST recognize an accrued supplier liability in a goods-received-not-invoiced
  control account; conversion to a final supplier payable requires a separately specified supplier-invoice
  workflow and MUST NOT double-count the receipt accrual.

### Key Entities

- **Warehouse**: A company location that owns inventory movements and availability.
- **Purchase Order / Purchase Order Item**: Approved intent to buy with ordered and received quantities.
- **Goods Receipt / Goods Receipt Item**: Evidence of stock received against a purchase order and source
  of a goods-received-not-invoiced accrual.
- **Stock Movement**: Immutable quantity change by warehouse, product, source, reason, actor, and time.
- **Sales Invoice / Sales Invoice Item**: Customer sale with pricing, tax, payment, and return state.
- **Sales Return / Sales Return Item**: Controlled reversal of eligible quantities from an original sale.
- **Payment / Payment Allocation**: Cash movement allocated to one or more receivable/payable documents.
- **Financial Account / Account Movement**: Cash, bank, wallet, receivable, payable, or ledger activity.
- **Expense**: Approval-controlled business cost and its payment state.
- **Ledger Account / Journal Entry / Journal Line**: Balanced financial classification and postings.
- **Accounting Period**: Date boundary controlling posting availability.
- **Reconciliation / Statement Line / Match**: Evidence linking external statements to internal movements.
- **Audit Event**: Immutable record of security and business state changes.
- **Document Sequence**: Company-specific numbering rule with concurrency-safe next value.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A trained purchaser can create, approve, and partially receive a standard order in under
  five minutes without manual stock correction.
- **SC-002**: In 100% of tested retries, a repeated receipt, sale, return, payment, or transfer produces no
  duplicate stock or financial effect.
- **SC-003**: For the acceptance dataset, inventory on hand reconciles exactly to movements and all posted
  journals balance to zero difference.
- **SC-004**: An accountant can trace any posted report amount to source documents and responsible actors
  in under two minutes.
- **SC-005**: Unauthorized and cross-company requests expose zero business records in all acceptance tests.
- **SC-006**: At least 90% of pilot users complete their primary role workflow on the first attempt without
  assistance.
- **SC-007**: Every delivered workflow is completable in both Arabic RTL and English LTR with identical
  calculations and permissions.
- **SC-008**: Closing a period prevents 100% of unauthorized backdated postings while allowing documented
  adjustment workflows to remain traceable.
- **SC-009**: Empty companies and empty periods show zero/empty states with no demo or fabricated records.

## Assumptions

- The existing tenant, company, login, role, permission, product, customer, supplier, sales, dashboard,
  PostgreSQL, and local AI foundations remain in place and will be extended rather than replaced.
- The first release targets one legal company currency per company; foreign-currency settlement and
  revaluation require a later specification.
- Tax rules are configurable per company and line; statutory country-specific electronic filing is out
  of scope until separately specified.
- Approval thresholds are company-configurable, with owners able to delegate approval permissions.
- HR, payroll, CRM pipeline automation, subscriptions, and external e-commerce integrations are separate
  features and are outside this operational-core specification.
- Desktop and responsive web are in scope; native mobile and offline operation are out of scope.
