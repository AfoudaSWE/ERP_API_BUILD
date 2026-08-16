<!--
Sync Impact Report
- Version change: template -> 1.0.0
- Added principles: Business Truth and Ledger Integrity; Tenant Isolation and Least Privilege;
  Specification Traceability; Test Business Risk First; Operable, Localized, and Observable
- Added sections: ERP Domain Constraints; Spec-Driven Delivery Gates
- Removed sections: none (initial ratification)
- Templates reviewed: ✅ .specify/templates/spec-template.md; ✅ .specify/templates/plan-template.md;
  ✅ .specify/templates/tasks-template.md (existing structures support these gates)
- Runtime guidance reviewed: ✅ README.md
- Deferred items: none
-->
# SME ERP Platform Constitution

## Core Principles

### I. Business Truth and Ledger Integrity
PostgreSQL MUST be the authoritative source for business records. The web client MUST NOT contain
sample, fallback, or independently mutable business data. Every operation that changes money,
inventory, receivables, payables, or document state MUST be atomic, idempotent where retries are
possible, and represented by an immutable audit trail. Corrections MUST use reversal or adjustment
records; posted business history MUST NOT be silently rewritten.

### II. Tenant Isolation and Least Privilege
Every business query and mutation MUST be scoped by the authenticated tenant and company on the
server. Every endpoint and business action MUST enforce a named permission; hiding a page or button
is not authorization. Sensitive fields MUST be excluded from logs and responses. Cross-company
access, privilege escalation, and inactive-user access MUST have automated negative tests.

### III. Specification Traceability
No business feature may enter implementation without a Spec Kit specification containing prioritized,
independently testable user stories, explicit requirements, domain entities, assumptions, and measurable
success criteria. Plans and tasks MUST reference story and requirement identifiers. API contracts,
database migrations, role permissions, UI states, and operational documentation MUST stay traceable to
the approved specification.

### IV. Test Business Risk First
Tests MUST be written for financial calculations, stock transitions, document state transitions,
authorization boundaries, tenant isolation, validation, and transaction rollback before the related
implementation is considered complete. Contract and integration tests MUST cover every business
mutation. A production build, typecheck, lint, and the relevant automated tests MUST pass before a
story is marked complete.

### V. Operable, Localized, and Observable
Business workflows MUST provide explicit loading, empty, success, validation, conflict, and recovery
states in Arabic and English with correct RTL/LTR behavior. Mutations MUST emit structured audit and
operational events with correlation identifiers. Failures MUST be actionable without exposing secrets.
AI-generated answers MUST disclose their data boundary, MUST NOT invent company facts, and MUST remain
read-only unless a separately approved specification defines confirmation and audit controls.

## ERP Domain Constraints

- Monetary values MUST use fixed-precision decimal semantics and retain currency; floating-point
  arithmetic is prohibited for persisted financial calculations.
- Stock MUST be derived from a movement ledger. Direct stock balance edits are prohibited except
  through an authorized, reasoned adjustment transaction.
- Business documents MUST have company-unique human-readable numbers and explicit state machines.
- Posted journals, receipts, invoices, returns, and payments MUST balance and preserve source links.
- Dates MUST distinguish business date from creation timestamp and use the company timezone.
- Database migrations MUST be forward-only, transactional when supported, and safe for existing data.
- External integrations MUST use documented contracts, timeouts, validation, and retry/idempotency rules.

## Spec-Driven Delivery Gates

1. `/speckit-specify`: agree on business value, scope, roles, rules, acceptance scenarios, and outcomes.
2. `/speckit-clarify` when material ambiguity remains; no unresolved clarification may enter planning.
3. `/speckit-plan`: define research decisions, data model, contracts, security, migration, and quickstart.
4. `/speckit-tasks`: generate dependency-ordered tasks grouped by independently testable user story.
5. `/speckit-analyze`: verify cross-artifact consistency before implementation.
6. `/speckit-implement`: execute tasks with required tests and constitution checks.

Any constitution gate failure MUST stop planning or implementation unless the plan records a specific,
time-bounded exception and explains why no simpler compliant design meets the business need.

## Governance

This constitution supersedes informal conventions and generated suggestions. Amendments require a
documented rationale, a semantic version change, a migration impact review, and updates to affected
Spec Kit templates and active specifications. MAJOR versions remove or redefine principles, MINOR
versions add or materially expand them, and PATCH versions clarify wording without changing policy.
Every plan and review MUST include a constitution compliance check. A story is complete only when its
acceptance scenarios, contracts, migrations, permissions, audit behavior, and validation guide pass.

**Version**: 1.0.0 | **Ratified**: 2026-07-15 | **Last Amended**: 2026-07-15
