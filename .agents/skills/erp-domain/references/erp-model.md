# ERP domain model

- Product: identity, SKU/barcode, type, variants, units, tax category, lifecycle, and traceability.
- Location: tenant, branch, warehouse, zone/bin, availability rules, and ownership.
- Party: supplier/customer identity, addresses, tax identity, credit/payment terms, and status.
- Document: requisition/quote, order, receipt/fulfillment, invoice, payment, return, credit/debit note, and history.
- Stock ledger: immutable product movement with quantity, unit, locations, source, lot/serial, cost, actor, and time.

## Invariants and localization

- Transitions are authorized, idempotent, auditable, and valid from current state.
- Stock and source transactions commit atomically or use durable reconciliation.
- Posted documents retain original commercial/tax facts; corrections reference originals.
- Reports specify statuses, cutoff, timezone, currency conversion, rounding, and valuation.
- Represent Egyptian pounds as ISO `EGP` with decimal arithmetic and explicit rounding.
- Store Arabic and English names independently and support Unicode search and RTL rendering.
- Verify current Egyptian Tax Authority rules before implementing tax or e-invoicing behavior.

