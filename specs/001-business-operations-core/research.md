# Research: Business Operations Core

## Decision 1: Append-only inventory ledger with transactional balance projection

**Decision**: Treat `stock_movements` as the authority and maintain `inventory_balances` as a locked,
transactional projection for fast availability checks. Retain `products.total_stock` only during migration.

**Rationale**: A ledger explains every quantity change, while a projection prevents expensive aggregation
for each sale and enables concurrency-safe stock checks.

**Alternatives considered**: Directly editing product stock is fast but unauditable. Recalculating every
balance from all movements is correct but too costly for routine sales at the target volume.

## Decision 2: One application transaction for operational and financial effects

**Decision**: Each receipt, sale, return, payment, expense, and transfer runs through a domain posting
service inside one PostgreSQL transaction. It locks impacted balances, validates states, writes source and
ledger records, posts journals, appends audit events, and commits together.

**Rationale**: An outbox or asynchronous financial posting would expose periods where operational and
financial truth disagree. The current modular monolith can guarantee consistency without distributed
coordination.

**Alternatives considered**: Eventual-consistency queues are useful at larger scale but create recovery and
reconciliation complexity not justified by this deployment.

## Decision 3: Decimal strings at system boundaries

**Decision**: Persist money as PostgreSQL `numeric`, calculate with decimal-safe helpers, and serialize
money/quantity values as normalized decimal strings in API contracts. UI formatting converts only for
display and never uses binary floating-point for persisted calculations.

**Rationale**: JavaScript numbers cannot exactly represent decimal money. String contracts preserve values
across PostgreSQL, API, browser, exports, and tests.

**Alternatives considered**: Minor integer units fail for currencies or quantities with different scales;
floating-point numbers violate the constitution's financial-integrity rule.

## Decision 4: Company-scoped operation references for idempotency

**Decision**: Every retryable mutation requires `Idempotency-Key`; store company, route/action, request
fingerprint, result reference, and status under a company-scoped unique key.

**Rationale**: Network retries must not duplicate receipts, invoices, stock, payments, or journals. A request
fingerprint prevents accidental reuse of a key for different content.

**Alternatives considered**: Relying only on document numbers cannot protect multi-record operations or
distinguish an intentional second action from a retry.

## Decision 5: Explicit document state machines

**Decision**: Domain services own allowed transitions and record transition events. API routes request an
action (`submit`, `approve`, `receive`, `post`, `reverse`, `close`) rather than accepting arbitrary status.

**Rationale**: Action endpoints make permissions, invariants, audit entries, and rejection reasons testable.

**Alternatives considered**: Generic status patches are concise but permit invalid jumps and distribute
business rules across clients.

## Decision 6: Source-linked double-entry posting

**Decision**: Use configurable system account mappings and a posting service that creates journal entries
and lines with a unique `(company, source_type, source_id, posting_type)` link. Posted entries are immutable;
reversals create new entries.

**Rationale**: Unique source linkage prevents double posting and provides direct audit/report drill-down.

**Alternatives considered**: Periodic aggregate journal batches obscure document-level traceability;
editable journals undermine audit integrity.

## Decision 7: Read models remain in PostgreSQL for initial reporting

**Decision**: Implement indexed, company-scoped report queries and database views/materialized views only
when measured query plans require them. Every aggregate exposes its contributing source query.

**Rationale**: The initial scale does not require a separate analytics store, and one source reduces drift.

**Alternatives considered**: A warehouse or search engine increases operational cost and eventual
consistency without current evidence of need.

## Decision 8: Modular monolith boundaries

**Decision**: Keep one Express API process with domain modules and shared transaction services. Domain
modules may call explicit service interfaces, not each other's SQL fragments.

**Rationale**: It preserves atomic transactions and fits the existing Nx workspace while establishing
boundaries that can be extracted later if scale demands.

**Alternatives considered**: Microservices would force distributed transactions for the highest-risk
workflows and are not justified at the target scale.
