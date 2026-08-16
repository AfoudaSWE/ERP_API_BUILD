---
name: erp-ecommerce-integration
description: Design and implement reliable ERP and e-commerce integration for products, variants, prices, stock, customers, orders, fulfillment, returns, and refunds. Use for synchronization, webhooks, queues, mappings, idempotency, retries, reconciliation, conflicts, observability, eventual consistency, overselling prevention, duplicate-order prevention, or systems of record.
---

# ERP E-commerce Integration

Use `erp-domain` and `ecommerce-domain` when changing their business models. Add architecture, API, NestJS, Node.js, React, or Nx skills only when those technologies apply.

1. Inspect `AGENTS.md`, docs, schemas, APIs, events, webhooks, workers, mappings, jobs, logs, dashboards, tests, and runbooks.
2. Build an entity/field ownership matrix with authority, identifiers, mapping, direction, trigger, latency, and conflict policy.
3. Verify current official platform, payment, queue, webhook, and framework documentation.
4. Define contracts, evolution, idempotency, ordering, transaction/outbox boundaries, retries, dead letters, replay, reconciliation, and repair.
5. Implement mappings and durable transitions while preserving existing contracts unless migration is approved.
6. Add logs, metrics, traces, correlation IDs, lag/error/retry/dead-letter measures, alerts, and safe replay tooling.
7. Test duplicates, delay, reordering, partial failure, poison messages, concurrency, timeouts, replay, reconciliation, and recovery.
8. Run lint, typecheck, tests, builds, migrations, and affected targets; report files, results, ownership, consistency windows, assumptions, and risks.

## Integration invariants

- Persist explicit external-ID mappings; never rely only on display names or mutable SKUs.
- Protect business effects with idempotency and unique source references for orders and payments.
- Use transactional outbox/inbox or an equivalent durable boundary.
- Retry only transient failures with bounded exponential backoff and jitter; expose poison work for recovery.
- Do not use last-write-wins without field ownership and version semantics.
- Prevent overselling with atomic reservation/allocation at the stock authority, safety stock where needed, and reconciliation.
- Reconcile counts and values, classify drift, repair idempotently, and retain an audit trail.
- Preserve Arabic/English fields, RTL metadata, ISO `EGP`, decimal rounding, tax snapshots, branch mappings, and timezones.

Read [integration-model.md](references/integration-model.md) before changing synchronization.

