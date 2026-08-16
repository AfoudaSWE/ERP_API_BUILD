---
name: erp-domain
description: Design and implement ERP capabilities including products, inventory, warehouses, purchasing, sales, suppliers, customers, pricing, taxes, branches, transfers, accounting boundaries, permissions, audit trails, and reporting. Use for ERP requirements, models, workflows, invariants, APIs, UI, tests, or integrations; combine with architecture and technology skills.
---

# ERP Domain

1. Inspect `AGENTS.md`, docs, schemas, migrations, modules, APIs, permissions, tests, reports, and terminology.
2. Trace actors, approvals, states, invariants, accounting boundaries, audit needs, and failure recovery. State assumptions instead of inventing policy.
3. Check current official legal, tax, accounting, payment, or platform documentation when rules can change.
4. Model authoritative records, immutable documents, identifiers, units, currencies, timestamps, branch/warehouse scope, and transactions.
5. Implement end-to-end behavior across persistence, domain logic, authorization, APIs/events, UI, audit, and tests.
6. Preserve schema, API, event, and reporting compatibility unless a breaking migration is approved.
7. Run lint, typecheck, tests, builds, migrations, and affected checks; report files, results, assumptions, decisions, and risks.

## Domain rules

- Separate product definitions, stock ledger movements, availability, reservations, valuation, and counts.
- Treat posted purchase, sale, transfer, tax, and accounting documents as auditable; correct via explicit reversal or adjustment.
- Enforce negative-stock policy atomically at the correct warehouse/branch.
- Use decimal quantities, explicit unit conversion, currency precision, tax modes, effective dates, and deterministic rounding.
- Apply least privilege, segregation of duties, approvals, tenant/branch scope, and sensitive-field protection.
- Make reports traceable and define cutoff, timezone, statuses, valuation, and aggregation.

Read [erp-model.md](references/erp-model.md) for inventory, documents, pricing/tax, accounting, or reporting.

